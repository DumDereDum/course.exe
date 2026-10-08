/* Bounded CMP/TEST lesson examples, two branches, no general instruction emulator. */
(() => {
  const addresses = [0x401000, 0x401002, 0x401004, 0x401009, 0x40100b, 0x401010];
  function trace(a, b, operation) {
    if (![a, b].every(value => Number.isInteger(value) && value >= 0 && value <= 99) || !['je', 'jne'].includes(operation)) {
      throw new RangeError('Choose integers 0…99 and je/jne');
    }
    const zf = a === b ? 1 : 0;
    const taken = operation === 'je' ? zf === 1 : zf === 0;
    const states = [
      {pc:0, zf:null, ecx:null, executed:[], taken:null,
        caption:`EAX = ${a}, EBX = ${b}. Следующей будет выполнена cmp; ZF пока не задан.`},
      {pc:1, zf, ecx:null, executed:[0], taken:null,
        caption:`Cmp: ${a} − ${b} = ${a - b}, ZF = ${zf}. Значения EAX и EBX сохранились.`},
      {pc:taken ? 4 : 2, zf, ecx:null, executed:[0,1], taken,
        caption:taken ? `${operation}: ZF = ${zf} подходит. RIP переходит на yes — 0x40100B.` : `${operation}: ZF = ${zf} не подходит. Следующей будет mov ecx, 0.`}
    ];
    if (taken) {
      states.push({pc:5, zf, ecx:1, executed:[0,1,4], taken,
        caption:'Mov записала 1 в ECX. Выполнение дошло до done; ветка с ECX = 0 пропущена.'});
    } else {
      states.push({pc:3, zf, ecx:0, executed:[0,1,2], taken,
        caption:'Mov записала 0 в ECX. Следующей будет jmp done; ZF сохраняется.'});
      states.push({pc:5, zf, ecx:0, executed:[0,1,2,3], taken,
        caption:'Jmp перевела RIP на done — 0x401010. Mov ecx, 1 пропущена; итог ECX = 0.'});
    }
    return states;
  }
  function testAddresses(mode) {
    const size = mode === 'zero' ? 2 : 5;
    return [0, size, size + 2, size + 7, size + 9, size + 14].map(offset => 0x401000 + offset);
  }
  function testTrace(a, mode) {
    if (!Number.isInteger(a) || a < 0 || a > 255 || !['zero','bit'].includes(mode)) throw new RangeError('Choose an integer 0…255 and zero/bit');
    const mask = mode === 'zero' ? a : 1;
    const result = a & mask;
    const zf = result === 0 ? 1 : 0;
    const taken = zf === 1;
    const target = mode === 'zero' ? 'zero' : 'even';
    const location = testAddresses(mode);
    const hex = value => `0x${value.toString(16).toUpperCase()}`;
    const states = [
      {pc:0,zf:null,ecx:null,result:null,cf:null,of:null,executed:[],taken:null,
        caption:`EAX = ${a}. Test пока не выполнена; результат AND и флаги не заданы.`},
      {pc:1,zf,ecx:null,result,cf:0,of:0,executed:[0],taken:null,
        caption:`Test: ${a} AND ${mask} = ${result}, ZF = ${zf}. EAX сохранил ${a}; CF и OF сброшены.`},
      {pc:taken ? 4 : 2,zf,ecx:null,result,cf:0,of:0,executed:[0,1],taken,
        caption:taken ? `Jz: ZF = 1, переход на ${target} — ${hex(location[4])}.` : 'Jz: ZF = 0, переход пропущен. Следующей будет mov ecx, 0.'}
    ];
    if (taken) states.push({pc:5,zf,ecx:1,result,cf:0,of:0,executed:[0,1,4],taken,
      caption:`Mov записала ECX = 1: ${mode === 'zero' ? 'EAX равен нулю' : 'число чётное'}. EAX по-прежнему ${a}.`});
    else {
      states.push({pc:3,zf,ecx:0,result,cf:0,of:0,executed:[0,1,2],taken,
        caption:`Mov записала ECX = 0: ${mode === 'zero' ? 'EAX не равен нулю' : 'число нечётное'}. Следующей будет jmp done.`});
      states.push({pc:5,zf,ecx:0,result,cf:0,of:0,executed:[0,1,2,3],taken,
        caption:`Jmp пропустила другую ветку. Итог ECX = 0; EAX сохранил ${a}.`});
    }
    return states;
  }
  function orderedTrace(operation) {
    if (!['jl','jb'].includes(operation)) throw new RangeError('Choose jl/jb');
    const a = 0xffffffff, b = 1, result = (a - b) >>> 0;
    const flags = {
      zf:Number(result === 0), cf:Number(a < b), sf:result >>> 31,
      of:Number(((a ^ b) & (a ^ result) & 0x80000000) !== 0)
    };
    const taken = operation === 'jl' ? flags.sf !== flags.of : flags.cf === 1;
    const snapshot = (pc,executed,ecx,caption,branch=null) => ({
      pc,executed,ecx,caption,taken:branch,
      ...(executed.includes(0) ? {...flags,result} : {zf:null,cf:null,sf:null,of:null,result:null})
    });
    const states = [
      snapshot(0,[],null,'EAX = FFFFFFFF, EBX = 00000001. Следующей будет cmp; флаги пока не заданы.'),
      snapshot(1,[0],null,'Cmp получила FFFFFFFE для флагов: SF = 1, OF = 0, CF = 0, ZF = 0. Регистры сохранились.'),
      snapshot(taken ? 4 : 2,[0,1],null, taken
        ? 'JL: SF ≠ OF, то есть 1 ≠ 0. Переходим на less: со знаком −1 < 1.'
        : 'JB: нужен CF = 1, но CF = 0. Переход пропущен: без знака 4294967295 > 1.',taken)
    ];
    if (taken) states.push(snapshot(5,[0,1,4],1,'Mov записала ECX = 1. Знаковое «меньше» выполнено; данные и флаги сохранились.',taken));
    else {
      states.push(snapshot(3,[0,1,2],0,'Mov записала ECX = 0. Беззнаковое «меньше» не выполнено; следующая команда — jmp done.',taken));
      states.push(snapshot(5,[0,1,2,3],0,'Jmp пропустила другую ветку. Итог ECX = 0; данные и флаги сохранились.',taken));
    }
    return states;
  }
  const maxAddresses = [0x401000,0x401002,0x401004,0x401006,0x401008,0x40100a];
  function maxTrace(a,b) {
    if (![a,b].every(value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647)) {
      throw new RangeError('Choose signed 32-bit integers');
    }
    const left = a >>> 0, right = b >>> 0, result = (left-right) >>> 0;
    const flags = {zf:Number(result === 0),cf:Number(left < right),sf:result >>> 31,
      of:Number(((left ^ right) & (left ^ result) & 0x80000000) !== 0)};
    const taken = flags.sf !== flags.of;
    const snapshot = (pc,executed,ecx,caption,branch=null) => ({pc,executed,ecx,caption,taken:branch,
      ...(executed.includes(0) ? {...flags,result} : {zf:null,cf:null,sf:null,of:null,result:null})});
    const states = [
      snapshot(0,[],null,`EAX = ${a}, EBX = ${b}. Сравним числа; результат ECX пока не задан.`),
      snapshot(1,[0],null,`CMP: SF = ${flags.sf}, OF = ${flags.of}. Значения EAX и EBX сохранились.`),
      snapshot(taken ? 4 : 2,[0,1],null,taken
        ? `JL: SF ≠ OF. ${a} < ${b}, переходим на use_b — ветку else.`
        : `JL: SF = OF. ${a} ≥ ${b}, идём к mov ecx, eax.`,taken)
    ];
    if (taken) states.push(snapshot(5,[0,1,4],b,`ECX = ${b}: выбрали EBX. Обе ветки сходятся у done.`,taken));
    else {
      states.push(snapshot(3,[0,1,2],a,`ECX = ${a}: выбрали EAX. JMP пропустит запись EBX.`,taken));
      states.push(snapshot(5,[0,1,2,3],a,`JMP перешла на done. Максимум в ECX = ${a}; другая ветка пропущена.`,taken));
    }
    return states;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {trace, addresses, testTrace, testAddresses, orderedTrace, maxTrace, maxAddresses};
  if (typeof window === 'undefined') return;
  window.LectureWidgets = window.LectureWidgets || {};
  window.LectureWidgets['conditional-jump'] = host => {
    const testing = host.dataset.jumpKind === 'test';
    const ordering = host.dataset.jumpKind === 'ordered';
    const selectingMax = host.dataset.jumpKind === 'max';
    const minimum = selectingMax ? -2147483648 : 0;
    const maximum = selectingMax ? 2147483647 : testing ? 255 : 99;
    const inputA = ordering ? null : host.querySelector('[data-eax]');
    const inputB = testing || ordering ? null : host.querySelector('[data-ebx]');
    const operation = selectingMax ? null : host.querySelector(testing ? '[data-test-mode]' : '[data-jump-operation]');
    const diagram = host.querySelector('.byte-diagram');
    const svg = diagram.querySelector('svg');
    const rows = [...svg.querySelectorAll('[data-jump-row]')];
    const opcode = svg.querySelector('[data-jump-opcode]');
    const markers = Object.fromEntries(['green','muted'].map(name => [name, svg.querySelector(`[data-jump-marker="${name}"]`).id]));
    const names = selectingMax ? ['rip','eax','ebx','ecx','sf','of'] : testing ? ['rip','eax','zf','ecx'] : ordering
      ? ['rip','eax','ebx','zf','ecx','cf','sf','of'] : ['rip','eax','ebx','zf','ecx'];
    const readouts = Object.fromEntries(names.map(name => [name, svg.querySelector(`[data-jump-${name}]`)]));
    const caption = document.createElement('p');
    caption.className = 'widget-status';
    caption.setAttribute('aria-live','polite');
    const controls = document.createElement('div');
    controls.className = 'widget-controls';
    controls.innerHTML = '<button class="btn" data-back>← Назад</button><button class="btn primary" data-step>Далее →</button><button class="btn" data-reset>Сброс</button><span class="widget-count"></span>';
    host.append(caption, controls);
    const back = controls.querySelector('[data-back]');
    const step = controls.querySelector('[data-step]');
    const reset = controls.querySelector('[data-reset]');
    const count = controls.querySelector('.widget-count');
    let choice = {a:ordering ? 0xffffffff : 7, b:ordering ? 1 : selectingMax ? 3 : 7, operation:testing ? 'zero' : ordering || selectingMax ? 'jl' : 'je'};
    const prepare = () => selectingMax ? maxTrace(choice.a,choice.b) : testing ? testTrace(choice.a, choice.operation) : ordering
      ? orderedTrace(choice.operation) : trace(choice.a, choice.b, choice.operation);
    let states = prepare();
    let current = 0;
    let valid = true;

    function render() {
      diagram.dispatchEvent(new Event('byte-hints-reset'));
      const state = states[current];
      const locations = selectingMax ? maxAddresses : testing ? testAddresses(choice.operation) : addresses;
      rows.forEach((row, index) => {
        row.classList.toggle('jump-current', index === state.pc);
        row.classList.toggle('jump-executed', state.executed.includes(index));
        row.classList.toggle('jump-skipped', state.taken !== null && (state.taken ? [2,3].includes(index) : index === 4));
      });
      readouts.rip.textContent = `0x${locations[state.pc].toString(16).toUpperCase()}`;
      const registerValue = value => ordering ? value.toString(16).toUpperCase().padStart(8,'0') : value;
      readouts.eax.textContent = registerValue(choice.a);
      if (!testing) readouts.ebx.textContent = registerValue(choice.b);
      if (readouts.zf) readouts.zf.textContent = state.zf === null ? '—' : state.zf;
      readouts.ecx.textContent = state.ecx === null ? '—' : state.ecx;
      svg.querySelector('[data-jump-pointer]').setAttribute('d', `M1030 111H978V${124 + state.pc * 48}H932`);
      function route(selector, active) {
        const path = svg.querySelector(selector);
        path.classList.toggle('jump-path-active', active);
        path.setAttribute('marker-end', `url(#${markers[active ? 'green' : 'muted']})`);
      }
      route('[data-branch-path]', state.taken === true);
      route('[data-fallthrough-path]', state.taken === false);
      route('[data-done-path]', state.executed.includes(3));
      const target = selectingMax ? 'use_b' : testing ? (choice.operation === 'zero' ? 'zero' : 'even') : ordering ? 'less' : 'yes';
      const instruction = testing ? 'jz' : choice.operation;
      svg.querySelector('[data-jump-instruction]').textContent = `${instruction} ${target}`;
      const hex = selectingMax ? '7C' : ordering ? (choice.operation === 'jl' ? '7C' : '72') : testing || choice.operation === 'je' ? '74' : '75';
      const required = testing || choice.operation === 'je' ? 1 : 0;
      const condition = selectingMax ? 'SF ≠ OF' : ordering ? (choice.operation === 'jl' ? 'SF ≠ OF' : 'CF = 1') : `ZF = ${required}`;
      const explanation = `${instruction.toUpperCase()}: короткий ${ordering || selectingMax ? (choice.operation === 'jl' ? 'знаковый' : 'беззнаковый') : 'условный'} переход, если ${condition}. Операнды не сравнивает и флаги не меняет.`;
      opcode.dataset.byte = hex;
      opcode.dataset.byteHint = explanation;
      opcode.setAttribute('aria-label', `${hex}: ${explanation}`);
      opcode.querySelector('text').textContent = hex;
      svg.querySelector('[data-jump-rule]').textContent = selectingMax ? 'JL проверяет a < b: переходим в ELSE · JMP пропускает другую ветку'
        : testing
        ? 'JZ = JE: переход при ZF = 1 · TEST не записывает результат AND в EAX'
        : ordering ? (choice.operation === 'jl' ? 'JL: SF ≠ OF · со знаком −1 < 1' : 'JB: CF = 1 · без знака 4294967295 < 1 — неверно')
        : `${choice.operation.toUpperCase()}: переход при ZF = ${required} · ECX = 1 — переход сработал, ECX = 0 — пропущен`;
      if (testing) renderTest(state, locations, target);
      if (ordering || selectingMax) {
        for (const name of ['cf','sf','of']) if (readouts[name]) readouts[name].textContent = state[name] === null ? '—' : state[name];
        const used = choice.operation === 'jl' ? ['sf','of'] : ['cf'];
        svg.querySelectorAll('[data-order-flag]').forEach(flag => {
          flag.classList.toggle('order-flag-active', state.zf !== null && used.includes(flag.dataset.orderFlag));
        });
      }
      if (selectingMax) {
        const active = state.pc < 2 ? ['condition'] : state.taken ? ['else','second'] : ['first'];
        svg.querySelectorAll('[data-max-cline]').forEach(line => line.classList.toggle('max-code-active',active.includes(line.dataset.maxCline)));
      }
      caption.textContent = valid ? state.caption : ordering ? 'Выберите jl или jb.' : `Введите ${testing ? 'в EAX целое число' : 'в EAX и EBX целые числа'} от ${minimum} до ${maximum}.`;
      count.textContent = `${current + 1} / ${states.length}`;
      back.disabled = !valid || current === 0;
      step.disabled = !valid || current === states.length - 1;
      reset.disabled = valid && current === 0;
    }

    function renderTest(state, locations, target) {
      const zero = choice.operation === 'zero';
      const hex = value => `0x${value.toString(16).toUpperCase()}`;
      const bytes = zero ? ['85','C0'] : ['A9','01','00','00','00'];
      const descriptions = zero ? [
        'TEST: побитовое AND двух 32-битных операндов для флагов. Результат не записывается в регистр.',
        'ModR/M: 11 | 000 | 000 — оба операнда являются регистром EAX. Проверка EAX AND EAX.'
      ] : [
        'TEST: проверить EAX 32-битной константой-маской. EAX задан кодом A9; отдельного ModR/M здесь нет.',
        'Байт 1 из 4 маски 1: 01 00 00 00, младший байт первым.',
        'Байт 2 из 4 маски 1: 01 00 00 00, младший байт первым.',
        'Байт 3 из 4 маски 1: 01 00 00 00, младший байт первым.',
        'Байт 4 из 4 маски 1: 01 00 00 00, младший байт первым.'
      ];
      svg.querySelector('[data-test-instruction]').textContent = zero ? 'test eax, eax' : 'test eax, 1';
      svg.querySelector('[data-test-target-label]').textContent = `${target}:`;
      rows.forEach((row,index) => {row.querySelector('[data-jump-address]').textContent = hex(locations[index]);});
      svg.querySelectorAll('[data-test-byte]').forEach((byte,index) => {
        const visible = index < bytes.length;
        byte.setAttribute('display', visible ? 'inline' : 'none');
        byte.setAttribute('aria-hidden', String(!visible));
        if (visible) {
          byte.dataset.byte = bytes[index];
          byte.dataset.byteHint = descriptions[index];
          byte.setAttribute('aria-label', `${bytes[index]}: ${descriptions[index]}`);
          byte.querySelector('text').textContent = bytes[index];
        }
      });
      const describeOffset = (selector,description) => {
        const byte = svg.querySelector(selector);
        byte.dataset.byteHint = description;
        byte.setAttribute('aria-label', `${byte.dataset.byte}: ${description}`);
      };
      describeOffset('[data-test-jz-offset]',`Смещение +7 байтов: ${hex(locations[2])} + 7 = ${hex(locations[4])} (${target}). Отсчёт от адреса после JZ.`);
      describeOffset('[data-test-jmp-offset]',`Смещение +5 байтов: ${hex(locations[4])} + 5 = ${hex(locations[5])} (done). Отсчёт от адреса после JMP.`);
      const binary = value => value.toString(2).padStart(8,'0');
      for (const [name,value] of [['input',choice.a],['mask',zero ? choice.a : 1],['result',state.result]]) {
        const bits = value === null ? '————————' : binary(value);
        svg.querySelectorAll(`[data-test-${name}-bit]`).forEach((bit,index) => {bit.textContent = bits[index];});
      }
      svg.querySelector('[data-test-mask-label]').textContent = zero ? '& EAX' : '& 1';
      svg.querySelector('[data-test-lsb]').setAttribute('display', zero ? 'none' : 'inline');
      svg.querySelector('[data-test-cf]').textContent = state.cf === null ? '—' : state.cf;
      svg.querySelector('[data-test-of]').textContent = state.of === null ? '—' : state.of;
    }

    function choose() {
      if (ordering) {
        valid = ['jl','jb'].includes(operation.value);
        if (valid) {choice.operation = operation.value; states = prepare(); current = 0;}
        render();
        return;
      }
      const a = Number(inputA.value), b = testing ? 0 : Number(inputB.value);
      const good = input => input.value.trim() !== '' && Number.isInteger(Number(input.value)) && Number(input.value) >= minimum && Number(input.value) <= maximum;
      inputA.setAttribute('aria-invalid', String(!good(inputA)));
      if (!testing) inputB.setAttribute('aria-invalid', String(!good(inputB)));
      valid = good(inputA) && (testing || good(inputB)) && (selectingMax || (testing ? ['zero','bit'] : ['je','jne']).includes(operation.value));
      if (valid) {
        choice = {a, b, operation:selectingMax ? 'jl' : operation.value};
        states = prepare();
        current = 0;
      }
      render();
    }
    const api = {
      step() {if (valid) {current = Math.min(states.length - 1, current + 1); render();}},
      back() {if (valid) {current = Math.max(0, current - 1); render();}},
      reset() {
        if (inputA) inputA.value = choice.a;
        if (inputB) inputB.value = choice.b;
        if (operation) operation.value = choice.operation;
        if (inputA) inputA.setAttribute('aria-invalid','false');
        if (inputB) inputB.setAttribute('aria-invalid','false');
        valid = true;
        current = 0;
        render();
      }
    };
    if (inputA) inputA.addEventListener('input', choose);
    if (inputB) inputB.addEventListener('input', choose);
    if (operation) operation.addEventListener('change', choose);
    back.addEventListener('click', api.back);
    step.addEventListener('click', api.step);
    reset.addEventListener('click', api.reset);
    choose();
    return api;
  };
})();
