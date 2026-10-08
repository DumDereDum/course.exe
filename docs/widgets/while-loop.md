# While loop — проверка, тело и возврат

Шаблон: `templates/slides/while-loop.html`; пример: asm/02-control, слайд 10.
Вариант data-loop-kind="for" описан в docs/widgets/for-loop.md.
Вариант data-loop-kind="sum" описан в docs/widgets/sum-loop.md.
Без data-loop-kind используется WHILE.
Виджет `data-widget="while-loop"`, отдельная ограниченная модель фиксированного
фрагмента CMP EAX,EBX; JGE done; INC EAX; JMP check; done.
Не выполняет произвольные инструкции. Диапазон начальных EAX/EBX — целые 0…5.

Обязательны ровно одна input[data-eax], input[data-ebx], data-loop-diagram и
img[data-byte-hints]. Размеченный SVG использует пять data-jump-row=0…4,
readout data-jump-rip/eax/ebx/sf/of, data-jump-pointer и три маршрута
data-branch-path (выход), data-fallthrough-path (тело), data-done-path (возврат).
Маркеры стрелок: data-jump-marker=green/muted. Геометрия соответствует
while-step-0.svg; внешняя SVG-группа может быть сдвинута transform.

Дополнительно: data-loop-iterations, data-loop-history, data-loop-flag-source;
data-order-flag=sf/of; data-loop-cline=condition/body/exit. История и число
итераций — пояснения, не регистры. CMP/INC меняют показанные SF/OF;
JGE/JMP сохраняют их. Только перед JGE флаги выделяются как проверяемые.

Изменение поля возвращает к началу. Неверный ввод блокирует шаги;
Reset восстанавливает последний корректный выбор. Начальные флаги неизвестны.
Step/back/reset, остановка на done, состояние сохраняется при листании.
При 0/3: 15 состояний (14 инструкций); при EAX≥EBX: 3 состояния, ноль итераций.
Byte-hints закрываются на каждом render. File:// без fetch и зависимостей.

Сборщик подключает CSS/JS только лекциям с while-loop. Структура проверяется
tools/content.py, переходы и флаги — tests/test_while_loop.cjs.
