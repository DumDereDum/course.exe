# Сумма 1…N

Вариант `data-widget="while-loop" data-loop-kind="sum"`, шаблон sum-loop.html.
Одна input[data-ebx] задаёт N=0…5, начальное 4. Обязательны data-loop-diagram
и img[data-byte-hints]. ECX заранее равен 0, MOV устанавливает EAX=1.

Контракт FOR сохраняется (семь строк с шагом 40), добавляется data-jump-zf
и группа data-order-flag=zf. Readout: RIP/EAX/EBX/ECX/SF/OF/ZF. Проверка JG
при ZF=0 и SF=OF. Адреса: 401000,005,007,009,00B,00D,00F. Байты:
B801000000 39D8 7F06 01C1 FFC0 EBF6. Накопитель увеличивается на текущий EAX.

C-строки и истории соответствуют for-loop.md. После ADD обновляется история
ECX, после INC — EAX и число завершённых итераций. MOV сохраняет неизвестные
флаги, CMP/ADD/INC обновляют ZF/SF/OF, переходы сохраняют их.
На равенстве JG пропускается: N включается в сумму. При N=0 тело пропущено.
Итог ECX=N(N+1)/2, EAX=N+1. Ограниченная модель, стандартные step/back/reset,
file:// без зависимостей, byte-hints-reset на шаге. Проверки: test_sum_loop.cjs.
