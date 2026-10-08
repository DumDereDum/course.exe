"""Author-facing regression checks: bad fragments fail before output is written."""
import argparse
import tempfile
import shutil
import unittest
from pathlib import Path
from unittest.mock import patch
import build
from tools.content import read_slide, check_links

class AuthoringTests(unittest.TestCase):
    def fragment(self, body, name='01.html'):
        path = Path(self.tmp.name) / name
        path.write_text(body, encoding='utf-8')
        return path

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def test_heading_has_space_at_linebreak(self):
        slide = read_slide(self.fragment('<!-- type: content -->\n<h2>Один<br>пример</h2>'))
        self.assertEqual(slide['title'], 'Один пример')

    def test_svg_and_self_closing_elements_are_valid(self):
        read_slide(self.fragment('<!-- type: content --><h2>A<br/>B</h2><svg viewBox="0 0 10 10"><path d="M0 0L1 1"/><circle cx="1" cy="1" r="1"></circle></svg>'))

    def test_author_mistakes_are_explained(self):
        for bad in [
            '<h2>Без типа</h2>',
            '<!-- type: unknown --><h2>Тип</h2>',
            '<!-- type: content --><h2>Первый</h2><h2>Второй</h2>',
            '<!-- type: content --><h2 style="font-size:8px">Мелко</h2>',
            '<!-- type: content --><h2>Код</h2><script>alert(1)</script>',
            '<!-- type: content --><h2>Ссылка</h2><a href="javascript:alert(1)">x</a>',
            '<!-- type: content --><h2>Длинно</h2>' + 'x' * 6144,
            '<!-- type: sequence --><h2>Пусто</h2><div data-widget="sequence"></div>',
            '<!-- type: content --><h2>x</h2><i id="same"></i><b id="same"></b>',
            '<!-- type: content --><h2>x</h2><div><p>Незакрытый блок</div>',
        ]:
            with self.subTest(bad=bad[:100]), self.assertRaises(ValueError):
                read_slide(self.fragment(bad))

    def test_registers_reject_unknown_operands_and_precision_loss(self):
        shell = '<!-- type: split --><h2>r</h2><div data-widget="registers"><pre data-program data-regs="rax"><span data-do=\'{op}\'>mov</span></pre><div data-registers></div></div>'
        for op in ['{"set":{"rax":"oops"}}', '{"set":{"rbx":"10"}}', '{"set":{"rax":9007199254740993}}', '{"add":[]}', '{"zf":2}']:
            with self.subTest(op=op), self.assertRaises(ValueError):
                read_slide(self.fragment(shell.format(op=op)))
        read_slide(self.fragment(shell.format(op='{"set":{"rax":"18446744073709551615"}}')))

    def test_broken_links_and_cross_slide_ids(self):
        one = read_slide(self.fragment('<!-- type: content --><h2>A</h2><i id="label"></i><a href="#missing">x</a>'))
        output = Path(self.tmp.name) / 'lecture.html'
        with self.assertRaisesRegex(ValueError, 'якорная'):
            check_links([one], output, Path(self.tmp.name))
        one['links'] = []
        two = read_slide(self.fragment('<!-- type: content --><h2>B</h2><i id="label"></i>', '02.html'))
        with self.assertRaisesRegex(ValueError, 'повторный'):
            check_links([one, two], output, Path(self.tmp.name))
        one['links'] = [('src', 'lost.svg')]
        with self.assertRaisesRegex(ValueError, 'нет локального'):
            check_links([one], output, Path(self.tmp.name))

    def test_metadata_is_escaped(self):
        lecture = build.read_lecture(build.SRC / 'asm/01-isa')
        lecture['title'] = '<test & title>'
        lecture['subtitle'] = '"quoted" & description'
        rendered = build.render_lecture(lecture)
        self.assertIn('&lt;test &amp; title&gt;', rendered)
        self.assertIn('&quot;quoted&quot; &amp; description', rendered)
        self.assertNotIn('<test & title>', rendered)

    def test_conditional_jump_requires_fields_and_annotated_diagram(self):
        content = (build.SRC / 'asm/02-control/slides/04.html').read_text(encoding='utf-8')
        for marker in ['data-eax', 'data-ebx', 'data-jump-operation', 'data-jump-diagram', 'data-byte-hints']:
            with self.subTest(marker=marker), self.assertRaisesRegex(ValueError, 'conditional-jump'):
                read_slide(self.fragment(content.replace(marker, 'data-missing')))
        # Asset selection uses parsed widget metadata, not a particular quote style.
        slide = read_slide(self.fragment(content.replace('data-widget="conditional-jump"', "data-widget='conditional-jump'")))
        self.assertIn('conditional-jump', slide['widgets'])

    def test_test_variant_requires_its_own_mode_and_rejects_unknown_kind(self):
        content = (build.SRC / 'asm/02-control/slides/05.html').read_text(encoding='utf-8')
        slide = read_slide(self.fragment(content))
        self.assertIn('conditional-jump', slide['widgets'])
        with self.assertRaisesRegex(ValueError, 'data-test-mode'):
            read_slide(self.fragment(content.replace('data-test-mode', 'data-missing')))
        with self.assertRaisesRegex(ValueError, 'data-jump-kind'):
            read_slide(self.fragment(content.replace('data-jump-kind="test"', 'data-jump-kind="unknown"')))

    def test_ordered_variant_has_fixed_operands_and_requires_operation(self):
        content = (build.SRC / 'asm/02-control/slides/07.html').read_text(encoding='utf-8')
        slide = read_slide(self.fragment(content))
        self.assertIn('conditional-jump', slide['widgets'])
        self.assertNotIn('data-eax', content)
        self.assertNotIn('data-ebx', content)
        with self.assertRaisesRegex(ValueError, 'data-jump-operation'):
            read_slide(self.fragment(content.replace('data-jump-operation','data-missing')))

    def test_max_variant_requires_operands_without_operation_selector(self):
        content = (build.SRC / 'asm/02-control/slides/09.html').read_text(encoding='utf-8')
        slide = read_slide(self.fragment(content))
        self.assertIn('conditional-jump', slide['widgets'])
        self.assertNotIn('data-jump-operation', content)
        for marker in ['data-eax', 'data-ebx', 'data-jump-diagram', 'data-byte-hints']:
            with self.subTest(marker=marker), self.assertRaisesRegex(ValueError, marker):
                read_slide(self.fragment(content.replace(marker,'data-missing')))

    def test_while_loop_requires_one_of_each_input_and_diagram(self):
        content = (build.SRC / 'asm/02-control/slides/10.html').read_text(encoding='utf-8')
        slide = read_slide(self.fragment(content))
        self.assertIn('while-loop', slide['widgets'])
        for marker in ['data-eax','data-ebx','data-loop-diagram','data-byte-hints']:
            with self.subTest(marker=marker), self.assertRaisesRegex(ValueError, marker):
                read_slide(self.fragment(content.replace(marker,'data-missing')))
        with self.assertRaisesRegex(ValueError, 'ровно одна'):
            read_slide(self.fragment(content.replace('<div data-loop-diagram>', '<input data-eax><div data-loop-diagram>')))

    def test_for_variant_requires_only_bound_and_rejects_unknown_loop_kind(self):
        content = (build.SRC / 'asm/02-control/slides/11.html').read_text(encoding='utf-8')
        slide = read_slide(self.fragment(content))
        self.assertIn('while-loop', slide['widgets'])
        self.assertNotIn('data-eax', content)
        for marker in ['data-ebx','data-loop-diagram','data-byte-hints']:
            with self.subTest(marker=marker), self.assertRaisesRegex(ValueError, marker):
                read_slide(self.fragment(content.replace(marker,'data-missing')))
        with self.assertRaisesRegex(ValueError, 'data-loop-kind'):
            read_slide(self.fragment(content.replace('data-loop-kind="for"','data-loop-kind="unknown"')))

    def test_sum_variant_requires_bound_and_diagram(self):
        content = (build.SRC / 'asm/02-control/slides/12.html').read_text(encoding='utf-8')
        self.assertIn('while-loop', read_slide(self.fragment(content))['widgets'])
        for marker in ['data-ebx','data-loop-diagram','data-byte-hints']:
            with self.subTest(marker=marker), self.assertRaisesRegex(ValueError, marker):
                read_slide(self.fragment(content.replace(marker,'data-missing')))

    def test_templates_are_valid_slide_fragments(self):
        for template in sorted((build.ROOT / 'templates/slides').glob('*.html')):
            with self.subTest(template=template.name):
                slide = read_slide(self.fragment(template.read_text(encoding='utf-8')))
                check_links([slide], build.ROOT / 'lectures/asm/example.html', build.ROOT)

    def test_new_slide_preserves_existing_files_and_uses_numeric_order(self):
        root = Path(self.tmp.name)
        folder = root / 'course/lecture/slides'
        folder.mkdir(parents=True)
        (folder / '09.html').write_text('keep', encoding='utf-8')
        (root / 'templates/slides').mkdir(parents=True)
        shutil.copy(build.ROOT / 'templates/slides/content.html', root / 'templates/slides/content.html')
        with patch.object(build, 'SRC', root), patch.object(build, 'ROOT', root):
            build.new_slide(argparse.Namespace(lecture='course/lecture', new='content'))
        self.assertEqual((folder / '09.html').read_text(), 'keep')
        self.assertTrue((folder / '10.html').exists())

    def test_repository_sources_and_catalog(self):
        lectures = {p.parent.relative_to(build.SRC).as_posix(): build.read_lecture(p.parent)
                    for p in build.SRC.glob('*/*/meta.txt')}
        home = build.render_home(lectures)
        self.assertIn('lectures/asm/01-isa.html', home)
        self.assertIn('lectures/git/01-intro.html', home)
        self.assertNotIn('lectures/_kit/01-patterns.html', home)
        # The public catalog has two topics; Git lives one folder deeper.
        from html.parser import HTMLParser
        class CatalogTree(HTMLParser):
            def __init__(self):
                super().__init__()
                self.parents, self.entries = [], []
                self.in_catalog = False
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if tag == 'ul' and attrs.get('id') == 'catalog-data':
                    self.in_catalog = True
                if self.in_catalog and tag == 'li':
                    self.entries.append((tuple(self.parents), attrs.get('data-name')))
                    self.parents.append(attrs.get('data-name'))
            def handle_endtag(self, tag):
                if self.in_catalog and tag == 'li':
                    self.parents.pop()
                if self.in_catalog and tag == 'ul' and not self.parents:
                    self.in_catalog = False
        tree = CatalogTree()
        tree.feed(home)
        self.assertEqual([name for parents, name in tree.entries if not parents], ['assembler', 'common'])
        self.assertIn((('common',), 'git'), tree.entries)
        self.assertIn((('common', 'git'), 'Git · Лекция 01'), tree.entries)
        for lecture in lectures.values():
            self.assertNotIn('@ASSETS@', build.render_lecture(lecture))

if __name__ == '__main__':
    unittest.main()
