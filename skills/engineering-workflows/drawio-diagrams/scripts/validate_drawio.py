#!/usr/bin/env python3
"""Validate draw.io / diagrams.net XML for the drawio-diagrams skill.

Supports generic draw.io XML, multi-page files, compressed diagram payloads,
JSON output, connector animation policies, and warnings that should not fail
the run.
"""

from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import html
import json
import math
import re
import sys
import urllib.parse
import zlib
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path

HEX_RE = re.compile(r"#[0-9A-Fa-f]{6}\b")
LIGHT_DARK_RE = re.compile(r"light-dark\((#[0-9A-Fa-f]{6})\s*,\s*(#[0-9A-Fa-f]{6})\)")
INLINE_FONT_SIZE_RE = re.compile(r"font-size\s*:\s*(\d+(?:\.\d+)?)px", re.IGNORECASE)
SVG_LENGTH_RE = re.compile(r"^\s*\+?(\d+(?:\.\d*)?|\.\d+)(?:[A-Za-z%]+)?\s*$")
SVG_NUMBER_LENGTH_RE = re.compile(
    r"^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)(?:[A-Za-z%]+)?\s*$"
)
SVG_URL_RE = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
SVG_IMAGE_SET_RE = re.compile(
    r"(?<![-_A-Za-z0-9])(?:-webkit-)?image-set\s*\(", re.IGNORECASE
)
DATA_IMAGE_URI_RE = re.compile(
    r"^data:image/(svg\+xml|png)(;base64)?,(.*)$",
    re.IGNORECASE | re.DOTALL,
)
SVG_XML_DECL_RE = re.compile(r"^\ufeff?\s*<\?xml\s+[^?]*\?>", re.IGNORECASE)
SVG_KEYFRAMES_START_RE = re.compile(
    r"@(?:-webkit-)?keyframes\s+[_A-Za-z][_A-Za-z0-9-]*\s*\{",
    re.IGNORECASE,
)
MAX_EMBEDDED_SVG_BYTES = 2 * 1024 * 1024
MAX_EMBEDDED_SVG_PAYLOAD_CHARS = 8 * 1024 * 1024
MAX_EMBEDDED_SVG_DEPTH = 4
MAX_EMBEDDED_SVG_TOTAL_BYTES = 8 * 1024 * 1024
MAX_EMBEDDED_PNG_DIMENSION = 32_768
MAX_EMBEDDED_PNG_DECODED_BYTES = 64 * 1024 * 1024
MAX_DRAWIO_SOURCE_BYTES = 20 * 1024 * 1024
MAX_DRAWIO_ELEMENTS = 50_000
MAX_DRAWIO_DEPTH = 256
MAX_INFLATED_DIAGRAM_BYTES = 32 * 1024 * 1024
SVG_NAMESPACE = "http://www.w3.org/2000/svg"
XLINK_NAMESPACE = "http://www.w3.org/1999/xlink"
XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
SVG_ANIMATION_ELEMENTS = {"animate", "animatemotion", "animatetransform", "discard", "set"}
SVG_ACTIVE_ELEMENTS = frozenset(
    {
        "animate",
        "animatemotion",
        "animatetransform",
        "audio",
        "base",
        "button",
        "embed",
        "form",
        "handler",
        "iframe",
        "input",
        "listener",
        "link",
        "meta",
        "object",
        "script",
        "select",
        "set",
        "source",
        "textarea",
        "track",
        "video",
        "discard",
    }
)
SVG_NON_RENDERING_ELEMENTS = {
    "defs",
    "desc",
    "metadata",
    "title",
    "style",
    "clippath",
    "mask",
    "pattern",
    "symbol",
}
PNG_BIT_DEPTHS = {
    0: {1, 2, 4, 8, 16},
    2: {8, 16},
    3: {1, 2, 4, 8},
    4: {8, 16},
    6: {8, 16},
}
PNG_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
FLOW_ANIMATION_KEYS = {
    "flowAnimation",
    "flowAnimationDirection",
    "flowAnimationDuration",
    "flowAnimationTimingFunction",
}
FLOW_ANIMATION_DIRECTIONS = {"normal", "reverse", "alternate", "alternate-reverse"}
FLOW_ANIMATION_TIMINGS = {"linear", "ease", "ease-in", "ease-out", "ease-in-out"}
EXPLICIT_FLOW_ROLES = {"flow", "runtime-flow", "data-flow", "process-flow", "request", "event"}
STATIC_EDGE_ROLES = {
    "association",
    "dependency",
    "containment",
    "ownership",
    "annotation",
    "decorative",
    "legend",
    "structural",
}
NONSEMANTIC_VERTEX_ROLES = {
    "annotation",
    "badge",
    "decorative",
    "detail",
    "icon",
    "label",
    "legend",
    "metadata",
    "port",
    "structural",
    "subtitle",
    "title",
}
PROFILE_STYLE_HASH_KEYS = frozenset(
    {
        "designProfile",
        "shape",
        "dataRole",
        "strokeColor",
        "fillColor",
        "gradientColor",
        "gradientDirection",
        "shadow",
        "glass",
        "arcSize",
        "strokeWidth",
        "fontColor",
        "fontSize",
        "profileRole",
    }
)


@dataclass
class Cell:
    el: ET.Element
    index: int
    id: str | None
    parent: str | None
    style: str
    value: str
    is_vertex: bool
    is_edge: bool
    source: str | None
    target: str | None
    geometry: tuple[float, float, float, float] | None
    relative_geometry: bool
    geometry_offset: tuple[float, float]
    style_map: dict[str, str]

    @classmethod
    def from_element(cls, el: ET.Element, index: int) -> "Cell":
        style = el.get("style") or ""
        style_map: dict[str, str] = {}
        for token in style.split(";"):
            if "=" in token:
                key, _, value = token.partition("=")
                style_map[key.strip()] = value.strip()
        geo = el.find("mxGeometry")
        geometry = None
        relative_geometry = False
        geometry_offset = (0.0, 0.0)
        if geo is not None and geo.get("as") == "geometry":
            relative_geometry = geo.get("relative") == "1"
            offset = geo.find('mxPoint[@as="offset"]')
            if offset is not None:
                try:
                    parsed_offset = (
                        float(offset.get("x", "0")),
                        float(offset.get("y", "0")),
                    )
                    if all(math.isfinite(value) for value in parsed_offset):
                        geometry_offset = parsed_offset
                except ValueError:
                    geometry_offset = (0.0, 0.0)
            if all(name in geo.attrib for name in ("x", "y", "width", "height")):
                try:
                    parsed_geometry = (
                        float(geo.get("x", "")),
                        float(geo.get("y", "")),
                        float(geo.get("width", "")),
                        float(geo.get("height", "")),
                    )
                    if all(math.isfinite(value) for value in parsed_geometry):
                        geometry = parsed_geometry
                except ValueError:
                    geometry = None
        return cls(
            el=el,
            index=index,
            id=el.get("id"),
            parent=el.get("parent"),
            style=style,
            value=el.get("value") or "",
            is_vertex=el.get("vertex") == "1",
            is_edge=el.get("edge") == "1",
            source=el.get("source"),
            target=el.get("target"),
            geometry=geometry,
            relative_geometry=relative_geometry,
            geometry_offset=geometry_offset,
            style_map=style_map,
        )

    @property
    def is_text_label(self) -> bool:
        return self.style.startswith("text;")

    @property
    def is_container(self) -> bool:
        if self.style_map.get("container") == "1":
            return True
        return "swimlane" in self.style or self.style_map.get("fillColor") == "none"

    @property
    def is_filled_shape(self) -> bool:
        return self.is_vertex and not self.is_text_label and self.style_map.get("fillColor") != "none"

    @property
    def is_decorative_line(self) -> bool:
        if not self.geometry:
            return False
        _, _, width, height = self.geometry
        return height <= 6 or "shape=line" in self.style


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate draw.io .drawio XML")
    parser.add_argument("file")
    parser.add_argument("--profile", choices=["generic", "flowforge"], default="generic")
    parser.add_argument(
        "--animation",
        choices=["preserve", "on", "off"],
        default="preserve",
        help="preserve existing animation, require semantic flow animation, or reject animation",
    )
    parser.add_argument(
        "--require-self-contained-images",
        action="store_true",
        help="require valid embedded image data and at least one embedded SVG in the file",
    )
    parser.add_argument(
        "--require-uncompressed",
        action="store_true",
        help="require every mxfile page to contain inline mxGraphModel XML",
    )
    parser.add_argument("--theme", default=None)
    parser.add_argument("--json", dest="json_path", default=None)
    return parser.parse_args()


def read_drawio_source(path: Path) -> str:
    if path.stat().st_size > MAX_DRAWIO_SOURCE_BYTES:
        raise ValueError("draw.io source exceeds the 20 MiB size limit")
    with path.open("rb") as handle:
        data = handle.read(MAX_DRAWIO_SOURCE_BYTES + 1)
    if len(data) > MAX_DRAWIO_SOURCE_BYTES:
        raise ValueError("draw.io source exceeds the 20 MiB size limit")
    return data.decode("utf8", errors="strict")


def bounded_xml_shape(root: ET.Element, max_elements: int) -> int:
    count = 0
    stack = [(root, 1)]
    while stack:
        element, depth = stack.pop()
        count += 1
        if count > max_elements:
            raise ValueError("draw.io XML exceeds the aggregate element limit")
        if depth > MAX_DRAWIO_DEPTH:
            raise ValueError("draw.io XML exceeds the depth limit")
        stack.extend((child, depth + 1) for child in element)
    return count


