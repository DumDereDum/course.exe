; Linux x86-64, NASM. Read a decimal number 0..99, double it, print Result: N.
; Build:
;   mkdir -p build
;   nasm -f elf64 double.asm -o build/double.o
;   ld -o build/double build/double.o
; Run:
;   printf '21\n' | ./build/double

bits 64
global _start

section .rodata
prefix: db "Result: "

section .bss
inbuf:  resb 32
numbuf: resb 5

section .text
_start:
    ; 1. read one line into inbuf
    xor eax, eax            ; sys_read
    xor edi, edi            ; fd 0: stdin
    lea rsi, [rel inbuf]
    mov edx, 32
    syscall

    ; 2. parse decimal digits: acc = acc*10 + d
    lea rsi, [rel inbuf]
    xor eax, eax
.next:
    movzx ecx, byte [rsi]
    cmp ecx, 10             ; LF ends the line
    je .parsed
    cmp ecx, 13             ; tolerate CR from CRLF
    je .parsed
    cmp ecx, '0'
    jb .parsed
    cmp ecx, '9'
    ja .parsed
    sub ecx, '0'
    imul eax, eax, 10
    add eax, ecx
    inc rsi
    jmp .next
.parsed:

    ; 3. double
    add eax, eax

    ; 4. digits backwards into numbuf, then LF
    lea rdi, [rel numbuf + 4]
    mov ebx, 10
    xor ecx, ecx
.digits:
    xor edx, edx            ; div uses EDX:EAX
    div ebx
    add dl, '0'
    dec rdi
    mov byte [rdi], dl
    inc ecx
    test eax, eax
    jnz .digits
    mov byte [rdi + rcx], 10

    mov r8, rdi             ; first digit
    lea r9, [rcx + 1]       ; digits + LF

    ; 5. write prefix, then the number
    mov eax, 1
    mov edi, 1
    lea rsi, [rel prefix]
    mov edx, 8
    syscall

    mov eax, 1
    mov edi, 1
    mov rsi, r8
    mov rdx, r9
    syscall

    ; 6. exit(0)
    mov eax, 60
    xor edi, edi
    syscall

section .note.GNU-stack noalloc noexec nowrite progbits
