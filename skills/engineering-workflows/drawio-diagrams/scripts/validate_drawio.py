#!/usr/bin/env python3
"""Validate draw.io / diagrams.net XML for the drawio-diagrams skill.

Supports generic draw.io XML, multi-page files, compressed diagram payloads,
JSON output, and warnings that should not fail the run.
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import math
import re
import sys
import urllib.parse
import zlib
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

HEX_RE = re.compile(r"#[0-9A-Fa-f]{6}\b")
LIGHT_DARK_RE = re.compile(r"light-dark\((#[0-9A-Fa-f]{6})\s*,\s*(#[0-9A-Fa-f]{6})\)")
INLINE_FONT_SIZE_RE = re.compile(r"font-size\s*:\s*(\d+(?:\.\d+)?)px", re.IGNORECASE)


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
    style_map: dict[str, str]

    @classmethod
    def from_element(cls, el: ET.Element, index: int) -> "Cell":
        style = el.get("style") or ""
        style_map: dict[str, str] = {}
        for token in style.split(";"):
            if "=" in token:
                key, _, value = token.partition("=")
                style_map[key] = value
        geo = el.find("mxGeometry")
        geometry = None
        relative_geometry = False
        if geo is not None and geo.get("as") == "geometry":
            relative_geometry = geo.get("relative") == "1"
            if all(name in geo.attrib for name in ("x", "y", "width", "height")):
                try:
                    geometry = (
                        float(geo.get("x", "")),
                        float(geo.get("y", "")),
                        float(geo.get("width", "")),
                        float(geo.get("height", "")),
                    )
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
    parser.add_argument("--theme", default=None)
    parser.add_argument("--json", dest="json_path", default=None)
    return parser.parse_args()


def decode_compressed_diagram(text: str) -> ET.Element:
    data = base64.b64decode(text)
    inflated = zlib.decompress(data, -15)
    xml = urllib.parse.unquote(inflated.decode("utf8"))
    return ET.fromstring(xml)


def parse_models(path: Path) -> list[tuple[str, ET.Element]]:
    content = path.read_text(encoding="utf8")
    root = ET.fromstring(content)
    if root.tag == "mxGraphModel":
        return [(path.name, root)]
    if root.tag != "mxfile":
        found = root.find(".//mxGraphModel")
        if found is not None:
            return [(path.name, found)]
        raise ValueError("no mxfile or mxGraphModel root found")

    models: list[tuple[str, ET.Element]] = []
    for index, diagram in enumerate(root.findall("diagram"), start=1):
        name = diagram.get("name") or f"Page-{index}"
        model = diagram.find("mxGraphModel")
        if model is None:
            payload = (diagram.text or "").strip()
            if not payload:
                raise ValueError(f"diagram {name!r} has no mxGraphModel or compressed payload")
            model = decode_compressed_diagram(payload)
        models.append((name, model))
    if not models:
        found = root.find(".//mxGraphModel")
        if found is not None:
            models.append((path.name, found))
    if not models:
        raise ValueError("no diagrams found")
    return models


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


def abs_bbox(cell: Cell, cells_by_id: dict[str, Cell]) -> tuple[float, float, float, float] | None:
    if cell.geometry is None:
        return None
    x, y, width, height = cell.geometry
    parent = cells_by_id.get(cell.parent or "")
    depth = 0
    while parent is not None and parent.id not in ("0", "1") and depth < 20:
        if parent.geometry:
            x += parent.geometry[0]
            y += parent.geometry[1]
        parent = cells_by_id.get(parent.parent or "")
        depth += 1
    return (x, y, width, height)


def add_error(messages: list[str], cid: str | None, message: str) -> None:
    messages.append(f"ERROR [{cid or '?'}] {message}")


def add_warning(messages: list[str], cid: str | None, message: str) -> None:
    messages.append(f"WARN  [{cid or '?'}] {message}")


def validate_model(name: str, model: ET.Element, profile: str, theme: str | None) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []
    root = model.find("root")
    if root is None:
        add_error(errors, name, "missing mxGraphModel/root")
        return {"name": name, "errors": errors, "warnings": warnings}

    if model.get("adaptiveColors") != "auto":
        add_warning(warnings, name, 'missing adaptiveColors="auto" on mxGraphModel')

    cells = [Cell.from_element(el, index) for index, el in enumerate(root.findall("mxCell"))]
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

    for cell in content:
        if cell.parent is None or cell.parent not in cells_by_id:
            add_error(errors, cell.id, f'parent="{cell.parent}" does not exist')

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
        if profile == "flowforge" and "endArrow=none" not in edge.style and "edgeStyle=orthogonalEdgeStyle" not in edge.style:
            add_error(errors, edge.id, "flowforge profile requires edgeStyle=orthogonalEdgeStyle")

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
        if vertex.is_filled_shape and not vertex.is_decorative_line and (width < 40 or height < 20):
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

    endpoint_ids = {edge.source for edge in edges if edge.source} | {edge.target for edge in edges if edge.target}
    for vertex in vertices:
        if vertex.id and vertex.id not in endpoint_ids and not vertex.is_container and not vertex.is_decorative_line:
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

    for cell in content:
        style_text = cell.style
        if "shape=image" in style_text:
            if "image=http://" in style_text or "image=https://" in style_text:
                add_warning(warnings, cell.id, "linked/remote icon in portable mode")
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

    return {"name": name, "errors": errors, "warnings": warnings}


def main() -> None:
    args = parse_args()
    path = Path(args.file)
    try:
        models = parse_models(path)
    except (OSError, ET.ParseError, ValueError, base64.binascii.Error, zlib.error, UnicodeDecodeError) as exc:
        print(f"FATAL: cannot read or parse {path}: {exc}")
        sys.exit(2)

    pages = [validate_model(name, model, args.profile, args.theme) for name, model in models]
    total_errors = sum(len(page["errors"]) for page in pages)
    total_warnings = sum(len(page["warnings"]) for page in pages)
    result = {
        "status": "error" if total_errors else "warning" if total_warnings else "pass",
        "file": str(path),
        "profile": args.profile,
        "theme": args.theme,
        "pages": pages,
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
