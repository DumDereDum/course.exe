/* Fixed 32-bit CMP, signed/unsigned conditions, exact flags and real UI handlers. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=path.join(__dirname,'../assets/js/widgets/conditional-jump.js');
const {orderedTrace,addresses}=require(source);
for(const operation of ['jl','jb']){
 const states=orderedTrace(operation),taken=operation==='jl',final=states.at(-1);
 assert.equal(final.ecx,Number(taken));assert.equal(final.result,0xfffffffe);
 for(const state of states.slice(1))assert.deepEqual([state.zf,state.cf,state.sf,state.of],[0,0,1,0]);
 for(const name of ['zf','cf','sf','of'])assert.equal(states[0][name],null);
 assert.deepEqual(states.map(state=>addresses[state.pc]),taken
  ?[0x401000,0x401002,0x40100b,0x401010]
  :[0x401000,0x401002,0x401004,0x401009,0x401010]);
 assert.equal(final.executed.includes(4),taken);assert.equal(final.executed.includes(2),!taken);
}
assert.throws(()=>orderedTrace('je'),RangeError);
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
const host=new Element(),diagram=new Element(),svg=new Element(),operation=new Element();
host.dataset.jumpKind='ordered';operation.value='jl';host.queries={'[data-jump-operation]':operation,'.byte-diagram':diagram};diagram.queries.svg=svg;
const rows=Array.from({length:6},()=>new Element());svg.queries['[data-jump-row]']=rows;
const readouts={};for(const name of ['rip','eax','ebx','zf','ecx','cf','sf','of'])svg.queries[`[data-jump-${name}]`]=readouts[name]=new Element();
for(const name of ['data-jump-pointer','data-branch-path','data-fallthrough-path','data-done-path','data-jump-instruction','data-jump-rule'])svg.queries[`[${name}]`]=new Element();
for(const name of ['green','muted']){const marker=new Element();marker.id=`unique-${name}`;svg.queries[`[data-jump-marker="${name}"]`]=marker;}
const flags=['sf','of','cf','zf'].map(name=>{const flag=new Element();flag.dataset.orderFlag=name;return flag;});svg.queries['[data-order-flag]']=flags;
const opcode=new Element();opcode.queries.text=new Element();svg.queries['[data-jump-opcode]']=opcode;
const window={};vm.runInNewContext(fs.readFileSync(source,'utf8'),{window,document:{createElement:()=>new Element()},Event:class{constructor(type){this.type=type;}}});
const api=window.LectureWidgets['conditional-jump'](host),controls=host.children[1];
assert.equal(readouts.eax.textContent,'FFFFFFFF');assert.equal(readouts.ebx.textContent,'00000001');assert.equal(opcode.dataset.byte,'7C');
api.step();for(const [name,value] of [['zf','0'],['cf','0'],['sf','1'],['of','0']])assert.equal(readouts[name].textContent,value);
assert.deepEqual(flags.filter(flag=>flag.classList.contains('order-flag-active')).map(flag=>flag.dataset.orderFlag),['sf','of']);
api.step();assert.equal(readouts.rip.textContent,'0x40100B');api.step();assert.equal(readouts.ecx.textContent,'1');
api.step();assert.equal(readouts.rip.textContent,'0x401010');assert.equal(controls.querySelector('[data-step]').disabled,true);
api.back();assert.equal(readouts.ecx.textContent,'—');api.reset();assert.equal(operation.value,'jl');assert.equal(readouts.sf.textContent,'—');
operation.value='jb';operation.listeners.change();assert.equal(opcode.dataset.byte,'72');assert.ok(opcode.dataset.byteHint.includes('CF = 1'));
api.step();assert.deepEqual(flags.filter(flag=>flag.classList.contains('order-flag-active')).map(flag=>flag.dataset.orderFlag),['cf']);
assert.equal(readouts.sf.textContent,'1');assert.equal(readouts.cf.textContent,'0');
api.step();assert.equal(readouts.rip.textContent,'0x401004');api.step();api.step();assert.equal(readouts.ecx.textContent,'0');
assert.equal(readouts.eax.textContent,'FFFFFFFF');assert.equal(readouts.ebx.textContent,'00000001');
api.reset();assert.equal(operation.value,'jb');assert.equal(readouts.zf.textContent,'—');
assert.ok(diagram.events.every(type=>type==='byte-hints-reset'));
console.log('JL/JB: identical CMP flags, 32-bit result, both routes, immutable operands, 7C/72 descriptions, used-flag highlighting, back/reset/end and hint closing passed.');
