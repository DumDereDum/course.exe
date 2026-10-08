/* Path semantics and the real widget's step/back/reset/input handling. No DOM dependency. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = path.join(__dirname, '../assets/js/widgets/conditional-jump.js');
const {trace, addresses} = require(source);

for (const [a,b] of [[7,7],[7,3],[3,7],[0,0],[0,99],[99,0]]) {
  for (const operation of ['je','jne']) {
    const states = trace(a,b,operation);
    const final = states.at(-1);
    const taken = operation === 'je' ? a === b : a !== b;
    assert.equal(final.ecx, Number(taken));
    assert.equal(final.zf, Number(a === b));
    assert.equal(addresses[final.pc], 0x401010);
    assert.deepEqual(states.map(state => addresses[state.pc]), taken
      ? [0x401000,0x401002,0x40100b,0x401010]
      : [0x401000,0x401002,0x401004,0x401009,0x401010]);
    assert.equal(final.executed.includes(4), taken);
    assert.equal(final.executed.includes(2), !taken);
    assert.ok(states.slice(1).every(state => state.zf === final.zf));
  }
}
for (const invalid of [-1,100,1.5,NaN]) assert.throws(() => trace(invalid,7,'je'), RangeError);

class Element {
  constructor() {
    this.dataset = {}; this.attrs = {}; this.queries = {}; this.listeners = {}; this.children = [];
    this._value = ''; this._text = ''; this.disabled = false; this.events = [];
    const classes = new Set();
    this.classList = {toggle(name,on){on ? classes.add(name) : classes.delete(name);},contains:name => classes.has(name)};
  }
  set value(value){this._value=String(value);} get value(){return this._value;}
  set textContent(value){this._text=String(value);} get textContent(){return this._text;}
  set innerHTML(value){for(const selector of ['[data-back]','[data-step]','[data-reset]','.widget-count'])this.queries[selector]=new Element();}
  querySelector(selector){if(!this.queries[selector])throw new Error(`Missing selector ${selector}`);return this.queries[selector];}
  querySelectorAll(selector){return this.queries[selector] || [];}
  setAttribute(name,value){this.attrs[name]=String(value);}
  append(...children){this.children.push(...children);}
  addEventListener(name,listener){this.listeners[name]=listener;}
  dispatchEvent(event){this.events.push(event.type);return true;}
}
const host = new Element(), diagram = new Element(), svg = new Element();
const inputA = new Element(), inputB = new Element(), operation = new Element();
inputA.value=7; inputB.value=7; operation.value='je';
host.queries = {'[data-eax]':inputA,'[data-ebx]':inputB,'[data-jump-operation]':operation,'.byte-diagram':diagram};
diagram.queries.svg=svg;
const rows = Array.from({length:6},()=>new Element());
svg.queries['[data-jump-row]']=rows;
const readouts = {};
for(const name of ['rip','eax','ebx','zf','ecx'])svg.queries[`[data-jump-${name}]`]=readouts[name]=new Element();
for(const name of ['data-jump-pointer','data-branch-path','data-fallthrough-path','data-done-path','data-jump-instruction','data-jump-rule'])svg.queries[`[${name}]`]=new Element();
for(const name of ['green','muted']){const marker=new Element();marker.id=`unique-${name}`;svg.queries[`[data-jump-marker="${name}"]`]=marker;}
const opcode = new Element();opcode.queries.text=new Element();svg.queries['[data-jump-opcode]']=opcode;
const window = {};
vm.runInNewContext(fs.readFileSync(source,'utf8'), {window, document:{createElement:()=>new Element()}, Event:class{constructor(type){this.type=type;}}});
const api = window.LectureWidgets['conditional-jump'](host);
const caption=host.children[0], controls=host.children[1];
assert.equal(readouts.rip.textContent,'0x401000');assert.equal(readouts.zf.textContent,'—');
api.step();assert.equal(readouts.zf.textContent,'1');
api.step();assert.equal(readouts.rip.textContent,'0x40100B');assert.ok(rows[4].classList.contains('jump-current'));
api.step();assert.equal(readouts.ecx.textContent,'1');assert.equal(controls.querySelector('[data-step]').disabled,true);
api.step();assert.equal(readouts.rip.textContent,'0x401010');
api.back();assert.equal(readouts.ecx.textContent,'—');assert.equal(readouts.rip.textContent,'0x40100B');
api.reset();assert.equal(inputA.value,'7');assert.equal(readouts.zf.textContent,'—');
inputB.value=3;inputB.listeners.input();assert.equal(readouts.rip.textContent,'0x401000');assert.equal(readouts.ebx.textContent,'3');
for(let i=0;i<4;i++)api.step();assert.equal(readouts.ecx.textContent,'0');assert.ok(rows[4].classList.contains('jump-skipped'));
operation.value='jne';operation.listeners.change();assert.equal(opcode.dataset.byte,'75');assert.ok(opcode.dataset.byteHint.includes('ZF = 0'));
assert.equal(svg.querySelector('[data-jump-instruction]').textContent,'jne yes');
for(let i=0;i<3;i++)api.step();assert.equal(readouts.ecx.textContent,'1');
inputA.value=3;inputA.listeners.input();for(let i=0;i<4;i++)api.step();assert.equal(readouts.ecx.textContent,'0');
inputA.value='';inputA.listeners.input();assert.equal(controls.querySelector('[data-step]').disabled,true);assert.ok(caption.textContent.includes('целые числа'));
api.reset();assert.equal(inputA.value,'3');assert.equal(readouts.rip.textContent,'0x401000');assert.equal(controls.querySelector('[data-step]').disabled,false);
assert.ok(diagram.events.length>10);assert.ok(diagram.events.every(name=>name==='byte-hints-reset'));
console.log('JE/JNE: 12 operand cases; correct addresses, both paths, ZF preservation, back/reset/end, input changes, 74/75 descriptions, invalid input and hint closing passed.');
