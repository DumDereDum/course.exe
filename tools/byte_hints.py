"""Embed opt-in annotated SVGs at build time; no fetch is needed for file://."""
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ET.register_namespace('', 'http://www.w3.org/2000/svg')
IMAGE = re.compile(r'''<img\b(?:[^>"']|"[^"]*"|'[^']*')*>''', re.IGNORECASE)


class ImageAttrs(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)


def inline_byte_diagrams(body, root, prefix):
    count = 0

    def replace(match):
        nonlocal count
        parser = ImageAttrs()
        parser.feed(match[0])
        attrs = parser.attrs
        if 'data-byte-hints' not in attrs:
            return match[0]
        src = attrs.get('src', '')
        if not src.startswith('@ASSETS@/'):
            raise ValueError('byte-hints: src должен начинаться с @ASSETS@/')
        path = (root / 'assets' / src[len('@ASSETS@/'):]).resolve()
        if not path.is_relative_to((root / 'assets').resolve()) or path.suffix != '.svg':
            raise ValueError('byte-hints: нужен SVG внутри assets/')
        svg = ET.parse(path).getroot()
        if svg.tag != '{http://www.w3.org/2000/svg}svg':
            raise ValueError(f'byte-hints: {path} не SVG')
        title = svg.find('{http://www.w3.org/2000/svg}title')
        description = svg.find('{http://www.w3.org/2000/svg}desc')
        # Keep the accessible name without a second, native browser tooltip.
        svg.set('aria-label', attrs.get('alt') or (title.text if title is not None else 'Машинные байты'))
        svg.attrib.pop('aria-labelledby', None)
        if description is not None and description.get('id'):
            svg.set('aria-describedby', description.get('id'))
        if title is not None:
            svg.remove(title)
        hints = []
        ids = set()
        for node in svg.iter():
            tag = node.tag.rsplit('}', 1)[-1]
            if tag in {'script', 'style', 'foreignObject'} or any(key.startswith('on') for key in node.attrib):
                raise ValueError(f'byte-hints: активное содержимое запрещено в {path}')
            identity = node.get('id')
            if identity:
                if identity in ids:
                    raise ValueError(f'byte-hints: повторный id в {path}')
                ids.add(identity)
            hint = node.get('data-byte-hint')
            if hint is not None:
                byte = node.get('data-byte', '')
                if not re.fullmatch(r'[0-9A-F]{2}', byte) or not hint.strip():
                    raise ValueError(f'byte-hints: нужны две hex-цифры и описание в {path}')
                node.set('tabindex', '0')
                node.set('role', 'button')
                node.set('aria-label', f'{byte}: {hint}')
                hints.append(node)
        if not hints:
            raise ValueError(f'byte-hints: нет подписей байтов в {path}')
        count += 1
        rename = {identity: f'{prefix}-bytes-{count}-{identity}' for identity in ids}
        for node in svg.iter():
            for key, value in list(node.attrib.items()):
                if key == 'id':
                    value = rename[value]
                elif key in {'aria-labelledby', 'aria-describedby'}:
                    value = ' '.join(rename.get(item, item) for item in value.split())
                else:
                    value = re.sub(r'url\(#([^)]*)\)', lambda m: f'url(#{rename.get(m[1], m[1])})', value)
                    if key.rsplit('}', 1)[-1] == 'href' and value.startswith('#'):
                        value = '#' + rename.get(value[1:], value[1:])
                node.set(key, value)
        svg.set('class', attrs.get('class', 'diagram'))
        svg.set('role', 'group')
        return '<div class="byte-diagram">' + ET.tostring(svg, encoding='unicode') + '</div>'

    return IMAGE.sub(replace, body)
