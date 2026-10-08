# Maximum — IF/ELSE с двумя числами

Вариант `data-widget="conditional-jump" data-jump-kind="max"`.
Шаблон: `templates/slides/max.html`; пример: asm/02-control, слайд 09.

Обязательны input[data-eax], input[data-ebx], data-jump-diagram и img[data-byte-hints].
Принимаются знаковые целые −2147483648…2147483647. Изменение числа сбрасывает
показ; неверный ввод блокирует шаги. Reset восстанавливает последний корректный выбор.
Команда фиксирована: JL; селектора перехода нет.

Фрагмент: CMP EAX,EBX; JL use_b; MOV ECX,EAX; JMP done; use_b: MOV ECX,EBX;
done. Шесть строк data-jump-row=0…5 по адресам 401000,002,004,006,008,00A.
Тот же контракт указателя, маршрутов, opcode/instruction/rule и маркеров, что у
conditional-jump. Readout: rip/eax/ebx/ecx/sf/of; подсветка data-order-flag=sf/of.
Группа со сценой может иметь SVG transform: указатель использует локальные координаты.

C-строки data-max-cline=condition/first/else/second подсвечивают соответствующее
условие или ветку. Флаги вычисляются из 32-битного вычитания с переполнением;
JL проверяет SF≠OF. ECX получает исходное знаковое значение выбранного операнда.
EAX/EBX и флаги после CMP сохраняются. Байты: 39D8 7C04 89C1 EB02 89D9.

Стандартные step/back/reset, 4 или 5 состояний, остановка в конце, file:// без fetch,
подписи байтов закрываются на шаге. Это один фиксированный пример, не эмулятор.
