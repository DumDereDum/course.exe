# FOR — инициализация и отдельное тело

Вариант `data-widget="while-loop" data-loop-kind="for"`.
Шаблон: templates/slides/for-loop.html; пример: asm/02-control, слайд 11.
Одна input[data-ebx] задаёт границу 0…5. Поля EAX нет: первая MOV установит 0.
ECX заранее подготовлен со значением 0; до MOV EAX неизвестен.

Обязательные области: data-ebx, data-loop-diagram, img[data-byte-hints].
Сцена for-step-0.svg содержит семь data-jump-row=0…6 с шагом 40:
MOV EAX,0; check: CMP EAX,EBX; JGE done; ADD ECX,2; INC EAX; JMP check; done.
Адреса: 401000,005,007,009,00C,00E,010. Байты:
B800000000 39D8 7D07 83C102 FFC0 EBF5. Возврат пропускает инициализацию.

Readout и маршруты соответствуют while-loop.md, дополнительно data-jump-ecx
и data-loop-value-history. C-строки data-loop-cline=init/condition/body/update/exit.
Число завершённых итераций увеличивается после INC; история ECX — после ADD.
SF/OF меняются после CMP, ADD и INC, сохраняются после переходов и MOV.
Выделяются только перед JGE (pc=2). При границе N результат ECX=2N, EAX=N.

Step/back/reset, сохранение состояния при листании, блокировка неверного ввода,
byte-hints-reset при каждом render, file:// без fetch. При N=3: 19 состояний;
при N=0: 4 состояния, инициализация выполнена, тело пропущено.
Модель фиксирована для этого фрагмента; общий эмулятор не добавляется.
