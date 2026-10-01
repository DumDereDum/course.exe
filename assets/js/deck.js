/* Presentation shell. Widget factories register in window.LectureWidgets. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const slides = [...document.querySelectorAll('.slide')];
  if (!slides.length) return;
  const factories = window.LectureWidgets || {};
  const widgets = new Map();
  slides.forEach(slide => {
    const host = slide.querySelector('[data-widget]');
    if (host && factories[host.dataset.widget]) widgets.set(slide, factories[host.dataset.widget](host));
  });
  let current = 0;
  const pad = n => String(n).padStart(2,'0');
  function go(n, writeHash = true) {
    if (n < 0 || n >= slides.length) return;
    const old = slides[current];
    if (n !== current && old.contains(document.activeElement)) document.activeElement.blur();
    current = n;
    slides.forEach((slide,i) => {
      slide.classList.toggle('active', i === n);
      slide.inert = i !== n;
      slide.setAttribute('aria-hidden', String(i !== n));
    });
    $('#counter').textContent = `${pad(n+1)} / ${pad(slides.length)}`;
    $('#progress').style.width = `${(n+1) / slides.length * 100}%`;
    $('[data-prev]').disabled = n === 0;
    $('[data-next]').disabled = n === slides.length-1;
    $('#interaction-hint').textContent = widgets.has(slides[n]) ? 'Пробел — шаг · Shift + пробел — назад · R — сброс' : '← → слайды';
    if (writeHash) {
      try { history.replaceState(null, '', '#' + slides[n].id); }
      catch { location.hash = slides[n].id; }
    }
  }
  function fromHash() {
    const index = slides.findIndex(slide => '#' + slide.id === location.hash);
    go(index >= 0 ? index : 0, false);
  }
  function dialog(id) {
    const el = document.getElementById(id);
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    el.showModal();
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { $('[data-fullscreen]').textContent = 'Полный экран — через браузер'; }
  }
  $('[data-prev]').addEventListener('click', () => go(current-1));
  $('[data-next]').addEventListener('click', () => go(current+1));
  $('[data-fullscreen]').addEventListener('click', fullscreen);
  document.querySelectorAll('[data-dialog]').forEach(b => b.addEventListener('click', () => dialog(b.dataset.dialog)));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey || e.target.closest('input,textarea,select,[contenteditable="true"],iframe') || document.querySelector('dialog[open]')) return;
    const key = e.key.toLowerCase(), widget = widgets.get(slides[current]);
    if ([' ','enter'].includes(key) && e.target.closest('a,button,summary')) return;
    if (key === 'arrowright' || key === 'pagedown') {e.preventDefault();go(current+1);}
    else if (key === 'arrowleft' || key === 'pageup') {e.preventDefault();go(current-1);}
    else if (key === ' ') {
      e.preventDefault(); if (e.repeat) return;
      if (widget) e.shiftKey ? widget.back() : widget.step();
      else go(current + (e.shiftKey ? -1 : 1));
    } else if (key === 'r' && widget) {e.preventDefault();widget.reset();}
    else if (key === 'f') {e.preventDefault();fullscreen();}
    else if (key === '?') {e.preventDefault();dialog('help');}
  });
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
