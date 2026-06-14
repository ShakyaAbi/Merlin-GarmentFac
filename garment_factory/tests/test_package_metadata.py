from pathlib import Path
import unittest

import garment_factory


ROOT = Path(__file__).resolve().parents[1]


class TestPackageMetadata(unittest.TestCase):
    def test_version_is_defined(self):
        self.assertEqual(garment_factory.__version__, "0.0.1")

    def test_packaging_files_exist(self):
        for name in ["README.md", "LICENSE", "MANIFEST.in", "pyproject.toml", "setup.py", "modules.txt"]:
            with self.subTest(name=name):
                self.assertTrue((ROOT / name).exists(), name)
