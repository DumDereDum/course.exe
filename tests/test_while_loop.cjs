/* Bounded while: actual instruction routes, flags, iteration counts and UI handlers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=path.join(__dirname,'../assets/js/widgets/while-loop.js');
const {trace,addresses}=require(source);
for(let a=0;a<=5;a++)for(let b=0;b<=5;b++){
 const states=trace(a,b),iterations=Math.max(0,b-a),final=states.at(-1);
 assert.equal(states.length,4*iterations+3);assert.equal(final.eax,Math.max(a,b));assert.equal(final.ebx,b);
 assert.equal(final.iterations,iterations);assert.equal(final.pc,4);assert.equal(final.exit,true);
 assert.deepEqual(final.history,Array.from({length:iterations+1},(_,i)=>a+i));
 const pcs=[0];for(let i=0;i<iterations;i++)pcs.push(1,2,3,0);pcs.push(1,4);
 assert.deepEqual(states.map(s=>s.pc),pcs);
 assert.equal(states[0].sf,null);assert.equal(states[0].of,null);
 for(let i=1;i<states.length;i++){
  const s=states[i],prev=states[i-1];assert.equal(s.ebx,b);
  if(s.last===0){assert.equal(s.sf,Number(s.eax<b));assert.equal(s.of,0);assert.equal(s.flagSource,'CMP');assert.equal(s.eax,prev.eax);}
  if(s.last===1){assert.equal(s.sf,prev.sf);assert.equal(s.of,prev.of);assert.equal(s.pc,s.eax>=b?4:2);}
  if(s.last===2){assert.equal(s.eax,prev.eax+1);assert.equal(s.iterations,prev.iterations+1);assert.equal(s.sf,0);assert.equal(s.of,0);assert.equal(s.flagSource,'INC');}
  if(s.last===3){assert.equal(s.eax,prev.eax);assert.equal(s.sf,prev.sf);assert.equal(s.of,prev.of);assert.equal(addresses[s.pc],0x401000);}
 }
 if(a>=b)assert.ok(!final.executed.includes(2)&&!final.executed.includes(3));
}
for(const invalid of [-1,6,0.5,NaN,Infinity])assert.throws(()=>trace(invalid,3),RangeError);
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
function scene(a=0,b=3){
 const host=new Element(),diagram=new Element(),svg=new Element(),inputA=new Element(),inputB=new Element();
 inputA.value=a;inputB.value=b;host.queries={'[data-eax]':inputA,'[data-ebx]':inputB,'.byte-diagram':diagram};diagram.queries.svg=svg;
 const rows=Array.from({length:5},()=>new Element());svg.queries['[data-jump-row]']=rows;
 const readouts={};for(const name of ['rip','eax','ebx','sf','of'])svg.queries[`[data-jump-${name}]`]=readouts[name]=new Element();
 for(const name of ['data-jump-pointer','data-branch-path','data-fallthrough-path','data-done-path','data-loop-iterations','data-loop-history','data-loop-flag-source'])svg.queries[`[${name}]`]=new Element();
 for(const name of ['green','muted']){const marker=new Element();marker.id=`unique-${name}`;svg.queries[`[data-jump-marker="${name}"]`]=marker;}
 const flags=['sf','of'].map(name=>new Element());svg.queries['[data-order-flag]']=flags;
 const cLines=['condition','body','exit'].map(name=>{const line=new Element();line.dataset.loopCline=name;return line;});svg.queries['[data-loop-cline]']=cLines;
 return {host,diagram,svg,inputA,inputB,rows,readouts,flags,cLines};
}
const window={};vm.runInNewContext(fs.readFileSync(source,'utf8'),{window,document:{createElement:()=>new Element()},Event:class{constructor(type){this.type=type;}}});
const {host,diagram,svg,inputA,inputB,rows,readouts,flags,cLines}=scene();
const api=window.LectureWidgets['while-loop'](host),caption=host.children[0],controls=host.children[1];
assert.equal(readouts.rip.textContent,'0x401000');assert.equal(readouts.eax.textContent,'0');assert.equal(readouts.sf.textContent,'—');
for(let a=0;a<=5;a++)for(let b=0;b<=5;b++){
 inputA.value=a;inputB.value=b;inputA.listeners.input();const states=trace(a,b);
 for(let i=1;i<states.length;i++){
  const s=states[i];api.step();assert.equal(readouts.rip.textContent,`0x${addresses[s.pc].toString(16).toUpperCase()}`);
  assert.equal(readouts.eax.textContent,String(s.eax));assert.equal(readouts.ebx.textContent,String(b));
  assert.equal(readouts.sf.textContent,String(s.sf));assert.equal(readouts.of.textContent,String(s.of));
  assert.equal(svg.querySelector('[data-loop-iterations]').textContent,String(s.iterations));
  assert.equal(svg.querySelector('[data-loop-history]').textContent,`EAX: ${s.history.join(' → ')}`);
  assert.equal(svg.querySelector('[data-loop-flag-source]').textContent,`Флаги от: ${s.flagSource}`);
  assert.ok(rows[s.pc].classList.contains('loop-current'));
  assert.ok(flags.every(f=>f.classList.contains('loop-flag-active')===(s.pc===1)));
  assert.deepEqual(cLines.filter(l=>l.classList.contains('loop-code-active')).map(l=>l.dataset.loopCline),[s.pc===4?'exit':s.pc===2||s.pc===3?'body':'condition']);
  assert.equal(svg.querySelector('[data-done-path]').classList.contains('loop-path-active'),s.last===3);
 }
 assert.equal(controls.querySelector('[data-step]').disabled,true);api.step();assert.equal(readouts.rip.textContent,'0x401008');
 api.back();assert.equal(readouts.rip.textContent,'0x401002');assert.equal(svg.querySelector('[data-branch-path]').classList.contains('loop-path-active'),false);
 api.reset();assert.equal(inputA.value,String(a));assert.equal(readouts.eax.textContent,String(a));assert.equal(readouts.sf.textContent,'—');
 api.back();assert.equal(readouts.rip.textContent,'0x401000');
}
// A second instance neither changes nor resets the first instance.
api.step();const before=readouts.rip.textContent;const other=scene(0,1);const otherApi=window.LectureWidgets['while-loop'](other.host);otherApi.step();otherApi.step();otherApi.reset();assert.equal(readouts.rip.textContent,before);api.reset();
for(const invalid of ['',-1,6,0.5]){
 inputA.value=invalid;inputA.listeners.input();assert.equal(inputA.attrs['aria-invalid'],'true');
 assert.equal(controls.querySelector('[data-step]').disabled,true);assert.ok(caption.textContent.includes('от 0 до 5'));
 api.step();assert.equal(readouts.rip.textContent,'0x401000');api.reset();assert.equal(inputA.value,'5');
}
inputB.value='';inputB.listeners.input();assert.equal(inputB.attrs['aria-invalid'],'true');api.reset();assert.equal(inputB.value,'5');
assert.ok(diagram.events.every(type=>type==='byte-hints-reset'));
console.log('WHILE: all 36 inputs, repeated CMP, INC flags, backwards jump, zero iterations, history, UI routes, independent instances, back/reset/end and invalid inputs passed.');
