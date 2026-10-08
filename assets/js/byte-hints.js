/* Optional byte descriptions on SVG diagrams; independent of sequence state. */
(() => {
  document.querySelectorAll('.byte-diagram').forEach((host, index) => {
    const svg = host.querySelector('svg');
    const tip = document.createElement('div');
    tip.className = 'byte-tooltip';
    tip.id = `byte-tooltip-${index}`;
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    host.append(tip);
    let active = null;

    function hide() {
      if (active) {
        active.classList.remove('byte-selected');
        active.removeAttribute('aria-describedby');
      }
      active = null;
      tip.hidden = true;
    }

    function position() {
      if (!active || tip.hidden) return;
      const bounds = host.getBoundingClientRect();
      const target = active.getBoundingClientRect();
      const gap = bounds.width * 0.009;
      const width = tip.offsetWidth;
      const height = tip.offsetHeight;
      let left = target.left - bounds.left + target.width / 2 - width / 2;
      left = Math.max(gap, Math.min(left, bounds.width - width - gap));
      let top = target.bottom - bounds.top + gap;
      if (top + height > bounds.height - gap) top = target.top - bounds.top - height - gap;
      top = Math.max(gap, Math.min(top, bounds.height - height - gap));
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    }

    function show(byte) {
      if (byte !== active) hide();
      active = byte;
      active.classList.add('byte-selected');
      active.setAttribute('aria-describedby', tip.id);
      const hex = byte.dataset.byte;
      const digits = [...hex];
      const bits = digits.map(digit => parseInt(digit, 16).toString(2).padStart(4, '0'));
      const table = document.createElement('table');
      table.className = 'byte-bits';
      table.setAttribute('aria-label', `Байт ${hex}: ${bits.join(' ')} в двоичной системе`);
      const body = document.createElement('tbody');
      for (const [label, values] of [['HEX', digits], ['BIN', bits]]) {
        const row = document.createElement('tr');
        const heading = document.createElement('th');
        heading.scope = 'row';
        heading.textContent = label;
        row.append(heading);
        for (const value of values) {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        }
        body.append(row);
      }
      table.append(body);
      const description = document.createElement('p');
      description.className = 'byte-description';
      description.textContent = byte.dataset.byteHint;
      tip.replaceChildren(table, description);
      tip.hidden = false;
      position();
    }

    function byteAt(target) {
      const byte = target instanceof Element ? target.closest('[data-byte-hint]') : null;
      return byte && svg.contains(byte) ? byte : null;
    }

    svg.addEventListener('pointerover', event => {
      const byte = byteAt(event.target);
      if (byte) show(byte);
    });
    svg.addEventListener('pointerout', event => {
      if (active && !active.contains(event.relatedTarget)) hide();
    });
    svg.addEventListener('focusin', event => {
      const byte = byteAt(event.target);
      if (byte) show(byte);
    });
    svg.addEventListener('focusout', hide);
    svg.addEventListener('click', event => {
      const byte = byteAt(event.target);
      if (byte) show(byte);
    });
    svg.addEventListener('keydown', event => {
      if (event.key === 'Escape') hide();
    });
    window.addEventListener('resize', position);
    host.addEventListener('byte-hints-reset', hide);
    // A step, reset or slide change must never leave the previous hint visible.
    const frame = host.closest('[data-frame]');
    if (frame) new MutationObserver(hide).observe(frame, {
      attributes: true, attributeFilter: ['inert', 'aria-hidden', 'class']
    });
    const slide = host.closest('.slide');
    if (slide) new MutationObserver(hide).observe(slide, {
      attributes: true, attributeFilter: ['inert', 'aria-hidden', 'class']
    });
  });
})();
