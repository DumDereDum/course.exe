/* A compact Linux x86-64 syscall catalog for the introductory lecture. */
window.LectureWidgets = window.LectureWidgets || {};
window.LectureWidgets['syscall-explorer'] = host => {
  const groups = [
    ['Файлы и ввод-вывод', [
      ['read',0,'read(fd, buf, count)',['RDI = fd','RSI = адрес буфера','RDX = максимум байтов'],'байты; 0 — EOF; < 0 — ошибка','Читает данные из дескриптора в память.'],
      ['write',1,'write(fd, buf, count)',['RDI = fd','RSI = адрес данных','RDX = число байтов'],'записанные байты; < 0 — ошибка','Передаёт байты из памяти в файл или терминал.'],
      ['close',3,'close(fd)',['RDI = fd'],'0; < 0 — ошибка','Освобождает файловый дескриптор процесса.'],
      ['lseek',8,'lseek(fd, offset, whence)',['RDI = fd','RSI = смещение','RDX = начало отсчёта'],'новая позиция; < 0 — ошибка','Перемещает текущую позицию в файле.'],
      ['openat',257,'openat(dirfd, path, flags, mode)',['RDI = каталог','RSI = адрес пути','RDX = флаги','R10 = права'],'новый fd; < 0 — ошибка','Открывает файл относительно выбранного каталога.']
    ]],
    ['Память', [
      ['mmap',9,'mmap(addr, len, prot, flags, fd, off)',['RDI = адрес','RSI = размер','RDX = защита','R10/R8/R9 = остальное'],'адрес области; < 0 — ошибка','Создаёт отображение страниц памяти.'],
      ['mprotect',10,'mprotect(addr, len, prot)',['RDI = адрес','RSI = размер','RDX = защита'],'0; < 0 — ошибка','Меняет права чтения, записи и исполнения страниц.'],
      ['munmap',11,'munmap(addr, len)',['RDI = адрес','RSI = размер'],'0; < 0 — ошибка','Удаляет отображение памяти.'],
      ['brk',12,'brk(addr)',['RDI = новая граница'],'текущая граница данных','Меняет границу области данных процесса.'],
      ['madvise',28,'madvise(addr, len, advice)',['RDI = адрес','RSI = размер','RDX = подсказка'],'0; < 0 — ошибка','Сообщает ядру ожидаемый способ работы с памятью.']
    ]],
    ['Процессы', [
      ['getpid',39,'getpid()',[],'PID процесса','Возвращает идентификатор текущего процесса.'],
      ['fork',57,'fork()',[],'0 у ребёнка; PID у родителя','Создаёт новый процесс как копию текущего.'],
      ['execve',59,'execve(path, argv, envp)',['RDI = путь','RSI = аргументы','RDX = окружение'],'при успехе не возвращается','Заменяет текущую программу другой.'],
      ['exit',60,'exit(status)',['RDI = статус'],'не возвращается','Завершает текущий поток выполнения.'],
      ['wait4',61,'wait4(pid, status, options, usage)',['RDI = PID','RSI = адрес статуса','RDX = опции','R10 = статистика'],'PID завершившегося процесса','Ждёт изменения состояния дочернего процесса.']
    ]],
    ['Сеть', [
      ['socket',41,'socket(domain, type, protocol)',['RDI = семейство','RSI = тип','RDX = протокол'],'новый fd; < 0 — ошибка','Создаёт сетевой сокет.'],
      ['connect',42,'connect(fd, addr, len)',['RDI = сокет','RSI = адрес','RDX = размер адреса'],'0; < 0 — ошибка','Подключает сокет к удалённому адресу.'],
      ['accept',43,'accept(fd, addr, len)',['RDI = сокет','RSI = адрес клиента','RDX = адрес размера'],'новый fd; < 0 — ошибка','Принимает входящее соединение.'],
      ['sendto',44,'sendto(fd, buf, len, flags, addr, alen)',['RDI = сокет','RSI = данные','RDX = размер','R10/R8/R9 = остальное'],'отправленные байты','Отправляет данные через сокет.'],
      ['recvfrom',45,'recvfrom(fd, buf, len, flags, addr, alen)',['RDI = сокет','RSI = буфер','RDX = размер','R10/R8/R9 = остальное'],'полученные байты; 0 — EOF','Получает данные из сокета.']
    ]]
  ];
  const catalog = groups.flatMap(group => group[1]);
  const root = host.querySelector('[data-syscall-explorer]');
  root.className = 'syscall-explorer-layout';
  const list = document.createElement('div'); list.className = 'syscall-groups';
  const detail = document.createElement('div'); detail.className = 'panel syscall-detail';
  root.append(list, detail);
  let selected = catalog.findIndex(item => item[0] === 'write');
  const history = [];
  groups.forEach(([label, calls]) => {
    const section = document.createElement('div'); section.className = 'syscall-group';
    const heading = document.createElement('div'); heading.className = 'panel-label'; heading.textContent = label;
    const buttons = document.createElement('div'); buttons.className = 'syscall-buttons';
    calls.forEach(call => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn';
      button.dataset.syscall = call[0]; button.innerHTML = '<span>' + call[0] + '</span><small>' + call[1] + '</small>';
      button.addEventListener('click', () => choose(catalog.indexOf(call)));
      buttons.append(button);
    });
    section.append(heading, buttons); list.append(section);
  });
  const controls = document.createElement('div'); controls.className = 'widget-controls';
  controls.innerHTML = '<button type="button" class="btn" data-back>← Назад</button><button type="button" class="btn primary" data-step>Следующий →</button><button type="button" class="btn" data-reset>Сброс</button><span class="widget-count"></span>';
  host.append(controls);
  function choose(index, save = true) {
    if (index < 0 || index >= catalog.length || index === selected) return;
    if (save) history.push(selected);
    selected = index; render();
  }
  function render() {
    const [name, number, signature, args, result, description] = catalog[selected];
    list.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.syscall === name)));
    detail.replaceChildren();
    const top = document.createElement('div'); top.className = 'syscall-detail-heading';
    const title = document.createElement('strong'); title.textContent = name;
    const numberLabel = document.createElement('code'); numberLabel.textContent = 'RAX = ' + number;
    top.append(title, numberLabel);
    const purpose = document.createElement('p'); purpose.textContent = description;
    const call = document.createElement('code'); call.className = 'syscall-signature'; call.textContent = signature;
    const argumentList = document.createElement('div'); argumentList.className = 'syscall-arguments';
    if (args.length) args.forEach(text => { const row = document.createElement('span'); row.textContent = text; argumentList.append(row); });
    else { const row = document.createElement('span'); row.textContent = 'аргументов нет'; argumentList.append(row); }
    const resultLabel = document.createElement('div'); resultLabel.className = 'syscall-result';
    resultLabel.innerHTML = '<span>RAX после возврата</span><strong></strong>';
    resultLabel.querySelector('strong').textContent = result;
    detail.append(top, purpose, call, argumentList, resultLabel);
    controls.querySelector('[data-back]').disabled = history.length === 0;
    controls.querySelector('[data-step]').disabled = selected === catalog.length - 1;
    controls.querySelector('.widget-count').textContent = `${selected + 1} / ${catalog.length}`;
  }
  const initial = selected;
  const api = {
    step() { choose(Math.min(selected + 1, catalog.length - 1)); },
    back() { if (history.length) { selected = history.pop(); render(); } },
    reset() { selected = initial; history.length = 0; render(); }
  };
  controls.querySelector('[data-back]').addEventListener('click', api.back);
  controls.querySelector('[data-step]').addEventListener('click', api.step);
  controls.querySelector('[data-reset]').addEventListener('click', api.reset);
  render(); return api;
};
