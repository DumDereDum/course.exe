/* Fixed WHILE and FOR examples, bounded to 0…5. */
(() => {
  const addresses = [0x401000,0x401002,0x401004,0x401006,0x401008];
  function trace(a,b) {
    if (![a,b].every(n => Number.isInteger(n) && n >= 0 && n <= 5)) throw new RangeError('Choose integers 0…5');
    let eax=a, sf=null, of=null, flagSource='—', iterations=0;
    const executed=new Set(), history=[a], states=[];
    const snapshot=(pc,last,exit,caption) => states.push({pc,last,exit,eax,ebx:b,sf,of,flagSource,iterations,
      executed:[...executed],history:[...history],caption});
    snapshot(0,null,null,`EAX = ${a}, граница EBX = ${b}. Следующей будет проверка CMP.`);
    while (true) {
      sf=Number(eax < b); of=0; flagSource='CMP'; executed.add(0);
      snapshot(1,0,null,`CMP: ${eax} − ${b} = ${eax-b}. SF = ${sf}, OF = ${of}; EAX сохранился.`);
      executed.add(1);
      if (sf === of) {
        snapshot(4,1,true,`JGE: ${eax} ≥ ${b}. Выход на done; тело сейчас пропущено. Итераций: ${iterations}.`);
        break;
      }
      snapshot(2,1,false,`JGE пропущена: ${eax} < ${b}. Следующей будет INC — тело цикла.`);
      eax++;iterations++;history.push(eax);sf=0;of=0;flagSource='INC';executed.add(2);
      snapshot(3,2,false,`INC: EAX = ${eax}, итераций ${iterations}. SF = 0, OF = 0 теперь от INC.`);
      executed.add(3);
      snapshot(0,3,null,`JMP вернула RIP на check — 0x401000. Сравним новый EAX = ${eax} с EBX = ${b}.`);
    }
    return states;
  }
  const forAddresses=[0x401000,0x401005,0x401007,0x401009,0x40100c,0x40100e,0x401010];
  function forTrace(b) {
    if (!Number.isInteger(b) || b<0 || b>5) throw new RangeError('Choose an integer 0…5');
    let eax=null,ecx=0,sf=null,of=null,flagSource='—',iterations=0;
    const executed=new Set(),history=[],valueHistory=[0],states=[];
    const snapshot=(pc,last,exit,caption)=>states.push({pc,last,exit,eax,ebx:b,ecx,sf,of,flagSource,iterations,
      executed:[...executed],history:[...history],valueHistory:[...valueHistory],caption});
    snapshot(0,null,null,`EBX = ${b}, ECX = 0 подготовлен заранее. MOV установит начальный EAX.`);
    eax=0;history.push(0);executed.add(0);
    snapshot(1,0,null,'MOV: EAX = 0. Инициализация завершена; дальше возвращаемся только к check.');
    while (true) {
      sf=Number(eax<b);of=0;flagSource='CMP';executed.add(1);
      snapshot(2,1,null,`CMP: ${eax} − ${b} = ${eax-b}. SF = ${sf}, OF = ${of}; регистры сохранились.`);
      executed.add(2);
      if (sf===of) {
        snapshot(6,2,true,`JGE: ${eax} ≥ ${b}. Выходим; итог ECX = ${ecx}, завершено итераций: ${iterations}.`);
        break;
      }
      snapshot(3,2,false,`JGE пропущена: ${eax} < ${b}. Выполняем тело value += 2.`);
      ecx+=2;valueHistory.push(ecx);sf=0;of=0;flagSource='ADD';executed.add(3);
      snapshot(4,3,false,`ADD: ECX = ${ecx}, EAX ещё ${eax}. Тело выполнено; теперь изменим счётчик.`);
      eax++;history.push(eax);iterations++;sf=0;of=0;flagSource='INC';executed.add(4);
      snapshot(5,4,false,`INC: EAX = ${eax}, ECX остаётся ${ecx}. Завершено итераций: ${iterations}.`);
      executed.add(5);
      snapshot(1,5,null,'JMP вернула RIP на check — 0x401005. MOV EAX,0 повторно не выполняется.');
    }
    return states;
  }
  const sumAddresses=[0x401000,0x401005,0x401007,0x401009,0x40100b,0x40100d,0x40100f];
  function sumTrace(b) {
    if (!Number.isInteger(b) || b<0 || b>5) throw new RangeError('Choose an integer 0…5');
    let eax=null,ecx=0,sf=null,of=null,zf=null,flagSource='—',iterations=0;
    const executed=new Set(),history=[],valueHistory=[0],states=[];
    const snapshot=(pc,last,exit,caption)=>states.push({pc,last,exit,eax,ebx:b,ecx,sf,of,zf,flagSource,iterations,
      executed:[...executed],history:[...history],valueHistory:[...valueHistory],caption});
    snapshot(0,null,null,`N = ${b}, ECX = 0 подготовлен заранее. MOV установит первое слагаемое 1.`);
    eax=1;history.push(1);executed.add(0);
    snapshot(1,0,null,'MOV: EAX = 1. Сумма ECX пока 0; проверим, входит ли первое число в диапазон.');
    while (true) {
      sf=Number(eax<b);of=0;zf=Number(eax===b);flagSource='CMP';executed.add(1);
      snapshot(2,1,null,`CMP: ${eax} − ${b} = ${eax-b}. ZF = ${zf}, SF = ${sf}, OF = ${of}.`);
      executed.add(2);
      if (zf===0 && sf===of) {
        snapshot(6,2,true,`JG: ${eax} > ${b}. Итог суммы в ECX = ${ecx}; итераций ${iterations}.`);
        break;
      }
      snapshot(3,2,false,`JG пропущена: ${eax} ≤ ${b}. Число ${eax} включается в сумму.`);
      const term=eax;ecx+=term;valueHistory.push(ecx);sf=0;of=0;zf=0;flagSource='ADD';executed.add(3);
      snapshot(4,3,false,`ADD: прибавили ${term}, сумма ECX = ${ecx}. EAX пока ${eax}.`);
      eax++;history.push(eax);iterations++;sf=0;of=0;zf=0;flagSource='INC';executed.add(4);
      snapshot(5,4,false,`INC: следующее слагаемое EAX = ${eax}. Сумма ECX остаётся ${ecx}.`);
      executed.add(5);
      snapshot(1,5,null,'JMP вернула RIP на check — 0x401005. Проверим новое слагаемое.');
    }
    return states;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports={trace,addresses,forTrace,forAddresses,sumTrace,sumAddresses};
  if (typeof window === 'undefined') return;
  window.LectureWidgets=window.LectureWidgets || {};
  window.LectureWidgets['while-loop']=host => {
    const summing=host.dataset.loopKind==='sum';
    const counting=host.dataset.loopKind==='for'||summing;
    const inputA=counting?null:host.querySelector('[data-eax]'),inputB=host.querySelector('[data-ebx]');
    const diagram=host.querySelector('.byte-diagram'),svg=diagram.querySelector('svg');
    const rows=[...svg.querySelectorAll('[data-jump-row]')];
    const readouts=Object.fromEntries((counting?['rip','eax','ebx','ecx','sf','of']:['rip','eax','ebx','sf','of']).map(name=>[name,svg.querySelector(`[data-jump-${name}]`)]));
    if(summing) readouts.zf=svg.querySelector('[data-jump-zf]');
    const markers=Object.fromEntries(['green','muted'].map(name=>[name,svg.querySelector(`[data-jump-marker="${name}"]`).id]));
    const caption=document.createElement('p');caption.className='widget-status';caption.setAttribute('aria-live','polite');
    const controls=document.createElement('div');controls.className='widget-controls';
    controls.innerHTML='<button class="btn" data-back>← Назад</button><button class="btn primary" data-step>Далее →</button><button class="btn" data-reset>Сброс</button><span class="widget-count"></span>';
    host.append(caption,controls);
    const back=controls.querySelector('[data-back]'),step=controls.querySelector('[data-step]'),reset=controls.querySelector('[data-reset]');
    const prepare=(a,b)=>summing?sumTrace(b):counting?forTrace(b):trace(a,b);
    let choice={a:0,b:summing?4:3},states=prepare(0,choice.b),current=0,valid=true;
    function render() {
      diagram.dispatchEvent(new Event('byte-hints-reset'));
      const state=states[current];
      rows.forEach((row,index)=>{
        row.classList.toggle('loop-current',index===state.pc);
        row.classList.toggle('loop-executed',state.executed.includes(index));
        row.classList.toggle('loop-skipped',state.exit===true && (counting?[3,4,5]:[2,3]).includes(index));
      });
      const locations=summing?sumAddresses:counting?forAddresses:addresses;
      readouts.rip.textContent=`0x${locations[state.pc].toString(16).toUpperCase()}`;
      for (const name of counting?['eax','ebx','ecx','sf','of']:['eax','ebx','sf','of']) readouts[name].textContent=state[name]===null?'—':state[name];
      if(summing) readouts.zf.textContent=state.zf===null?'—':state.zf;
      svg.querySelector('[data-loop-iterations]').textContent=state.iterations;
      svg.querySelector('[data-loop-flag-source]').textContent=`Флаги от: ${state.flagSource}`;
      svg.querySelector('[data-loop-history]').textContent=`EAX: ${state.history.length?state.history.join(' → '):'—'}`;
      if (counting) svg.querySelector('[data-loop-value-history]').textContent=`ECX: ${state.valueHistory.join(' → ')}`;
      svg.querySelector('[data-jump-pointer]').setAttribute('d',`M1030 111H978V${124+state.pc*(counting?40:48)}H932`);
      for (const [selector,active] of [['data-branch-path',state.exit===true],['data-fallthrough-path',state.exit===false],['data-done-path',state.last===(counting?5:3)]]) {
        const path=svg.querySelector(`[${selector}]`);
        path.classList.toggle('loop-path-active',active);
        path.setAttribute('marker-end',`url(#${markers[active?'green':'muted']})`);
      }
      svg.querySelectorAll('[data-order-flag]').forEach(flag=>flag.classList.toggle('loop-flag-active',state.pc===(counting?2:1)));
      const line=counting?(['init','condition','condition','body','update','update','exit'][state.pc])
        :state.pc===4?'exit':state.pc===2 || state.pc===3?'body':'condition';
      svg.querySelectorAll('[data-loop-cline]').forEach(node=>node.classList.toggle('loop-code-active',node.dataset.loopCline===line));
      caption.textContent=valid?state.caption:counting?'Введите в EBX целое число от 0 до 5.':'Введите в EAX и EBX целые числа от 0 до 5.';
      controls.querySelector('.widget-count').textContent=`${current+1} / ${states.length}`;
      back.disabled=!valid || current===0;step.disabled=!valid || current===states.length-1;reset.disabled=valid && current===0;
    }
    function choose() {
      const good=input=>input.value.trim()!=='' && Number.isInteger(Number(input.value)) && Number(input.value)>=0 && Number(input.value)<=5;
      if (inputA) inputA.setAttribute('aria-invalid',String(!good(inputA)));
      inputB.setAttribute('aria-invalid',String(!good(inputB)));
      valid=(counting||good(inputA))&&good(inputB);
      if (valid) {choice={a:counting?0:Number(inputA.value),b:Number(inputB.value)};states=prepare(choice.a,choice.b);current=0;}
      render();
    }
    const api={
      step(){if(valid){current=Math.min(states.length-1,current+1);render();}},
      back(){if(valid){current=Math.max(0,current-1);render();}},
      reset(){if(inputA){inputA.value=choice.a;inputA.setAttribute('aria-invalid','false');}inputB.value=choice.b;inputB.setAttribute('aria-invalid','false');valid=true;current=0;render();}
    };
    if(inputA) inputA.addEventListener('input',choose);
    inputB.addEventListener('input',choose);
    back.addEventListener('click',api.back);step.addEventListener('click',api.step);reset.addEventListener('click',api.reset);
    choose();return api;
  };
})();
