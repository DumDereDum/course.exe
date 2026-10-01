window.LectureWidgets = window.LectureWidgets || {};
window.LectureWidgets.endian = host => {
  const value = BigInt(host.dataset.value || '0x12345678');
  const width = host.dataset.width === '64' ? 64 : 32;
  const bytes = BigInt.asUintN(width,value).toString(16).padStart(width/4,'0').match(/../g).map(s=>s.toUpperCase());
  const row = host.querySelector('[data-memory]');
  let big = false;
  function render() {
    const shown=big?bytes:[...bytes].reverse();
    row.replaceChildren();
    shown.forEach((byte,i)=>{const cell=document.createElement('div');cell.className='memory-cell';cell.innerHTML=`<span class="address">адрес +${i}</span><span class="byte">${byte}</span>`;row.append(cell);});
    host.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='be')===big)));
    host.querySelector('[data-readout]').textContent='0x'+bytes.join('');
    host.querySelector('[data-endian-caption]').textContent=big?'Big-endian: по меньшему адресу лежит старший байт — '+bytes[0]+'.':'Little-endian: по меньшему адресу лежит младший байт — '+bytes[bytes.length-1]+'.';
  }
  const api={step(){big=!big;render();},back(){big=!big;render();},reset(){big=false;render();}};
  host.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{big=b.dataset.mode==='be';render();}));
  render();return api;
};
