/* Signed maximum: overflow, both routes and the real bounded widget handlers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=path.join(__dirname,'../assets/js/widgets/conditional-jump.js');
const {maxTrace,maxAddresses}=require(source);
const values=[...Array.from({length:33},(_,i)=>i-16),-2147483648,-2147483647,2147483646,2147483647];
for(const a of values)for(const b of values){
 const states=maxTrace(a,b),final=states.at(-1),taken=a<b;
 assert.equal(final.ecx,Math.max(a,b));assert.equal(final.taken,taken);
 assert.equal(final.result,(a-b)>>>0);
 assert.deepEqual(states.map(s=>maxAddresses[s.pc]),taken
  ?[0x401000,0x401002,0x401008,0x40100a]
  :[0x401000,0x401002,0x401004,0x401006,0x40100a]);
 assert.equal(final.executed.includes(2),!taken);assert.equal(final.executed.includes(4),taken);
 for(const name of ['sf','of','cf','zf']){
  assert.equal(states[0][name],null);assert.ok(states.slice(1).every(s=>s[name]===final[name]));
 }
 assert.equal(final.of,Number(a-b < -2147483648 || a-b > 2147483647));
 assert.equal(final.sf,Number(((a-b)>>>0)>=2147483648));assert.equal(final.zf,Number(a===b));
 assert.equal(final.cf,Number((a>>>0)<(b>>>0)));
 assert.equal(final.sf!==final.of,taken);
}
for(const invalid of [-2147483649,2147483648,1.5,NaN,Infinity])assert.throws(()=>maxTrace(invalid,3),RangeError);
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
const host=new Element(),diagram=new Element(),svg=new Element(),inputA=new Element(),inputB=new Element();
host.dataset.jumpKind='max';inputA.value=7;inputB.value=3;
host.queries={'[data-eax]':inputA,'[data-ebx]':inputB,'.byte-diagram':diagram};diagram.queries.svg=svg;
const rows=Array.from({length:6},()=>new Element());svg.queries['[data-jump-row]']=rows;
const readouts={};for(const name of ['rip','eax','ebx','ecx','sf','of'])svg.queries[`[data-jump-${name}]`]=readouts[name]=new Element();
for(const name of ['data-jump-pointer','data-branch-path','data-fallthrough-path','data-done-path','data-jump-instruction','data-jump-rule'])svg.queries[`[${name}]`]=new Element();
for(const name of ['green','muted']){const marker=new Element();marker.id=`unique-${name}`;svg.queries[`[data-jump-marker="${name}"]`]=marker;}
const flags=['sf','of'].map(name=>{const flag=new Element();flag.dataset.orderFlag=name;return flag;});svg.queries['[data-order-flag]']=flags;
const cLines=['condition','first','else','second'].map(name=>{const line=new Element();line.dataset.maxCline=name;return line;});svg.queries['[data-max-cline]']=cLines;
const opcode=new Element();opcode.queries.text=new Element();svg.queries['[data-jump-opcode]']=opcode;
const window={};vm.runInNewContext(fs.readFileSync(source,'utf8'),{window,document:{createElement:()=>new Element()},Event:class{constructor(type){this.type=type;}}});
const api=window.LectureWidgets['conditional-jump'](host),caption=host.children[0],controls=host.children[1];
assert.equal(readouts.eax.textContent,'7');assert.equal(readouts.ebx.textContent,'3');assert.equal(readouts.ecx.textContent,'—');
assert.equal(opcode.dataset.byte,'7C');assert.ok(opcode.dataset.byteHint.includes('SF ≠ OF'));
assert.equal(svg.querySelector('[data-jump-instruction]').textContent,'jl use_b');
for(const [a,b] of [[7,3],[3,7],[7,7],[-3,-7],[-7,-3],[-2147483648,2147483647],[2147483647,-2147483648],[0,0]]){
 inputA.value=a;inputB.value=b;inputA.listeners.input();
 assert.equal(readouts.rip.textContent,'0x401000');assert.equal(readouts.sf.textContent,'—');
 assert.deepEqual(cLines.filter(l=>l.classList.contains('max-code-active')).map(l=>l.dataset.maxCline),['condition']);
 const states=maxTrace(a,b);
 for(const state of states.slice(1)){
  api.step();assert.equal(readouts.rip.textContent,`0x${maxAddresses[state.pc].toString(16).toUpperCase()}`);
  assert.equal(readouts.sf.textContent,String(state.sf));assert.equal(readouts.of.textContent,String(state.of));
  assert.equal(readouts.ecx.textContent,state.ecx===null?'—':String(state.ecx));
 }
 assert.equal(readouts.ecx.textContent,String(Math.max(a,b)));assert.equal(controls.querySelector('[data-step]').disabled,true);
 assert.equal(readouts.eax.textContent,String(a));assert.equal(readouts.ebx.textContent,String(b));
 assert.ok(rows[a<b?2:4].classList.contains('jump-skipped'));
 assert.deepEqual(cLines.filter(l=>l.classList.contains('max-code-active')).map(l=>l.dataset.maxCline),a<b?['else','second']:['first']);
 api.step();assert.equal(readouts.rip.textContent,'0x40100A');
 api.back();assert.equal(readouts.ecx.textContent,a<b?'—':String(a));
 api.reset();assert.equal(inputA.value,String(a));assert.equal(inputB.value,String(b));assert.equal(readouts.ecx.textContent,'—');
}
for(const invalid of ['',1.5,2147483648,-2147483649]){
 inputA.value=invalid;inputA.listeners.input();assert.equal(inputA.attrs['aria-invalid'],'true');
 assert.equal(controls.querySelector('[data-step]').disabled,true);api.step();assert.equal(readouts.rip.textContent,'0x401000');
 assert.ok(caption.textContent.includes('-2147483648'));api.reset();assert.equal(inputA.value,'0');
}
inputB.value='';inputB.listeners.input();assert.equal(inputB.attrs['aria-invalid'],'true');api.reset();assert.equal(inputB.value,'0');
assert.ok(diagram.events.every(type=>type==='byte-hints-reset'));
console.log('Maximum: 1369 signed pairs, overflow flags, both routes, equality, boundary/invalid inputs, C highlighting, back/reset/end and hint closing passed.');