def decode_compressed_diagram(
    text: str, max_inflated_bytes: int, max_elements: int
) -> tuple[ET.Element, int, int]:
    if max_inflated_bytes <= 0:
        raise ValueError("compressed diagrams exceed the aggregate inflated-size limit")
    if max_elements <= 0:
        raise ValueError("draw.io XML exceeds the aggregate element limit")
    compact = re.sub(r"\s+", "", text)
    data = base64.b64decode(compact, validate=True)
    decompressor = zlib.decompressobj(-15)
    inflated = decompressor.decompress(data, max_inflated_bytes + 1)
    if len(inflated) > max_inflated_bytes or decompressor.unconsumed_tail:
        raise ValueError("compressed diagram exceeds the aggregate inflated-size limit")
    inflated += decompressor.flush(max_inflated_bytes + 1 - len(inflated))
    if not decompressor.eof or decompressor.unused_data:
        raise ValueError("compressed diagram has an incomplete or trailing deflate stream")
    encoded_xml = inflated.decode("utf8")
    if re.search(r"%(?![0-9A-Fa-f]{2})", encoded_xml):
        raise ValueError("compressed diagram contains malformed percent encoding")
    xml = urllib.parse.unquote_to_bytes(encoded_xml).decode("utf8")
    model = ET.fromstring(xml)
    element_count = bounded_xml_shape(model, max_elements)
    return model, len(inflated), element_count


def parse_models(path: Path) -> list[tuple[str, ET.Element]]:
    content = read_drawio_source(path)
    root = ET.fromstring(content)
    outer_elements = bounded_xml_shape(root, MAX_DRAWIO_ELEMENTS)
    if root.tag == "mxGraphModel":
        return [(path.name, root)]
    if root.tag != "mxfile":
        found = root.find(".//mxGraphModel")
        if found is not None:
            return [(path.name, found)]
        raise ValueError("no mxfile or mxGraphModel root found")

    models: list[tuple[str, ET.Element]] = []
    inflated_bytes = 0
    decoded_elements = 0
    for index, diagram in enumerate(root.findall("diagram"), start=1):
        name = diagram.get("name") or f"Page-{index}"
        model = diagram.find("mxGraphModel")
        if model is None:
            payload = (diagram.text or "").strip()
            if not payload:
                raise ValueError(f"diagram {name!r} has no mxGraphModel or compressed payload")
            model, page_bytes, page_elements = decode_compressed_diagram(
                payload,
                MAX_INFLATED_DIAGRAM_BYTES - inflated_bytes,
                MAX_DRAWIO_ELEMENTS - outer_elements - decoded_elements,
            )
            inflated_bytes += page_bytes
            decoded_elements += page_elements
        models.append((name, model))
    if not models:
        found = root.find(".//mxGraphModel")
        if found is not None:
            models.append((path.name, found))
    if not models:
        raise ValueError("no diagrams found")
    return models


def require_uncompressed_pages(path: Path) -> None:
    root = ET.fromstring(read_drawio_source(path))
    bounded_xml_shape(root, MAX_DRAWIO_ELEMENTS)
    if root.tag == "mxGraphModel":
        return
    if root.tag != "mxfile" or not root.findall("diagram"):
        raise ValueError("no mxfile pages found")
    compressed = [
        diagram.get("name") or f"Page-{index}"
        for index, diagram in enumerate(root.findall("diagram"), start=1)
        if diagram.find("mxGraphModel") is None
    ]
    if compressed:
        raise ValueError(f"compressed diagram pages are not allowed: {', '.join(compressed)}")


def xml_local_name(name: str) -> str:
    return name.rsplit("}", 1)[-1].lower()


def positive_svg_length(value: str | None) -> bool:
    if not value:
        return False
    match = SVG_LENGTH_RE.fullmatch(value)
    return bool(match and float(match.group(1)) > 0)


def svg_has_usable_bounds(root: ET.Element) -> bool:
    view_box = root.get("viewBox") or root.get("viewbox")
    if view_box:
        try:
            values = [float(value) for value in re.split(r"[\s,]+", view_box.strip()) if value]
        except ValueError:
            values = []
        if len(values) == 4 and all(math.isfinite(value) for value in values):
            return values[2] > 0 and values[3] > 0
    return positive_svg_length(root.get("width")) and positive_svg_length(root.get("height"))


def decode_data_image(uri: str) -> tuple[str, bytes]:
    match = DATA_IMAGE_URI_RE.fullmatch(uri)
    if not match:
        raise ValueError("unsupported or malformed image data URI")
    media_type = match.group(1).lower().replace("jpg", "jpeg")
    encoded_as_base64 = bool(match.group(2))
    payload = match.group(3)
    if not payload or len(payload) > MAX_EMBEDDED_SVG_PAYLOAD_CHARS:
        raise ValueError("image data URI is empty or exceeds the encoded size limit")
    if not encoded_as_base64 and re.search(r"%(?![0-9A-Fa-f]{2})", payload):
        raise ValueError("image data URI contains malformed percent encoding")

    if encoded_as_base64:
        try:
            raw = base64.b64decode(payload, validate=True)
        except base64.binascii.Error as exc:
            raise ValueError("image data URI contains invalid base64") from exc
    elif media_type == "svg+xml" and payload.lstrip().startswith("<"):
        raw = payload.encode("utf-8")
    elif re.search(r"%[0-9A-Fa-f]{2}", payload):
        if re.search(r"%(?![0-9A-Fa-f]{2})", payload):
            raise ValueError("image data URI contains malformed percent encoding")
        raw = urllib.parse.unquote_to_bytes(payload)
    else:
        try:
            raw = base64.b64decode(payload, validate=True)
        except base64.binascii.Error as exc:
            raise ValueError("image data URI payload is neither encoded data nor base64") from exc
    if not raw or len(raw) > MAX_EMBEDDED_SVG_BYTES:
        raise ValueError("embedded image is empty or exceeds 2 MiB")
    return media_type, raw


def decode_embedded_svg(uri: str) -> str:
    media_type, raw = decode_data_image(uri)
    if media_type != "svg+xml":
        raise ValueError("embedded image is not SVG")
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("embedded SVG must use UTF-8 encoding") from exc


def xml_namespace(name: str) -> str:
    if name.startswith("{") and "}" in name:
        return name[1:].split("}", 1)[0]
    return ""


def local_fragment(value: str, ids: set[str]) -> None:
    fragment = urllib.parse.unquote(value[1:])
    if not fragment or fragment not in ids:
        raise ValueError(f"embedded SVG references missing local fragment {value!r}")


def svg_numeric_length(value: str | None, default: float = 0) -> float:
    match = SVG_NUMBER_LENGTH_RE.fullmatch(value or "")
    if not match:
        return default
    number = float(match.group(1))
    return number if math.isfinite(number) else default


def svg_style(element: ET.Element, inherited: dict[str, str] | None = None) -> dict[str, str]:
    result = dict(
        inherited
        or {
            "color": "black",
            "fill": "black",
            "fill-opacity": "1",
            "font-size": "16",
            "opacity": "1",
            "stroke": "none",
            "stroke-linecap": "butt",
            "stroke-opacity": "1",
            "stroke-width": "1",
            "visibility": "visible",
        }
    )
    inline: dict[str, str] = {}
    for token in (element.get("style") or "").split(";"):
        key, separator, value = token.partition(":")
        if separator:
            inline[key.strip().lower()] = value.strip()
    for key in result:
        value = inline.get(key) or element.get(key)
        if value and value.strip().lower() != "inherit":
            result[key] = value.strip().lower()
    result["display"] = (inline.get("display") or element.get("display") or "").strip().lower()
    return result


def svg_zero_opacity(value: str | None) -> bool:
    literal = (value or "").strip().lower()
    try:
        divisor = 100 if literal.endswith("%") else 1
        return float(literal.rstrip("%")) / divisor <= 0
    except ValueError:
        return False


def svg_color_visible(value: str | None, elements_by_id: dict[str, ET.Element]) -> bool:
    literal = re.sub(r"\s+", "", value or "").lower()
    local_paint = re.fullmatch(r"url\((?:['\"])?#([^)'\"]+)(?:['\"])?\)", literal)
    if local_paint:
        return urllib.parse.unquote(local_paint.group(1)) in elements_by_id
    if literal.startswith("url("):
        return False
    if literal in {"", "none", "transparent"}:
        return False
    if re.fullmatch(r"#[0-9a-f]{4}", literal):
        return literal[-1] != "0"
    if re.fullmatch(r"#[0-9a-f]{8}", literal):
        return literal[-2:] != "00"
    alpha = re.fullmatch(r"(?:rgba|hsla)\(.*,([^,\)]*)\)", literal)
    if alpha is None:
        alpha = re.fullmatch(r"(?:rgba?|hsla?)\(.*\/([^\)]*)\)", literal)
    return not (alpha and svg_zero_opacity(alpha.group(1)))


