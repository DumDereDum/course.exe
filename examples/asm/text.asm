; Linux x86-64, NASM. Print ASCII text, then find it in the ELF file.
bits 64
global _start

section .rodata
msg: db "Hello from the ASM lab", 10
len equ $ - msg                  ; 22 ASCII characters + LF = 23 bytes

section .text
_start:
    mov eax, 1                   ; sys_write
    mov edi, 1                   ; file descriptor 1: stdout
    lea rsi, [rel msg]            ; pointer to the bytes, not the bytes themselves
    mov edx, len                 ; explicit byte count; NUL is not required
    syscall
    cmp rax, len                 ; write returns the number of bytes written
    jne failed                  ; error or partial write: report failure
    xor edi, edi                 ; successful exit status = 0
    jmp finish
failed:
    mov edi, 1                   ; this demo does not retry a partial write
finish:
    mov eax, 60                  ; sys_exit
    syscall

section .note.GNU-stack noalloc noexec nowrite progbits
