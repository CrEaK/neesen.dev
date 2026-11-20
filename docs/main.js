// Terminal-Animation: Die Befehle tippen sich nacheinander ein, sobald sie ins Bild scrollen.
// Die Ausgaben stehen von Anfang an da, damit Screenreader, die Suche im Browser und
// Hintergrund-Tabs alles sehen. Ein Klick oder Tastendruck tippt sofort alles fertig.
// Läuft nur mit .motion; ohne JS oder bei reduzierter Bewegung steht alles sofort da.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;

  let skipped = false;
  let skip;
  const skipping = new Promise((resolve) => { skip = resolve; });
  const finish = () => { skipped = true; skip(); };
  addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });

  const sleep = (ms) => Promise.race([skipping, new Promise((resolve) => setTimeout(resolve, ms))]);

  // Wartet, bis der Block im Bild ist (oder schon darüber hinweggescrollt wurde)
  const reached = (el) => Promise.race([skipping, new Promise((resolve) => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        io.disconnect();
        resolve();
      }
    }, { rootMargin: '0px 0px -60px 0px' });
    io.observe(el);
  })]);

  // Vorbereiten: Der volle Befehl bleibt für Screenreader stehen, sichtbar wird er getippt.
  // Die Mindestbreite hält die Zeile beim Tippen ruhig.
  const cursor = document.querySelector('.end .cursor');
  const jobs = [...document.querySelectorAll('.block .cmd')].map((cmd) => {
    const text = cmd.textContent;
    const full = document.createElement('span');
    full.className = 'sr-only';
    full.textContent = text;
    const typed = document.createElement('span');
    typed.setAttribute('aria-hidden', 'true');
    cmd.replaceChildren(full, typed);
    cmd.style.minWidth = `${text.length}ch`;
    return { block: cmd.closest('.block'), typed, text };
  });
  if (jobs.length) jobs[0].typed.after(cursor);

  const type = async ({ typed, text }) => {
    typed.after(cursor);
    for (let i = 1; i <= text.length && !skipped; i++) {
      typed.textContent = text.slice(0, i);
      await sleep(18 + Math.random() * 30);
    }
    typed.textContent = text;
    await sleep(150);
  };

  (async () => {
    await sleep(300);
    for (const job of jobs) {
      await reached(job.block);
      if (skipped || job.block.getBoundingClientRect().bottom < 0) job.typed.textContent = job.text;
      else await type(job);
      job.block.querySelector('.wave')?.classList.add('go');
    }
    document.querySelector('.end .prompt').append(cursor);
  })();
})();
