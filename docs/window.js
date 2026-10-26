// Easter Egg: Die Ampel in der Titelleiste funktioniert wie unter macOS. Rot schließt das
// Fenster, Gelb legt es ins Dock, Grün (oder Doppelklick auf die Titelleiste) zoomt.
// Über das Dock-Icon kommt das Fenster zurück; nach dem Schließen als neues Fenster oben.
(() => {
  const root = document.documentElement;
  const term = document.querySelector('.term');
  const bar = term.querySelector('.bar');
  const motion = () => root.classList.contains('motion');

  const dock = document.createElement('div');
  dock.className = 'dock';
  dock.innerHTML = `<button type="button" class="dock-icon" aria-label="${root.lang === 'de' ? 'Terminal öffnen' : 'Open Terminal'}"><span aria-hidden="true">&gt;_</span></button>`;
  document.body.append(dock);
  const icon = dock.firstElementChild;

  let state = 'open';
  let busy = false;

  // transform-origin für einen Punkt im Viewport, umgerechnet aufs (seitenlange) Fenster
  const originAt = (x, y) => {
    const r = term.getBoundingClientRect();
    return `${x - r.left}px ${y - r.top}px`;
  };
  const visibleCenter = () => {
    const r = term.getBoundingClientRect();
    return originAt(r.left + r.width / 2, (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2);
  };
  const dockSpot = () => {
    const r = icon.getBoundingClientRect();
    return originAt(r.left + r.width / 2, innerHeight - 40);
  };

  const run = async (keyframes, origin, duration, easing, fill) => {
    if (!motion()) return null;
    term.style.transformOrigin = origin;
    const anim = term.animate(keyframes, { duration, easing, fill });
    await anim.finished;
    term.style.transformOrigin = '';
    return anim;
  };

  const hide = async (next, keyframes, origin, duration, easing) => {
    if (state !== 'open' || busy) return;
    busy = true;
    if (next === 'min') root.classList.add('win-docked');
    const anim = await run(keyframes, origin, duration, easing, 'forwards');
    root.classList.add('win-hidden', 'win-docked');
    anim?.cancel();
    icon.focus({ preventScroll: true });
    state = next;
    busy = false;
  };

  const close = () => hide('closed',
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.94)' }],
    visibleCenter(), 200, 'ease-in');

  const minimize = () => hide('min',
    [{ opacity: 1, transform: 'none' }, { opacity: 0.6, offset: 0.7 }, { opacity: 0, transform: 'scale(0.02)' }],
    dockSpot(), 450, 'cubic-bezier(0.55, 0, 0.8, 0.3)');

  const restore = async () => {
    if (state === 'open' || busy) return;
    busy = true;
    if (motion()) {
      icon.animate(
        [{ transform: 'none' }, { transform: 'translateY(-16px)', offset: 0.4 }, { transform: 'none' }],
        { duration: 420, easing: 'ease-out' },
      );
    }
    const wasClosed = state === 'closed';
    if (wasClosed) scrollTo(0, 0);
    root.classList.remove('win-hidden', 'win-docked');
    if (wasClosed) {
      await run([{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }],
        visibleCenter(), 240, 'ease-out', 'backwards');
    } else {
      await run([{ opacity: 0, transform: 'scale(0.02)' }, { opacity: 1, transform: 'none' }],
        dockSpot(), 420, 'cubic-bezier(0.2, 0.7, 0.45, 1)', 'backwards');
    }
    state = 'open';
    busy = false;
  };

  const zoom = () => {
    const toggle = () => root.classList.toggle('win-zoom');
    if (motion() && document.startViewTransition) document.startViewTransition(toggle);
    else toggle();
  };

  bar.querySelector('.close').addEventListener('click', close);
  bar.querySelector('.min').addEventListener('click', minimize);
  bar.querySelector('.zoom').addEventListener('click', zoom);
  bar.addEventListener('dblclick', (e) => { if (!e.target.closest('a, button')) zoom(); });
  icon.addEventListener('click', restore);
})();
