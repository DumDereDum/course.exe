/* TEST semantics, changing instruction sizes, real UI handlers, masks and byte hints. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=path.join(__dirname,'../assets/js/widgets/conditional-jump.js');
const {testTrace,testAddresses}=require(source);
assert.deepEqual(testAddresses('zero'),[0x401000,0x401002,0x401004,0x401009,0x40100b,0x401010]);
assert.deepEqual(testAddresses('bit'),[0x401000,0x401005,0x401007,0x40100c,0x40100e,0x401013]);
for(const a of [0,1,6,7,128,255])for(const mode of ['zero','bit']){
 const states=testTrace(a,mode),final=states.at(-1),passed=mode==='zero'?a===0:a%2===0;
 assert.equal(final.ecx,Number(passed));assert.equal(final.zf,Number(passed));assert.equal(final.cf,0);assert.equal(final.of,0);
 assert.equal(states[0].result,null);assert.equal(final.result,mode==='zero'?a:(passed?0:1));
 assert.deepEqual(final.executed,passed?[0,1,4]:[0,1,2,3]);assert.equal(final.pc,5);
 assert.ok(states.slice(1).every(state=>state.zf===final.zf&&state.cf===0&&state.of===0));
}
for(const a of [-1,256,1.5,NaN])assert.throws(()=>testTrace(a,'zero'),RangeError);
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
const host=new Element(),diagram=new Element(),svg=new Element(),input=new Element(),mode=new Element();
host.dataset.jumpKind='test';input.value=7;mode.value='zero';host.queries={'[data-eax]':input,'[data-test-mode]':mode,'.byte-diagram':diagram};diagram.queries.svg=svg;
const rows=Array.from({length:6},()=>{const row=new Element();row.queries['[data-jump-address]']=new Element();return row;});svg.queries['[data-jump-row]']=rows;
const readouts={};for(const name of ['rip','eax','zf','ecx'])svg.queries[`[data-jump-${name}]`]=readouts[name]=new Element();
for(const name of ['data-jump-pointer','data-branch-path','data-fallthrough-path','data-done-path','data-jump-instruction','data-jump-rule','data-test-instruction','data-test-target-label','data-test-mask-label','data-test-lsb','data-test-cf','data-test-of'])svg.queries[`[${name}]`]=new Element();
for(const name of ['green','muted']){const marker=new Element();marker.id=`unique-${name}`;svg.queries[`[data-jump-marker="${name}"]`]=marker;}
const opcode=new Element();opcode.queries.text=new Element();svg.queries['[data-jump-opcode]']=opcode;
const bytes=Array.from({length:5},()=>{const byte=new Element();byte.queries.text=new Element();return byte;});svg.queries['[data-test-byte]']=bytes;
for(const name of ['jz','jmp']){const offset=new Element();offset.dataset.byte=name==='jz'?'07':'05';svg.queries[`[data-test-${name}-offset]`]=offset;}
const bitrows={};for(const name of ['input','mask','result'])svg.queries[`[data-test-${name}-bit]`]=bitrows[name]=Array.from({length:8},()=>new Element());
const window={};vm.runInNewContext(fs.readFileSync(source,'utf8'),{window,document:{createElement:()=>new Element()},Event:class{constructor(type){this.type=type;}}});
const api=window.LectureWidgets['conditional-jump'](host),controls=host.children[1];
assert.equal(bytes[0].dataset.byte,'85');assert.equal(bytes[1].dataset.byte,'C0');assert.ok(bytes.slice(2).every(byte=>byte.attrs.display==='none'));
assert.equal(bitrows.input.map(bit=>bit.textContent).join(''),'00000111');assert.equal(bitrows.result.map(bit=>bit.textContent).join(''),'————————');
api.step();assert.equal(readouts.eax.textContent,'7');assert.equal(readouts.zf.textContent,'0');assert.equal(bitrows.result.map(bit=>bit.textContent).join(''),'00000111');
mode.value='bit';mode.listeners.change();assert.equal(readouts.rip.textContent,'0x401000');assert.equal(readouts.zf.textContent,'—');
assert.deepEqual(bytes.map(byte=>byte.dataset.byte),['A9','01','00','00','00']);assert.ok(bytes.every(byte=>byte.attrs.display==='inline'));
assert.equal(rows[1].querySelector('[data-jump-address]').textContent,'0x401005');assert.ok(svg.querySelector('[data-test-jz-offset]').dataset.byteHint.includes('0x40100E'));
assert.equal(bitrows.mask.map(bit=>bit.textContent).join(''),'00000001');assert.equal(svg.querySelector('[data-test-lsb]').attrs.display,'inline');
for(let i=0;i<4;i++)api.step();assert.equal(readouts.ecx.textContent,'0');assert.equal(readouts.eax.textContent,'7');assert.equal(readouts.rip.textContent,'0x401013');
api.back();assert.equal(readouts.rip.textContent,'0x40100C');
input.value=6;input.listeners.input();api.step();assert.equal(readouts.zf.textContent,'1');assert.equal(bitrows.result.map(bit=>bit.textContent).join(''),'00000000');
api.step();api.step();assert.equal(readouts.ecx.textContent,'1');assert.equal(readouts.eax.textContent,'6');
mode.value='zero';mode.listeners.change();assert.equal(svg.querySelector('[data-test-lsb]').attrs.display,'none');assert.ok(bytes.slice(2).every(byte=>byte.attrs.display==='none'));
input.value=0;input.listeners.input();api.step();api.step();api.step();assert.equal(readouts.ecx.textContent,'1');
input.value=256;input.listeners.input();assert.equal(controls.querySelector('[data-step]').disabled,true);api.reset();assert.equal(input.value,'0');assert.equal(readouts.zf.textContent,'—');
assert.ok(diagram.events.every(type=>type==='byte-hints-reset'));
console.log('TEST: 12 value/mode cases; AND, zero/parity, CF/OF, changed addresses and byte counts, mask bits, EAX preservation, back/reset/end and invalid input passed.');
