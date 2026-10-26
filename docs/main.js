// Terminal-Animation: Befehle tippen sich nacheinander, sobald sie ins Bild scrollen,
// danach erscheint die Ausgabe Zeile für Zeile. Läuft nur mit .motion; ohne JS oder bei
// reduzierter Bewegung steht alles sofort da.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const cursor = document.querySelector('.end .cursor');

  // Wartet, bis der Block im Bild ist (oder schon darüber hinweggescrollt wurde)
  const reached = (el) => new Promise((resolve) => {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        io.disconnect();
        resolve();
      }
    }, { rootMargin: '0px 0px -60px 0px' });
    io.observe(el);
  });

  // Zähler, z. B. 2000 → 2012 oder 0 → 4,8
  const counters = new Map([...document.querySelectorAll('[data-count]')].map((el) => {
    const to = parseFloat(el.dataset.count);
    const from = parseFloat(el.dataset.from || '0');
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const fmt = new Intl.NumberFormat(root.lang, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: false,
    });
    el.textContent = fmt.format(from);
    return [el, { to, from, fmt }];
  }));

  const countUp = (el) => {
    const { to, from, fmt } = counters.get(el);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / 1400, 1);
      el.textContent = fmt.format(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Vorbereiten: Befehle leeren, Ausgaben verstecken
  const jobs = [...document.querySelectorAll('.block')]
    .filter((block) => block.querySelector('.cmd'))
    .map((block) => {
      const cmd = block.querySelector('.cmd');
      const text = cmd.textContent;
      cmd.textContent = '';
      block.classList.add('pending');
      return { block, cmd, text };
    });

  const end = document.querySelector('.end');
  end.classList.add('pending');

  const type = async (block, cmd, text) => {
    block.classList.replace('pending', 'typing');
    cmd.after(cursor);
    for (let i = 1; i <= text.length; i++) {
      cmd.textContent = text.slice(0, i);
      await sleep(20 + Math.random() * 35);
    }
    await sleep(200);
  };

  // Ausgabe zeilenweise einblenden; Listen zählen pro Eintrag als Zeile
  const print = (block) => {
    block.classList.remove('typing');
    const out = block.querySelector('.out');
    const lines = out.matches('ul, ol')
      ? [...out.children]
      : [...out.children].flatMap((el) => (el.matches('ul, ol, dl') ? [...el.children] : [el]));
    lines.forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
      { duration: 280, delay: i * 45, easing: 'ease-out', fill: 'backwards' },
    ));
    return sleep(lines.length * 45 + 200);
  };

  (async () => {
    await sleep(350);
    for (const { block, cmd, text } of jobs) {
      await reached(block);
      if (block.getBoundingClientRect().bottom < 0) {
        // schon vorbeigescrollt: sofort fertig anzeigen
        cmd.textContent = text;
        block.classList.remove('pending');
      } else {
        await type(block, cmd, text);
        await print(block);
      }
      block.querySelectorAll('[data-count]').forEach(countUp);
      block.querySelector('.wave')?.classList.add('go');
    }
    end.querySelector('.prompt').append(cursor);
    end.classList.remove('pending');
  })();

  // App-Karte kippt leicht und leuchtet dort, wo die Maus ist
  if (matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.app').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 4}deg) rotateY(${(x - 0.5) * 4}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
})();
