; Linux x86-64, NASM. 1 + ... + N, default N=4 -> 10.
%ifndef N
    %define N 4
%endif
bits 64
global _start
section .text
_start:
    mov ebx, N
    mov ecx, 0             ; accumulator is initialized here
    mov eax, 1             ; first term
check:
    cmp eax, ebx
    jg done                ; include N, leave only when i > N
    add ecx, eax
    inc eax
    jmp check
done:
    mov edi, ecx           ; preserve sum before setting syscall number
    mov eax, 60
    syscall
section .note.GNU-stack noalloc noexec nowrite progbits
