# Ассемблер: ручная сборка в Docker на Windows и macOS

Откройте репозиторий в VS Code. Рабочая папка студентов — `examples/asm`.
Исходники редактируются на компьютере, а NASM, компоновщик и программы
запускаются в Linux-контейнере. Каждый пример собирайте вручную.

| Файл | Задача | Начальные данные | Результат |
|---|---|---|---:|
| `max.asm` | Знаковый максимум | A=7, B=3 | 7 |
| `abs.asm` | Модуль числа | VALUE=−7 | 7 |
| `sum.asm` | Сумма 1…N | N=4 | 10 |
| `for.asm` | Три итерации, прибавлять 2 | N=3 | 6 |

## 1. Установить инструменты на компьютер

- Установите [VS Code](https://code.visualstudio.com/download).
- На Windows установите [Docker Desktop с WSL 2](https://docs.docker.com/desktop/setup/install/windows-install/)
  и используйте Linux-контейнеры. Если установщик просит включить WSL 2, следуйте
  его инструкции и перезагрузите компьютер.
- На macOS установите [Docker Desktop для своего процессора](https://docs.docker.com/desktop/setup/install/mac-install/).
- Запустите Docker Desktop и дождитесь готовности.
- Для подсветки в VS Code можно установить
  [x86 and x86_64 Assembly](https://marketplace.visualstudio.com/items?itemName=13xforever.language-x86-64-assembly).

NASM и binutils устанавливаются ниже в контейнере.

## 2. Открыть рабочую папку

В VS Code выберите **File → Open Folder**, откройте корень репозитория.
Затем **Terminal → New Terminal**. Пока это терминал вашего компьютера.

**Windows: выбрать профиль PowerShell.** Если открыт другой профиль, выберите
PowerShell через меню рядом с кнопкой нового терминала. Из корня репозитория:

```powershell
Set-Location .\examples\asm
Get-Location
Get-ChildItem
```

**macOS: терминал Zsh/Bash.** Из корня репозитория:

```sh
cd examples/asm
pwd
ls
```

Теперь текущая папка должна оканчиваться на `examples/asm`. В ней должны быть
`max.asm`, `abs.asm`, `sum.asm`, `for.asm` и `README.md`. Если вы уже в этой
папке, повторять переход не нужно. Файлы открывайте через дерево VS Code.

Если используете архив вместо репозитория, распакуйте `control` и откройте
терминал непосредственно в этой папке. Остальные шаги те же.

## 3. Запустить контейнер из папки с исходниками

Проверьте готовность Docker в терминале компьютера:

```sh
docker version
```

В выводе должны быть разделы Client и Server. Если появляется
`Cannot connect to the Docker daemon`, запустите Docker Desktop и дождитесь готовности.

**На Windows PowerShell и macOS команда одна и та же.** Выполняйте её
именно из папки с четырьмя `.asm`-файлами, одной строкой:

```sh
docker run --name asm-examples --platform linux/amd64 -it --mount "type=bind,source=${PWD},target=/work" -w /work debian:bookworm-slim bash
```

`${PWD}` — уже `examples/asm`; добавлять к нему `/examples/asm` не нужно.
`--mount` подключает текущую папку к `/work`, `-w /work` выбирает рабочую
папку контейнера. Для bind mount `--mount` сообщает об ошибке, если указанный
исходный путь не существует, вместо создания новой пустой папки.
`--platform linux/amd64` выбирает Linux x86-64, включая Mac с Apple Silicon.
Для первой загрузки образа нужен интернет.

После запуска приглашение будет примерно `root@...:/work#`.
**Этот терминал теперь внутри Linux**, даже если компьютер работает на Windows.
Проверьте:

```sh
pwd
ls
```

Ожидаем `/work` и четыре исходника. Изменения файлов в VS Code сразу видны
в контейнере. Результаты сборки попадут в `examples/asm/build` на компьютере.

## 4. Один раз установить NASM и компоновщик

Команды ниже выполняйте **в терминале Linux-контейнера**, а не в PowerShell:

```sh
apt-get update
apt-get install -y nasm binutils
nasm -v
ld --version
```

## 5. Собрать, скомпоновать и запустить каждый пример

Все дальнейшие команды одинаковы для Windows и macOS, потому что выполняются
внутри Linux. Перед сборкой сохраните исходник в VS Code: Ctrl+S на Windows,
Cmd+S на macOS. Один раз создайте папку результатов:

```sh
mkdir -p build
```

### Максимум: max.asm

Выполняйте команды последовательно:

```sh
nasm -f elf64 max.asm -o build/max.o
ld -o build/max build/max.o
./build/max
echo "$?"
```

Ожидаем **7**.

### Модуль: abs.asm

```sh
nasm -f elf64 abs.asm -o build/abs.o
ld -o build/abs build/abs.o
./build/abs
echo "$?"
```

Ожидаем **7**.

### Сумма: sum.asm

```sh
nasm -f elf64 sum.asm -o build/sum.o
ld -o build/sum build/sum.o
./build/sum
echo "$?"
```

Ожидаем **10**.

### Цикл: for.asm

```sh
nasm -f elf64 for.asm -o build/for.o
ld -o build/for build/for.o
./build/for
echo "$?"
```

Ожидаем **6**.

`nasm` создаёт объектный ELF `.o`, `ld` — исполняемый ELF, `./build/имя`
запускает программу. Если NASM сообщил ошибку, исправьте исходник и повторите
сборку перед вызовом ld. После изменения кода повторяйте **обе** команды —
NASM и ld — и только затем запуск.

Программы передают результат в EDI, записывают EAX=60 и завершаются через
sys_exit. Они не печатают число в stdout; результат показывает `echo "$?"`.
Выполняйте echo сразу после программы: следующая команда изменит код последней
завершённой команды. Здесь ненулевой код — способ показать число.
Код завершения хранит младшие 8 бит: для этой демонстрации выбирайте результаты
0…255. Например, сумма 1…23 равна 276, её код завершения будет 20.

## 6. Проверить другие значения

Параметры можно менять в исходнике или задавать NASM через `-D`.
Каждый раз вручную повторяйте компоновку, запуск и проверку.

```sh
nasm -f elf64 -DN=0 sum.asm -o build/sum.o
ld -o build/sum build/sum.o
./build/sum
echo "$?"
```

Ожидаем 0. Для `-DN=1` — 1, для `-DN=5` — 15. Для суммы используйте N=0…22,
чтобы результат полностью помещался в код завершения.

```sh
nasm -f elf64 -DA=-1 -DB=1 max.asm -o build/max.o
ld -o build/max build/max.o
./build/max
echo "$?"
```

Ожидаем 1. Равенство A=7, B=7 даёт 7. Для abs попробуйте `-DVALUE=0` (0)
и `-DVALUE=7` (7), используя |VALUE|≤255. Для for проверьте N=0 (0), N=1 (2),
N=5 (10); используйте N=0…127.

## 7. Дизассемблировать программу

Внутри Linux:

```sh
objdump -d -M intel build/sum
```

`-d` разбирает кодовые секции ELF, `-M intel` выбирает Intel-синтаксис.
В строке слева адрес в памяти, затем байты, справа инструкция. Найдите
CMP, JG, ADD, INC, обратный JMP и syscall, сопоставьте их с исходником.
Дизассемблер может выбрать синоним, например JNL вместо JGE.

```sh
objdump -d -M intel build/sum.o
```

В объектном файле адреса относятся к секции, ещё не размещённой компоновщиком.
Символы `_start`, `check`, `done` помогают найти код; комментарии не восстанавливаются.

## 8. Прочитать ELF и байты

```sh
readelf -h build/sum
readelf -S build/sum
readelf -l build/sum
```

В заголовке найдите ELF64, архитектуру x86-64 и Entry point address.
В секциях найдите `.text`, Addr, Off и Size. Addr — адрес в памяти,
Off — файловое смещение. Сегменты из `readelf -l` описывают размещение загрузчиком.

```sh
od -Ax -tx1 -N64 build/sum
objdump -s -j .text build/sum
```

`od` показывает байты с файловыми смещениями. Первые четыре байта `7f 45 4c 46`
— сигнатура ELF; следующий `02` — ELF64, следующий `01` — little-endian.
Это заголовок, а не первая инструкция. `objdump -s -j .text` показывает кодовую
секцию с её адресами в памяти.

```sh
objcopy -O binary -j .text build/sum build/sum.text.bin
od -Ax -tx1 -v build/sum.text.bin
ndisasm -b64 build/sum.text.bin
```

NDISASM разбирает извлечённую `.text`, начиная со смещения 0. Для тех же
адресов, что в objdump, укажите -o с Addr секции из readelf. Например,
**если** Addr равен 0x401000:

```sh
ndisasm -b64 -o0x401000 build/sum.text.bin
```

## 9. Завершить работу и войти снова

Внутри Linux:

```sh
exit
```

В следующий раз запустите Docker Desktop, откройте репозиторий в VS Code
и в терминале компьютера выполните:

```sh
docker start -ai asm-examples
```

Инструменты и подключение папки сохраняются. Повторять docker run для этого
же контейнера не нужно. Переход в другую папку компьютера не меняет уже
сохранённое подключение контейнера.

Если контейнер ранее создан с неправильным путём и `/work` пуст:
выйдите через `exit`, затем в PowerShell/терминале macOS удалите остановленный
контейнер и создайте его заново по шагам 2–4:

```sh
docker rm asm-examples
```

Исходники находятся в подключённой папке компьютера. Инструменты в новом
контейнере потребуется установить заново.

## Проверка материала

Исходники проверены локальной сборкой NASM в ELF64 и дизассемблированием,
контрольные значения — по собранным байтам в ограниченной модели инструкций.
Это не заменяет реальное исполнение Linux. Запуск из Windows PowerShell
на машине подготовки не проверен; перед занятием проверьте четыре примера
в своей среде Docker.

Документация: [Windows и WSL 2](https://docs.docker.com/desktop/setup/install/windows-install/),
[bind mount](https://docs.docker.com/engine/storage/bind-mounts/),
[objdump](https://sourceware.org/binutils/docs/binutils/objdump.html),
[readelf](https://sourceware.org/binutils/docs/binutils/readelf.html),
[objcopy](https://sourceware.org/binutils/docs/binutils/objcopy.html).
