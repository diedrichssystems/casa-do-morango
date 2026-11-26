// o CSS do site entra por <link> no index.html (antes vinha por aqui e a página aparecia sem estilo por ~0,5 s no modo dev)
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/*
  Movimento: regras de tempo da skill claude-animation levadas para a web.
  - "Snap, then hold": a mudança é rápida e depois segura parada (cortina, rótulos, números).
  - Overshoot nos "pops" (back.out ~1.8–2): símbolo da abertura, etiquetas, passos, itens.
  - Sobreposição: as partes chegam em momentos diferentes (símbolo → letreiro → barra).
  - Uma coisa por vez: grupos entram em sequência, de 0,035 a 0,1 s entre itens.
  - Antecipação: antes de sair, o conteúdo da abertura desce um pouco e depois sobe.
  - Pausas com vida: a etiqueta do topo e o símbolo da chamada final "respiram" (±2–4 %).
*/

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => matchMedia('(max-width: 900px)').matches;

/* ---------- Rolagem suave ---------- */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
if (import.meta.env.DEV) window.__lenis = lenis;
const offsetFor = (el) => {
  if (!el) return -72;
  if (el.id === 'verduras') return 0;
  if (el.classList.contains('item')) return -Math.max(90, (innerHeight - el.offsetHeight) / 2);
  return -72;
};
const jumpTo = (el, smooth = true) => {
  if (!el) return;
  const y = el.id === 'inicio' ? 0 : el;
  if (lenis) lenis.scrollTo(y, smooth ? { offset: offsetFor(el), duration: 1.3 } : { offset: offsetFor(el), immediate: true, force: true });
  else if (y === 0) scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  else el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
};

/* ---------- Header, progresso e link ativo ---------- */
const hdr = $('[data-hdr]');
const bar = $('.progress i');
let lastY = 0;
const onScroll = () => {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  hdr.classList.toggle('is-solid', y > 30);
  if (!root.classList.contains('menu-open')) {
    if (y > 500 && y > lastY + 4) hdr.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 500) hdr.classList.remove('is-hidden');
  }
  lastY = y;
  // some no fim da página para não cobrir o rodapé (crédito da DS)
  wa.classList.toggle('is-on', y > 400 && y < max - 140);
  if (y > 400 && !waTipShown) { waTipShown = true; setTimeout(() => wa.classList.add('is-tip'), 900); setTimeout(() => wa.classList.remove('is-tip'), 7000); }
};
const wa = $('[data-wa-float]');
let waTipShown = false;
window.addEventListener('scroll', onScroll, { passive: true });

$$('main section[id]').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 45%', end: 'bottom 45%',
    onToggle: (s) => { if (s.isActive) $$('.hdr__nav a').forEach((a) => a.classList.toggle('is-active', a.hash === `#${sec.id}`)); },
  });
});

/* ---------- Menu em tela cheia ---------- */
const burger = $('[data-burger]');
const menu = $('[data-menu]');
const setMenu = (open) => {
  root.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menu.setAttribute('aria-hidden', String(!open));
  menu.inert = !open;
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) hdr.classList.remove('is-hidden');
};
menu.inert = true;
burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });

/* ---------- Cortina (entre seções e para abrir/fechar o catálogo) ---------- */
const curtain = $('.curtain');
const cPanel = $('.curtain__panel');
const cLabel = $('.curtain__label');
const cSym = $('.curtain__sym');
let busy = false;
// sobe cobrindo a tela, mostra o rótulo, roda "meio" com a tela coberta, segura e abre para cima
const curtainRun = (label, meio, depois) => {
  busy = true;
  curtain.classList.add('is-on');
  cLabel.textContent = label;
  gsap.timeline({ onComplete: () => { curtain.classList.remove('is-on'); busy = false; } })
    .fromTo(cPanel, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.62, ease: 'expo.inOut' })
    .fromTo(cSym, { scale: 0.3, rotation: -14, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.42, ease: 'back.out(2)' }, 0.36)
    .fromTo(cLabel, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }, 0.42)
    .add(meio, 0.7)
    .to([cSym, cLabel], { yPercent: -40, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.04 }, 1.05)
    .to(cPanel, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.75, ease: 'expo.inOut' }, 1.12)
    .set([cSym, cLabel], { yPercent: 0 })
    .add(() => depois && depois(), 1.5);
};
const curtainTo = (target, label) => {
  const menuWasOpen = root.classList.contains('menu-open');
  curtainRun(label, () => {
    if (menuWasOpen) setMenu(false);
    jumpTo(target, false);
    hdr.classList.remove('is-hidden');
  });
};