def svg_paint_visible(
    style: dict[str, str],
    elements_by_id: dict[str, ET.Element],
    *,
    fill: bool = True,
    stroke: bool = True,
) -> bool:
    fill_color = style.get("color") if style.get("fill") == "currentcolor" else style.get("fill")
    stroke_color = style.get("color") if style.get("stroke") == "currentcolor" else style.get("stroke")
    fill_visible = (
        fill
        and svg_color_visible(fill_color, elements_by_id)
        and not svg_zero_opacity(style.get("fill-opacity"))
    )
    stroke_visible = (
        stroke
        and svg_color_visible(stroke_color, elements_by_id)
        and not svg_zero_opacity(style.get("stroke-opacity"))
        and svg_numeric_length(style.get("stroke-width"), 1) > 0
    )
    return fill_visible or stroke_visible


def svg_points(value: str | None) -> list[tuple[float, float]]:
    try:
        numbers = [float(item) for item in re.findall(r"[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[Ee][-+]?\d+)?", value or "")]
    except ValueError:
        return []
    if len(numbers) % 2 or not all(math.isfinite(number) for number in numbers):
        return []
    return list(zip(numbers[::2], numbers[1::2], strict=True))


def svg_points_have_area(points: list[tuple[float, float]]) -> bool:
    if not points:
        return False
    origin = points[0]
    direction = next((point for point in points[1:] if point != origin), None)
    if direction is None:
        return False
    first = (direction[0] - origin[0], direction[1] - origin[1])
    return any(
        first[0] * (point[1] - origin[1]) != first[1] * (point[0] - origin[0])
        for point in points[1:]
    )


def svg_path_geometry(value: str | None) -> tuple[bool, bool, bool]:
    data = (value or "").strip()
    if not data:
        return False, False, False
    arity = {"m": 2, "l": 2, "h": 1, "v": 1, "c": 6, "s": 4, "q": 4, "t": 2, "a": 7}
    commands = frozenset("MmZzLlHhVvCcSsQqTtAa")
    number_re = re.compile(r"[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[Ee][-+]?\d+)?")
    index = 0
    command: str | None = None
    relative = False
    saw_command = False
    drew_segment = False
    drew_zero_length_segment = False
    fillable = False
    current = (0.0, 0.0)
    subpath_start: tuple[float, float] | None = None
    fill_direction: tuple[float, float] | None = None

    def record_fill_point(point: tuple[float, float]) -> None:
        nonlocal fill_direction, fillable
        if subpath_start is None or point == subpath_start:
            return
        if fill_direction is None:
            fill_direction = point
            return
        first = (fill_direction[0] - subpath_start[0], fill_direction[1] - subpath_start[1])
        candidate = (point[0] - subpath_start[0], point[1] - subpath_start[1])
        if first[0] * candidate[1] != first[1] * candidate[0]:
            fillable = True

    def skip_whitespace(position: int) -> int:
        while position < len(data) and data[position].isspace():
            position += 1
        return position

    def consume_separator(position: int, allow_comma: bool) -> int | None:
        position = skip_whitespace(position)
        if position < len(data) and data[position] == ",":
            if not allow_comma:
                return None
            position = skip_whitespace(position + 1)
        return position

    while index < len(data):
        index = skip_whitespace(index)
        if index >= len(data):
            break
        if data[index] in commands:
            raw_command = data[index]
            command = raw_command.lower()
            relative = raw_command.islower()
            if not saw_command and command != "m":
                return False, False, False
            saw_command = True
            index += 1
            if command == "z":
                if subpath_start is not None:
                    drew_segment = drew_segment or current != subpath_start
                    current = subpath_start
                command = None
                continue
        elif command is None:
            return False, False, False

        parameter_count = arity.get(command)
        if not parameter_count:
            return False, False, False
        group_count = 0
        while True:
            values: list[str] = []
            for parameter in range(parameter_count):
                separated = consume_separator(index, parameter > 0 or group_count > 0)
                if separated is None:
                    return False, False, False
                index = separated
                if index >= len(data) or data[index] in commands:
                    return False, False, False
                if command == "a" and parameter in {3, 4}:
                    if data[index] not in {"0", "1"}:
                        return False, False, False
                    values.append(data[index])
                    index += 1
                else:
                    match = number_re.match(data, index)
                    if match is None:
                        return False, False, False
                    values.append(match.group(0))
                    index = match.end()
            if command == "a" and (float(values[0]) < 0 or float(values[1]) < 0):
                return False, False, False
            numbers = [float(item) for item in values]
            if not all(math.isfinite(number) for number in numbers):
                return False, False, False
            origin = current

            def point(x: float, y: float) -> tuple[float, float]:
                return (origin[0] + x, origin[1] + y) if relative else (x, y)

            if command == "m":
                endpoint = point(numbers[0], numbers[1])
                if group_count == 0:
                    subpath_start = endpoint
                    fill_direction = None
                else:
                    drew_segment = drew_segment or endpoint != current
                    drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                    record_fill_point(endpoint)
                current = endpoint
            elif command in {"l", "t"}:
                endpoint = point(numbers[0], numbers[1])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                record_fill_point(endpoint)
                current = endpoint
            elif command == "h":
                endpoint = (origin[0] + numbers[0], origin[1]) if relative else (numbers[0], origin[1])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                record_fill_point(endpoint)
                current = endpoint
            elif command == "v":
                endpoint = (origin[0], origin[1] + numbers[0]) if relative else (origin[0], numbers[0])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                record_fill_point(endpoint)
                current = endpoint
            elif command == "c":
                control_1 = point(numbers[0], numbers[1])
                control_2 = point(numbers[2], numbers[3])
                endpoint = point(numbers[4], numbers[5])
                has_extent = any(item != current for item in (control_1, control_2, endpoint))
                drew_segment = drew_segment or has_extent
                drew_zero_length_segment = drew_zero_length_segment or not has_extent
                for item in (control_1, control_2, endpoint):
                    record_fill_point(item)
                current = endpoint
            elif command in {"s", "q"}:
                control = point(numbers[0], numbers[1])
                endpoint = point(numbers[2], numbers[3])
                has_extent = control != current or endpoint != current
                drew_segment = drew_segment or has_extent
                drew_zero_length_segment = drew_zero_length_segment or not has_extent
                for item in (control, endpoint):
                    record_fill_point(item)
                current = endpoint
            elif command == "a":
                endpoint = point(numbers[5], numbers[6])
                drew_segment = drew_segment or endpoint != current
                drew_zero_length_segment = drew_zero_length_segment or endpoint == current
                if numbers[0] > 0 and numbers[1] > 0 and endpoint != current:
                    fillable = True
                record_fill_point(endpoint)
                current = endpoint
            group_count += 1

            index = skip_whitespace(index)
            if index >= len(data):
                return drew_segment, fillable, drew_zero_length_segment
            if data[index] in commands:
                break
    return (
        saw_command and drew_segment,
        saw_command and fillable,
        saw_command and drew_zero_length_segment,
    )


