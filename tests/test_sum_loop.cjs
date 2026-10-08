const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=path.join(__dirname,'../assets/js/widgets/while-loop.js');const {sumTrace,sumAddresses}=require(source);
for(let n=0;n<=5;n++){
 const states=sumTrace(n),final=states.at(-1);assert.equal(final.ecx,n*(n+1)/2);assert.equal(final.eax,n+1);assert.equal(final.iterations,n);assert.equal(states.length,5*n+4);
 assert.equal(states[0].eax,null);assert.equal(states[0].ecx,0);assert.equal(states[1].eax,1);assert.equal(states[1].zf,null);
 assert.equal(states.filter(s=>s.last===0).length,1);assert.deepEqual(final.history,Array.from({length:n+1},(_,i)=>i+1));
 assert.deepEqual(final.valueHistory,Array.from({length:n+1},(_,i)=>i*(i+1)/2));
 for(let i=1;i<states.length;i++){
  const s=states[i],prev=states[i-1];assert.equal(s.ebx,n);
  if(s.last===1){assert.equal(s.sf,Number(s.eax<n));assert.equal(s.of,0);assert.equal(s.zf,Number(s.eax===n));}
  if(s.last===2){assert.equal(s.pc,s.eax>n?6:3);assert.equal(s.zf,prev.zf);if(s.eax===n)assert.equal(s.pc,3);}
  if(s.last===3){assert.equal(s.ecx,prev.ecx+prev.eax);assert.equal(s.eax,prev.eax);assert.equal(s.flagSource,'ADD');assert.equal(s.zf,0);}
  if(s.last===4){assert.equal(s.eax,prev.eax+1);assert.equal(s.ecx,prev.ecx);assert.equal(s.flagSource,'INC');}
  if(s.last===5){assert.equal(sumAddresses[s.pc],0x401005);assert.equal(s.zf,prev.zf);}
 }
}
for(const n of [-1,6,0.5,NaN])assert.throws(()=>sumTrace(n),RangeError);
class Element{
 constructor(){this.dataset={};this.attrs={};this.queries={};this.listeners={};this.children=[];this._value='';this._text='';this.disabled=false;this.events=[];const classes=new Set();this.classList={toggle(name,on){on?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)};}
 set value(value){this._value=String(value);}get value(){return this._value;}
 set textContent(value){this._text=String(value);}get textContent(){return this._text;}
 set innerHTML(value){for(const selector of ['[data-back]','[data-step]','[data-reset]','.widget-count'])this.queries[selector]=new Element();}
 querySelector(selector){if(!this.queries[selector])throw new Error(`Missing ${selector}`);return this.queries[selector];}
 querySelectorAll(selector){if(!this.queries[selector])throw new Error(`Missing ${selector}`);return this.queries[selector];}
 setAttribute(name,value){this.attrs[name]=String(value);}
 append(...children){this.children.push(...children);}
 addEventListener(name,fn){this.listeners[name]=fn;}
 dispatchEvent(event){this.events.push(event.type);return true;}
}
const host=new Element(),diagram=new Element(),svg=new Element(),inputB=new Element();host.dataset.loopKind='sum';inputB.value=4;
host.queries={'[data-ebx]':inputB,'.byte-diagram':diagram};diagram.queries.svg=svg;
const rows=Array.from({length:7},()=>new Element());svg.queries['[data-jump-row]']=rows;
const readouts={};for(const name of ['rip','eax','ebx','ecx','sf','of','zf'])svg.queries[`[data-jump-${name}]`]=readouts[name]=new Element();
for(const name of ['data-jump-pointer','data-branch-path','data-fallthrough-path','data-done-path','data-loop-iterations','data-loop-history','data-loop-value-history','data-loop-flag-source'])svg.queries[`[${name}]`]=new Element();
for(const name of ['green','muted']){const marker=new Element();marker.id=`unique-${name}`;svg.queries[`[data-jump-marker="${name}"]`]=marker;}
const flags=[new Element(),new Element(),new Element()];svg.queries['[data-order-flag]']=flags;
const cLines=['init','condition','body','update','exit'].map(name=>{const line=new Element();line.dataset.loopCline=name;return line;});svg.queries['[data-loop-cline]']=cLines;
const window={};vm.runInNewContext(fs.readFileSync(source,'utf8'),{window,document:{createElement:()=>new Element()},Event:class{constructor(type){this.type=type;}}});
const api=window.LectureWidgets['while-loop'](host),caption=host.children[0],controls=host.children[1];
for(let n=0;n<=5;n++){
 inputB.value=n;inputB.listeners.input();assert.equal(readouts.eax.textContent,'—');assert.equal(readouts.ecx.textContent,'0');assert.equal(readouts.sf.textContent,'—');
 assert.equal(svg.querySelector('[data-loop-history]').textContent,'EAX: —');
 for(const s of sumTrace(n).slice(1)){
  api.step();assert.equal(readouts.rip.textContent,`0x${sumAddresses[s.pc].toString(16).toUpperCase()}`);
  for(const name of ['eax','ebx','ecx','sf','of','zf'])assert.equal(readouts[name].textContent,s[name]===null?'—':String(s[name]));
  assert.equal(svg.querySelector('[data-loop-value-history]').textContent,`ECX: ${s.valueHistory.join(' → ')}`);
  assert.equal(svg.querySelector('[data-loop-iterations]').textContent,String(s.iterations));
  assert.equal(svg.querySelector('[data-loop-flag-source]').textContent,`Флаги от: ${s.flagSource}`);
  assert.equal(svg.querySelector('[data-jump-pointer]').attrs.d,`M1030 111H978V${124+s.pc*40}H932`);
  assert.deepEqual(cLines.filter(l=>l.classList.contains('loop-code-active')).map(l=>l.dataset.loopCline),[['init','condition','condition','body','update','update','exit'][s.pc]]);
  assert.ok(flags.every(f=>f.classList.contains('loop-flag-active')===(s.pc===2)));
  assert.equal(svg.querySelector('[data-done-path]').classList.contains('loop-path-active'),s.last===5);
 }
 assert.equal(controls.querySelector('[data-step]').disabled,true);assert.ok(rows[6].classList.contains('loop-current'));
 assert.ok([3,4,5].every(i=>rows[i].classList.contains('loop-skipped')));
 api.step();assert.equal(readouts.rip.textContent,'0x40100F');api.back();assert.equal(readouts.rip.textContent,'0x401007');
 api.reset();assert.equal(inputB.value,String(n));assert.equal(readouts.eax.textContent,'—');
 api.step();api.back();assert.equal(readouts.eax.textContent,'—');assert.equal(svg.querySelector('[data-loop-value-history]').textContent,'ECX: 0');
}
for(const invalid of ['',-1,6,0.5]){
 inputB.value=invalid;inputB.listeners.input();assert.equal(inputB.attrs['aria-invalid'],'true');assert.equal(controls.querySelector('[data-step]').disabled,true);
 assert.ok(caption.textContent.includes('от 0 до 5'));api.step();assert.equal(readouts.eax.textContent,'—');api.reset();assert.equal(inputB.value,'5');
}
assert.ok(diagram.events.every(type=>type==='byte-hints-reset'));
console.log('SUM: all 6 bounds, MOV once, body/update separation, zero iterations, histories, flags, exact routes, UI highlighting, back/reset/end and invalid input passed.');
