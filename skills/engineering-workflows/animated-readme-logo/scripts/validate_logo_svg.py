#!/usr/bin/env python3
"""Validate a self-contained, repository-safe SVG logo without third-party packages."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any
from urllib.parse import unquote


MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_ELEMENTS = 20_000
MAX_DEPTH = 128
MAX_USE_DEPTH = 128
MAX_RENDER_DEPTH = 256
MAX_GRADIENT_REFERENCE_DEPTH = 128
MAX_FINDINGS = 16
MAX_DIMENSION = 32_768.0
MAX_CANVAS_AREA = 64_000_000.0
SVG_NAMESPACE = "http://www.w3.org/2000/svg"
XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
XLINK_NAMESPACE = "http://www.w3.org/1999/xlink"

NUMBER = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
LENGTH_RE = re.compile(rf"^({NUMBER})(?:px)?$", re.IGNORECASE)
URL_RE = re.compile(r"url\s*\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
SAFE_FRAGMENT_RE = re.compile(r"^#[A-Za-z_][A-Za-z0-9_.:-]*$")
DECLARATION_RE = re.compile(r"^\s*<\?xml\s+[^?]*\?>", re.IGNORECASE)
ENCODING_RE = re.compile(r"\bencoding\s*=\s*(['\"])([^'\"]+)\1", re.IGNORECASE)
PATH_TOKEN_RE = re.compile(rf"{NUMBER}|[AaCcHhLlMmQqSsTtVvZz]")
CSS_ESCAPE_RE = re.compile(r"\\(?:[0-9a-fA-F]{1,6}\s?|.)")
CSS_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
CSS_VARIABLE_RE = re.compile(r"\bvar\s*\(|(?:^|;)\s*--[a-z0-9_-]+\s*:", re.IGNORECASE)
CSS_LIVE_MOTION_RE = re.compile(
    r"@(?:-[a-z]+-)?keyframes\b|"
    r"(?:^|[;{])\s*(?:-[a-z]+-)?(?:animation|transition)(?:-[a-z-]+)?\s*:",
    re.IGNORECASE,
)
URI_SCHEME_RE = re.compile(r"^[a-z][a-z0-9+.-]*:", re.IGNORECASE)
WINDOWS_ABSOLUTE_RE = re.compile(r"^[a-z]:[\\/]", re.IGNORECASE)

DANGEROUS_ELEMENTS = {
    "script",
    "foreignobject",
    "iframe",
    "object",
    "embed",
    "audio",
    "video",
}
SMIL_ELEMENTS = {
    "animate",
    "animatecolor",
    "animatemotion",
    "animatetransform",
    "discard",
    "mpath",
    "set",
}
REFERENCE_ATTRIBUTES = {"href", "src", "poster"}
RENDERABLE_ELEMENTS = {
    "circle",
    "ellipse",
    "line",
    "path",
    "polygon",
    "polyline",
    "rect",
    "text",
    "use",
}
NON_RENDERING_CONTAINERS = {
    "clippath",
    "defs",
    "desc",
    "filter",
    "lineargradient",
    "marker",
    "mask",
    "metadata",
    "pattern",
    "radialgradient",
    "style",
    "symbol",
    "title",
}
CSS_PRESENTATION_ATTRIBUTES = {
    "animation",
    "animation-delay",
    "animation-direction",
    "animation-duration",
    "animation-fill-mode",
    "animation-iteration-count",
    "animation-name",
    "animation-play-state",
    "animation-timing-function",
    "clip-path",
    "color",
    "cursor",
    "display",
    "fill",
    "fill-opacity",
    "filter",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "marker-end",
    "marker-mid",
    "marker-start",
    "mask",
    "opacity",
    "overflow",
    "pointer-events",
    "shape-rendering",
    "stop-color",
    "stop-opacity",
    "stroke",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-opacity",
    "stroke-width",
    "text-anchor",
    "text-rendering",
    "transform-origin",
    "transition",
    "transition-delay",
    "transition-duration",
    "transition-property",
    "transition-timing-function",
    "vector-effect",
    "visibility",
}
STATIC_PRESENTATION_ATTRIBUTES = CSS_PRESENTATION_ATTRIBUTES | {
    "alignment-baseline",
    "baseline-shift",
    "clip-rule",
    "color-interpolation",
    "color-interpolation-filters",
    "color-rendering",
    "direction",
    "dominant-baseline",
    "fill-rule",
    "flood-color",
    "flood-opacity",
    "letter-spacing",
    "lighting-color",
    "paint-order",
    "stroke-miterlimit",
    "text-decoration",
    "unicode-bidi",
    "word-spacing",
    "writing-mode",
}
ALLOWED_STATIC_ELEMENTS = {
    "circle",
    "clippath",
    "defs",
    "desc",
    "ellipse",
    "feblend",
    "fecolormatrix",
    "fecomponenttransfer",
    "fecomposite",
    "feconvolvematrix",
    "fediffuselighting",
    "fedisplacementmap",
    "fedistantlight",
    "fedropshadow",
    "feflood",
    "fefunca",
    "fefuncb",
    "fefuncg",
    "fefuncr",
    "fegaussianblur",
    "feimage",
    "femerge",
    "femergenode",
    "femorphology",
    "feoffset",
    "fepointlight",
    "fespecularlighting",
    "fespotlight",
    "fetile",
    "feturbulence",
    "filter",
    "g",
    "image",
    "line",
    "lineargradient",
    "marker",
    "mask",
    "metadata",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialgradient",
    "rect",
    "script",
    "stop",
    "style",
    "svg",
    "symbol",
    "text",
    "textpath",
    "title",
    "tspan",
    "use",
} | DANGEROUS_ELEMENTS | SMIL_ELEMENTS
STATIC_GLOBAL_ATTRIBUTES = STATIC_PRESENTATION_ATTRIBUTES | {
    "aria-describedby",
    "aria-label",
    "aria-labelledby",
    "id",
    "lang",
    "role",
    "space",
    "style",
    "transform",
}
STATIC_GEOMETRY_ATTRIBUTES = {
    "circle": {"cx", "cy", "pathlength", "r"},
    "ellipse": {"cx", "cy", "pathlength", "rx", "ry"},
    "line": {"pathlength", "x1", "x2", "y1", "y2"},
    "path": {"d", "pathlength"},
    "polygon": {"pathlength", "points"},
    "polyline": {"pathlength", "points"},
    "rect": {"height", "pathlength", "rx", "ry", "width", "x", "y"},
    "svg": {
        "baseprofile",
        "height",
        "preserveaspectratio",
        "version",
        "viewbox",
        "width",
        "x",
        "y",
    },
    "symbol": {"height", "preserveaspectratio", "refx", "refy", "viewbox", "width"},
    "text": {"dx", "dy", "lengthadjust", "rotate", "textlength", "x", "y"},
    "textpath": {"href", "lengthadjust", "method", "side", "spacing", "startoffset", "textlength"},
    "tspan": {"dx", "dy", "lengthadjust", "rotate", "textlength", "x", "y"},
    "use": {"height", "href", "width", "x", "y"},
}
STATIC_RESOURCE_ATTRIBUTES = {
    "clippath": {"clippathunits"},
    "filter": {"filterunits", "height", "primitiveunits", "width", "x", "y"},
    "lineargradient": {"gradienttransform", "gradientunits", "href", "spreadmethod", "x1", "x2", "y1", "y2"},
    "marker": {"markerheight", "markerunits", "markerwidth", "orient", "preserveaspectratio", "refx", "refy", "viewbox"},
    "mask": {"height", "maskcontentunits", "maskunits", "width", "x", "y"},
    "pattern": {"height", "href", "patterncontentunits", "patterntransform", "patternunits", "preserveaspectratio", "viewbox", "width", "x", "y"},
    "radialgradient": {"cx", "cy", "fr", "fx", "fy", "gradienttransform", "gradientunits", "href", "r", "spreadmethod"},
    "stop": {"offset"},
}
STATIC_FILTER_ATTRIBUTES = {
    "amplitude",
    "azimuth",
    "basefrequency",
    "bias",
    "diffuseconstant",
    "divisor",
    "dx",
    "dy",
    "edgemode",
    "elevation",
    "exponent",
    "height",
    "in",
    "in2",
    "intercept",
    "kernelmatrix",
    "kernelunitlength",
    "k1",
    "k2",
    "k3",
    "k4",
    "limitingconeangle",
    "mode",
    "numoctaves",
    "operator",
    "order",
    "pointsatx",
    "pointsaty",
    "pointsatz",
    "preservealpha",
    "radius",
    "result",
    "scale",
    "seed",
    "slope",
    "specularconstant",
    "specularexponent",
    "stddeviation",
    "stitchtiles",
    "surfacescale",
    "tablevalues",
    "targetx",
    "targety",
    "type",
    "values",
    "width",
    "x",
    "xchannelselector",
    "y",
    "ychannelselector",
    "z",
}
PAINT_SERVER_TYPES = {"lineargradient", "pattern", "radialgradient"}
REFERENCE_TARGET_TYPES = {
    "clip-path": {"clippath"},
    "fill": PAINT_SERVER_TYPES,
    "filter": {"filter"},
    "marker-end": {"marker"},
    "marker-mid": {"marker"},
    "marker-start": {"marker"},
    "mask": {"mask"},
    "stroke": PAINT_SERVER_TYPES,
    "gradient-href": PAINT_SERVER_TYPES,
    "pattern-href": {"pattern"},
    "textpath-href": {"path"},
}

Bounds = tuple[float, float, float, float]
RenderSummary = tuple[bool, Bounds | None]


class Finding(dict[str, str]):
    def __init__(self, code: str, message: str):
        super().__init__(code=code, message=message)


def local_name(name: str) -> str:
    return name.rsplit("}", 1)[-1].rsplit(":", 1)[-1]


def namespace_name(name: str) -> str | None:
    if name.startswith("{") and "}" in name:
        return name[1:].split("}", 1)[0]
    return None


def static_attribute_is_allowed(element_name: str, attribute_name: str) -> bool:
    if attribute_name in STATIC_GLOBAL_ATTRIBUTES:
        return True
    if attribute_name in STATIC_GEOMETRY_ATTRIBUTES.get(element_name, set()):
        return True
    if attribute_name in STATIC_RESOURCE_ATTRIBUTES.get(element_name, set()):
        return True
    if element_name.startswith("fe") and attribute_name in STATIC_FILTER_ATTRIBUTES:
        return True
    return element_name in {"feimage", "image"} and attribute_name in {
        "height",
        "href",
        "preserveaspectratio",
        "width",
        "x",
        "y",
    }


def is_local_input_path(value: str) -> bool:
    return bool(WINDOWS_ABSOLUTE_RE.match(value)) or not URI_SCHEME_RE.match(value)


def finite_number(value: str) -> float | None:
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def positive_length(value: str | None) -> float | None:
    if value is None:
        return None
    match = LENGTH_RE.fullmatch(value.strip())
    if not match:
        return None
    parsed = finite_number(match.group(1))
    if parsed is None or parsed <= 0:
        return None
    return parsed


def parse_view_box(value: str | None) -> tuple[float, float, float, float] | None:
    if value is None:
        return None
    parts = [part for part in re.split(r"[\s,]+", value.strip()) if part]
    if len(parts) != 4:
        return None
    numbers = [finite_number(part) for part in parts]
    if any(number is None for number in numbers):
        return None
    x, y, width, height = numbers
    if width <= 0 or height <= 0:
        return None
    return (x, y, width, height)


def normalized_reference(value: str) -> str:
    result = value.strip()
    for _ in range(3):
        decoded = unquote(result)
        if decoded == result:
            break
        result = decoded
    return result.strip()


def reference_error(value: str) -> tuple[str, str] | None:
    literal = value.strip()
    normalized = normalized_reference(value)
    lowered = normalized.lower()
    if SAFE_FRAGMENT_RE.fullmatch(literal):
        return None
    if re.match(r"^[a-z][a-z0-9+.-]*:", lowered) or lowered.startswith("//"):
        return (
            "external-reference",
            "external, data, and file references are forbidden",
        )
    if (
        normalized.startswith(("/", "\\", "~"))
        or "\\" in normalized
        or any(part == ".." for part in normalized.split("/"))
    ):
        return ("unsafe-path-reference", "unsafe path-like references are forbidden")
    return (
        "nonlocal-reference",
        "only literal same-document fragment references are allowed",
    )


def color_is_obviously_transparent(value: str) -> bool:
    compact = re.sub(r"\s+", "", value).lower()
    if compact in {"none", "transparent"}:
        return True
    rgba = re.fullmatch(r"rgba\([^,]+,[^,]+,[^,]+,([^\)]+)\)", compact)
    if rgba:
        alpha = finite_number(rgba.group(1).rstrip("%"))
        if alpha is not None:
            if rgba.group(1).endswith("%"):
                return alpha <= 0
            return alpha <= 0
    functional_alpha = re.fullmatch(
        r"(?:rgba|hsla)\(.*,([^,\)]*)\)", compact
    ) or re.fullmatch(r"(?:rgba?|hsla?)\(.*\/([^\)]*)\)", compact)
    if functional_alpha:
        alpha = opacity_fraction(functional_alpha.group(1))
        return alpha is not None and alpha <= 0
    if re.fullmatch(r"#[0-9a-f]{4}", compact):
        return compact[-1] == "0"
    if re.fullmatch(r"#[0-9a-f]{8}", compact):
        return compact[-2:] == "00"
    return False


def opacity_is_zero(value: str | None) -> bool:
    if value is None:
        return False
    stripped = value.strip()
    parsed = finite_number(stripped.rstrip("%"))
    if parsed is None:
        return False
    return parsed <= 0


def rect_covers_canvas(
    element: ET.Element, view_box: tuple[float, float, float, float]
) -> bool:
    min_x, min_y, canvas_width, canvas_height = view_box

    def coordinate(name: str, default: float) -> float | None:
        raw = element.attrib.get(name)
        if raw is None:
            return default
        match = LENGTH_RE.fullmatch(raw.strip())
        return finite_number(match.group(1)) if match else None

    x = coordinate("x", 0.0)
    y = coordinate("y", 0.0)
    width_raw = element.attrib.get("width", "")
    height_raw = element.attrib.get("height", "")
    width = canvas_width if width_raw.strip() == "100%" else positive_length(width_raw)
    height = canvas_height if height_raw.strip() == "100%" else positive_length(height_raw)
    if None in (x, y, width, height):
        return False
    tolerance = max(canvas_width, canvas_height, 1.0) * 1e-7
    return (
        x <= min_x + tolerance
        and y <= min_y + tolerance
        and x + width >= min_x + canvas_width - tolerance
        and y + height >= min_y + canvas_height - tolerance
    )


def add_finding(findings: list[Finding], code: str, message: str) -> None:
    finding = Finding(code, message)
    if finding in findings or any(item["code"] == "too-many-findings" for item in findings):
        return
    if len(findings) >= MAX_FINDINGS - 1:
        findings.append(
            Finding(
                "too-many-findings",
                f"SVG exceeds the {MAX_FINDINGS - 1}-finding reporting limit; remaining findings omitted",
            )
        )
        return
    findings.append(finding)


def decode_svg(data: bytes, findings: list[Finding]) -> str | None:
    if data.startswith((b"\xff\xfe", b"\xfe\xff")) or data.startswith(
        (b"\x00<\x00?", b"<\x00?\x00")
    ):
        add_finding(
            findings,
            "utf16-forbidden",
            "SVG input must be UTF-8 or UTF-8 with a BOM; UTF-16 is forbidden",
        )
        return None
    if b"\x00" in data:
        add_finding(findings, "nul-byte", "SVG input must not contain NUL bytes")
        return None
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        add_finding(findings, "invalid-utf8", "SVG input is not valid UTF-8")
        return None


def declaration_findings(text: str, findings: list[Finding]) -> None:
    declaration = DECLARATION_RE.match(text)
    if declaration:
        encoding = ENCODING_RE.search(declaration.group(0))
        declared_encoding = encoding.group(2).lower().replace("_", "-") if encoding else None
        if declared_encoding not in {None, "utf-8", "utf8"}:
            add_finding(
                findings,
                "encoding-declaration",
                "XML encoding declaration must be UTF-8 when present",
            )
    without_declaration = DECLARATION_RE.sub("", text, count=1)
    if "<?" in without_declaration:
        add_finding(
            findings,
            "processing-instruction-forbidden",
            "XML processing instructions are forbidden",
        )


def hidden_by_presentation(element: ET.Element) -> bool:
    properties: dict[str, str] = {}
    style = element.attrib.get("style", "")
    for declaration in style.split(";"):
        if ":" not in declaration:
            continue
        key, value = declaration.split(":", 1)
        properties[key.strip().lower()] = re.sub(
            r"\s*!important\s*$", "", value.strip().lower()
        )
    for key in ("display", "visibility", "opacity"):
        if key in element.attrib:
            properties[key] = element.attrib[key].strip().lower()
    opacity = properties.get("opacity")
    parsed_opacity = finite_number(opacity.rstrip("%")) if opacity else None
    opacity_is_hidden = parsed_opacity is not None and parsed_opacity <= 0
    return opacity_is_hidden or properties.get("display") == "none" or properties.get(
        "visibility"
    ) in {
        "hidden",
        "collapse",
    }


def paint_state(element: ET.Element, inherited: dict[str, str] | None = None) -> dict[str, str]:
    result = dict(
        inherited
        or {
            "color": "black",
            "fill": "black",
            "fill-opacity": "1",
            "font-size": "16",
            "stroke": "none",
            "stroke-opacity": "1",
            "stroke-width": "1",
        }
    )
    style = element.attrib.get("style", "")
    declarations: dict[str, str] = {}
    for declaration in style.split(";"):
        key, separator, value = declaration.partition(":")
        if separator:
            declarations[key.strip().lower()] = re.sub(
                r"\s*!important\s*$", "", value.strip(), flags=re.IGNORECASE
            )
    for key in (
        "color",
        "fill",
        "fill-opacity",
        "font-size",
        "stroke",
        "stroke-opacity",
        "stroke-width",
    ):
        value = declarations.get(key) or element.attrib.get(key)
        if (
            value
            and value.strip().lower() != "inherit"
            and not (key == "color" and value.strip().lower() == "currentcolor")
        ):
            result[key] = value.strip()
    return result


def presentation_value(element: ET.Element, key: str) -> str | None:
    style = element.attrib.get("style", "")
    declarations: dict[str, str] = {}
    for declaration in style.split(";"):
        property_name, separator, value = declaration.partition(":")
        if separator:
            declarations[property_name.strip().lower()] = re.sub(
                r"\s*!important\s*$", "", value.strip(), flags=re.IGNORECASE
            )
    return declarations.get(key) or element.attrib.get(key)


def computed_color_values(root: ET.Element) -> dict[int, str]:
    colors: dict[int, str] = {}
    stack: list[tuple[ET.Element, str]] = [(root, "black")]
    while stack:
        element, inherited = stack.pop()
        value = (presentation_value(element, "color") or "").strip()
        color = (
            inherited
            if not value or value.lower() in {"inherit", "currentcolor"}
            else value
        )
        colors[id(element)] = color
        stack.extend((child, color) for child in reversed(list(element)))
    return colors


def pattern_has_direct_visible_content(
    pattern: ET.Element,
    identifiers: dict[str, ET.Element],
    computed_colors: dict[int, str],
) -> bool:
    def direct_paint_is_visible(
        element: ET.Element, paint: dict[str, str]
    ) -> bool:
        inherited_color = paint.get("color", "black")
        fill = paint.get("fill", "black")
        stroke = paint.get("stroke", "none")
        if fill.strip().lower() == "currentcolor":
            fill = inherited_color
        if stroke.strip().lower() == "currentcolor":
            stroke = inherited_color
        fill_visible = (
            primitive_fill_has_area(element)
            and not fill.lower().startswith("url(")
            and not color_is_obviously_transparent(fill)
            and not opacity_is_zero(paint.get("fill-opacity"))
        )
        stroke_width = paint.get("stroke-width", "1").strip()
        width_match = re.fullmatch(rf"({NUMBER})(?:[a-zA-Z%]+)?", stroke_width)
        width = finite_number(width_match.group(1)) if width_match else None
        stroke_visible = (
            not stroke.lower().startswith("url(")
            and not color_is_obviously_transparent(stroke)
            and not opacity_is_zero(paint.get("stroke-opacity"))
            and width is not None
            and width > 0
        )
        return fill_visible or stroke_visible

    def subtree(
        element: ET.Element,
        inherited_hidden: bool,
        referenced_root: bool,
        inherited_paint: dict[str, str] | None,
        visiting: set[str],
        depth: int,
    ) -> bool:
        if depth > MAX_RENDER_DEPTH:
            return False
        hidden = inherited_hidden or hidden_by_presentation(element)
        if hidden:
            return False
        if transform_is_obviously_singular(element):
            return False
        if any(
            (presentation_value(element, effect) or "").strip().lower()
            not in {"", "none"}
            for effect in ("clip-path", "filter", "mask")
        ):
            return False
        paint = paint_state(element, inherited_paint)
        name = local_name(element.tag).lower()
        if name in NON_RENDERING_CONTAINERS and not (
            referenced_root and name == "symbol"
        ):
            return False
        if name in RENDERABLE_ELEMENTS - {"use"}:
            return primitive_has_geometry(element, paint) and direct_paint_is_visible(
                element, paint
            )
        if name == "use":
            href = href_value(element)
            literal = href.strip() if href else ""
            if not SAFE_FRAGMENT_RE.fullmatch(literal):
                return False
            fragment = literal[1:]
            if fragment in visiting or len(visiting) >= MAX_USE_DEPTH:
                return False
            target = identifiers.get(fragment)
            if target is None or not use_has_size(element, target):
                return False
            visiting.add(fragment)
            visible = subtree(target, False, True, paint, visiting, depth + 1)
            visiting.remove(fragment)
            return visible
        return any(
            subtree(child, hidden, False, paint, visiting, depth + 1)
            for child in element
        )

    base_paint = paint_state(pattern)
    base_paint["color"] = computed_colors.get(id(pattern), "black")
    return any(
        subtree(child, False, False, base_paint, set(), 0) for child in pattern
    )


def pattern_paint_is_obviously_transparent(
    target: ET.Element,
    identifiers: dict[str, ET.Element],
    computed_colors: dict[int, str],
) -> bool:
    width: str | None = None
    height: str | None = None
    visiting: set[str] = set()
    current = target
    for _ in range(MAX_GRADIENT_REFERENCE_DEPTH):
        identifier = current.attrib.get("id")
        if identifier:
            if identifier in visiting:
                return True
            visiting.add(identifier)
        width = width or current.attrib.get("width")
        height = height or current.attrib.get("height")
        if list(current):
            return (
                positive_length(width) is None
                or positive_length(height) is None
                or not pattern_has_direct_visible_content(
                    current, identifiers, computed_colors
                )
            )
        href = href_value(current)
        literal = href.strip() if href else ""
        if not SAFE_FRAGMENT_RE.fullmatch(literal):
            return True
        inherited = identifiers.get(literal[1:])
        if inherited is None or local_name(inherited.tag).lower() != "pattern":
            return True
        current = inherited
    return True


def paint_server_is_obviously_transparent(
    value: str,
    identifiers: dict[str, ET.Element],
    computed_colors: dict[int, str],
    transparency_cache: dict[str, bool],
) -> bool:
    match = URL_RE.fullmatch(value.strip())
    if not match:
        return False
    reference = match.group(2).strip()
    if not SAFE_FRAGMENT_RE.fullmatch(reference):
        return True

    fragment = reference[1:]
    root_fragment = fragment
    if root_fragment in transparency_cache:
        return transparency_cache[root_fragment]

    def finish(result: bool) -> bool:
        transparency_cache[root_fragment] = result
        return result

    visiting: set[str] = set()
    for _ in range(MAX_GRADIENT_REFERENCE_DEPTH):
        if fragment in visiting:
            return finish(False)
        visiting.add(fragment)
        target = identifiers.get(fragment)
        if target is None:
            return finish(True)
        target_name = local_name(target.tag).lower()
        if target_name == "pattern":
            return finish(
                pattern_paint_is_obviously_transparent(
                    target, identifiers, computed_colors
                )
            )
        if target_name not in {"lineargradient", "radialgradient"}:
            return finish(False)
        stops = [
            child for child in target if local_name(child.tag).lower() == "stop"
        ]
        if stops:
            def stop_is_transparent(stop: ET.Element) -> bool:
                color = presentation_value(stop, "stop-color") or "black"
                if color.strip().lower() == "currentcolor":
                    color = computed_colors.get(id(stop), "black")
                return (
                    color_is_obviously_transparent(color)
                    or opacity_is_zero(presentation_value(stop, "stop-opacity"))
                    or opacity_is_zero(presentation_value(stop, "opacity"))
                )

            return finish(all(stop_is_transparent(stop) for stop in stops))
        href = href_value(target)
        literal = href.strip() if href else ""
        if not SAFE_FRAGMENT_RE.fullmatch(literal):
            return finish(True)
        fragment = literal[1:]
    # An overlong chain is not obviously transparent. The validation pass emits
    # a structured depth finding, while renderability stays conservative.
    return finish(False)


def validate_gradient_reference_chains(
    identifiers: dict[str, ET.Element], findings: list[Finding]
) -> None:
    gradients = {
        identifier: element
        for identifier, element in identifiers.items()
        if local_name(element.tag).lower() in {"lineargradient", "radialgradient"}
    }
    edges: dict[str, str] = {}
    for identifier, element in gradients.items():
        href = href_value(element)
        literal = href.strip() if href else ""
        if SAFE_FRAGMENT_RE.fullmatch(literal) and literal[1:] in gradients:
            edges[identifier] = literal[1:]

    completed: set[str] = set()
    depths: dict[str, int] = {}
    cycle_found = False
    for start in gradients:
        if start in completed:
            continue
        path: list[str] = []
        positions: dict[str, int] = {}
        current = start
        while current not in completed and current in gradients:
            if current in positions:
                cycle_found = True
                break
            positions[current] = len(path)
            path.append(current)
            next_identifier = edges.get(current)
            if next_identifier is None:
                current = ""
                break
            current = next_identifier

        if current in positions:
            for identifier in path:
                completed.add(identifier)
            continue

        depth = depths.get(current, 0)
        for identifier in reversed(path):
            depth += 1
            depths[identifier] = depth
            completed.add(identifier)

    if cycle_found:
        add_finding(
            findings,
            "cyclic-gradient-reference",
            "gradient inheritance must not contain a reference cycle",
        )
    if any(depth > MAX_GRADIENT_REFERENCE_DEPTH for depth in depths.values()):
        add_finding(
            findings,
            "gradient-reference-depth",
            f"gradient inheritance exceeds {MAX_GRADIENT_REFERENCE_DEPTH} targets",
        )


def primitive_fill_has_area(element: ET.Element) -> bool:
    element_name = local_name(element.tag).lower()
    if element_name == "line":
        return False
    if element_name == "polyline":
        return points_have_geometry(element.attrib.get("points"), True)
    if element_name == "path":
        return path_has_fill_area(element.attrib.get("d"))
    return True


def paint_is_visible(
    element: ET.Element,
    paint: dict[str, str],
    identifiers: dict[str, ET.Element],
    computed_colors: dict[int, str],
    transparency_cache: dict[str, bool],
) -> bool:
    inherited_color = paint.get("color", "black")
    fill = paint.get("fill", "black")
    stroke = paint.get("stroke", "none")
    if fill.strip().lower() == "currentcolor":
        fill = inherited_color
    if stroke.strip().lower() == "currentcolor":
        stroke = inherited_color
    fill_visible = (
        primitive_fill_has_area(element)
        and not color_is_obviously_transparent(fill)
        and not paint_server_is_obviously_transparent(
            fill, identifiers, computed_colors, transparency_cache
        )
        and not opacity_is_zero(paint.get("fill-opacity"))
    )
    stroke_width = paint.get("stroke-width", "1").strip()
    width_match = re.fullmatch(rf"({NUMBER})(?:[a-zA-Z%]+)?", stroke_width)
    width = finite_number(width_match.group(1)) if width_match else None
    stroke_visible = (
        not color_is_obviously_transparent(stroke)
        and not opacity_is_zero(paint.get("stroke-opacity"))
        and width is not None
        and width > 0
    )
    return fill_visible or stroke_visible


def coordinate(value: str | None, default: float = 0.0) -> float | None:
    if value is None:
        return default
    match = LENGTH_RE.fullmatch(value.strip())
    return finite_number(match.group(1)) if match else None


def union_bounds(first: Bounds | None, second: Bounds | None) -> Bounds | None:
    if first is None:
        return second
    if second is None:
        return first
    return (
        min(first[0], second[0]),
        min(first[1], second[1]),
        max(first[2], second[2]),
        max(first[3], second[3]),
    )


def bounds_from_points(points: list[tuple[float, float]]) -> Bounds | None:
    if not points:
        return None
    return (
        min(point[0] for point in points),
        min(point[1] for point in points),
        max(point[0] for point in points),
        max(point[1] for point in points),
    )


def translate_bounds(bounds: Bounds, x: float, y: float) -> Bounds:
    return (bounds[0] + x, bounds[1] + y, bounds[2] + x, bounds[3] + y)


def expand_bounds(bounds: Bounds, margin: float) -> Bounds:
    return (
        bounds[0] - margin,
        bounds[1] - margin,
        bounds[2] + margin,
        bounds[3] + margin,
    )


def bounds_may_intersect_view_box(
    bounds: Bounds, view_box: tuple[float, float, float, float]
) -> bool:
    min_x, min_y, width, height = view_box
    max_x = min_x + width
    max_y = min_y + height
    tolerance = max(width, height, 1.0) * 1e-9
    return not (
        bounds[2] < min_x - tolerance
        or bounds[3] < min_y - tolerance
        or bounds[0] > max_x + tolerance
        or bounds[1] > max_y + tolerance
    )


def different(first: tuple[float, float], second: tuple[float, float]) -> bool:
    return first[0] != second[0] or first[1] != second[1]


def path_tokens(path_data: str) -> list[str] | None:
    tokens: list[str] = []
    offset = 0
    for match in PATH_TOKEN_RE.finditer(path_data):
        if path_data[offset : match.start()].strip(" ,\t\r\n"):
            return None
        tokens.append(match.group(0))
        offset = match.end()
    if path_data[offset:].strip(" ,\t\r\n"):
        return None
    return tokens


def points_enclose_area(points: list[tuple[float, float]]) -> bool:
    unique_points = list(dict.fromkeys(points))
    if len(unique_points) < 3:
        return False
    first = unique_points[0]
    second = unique_points[1]
    return any(
        (second[0] - first[0]) * (third[1] - first[1])
        != (second[1] - first[1]) * (third[0] - first[0])
        for third in unique_points[2:]
    )


def path_geometry_summary(path_data: str | None) -> tuple[bool, bool]:
    if not path_data:
        return (False, False)
    tokens = path_tokens(path_data)
    if not tokens:
        return (False, False)

    parameter_counts = {
        "M": 2,
        "L": 2,
        "H": 1,
        "V": 1,
        "C": 6,
        "S": 4,
        "Q": 4,
        "T": 2,
        "A": 7,
    }
    index = 0
    command: str | None = None
    current = (0.0, 0.0)
    subpath_start = current
    subpath_points: list[tuple[float, float]] = []
    has_geometry = False
    has_fill_area = False

    while index < len(tokens):
        token = tokens[index]
        if token.isalpha():
            command = token
            index += 1
            if command.upper() == "Z":
                has_geometry = has_geometry or different(current, subpath_start)
                has_fill_area = has_fill_area or points_enclose_area(subpath_points)
                current = subpath_start
                command = None
                continue
        if command is None:
            return (False, False)

        upper = command.upper()
        count = parameter_counts.get(upper)
        if count is None or index + count > len(tokens):
            return (False, False)
        parameter_tokens = tokens[index : index + count]
        if any(value.isalpha() for value in parameter_tokens):
            return (False, False)
        values = [finite_number(value) for value in parameter_tokens]
        if any(value is None for value in values):
            return (False, False)
        parameters = [float(value) for value in values]
        index += count
        relative = command.islower()
        origin = current

        def point(x: float, y: float) -> tuple[float, float]:
            return (origin[0] + x, origin[1] + y) if relative else (x, y)

        if upper == "M":
            has_fill_area = has_fill_area or points_enclose_area(subpath_points)
            current = point(parameters[0], parameters[1])
            subpath_start = current
            subpath_points = [current]
            command = "l" if relative else "L"
            continue
        if upper in {"L", "T"}:
            endpoint = point(parameters[0], parameters[1])
            has_geometry = has_geometry or different(current, endpoint)
            current = endpoint
            subpath_points.append(endpoint)
            continue
        if upper == "H":
            endpoint = (origin[0] + parameters[0] if relative else parameters[0], origin[1])
            has_geometry = has_geometry or different(current, endpoint)
            current = endpoint
            subpath_points.append(endpoint)
            continue
        if upper == "V":
            endpoint = (origin[0], origin[1] + parameters[0] if relative else parameters[0])
            has_geometry = has_geometry or different(current, endpoint)
            current = endpoint
            subpath_points.append(endpoint)
            continue
        if upper in {"C", "S", "Q"}:
            points = [
                point(parameters[offset], parameters[offset + 1])
                for offset in range(0, count, 2)
            ]
            has_geometry = has_geometry or any(
                different(current, candidate) for candidate in points
            )
            current = points[-1]
            subpath_points.extend(points)
            continue
        if upper == "A":
            endpoint = point(parameters[5], parameters[6])
            valid_flags = parameters[3] in {0.0, 1.0} and parameters[4] in {0.0, 1.0}
            if not valid_flags or parameters[0] < 0 or parameters[1] < 0:
                return (False, False)
            has_geometry = has_geometry or different(current, endpoint)
            if parameters[0] > 0 and parameters[1] > 0 and different(current, endpoint):
                has_fill_area = True
            current = endpoint
            subpath_points.append(endpoint)
            continue
        return (False, False)

    return (has_geometry, has_fill_area or points_enclose_area(subpath_points))


def path_has_geometry(path_data: str | None) -> bool:
    return path_geometry_summary(path_data)[0]


def path_has_fill_area(path_data: str | None) -> bool:
    return path_geometry_summary(path_data)[1]


def path_conservative_bounds(path_data: str | None) -> Bounds | None:
    if not path_data:
        return None
    tokens = path_tokens(path_data)
    if not tokens:
        return None

    parameter_counts = {
        "M": 2,
        "L": 2,
        "H": 1,
        "V": 1,
        "C": 6,
        "S": 4,
        "Q": 4,
        "T": 2,
        "A": 7,
    }
    index = 0
    command: str | None = None
    previous_command: str | None = None
    current = (0.0, 0.0)
    subpath_start = current
    last_cubic_control: tuple[float, float] | None = None
    last_quadratic_control: tuple[float, float] | None = None
    bounds: Bounds | None = None

    def include_point(point: tuple[float, float]) -> None:
        nonlocal bounds
        point_bounds = (point[0], point[1], point[0], point[1])
        bounds = union_bounds(bounds, point_bounds)

    def include_box(box: Bounds) -> None:
        nonlocal bounds
        bounds = union_bounds(bounds, box)

    while index < len(tokens):
        token = tokens[index]
        if token.isalpha():
            command = token
            index += 1
            if command.upper() == "Z":
                include_point(current)
                include_point(subpath_start)
                current = subpath_start
                previous_command = "Z"
                last_cubic_control = None
                last_quadratic_control = None
                command = None
                continue
        if command is None:
            return None

        upper = command.upper()
        count = parameter_counts.get(upper)
        if count is None or index + count > len(tokens):
            return None
        parameter_tokens = tokens[index : index + count]
        if any(value.isalpha() for value in parameter_tokens):
            return None
        parsed_values = [finite_number(value) for value in parameter_tokens]
        if any(value is None for value in parsed_values):
            return None
        parameters = [float(value) for value in parsed_values]
        index += count
        relative = command.islower()
        origin = current

        def point(x: float, y: float) -> tuple[float, float]:
            return (origin[0] + x, origin[1] + y) if relative else (x, y)

        if upper == "M":
            current = point(parameters[0], parameters[1])
            subpath_start = current
            include_point(current)
            command = "l" if relative else "L"
        elif upper in {"L", "T"}:
            endpoint = point(parameters[0], parameters[1])
            include_point(current)
            if upper == "T":
                control = current
                if previous_command in {"Q", "T"} and last_quadratic_control:
                    control = (
                        2 * current[0] - last_quadratic_control[0],
                        2 * current[1] - last_quadratic_control[1],
                    )
                include_point(control)
                last_quadratic_control = control
            include_point(endpoint)
            current = endpoint
        elif upper == "H":
            endpoint = (
                origin[0] + parameters[0] if relative else parameters[0],
                origin[1],
            )
            include_point(current)
            include_point(endpoint)
            current = endpoint
        elif upper == "V":
            endpoint = (
                origin[0],
                origin[1] + parameters[0] if relative else parameters[0],
            )
            include_point(current)
            include_point(endpoint)
            current = endpoint
        elif upper in {"C", "S", "Q"}:
            points = [
                point(parameters[offset], parameters[offset + 1])
                for offset in range(0, count, 2)
            ]
            include_point(current)
            if upper == "S":
                control = current
                if previous_command in {"C", "S"} and last_cubic_control:
                    control = (
                        2 * current[0] - last_cubic_control[0],
                        2 * current[1] - last_cubic_control[1],
                    )
                include_point(control)
                last_cubic_control = points[0]
            elif upper == "C":
                last_cubic_control = points[-2]
            else:
                last_quadratic_control = points[0]
            for candidate in points:
                include_point(candidate)
            current = points[-1]
        elif upper == "A":
            endpoint = point(parameters[5], parameters[6])
            if (
                parameters[3] not in {0.0, 1.0}
                or parameters[4] not in {0.0, 1.0}
                or parameters[0] < 0
                or parameters[1] < 0
            ):
                return None
            radius = 2 * math.hypot(parameters[0], parameters[1])
            include_box(expand_bounds(bounds_from_points([current, endpoint]), radius))
            current = endpoint
        else:
            return None

        if upper not in {"C", "S"}:
            last_cubic_control = None
        if upper not in {"Q", "T"}:
            last_quadratic_control = None
        previous_command = upper

    return bounds


def points_have_geometry(value: str | None, polygon: bool) -> bool:
    if not value:
        return False
    tokens = [part for part in re.split(r"[\s,]+", value.strip()) if part]
    if len(tokens) < (6 if polygon else 4) or len(tokens) % 2:
        return False
    numbers = [finite_number(token) for token in tokens]
    if any(number is None for number in numbers):
        return False
    points = [
        (float(numbers[index]), float(numbers[index + 1]))
        for index in range(0, len(numbers), 2)
    ]
    unique_points = list(dict.fromkeys(points))
    if not polygon:
        return len(unique_points) >= 2
    return points_enclose_area(unique_points)


def text_has_content(
    element: ET.Element, inherited_paint: dict[str, str] | None = None
) -> bool:
    if not "".join(element.itertext()).strip():
        return False
    raw_size = element.attrib.get("font-size")
    style = element.attrib.get("style", "")
    for declaration in style.split(";"):
        if ":" in declaration:
            key, value = declaration.split(":", 1)
            if key.strip().lower() == "font-size":
                raw_size = re.sub(r"\s*!important\s*$", "", value.strip(), flags=re.IGNORECASE)
    if raw_size is None and inherited_paint is not None:
        raw_size = inherited_paint.get("font-size")
    if raw_size is None:
        return True
    numeric_size = re.fullmatch(rf"({NUMBER})(?:[a-zA-Z%]+)?", raw_size)
    if numeric_size:
        parsed_numeric_size = finite_number(numeric_size.group(1))
        return parsed_numeric_size is not None and parsed_numeric_size > 0
    parsed_size = coordinate(raw_size)
    return parsed_size is not None and parsed_size > 0


def primitive_has_geometry(
    element: ET.Element, inherited_paint: dict[str, str] | None = None
) -> bool:
    name = local_name(element.tag).lower()
    if name == "path":
        return path_has_geometry(element.attrib.get("d"))
    if name == "rect":
        return positive_length(element.attrib.get("width")) is not None and positive_length(
            element.attrib.get("height")
        ) is not None
    if name == "circle":
        return positive_length(element.attrib.get("r")) is not None
    if name == "ellipse":
        return positive_length(element.attrib.get("rx")) is not None and positive_length(
            element.attrib.get("ry")
        ) is not None
    if name == "line":
        start = (coordinate(element.attrib.get("x1")), coordinate(element.attrib.get("y1")))
        end = (coordinate(element.attrib.get("x2")), coordinate(element.attrib.get("y2")))
        return None not in (*start, *end) and different(start, end)
    if name in {"polyline", "polygon"}:
        return points_have_geometry(element.attrib.get("points"), name == "polygon")
    if name == "text":
        return text_has_content(element, inherited_paint)
    return False


def points_conservative_bounds(value: str | None) -> Bounds | None:
    if not value:
        return None
    tokens = [part for part in re.split(r"[\s,]+", value.strip()) if part]
    if len(tokens) < 2 or len(tokens) % 2:
        return None
    numbers = [finite_number(token) for token in tokens]
    if any(number is None for number in numbers):
        return None
    return bounds_from_points(
        [
            (float(numbers[index]), float(numbers[index + 1]))
            for index in range(0, len(numbers), 2)
        ]
    )


def stroke_conservative_margin(
    element: ET.Element,
    paint: dict[str, str],
    identifiers: dict[str, ET.Element],
    computed_colors: dict[int, str],
    transparency_cache: dict[str, bool],
) -> float | None:
    stroke = paint.get("stroke", "none")
    if (
        color_is_obviously_transparent(stroke)
        or paint_server_is_obviously_transparent(
            stroke, identifiers, computed_colors, transparency_cache
        )
        or opacity_is_zero(paint.get("stroke-opacity"))
    ):
        return 0.0
    raw_width = paint.get("stroke-width", "1").strip()
    width_match = LENGTH_RE.fullmatch(raw_width)
    width = finite_number(width_match.group(1)) if width_match else None
    if width is None:
        return None
    if width <= 0:
        return 0.0
    vector_effect = presentation_value(element, "vector-effect")
    if vector_effect and vector_effect.strip().lower() != "none":
        return None
    raw_miter_limit = presentation_value(element, "stroke-miterlimit") or "4"
    miter_limit = finite_number(raw_miter_limit.strip())
    if miter_limit is None or miter_limit < 1:
        return None
    return max(width / 2, (width / 2) * miter_limit)


def primitive_conservative_bounds(
    element: ET.Element,
    paint: dict[str, str],
    identifiers: dict[str, ET.Element],
    computed_colors: dict[int, str],
    transparency_cache: dict[str, bool],
) -> Bounds | None:
    name = local_name(element.tag).lower()
    bounds: Bounds | None
    if name == "path":
        bounds = path_conservative_bounds(element.attrib.get("d"))
    elif name == "rect":
        x = coordinate(element.attrib.get("x"))
        y = coordinate(element.attrib.get("y"))
        width = positive_length(element.attrib.get("width"))
        height = positive_length(element.attrib.get("height"))
        if None in (x, y, width, height):
            return None
        bounds = (x, y, x + width, y + height)
    elif name == "circle":
        cx = coordinate(element.attrib.get("cx"))
        cy = coordinate(element.attrib.get("cy"))
        radius = positive_length(element.attrib.get("r"))
        if None in (cx, cy, radius):
            return None
        bounds = (cx - radius, cy - radius, cx + radius, cy + radius)
    elif name == "ellipse":
        cx = coordinate(element.attrib.get("cx"))
        cy = coordinate(element.attrib.get("cy"))
        radius_x = positive_length(element.attrib.get("rx"))
        radius_y = positive_length(element.attrib.get("ry"))
        if None in (cx, cy, radius_x, radius_y):
            return None
        bounds = (cx - radius_x, cy - radius_y, cx + radius_x, cy + radius_y)
    elif name == "line":
        x1 = coordinate(element.attrib.get("x1"))
        y1 = coordinate(element.attrib.get("y1"))
        x2 = coordinate(element.attrib.get("x2"))
        y2 = coordinate(element.attrib.get("y2"))
        if None in (x1, y1, x2, y2):
            return None
        bounds = bounds_from_points([(x1, y1), (x2, y2)])
    elif name in {"polygon", "polyline"}:
        bounds = points_conservative_bounds(element.attrib.get("points"))
    else:
        # Text shaping, font metrics, and future primitives are deliberately
        # treated as unknown so legitimate artwork is not rejected.
        return None

    if bounds is None:
        return None
    margin = stroke_conservative_margin(
        element, paint, identifiers, computed_colors, transparency_cache
    )
    return None if margin is None else expand_bounds(bounds, margin)


def element_makes_bounds_unknown(element: ET.Element) -> bool:
    for property_name in (
        "filter",
        "marker-start",
        "marker-mid",
        "marker-end",
        "transform",
    ):
        value = presentation_value(element, property_name)
        if value and value.strip().lower() != "none":
            return True
    return False


def transform_is_obviously_singular(element: ET.Element) -> bool:
    value = presentation_value(element, "transform")
    if not value or value.strip().lower() == "none":
        return False
    for match in re.finditer(
        r"\b(matrix|scale|scalex|scaley)\s*\(([^\)]*)\)",
        value,
        flags=re.IGNORECASE,
    ):
        name = match.group(1).lower()
        parts = [
            finite_number(part)
            for part in re.split(r"[\s,]+", match.group(2).strip())
            if part
        ]
        if any(part is None for part in parts):
            continue
        numbers = [float(part) for part in parts]
        if name == "scale" and len(numbers) in {1, 2}:
            if numbers[0] == 0 or (len(numbers) == 2 and numbers[1] == 0):
                return True
        elif name in {"scalex", "scaley"} and len(numbers) == 1 and numbers[0] == 0:
            return True
        elif name == "matrix" and len(numbers) == 6:
            if numbers[0] * numbers[3] - numbers[1] * numbers[2] == 0:
                return True
    return False


def href_value(element: ET.Element) -> str | None:
    for raw_name, value in element.attrib.items():
        if local_name(raw_name).lower() == "href":
            return value
    return None


def validate_fragment_target(
    fragment: str,
    attribute_name: str,
    identifiers: dict[str, ET.Element],
    findings: list[Finding],
) -> None:
    target = identifiers.get(fragment)
    if target is None:
        add_finding(
            findings,
            "unresolved-fragment-reference",
            "a local fragment reference does not resolve to an SVG id",
        )
        return
    expected = REFERENCE_TARGET_TYPES.get(attribute_name)
    target_name = local_name(target.tag).lower()
    if expected is not None and target_name not in expected:
        add_finding(
            findings,
            "invalid-fragment-target",
            "a local fragment reference resolves to an incompatible SVG element type",
        )


def validate_local_fragment_references(
    elements: list[ET.Element],
    identifiers: dict[str, ET.Element],
    findings: list[Finding],
) -> None:
    for element in elements:
        element_name = local_name(element.tag).lower()
        for raw_name, raw_value in element.attrib.items():
            attribute_name = local_name(raw_name).lower()
            reference_role = attribute_name
            if attribute_name == "href":
                if element_name in {"lineargradient", "radialgradient"}:
                    reference_role = "gradient-href"
                elif element_name == "pattern":
                    reference_role = "pattern-href"
                elif element_name == "textpath":
                    reference_role = "textpath-href"
            literal = raw_value.strip()
            if attribute_name in REFERENCE_ATTRIBUTES and SAFE_FRAGMENT_RE.fullmatch(literal):
                if element_name != "use":
                    validate_fragment_target(
                        literal[1:], reference_role, identifiers, findings
                    )
            for match in URL_RE.finditer(raw_value):
                reference = match.group(2).strip()
                if SAFE_FRAGMENT_RE.fullmatch(reference):
                    validate_fragment_target(
                        reference[1:], attribute_name, identifiers, findings
                    )

            if attribute_name == "style":
                for declaration in raw_value.split(";"):
                    property_name, separator, property_value = declaration.partition(":")
                    if not separator:
                        continue
                    for match in URL_RE.finditer(property_value):
                        reference = match.group(2).strip()
                        if SAFE_FRAGMENT_RE.fullmatch(reference):
                            validate_fragment_target(
                                reference[1:],
                                property_name.strip().lower(),
                                identifiers,
                                findings,
                            )

        if element_name == "style":
            for match in URL_RE.finditer("".join(element.itertext())):
                reference = match.group(2).strip()
                if SAFE_FRAGMENT_RE.fullmatch(reference):
                    validate_fragment_target(
                        reference[1:], "style", identifiers, findings
                    )


def use_has_size(element: ET.Element, target: ET.Element) -> bool:
    if local_name(target.tag).lower() not in {"svg", "symbol"}:
        return True
    for name in ("width", "height"):
        if name in element.attrib and positive_length(element.attrib[name]) is None:
            return False
    return True


def opacity_fraction(value: str | None) -> float | None:
    if value is None:
        return 1.0
    stripped = value.strip()
    parsed = finite_number(stripped.rstrip("%"))
    if parsed is None:
        return None
    fraction = parsed / 100 if stripped.endswith("%") else parsed
    return max(0.0, min(1.0, fraction))


def validate_explicit_presentation_values(
    element: ET.Element, findings: list[Finding]
) -> None:
    values = {
        local_name(raw_name).lower(): raw_value.strip()
        for raw_name, raw_value in element.attrib.items()
    }
    for declaration in element.attrib.get("style", "").split(";"):
        key, separator, value = declaration.partition(":")
        if separator:
            values[key.strip().lower()] = re.sub(
                r"\s*!important\s*$", "", value.strip(), flags=re.IGNORECASE
            )

    for key in (
        "fill-opacity",
        "flood-opacity",
        "opacity",
        "stop-opacity",
        "stroke-opacity",
    ):
        value = values.get(key)
        if value is None or value.lower() == "inherit":
            continue
        if not re.fullmatch(rf"{NUMBER}%?", value):
            add_finding(
                findings,
                "unsupported-opacity-value",
                "opacity values must be explicit finite numbers or percentages",
            )

    for key in ("font-size", "stroke-width"):
        value = values.get(key)
        if value is None or value.lower() == "inherit":
            continue
        if not re.fullmatch(rf"{NUMBER}(?:[a-zA-Z%]+)?", value):
            add_finding(
                findings,
                "unsupported-length-value",
                "font and stroke lengths must use explicit finite values",
            )

    for key in ("fill", "flood-color", "lighting-color", "stop-color", "stroke"):
        value = values.get(key, "").strip().lower()
        function = re.match(r"([a-z][a-z0-9-]*)\s*\(", value)
        if function and function.group(1) not in {
            "hsl",
            "hsla",
            "rgb",
            "rgba",
            "url",
        }:
            add_finding(
                findings,
                "unsupported-color-function",
                "paint values use an unsupported CSS color function",
            )


def opaque_full_canvas_rect(
    element: ET.Element,
    view_box: tuple[float, float, float, float],
    paint: dict[str, str],
    effective_opacity: float | None,
    identifiers: dict[str, ET.Element],
    computed_colors: dict[int, str],
    transparency_cache: dict[str, bool],
) -> bool:
    if (
        local_name(element.tag).lower() != "rect"
        or not rect_covers_canvas(element, view_box)
    ):
        return False
    if effective_opacity is not None and effective_opacity <= 0:
        return False
    fill = paint.get("fill", "black")
    if fill.strip().lower() == "currentcolor":
        fill = paint.get("color", "black")
    return (
        not color_is_obviously_transparent(fill)
        and not paint_server_is_obviously_transparent(
            fill, identifiers, computed_colors, transparency_cache
        )
        and not opacity_is_zero(paint.get("fill-opacity"))
    )


def has_opaque_full_canvas_background(
    root: ET.Element,
    identifiers: dict[str, ET.Element],
    view_box: tuple[float, float, float, float],
    computed_colors: dict[int, str],
    transparency_cache: dict[str, bool],
) -> bool:
    reference_cache: dict[
        tuple[str, tuple[tuple[str, str], ...], float | None], bool
    ] = {}

    def subtree(
        element: ET.Element,
        inherited_hidden: bool,
        referenced_root: bool,
        inherited_paint: dict[str, str] | None,
        inherited_opacity: float | None,
        visiting: set[str],
        depth: int,
    ) -> bool:
        if depth > MAX_RENDER_DEPTH:
            return False
        hidden = inherited_hidden or hidden_by_presentation(element)
        if hidden:
            return False
        own_opacity = opacity_fraction(presentation_value(element, "opacity"))
        effective_opacity = (
            None
            if inherited_opacity is None or own_opacity is None
            else inherited_opacity * own_opacity
        )
        paint = paint_state(element, inherited_paint)
        name = local_name(element.tag).lower()
        if name in NON_RENDERING_CONTAINERS and not (
            referenced_root and name == "symbol"
        ):
            return False
        if opaque_full_canvas_rect(
            element,
            view_box,
            paint,
            effective_opacity,
            identifiers,
            computed_colors,
            transparency_cache,
        ):
            return True
        if name == "use":
            href = href_value(element)
            literal = href.strip() if href else ""
            if (
                not SAFE_FRAGMENT_RE.fullmatch(literal)
            ):
                return False
            fragment = literal[1:]
            if fragment in visiting or len(visiting) >= MAX_USE_DEPTH:
                return False
            cache_key = (
                fragment,
                tuple(sorted(paint.items())),
                effective_opacity,
            )
            if cache_key in reference_cache:
                return reference_cache[cache_key]
            target = identifiers.get(fragment)
            if (
                target is None
                or not use_has_size(element, target)
                or local_name(target.tag).lower() in {"svg", "symbol"}
            ):
                return False
            visiting.add(fragment)
            covers = subtree(
                target,
                False,
                True,
                paint,
                effective_opacity,
                visiting,
                depth + 1,
            )
            visiting.remove(fragment)
            reference_cache[cache_key] = covers
            return covers
        return any(
            subtree(
                child,
                hidden,
                False,
                paint,
                effective_opacity,
                visiting,
                depth + 1,
            )
            for child in element
        )

    return subtree(root, False, False, None, 1.0, set(), 0)


def has_renderable_graphic(
    root: ET.Element,
    elements: list[ET.Element],
    identifiers: dict[str, ET.Element],
    findings: list[Finding],
    view_box: tuple[float, float, float, float] | None,
    computed_colors: dict[int, str],
    transparency_cache: dict[str, bool],
) -> bool:
    reference_cache: dict[
        tuple[str, tuple[tuple[str, str], ...]], RenderSummary
    ] = {}
    unresolved_reported: set[int] = set()
    empty_reported: set[int] = set()
    cycles_reported: set[str] = set()
    depth_reported: set[str] = set()

    def combine(summaries: list[RenderSummary]) -> RenderSummary:
        usable = False
        unknown_bounds = False
        bounds: Bounds | None = None
        for child_usable, child_bounds in summaries:
            if not child_usable:
                continue
            usable = True
            if child_bounds is None:
                unknown_bounds = True
            elif not unknown_bounds:
                bounds = union_bounds(bounds, child_bounds)
        return (usable, None if unknown_bounds else bounds)

    def apply_coordinate_context(
        element: ET.Element,
        summary: RenderSummary,
        referenced_root: bool,
    ) -> RenderSummary:
        usable, bounds = summary
        if not usable:
            return summary
        name = local_name(element.tag).lower()
        if (
            element_makes_bounds_unknown(element)
            or (name == "svg" and element is not root)
            or (referenced_root and name == "symbol")
        ):
            return (True, None)
        return summary

    def subtree(
        element: ET.Element,
        inherited_hidden: bool,
        referenced_root: bool,
        visiting: set[str],
        resolution_depth: int,
        inherited_paint: dict[str, str] | None,
    ) -> RenderSummary:
        if resolution_depth > MAX_RENDER_DEPTH:
            if "depth" not in depth_reported:
                add_finding(
                    findings,
                    "render-resolution-depth",
                    f"renderability resolution exceeds depth {MAX_RENDER_DEPTH}",
                )
                depth_reported.add("depth")
            return (False, None)
        hidden = inherited_hidden or hidden_by_presentation(element)
        if hidden:
            return (False, None)
        if transform_is_obviously_singular(element):
            return (False, None)
        if any(
            (presentation_value(element, effect) or "").strip().lower()
            not in {"", "none"}
            for effect in ("clip-path", "filter", "mask")
        ):
            return (False, None)
        paint = paint_state(element, inherited_paint)
        name = local_name(element.tag).lower()
        if name in NON_RENDERING_CONTAINERS and not (referenced_root and name == "symbol"):
            return (False, None)
        if name in RENDERABLE_ELEMENTS - {"use"}:
            usable = primitive_has_geometry(element, paint) and paint_is_visible(
                element,
                paint,
                identifiers,
                computed_colors,
                transparency_cache,
            )
            summary = (
                usable,
                primitive_conservative_bounds(
                    element,
                    paint,
                    identifiers,
                    computed_colors,
                    transparency_cache,
                )
                if usable
                else None,
            )
        elif name == "use":
            summary = resolve_use(element, visiting, resolution_depth + 1, paint)
        else:
            summary = combine(
                [
                    subtree(
                        child,
                        hidden,
                        False,
                        visiting,
                        resolution_depth + 1,
                        paint,
                    )
                    for child in element
                ]
            )
        return apply_coordinate_context(element, summary, referenced_root)

    def resolve_fragment(
        fragment: str,
        visiting: set[str],
        resolution_depth: int,
        inherited_paint: dict[str, str],
    ) -> RenderSummary:
        cache_key = (fragment, tuple(sorted(inherited_paint.items())))
        if cache_key in reference_cache:
            return reference_cache[cache_key]
        if fragment in visiting:
            if fragment not in cycles_reported:
                add_finding(
                    findings,
                    "cyclic-use-reference",
                    "<use> references must not contain a cycle",
                )
                cycles_reported.add(fragment)
            return (False, None)
        if len(visiting) >= MAX_USE_DEPTH:
            add_finding(
                findings,
                "use-reference-depth",
                f"<use> reference chain exceeds {MAX_USE_DEPTH} targets",
            )
            return (False, None)
        target = identifiers.get(fragment)
        if target is None:
            return (False, None)
        visiting.add(fragment)
        summary = subtree(
            target, False, True, visiting, resolution_depth + 1, inherited_paint
        )
        visiting.remove(fragment)
        reference_cache[cache_key] = summary
        return summary

    def resolve_use(
        element: ET.Element,
        visiting: set[str],
        resolution_depth: int,
        inherited_paint: dict[str, str],
    ) -> RenderSummary:
        href = href_value(element)
        literal = href.strip() if href else ""
        if not SAFE_FRAGMENT_RE.fullmatch(literal):
            if not href and id(element) not in unresolved_reported:
                add_finding(findings, "unresolved-use", "<use> must reference an existing local ID")
                unresolved_reported.add(id(element))
            return (False, None)
        fragment = literal[1:]
        if fragment not in identifiers:
            if id(element) not in unresolved_reported:
                add_finding(
                    findings,
                    "unresolved-use",
                    "<use> target does not exist",
                )
                unresolved_reported.add(id(element))
            return (False, None)
        target = identifiers[fragment]
        if not use_has_size(element, target):
            if id(element) not in empty_reported:
                add_finding(
                    findings,
                    "zero-use-size",
                    "<use> target has an explicitly non-positive viewport",
                )
                empty_reported.add(id(element))
            return (False, None)
        summary = resolve_fragment(
            fragment, visiting, resolution_depth + 1, inherited_paint
        )
        usable, bounds = summary
        if not usable and fragment not in visiting and id(element) not in empty_reported:
            add_finding(
                findings,
                "empty-use-target",
                "<use> target contains no usable vector geometry",
            )
            empty_reported.add(id(element))
        if not usable or bounds is None:
            return summary
        x = coordinate(element.attrib.get("x"))
        y = coordinate(element.attrib.get("y"))
        if x is None or y is None:
            return (True, None)
        return (True, translate_bounds(bounds, x, y))

    for element in elements:
        if local_name(element.tag).lower() == "use":
            resolve_use(element, set(), 0, paint_state(element))
    usable, bounds = subtree(root, False, False, set(), 0, None)
    return usable and (
        view_box is None
        or bounds is None
        or bounds_may_intersect_view_box(bounds, view_box)
    )


def validate_xml(data: bytes) -> tuple[dict[str, Any], list[Finding]]:
    findings: list[Finding] = []
    metadata: dict[str, Any] = {"width": None, "height": None, "viewBox": None}
    text = decode_svg(data, findings)
    if text is None:
        return metadata, findings

    lowered = text.lower()
    if "<!doctype" in lowered:
        add_finding(findings, "doctype-forbidden", "DOCTYPE declarations are forbidden")
    if "<!entity" in lowered:
        add_finding(findings, "entity-forbidden", "entity declarations are forbidden")
    if "<!--" in text:
        add_finding(
            findings,
            "xml-comment-forbidden",
            "XML comments are forbidden in the canonical SVG master",
        )
    declaration_findings(text, findings)
    if findings:
        return metadata, findings

    try:
        root = ET.fromstring(text)
    except (ET.ParseError, ValueError):
        add_finding(findings, "malformed-xml", "SVG input is malformed XML")
        return metadata, findings

    if (
        local_name(root.tag).lower() != "svg"
        or namespace_name(root.tag) not in {None, SVG_NAMESPACE}
    ):
        add_finding(findings, "root-not-svg", "root element must be <svg>")
        return metadata, findings
    root_namespace = namespace_name(root.tag)

    width = positive_length(root.attrib.get("width"))
    height = positive_length(root.attrib.get("height"))
    view_box = parse_view_box(root.attrib.get("viewBox") or root.attrib.get("viewbox"))
    metadata.update(
        width=width,
        height=height,
        viewBox=list(view_box) if view_box is not None else None,
    )
    if width is None or height is None:
        add_finding(
            findings,
            "invalid-dimensions",
            "root width and height must be positive finite numbers in user units or px",
        )
    elif width > MAX_DIMENSION or height > MAX_DIMENSION or width * height > MAX_CANVAS_AREA:
        add_finding(findings, "canvas-too-large", "root dimensions exceed validator limits")
    if view_box is None:
        add_finding(
            findings,
            "invalid-viewbox",
            "root viewBox must contain four finite numbers with positive width and height",
        )
    elif (
        view_box[2] > MAX_DIMENSION
        or view_box[3] > MAX_DIMENSION
        or view_box[2] * view_box[3] > MAX_CANVAS_AREA
    ):
        add_finding(findings, "viewbox-too-large", "viewBox dimensions exceed validator limits")

    count = 0
    elements: list[ET.Element] = []
    identifiers: dict[str, ET.Element] = {}
    stack: list[tuple[ET.Element, int, bool, bool]] = [(root, 1, False, False)]
    while stack:
        element, depth, inside_non_rendering_container, hidden_by_ancestor = stack.pop()
        count += 1
        if count > MAX_ELEMENTS:
            add_finding(findings, "too-many-elements", f"SVG exceeds {MAX_ELEMENTS} elements")
            break
        if depth > MAX_DEPTH:
            add_finding(findings, "nesting-too-deep", f"SVG exceeds nesting depth {MAX_DEPTH}")
            break

        element_name = local_name(element.tag).lower()
        element_namespace = namespace_name(element.tag)
        hidden = hidden_by_ancestor or hidden_by_presentation(element)
        non_rendering = (
            inside_non_rendering_container or element_name in NON_RENDERING_CONTAINERS
        )
        elements.append(element)
        if element_name not in ALLOWED_STATIC_ELEMENTS:
            add_finding(
                findings,
                "unsupported-svg-element",
                "SVG contains an element outside the static logo allowlist",
            )
        if element_namespace != root_namespace:
            add_finding(
                findings,
                "foreign-namespace-element",
                "an element does not match the root SVG namespace",
            )
        identifier = next(
            (
                value
                for raw_name, value in element.attrib.items()
                if local_name(raw_name).lower() == "id"
            ),
            None,
        )
        if identifier:
            if identifier in identifiers:
                add_finding(findings, "duplicate-id", "SVG IDs must be unique")
            else:
                identifiers[identifier] = element
        if element_name in DANGEROUS_ELEMENTS:
            add_finding(
                findings,
                "active-content",
                "active-content elements are forbidden",
            )
        if element_name in SMIL_ELEMENTS:
            add_finding(
                findings,
                "declarative-animation",
                "declarative animation elements are forbidden",
            )
        if element_name == "image":
            add_finding(
                findings,
                "embedded-raster-image",
                "<image> elements are forbidden; use self-contained vector primitives",
            )
        if element_name == "metadata":
            add_finding(
                findings,
                "hidden-metadata",
                "<metadata> content is forbidden in the canonical SVG master",
            )
        if element_name == "style":
            add_finding(
                findings,
                "stylesheet-forbidden",
                "<style> blocks are forbidden; use explicit SVG presentation attributes",
            )

        for raw_name, raw_value in element.attrib.items():
            attribute_name = local_name(raw_name).lower()
            attribute_namespace = namespace_name(raw_name)
            if not static_attribute_is_allowed(element_name, attribute_name):
                add_finding(
                    findings,
                    "unsupported-svg-attribute",
                    "SVG contains an attribute outside the static logo allowlist",
                )
            if attribute_namespace not in {None, XML_NAMESPACE, XLINK_NAMESPACE}:
                add_finding(
                    findings,
                    "foreign-namespace-attribute",
                    "an attribute uses a non-SVG namespace",
                )
            if attribute_name.startswith("on"):
                add_finding(
                    findings,
                    "event-handler",
                    "event-handler attributes are forbidden",
                )
            if attribute_name in {"base", "xml:base"}:
                add_finding(findings, "base-uri", "base URI attributes are forbidden")
            if (
                attribute_name == "style" or attribute_name in CSS_PRESENTATION_ATTRIBUTES
            ) and CSS_ESCAPE_RE.search(raw_value):
                add_finding(
                    findings,
                    "css-escape-forbidden",
                    "CSS escape syntax is forbidden in presentation attributes",
                )
            if (
                attribute_name == "style" or attribute_name in CSS_PRESENTATION_ATTRIBUTES
            ) and CSS_COMMENT_RE.search(raw_value):
                add_finding(
                    findings,
                    "css-comment-forbidden",
                    "CSS comments are forbidden in presentation attributes",
                )
            if (
                attribute_name == "style" or attribute_name in CSS_PRESENTATION_ATTRIBUTES
            ) and CSS_VARIABLE_RE.search(raw_value):
                add_finding(
                    findings,
                    "css-variable-forbidden",
                    "CSS variables are forbidden in presentation attributes",
                )
            if (
                attribute_name == "style" and CSS_LIVE_MOTION_RE.search(raw_value)
            ) or attribute_name.startswith(("animation", "transition")):
                add_finding(
                    findings,
                    "css-animation-forbidden",
                    "CSS animation and transition syntax is forbidden in presentation attributes",
                )
            if attribute_name in REFERENCE_ATTRIBUTES:
                error = reference_error(raw_value)
                if error:
                    add_finding(findings, *error)
            for match in URL_RE.finditer(raw_value):
                error = reference_error(match.group(2))
                if error:
                    add_finding(findings, *error)
            if "@import" in raw_value.lower():
                add_finding(findings, "css-import", "CSS @import is forbidden")

        validate_explicit_presentation_values(element, findings)

        if element_name == "style":
            style_text = "".join(element.itertext())
            if CSS_ESCAPE_RE.search(style_text):
                add_finding(
                    findings,
                    "css-escape-forbidden",
                    "CSS escape syntax is forbidden in <style> content",
                )
            if CSS_COMMENT_RE.search(style_text):
                add_finding(
                    findings,
                    "css-comment-forbidden",
                    "CSS comments are forbidden in <style> content",
                )
            if CSS_LIVE_MOTION_RE.search(style_text):
                add_finding(
                    findings,
                    "css-animation-forbidden",
                    "CSS keyframes, animations, and transitions are forbidden in <style> content",
                )
            if "@import" in style_text.lower():
                add_finding(findings, "css-import", "CSS @import is forbidden")
            for match in URL_RE.finditer(style_text):
                error = reference_error(match.group(2))
                if error:
                    add_finding(findings, *error)

        children = list(element)
        stack.extend(
            (child, depth + 1, non_rendering, hidden) for child in reversed(children)
        )

    computed_colors = computed_color_values(root)
    transparency_cache: dict[str, bool] = {}
    validate_local_fragment_references(elements, identifiers, findings)
    validate_gradient_reference_chains(identifiers, findings)
    if view_box is not None and has_opaque_full_canvas_background(
        root, identifiers, view_box, computed_colors, transparency_cache
    ):
        add_finding(
            findings,
            "opaque-full-canvas-background",
            "an opaque rect visibly covers the full viewBox; "
            "logo backgrounds must be transparent",
        )
    if not has_renderable_graphic(
        root,
        elements,
        identifiers,
        findings,
        view_box,
        computed_colors,
        transparency_cache,
    ):
        add_finding(
            findings,
            "no-renderable-graphic",
            "SVG must contain a visible graphic whose conservative bounds may intersect the viewBox",
        )

    return metadata, findings


def result_payload(
    display_path: str,
    metadata: dict[str, Any],
    findings: list[Finding],
    *,
    category: str = "validation",
) -> dict[str, Any]:
    return {
        "valid": not findings,
        "path": display_path,
        "width": metadata.get("width"),
        "height": metadata.get("height"),
        "viewBox": metadata.get("viewBox"),
        "category": category,
        "errors": findings,
    }


def print_result(payload: dict[str, Any], json_output: bool) -> None:
    if json_output:
        print(json.dumps(payload, sort_keys=True, separators=(",", ":")))
        return
    status = "VALID" if payload["valid"] else "INVALID"
    print(f"{status} SVG: {payload['path']}")
    if payload["valid"]:
        print(
            "Canvas: "
            f"{payload['width']:g} x {payload['height']:g}; "
            "viewBox: "
            + " ".join(f"{number:g}" for number in payload["viewBox"])
        )
    else:
        for finding in payload["errors"]:
            print(f"- [{finding['code']}] {finding['message']}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate a self-contained SVG logo. Exit 0=valid, 1=invalid, 2=usage/I/O."
    )
    parser.add_argument("svg", help="path to a local SVG file")
    parser.add_argument("--json", action="store_true", help="emit one deterministic JSON object")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    display_path = os.fspath(args.svg)
    metadata: dict[str, Any] = {"width": None, "height": None, "viewBox": None}
    if not is_local_input_path(display_path):
        findings = [Finding("nonlocal-input", "input must be a local filesystem path")]
        print_result(result_payload(display_path, metadata, findings, category="io"), args.json)
        return 2

    path = Path(display_path)
    try:
        stat = path.stat()
        if not path.is_file():
            raise OSError("path is not a regular file")
        if stat.st_size > MAX_FILE_BYTES:
            findings = [
                Finding("file-too-large", f"SVG exceeds the {MAX_FILE_BYTES}-byte file limit")
            ]
            print_result(result_payload(display_path, metadata, findings), args.json)
            return 1
        with path.open("rb") as handle:
            data = handle.read(MAX_FILE_BYTES + 1)
    except (OSError, ValueError):
        findings = [Finding("read-error", "unable to read local SVG")]
        print_result(result_payload(display_path, metadata, findings, category="io"), args.json)
        return 2

    if len(data) > MAX_FILE_BYTES:
        findings = [Finding("file-too-large", f"SVG exceeds the {MAX_FILE_BYTES}-byte file limit")]
        print_result(result_payload(display_path, metadata, findings), args.json)
        return 1

    metadata, findings = validate_xml(data)
    payload = result_payload(display_path, metadata, findings)
    print_result(payload, args.json)
    return 0 if payload["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
