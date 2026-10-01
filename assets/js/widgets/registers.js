/* Deliberately small teaching model: unsigned 64-bit registers + ZF only. */
window.LectureWidgets = window.LectureWidgets || {};
window.LectureWidgets.registers = host => {
  const program = host.querySelector('[data-program]');
  const lines = [...program.children].map(el => ({text:el.textContent, op:JSON.parse(el.dataset.do || '{}'), explain:el.dataset.explain || ''}));
  const names = (program.dataset.regs || 'rax,rbx,rcx,rdx').split(',').map(n=>n.trim());
  const panel = host.querySelector('[data-registers]');
  const initial = Object.fromEntries(names.map(n=>[n,0n]));
  const states = [{regs:initial,zf:0}];
  let current = 0;
  const controls = document.createElement('div'); controls.className='widget-controls';
  controls.innerHTML='<button class="btn" data-back>← Назад</button><button class="btn primary" data-step>Шаг →</button><button class="btn" data-reset>Сброс</button><span class="widget-count"></span>';
  const status = document.createElement('p'); status.className='widget-status'; status.setAttribute('aria-live','polite');
  host.append(status,controls);
  function nextState(previous,op) {
    const regs={...previous.regs}; let zf=previous.zf;
    const value = x => Object.hasOwn(regs,x) ? regs[x] : BigInt(x);
    const assign = (name,v,flags=false) => { regs[name]=BigInt.asUintN(64,v); if(flags) zf=regs[name]===0n?1:0; };
    Object.entries(op.set || {}).forEach(([r,v])=>assign(r,value(v)));
    Object.entries(op.add || {}).forEach(([r,v])=>assign(r,regs[r]+value(v),true));
    if(op.inc) assign(op.inc,regs[op.inc]+1n,true);
    Object.entries(op.xor || {}).forEach(([r,v])=>assign(r,regs[r]^value(v),true));
    if(op.zf !== undefined) zf=Number(op.zf);
    return {regs,zf};
  }
  function render(previous = states[current]) {
    const state=states[current];
    program.replaceChildren();
    lines.forEach((line,i)=>{
      const row=document.createElement('span'); row.className='program-line'+(i===current?' current':i<current?' executed':'');
      const num=document.createElement('span'); num.className='line-number';num.textContent=String(i+1).padStart(2,'0');
      const text=document.createElement('span');text.textContent=line.text;row.append(num,text);program.append(row);
    });
    panel.replaceChildren();
    names.forEach(name=>{
      const row=document.createElement('div');row.className='reg-row';
      const label=document.createElement('span');label.className='reg-name';label.textContent=name;
      const val=document.createElement('span');val.className='reg-value'+(state.regs[name]!==previous.regs[name]?' changed':'');val.textContent='0x'+state.regs[name].toString(16).padStart(16,'0');
      row.append(label,val);panel.append(row);
    });
    const meta=document.createElement('div');meta.className='register-meta';meta.innerHTML=`<span>ZF <b>${state.zf}</b></span><span>выполнено <b>${current}/${lines.length}</b></span>`;panel.append(meta);
    const note=document.createElement('p');note.className='registers-note';note.textContent='Учебная модель · 64 бита · показан только ZF';panel.append(note);
    status.textContent=current ? lines[current-1].explain || 'Команда выполнена.' : 'Начальное состояние: все показанные регистры равны нулю.';
    controls.querySelector('.widget-count').textContent=current===lines.length?'Готово':`${current} / ${lines.length}`;
    controls.querySelector('[data-back]').disabled=current===0;controls.querySelector('[data-reset]').disabled=current===0;controls.querySelector('[data-step]').disabled=current===lines.length;
  }
  const api={step(){if(current===lines.length)return;const previous=states[current];if(!states[current+1])states.push(nextState(previous,lines[current].op));current++;render(previous);},back(){if(!current)return;const previous=states[current];current--;render(previous);},reset(){current=0;render();}};
  controls.querySelector('[data-step]').addEventListener('click',api.step);controls.querySelector('[data-back]').addEventListener('click',api.back);controls.querySelector('[data-reset]').addEventListener('click',api.reset);
  render();return api;
};
