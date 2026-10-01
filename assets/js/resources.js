/* External resources are explicit actions. Slide opening makes no network request. */
(() => {
  document.querySelectorAll('[data-download]').forEach(button=>button.addEventListener('click',event=>{
    const source=button.closest('.slide').querySelector(button.dataset.download);
    if(!source)return;
    event.preventDefault();
    const text=source.tagName==='TEMPLATE'?source.content.textContent:source.textContent;
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download=button.getAttribute('download')||'example.txt';link.hidden=true;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }));
  document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
    const source=button.closest('.slide').querySelector(button.dataset.copy);
    const status=button.parentElement.querySelector('.copy-status');
    if(!source)return;
    try {await navigator.clipboard.writeText(source.textContent);if(status)status.textContent='Скопировано';}
    catch {
      const range=document.createRange();range.selectNodeContents(source);
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      let copied=false;
      try {copied=document.execCommand('copy');} catch {}
      if(copied)selection.removeAllRanges();
      if(status)status.textContent=copied?'Скопировано':'Код выделен — нажмите Ctrl/Cmd + C';
    }
  }));
  document.querySelectorAll('[data-embed]').forEach(host=>{
    const button=host.querySelector('[data-load-embed]');
    if(!button)return;
    const initialNodes = [...host.childNodes];
    button.addEventListener('click',()=>{
      const url=new URL(host.dataset.src,location.href);
      if(!['http:','https:'].includes(url.protocol) && !(url.protocol === 'file:' && location.protocol === 'file:'))return;
      const iframe=document.createElement('iframe');iframe.title=host.dataset.title || 'Интерактивная демонстрация';iframe.referrerPolicy='no-referrer';iframe.src=url.href;
      host.replaceChildren(iframe);
      const close=document.createElement('button');close.className='btn';close.textContent='Закрыть демо';
      close.addEventListener('click',()=>{host.replaceChildren(...initialNodes);close.remove();button.focus();});
      host.after(close);
    });
  });
})();
