"""Check research evidence integrity; no application behavior is tested."""

import base64
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import struct
import sys
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "docs" / "research"


def publication_files():
    excluded = {".git", "node_modules", "dist", "coverage", ".wrangler", "__pycache__",
                "test-results", "playwright-report", "raw-captures", "browser-profiles"}
    for folder, directories, files in os.walk(ROOT):
        directories[:] = [name for name in directories if name not in excluded]
        for name in files:
            yield Path(folder) / name


def checked_path(root, relative):
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f"Path escapes evidence root: {relative}")
    if not target.is_file():
        raise ValueError(f"Missing file: {relative}")
    return target


def check_hash(path, expected):
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise ValueError(f"Hash mismatch: {path.name}")


def png_dimensions(data):
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Invalid PNG evidence")
    return list(struct.unpack(">II", data[16:24]))


class GuideParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = 0
        self.sheets = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "section" and "sheet" in attrs.get("class", "").split():
            self.sheets += 1
        if tag in {"script", "iframe", "form"}:
            raise ValueError("Reference guide must be static, without forms or scripts")
        if tag == "img":
            if not attrs.get("alt"):
                raise ValueError("Guide image lacks an evidence label")
            src = attrs.get("src", "")
            if not src.startswith("data:image/") or ";base64," not in src:
                raise ValueError("Guide image is not self-contained")
            base64.b64decode(src.split(";base64,", 1)[1], validate=True)
            self.images += 1


def validate():
    checks = []
    for relative in [
        "README.md", "AGENTS.md", "docs/brand-guide.md", "docs/product-brief.md",
        "docs/companyos-variant.md", "docs/evidence-register.md",
        "docs/measurement-contract.md", "docs/third-party-notices.md",
        "docs/brand-visual-guide.html", "docs/brand-visual-guide.pdf",
        "docs/research-validation.md",
    ]:
        checked_path(ROOT, relative)
    checks.append("Required preserved research documents present")

    manifest = json.loads((RESEARCH / "source-manifest.json").read_text())
    for asset in manifest["assets"]:
        parsed = urlparse(asset["url"])
        if parsed.scheme != "https" or parsed.hostname != "www.rebolt.ai":
            raise ValueError("Non-official preserved asset source")
        path = checked_path(RESEARCH, asset["file"])
        if len(path.read_bytes()) != asset["bytes"]:
            raise ValueError(f"Byte mismatch: {asset['file']}")
        check_hash(path, asset["sha256"])
        if path.suffix == ".svg":
            tree = ET.fromstring(path.read_bytes())
            if tree.tag.split("}")[-1] != "svg":
                raise ValueError("Invalid SVG root")
            if any(x.tag.split("}")[-1] == "script" for x in tree.iter()):
                raise ValueError("Unexpected executable SVG content")
    checks.append(f"{len(manifest['assets'])} official assets: bytes, hashes and SVG roots verified")

    for page in manifest["pages"]:
        path = checked_path(RESEARCH, page["screenshot"])
        check_hash(path, page["screenshotSha256"])
        dimensions = png_dimensions(path.read_bytes())
        if dimensions != page["screenshotDimensions"]:
            raise ValueError("Screenshot dimensions disagree with manifest")
        if dimensions != [page["viewport"]["width"], page["viewport"]["height"]]:
            raise ValueError("Screenshot does not match stated viewport")
        if "evidence" in page:
            evidence = json.loads(checked_path(RESEARCH, page["evidence"]).read_text())
            if evidence["url"] != page["url"] or evidence["viewport"] != page["viewport"]:
                raise ValueError("Page source/viewport mismatch")
    checks.append(f"{len(manifest['pages'])} screenshots: source, viewport, dimensions and hashes verified")

    for path in RESEARCH.glob("*.json"):
        json.loads(path.read_text())
    checks.append("All preserved JSON parses")

    for path in publication_files():
        if path.suffix != ".md":
            continue
        for link in re.findall(r"!?\[[^\]]*\]\(([^\s)]+)\)", path.read_text()):
            parsed = urlparse(link)
            if parsed.scheme or link.startswith("#"):
                continue
            checked_path(ROOT, str((path.parent / unquote(parsed.path)).relative_to(ROOT)))
    checks.append("All local Markdown document/image links resolve")

    parser = GuideParser()
    parser.feed((ROOT / "docs" / "brand-visual-guide.html").read_text())
    if parser.sheets != 4 or parser.images < 10:
        raise ValueError("Visual reference lacks its expected sheets/images")
    checks.append(f"Guide: {parser.sheets} static sheets, {parser.images} embedded labeled images")

    pdf = (ROOT / "docs" / "brand-visual-guide.pdf").read_bytes()
    if not pdf.startswith(b"%PDF-") or b"%%EOF" not in pdf[-1024:]:
        raise ValueError("PDF reference is invalid or incomplete")
    checks.append("PDF signature and final EOF verified")

    font_files = [p for p in publication_files() if p.suffix in {".otf", ".ttf", ".woff", ".woff2"}]
    if font_files:
        raise ValueError("Font binary redistribution detected")
    checks.append("No font binaries redistributed")

    forbidden_paths = ["/" + "home/", "/" + "opt/", "/" + "tmp/"]
    byline = re.compile(r"(?:built|made|written|generated)\s+(?:by|with)\s+(?:ai|assistant|model)\b", re.I)
    for path in publication_files():
        text_suffixes = {".md", ".json", ".html", ".py", ".css", ".svg"}
        if not path.is_file() or ".git" in path.parts or path.suffix not in text_suffixes:
            continue
        content = path.read_text()
        if any(value in content for value in forbidden_paths) or byline.search(content):
            raise ValueError(f"Publication hygiene check failed: {path.relative_to(ROOT)}")
    checks.append("Text publication hygiene: no local-machine paths or prohibited bylines")
    return checks


if __name__ == "__main__":
    try:
        results = validate()
    except (ValueError, KeyError, OSError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
    for result in results:
        print(f"PASS: {result}")
    print(f"Research validation passed: {len(results)} checks. No application tests run.")
