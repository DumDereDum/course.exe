/* Nested topic folders, embedded by build.py. Works without requests. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const plural = (n, forms) => forms[n % 100 >= 11 && n % 100 <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2];
  function parse(ul) {
    return [...ul.children].map(li => ({
      ...li.dataset,
      children: li.querySelector('ul') ? parse(li.querySelector('ul')) : []
    }));
  }
  const root = {name: 'LECTURES', code: 'LECTURES', kind: 'dir', children: parse($('#catalog-data'))};
  const stack = [root], selection = [0];
  const list = $('#file-list');
  let selected = 0;
  const current = () => stack[stack.length - 1];
  const item = () => current().children[selected];

  function updateAction() {
    const entry = item(), link = $('#file-open');
    link.hidden = !entry;
    link.href = entry?.href || '#';
    link.textContent = entry?.kind === 'lecture' ? 'Открыть лекцию ↵' : 'Открыть папку ↵';
  }
  function choose(index, focus = false) {
    selected = index;
    [...list.children].forEach((row, i) => {
      row.classList.toggle('selected', i === index);
      row.setAttribute('aria-selected', String(i === index));
      row.tabIndex = i === index ? 0 : -1;
    });
    updateAction();
    if (focus && list.children[index]) list.children[index].focus();
  }
  function open() {
    const entry = item();
    if (!entry) return;
    if (entry.kind === 'lecture') { location.href = entry.href; return; }
    selection[stack.length - 1] = selected;
    stack.push(entry);
    selected = 0;
    render();
  }
  function up() {
    if (stack.length < 2) return;
    stack.pop();
    selected = selection[stack.length - 1] || 0;
    render();
  }
  function render() {
    list.replaceChildren();
    $('#fs-path').textContent = 'C:\\' + stack.map(folder => folder.code || folder.name).join('\\');
    $('#folder-up').disabled = stack.length === 1;
    current().children.forEach((entry, index) => {
      const row = document.createElement('button');
      row.className = 'file-row';
      row.setAttribute('role', 'option');
      const icon = document.createElement('span');
      icon.className = 'file-icon ' + (entry.kind === 'dir' ? 'folder' : 'document');
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = entry.name;
      const description = document.createElement('span');
      description.className = 'file-description';
      description.textContent = entry.desc || '';
      text.append(name, description);
      const tag = document.createElement('span');
      tag.className = 'file-tag';
      tag.textContent = entry.kind === 'dir' ? 'DIR' : `${entry.count} ${plural(Number(entry.count), ['слайд', 'слайда', 'слайдов'])}`;
      row.append(icon, text, tag);
      row.addEventListener('click', () => choose(index));
      row.addEventListener('dblclick', open);
      list.append(row);
    });
    const count = current().children.length;
    $('#folder-status').textContent = count ? `${count} ${plural(count, ['объект', 'объекта', 'объектов'])}` : 'В этой папке пока нет лекций';
    choose(selected);
  }
  $('#file-open').addEventListener('click', event => {
    if (item()?.kind !== 'lecture') { event.preventDefault(); open(); }
  });
  $('#folder-up').addEventListener('click', up);
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const count = current().children.length;
      if (count) choose((selected + (event.key === 'ArrowUp' ? -1 : 1) + count) % count, true);
    } else if (['ArrowLeft', 'Backspace', 'Escape'].includes(event.key)) {
      event.preventDefault(); up();
    } else if (event.key === 'Enter' && (!event.target.closest('a,button') || event.target.closest('.file-row'))) {
      event.preventDefault(); open();
    }
  });
  $('#home-fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { $('#home-fullscreen').textContent = 'Полный экран — через браузер'; }
  });
  render();
})();
