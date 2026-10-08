"""Compile real NASM ELF objects; verify arithmetic with a bounded byte model.

This does not replace a Linux/Docker execution check. Only the instructions used
by these four freestanding examples are supported; unknown bytes fail the test.
"""
import shutil
import struct
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / 'assets/examples/asm/control'
NASM = shutil.which('nasm')


class ExampleDownloads(unittest.TestCase):
    def test_archive_matches_source_files_and_instructions(self):
        expected = {f'control/{p.name}': p.read_bytes() for p in EXAMPLES.iterdir() if p.is_file()}
        self.assertEqual(set(expected), {'control/' + name for name in
                         ['max.asm', 'abs.asm', 'sum.asm', 'for.asm', 'README.md']})
        with zipfile.ZipFile(EXAMPLES.parent / 'control-examples.zip') as archive:
            self.assertEqual(set(archive.namelist()), set(expected))
            for name, data in expected.items():
                self.assertEqual(archive.read(name), data)


def text_section(data):
    assert data[:6] == b'\x7fELF\x02\x01'
    assert struct.unpack_from('<HH', data, 16) == (1, 62)  # ET_REL, x86-64
    offset = struct.unpack_from('<Q', data, 40)[0]
    size, count, strings = struct.unpack_from('<HHH', data, 58)
    headers = [struct.unpack_from('<IIQQQQIIQQ', data, offset + i * size) for i in range(count)]
    names = data[headers[strings][4]:headers[strings][4] + headers[strings][5]]
    for header in headers:
        name = names[header[0]:].split(b'\0', 1)[0]
        if name == b'.text':
            assert header[2] & 6 == 6  # allocated, executable
            return data[header[4]:header[4] + header[5]]
    raise AssertionError('Missing .text')


def exit_status(code):
    """32-bit register instructions, relative jumps, and the exit syscall only."""
    regs, flags, pc = [0] * 8, dict(zf=0, sf=0, of=0, cf=0), 0

    def arithmetic(a, b, subtract=False, keep_carry=False):
        value = a - b if subtract else a + b
        result = value & 0xffffffff
        flags.update(zf=int(result == 0), sf=result >> 31)
        flags['of'] = int(bool(((a ^ b) if subtract else ~(a ^ b)) & (a ^ result) & 0x80000000))
        if not keep_carry:
            flags['cf'] = int(a < b if subtract else value > 0xffffffff)
        return result

    for _ in range(5000):
        op = code[pc]
        if 0xb8 <= op <= 0xbf:
            regs[op - 0xb8] = int.from_bytes(code[pc + 1:pc + 5], 'little')
            pc += 5
        elif op in (0x39, 0x89, 0x01, 0x83, 0xff, 0xf7):
            modrm = code[pc + 1]
            assert modrm >> 6 == 3, 'Only register operands are supported'
            source, dest = (modrm >> 3) & 7, modrm & 7
            if op == 0x39:
                arithmetic(regs[dest], regs[source], subtract=True)
            elif op == 0x89:
                regs[dest] = regs[source]
            elif op == 0x01:
                regs[dest] = arithmetic(regs[dest], regs[source])
            elif op == 0x83:
                immediate = int.from_bytes(code[pc + 2:pc + 3], 'little', signed=True) & 0xffffffff
                if source == 7:
                    arithmetic(regs[dest], immediate, subtract=True)
                elif source == 0:
                    regs[dest] = arithmetic(regs[dest], immediate)
                else:
                    raise AssertionError('Unsupported 83 operation')
                pc += 1
            elif op == 0xff:
                assert source == 0
                regs[dest] = arithmetic(regs[dest], 1, keep_carry=True)
            else:
                assert source == 3  # NEG
                regs[dest] = arithmetic(0, regs[dest], subtract=True)
            pc += 2
        elif op in (0x74, 0x7c, 0x7d, 0x7f, 0x72, 0xeb):
            delta = int.from_bytes(code[pc + 1:pc + 2], 'little', signed=True)
            taken = {0x74: flags['zf'] == 1, 0x7c: flags['sf'] != flags['of'],
                     0x7d: flags['sf'] == flags['of'],
                     0x7f: flags['zf'] == 0 and flags['sf'] == flags['of'],
                     0x72: flags['cf'] == 1, 0xeb: True}[op]
            pc += 2 + (delta if taken else 0)
        elif code[pc:pc + 2] == b'\x0f\x05':
            assert regs[0] == 60, 'Only sys_exit is supported'
            return regs[7] & 255
        else:
            raise AssertionError(f'Unsupported opcode {op:02x} at {pc:x}')
    raise AssertionError('The example did not terminate')


@unittest.skipUnless(NASM, 'NASM is needed for the optional binary example checks')
class AssemblyExamples(unittest.TestCase):
    def compile(self, name, defines=(), replacement=None):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source = folder / 'example.asm'
            content = (EXAMPLES / f'{name}.asm').read_text()
            if replacement:
                content = content.replace(*replacement)
            source.write_text(content)
            output = folder / 'example.o'
            subprocess.run([NASM, '-f', 'elf64', *['-D' + item for item in defines],
                            str(source), '-o', str(output)], check=True, capture_output=True)
            return text_section(output.read_bytes())

    def test_default_results_from_assembled_machine_code(self):
        for name, result in [('max', 7), ('abs', 7), ('sum', 10), ('for', 6)]:
            with self.subTest(name=name):
                self.assertEqual(exit_status(self.compile(name)), result)

    def test_control_values_and_low_eight_bits(self):
        cases = [('max', ('A=-1', 'B=1'), 1), ('max', ('A=7', 'B=7'), 7),
                 ('max', ('A=-7', 'B=-3'), 253)]
        cases += [('abs', (f'VALUE={n}',), abs(n)) for n in [-255, -7, 0, 7, 255]]
        cases += [('sum', (f'N={n}',), (n * (n + 1) // 2) & 255) for n in [0, 1, 4, 5, 22, 23]]
        cases += [('for', (f'N={n}',), 2 * n) for n in [0, 1, 3, 5, 127]]
        for name, defines, result in cases:
            with self.subTest(name=name, defines=defines):
                self.assertEqual(exit_status(self.compile(name, defines)), result)

    def test_wrong_boundary_and_wrong_signedness_match_slide(self):
        self.assertEqual(exit_status(self.compile('sum', replacement=('jg done', 'jge done'))), 6)
        self.assertEqual(exit_status(self.compile('max', ('A=-1', 'B=1'),
                                                 replacement=('jl use_b', 'jb use_b'))), 255)
