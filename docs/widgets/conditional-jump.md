# Conditional jump — выбор данных и условный переход

Один самостоятельный виджет: `data-widget="conditional-jump"`.
Без data-jump-kind используется CMP. Вариант data-jump-kind="test" описан в docs/widgets/test.md.
Вариант data-jump-kind="ordered" (JL/JB с фиксированными операндами) — в docs/widgets/ordered-jump.md.
Вариант data-jump-kind="max" (IF/ELSE и максимум) — в docs/widgets/max.md.
Начните с `templates/slides/conditional-jump.html`.
Пример: слайд 04 лекции asm/02-control.

Обязательные области: одна input[data-eax], одна input[data-ebx], select[data-jump-operation] с je/jne и область data-jump-diagram. Числа — целые 0…99; выбор задаёт начальное состояние EAX/EBX. При изменении данных показ сбрасывается. Некорректный ввод останавливает шаги и показывает пояснение; Сброс восстанавливает последнее корректное значение.

Размеченный SVG вставляется через img[data-byte-hints]. Он представляет фиксированный фрагмент: cmp eax, ebx; je/jne yes; mov ecx, 0; jmp done; yes: mov ecx, 1; done: продолжение. Адреса и смещения фиксированы. В SVG нужны шесть data-jump-row (0…5), readout-элементы data-jump-rip/eax/ebx/zf/ecx, data-jump-pointer, три линии data-branch-path/data-fallthrough-path/data-done-path, data-jump-instruction и data-jump-opcode. Маркеры стрелок размечаются data-jump-marker="green"/"muted". Нижняя подпись — data-jump-rule.

JE меняется на JNE вместе с байтом 74/75 и его описанием. Byte-hints сохраняет HEX/BIN и закрывается на событие byte-hints-reset при каждом шаге. Компонент не обращается к другим слайдам и возвращает стандартные step/back/reset. Пробел — следующая инструкция, Shift+пробел — назад, R — начало с текущими числами. На конце остановка; при листании состояние сохраняется. При фокусе в полях клавиши остаются вводом.

Скрипт и CSS подключаются сборщиком только нужной лекции. File:// работает без fetch и зависимостей. Это модель данного фрагмента, не универсальный эмулятор. ECX=1 означает, что условный переход был выполнен; ECX=0 — что он был пропущен, включая режим JNE.
