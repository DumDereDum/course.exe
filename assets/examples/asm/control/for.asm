; Linux x86-64, NASM. N iterations, value += 2, default N=3 -> 6.
%ifndef N
    %define N 3
%endif
bits 64
global _start
section .text
_start:
    mov ebx, N
    mov ecx, 0
    mov eax, 0
check:
    cmp eax, ebx
    jge done
    add ecx, 2
    inc eax
    jmp check
done:
    mov edi, ecx
    mov eax, 60
    syscall
section .note.GNU-stack noalloc noexec nowrite progbits
