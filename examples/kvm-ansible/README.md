# Лайвкод: одна Ubuntu-ВМ на KVM через Ansible

Этот пример продолжает слайды 09–11 лекции. Ansible работает **на самом KVM-хосте**,
создаёт ВМ `demo` из готового cloud image Ubuntu 24.04 и передаёт ей публичный
SSH-ключ через cloud-init. Затем мы узнаём адрес ВМ и вручную входим в неё по SSH.

Результат: `demo` с 2 vCPU, 2 ГиБ памяти, диском
`/var/lib/libvirt/images/demo.qcow2` и сетевым интерфейсом в сети libvirt `default`.
Команды ниже выполняются в терминале **Ubuntu x86-64 с KVM**, из этой папки.
Нужны `sudo`, systemd, интернет для первого скачивания образа и работающий
`/dev/kvm`. В WSL2 сначала нужно проверить вложенную виртуализацию по слайду 08;
этот сценарий рассчитан на работающую службу и сеть libvirt внутри Linux-среды.

## 1. Подготовить инструменты и ключ

```sh
ls -l /dev/kvm
sudo apt update
sudo apt install ansible openssh-client
ansible-galaxy collection install -r requirements.yml
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
ssh-keygen -t ed25519 -N '' -f "$HOME/.ssh/kvm-demo"
```

`/dev/kvm` подтверждает, что устройство KVM доступно ядру. Ansible запускает
playbook, а коллекция `community.libvirt` даёт модули для управления libvirt.
`ssh-keygen` создаёт отдельную пару ключей для этого примера: приватный ключ
остаётся в `~/.ssh/kvm-demo`, публичный ключ будет передан гостю. Если эти
файлы уже существуют, команду `ssh-keygen` повторять не нужно.

Первое скачивание cloud image может занять время. Перед живым показом полезно
один раз выполнить шаг 2, чтобы проверить интернет и локальную конфигурацию.

## 2. Создать ВМ

```sh
ansible-playbook -i inventory.ini create-vm.yml --ask-become-pass
```

Пароль нужен для `sudo` на KVM-хосте; Ansible следует запускать от обычного
пользователя, а не через `sudo ansible-playbook`. Внутри playbook последовательно:

1. Проверяется `/dev/kvm` и наличие публичного ключа.
2. Устанавливаются QEMU, libvirt и пакеты для модулей Ansible.
3. Запускается сеть libvirt `default`.
4. Скачивается образ Ubuntu; отдельная копия становится диском `demo.qcow2`.
5. Модуль `virt_install` создаёт ВМ с 2 vCPU и 2 ГиБ памяти. Cloud-init добавляет
   ключ для пользователя `ubuntu` при первом запуске.

Повторный запуск playbook сохраняет существующий диск и ВМ. Если на хосте уже
есть **другая** ВМ с именем `demo`, перед запуском выберите для примера другое имя
и путь к диску в `create-vm.yml`.

## 3. Увидеть запущенную ВМ и её IP

```sh
sudo virsh -c qemu:///system list --all
sudo virsh -c qemu:///system dumpxml demo | grep "<domain type='kvm'"
sudo virsh -c qemu:///system domifaddr demo --source lease
```

В первой команде у `demo` ожидается состояние `running`; вторая подтверждает тип
виртуализации `kvm`. Третья читает DHCP-аренду сети libvirt и показывает адрес
вида `192.168.122.x/24`. Для SSH нужен адрес
**без** `/24`. Если адрес пока не появился, подождите загрузки Ubuntu и повторите
третью команду. `qemu:///system` указывает на ту же системную сессию libvirt,
которую использует playbook.

## 4. Войти по SSH

Подставьте адрес из предыдущей команды вместо приведённого здесь примера:

```sh
ssh -i "$HOME/.ssh/kvm-demo" ubuntu@192.168.122.100
```

При первом подключении SSH спросит, доверять ли ключу сервера. После входа
можно выполнить `nproc`, `free -h` и `lsblk`: они покажут ресурсы **гостевой**
Ubuntu. Команда `exit` вернёт терминал на KVM-хост.

Сеть `default` даёт доступ к ВМ с KVM-хоста. Подключение к этому адресу с другого
компьютера здесь не настраивается.

## Если демонстрация остановилась

- Нет `/dev/kvm`: сначала проверьте виртуализацию CPU; для WSL2 требуется
  работающая вложенная виртуализация.
- Playbook не запускает `default`: посмотрите сети командой
  `sudo virsh -c qemu:///system net-list --all`.
- IP есть, но SSH пока не отвечает: Ubuntu и cloud-init могут ещё загружаться;
  повторите вход через некоторое время.
- `Permission denied (publickey)`: проверьте, что SSH использует приватный ключ
  `~/.ssh/kvm-demo`, а первый запуск ВМ получил соответствующий `.pub`-файл.

Файлы ВМ и ключи остаются после завершения демонстрации. Для штатной остановки
достаточно `sudo virsh -c qemu:///system shutdown demo`.

Основа примера: [Ubuntu: запуск cloud image через libvirt](https://ubuntu.com/docs/public-images/public-images-how-to/launch-with-libvirt/),
[Ansible: модуль `virt_install`](https://docs.ansible.com/projects/ansible/latest/collections/community/libvirt/virt_install_module.html),
[libvirt: `domifaddr`](https://www.libvirt.org/manpages/virsh.html#domifaddr).
