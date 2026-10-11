"""Negative and positive checks for the research integrity helpers."""

import hashlib
from pathlib import Path
import struct
import tempfile
import unittest

from validate_research import GuideParser, checked_path, check_hash, png_dimensions


class ResearchIntegrityTests(unittest.TestCase):
    def test_sha256_accepts_exact_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "evidence"
            path.write_bytes(b"official-evidence")
            check_hash(path, hashlib.sha256(b"official-evidence").hexdigest())

    def test_sha256_rejects_modified_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "evidence"
            path.write_bytes(b"changed")
            with self.assertRaisesRegex(ValueError, "Hash mismatch"):
                check_hash(path, hashlib.sha256(b"original").hexdigest())

    def test_evidence_path_cannot_escape_root(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError, "escapes"):
                checked_path(Path(folder), "../outside")

    def test_missing_evidence_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError, "Missing"):
                checked_path(Path(folder), "missing")

    def test_png_dimension_header(self):
        data = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + struct.pack(">II", 390, 844)
        self.assertEqual(png_dimensions(data), [390, 844])

    def test_non_png_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid PNG"):
            png_dimensions(b"not-a-png")

    def test_guide_rejects_remote_image(self):
        with self.assertRaisesRegex(ValueError, "self-contained"):
            GuideParser().feed('<img alt="Remote" src="https://example.com/image.png">')

    def test_guide_rejects_missing_label(self):
        with self.assertRaisesRegex(ValueError, "label"):
            GuideParser().feed('<img src="data:image/png;base64,YQ==">')

    def test_guide_rejects_script_and_form(self):
        for tag in ["script", "form", "iframe"]:
            with self.subTest(tag=tag), self.assertRaisesRegex(ValueError, "static"):
                GuideParser().feed(f"<{tag}></{tag}>")

    def test_guide_accepts_static_labeled_image(self):
        parser = GuideParser()
        parser.feed('<section class="sheet"><img alt="Evidence" src="data:image/png;base64,YQ=="></section>')
        self.assertEqual((parser.images, parser.sheets), (1, 1))


if __name__ == "__main__":
    unittest.main(verbosity=2)
