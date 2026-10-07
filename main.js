(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789<>/{}[]=+*#$%&';
  const rand = (s) => s[Math.floor(Math.random() * s.length)];

  /* ---------- Config: fill these in ---------- */
  const LINKS = {
    github: 'https://github.com/MarioRozic',
    linkedin: 'https://www.linkedin.com/in/mario-rozic/',
    repos: {
      dota2picker: 'https://github.com/MarioRozic/dota2picker',
      PathFinder: 'https://github.com/MarioRozic/PathFinder',
      telescope: 'https://github.com/MarioRozic/telescope',
    },
  };

  document.getElementById('year').textContent = new Date().getFullYear();
  document.querySelectorAll('[data-social]').forEach((a) => {
    a.href = LINKS[a.dataset.social] || '#';
    if (a.href !== location.href + '#') a.target = '_blank', a.rel = 'noopener';
  });
  document.querySelectorAll('[data-repo]').forEach((a) => {
    const u = LINKS.repos[a.dataset.repo];
    if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener'; }
    else a.addEventListener('click', (e) => e.preventDefault());
  });

  /* ---------- Matrix rain ---------- */
  const canvas = document.getElementById('rain');
  const ctx = canvas.getContext('2d');
  const FS = 16;
  let cols, drops, W, H, dpr;
  const mouse = { x: -999, y: -999 };

  function sizeRain() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / FS);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  }
  sizeRain();
  addEventListener('resize', sizeRain);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

  let last = 0;
  function rain(t) {
    requestAnimationFrame(rain);
    if (t - last < 42) return; // ~24fps looks right and is cheap
    last = t;
    ctx.fillStyle = 'rgba(5, 6, 10, 0.09)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${FS}px "JetBrains Mono", monospace`;
    for (let i = 0; i < cols; i++) {
      const x = i * FS, y = drops[i] * FS;
      const d = Math.hypot(x - mouse.x, y - mouse.y);
      if (d < 140) {
        ctx.fillStyle = d < 60 ? '#ffffff' : '#00e5ff';
        // push columns away from cursor a touch
        drops[i] += 0.5;
      } else {
        ctx.fillStyle = Math.random() > 0.975 ? '#c8ffe8' : '#00ff9c';
      }
      ctx.fillText(rand(CHARS), x, y);
      if (y > H && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
  }
  if (reduced) { ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H); } else requestAnimationFrame(rain);

  /* ---------- Text scramble ---------- */
  function scramble(el, finalText, dur = 900) {
    if (reduced) { el.textContent = finalText; return; }
    const start = performance.now();
    const len = finalText.length;
    (function frame(now) {
      const p = Math.min((now - start) / dur, 1);
      const fixed = Math.floor(p * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        const c = finalText[i];
        out += i < fixed || c === ' ' ? c : rand(CHARS);
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame); else el.textContent = finalText;
    })(start);
  }
  // headings keep their <span class="idx">, so scramble only the trailing text node
  function scrambleTitle(h) {
    const node = [...h.childNodes].reverse().find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!node) return;
    const finalText = node.textContent;
    const holder = document.createElement('span');
    node.replaceWith(holder);
    scramble(holder, finalText, 800);
  }
  document.querySelectorAll('[data-scramble-hover]').forEach((a) => {
    const txt = a.textContent;
    a.addEventListener('mouseenter', () => scramble(a, txt, 400));
  });

  /* ---------- Boot sequence ---------- */
  const bootEl = document.getElementById('boot');
  const bootText = document.getElementById('bootText');
  const lines = [
    '> initializing portfolio.sys',
    '> loading modules ............ [ok]',
    '> connecting to the matrix ... [ok]',
    '> user: mario.rozic',
    '> access granted',
  ];

  function bootSequence() {
    return new Promise((resolve) => {
      if (reduced || sessionStorage.getItem('booted')) { bootEl.remove(); return resolve(); }
      document.body.classList.add('booting');
      let i = 0;
      (function next() {
        if (i >= lines.length) {
          setTimeout(() => {
            sessionStorage.setItem('booted', '1');
            gsap.to(bootEl, { opacity: 0, duration: 0.6, onComplete: () => { bootEl.remove(); document.body.classList.remove('booting'); resolve(); } });
          }, 350);
          return;
        }
        bootText.textContent += lines[i++] + '\n';
        setTimeout(next, 260);
      })();
    });
  }

  /* ---------- Hero intro ---------- */
  function typeRoles(el) {
    const roles = ['frontend engineer', 'react + typescript', 'real-time systems', 'dashboards that scale', 'ai-assisted builder'];
    if (reduced) { el.textContent = roles[0]; return; }
    let r = 0, c = 0, del = false;
    (function tick() {
      const word = roles[r];
      el.textContent = word.slice(0, c);
      if (!del && c === word.length) { del = true; return setTimeout(tick, 1600); }
      if (del && c === 0) { del = false; r = (r + 1) % roles.length; }
      c += del ? -1 : 1;
      setTimeout(tick, del ? 35 : 75);
    })();
  }

  function heroIntro() {
    const name = document.getElementById('heroName');
    const text = name.dataset.text;
    const tl = gsap.timeline();
    tl.from('.eyebrow', { y: 20, opacity: 0, duration: 0.6 })
      .add(() => {
        scramble(name, text, 1200);
        name.classList.add('on');
        setTimeout(() => name.classList.remove('on'), 1300);
      }, '-=0.2')
      .from('.role', { opacity: 0, duration: 0.5 }, '+=0.5')
      .add(() => typeRoles(document.getElementById('typed')), '<')
      .from('.lead', { y: 20, opacity: 0, duration: 0.7 }, '-=0.1')
      .from('.cta .btn', { y: 20, opacity: 0, stagger: 0.12, duration: 0.6 }, '-=0.4')
      .from('.scroll-hint', { opacity: 0, duration: 0.6 }, '-=0.2');
    // occasional glitch
    setInterval(() => { name.classList.add('on'); setTimeout(() => name.classList.remove('on'), 400); }, 6000);
  }

  /* ---------- Scroll animations ---------- */
  function scrollAnims() {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

    // rain recedes after the hero so content stays readable
    gsap.to('#rain', { opacity: 0.28, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true } });
    gsap.to('.hero-inner', { y: -80, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    document.querySelectorAll('.reveal').forEach((el) => {
      gsap.from(el, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    document.querySelectorAll('.reveal-group').forEach((g) => {
      gsap.from(g.children, { y: 50, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 85%' } });
    });

    document.querySelectorAll('[data-scramble]').forEach((h) => {
      ScrollTrigger.create({ trigger: h, start: 'top 85%', once: true, onEnter: () => scrambleTitle(h) });
    });

    document.querySelectorAll('[data-count]').forEach((el) => {
      const end = +el.dataset.count, suffix = el.dataset.suffix || '';
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } }),
      });
    });

    gsap.to('.timeline .line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });

    gsap.to('.track', { xPercent: -8, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- Interactions ---------- */
  function interactions() {
    if (!finePointer || reduced) return;

    // 3D tilt + glare-free depth
    document.querySelectorAll('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotateY: x * 8, rotateX: -y * 8, transformPerspective: 900, duration: 0.4, ease: 'power2.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' }));
    });

    // magnetic buttons
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.25, duration: 0.3 });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }));
    });

    // custom cursor
    const cur = document.querySelector('.cursor');
    const qx = gsap.quickTo(cur, 'x', { duration: 0.18, ease: 'power3' });
    const qy = gsap.quickTo(cur, 'y', { duration: 0.18, ease: 'power3' });
    addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); });
    document.querySelectorAll('a, .tilt, .btn').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('big'));
      el.addEventListener('pointerleave', () => cur.classList.remove('big'));
    });
  }

  /* ---------- Go ---------- */
  addEventListener('load', async () => {
    if (!window.gsap) { bootEl.remove(); document.body.classList.remove('booting'); return; } // CDN blocked: static page still works
    await bootSequence();
    dispatchEvent(new Event('portfolio:ready'));
    scrollAnims();
    interactions();
    heroIntro();
  });
})();
