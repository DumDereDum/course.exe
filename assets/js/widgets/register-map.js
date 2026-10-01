/* Register aliases and prepared writes; values stay local to this widget. */
window.LectureWidgets = window.LectureWidgets || {};
window.LectureWidgets['register-map'] = host => {
  const groups = [
    ['Основные', ['RAX', 'RBX', 'RCX', 'RDX']],
    ['Индексы и указатели', ['RSI', 'RDI', 'RBP', 'RSP']],
    ['Дополнительные', ['R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15']],
    ['Состояние выполнения', ['RIP', 'RFLAGS']]
  ];
  const roles = {
    RAX: 'Исторически — аккумулятор. Часто используется для результата функции.',
    RBX: 'Исторически — базовый регистр для адресации.',
    RCX: 'Исторически — счётчик; некоторые инструкции используют его неявно.',
    RDX: 'Регистр данных; участвует в умножении и делении.',
    RSI: 'Исторически — индекс источника, в том числе для строковых инструкций.',
    RDI: 'Исторически — индекс назначения, в том числе для строковых инструкций.',
    RBP: 'Может служить указателем базы стекового кадра.',
    RSP: 'Указатель вершины стека.',
    RIP: 'Указатель инструкции. При обычном исполнении указывает на следующую инструкцию.',
    RFLAGS: 'Флаги результата вычислений и управления процессором.'
  };
  const flagInfo = {
    CF: [0, 'CF · перенос или заём при беззнаковой арифметике'],
    ZF: [6, 'ZF · результат равен нулю'],
    SF: [7, 'SF · старший бит результата'],
    DF: [10, 'DF · направление строковых операций'],
    OF: [11, 'OF · переполнение при знаковой арифметике']
  };
  function parts(reg) {
    if (reg === 'RIP' || reg === 'RFLAGS') return [];
    const result = [[reg, 64, 0]];
    if (/^R\d+$/.test(reg)) return result.concat([[reg + 'D', 32, 0], [reg + 'W', 16, 0], [reg + 'B', 8, 0]]);
    const stem = reg.slice(1);
    result.push(['E' + stem, 32, 0], [stem, 16, 0]);
    if (['AX', 'BX', 'CX', 'DX'].includes(stem)) result.push([stem[0] + 'H', 8, 8], [stem[0] + 'L', 8, 0]);
    else result.push([stem + 'L', 8, 0]);
    return result;
  }
  const names = groups.flatMap(group => group[1]);
  const initial = BigInt(host.dataset.initial || '0x1122334455667788');
  function fresh() {
    return {reg: 'RAX', part: 'RAX', flag: 'ZF', phase: 0, before: null, written: null,
      values: Object.fromEntries(names.map(name => [name, name === 'RIP' ? 0x401000n : name === 'RFLAGS' ? 0x202n : initial]))};
  }
  let state = fresh();
  const history = [];
  const root = host.querySelector('[data-register-map]');
  root.className = 'register-map-layout';
  root.innerHTML = '<div class="register-map-nav" aria-label="Выбор регистра"></div><div class="panel register-map-detail"><div class="register-map-heading"><strong data-name></strong><span>64 бита</span></div><p class="register-map-role" data-role></p><div class="register-map-bytes" data-bytes aria-label="Значение регистра от старших битов к младшим"></div><div class="register-map-parts" data-parts aria-label="Выбор части регистра"></div><p class="register-map-description" data-description></p><div class="register-map-write" data-write><code data-instruction></code><button type="button" class="btn primary" data-run>Выполнить</button></div><p class="register-map-result" data-result aria-live="polite"></p></div>';
  const find = selector => root.querySelector(selector);
  const nav = find('.register-map-nav');
  groups.forEach(([label, regs]) => {
    const group = document.createElement('div');
    const heading = document.createElement('div');
    heading.className = 'panel-label'; heading.textContent = label;
    const buttons = document.createElement('div'); buttons.className = 'register-map-buttons';
    regs.forEach(reg => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn'; button.textContent = reg; button.dataset.reg = reg;
      button.addEventListener('click', () => {
        if (state.reg === reg) return;
        remember(); state.reg = reg; state.part = reg; state.phase = 0; state.before = null; state.written = null; render();
      });
      buttons.append(button);
    });
    group.append(heading, buttons); nav.append(group);
  });
  const controls = document.createElement('div'); controls.className = 'widget-controls';
  controls.innerHTML = '<button type="button" class="btn" data-back>← Назад</button><button type="button" class="btn" data-step>Следующая запись →</button><button type="button" class="btn" data-reset>Сброс</button>';
  host.append(controls);
  const hex = value => value.toString(16).toUpperCase().padStart(16, '0');
  const valueFor = width => ({8: 0xAAn, 16: 0xBBBBn, 32: 0xCCCCDDDDn, 64: 0xFFEEDDCCBBAA0099n})[width];
  const currentPart = () => parts(state.reg).find(part => part[0] === state.part);
  const demoParts = () => [8, 16, 32, 64].map(width => parts(state.reg).find(part => part[1] === width && part[2] === 0));
  function remember() { history.push({...state, values: {...state.values}}); }
  function write(part) {
    if (!part) return;
    remember();
    const [name, width, offset] = part;
    const old = state.values[state.reg];
    const mask = ((1n << BigInt(width)) - 1n) << BigInt(offset);
    const value = valueFor(width);
    state.values[state.reg] = width === 32 ? value : BigInt.asUintN(64, (old & ~mask) | (value << BigInt(offset)));
    state.part = name; state.before = old; state.written = part;
    state.phase = Math.max(0, demoParts().findIndex(item => item[0] === name) + 1);
    render();
  }
  function render() {
    const focused = document.activeElement;
    const focusPart = host.contains(focused) ? focused.dataset.part : null;
    const focusFlag = host.contains(focused) ? focused.dataset.flag : null;
    find('[data-name]').textContent = state.reg;
    find('[data-role]').textContent = roles[state.reg] || 'Дополнительный регистр общего назначения.';
    nav.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.reg === state.reg)));
    const part = currentPart();
    const bytes = hex(state.values[state.reg]).match(/../g);
    const oldBytes = state.before === null ? null : hex(state.before).match(/../g);
    const row = find('[data-bytes]'); row.replaceChildren();
    bytes.forEach((byte, index) => {
      const low = (7 - index) * 8;
      const cell = document.createElement('div'); cell.className = 'register-map-byte';
      const selected = part ? low >= part[2] && low < part[2] + part[1] : state.reg === 'RIP' || Math.floor(flagInfo[state.flag][0] / 8) === 7 - index;
      cell.classList.toggle('selected', selected);
      cell.classList.toggle('changed', Boolean(oldBytes && oldBytes[index] !== byte));
      cell.classList.toggle('cleared', Boolean(state.written && state.written[1] === 32 && index < 4));
      const label = document.createElement('span'); label.textContent = (low + 7) + '–' + low;
      const number = document.createElement('strong'); number.textContent = byte;
      cell.append(label, number); row.append(cell);
    });
    const aliases = find('[data-parts]'); aliases.replaceChildren();
    if (state.reg === 'RFLAGS') {
      Object.keys(flagInfo).forEach(flag => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn';
        button.textContent = flag; button.dataset.flag = flag; button.setAttribute('aria-pressed', String(state.flag === flag));
        button.addEventListener('click', () => { if (state.flag !== flag) { remember(); state.flag = flag; render(); } });
        aliases.append(button);
      });
    } else parts(state.reg).forEach(item => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn';
      button.textContent = item[0]; button.dataset.part = item[0]; button.setAttribute('aria-pressed', String(state.part === item[0]));
      button.addEventListener('click', () => { if (state.part !== item[0]) { remember(); state.part = item[0]; render(); } });
      aliases.append(button);
    });
    find('[data-description]').textContent = part ? part[0] + ' · ' + part[1] + ' бит · биты ' + (part[2] + part[1] - 1) + '–' + part[2]
      : state.reg === 'RFLAGS' ? flagInfo[state.flag][1] : 'RIP меняется при исполнении инструкций и переходах.';
    find('[data-write]').hidden = !part;
    find('[data-instruction]').textContent = part ? 'mov ' + part[0].toLowerCase() + ', 0x' + valueFor(part[1]).toString(16).toUpperCase() : '';
    find('[data-result]').textContent = state.written ? state.written[1] === 32 ? 'Верхние 32 бита обнулены; нижние 32 получили новое значение.'
      : state.written[1] === 64 ? 'Записано новое значение всего регистра.' : 'Изменена только выбранная часть; остальные биты сохранены.'
      : state.reg === 'RIP' || state.reg === 'RFLAGS' ? 'Эти регистры не изменяют обычной инструкцией mov.' : 'Учебное значение. Выберите часть регистра и выполните запись.';
    controls.querySelector('[data-back]').disabled = history.length === 0;
    controls.querySelector('[data-step]').disabled = !part || state.phase >= 4;
    if (focusPart) aliases.querySelector('[data-part="' + focusPart + '"]')?.focus({preventScroll: true});
    if (focusFlag) aliases.querySelector('[data-flag="' + focusFlag + '"]')?.focus({preventScroll: true});
  }
  const api = {
    step() { if (state.phase < 4) write(demoParts()[state.phase]); },
    back() { if (history.length) { state = history.pop(); render(); } },
    reset() { state = fresh(); history.length = 0; render(); }
  };
  find('[data-run]').addEventListener('click', () => write(currentPart()));
  controls.querySelector('[data-back]').addEventListener('click', api.back);
  controls.querySelector('[data-step]').addEventListener('click', api.step);
  controls.querySelector('[data-reset]').addEventListener('click', api.reset);
  render(); return api;
};
