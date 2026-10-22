"""Verify that the offline homework downloads contain the current handout."""
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class IOHandout(unittest.TestCase):
    def test_downloads_match_working_sources(self):
        source = ROOT / 'examples/asm/io'
        assets = ROOT / 'assets/examples/asm/io'
        names = {'README.md', 'skeleton.asm'}
        self.assertEqual({p.name for p in source.iterdir() if p.is_file()}, names)
        with zipfile.ZipFile(assets / 'io-examples.zip') as archive:
            self.assertEqual(set(archive.namelist()), {'io/' + name for name in names})
            for name in names:
                expected = (source / name).read_bytes()
                self.assertEqual((assets / name).read_bytes(), expected)
                self.assertEqual(archive.read('io/' + name), expected)
