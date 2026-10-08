; Linux x86-64, NASM. abs(-7) = 7.
%ifndef VALUE
    %define VALUE -7
%endif
bits 64
global _start
section .text
_start:
    mov eax, VALUE
    cmp eax, 0
    jge nonnegative
    neg eax
nonnegative:
    mov edi, eax
    mov eax, 60
    syscall
section .note.GNU-stack noalloc noexec nowrite progbits