/* ---------- Catálogo: tela própria, aberta só pela lista de Produtos ---------- */
const catview = $('[data-catview]');
const catScroll = $('[data-catview-scroll]');
const items = $$('[data-items] .item');
const filterBtns = $$('[data-filters] button');
let catOpen = false;
catview.inert = true;
const showCat = (open) => {
  catOpen = open;
  catview.classList.toggle('is-open', open);
  catview.setAttribute('aria-hidden', String(!open));
  catview.inert = !open;
  root.classList.toggle('catview-open', open);
  if (lenis) open ? lenis.stop() : lenis.start();
};
function setFilter(cat, animate = true) {
  filterBtns.forEach((b) => { const on = b.dataset.filter === cat; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
  const show = items.filter((it) => cat === 'todos' || it.dataset.cat === cat);
  items.forEach((it) => { it.hidden = !show.includes(it); });
  if (animate && !reduce) {
    // entram um de cada vez, passando um pouco do ponto antes de assentar
    gsap.fromTo(show, { opacity: 0, y: 18, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.04, clearProps: 'transform,opacity' });
  }
}
filterBtns.forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.filter)));
let focusTimer;
function focusItem(it) {
  items.forEach((x) => x.classList.toggle('is-focus', x === it));
  if (!reduce) gsap.fromTo(it, { scale: 0.92 }, { scale: 1, duration: 0.7, ease: 'back.out(2.4)', clearProps: 'transform' });
  clearTimeout(focusTimer);
  focusTimer = setTimeout(() => it.classList.toggle('is-focus', false), 3200);
}
const placeCat = (item) => {
  catScroll.scrollTop = 0;
  if (item) catScroll.scrollTop = item.getBoundingClientRect().top - Math.max(96, (innerHeight - item.offsetHeight) / 2);
};
const openCatalog = (item) => {
  if (catOpen) { setFilter('todos', false); placeCat(item); if (item) focusItem(item); return; }
  history.pushState({ catalogo: 1 }, '', '#catalogo');
  const menuWasOpen = root.classList.contains('menu-open');
  const meio = () => {
    if (menuWasOpen) setMenu(false);
    setFilter('todos', false);
    showCat(true);
    placeCat(item);
    if (!reduce) gsap.fromTo(items, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.03, delay: 0.45, clearProps: 'transform,opacity' });
  };
  const depois = () => { if (item) focusItem(item); $('[data-catview-close]').focus({ preventScroll: true }); };
  if (reduce) { meio(); depois(); return; }
  curtainRun('Catálogo', meio, depois);
};
const closeCatalog = () => {
  if (!catOpen) return;
  const volta = () => { showCat(false); clearTimeout(focusTimer); items.forEach((x) => x.classList.remove('is-focus')); };
  if (reduce) { volta(); return; }
  curtainRun('Casa do Morango', volta, () => $('[data-pills] a')?.focus({ preventScroll: true }));
};
// "Voltar" usa o histórico, assim o botão voltar do celular também fecha o catálogo
$('[data-catview-close]').addEventListener('click', () => (history.state?.catalogo ? history.back() : closeCatalog()));
window.addEventListener('popstate', () => {
  const tryClose = () => (busy ? setTimeout(tryClose, 200) : closeCatalog());
  if (catOpen) tryClose();
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (busy) return;
  if (catview.contains(target)) { openCatalog(target.classList.contains('item') ? target : null); return; }
  history.replaceState(history.state, '', a.getAttribute('href') === '#inicio' ? location.pathname : a.getAttribute('href'));
  const label = a.dataset.label;
  if (!label || reduce) {
    if (root.classList.contains('menu-open')) setMenu(false);
    jumpTo(target, !reduce);
    return;
  }
  curtainTo(target, label);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && catOpen && !busy) $('[data-catview-close]').click(); });

