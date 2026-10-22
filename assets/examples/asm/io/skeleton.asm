; Linux x86-64, NASM. Skeleton for the homework double.asm.
; Fill the five TODO blocks. The finished program reads a number 0..99,
; doubles it and prints exactly:  Result: N
; Build:
;   mkdir -p build
;   nasm -f elf64 skeleton.asm -o build/skeleton.o
;   ld -o build/skeleton build/skeleton.o

bits 64
global _start

section .rodata
prefix: db "Result: "

section .bss
inbuf:  resb 32
numbuf: resb 5

section .text
_start:
    ; TODO 1. read one line
    ;   eax=0, edi=0, rsi=inbuf, edx=32, syscall
    ;   after the call RAX = number of bytes read

    ; TODO 2. parse digits into EAX
    ;   rsi = inbuf, eax = 0
    ;   for each byte: ecx = byte; stop at LF (10), CR (13) or non-digit;
    ;   sub ecx, '0'; imul eax, eax, 10; add eax, ecx; inc rsi

    ; TODO 3. double
    ;   add eax, eax

    ; TODO 4. digits and LF into numbuf
    ;   rdi = numbuf+4, ebx=10, ecx=0
    ;   repeat: edx=0, div ebx, add dl,'0', dec rdi, store, inc ecx
    ;   until eax == 0; then store LF at [rdi+rcx]
    ;   r8 = first digit, r9 = number of digits + 1

    ; TODO 5. write prefix, write number, exit(0)
    ;   prefix: eax=1, edi=1, rsi=prefix, edx=8, syscall
    ;   number: eax=1, edi=1, rsi=r8, rdx=r9, syscall
    ;   exit:   eax=60, edi=0, syscall

    mov eax, 60
    xor edi, edi
    syscall

section .note.GNU-stack noalloc noexec nowrite progbits
