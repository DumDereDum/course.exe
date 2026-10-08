#!/usr/bin/env python3
"""Build offline lectures and their catalog; see SLIDE_GUIDE.md for authors."""
import argparse
import html
import json
import re
import sys
from pathlib import Path
from string import Template
from tools.content import read_slide, check_links
from tools.byte_hints import inline_byte_diagrams

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src' / 'lectures'


def read_lecture(directory):
    meta = (directory / 'meta.txt').read_text(encoding='utf-8').splitlines()
    if len(meta) != 3 or not all(line.strip() for line in meta):
        raise ValueError(f'{directory}/meta.txt: нужны три строки — название, подзаголовок, дата')
    paths = sorted((directory / 'slides').glob('*.html'), key=lambda p: int(p.stem) if p.stem.isdigit() else -1)
    if not paths:
        raise ValueError(f'{directory}: нет слайдов')
    if len({int(p.stem) for p in paths if p.stem.isdigit()}) != len(paths):
        raise ValueError(f'{directory}: некорректные или повторные номера слайдов')
    slides = [read_slide(p) for p in paths]
    ref = directory.relative_to(SRC).as_posix()
    if not re.fullmatch(r'[a-z0-9_-]+/[a-z0-9_-]+', ref):
        raise ValueError(f'{directory}: имена раздела и лекции — латиница, цифры, дефис и подчёркивание')
    output = ROOT / 'lectures' / f'{ref}.html'
    check_links(slides, output, ROOT)
    return {'ref': ref, 'title': meta[0].strip(), 'subtitle': meta[1].strip(),
            'date': meta[2].strip(), 'slides': slides, 'output': output}


def render_lecture(lecture):
    esc = html.escape
    parts = []
    for i, slide in enumerate(lecture['slides']):
        active = ' active' if i == 0 else ''
        inert = '' if i == 0 else ' inert aria-hidden="true"'
        parts.append(f'<section class="slide slide--{slide["type"]}{active}" id="{slide["id"]}" aria-label="{esc(slide["title"], quote=True)}"{inert}>\n' +
                     inline_byte_diagrams(slide['body'], ROOT, slide['id']).replace('@ASSETS@', '../../assets') + '\n</section>')
    template = Template((ROOT / 'templates' / 'lecture.html').read_text(encoding='utf-8'))
    byte_hint_assets = ''
    if any('data-byte-hints' in slide['body'] for slide in lecture['slides']):
        byte_hint_assets = '<link rel="stylesheet" href="../../assets/css/byte-hints.css">\n<script defer src="../../assets/js/byte-hints.js"></script>\n'
    conditional_jump_assets = ''
    if any('conditional-jump' in slide.get('widgets', []) for slide in lecture['slides']):
        conditional_jump_assets = '<link rel="stylesheet" href="../../assets/css/conditional-jump.css">\n<script defer src="../../assets/js/widgets/conditional-jump.js"></script>\n'
    while_loop_assets = ''
    if any('while-loop' in slide.get('widgets', []) for slide in lecture['slides']):
        while_loop_assets = '<link rel="stylesheet" href="../../assets/css/while-loop.css">\n<script defer src="../../assets/js/widgets/while-loop.js"></script>\n'
    return template.substitute(title=esc(lecture['title']), subtitle=esc(lecture['subtitle'], quote=True), byte_hint_assets=byte_hint_assets,
                               conditional_jump_assets=conditional_jump_assets,
                               while_loop_assets=while_loop_assets,
                               slides='\n\n'.join(parts), count=f'{len(parts):02}')


def render_home(lectures):
    catalog = json.loads((ROOT / 'src' / 'catalog.json').read_text(encoding='utf-8'))
    esc = html.escape

    def render_folder(folder):
        selected = [l for ref, l in lectures.items() if ref.split('/')[0] in folder.get('sections', []) or ref in folder.get('lectures', [])]
        unknown = set(folder.get('lectures', [])) - lectures.keys()
        if unknown:
            raise ValueError(f'catalog.json: не найдены лекции {unknown}')
        items = [render_folder(child) for child in folder.get('folders', [])]
        for lec in selected:
            items.append(f'<li data-kind="lecture" data-name="{esc(lec["title"], quote=True)}" data-desc="{esc(lec["subtitle"], quote=True)}" data-count="{len(lec["slides"])}" data-demos="{sum(s["interactive"] for s in lec["slides"])}" data-href="lectures/{lec["ref"]}.html"></li>')
        name = esc(folder['name'], quote=True)
        description = esc(folder.get('description', ''), quote=True)
        return f'<li data-kind="dir" data-name="{name}" data-code="{name}" data-desc="{description}"><ul>{"".join(items)}</ul></li>'

    entries = [render_folder(folder) for folder in catalog['topics']]
    return Template((ROOT / 'templates' / 'home.html').read_text(encoding='utf-8')).substitute(
        tree='\n'.join(entries))


def new_slide(args):
    if not args.lecture or not re.fullmatch(r'[a-z0-9_-]+/[a-z0-9_-]+', args.lecture):
        raise ValueError('--new требует --lecture раздел/лекция')
    folder = SRC / args.lecture / 'slides'
    template = ROOT / 'templates' / 'slides' / f'{args.new}.html'
    if not folder.is_dir() or not template.is_file():
        raise ValueError('нет лекции или шаблона; см. SLIDE_GUIDE.md')
    numbers = [int(p.stem) for p in folder.glob('*.html') if p.stem.isdigit()]
    path = folder / f'{max(numbers, default=0) + 1:02}.html'
    with path.open('x', encoding='utf-8') as dest:
        dest.write(template.read_text(encoding='utf-8'))
    print(f'создано: {path.relative_to(ROOT)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lecture', help='собрать только раздел/лекцию и обновить каталог')
    parser.add_argument('--check', action='store_true', help='проверить исходники без записи')
    parser.add_argument('--new', metavar='TEMPLATE', help='добавить слайд из templates/slides/')
    args = parser.parse_args()
    if args.new:
        if args.check:
            parser.error('--new и --check несовместимы')
        new_slide(args)
        return
    lectures = {d.parent.relative_to(SRC).as_posix(): read_lecture(d.parent) for d in sorted(SRC.glob('*/*/meta.txt'))}
    if not lectures:
        raise ValueError('не найдено лекций')
    if args.lecture and args.lecture not in lectures:
        raise ValueError(f'нет лекции {args.lecture}')
    home = render_home(lectures)
    # Validate everything before writing anything; each lecture remains independently buildable.
    outputs = [(l['output'], render_lecture(l)) for ref, l in lectures.items() if not args.lecture or ref == args.lecture]
    if not args.check:
        for path, content in outputs + [(ROOT / 'index.html', home)]:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding='utf-8')
            print(f'собрано: {path.relative_to(ROOT)}')
    print(f'проверено: {len(lectures)} лекций, {sum(len(l["slides"]) for l in lectures.values())} слайдов')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        sys.exit(f'ошибка: {error}')
