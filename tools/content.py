"""Small, dependency-free authoring checks. No execution of slide code."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

TYPES = {'title', 'content', 'split', 'sequence', 'external', 'map', 'media'}
TYPE = re.compile(r'^\s*<!--\s*type:\s*([a-z-]+)\s*-->\s*')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Fragment(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.headings, self.errors, self.ids = [], [], set()
        self.in_heading = False
        self.heading = ''
        self.links = []
        self.widgets = []
        self.markers = {}
        self.operations = []
        self.stack = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        for name, value in attrs.items():
            if name.startswith('data-'):
                self.markers.setdefault(name, []).append(value)
        if tag == 'br' and self.in_heading:
            self.heading += ' '
        if tag in {'html', 'head', 'body', 'script', 'style', 'iframe'}:
            self.errors.append(f'<{tag}> не разрешён во фрагменте')
        if any(a.startswith('on') or a == 'style' for a in attrs):
            self.errors.append('inline JS/CSS запрещены; используйте готовый компонент')
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                self.errors.append(f"повторный id: {attrs['id']}")
            self.ids.add(attrs['id'])
        for key in ('href', 'src', 'data-src'):
            value = attrs.get(key, '')
            if not value:
                continue
            if urlsplit(value).scheme not in {'', 'https', 'http', 'mailto'}:
                self.errors.append(f'недопустимый адрес: {value}')
            self.links.append((key, value))
        if attrs.get('target') == '_blank' and 'noopener' not in (attrs.get('rel') or '').split():
            self.errors.append('ссылке target="_blank" нужен rel="noopener"')
        if 'data-do' in attrs:
            try:
                op = json.loads(attrs['data-do'])
                if not isinstance(op, dict) or set(op) - {'set', 'add', 'inc', 'xor', 'zf'}:
                    raise ValueError()
                for name in ('set', 'add', 'xor'):
                    if name in op and not isinstance(op[name], dict):
                        raise ValueError()
                if 'inc' in op and not isinstance(op['inc'], str):
                    raise ValueError()
                self.operations.append(op)
            except (ValueError, TypeError):
                self.errors.append('ошибка data-do: ожидается объект set/add/inc/xor/zf')
        if 'data-widget' in attrs:
            self.widgets.append(attrs['data-widget'])
            if attrs['data-widget'] not in {'sequence', 'registers', 'endian', 'register-map', 'command-lab', 'syscall-explorer', 'conditional-jump', 'while-loop'}:
                self.errors.append(f"неизвестный виджет: {attrs['data-widget']}")
        if tag in {'h1', 'h2'}:
            self.in_heading, self.heading = True, ''

    def handle_data(self, data):
        if self.in_heading:
            self.heading += data

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f'несогласованные теги около </{tag}>')
        else:
            self.stack.pop()
        if tag in {'h1', 'h2'} and self.in_heading:
            self.headings.append(' '.join(self.heading.split()))
            self.in_heading = False

    def validate_widget(self):
        if not self.widgets:
            return
        widget = self.widgets[0]
        testing = self.markers.get('data-jump-kind') == ['test']
        required = {
            'sequence': ['data-frame'],
            'registers': ['data-program', 'data-registers'],
            'endian': ['data-memory', 'data-readout', 'data-endian-caption', 'data-mode'],
            'register-map': ['data-register-map'],
            'command-lab': ['data-command-examples', 'data-command-state', 'data-command', 'data-before', 'data-after'],
            'syscall-explorer': ['data-syscall-explorer'],
            'conditional-jump': ['data-eax', 'data-ebx', 'data-jump-operation', 'data-jump-diagram', 'data-byte-hints'],
            'while-loop': ['data-eax', 'data-ebx', 'data-loop-diagram', 'data-byte-hints'],
        }
        if widget == 'conditional-jump' and testing:
            required[widget] = ['data-eax', 'data-test-mode', 'data-jump-diagram', 'data-byte-hints']
        if widget == 'conditional-jump' and self.markers.get('data-jump-kind') == ['ordered']:
            required[widget] = ['data-jump-operation', 'data-jump-diagram', 'data-byte-hints']
        if widget == 'conditional-jump' and self.markers.get('data-jump-kind') == ['max']:
            required[widget] = ['data-eax', 'data-ebx', 'data-jump-diagram', 'data-byte-hints']
        if widget == 'while-loop' and self.markers.get('data-loop-kind') in [['for'],['sum']]:
            required[widget] = ['data-ebx', 'data-loop-diagram', 'data-byte-hints']
        if widget == 'while-loop' and self.markers.get('data-loop-kind', ['while'])[0] not in {'while','for','sum'}:
            self.errors.append('while-loop: data-loop-kind должен быть while, for или sum')
        if widget == 'conditional-jump' and self.markers.get('data-jump-kind', ['cmp'])[0] not in {'cmp','test','ordered','max'}:
            self.errors.append('conditional-jump: data-jump-kind должен быть cmp, test, ordered или max')
        for name in required.get(widget, []):
            if name not in self.markers:
                self.errors.append(f'{widget}: отсутствует {name}')
        if widget == 'sequence' and not 2 <= len(self.markers.get('data-frame', [])) <= 5:
            self.errors.append('sequence: нужно от 2 до 5 кадров')
        if widget in {'conditional-jump', 'while-loop'}:
            for name in required[widget]:
                if len(self.markers.get(name, [])) != 1:
                    self.errors.append(f'{widget}: нужна ровно одна область {name}')
        if widget == 'register-map':
            if len(self.markers.get('data-register-map', [])) != 1:
                self.errors.append('register-map: нужна ровно одна область data-register-map')
            try:
                text = self.markers.get('data-initial', ['0x1122334455667788'])[0]
                number = int(text, 16 if text.startswith('0x') else 10)
                if not 0 <= number <= 0xffffffffffffffff:
                    raise ValueError()
            except (ValueError, TypeError, AttributeError):
                self.errors.append('register-map: data-initial должен быть беззнаковым 64-битным числом')
        if widget == 'command-lab':
            commands = self.markers.get('data-command', [])
            if not 2 <= len(commands) <= 5:
                self.errors.append('command-lab: нужно от 2 до 5 примеров')
            if len(self.markers.get('data-command-examples', [])) != 1 or len(self.markers.get('data-command-state', [])) != 1:
                self.errors.append('command-lab: нужны по одной области примеров и состояния')
            register = re.compile(r'r(?:ax|bx|cx|dx|si|di|sp|bp|[89]|1[0-5])')
            for marker in ('data-before', 'data-after'):
                for raw in self.markers.get(marker, []):
                    try:
                        values = json.loads(raw)
                        if not isinstance(values, dict) or not all(register.fullmatch(name) and isinstance(text, str) and 0 <= int(text, 0) <= 0xffffffffffffffff for name, text in values.items()):
                            raise ValueError()
                    except (ValueError, TypeError, json.JSONDecodeError):
                        self.errors.append(f'command-lab: ошибка {marker}')
        if widget == 'syscall-explorer' and len(self.markers.get('data-syscall-explorer', [])) != 1:
            self.errors.append('syscall-explorer: нужна ровно одна область data-syscall-explorer')
        if widget == 'endian':
            try:
                width = int(self.markers.get('data-width', ['32'])[0])
                text = self.markers.get('data-value', ['0x12345678'])[0]
                number = int(text, 16 if text.startswith('0x') else 10)
                if width not in (32, 64) or not 0 <= number < (1 << width):
                    raise ValueError()
            except (ValueError, TypeError):
                self.errors.append('endian: data-width должен быть 32 или 64, data-value — беззнаковым числом этой разрядности')
            if set(self.markers.get('data-mode', [])) != {'le', 'be'}:
                self.errors.append('endian: нужны кнопки le и be')
        if widget != 'registers':
            return
        regs = [r.strip() for r in (self.markers.get('data-regs', ['rax,rbx,rcx,rdx'])[0] or '').split(',')]
        if not 1 <= len(regs) <= 4 or len(set(regs)) != len(regs) or not all(re.fullmatch(r'r(?:ax|bx|cx|dx|si|di|sp|bp|[89]|1[0-5])', r) for r in regs):
            self.errors.append('registers: нужны 1–4 разных 64-битных x86-регистра')
        def operand(value):
            return isinstance(value, str) and (value in regs or re.fullmatch(r'-?\d+|0x[0-9a-fA-F]+', value))
        for op in self.operations:
            if 'zf' in op and (type(op['zf']) is not int or op['zf'] not in (0, 1)):
                self.errors.append('ZF должен быть 0 или 1')
            if 'inc' in op and op['inc'] not in regs:
                self.errors.append(f'неизвестный регистр inc: {op["inc"]}')
            for name in ('set', 'add', 'xor'):
                for target, value in op.get(name, {}).items():
                    if target not in regs or not operand(value):
                        self.errors.append(f'{name}: неизвестный регистр или операнд; числа передаются строками')


def read_slide(path: Path):
    raw = path.read_text(encoding='utf-8')
    match = TYPE.match(raw)
    if not match or match[1] not in TYPES:
        raise ValueError(f'{path}: первая строка — <!-- type: {" | ".join(sorted(TYPES))} -->')
    if not re.fullmatch(r'\d{2,3}', path.stem):
        raise ValueError(f'{path}: имя слайда должно быть числом с ведущим нулём')
    body = raw[match.end():].strip()
    parser = Fragment()
    parser.feed(body)
    if parser.stack:
        parser.errors.append('незакрытые теги: ' + ', '.join(parser.stack))
    parser.validate_widget()
    if len(parser.headings) != 1:
        parser.errors.append('нужен ровно один h1 или h2')
    if len(parser.widgets) > 1:
        parser.errors.append('не больше одного основного виджета на слайде')
    if len(raw.encode('utf-8')) > 6144:
        parser.errors.append('больше 6 КБ: разделите материал на несколько слайдов')
    if parser.errors:
        raise ValueError(f'{path}: ' + '; '.join(parser.errors))
    return {'id': 's-' + path.stem, 'type': match[1], 'body': body,
            'title': parser.headings[0], 'links': parser.links, 'ids': parser.ids,
            'interactive': bool(parser.widgets) or 'data-embed' in parser.markers, 'widgets': parser.widgets}


def check_links(slides, output, root):
    ids = {slide['id'] for slide in slides}
    for slide in slides:
        if ids & slide['ids']:
            raise ValueError(f"{output}: повторный id в {slide['id']}")
        ids |= slide['ids']
    for slide in slides:
        for kind, value in slide['links']:
            value = value.replace('@ASSETS@', '../../assets')
            url = urlsplit(value)
            if url.scheme or url.netloc:
                continue
            if not url.path:
                if url.fragment and unquote(url.fragment) not in ids:
                    raise ValueError(f"{output}: неизвестная якорная ссылка {value}")
            else:
                path = (output.parent / unquote(url.path)).resolve()
                if not path.is_relative_to(root) or not path.exists():
                    raise ValueError(f"{output}: нет локального файла {value}")
