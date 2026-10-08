; Linux x86-64, NASM. Signed maximum, default max(7, 3) = 7.
; Override with: nasm -f elf64 -DA=-1 -DB=1 max.asm -o build/max.o
%ifndef A
    %define A 7
%endif
%ifndef B
    %define B 3
%endif
bits 64
global _start
section .text
_start:
    mov eax, A
    mov ebx, B
    cmp eax, ebx
    jl use_b
    mov ecx, eax
    jmp done
use_b:
    mov ecx, ebx
done:
    mov edi, ecx           ; Linux exit status
    mov eax, 60            ; sys_exit
    syscall
section .note.GNU-stack noalloc noexec nowrite progbits