def svg_has_renderable_graphic(root: ET.Element, elements_by_id: dict[str, ET.Element]) -> bool:
    def visit(
        element: ET.Element,
        inherited_style: dict[str, str] | None,
        inherited_hidden: bool,
        resolving: frozenset[str] = frozenset(),
        referenced: bool = False,
    ) -> bool:
        tag = xml_local_name(element.tag)
        style = svg_style(element, inherited_style)
        hidden = inherited_hidden or style.get("display") == "none" or style.get("visibility") in {
            "hidden",
            "collapse",
        } or svg_zero_opacity(style.get("opacity"))
        if hidden:
            return False
        if tag in SVG_NON_RENDERING_ELEMENTS and not (referenced and tag == "symbol"):
            return False
        if tag == "use":
            href = (
                element.get("href")
                or element.get(f"{{{XLINK_NAMESPACE}}}href")
                or element.get("xlink:href")
                or ""
            )
            fragment = urllib.parse.unquote(href[1:]) if href.startswith("#") else ""
            if not fragment or fragment in resolving or fragment not in elements_by_id:
                return False
            return visit(
                elements_by_id[fragment],
                style,
                False,
                resolving | {fragment},
                True,
            )
        if tag == "path":
            has_segment, has_fill_area, has_zero_length_segment = svg_path_geometry(element.get("d"))
            if has_segment:
                return svg_paint_visible(
                    style, elements_by_id, fill=has_fill_area, stroke=True
                )
            if has_zero_length_segment and style.get("stroke-linecap") in {"round", "square"}:
                return svg_paint_visible(style, elements_by_id, fill=False, stroke=True)
        elif tag == "rect":
            if svg_numeric_length(element.get("width")) > 0 and svg_numeric_length(element.get("height")) > 0:
                return svg_paint_visible(style, elements_by_id)
        elif tag == "circle":
            if svg_numeric_length(element.get("r")) > 0:
                return svg_paint_visible(style, elements_by_id)
        elif tag == "ellipse":
            if svg_numeric_length(element.get("rx")) > 0 and svg_numeric_length(element.get("ry")) > 0:
                return svg_paint_visible(style, elements_by_id)
        elif tag == "line":
            endpoints = (
                svg_numeric_length(element.get("x1")),
                svg_numeric_length(element.get("y1")),
                svg_numeric_length(element.get("x2")),
                svg_numeric_length(element.get("y2")),
            )
            if endpoints[:2] != endpoints[2:]:
                return svg_paint_visible(style, elements_by_id, fill=False)
        elif tag in {"polyline", "polygon"}:
            points = svg_points(element.get("points"))
            has_segment = len(set(points)) >= 2
            if has_segment:
                return svg_paint_visible(
                    style,
                    elements_by_id,
                    fill=svg_points_have_area(points),
                    stroke=True,
                )
        elif tag == "text":
            if "".join(element.itertext()).strip() and svg_numeric_length(style.get("font-size"), 16) > 0:
                return svg_paint_visible(style, elements_by_id)
        if tag in {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"}:
            return False
        return any(visit(child, style, False, resolving) for child in element)

    return visit(root, None, False)


def svg_stylesheet_has_only_keyframes(css: str) -> bool:
    if not css.strip():
        return True
    if "\\" in css or "/*" in css or "*/" in css:
        return False
    position = 0
    while position < len(css):
        while position < len(css) and css[position].isspace():
            position += 1
        if position == len(css):
            return True
        match = SVG_KEYFRAMES_START_RE.match(css, position)
        if match is None:
            return False
        depth = 1
        quote: str | None = None
        position = match.end()
        while position < len(css) and depth:
            character = css[position]
            if quote:
                if character == quote:
                    quote = None
            elif character in {'"', "'"}:
                quote = character
            elif character == "{":
                depth += 1
            elif character == "}":
                depth -= 1
            position += 1
        if depth or quote:
            return False
    return True


def validate_embedded_svg_bytes(raw: bytes, depth: int, context: dict[str, int]) -> None:
    if depth > MAX_EMBEDDED_SVG_DEPTH:
        raise ValueError(f"embedded SVG nesting exceeds {MAX_EMBEDDED_SVG_DEPTH} levels")
    context["bytes"] += len(raw)
    if context["bytes"] > MAX_EMBEDDED_SVG_TOTAL_BYTES:
        raise ValueError("embedded SVG data exceeds the aggregate size limit")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("embedded SVG must use UTF-8 encoding") from exc
    if "<!doctype" in text.lower():
        raise ValueError("embedded SVG contains a DOCTYPE")
    without_declaration = SVG_XML_DECL_RE.sub("", text, count=1)
    if "<?" in without_declaration:
        raise ValueError("embedded SVG contains a processing instruction")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        raise ValueError("embedded SVG is malformed XML") from exc
    if xml_local_name(root.tag) != "svg":
        raise ValueError("embedded image root is not <svg>")
    if xml_namespace(root.tag) not in {"", SVG_NAMESPACE}:
        raise ValueError("embedded image root uses a non-SVG namespace")
    if not svg_has_usable_bounds(root):
        raise ValueError("embedded SVG needs a positive viewBox or width and height")

    ids: set[str] = set()
    elements_by_id: dict[str, ET.Element] = {}
    for element in root.iter():
        for raw_name, raw_value in element.attrib.items():
            if xml_local_name(raw_name) != "id":
                continue
            value = raw_value.strip()
            if not value:
                raise ValueError("embedded SVG contains an empty id")
            if value in ids:
                raise ValueError(f"embedded SVG contains duplicate id {value!r}")
            ids.add(value)
            elements_by_id[value] = element

    for element in root.iter():
        tag = xml_local_name(element.tag)
        if tag in SVG_ACTIVE_ELEMENTS or tag == "foreignobject":
            raise ValueError(f"embedded SVG contains forbidden <{tag}> content")

        if tag == "style":
            css = "".join(element.itertext())
            if SVG_IMAGE_SET_RE.search(css):
                raise ValueError("embedded SVG style contains unsupported CSS image-set")
            if not svg_stylesheet_has_only_keyframes(css):
                raise ValueError("embedded SVG style contains a non-keyframe stylesheet rule")
            for match in SVG_URL_RE.finditer(css):
                reference = match.group(2).strip()
                if reference.startswith("#"):
                    local_fragment(reference, ids)
                elif reference.lower().startswith("data:image/"):
                    validate_embedded_image(reference, depth + 1, context)
                else:
                    raise ValueError("embedded SVG style contains an external URL")

        for raw_name, raw_value in element.attrib.items():
            name = xml_local_name(raw_name)
            value = raw_value.strip()
            if raw_name == f"{{{XML_NAMESPACE}}}base" or raw_name.lower() == "xml:base":
                raise ValueError("embedded SVG contains xml:base")
            if name.startswith("on"):
                raise ValueError("embedded SVG contains an event-handler attribute")
            if "\\" in value:
                raise ValueError("embedded SVG attribute contains a CSS escape")
            if SVG_IMAGE_SET_RE.search(value):
                raise ValueError("embedded SVG attribute contains unsupported CSS image-set")
            if name == "srcset":
                raise ValueError("embedded SVG contains an unsupported source set")
            if name in {"href", "src"} and value:
                if value.startswith("#"):
                    local_fragment(value, ids)
                elif tag in {"image", "feimage", "img"} and value.lower().startswith(
                    "data:image/"
                ):
                    validate_embedded_image(value, depth + 1, context)
                else:
                    raise ValueError("embedded SVG contains an external reference")
            if name in {"background", "poster"} and value:
                if value.startswith("#"):
                    local_fragment(value, ids)
                elif value.lower().startswith("data:image/"):
                    validate_embedded_image(value, depth + 1, context)
                else:
                    raise ValueError("embedded SVG contains an external render asset")
            for match in SVG_URL_RE.finditer(value):
                reference = match.group(2).strip()
                if reference.startswith("#"):
                    local_fragment(reference, ids)
                elif reference.lower().startswith("data:image/"):
                    validate_embedded_image(reference, depth + 1, context)
                else:
                    raise ValueError("embedded SVG attribute contains an external URL")
    if not svg_has_renderable_graphic(root, elements_by_id):
        raise ValueError("embedded SVG has no renderable graphic content")


def validate_png(raw: bytes) -> None:
    if len(raw) < 45 or raw[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("embedded PNG has an invalid or truncated signature")
    offset = 8
    saw_header = False
    saw_palette = False
    saw_idat = False
    ended_idat = False
    saw_end = False
    width = height = bit_depth = color_type = 0
    idat_chunks: list[bytes] = []
    while offset + 12 <= len(raw):
        length = int.from_bytes(raw[offset : offset + 4], "big")
        chunk_type = raw[offset + 4 : offset + 8]
        chunk_end = offset + 12 + length
        if chunk_end > len(raw):
            raise ValueError("embedded PNG contains a truncated chunk")
        chunk_data = raw[offset + 8 : offset + 8 + length]
        expected_crc = int.from_bytes(raw[offset + 8 + length : chunk_end], "big")
        actual_crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
        if actual_crc != expected_crc:
            raise ValueError("embedded PNG contains an invalid chunk checksum")
        try:
            chunk_name = chunk_type.decode("ascii")
        except UnicodeDecodeError as exc:
            raise ValueError("embedded PNG contains an invalid chunk type") from exc
        if not re.fullmatch(r"[A-Za-z]{2}[A-Z][A-Za-z]", chunk_name):
            raise ValueError("embedded PNG contains an invalid chunk type")
        if not saw_header:
            if chunk_type != b"IHDR" or length != 13:
                raise ValueError("embedded PNG must start with a complete IHDR chunk")
            width = int.from_bytes(chunk_data[:4], "big")
            height = int.from_bytes(chunk_data[4:8], "big")
            if width <= 0 or height <= 0:
                raise ValueError("embedded PNG has non-positive dimensions")
            if width > MAX_EMBEDDED_PNG_DIMENSION or height > MAX_EMBEDDED_PNG_DIMENSION:
                raise ValueError("embedded PNG dimensions exceed the validation limit")
            bit_depth = chunk_data[8]
            color_type = chunk_data[9]
            if bit_depth not in PNG_BIT_DEPTHS.get(color_type, set()):
                raise ValueError("embedded PNG has an invalid bit-depth/color-type combination")
            if chunk_data[10] != 0 or chunk_data[11] != 0:
                raise ValueError("embedded PNG uses an unsupported compression or filter method")
            if chunk_data[12] != 0:
                raise ValueError("embedded PNG interlacing is unsupported for embedded icon validation")
            saw_header = True
        elif chunk_type == b"IHDR":
            raise ValueError("embedded PNG contains multiple IHDR chunks")
        elif chunk_type == b"PLTE":
            if saw_palette or saw_idat or color_type in {0, 4}:
                raise ValueError("embedded PNG contains an invalid PLTE chunk")
            entries = length // 3
            if length == 0 or length % 3 or entries > 256 or (color_type == 3 and entries > 2**bit_depth):
                raise ValueError("embedded PNG contains an invalid PLTE chunk")
            saw_palette = True
        elif chunk_type == b"IDAT":
            if ended_idat or (color_type == 3 and not saw_palette):
                raise ValueError("embedded PNG contains invalid IDAT ordering")
            saw_idat = True
            idat_chunks.append(chunk_data)
        elif chunk_type == b"IEND":
            if length != 0 or chunk_end != len(raw):
                raise ValueError("embedded PNG has an invalid or non-final IEND chunk")
            saw_end = True
            break
        else:
            if saw_idat:
                ended_idat = True
            if chunk_name[0].isupper():
                raise ValueError(f"embedded PNG contains unsupported critical chunk {chunk_name}")
        offset = chunk_end
    if not saw_header or not idat_chunks or not saw_end:
        raise ValueError("embedded PNG must contain IHDR, IDAT, and IEND chunks")
    channels = PNG_CHANNELS[color_type]
    row_bytes = math.ceil(width * channels * bit_depth / 8)
    expected_length = height * (row_bytes + 1)
    if expected_length > MAX_EMBEDDED_PNG_DECODED_BYTES:
        raise ValueError("embedded PNG decoded data exceeds the validation limit")
    compressed = b"".join(idat_chunks)
    try:
        decompressor = zlib.decompressobj()
        decoded = decompressor.decompress(compressed, expected_length + 1)
        if len(decoded) > expected_length or decompressor.unconsumed_tail:
            raise ValueError("embedded PNG decoded data exceeds its expected scanline length")
        decoded += decompressor.flush(expected_length + 1 - len(decoded))
    except zlib.error as exc:
        raise ValueError("embedded PNG contains invalid compressed pixel data") from exc
    if not decompressor.eof or decompressor.unused_data:
        raise ValueError("embedded PNG contains an incomplete or trailing zlib stream")
    if len(decoded) != expected_length:
        raise ValueError("embedded PNG decoded data does not match its scanline layout")
    for offset in range(0, expected_length, row_bytes + 1):
        if decoded[offset] > 4:
            raise ValueError("embedded PNG contains an invalid scanline filter")


def validate_embedded_svg(uri: str) -> None:
    media_type, raw = decode_data_image(uri)
    if media_type != "svg+xml":
        raise ValueError("embedded image is not SVG")
    validate_embedded_svg_bytes(raw, 0, {"bytes": 0})


def validate_embedded_image(
    uri: str, depth: int = 0, context: dict[str, int] | None = None
) -> str:
    media_type, raw = decode_data_image(uri)
    inspection = context if context is not None else {"bytes": 0}
    if media_type == "svg+xml":
        validate_embedded_svg_bytes(raw, depth, inspection)
        return media_type
    validate_png(raw)
    return media_type


def parse_srcset_sources(value: str) -> list[str]:
    """Extract every URL candidate without splitting commas inside data URIs."""
    sources: list[str] = []
    position = 0
    length = len(value)
    whitespace = "\t\n\f\r "

    while position < length:
        while position < length and value[position] in whitespace + ",":
            position += 1
        if position >= length:
            break

        url_start = position
        is_data_uri = value[position : position + 5].lower() == "data:"
        while position < length:
            character = value[position]
            if character in whitespace or (character == "," and not is_data_uri):
                break
            position += 1
        url = value[url_start:position]

        if position < length and value[position] == ",":
            position += 1
            if url:
                sources.append(url)
            continue

        if url.endswith(","):
            url = url.rstrip(",")
            if url:
                sources.append(url)
            continue

        if url:
            sources.append(url)

        in_parentheses = False
        while position < length:
            character = value[position]
            position += 1
            if character == "(":
                in_parentheses = True
            elif character == ")":
                in_parentheses = False
            elif character == "," and not in_parentheses:
                break

    return sources


def normalize_url_for_scheme(value: str) -> str:
    without_tab_or_newline = re.sub(r"[\t\n\r]", "", str(value or ""))
    return re.sub(r"^[\x00-\x20]+|[\x00-\x20]+$", "", without_tab_or_newline)


class ImageSourceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.sources: list[str] = []
        self.style_depth = 0

    def collect_css_sources(self, value: str) -> None:
        if "\\" in value:
            self.sources.append("unsafe-css:escape")
        if re.search(r"@import\b", value, flags=re.IGNORECASE):
            self.sources.append("unsafe-css:import")
        if SVG_IMAGE_SET_RE.search(value):
            self.sources.append("unsupported-css:image-set")
        for match in SVG_URL_RE.finditer(value):
            self.sources.append(match.group(2).strip())

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_name = tag.lower()
        values = [(name.lower(), (value or "").strip()) for name, value in attrs]
        if tag_name == "style":
            self.style_depth += 1
        if tag_name in {"img", "image", "source"}:
            image_sources: list[str] = []
            for name, value in values:
                if name in {"src", "href", "xlink:href"} and value:
                    image_sources.append(value)
                elif name == "srcset" and value:
                    image_sources.extend(parse_srcset_sources(value))
            self.sources.extend(image_sources)
            if not image_sources:
                self.sources.append(f"missing-image-source:{tag_name}")
        resource_attributes = {
            "animate": ("href", "xlink:href"),
            "animatemotion": ("href", "xlink:href"),
            "animatetransform": ("href", "xlink:href"),
            "audio": ("src",),
            "base": ("href",),
            "discard": ("href", "xlink:href"),
            "embed": ("src",),
            "feimage": ("href", "xlink:href"),
            "filter": ("href", "xlink:href"),
            "frame": ("src",),
            "iframe": ("src",),
            "input": ("src",),
            "lineargradient": ("href", "xlink:href"),
            "link": ("href",),
            "mpath": ("href", "xlink:href"),
            "object": ("data",),
            "pattern": ("href", "xlink:href"),
            "radialgradient": ("href", "xlink:href"),
            "script": ("src", "href"),
            "set": ("href", "xlink:href"),
            "textpath": ("href", "xlink:href"),
            "track": ("src",),
            "use": ("href", "xlink:href"),
            "video": ("src", "poster"),
        }
        resource_names = set(resource_attributes.get(tag_name, ()))
        self.sources.extend(value for name, value in values if name in resource_names and value)
        if tag_name in {"embed", "frame", "iframe", "object", "script"}:
            self.sources.append(f"active-content:{tag_name}")
        if tag_name in SVG_ANIMATION_ELEMENTS:
            self.sources.append(f"active-content:{tag_name}")
        for name, value in values:
            literal = normalize_url_for_scheme(value).lower()
            if name == "xml:base":
                self.sources.append("active-content:xml:base")
            elif name.startswith("on") or literal.startswith(
                ("javascript:", "vbscript:", "data:text/html")
            ):
                self.sources.append(value or f"active-content:{name}")
            if name == "style":
                self.collect_css_sources(value)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "style" and self.style_depth:
            self.style_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.style_depth:
            self.collect_css_sources(data)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_pi(self, data: str) -> None:
        self.sources.append("active-content:processing-instruction")


def root_cell_elements(root: ET.Element) -> list[ET.Element]:
    cells: list[ET.Element] = []
    for child in root:
        if child.tag == "mxCell":
            cells.append(child)
            continue
        if xml_local_name(child.tag) not in {"object", "userobject"}:
            continue
        nested = [element for element in child if element.tag == "mxCell"]
        if len(nested) != 1:
            raise ValueError("draw.io object wrapper must contain exactly one mxCell")
        normalized = copy.deepcopy(nested[0])
        wrapper_id = child.get("id")
        inner_id = normalized.get("id")
        if wrapper_id and inner_id and wrapper_id != inner_id:
            raise ValueError("draw.io object wrapper and mxCell IDs disagree")
        if wrapper_id and not inner_id:
            normalized.set("id", wrapper_id)
        if normalized.get("value") is None:
            wrapper_value = child.get("label") or child.get("value")
            if wrapper_value is not None:
                normalized.set("value", wrapper_value)
        if normalized.get("link") is None and child.get("link") is not None:
            normalized.set("link", child.get("link", ""))
        cells.append(normalized)
    return cells


def collect_model_image_sources(cells: list[Cell]) -> list[tuple[str | None, str]]:
    sources: list[tuple[str | None, str]] = []
    for cell in cells:
        image = cell.style_map.get("image")
        if image is not None:
            sources.append((cell.id, image.strip()))
        parser = ImageSourceParser()
        try:
            parser.feed(html.unescape(cell.value))
            parser.close()
        except (TypeError, ValueError):
            parser.sources.append("")
        for source in parser.sources:
            sources.append((cell.id, source))
        for text in (cell.style, html.unescape(cell.value)):
            for match in SVG_URL_RE.finditer(text):
                source = match.group(2).strip()
                if (cell.id, source) not in sources:
                    sources.append((cell.id, source))
    return sources


def strip_html(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "\n", value))


def estimate_text_width(line: str, font_size: float) -> float:
    width = 0.0
    for char in line:
        width += font_size * (1.05 if ord(char) >= 0x2E80 else 0.52)
    return width


def luminance(hex_color: str) -> float:
    channels = [int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    high, low = max(la, lb), min(la, lb)
    return (high + 0.05) / (low + 0.05)


def colors_from(value: str | None) -> list[str]:
    if not value or value == "none":
        return []
    pairs = [color for match in LIGHT_DARK_RE.findall(value) for color in match]
    return pairs or HEX_RE.findall(value)


def contrast_checks(fill_colors: list[str], font_colors: list[str]) -> list[tuple[str, str]]:
    if len(fill_colors) == len(font_colors):
        return list(zip(fill_colors, font_colors))
    if len(fill_colors) == 1:
        return [(fill_colors[0], font) for font in font_colors]
    if len(font_colors) == 1:
        return [(fill, font_colors[0]) for fill in fill_colors]
    return [(fill, font) for fill in fill_colors for font in font_colors]


def abs_bbox(
    cell: Cell,
    cells_by_id: dict[str, Cell],
    seen: set[str] | None = None,
    depth: int = 0,
) -> tuple[float, float, float, float] | None:
    if cell.geometry is None:
        return None
    x, y, width, height = cell.geometry
    if depth >= 20 or (cell.id and cell.id in (seen or set())):
        return (x, y, width, height)
    parent = cells_by_id.get(cell.parent or "")
    if parent is None or parent.id in ("0", "1"):
        return (x, y, width, height)
    next_seen = set(seen or set())
    if cell.id:
        next_seen.add(cell.id)
    parent_box = abs_bbox(parent, cells_by_id, next_seen, depth + 1)
    if parent_box is None:
        return (x, y, width, height)
    parent_x, parent_y, parent_width, parent_height = parent_box
    if cell.relative_geometry:
        offset_x, offset_y = cell.geometry_offset
        x = parent_x + x * parent_width + offset_x
        y = parent_y + y * parent_height + offset_y
    else:
        x += parent_x
        y += parent_y
    return (x, y, width, height)


def add_error(messages: list[str], cid: str | None, message: str) -> None:
    messages.append(f"ERROR [{cid or '?'}] {message}")


def add_warning(messages: list[str], cid: str | None, message: str) -> None:
    messages.append(f"WARN  [{cid or '?'}] {message}")


def validate_finite_mx_geometry(cell: Cell, errors: list[str]) -> None:
    geometry = cell.el.find("mxGeometry")
    if geometry is None:
        return
    for element, label in [(geometry, "mxGeometry"), *[(point, "mxPoint") for point in geometry.iter("mxPoint")]]:
        for attribute in ("x", "y", "width", "height"):
            if attribute not in element.attrib:
                continue
            try:
                value = float(element.attrib[attribute])
            except ValueError:
                add_error(errors, cell.id, f"{label} {attribute} must be numeric")
                continue
            if not math.isfinite(value):
                add_error(errors, cell.id, f"{label} {attribute} must be finite")


def data_role(cell: Cell) -> str:
    return cell.style_map.get("dataRole", "").strip().lower()


GROUP_ROLES = frozenset({"boundary", "container", "group", "zone"})


def is_semantic_group(cell: Cell) -> bool:
    return (
        cell.is_vertex
        and not cell.is_text_label
        and (
            cell.style_map.get("container") == "1"
            or "swimlane" in cell.style
            or data_role(cell) in GROUP_ROLES
        )
    )


def group_ancestors(cell: Cell, cells_by_id: dict[str, Cell], group_ids: set[str]) -> list[str]:
    result: list[str] = []
    parent_id = cell.parent
    seen: set[str] = set()
    while parent_id and parent_id not in seen:
        seen.add(parent_id)
        parent = cells_by_id.get(parent_id)
        if parent is None:
            break
        if parent.id in group_ids:
            result.append(parent.id)
        parent_id = parent.parent
    return result


def style_flags(cell: Cell) -> set[str]:
    return {
        token.strip().lower()
        for token in cell.style.split(";")
        if token.strip() and "=" not in token
    }


def is_image_cell(cell: Cell) -> bool:
    return cell.style_map.get("shape", "").strip().lower() == "image" or "image" in style_flags(cell)


def is_visible_profile_vertex(cell: Cell, cells_by_id: dict[str, Cell]) -> bool:
    if not cell.is_vertex:
        return False
    geometries = cell.el.findall("mxGeometry")
    if len(geometries) != 1 or geometries[0].get("as") != "geometry":
        return False
    geometry = geometries[0]
    try:
        width = float(geometry.get("width", ""))
        height = float(geometry.get("height", ""))
    except ValueError:
        return False
    if not math.isfinite(width) or not math.isfinite(height) or width <= 0 or height <= 0:
        return False

    current: Cell | None = cell
    seen: set[str] = set()
    while current is not None:
        if current.el.get("visible") == "0":
            return False
        if current.id is None or current.id in seen:
            return False
        seen.add(current.id)
        current = cells_by_id.get(current.parent) if current.parent is not None else None
    return True


def is_nonsemantic_vertex(cell: Cell) -> bool:
    role = data_role(cell)
    nested_visual = cell.parent not in (None, "0", "1") and (
        is_image_cell(cell) or "shape=umlActor" in cell.style
    )
    return (
        nested_visual
        or role in NONSEMANTIC_VERTEX_ROLES
        or role.startswith(("annotation-", "decorative-", "legend-", "structural-"))
    )


def is_nonsemantic_child_of_endpoint(
    cell: Cell, cells_by_id: dict[str, Cell], endpoint_ids: set[str]
) -> bool:
    if data_role(cell) and not is_nonsemantic_vertex(cell):
        return False
    parent_id = cell.parent
    seen: set[str] = set()
    while parent_id and parent_id not in seen:
        if parent_id in endpoint_ids:
            return True
        seen.add(parent_id)
        parent = cells_by_id.get(parent_id)
        parent_id = parent.parent if parent else None
    return False


def is_directed_semantic_flow(edge: Cell) -> bool:
    role = data_role(edge)
    if role in EXPLICIT_FLOW_ROLES:
        return True
    if role in STATIC_EDGE_ROLES:
        return False
    return has_static_direction(edge)


def has_static_direction(edge: Cell) -> bool:
    end_arrow = edge.style_map.get("endArrow")
    start_arrow = edge.style_map.get("startArrow")
    return end_arrow != "none" or start_arrow not in (None, "none")


def validate_animation_style(cell: Cell, errors: list[str]) -> None:
    animation_keys = {key for key in cell.style_map if key.startswith("flowAnimation")}
    for key in sorted(animation_keys - FLOW_ANIMATION_KEYS):
        add_error(errors, cell.id, f'unknown flow animation style key "{key}"')
    if animation_keys and not cell.is_edge:
        add_error(errors, cell.id, "flow animation styles are only valid on edges")

    enabled = cell.style_map.get("flowAnimation")
    if enabled is not None and enabled not in ("0", "1"):
        add_error(errors, cell.id, f'flowAnimation must be 0 or 1, got "{enabled}"')

    duration = cell.style_map.get("flowAnimationDuration")
    if duration is not None and (
        re.fullmatch(r"\d+", duration) is None or int(duration) <= 0
    ):
        add_error(
            errors,
            cell.id,
            f'flowAnimationDuration must be a positive integer, got "{duration}"',
        )

    timing = cell.style_map.get("flowAnimationTimingFunction")
    if timing is not None and timing not in FLOW_ANIMATION_TIMINGS:
        allowed = ", ".join(sorted(FLOW_ANIMATION_TIMINGS))
        add_error(
            errors,
            cell.id,
            f'flowAnimationTimingFunction must be one of {allowed}, got "{timing}"',
        )

    direction = cell.style_map.get("flowAnimationDirection")
    if direction is not None and direction not in FLOW_ANIMATION_DIRECTIONS:
        allowed = ", ".join(sorted(FLOW_ANIMATION_DIRECTIONS))
        add_error(
            errors,
            cell.id,
            f'flowAnimationDirection must be one of {allowed}, got "{direction}"',
        )


def validate_model(
    name: str,
    model: ET.Element,
    profile: str,
    theme: str | None,
    animation: str,
    require_self_contained_images: bool,
) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []
    adaptive_colors = model.get("adaptiveColors") == "auto"
    root = model.find("root")
    if root is None:
        add_error(errors, name, "missing mxGraphModel/root")
        return {
            "name": name,
            "page_name_sha256": hashlib.sha256(name.encode("utf-8")).hexdigest(),
            "adaptive_colors": adaptive_colors,
            "errors": errors,
            "warnings": warnings,
            "embedded_svg_sources": 0,
            "embedded_svg_sha256s": [],
            "embedded_svg_cell_sha256s": [],
            "directed_flow_edges": 0,
            "animated_edges": 0,
            "cell_id_sha256s": [],
            "component_cell_id_sha256s": [],
            "component_label_sha256s": [],
            "group_cell_id_sha256s": [],
            "group_label_sha256s": [],
            "group_membership_sha256s": [],
            "native_stencil_cell_id_sha256s": [],
            "native_stencil_identity_sha256s": [],
            "directed_edge_sha256s": [],
            "directed_edge_identity_sha256s": [],
            "edge_role_sha256s": [],
            "profile_style_sha256s": [],
            "link_sha256s": [],
        }

    if not adaptive_colors:
        add_warning(warnings, name, 'missing adaptiveColors="auto" on mxGraphModel')

    try:
        cell_elements = root_cell_elements(root)
    except ValueError as exc:
        add_error(errors, name, str(exc))
        cell_elements = [element for element in root if element.tag == "mxCell"]
    cells = [Cell.from_element(el, index) for index, el in enumerate(cell_elements)]
    cells_by_id: dict[str, Cell] = {}
    duplicate_ids: set[str] = set()
    for cell in cells:
        if cell.id is None:
            add_error(errors, cell.id, "mxCell without id")
            continue
        if cell.id in cells_by_id:
            duplicate_ids.add(cell.id)
            add_error(errors, cell.id, "duplicate id")
            continue
        cells_by_id[cell.id] = cell

    if "0" not in cells_by_id or "1" not in cells_by_id:
        add_error(errors, "root", 'missing base cells <mxCell id="0"/> and <mxCell id="1" parent="0"/>')
    else:
        root_cell = cells_by_id["0"]
        layer_cell = cells_by_id["1"]
        if root_cell.parent is not None:
            add_error(errors, "0", '<mxCell id="0"/> must not have a parent')
        if layer_cell.parent != "0":
            add_error(errors, "1", '<mxCell id="1"/> must set parent="0"')

    content = [cell for cell in cells if cell.id not in ("0", "1")]
    vertices = [cell for cell in content if cell.is_vertex]
    edges = [cell for cell in content if cell.is_edge]
    directed_flow_edges = sum(is_directed_semantic_flow(edge) for edge in edges)
    animated_edges = sum(edge.style_map.get("flowAnimation") == "1" for edge in edges)
    cell_id_sha256s = sorted(
        hashlib.sha256(cell_id.encode("utf-8")).hexdigest() for cell_id in cells_by_id
    )
    component_cell_id_sha256s = sorted(
        hashlib.sha256(cell.id.encode("utf-8")).hexdigest()
        for cell in content
        if cell.id and cell.is_vertex and data_role(cell) == "component"
    )
    component_label_sha256s = sorted(
        hashlib.sha256(
            f"{cell.id}\0{' '.join(strip_html(cell.value).split())}".encode("utf-8")
        ).hexdigest()
        for cell in content
        if cell.id
        and cell.is_vertex
        and data_role(cell) == "component"
        and strip_html(cell.value).strip()
    )
    semantic_groups = [cell for cell in content if cell.id and is_semantic_group(cell)]
    group_ids = {cell.id for cell in semantic_groups if cell.id}
    group_cell_id_sha256s = sorted(
        hashlib.sha256(cell.id.encode("utf-8")).hexdigest()
        for cell in semantic_groups
        if cell.id
    )
    group_label_sha256s = sorted(
        hashlib.sha256(
            f"{cell.id}\0{' '.join(strip_html(cell.value).split())}".encode("utf-8")
        ).hexdigest()
        for cell in semantic_groups
        if cell.id and strip_html(cell.value).strip()
    )
    group_membership_sha256s = sorted(
        hashlib.sha256(f"{cell.id}\0{group_id}".encode("utf-8")).hexdigest()
        for cell in content
        if cell.id and cell.is_vertex and data_role(cell) == "component"
        for group_id in group_ancestors(cell, cells_by_id, group_ids)
    )
    native_stencil_cells = [
        cell
        for cell in content
        if cell.id
        and cell.is_vertex
        and cell.style_map.get("shape", "").strip().lower().startswith("mxgraph.")
    ]
    native_stencil_cell_id_sha256s = sorted(
        hashlib.sha256(cell.id.encode("utf-8")).hexdigest()
        for cell in native_stencil_cells
    )
    native_stencil_identity_sha256s = sorted(
        hashlib.sha256(
            (
                f"{cell.id}\0{cell.parent or ''}\0"
                + "\0".join(
                    f"{key.lower()}={value.strip()}"
                    for key, value in sorted(
                        cell.style_map.items(), key=lambda item: item[0].lower()
                    )
                    if key.lower() == "shape"
                    or value.strip().lower().startswith("mxgraph.")
                )
            ).encode("utf-8")
        ).hexdigest()
        for cell in native_stencil_cells
    )
    directed_edge_sha256s = sorted(
        hashlib.sha256(f"{edge.source}\0{edge.target}".encode("utf-8")).hexdigest()
        for edge in edges
        if edge.source and edge.target
    )
    directed_edge_identity_sha256s = sorted(
        hashlib.sha256(
            f"{edge.id}\0{edge.source}\0{edge.target}".encode("utf-8")
        ).hexdigest()
        for edge in edges
        if edge.id and edge.source and edge.target
    )
    edge_role_sha256s = sorted(
        hashlib.sha256(f"{edge.id}\0{role}".encode("utf-8")).hexdigest()
        for edge in edges
        if edge.id and (role := data_role(edge))
    )
    profile_style_sha256s = sorted(
        {
            hashlib.sha256(f"{cell.id}\0{key}\0{value}".encode("utf-8")).hexdigest()
            for cell in cells
            if cell.id
            and cell.style_map.get("designProfile", "").strip()
            and is_visible_profile_vertex(cell, cells_by_id)
            for key, value in cell.style_map.items()
            if key in PROFILE_STYLE_HASH_KEYS
        }
    )
    link_sha256s = sorted(
        {
            hashlib.sha256(link.encode("utf-8")).hexdigest()
            for cell in cells
            if (link := (cell.el.get("link") or "").strip())
        }
    )

    for cell in content:
        if cell.parent is None or cell.parent not in cells_by_id:
            add_error(errors, cell.id, f'parent="{cell.parent}" does not exist')
        validate_finite_mx_geometry(cell, errors)
        validate_animation_style(cell, errors)

    for edge in edges:
        geo = edge.el.find("mxGeometry")
        if geo is None or geo.get("relative") != "1" or geo.get("as") != "geometry":
            add_error(errors, edge.id, 'edge missing <mxGeometry relative="1" as="geometry"/>')
        for attr, ref in (("source", edge.source), ("target", edge.target)):
            if not ref:
                point = geo.find(f'mxPoint[@as="{attr}Point"]') if geo is not None else None
                if point is None:
                    add_error(errors, edge.id, f"edge has no {attr}")
                continue
            target = cells_by_id.get(ref)
            if target is None:
                add_error(errors, edge.id, f'{attr}="{ref}" does not exist')
            elif target.is_edge:
                add_error(errors, edge.id, f'{attr}="{ref}" references an edge')
            elif not target.is_vertex:
                add_error(errors, edge.id, f'{attr}="{ref}" is not a vertex')
        for attr in ("sourcePort", "targetPort"):
            ref = edge.style_map.get(attr)
            if not ref:
                continue
            port = cells_by_id.get(ref)
            if port is None:
                add_error(errors, edge.id, f'{attr}="{ref}" does not exist')
            elif not port.is_vertex:
                add_error(errors, edge.id, f'{attr}="{ref}" is not a vertex')
        if profile == "flowforge" and "endArrow=none" not in edge.style and "edgeStyle=orthogonalEdgeStyle" not in edge.style:
            add_error(errors, edge.id, "flowforge profile requires edgeStyle=orthogonalEdgeStyle")
        role = data_role(edge)
        if role in EXPLICIT_FLOW_ROLES and not has_static_direction(edge):
            add_warning(
                warnings,
                edge.id,
                f'semantic flow role "{role}" has no static arrow direction; '
                "animation must not carry direction alone",
            )
        if role in STATIC_EDGE_ROLES and edge.style_map.get("flowAnimation") == "1":
            add_warning(
                warnings,
                edge.id,
                f'static edge role "{role}" should not use flowAnimation=1',
            )
        if animation == "on" and is_directed_semantic_flow(edge):
            if not has_static_direction(edge):
                add_error(
                    errors,
                    edge.id,
                    "directed semantic flow edge requires a static arrow direction under --animation on",
                )
            if edge.style_map.get("flowAnimation") != "1":
                add_error(
                    errors,
                    edge.id,
                    "directed semantic flow edge requires flowAnimation=1 under --animation on",
                )
        elif animation == "off" and edge.style_map.get("flowAnimation") == "1":
            add_error(errors, edge.id, "flowAnimation=1 is forbidden under --animation off")

    if any(edge.style_map.get("flowAnimation") == "1" for edge in edges):
        for vertex in vertices:
            legend_text = strip_html(vertex.value).strip().lower()
            looks_like_legend = (
                data_role(vertex) == "legend"
                or "legend" in (vertex.id or "").lower()
                or ("solid" in legend_text and "dash" in legend_text)
            )
            if looks_like_legend and ("solid" in legend_text or "dash" in legend_text):
                add_warning(
                    warnings,
                    vertex.id,
                    "legend uses solid/dashed edge semantics while flowAnimation=1 renders "
                    "a moving dash pattern; add an independent arrowhead, label, or status cue",
                )

    boxes: dict[str, tuple[float, float, float, float]] = {}
    for vertex in vertices:
        geo = vertex.el.find("mxGeometry")
        if geo is None or geo.get("as") != "geometry":
            add_error(errors, vertex.id, 'vertex missing <mxGeometry as="geometry"/>')
            continue
        if vertex.geometry is None:
            add_error(errors, vertex.id, "vertex has no usable mxGeometry")
            continue
        bbox = abs_bbox(vertex, cells_by_id)
        if bbox is None:
            add_error(errors, vertex.id, "vertex geometry could not be resolved")
            continue
        x, y, width, height = bbox
        boxes[vertex.id or ""] = bbox
        if width < 0 or height < 0:
            add_error(errors, vertex.id, f"negative geometry {width:g}x{height:g}")
        if (
            vertex.is_filled_shape
            and not vertex.is_decorative_line
            and data_role(vertex) != "icon"
            and (width < 40 or height < 20)
        ):
            add_warning(warnings, vertex.id, f"tiny vertex {width:g}x{height:g}")

    for cell in content:
        font_size = cell.style_map.get("fontSize")
        if font_size:
            try:
                if float(font_size) < 9:
                    add_error(errors, cell.id, f"fontSize {font_size} below minimum 9")
            except ValueError:
                add_warning(warnings, cell.id, f"invalid fontSize {font_size}")
        for match in INLINE_FONT_SIZE_RE.finditer(cell.value):
            if float(match.group(1)) < 9:
                add_warning(warnings, cell.id, f"inline font-size {match.group(1)}px below 9")

    filled = [vertex for vertex in vertices if vertex.is_filled_shape and vertex.id in boxes]
    for i, a in enumerate(filled):
        ax, ay, aw, ah = boxes[a.id or ""]
        for b in filled[i + 1 :]:
            bx, by, bw, bh = boxes[b.id or ""]
            ix = min(ax + aw, bx + bw) - max(ax, bx)
            iy = min(ay + ah, by + bh) - max(ay, by)
            if ix <= 2 or iy <= 2:
                continue
            a_in_b = ax >= bx and ay >= by and ax + aw <= bx + bw and ay + ah <= by + bh
            b_in_a = bx >= ax and by >= ay and bx + bw <= ax + aw and by + bh <= ay + ah
            if a_in_b or b_in_a:
                outer, inner = (b, a) if a_in_b else (a, b)
                if outer.index > inner.index:
                    add_error(errors, outer.id, f"container drawn after child {inner.id}")
            else:
                overlap_area = ix * iy
                min_area = max(1.0, min(aw * ah, bw * bh))
                if overlap_area / min_area > 0.15:
                    add_error(errors, a.id, f"overlaps node {b.id}")

    for child in vertices:
        parent = cells_by_id.get(child.parent or "")
        if not parent or not parent.is_vertex or child.id not in boxes or parent.id not in boxes:
            continue
        cx, cy, cw, ch = boxes[child.id or ""]
        px, py, pw, ph = boxes[parent.id or ""]
        pad = 2
        if cx < px - pad or cy < py - pad or cx + cw > px + pw + pad or cy + ch > py + ph + pad:
            add_error(errors, child.id, f"child outside parent {parent.id} bounds")

    endpoint_ids = (
        {edge.source for edge in edges if edge.source}
        | {edge.target for edge in edges if edge.target}
        | {edge.style_map.get("sourcePort") for edge in edges if edge.style_map.get("sourcePort")}
        | {edge.style_map.get("targetPort") for edge in edges if edge.style_map.get("targetPort")}
    )
    for vertex in vertices:
        if (
            vertex.id
            and vertex.id not in endpoint_ids
            and not is_nonsemantic_child_of_endpoint(vertex, cells_by_id, endpoint_ids)
            and not vertex.is_container
            and not vertex.is_decorative_line
            and not is_nonsemantic_vertex(vertex)
        ):
            add_warning(warnings, vertex.id, "orphan vertex has no incoming or outgoing edge")

    seen_edges: set[tuple[str | None, str | None, str]] = set()
    edge_families: set[str] = set()
    for edge in edges:
        key = (edge.source, edge.target, strip_html(edge.value).strip())
        if key in seen_edges:
            add_warning(warnings, edge.id, "duplicate parallel edge")
        seen_edges.add(key)
        if "edgeStyle=orthogonalEdgeStyle" in edge.style:
            edge_families.add("orthogonal")
        elif "elbowEdgeStyle" in edge.style:
            edge_families.add("elbow")
        elif "endArrow=none" not in edge.style:
            edge_families.add("other")
        if len(strip_html(edge.value).strip()) > 40:
            add_warning(warnings, edge.id, "long edge label")
    if profile == "generic" and len(edge_families) > 1:
        add_warning(warnings, name, f"mixed edge style families: {', '.join(sorted(edge_families))}")

    for vertex in vertices:
        if not vertex.value or vertex.id not in boxes or vertex.is_decorative_line:
            continue
        _, _, width, _height = boxes[vertex.id or ""]
        try:
            font_size = float(vertex.style_map.get("fontSize", "13"))
        except ValueError:
            font_size = 13
        usable_width = (width * 0.6 if "rhombus" in vertex.style else width) - 4
        for line in (line.strip() for line in strip_html(vertex.value).splitlines()):
            if line and estimate_text_width(line, font_size) > usable_width and "whiteSpace=wrap" not in vertex.style:
                add_warning(warnings, vertex.id, f'text "{line[:30]}..." may not fit')
                break

    missing_image_source_cells: set[str | None] = set()
    if require_self_contained_images:
        for cell in content:
            image_declared = is_image_cell(cell) or "image" in cell.style_map
            if image_declared and not cell.style_map.get("image", "").strip():
                missing_image_source_cells.add(cell.id)
                add_error(errors, cell.id, "image cell has an empty or missing image source")

    embedded_svg_sources = 0
    embedded_svg_sha256s: set[str] = set()
    embedded_svg_cell_sha256s: set[str] = set()
    embedded_svg_context = {"bytes": 0}
    for cell_id, source in dict.fromkeys(collect_model_image_sources(cells)):
        normalized = source.strip()
        if not normalized and cell_id in missing_image_source_cells:
            continue
        if normalized.lower().startswith("data:image/"):
            try:
                media_type = validate_embedded_image(normalized, context=embedded_svg_context)
                if media_type == "svg+xml":
                    embedded_svg_sources += 1
                    _, raw_image = decode_data_image(normalized)
                    svg_digest = hashlib.sha256(raw_image).hexdigest()
                    embedded_svg_sha256s.add(svg_digest)
                    if cell_id:
                        embedded_svg_cell_sha256s.add(
                            hashlib.sha256(f"{cell_id}\0{svg_digest}".encode("utf-8")).hexdigest()
                        )
            except ValueError as exc:
                add_error(errors, cell_id, f"invalid embedded image: {exc}")
            continue
        message = "linked/remote icon in portable mode" if normalized.lower().startswith(
            ("http://", "https://", "//")
        ) else "non-embedded image source in portable mode"
        if require_self_contained_images:
            add_error(errors, cell_id, message)
        else:
            add_warning(warnings, cell_id, message)
    for cell in content:
        if is_image_cell(cell):
            if cell.geometry:
                _, _, width, height = cell.geometry
                if width <= 0 or height <= 0:
                    add_error(errors, cell.id, "icon has non-positive dimensions")
                elif width / height > 3 or height / width > 3:
                    add_warning(warnings, cell.id, "icon aspect-ratio risk")
                if cell.value and height < 40:
                    add_warning(warnings, cell.id, "icon-label overlap risk")

        for key in ("fillColor", "strokeColor", "fontColor"):
            value = cell.style_map.get(key)
            if not value or value == "none":
                continue
            raw_colors = colors_from(value)
            if value.lower() in ("#000000", "#ffffff") and "light-dark(" not in value:
                add_warning(warnings, cell.id, f"{key}={value} is pure black/white without light-dark()")
            if theme and raw_colors:
                # Theme membership is not encoded here; preserve theme arg as report metadata.
                pass

        fill_colors = colors_from(cell.style_map.get("fillColor"))
        font_colors = colors_from(cell.style_map.get("fontColor"))
        if fill_colors and font_colors:
            for fill, font in contrast_checks(fill_colors, font_colors):
                if contrast(fill, font) < 4.5:
                    add_error(errors, cell.id, f"text/fill contrast below 4.5:1 ({font} on {fill})")
                    break

    return {
        "name": name,
        "page_name_sha256": hashlib.sha256(name.encode("utf-8")).hexdigest(),
        "adaptive_colors": adaptive_colors,
        "errors": errors,
        "warnings": warnings,
        "embedded_svg_sources": embedded_svg_sources,
        "embedded_svg_sha256s": sorted(embedded_svg_sha256s),
        "embedded_svg_cell_sha256s": sorted(embedded_svg_cell_sha256s),
        "directed_flow_edges": directed_flow_edges,
        "animated_edges": animated_edges,
        "cell_id_sha256s": cell_id_sha256s,
        "component_cell_id_sha256s": component_cell_id_sha256s,
        "component_label_sha256s": component_label_sha256s,
        "group_cell_id_sha256s": group_cell_id_sha256s,
        "group_label_sha256s": group_label_sha256s,
        "group_membership_sha256s": group_membership_sha256s,
        "native_stencil_cell_id_sha256s": native_stencil_cell_id_sha256s,
        "native_stencil_identity_sha256s": native_stencil_identity_sha256s,
        "directed_edge_sha256s": directed_edge_sha256s,
        "directed_edge_identity_sha256s": directed_edge_identity_sha256s,
        "edge_role_sha256s": edge_role_sha256s,
        "profile_style_sha256s": profile_style_sha256s,
        "link_sha256s": link_sha256s,
    }


def main() -> None:
    args = parse_args()
    path = Path(args.file)
    try:
        if args.require_uncompressed:
            require_uncompressed_pages(path)
        models = parse_models(path)
    except (OSError, ET.ParseError, ValueError, base64.binascii.Error, zlib.error, UnicodeDecodeError) as exc:
        print(f"FATAL: cannot read or parse {path}: {exc}")
        sys.exit(2)

    pages = [
        validate_model(
            name,
            model,
            args.profile,
            args.theme,
            args.animation,
            args.require_self_contained_images,
        )
        for name, model in models
    ]
    if args.require_self_contained_images and not any(
        page["embedded_svg_sources"] for page in pages
    ):
        add_error(pages[0]["errors"], pages[0]["name"], "file has no valid embedded SVG image")
    total_errors = sum(len(page["errors"]) for page in pages)
    total_warnings = sum(len(page["warnings"]) for page in pages)
    result = {
        "status": "error" if total_errors else "warning" if total_warnings else "pass",
        "file": str(path),
        "profile": args.profile,
        "animation": args.animation,
        "require_self_contained_images": args.require_self_contained_images,
        "require_uncompressed": args.require_uncompressed,
        "theme": args.theme,
        "pages": pages,
        "adaptive_colors": all(bool(page["adaptive_colors"]) for page in pages),
        "profile_style_sha256s": sorted(
            {
                digest
                for page in pages
                for digest in page["profile_style_sha256s"]
            }
        ),
        "summary": {"errors": total_errors, "warnings": total_warnings},
    }

    for page in pages:
        print(f"Page: {page['name']}")
        for line in page["errors"]:
            print(f"  {line}")
        for line in page["warnings"]:
            print(f"  {line}")
    print(f"{path}: {total_errors} error(s), {total_warnings} warning(s)")

    if args.json_path:
        Path(args.json_path).write_text(json.dumps(result, indent=2) + "\n", encoding="utf8")

    sys.exit(1 if total_errors else 0)


if __name__ == "__main__":
    main()
