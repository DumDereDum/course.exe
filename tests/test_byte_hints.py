"""Offline embedding: hit targets, exact byte rows and independent SVG references."""
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

import build
from tools.byte_hints import inline_byte_diagrams


class ByteHintTests(unittest.TestCase):
    def test_diagrams_have_one_hint_for_every_encoded_byte(self):
        namespace = {'s': 'http://www.w3.org/2000/svg'}
        cases = {
            'rip': (['4889D8', '4801C8', '4883E801'], 4),
            'jmp': (['B80A000000', 'EB04', '4883C005', '4883E802'], 4),
            'cmp': (['B807000000', 'BB07000000', '39D8', 'BB03000000', '39D8'], 5),
            'branch': (['39D8', '7407', 'B900000000', 'EB05', 'B901000000'], 1),
            'test': (['85C0', '7407', 'B900000000', 'EB05', 'B901000000'], 1),
            'integer': (['FFFFFFFF'], 3),
            'ordered': (['39D8', '7C07', 'B900000000', 'EB05', 'B901000000'], 1),
            'max': (['39D8', '7C04', '89C1', 'EB02', '89D9'], 1),
            'while': (['39D8', '7D04', 'FFC0', 'EBF8'], 1),
            'for': (['B800000000', '39D8', '7D07', '83C102', 'FFC0', 'EBF5'], 1),
            'sum': (['B801000000', '39D8', '7F06', '01C1', 'FFC0', 'EBF6'], 1),
        }
        for kind, (instructions, frames) in cases.items():
            expected = [code[i:i + 2] for code in instructions for i in range(0, len(code), 2)]
            for frame in range(frames):
                path = build.ROOT / 'assets/diagrams' / f'{kind}-step-{frame}.svg'
                svg = ET.parse(path).getroot()
                hints = [hint for hint in svg.findall('.//s:g[@data-byte-hint]', namespace) if hint.get('display') != 'none']
                self.assertEqual([hint.get('data-byte') for hint in hints], expected)
                for hint in hints:
                    self.assertTrue(hint.get('data-byte-hint').strip())
                    self.assertIsNotNone(hint.find('s:rect', namespace))

    def test_error_examples_have_exact_byte_fragments(self):
        namespace = {'s': 'http://www.w3.org/2000/svg'}
        cases = ['39D87D0639D87F06','39D8720439D87C04','39D8FFC17407FFC139D87407']
        for frame, expected in enumerate(cases):
            svg = ET.parse(build.ROOT / 'assets/diagrams' / f'errors-step-{frame}.svg').getroot()
            hints = svg.findall('.//s:g[@data-byte-hint]', namespace)
            self.assertEqual(''.join(h.get('data-byte') for h in hints), expected)
            self.assertTrue(all(h.get('data-byte-hint').strip() for h in hints))

    def test_generated_lecture_embeds_hints_with_unique_working_references(self):
        from html.parser import HTMLParser

        class References(HTMLParser):
            def __init__(self):
                super().__init__()
                self.ids, self.refs, self.hints = [], [], 0

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if 'id' in attrs:
                    self.ids.append(attrs['id'])
                for field in ('aria-labelledby', 'aria-describedby'):
                    self.refs.extend(attrs.get(field, '').split())
                for value in attrs.values():
                    if value and 'url(#' in value:
                        self.refs.append(value.split('url(#')[1].split(')')[0])
                if 'data-byte-hint' in attrs:
                    self.hints += 1
                    self.assert_accessible = attrs.get('tabindex') == '0' and bool(attrs.get('aria-label'))
                    if not self.assert_accessible:
                        raise AssertionError('Byte hint is not keyboard accessible')

        lecture = build.read_lecture(build.SRC / 'asm/02-control')
        rendered = build.render_lecture(lecture)
        parsed = References()
        parsed.feed(rendered)
        self.assertEqual(parsed.hints, 335)
        self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
        self.assertTrue(set(parsed.refs) <= set(parsed.ids))
        self.assertIn('byte-hints.js', rendered)
        self.assertIn('while-loop.js', rendered)
        self.assertIn('while-loop.css', rendered)
        self.assertNotIn('data-byte-hints src=', rendered)
        other = build.render_lecture(build.read_lecture(build.SRC / 'asm/01-isa'))
        self.assertNotIn('while-loop.js', other)
        self.assertNotIn('while-loop.css', other)
        self.assertNotIn('byte-hints.js', other)
        self.assertNotIn('byte-hints.css', other)

    def test_annotation_errors_fail_before_build_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'assets').mkdir()
            path = root / 'assets/diagram.svg'
            for byte, hint in [('4', 'Prefix'), ('GG', 'Opcode'), ('48', '')]:
                path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg"><g data-byte="{byte}" data-byte-hint="{hint}"/></svg>')
                with self.assertRaisesRegex(ValueError, 'hex'):
                    inline_byte_diagrams('<img data-byte-hints src="@ASSETS@/diagram.svg">', root, 's-01')
            with self.assertRaisesRegex(ValueError, 'внутри assets'):
                inline_byte_diagrams('<img data-byte-hints src="@ASSETS@/../outside.svg">', root, 's-01')
            original = '<img src="@ASSETS@/diagram.svg" alt="Обычная картинка">'
            self.assertEqual(inline_byte_diagrams(original, root, 's-01'), original)
