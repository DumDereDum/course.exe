/* Arbitrary prepared HTML frames: diagrams, command output, explanations. */
window.LectureWidgets = window.LectureWidgets || {};
window.LectureWidgets.sequence = host => {
  const frames = [...host.querySelectorAll('[data-frame]')];
  let current = 0;
  const controls = document.createElement('div');
  controls.className = 'widget-controls';
  controls.innerHTML = '<button class="btn" data-back>← Назад</button><button class="btn primary" data-step>Далее →</button><button class="btn" data-reset>Сброс</button><span class="widget-count"></span>';
  const caption = document.createElement('p'); caption.className = 'widget-status'; caption.setAttribute('aria-live','polite');
  host.append(caption, controls);
  function render() {
    frames.forEach((frame,i) => { frame.classList.toggle('current', i === current); frame.inert = i !== current; frame.setAttribute('aria-hidden', String(i !== current)); });
    caption.textContent = frames[current]?.dataset.caption || '';
    controls.querySelector('.widget-count').textContent = `${current+1} / ${frames.length}`;
    controls.querySelector('[data-back]').disabled = current === 0;
    controls.querySelector('[data-step]').disabled = current >= frames.length-1;
    controls.querySelector('[data-reset]').disabled = current === 0;
  }
  const api = {step(){current = Math.min(frames.length-1,current+1);render();},back(){current = Math.max(0,current-1);render();},reset(){current=0;render();}};
  controls.querySelector('[data-back]').addEventListener('click', api.back);
  controls.querySelector('[data-step]').addEventListener('click', api.step);
  controls.querySelector('[data-reset]').addEventListener('click', api.reset);
  render(); return api;
};
