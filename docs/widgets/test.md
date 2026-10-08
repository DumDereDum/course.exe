# TEST — ноль и младший бит

Вариант ограниченного conditional-jump: `data-widget="conditional-jump" data-jump-kind="test"`.
Начните с `templates/slides/test.html`; пример — asm/02-control, слайд 05.

Поля: input[data-eax] (целое 0…255), select[data-test-mode] (zero/bit) и одна область data-jump-diagram с img[data-byte-hints]. EBX и select[data-jump-operation] здесь не нужны. Смена выбора возвращает к началу; step/back/reset и сохранение состояния работают как в conditional-jump.

Сцена показывает TEST; JZ zero/even; MOV ECX,0; JMP done; zero/even: MOV ECX,1; done. Zero использует 85 C0, bit — A9 01 00 00 00. Поэтому режим меняет длину первой инструкции и все следующие адреса. Смещения JZ/JMP остаются 07/05, но их пояснения обновляются. JZ — другое имя JE, код 74.

SVG основан на контракте conditional-jump. Дополнительно нужны: data-jump-address в каждой строке; data-test-instruction, data-test-target-label; пять слотов data-test-byte (лишние скрываются через display=none); data-test-jz-offset/data-test-jmp-offset; восемь text-элементов каждого data-test-input-bit/mask-bit/result-bit; data-test-mask-label, data-test-lsb, data-test-cf/of. Readout EBX не нужен. Остальные readout и пути сохраняются.

Побитовая схема показывает младшие 8 из 32 бит EAX; верхние 24 в выбранном диапазоне нулевые. Результат AND до TEST неизвестен, после TEST известен, но не записывается в EAX. CF/OF после TEST равны 0. ECX=1 означает, что проверка выполнена: EAX=0 в режиме zero, чётное число в режиме bit. Ноль считается чётным.

Просмотр через file:// без fetch и зависимостей. Это два конкретных учебных фрагмента, не универсальный эмулятор.
