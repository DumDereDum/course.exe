/* Prepared before/after states for teaching one instruction family at a time. */
window.LectureWidgets = window.LectureWidgets || {};
window.LectureWidgets['command-lab'] = host => {
  const examples = [...host.querySelectorAll('[data-command]')];
  const statePanel = host.querySelector('[data-command-state]');
  const registerNames = (host.dataset.regs || 'rax,rbx,rcx,rdx').split(',').map(s => s.trim());
  const flagHints = {
    ZF: 'Zero Flag — 1, если результат равен нулю',
    CF: 'Carry Flag — 1, если возник перенос или заём',
    SF: 'Sign Flag — копия старшего бита результата',
    OF: 'Overflow Flag — 1, если знаковый результат не поместился'
  };
  let selected = 0, executed = false;
  const history = [];
  const read = (element, name) => JSON.parse(element.dataset[name] || '{}');
  const value = text => BigInt.asUintN(64, BigInt(text));
  const hex = number => '0x' + BigInt.asUintN(64, number).toString(16).toUpperCase().padStart(16, '0');
  const decimal = number => BigInt.asUintN(64, number).toString(10);
  const snapshot = () => ({selected, executed});
  function remember() { history.push(snapshot()); }
  function select(index, save = true) {
    if (index < 0 || index >= examples.length || index === selected && !executed) return;
    if (save) remember();
    selected = index; executed = false; render();
  }
  function execute(save = true) {
    if (executed) return;
    if (save) remember();
    executed = true; render();
  }
  examples.forEach((example, index) => {
    example.type = 'button';
    example.addEventListener('click', () => select(index));
  });
  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = '<button type="button" class="btn" data-back>← Назад</button><button type="button" class="btn primary" data-run>Выполнить</button><button type="button" class="btn" data-reset>Сброс</button><span class="widget-count"></span>';
  host.append(controls);
  function render() {
    const example = examples[selected];
    const beforeRaw = read(example, 'before');
    const afterRaw = read(example, 'after');
    const before = Object.fromEntries(registerNames.map(name => [name, value(beforeRaw[name] || '0')]));
    const after = {...before};
    Object.entries(afterRaw).forEach(([name, text]) => { after[name] = value(text); });
    const shown = executed ? after : before;
    examples.forEach((item, index) => item.setAttribute('aria-pressed', String(index === selected)));
    statePanel.replaceChildren();
    const top = document.createElement('div'); top.className = 'command-lab-heading';
    const command = document.createElement('code'); command.textContent = example.dataset.command;
    const phase = document.createElement('span'); phase.textContent = executed ? 'после' : 'до';
    top.append(command, phase); statePanel.append(top);
    const rows = document.createElement('div'); rows.className = 'command-lab-registers';
    registerNames.forEach(name => {
      const row = document.createElement('div'); row.className = 'command-lab-reg';
      const label = document.createElement('span'); label.textContent = name.toUpperCase();
      const numbers = document.createElement('div');
      const main = document.createElement('strong'); main.textContent = hex(shown[name]);
      const dec = document.createElement('small'); dec.textContent = decimal(shown[name]);
      numbers.append(main, dec); row.append(label, numbers);
      row.classList.toggle('changed', executed && before[name] !== after[name]); rows.append(row);
    });
    statePanel.append(rows);
    const flags = document.createElement('div'); flags.className = 'command-lab-flags';
    const flagsAfter = read(example, 'flagsAfter');
    if (!Object.keys(flagsAfter).length) flags.textContent = 'RFLAGS · без изменений';
    else {
      const title = document.createElement('span'); title.textContent = 'RFLAGS'; flags.append(title);
      ['ZF', 'CF', 'SF', 'OF'].forEach(name => {
        const answer = executed ? flagsAfter[name] ?? '?' : '?';
        const stateHint = answer === '1' ? 'Флаг установлен.' : answer === '0' ? 'Флаг не установлен.' : 'Значение пока неизвестно или не определено.';
        const item = document.createElement('b'); item.textContent = name + '=' + answer;
        item.tabIndex = 0; item.dataset.tooltip = flagHints[name] + '. ' + stateHint;
        item.setAttribute('aria-label', item.textContent + '. ' + item.dataset.tooltip);
        item.classList.toggle('active', executed && flagsAfter[name] !== undefined); flags.append(item);
      });
    }
    statePanel.append(flags);
    const bitNames = (example.dataset.bits || '').split(',').map(s => s.trim()).filter(Boolean);
    if (bitNames.length) {
      const bits = document.createElement('div'); bits.className = 'command-lab-bits';
      bitNames.forEach(name => {
        const line = document.createElement('div');
        const label = document.createElement('span'); label.textContent = name.toUpperCase();
        const binary = document.createElement('code');
        binary.textContent = Number(shown[name] & 0xffn).toString(2).padStart(8, '0').replace(/(.{4})/, '$1 ');
        line.append(label, binary); bits.append(line);
      });
      statePanel.append(bits);
    }
    const explanation = document.createElement('p'); explanation.className = 'command-lab-explanation';
    explanation.textContent = executed ? example.dataset.explain : example.dataset.prompt || 'Предскажите результат и выполните команду.';
    statePanel.append(explanation);
    controls.querySelector('[data-back]').disabled = history.length === 0;
    controls.querySelector('[data-run]').disabled = executed;
    controls.querySelector('[data-run]').textContent = executed ? 'Выполнено' : 'Выполнить';
    controls.querySelector('.widget-count').textContent = `${selected + 1} / ${examples.length}`;
  }
  const api = {
    step() { executed ? select(Math.min(selected + 1, examples.length - 1)) : execute(); },
    back() { if (history.length) { const previous = history.pop(); selected = previous.selected; executed = previous.executed; render(); } },
    reset() { selected = 0; executed = false; history.length = 0; render(); }
  };
  controls.querySelector('[data-back]').addEventListener('click', api.back);
  controls.querySelector('[data-run]').addEventListener('click', () => execute());
  controls.querySelector('[data-reset]').addEventListener('click', api.reset);
  render(); return api;
};
