# Ordered jump — JL/JB при одинаковом CMP

Вариант `data-widget="conditional-jump" data-jump-kind="ordered"`.
Начните с `templates/slides/ordered-jump.html`; пример — asm/02-control, слайд 07.

Обязательны select[data-jump-operation] с jl/jb, data-jump-diagram и img[data-byte-hints]. Полей EAX/EBX нет: для этого примера фиксированы EAX=FFFFFFFF и EBX=00000001. Смена команды возвращает к началу; после CMP флаги обоих маршрутов одинаковы.

Сцена использует контракт conditional-jump: шесть строк CMP; JL/JB less; MOV ECX,0; JMP done; less: MOV ECX,1; done. Адреса не меняются, байт 7C/72 и его подпись меняются вместе с командой. Для readout нужны data-jump-rip/eax/ebx/ecx/zf/cf/sf/of. Значения EAX/EBX показаны восьмизначным HEX. Дополнительно четыре группы data-order-flag="sf"/"of"/"cf"/"zf" с rect.order-highlight выделяют проверяемые флаги.

Флаги рассчитаны из 32-битной разности FFFFFFFE: ZF=0, CF=0, SF=1, OF=0. JL проверяет SF≠OF и срабатывает; JB проверяет CF=1 и пропускается. MOV/JMP флаги не меняют. ECX=1/0 показывает, выполнено ли выбранное условие «меньше».

Стандартные step/back/reset, остановка в конце, сохранение состояния при листании, byte-hints с HEX/BIN и file:// без fetch. Это фиксированный учебный пример; общий симулятор и произвольные числа здесь не поддерживаются.