/* ---------- Entrada do topo ---------- */
const heroLines = $$('.hero__title .line > span');
const heroFades = $$('[data-hero-in]');
const heroFrame = $('[data-hero-frame]');
const heroTag = $('[data-hero-tag]');
if (!reduce) {
  gsap.set(heroLines, { yPercent: 115 });
  gsap.set(heroFades, { opacity: 0, y: 22 });
  gsap.set(heroFrame, { clipPath: 'inset(100% 0% 0% 0% round 34px)' });
  gsap.set($('img', heroFrame), { scale: 1.28 });
  gsap.set(heroTag, { opacity: 0, scale: 0.6, y: 24 });
}
const heroIn = () => {
  if (reduce) return;
  gsap.timeline()
    .to(heroFrame, { clipPath: 'inset(0% 0% 0% 0% round 34px)', duration: 1.35, ease: 'expo.inOut' }, 0)
    .to($('img', heroFrame), { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.2)
    .to(heroLines, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.09 }, 0.15)
    .to(heroFades, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.45)
    .to(heroTag, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.9)' }, 1.05)
    .add(() => {
      // "respira" enquanto parada
      gsap.to(heroTag, { y: -6, duration: 1.65, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
};

/* ---------- Espera a página assentar antes de animar ----------
   A abertura travava no começo: o morango "estalava" enquanto o navegador ainda montava a página,
   ligava os ScrollTriggers, decodificava a foto do topo e recalculava tudo no evento load.
   Agora a animação só começa depois disso (com limite de 1,8 s para rede lenta). */
let carregou = document.readyState === 'complete';
let refrescado = false;
const pronto = () => new Promise((ok) => {
  const heroImg = $('img', heroFrame);
  const espera = [
    carregou ? 0 : new Promise((r) => addEventListener('load', r, { once: true })),
    document.fonts ? document.fonts.ready : 0,
    heroImg && heroImg.decode ? heroImg.decode().catch(() => 0) : 0,
  ];
  Promise.race([Promise.all(espera), new Promise((r) => setTimeout(r, 1800))]).then(() => {
    ScrollTrigger.refresh();
    refrescado = carregou;
    // dois quadros para o navegador pintar o resultado antes da primeira animação
    requestAnimationFrame(() => requestAnimationFrame(ok));
  });
});
addEventListener('load', () => {
  carregou = true;
  // sem abertura rodando, recalcula na hora; com abertura, recalcula no fim dela (se ainda faltar)
  if (!root.classList.contains('has-intro') && !refrescado) { ScrollTrigger.refresh(); refrescado = true; }
});

/* ---------- Abertura (primeiro acesso da sessão) ---------- */
if (root.classList.contains('has-intro')) {
  sessionStorage.setItem('cm-intro', '1');
  lenis && lenis.stop();
  window.scrollTo(0, 0);
  const sym = $('.intro__sym');
  const words = $$('.intro__line img');
  const count = $('.intro__count');
  const n = { v: 0 };
  gsap.set(sym, { scale: 0.2, y: 30, rotation: -14, opacity: 0, visibility: 'visible' });
  gsap.set(words, { yPercent: 115, visibility: 'visible' });
  const intro = gsap.timeline({
    paused: true,
    onComplete: () => {
      root.classList.remove('has-intro'); lenis && lenis.start(); onScroll();
      if (!refrescado) { ScrollTrigger.refresh(); refrescado = true; }
    },
  });
  pronto().then(() => intro.play());
  intro
    // símbolo: aparece pequeno e passa do ponto antes de assentar
    .fromTo(sym, { scale: 0.2, y: 30, rotation: -14, opacity: 0 }, { scale: 1, y: 0, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.9)' }, 0.1)
    .to(sym, { rotation: 5, duration: 0.14, ease: 'power2.out' }, 0.62)
    .to(sym, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, 0.76)
    // letreiro sobe de dentro da máscara, linha por linha
    .fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.11 }, 0.36)
    .to('.intro__bar i', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0.35)
    .to(n, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(n.v)).padStart(3, '0'); } }, 0.35)
    // antecipação: desce um pouco antes de sair
    .to('.intro__inner', { y: 10, duration: 0.18, ease: 'power2.out' }, 2.05)
    .to('.intro__inner', { y: -46, opacity: 0, duration: 0.45, ease: 'power3.in' }, 2.23)
    .fromTo('.intro__wipe', { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' }, 2.3)
    .set('.intro', { background: 'transparent' }, 3.0)
    .to('.intro__wipe', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, 3.0)
    .add(heroIn, 3.2);
} else {
  sessionStorage.setItem('cm-intro', '1');
  onScroll();
  pronto().then(heroIn);
}

/* ---------- Revelar ao rolar ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.transitionDelay = `${Math.min(Math.max(0, sibs.indexOf(el)), 6) * 0.08}s`;
    el.classList.add('is-in');
    io.unobserve(el);
  });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
$$('[data-reveal]').forEach((el) => io.observe(el));
// O recorte (clip-path) zera a área visível do próprio elemento, e aí o observador nunca dispara
// (nem a imagem "lazy" carrega). Por isso observa o elemento pai.
const clipIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    $$(':scope > [data-clip]', en.target).forEach((c) => c.classList.add('is-in'));
    clipIO.unobserve(en.target);
  });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
$$('[data-clip]').forEach((el) => clipIO.observe(el.parentElement));

/* ---------- Lista de produtos: um item de cada vez ---------- */
const pills = $$('[data-pills] li');
if (!reduce && pills.length) {
  gsap.set(pills, { opacity: 0, scale: 0.6, y: 14 });
  ScrollTrigger.create({
    trigger: '[data-pills]', start: 'top 88%', once: true,
    onEnter: () => gsap.to(pills, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.035, clearProps: 'transform' }),
  });
}

/* ---------- Como pedir: a linha se desenha e os números estalam ---------- */
const stepsPath = $('[data-steps-path]');
const stepNums = $$('[data-step] .step__n');
const steps = $$('[data-step]');
if (!reduce) {
  if (!mobile()) {
    gsap.fromTo(stepsPath, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '[data-steps]', start: 'top 72%', end: 'top 30%', scrub: 0.5 } });
  }
  gsap.set(stepNums, { scale: 0.4, opacity: 0 });
  gsap.set(steps.map((s) => [...s.children].slice(1)).flat(), { opacity: 0, y: 16 });
  steps.forEach((s, i) => {
    ScrollTrigger.create({
      trigger: s, start: mobile() ? 'top 82%' : 'top 70%', once: true,
      onEnter: () => {
        const d = mobile() ? 0 : i * 0.22;
        gsap.to($('.step__n', s), { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)', delay: d });
        gsap.to([...s.children].slice(1), { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, delay: d + 0.12 });
      },
    });
  });
}

/* ---------- Chamada final: símbolo estala e respira ---------- */
const ctaSym = $('[data-cta-sym]');
if (!reduce && ctaSym) {
  gsap.set(ctaSym, { scale: 0.3, rotation: -16, opacity: 0 });
  ScrollTrigger.create({
    trigger: ctaSym, start: 'top 85%', once: true,
    onEnter: () => gsap.timeline()
      .to(ctaSym, { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)' })
      .to(ctaSym, { scale: 1.04, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
  });
}

/* ---------- Horário: destaca o dia de hoje (fuso de Araguaína) ---------- */
try {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Araguaina', weekday: 'short' }).format(new Date());
  const day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
  $(`[data-hours] tr[data-day="${day}"]`)?.classList.add('is-today');
} catch (_) { /* navegador sem fuso: fica sem destaque */ }

/* ---------- Ano no rodapé ---------- */
$$('[data-year]').forEach((s) => { s.textContent = new Date().getFullYear(); });

// (recalculo dos ScrollTriggers: ver "Espera a página assentar")
