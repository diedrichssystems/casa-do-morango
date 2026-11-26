// o CSS do site entra por <link> no index.html (antes vinha por aqui e a página aparecia sem estilo por ~0,5 s no modo dev)
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
root.classList.add('js');
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
const jumpTo = (el) => {
  const top = el.id === 'inicio' ? 0 : scrollY + el.getBoundingClientRect().top - hdr.offsetHeight;
  if (lenis) lenis.scrollTo(top, { duration: 0.75 });
  else window.scrollTo(0, top);
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
const pageContent = [$('main'), $('footer'), wa];
const setMenu = (open) => {
  root.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menu.inert = !open;
  menu.setAttribute('aria-hidden', String(!open));
  pageContent.forEach((el) => { el.inert = open; });
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) hdr.classList.remove('is-hidden');
};
menu.inert = true;
burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });

matchMedia('(min-width: 1081px)').addEventListener('change', (event) => {
  if (event.matches && root.classList.contains('menu-open')) setMenu(false);
});

/* ---------- Catálogo: tela própria, aberta só pela lista de Produtos ---------- */
const catview = $('[data-catview]');
const catScroll = $('[data-catview-scroll]');
const items = $$('[data-items] .item');
const filterBtns = $$('[data-filters] button');
let catOpen = false;
let catalogTrigger = null;
let returnScrollY = 0;
catview.inert = true;
const showCat = (open) => {
  catOpen = open;
  catview.classList.toggle('is-open', open);
  catview.inert = !open;
  catview.setAttribute('aria-hidden', String(!open));
  hdr.inert = open;
  pageContent.forEach((el) => { el.inert = open; });
  root.classList.toggle('catview-open', open);
  if (lenis) open ? lenis.stop() : lenis.start();
};
function setFilter(cat, animate = true) {
  filterBtns.forEach((b) => { const on = b.dataset.filter === cat; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
  const show = items.filter((it) => cat === 'todos' || it.dataset.cat === cat);
  items.forEach((it) => { it.hidden = !show.includes(it); });
  if (animate && !reduce) {
    gsap.fromTo(show, { opacity: 0.55, y: 6 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', stagger: 0.012, overwrite: true, clearProps: 'transform,opacity' });
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
function openCatalog(item) {
  if (root.classList.contains('menu-open')) setMenu(false);
  if (!catOpen) returnScrollY = scrollY;
  showCat(true);
  setFilter('todos', false);
  placeCat(item);
  if (item) focusItem(item);
  $('[data-catview-close]').focus({ preventScroll: true });
}

function closeCatalog() {
  showCat(false);
  clearTimeout(focusTimer);
  items.forEach((item) => item.classList.remove('is-focus'));
  // O navegador restaura a âncora depois de popstate. Recupera a posição da lista em seguida.
  requestAnimationFrame(() => {
    if (catOpen || !catalogTrigger) return;
    if (lenis) lenis.scrollTo(returnScrollY, { immediate: true, force: true });
    else window.scrollTo(0, returnScrollY);
    catalogTrigger.focus({ preventScroll: true });
  });
}

function returnFromCatalog() {
  if (history.state?.catalogo) history.back();
  else {
    history.replaceState(history.state, '', location.pathname + location.search);
    closeCatalog();
  }
}

function syncCatalog() {
  const target = document.getElementById(location.hash.slice(1));
  if (target && catview.contains(target)) {
    openCatalog(target.closest('.item'));
  } else if (catOpen) {
    closeCatalog();
  }
}

$('[data-catview-close]').addEventListener('click', returnFromCatalog);
window.addEventListener('popstate', syncCatalog);
syncCatalog();

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;
  event.preventDefault();
  if (catview.contains(target)) {
    catalogTrigger = link;
    history.pushState({ catalogo: true }, '', '#catalogo');
    openCatalog(target.closest('.item'));
    return;
  }
  if (root.classList.contains('menu-open')) setMenu(false);
  const homeUrl = location.pathname + location.search;
  history.replaceState(history.state, '', link.hash === '#inicio' ? homeUrl : link.hash);
  jumpTo(target);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && catOpen) returnFromCatalog();
});

onScroll();

/* ---------- Revelar ao rolar ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.transitionDelay = `${Math.min(Math.max(0, sibs.indexOf(el)), 6) * 0.045}s`;
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
