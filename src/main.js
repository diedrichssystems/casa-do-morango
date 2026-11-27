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
// celular e tablet: animações mais leves (sem recorte animado nem efeitos presos à rolagem)
const leve = matchMedia('(max-width: 900px), (pointer: coarse)').matches;

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
// com o menu ou o catálogo abertos, o resto da página não recebe foco nem toque
const pageContent = [$('main'), $('footer'), wa];
const setMenu = (open) => {
  root.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menu.setAttribute('aria-hidden', String(!open));
  menu.inert = !open;
  pageContent.forEach((el) => { el.inert = open; });
  if (lenis) open ? lenis.stop() : lenis.start();
  if (open) hdr.classList.remove('is-hidden');
};
menu.inert = true;
burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
$('[data-menu-shade]').addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });
// girou o tablet para a largura do computador com o menu aberto: fecha
matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches && root.classList.contains('menu-open')) setMenu(false); });

/* ---------- Cortina (entre seções e para abrir/fechar o catálogo) ---------- */
/*
  Duas camadas de faixas verticais (verde-oliva atrás, vinho na frente) sobem uma a uma, como persianas.
  O nome do destino entra letra por letra de dentro de uma máscara, com o símbolo estalando acima.
  Na saída, as letras sobem e somem em sequência, as faixas se recolhem para cima na mesma ordem
  e a página nova sobe 60 px até o lugar, dando profundidade (a antiga já tinha sido empurrada para cima).
*/
const curtain = $('.curtain');
const colsA = $$('.curtain__layer--a i');
const colsB = $$('.curtain__layer--b i');
const cLabel = $('.curtain__label');
const cSym = $('.curtain__sym');
const pageMain = $('main');
let busy = false;
const letras = (txt) => {
  cLabel.textContent = '';
  cLabel.setAttribute('aria-label', txt);
  return [...txt].map((ch) => {
    const s = document.createElement('span');
    s.textContent = ch === ' ' ? ' ' : ch;
    cLabel.appendChild(s);
    return s;
  });
};
// roda "meio" com a tela coberta; "sai" é o que estava na tela (empurrado para cima), "entra" o que aparece depois
const curtainRun = (label, meio, depois, { sai = pageMain, entra = pageMain } = {}) => {
  busy = true;
  curtain.classList.add('is-on');
  const ls = letras(label);
  const each = { each: 0.05, from: 'start' };
  gsap.set([...colsA, ...colsB], { scaleY: 0, transformOrigin: '50% 100%' });
  gsap.set(ls, { yPercent: 115, rotation: 8 });
  const tl = gsap.timeline({
    onComplete: () => {
      curtain.classList.remove('is-on'); busy = false;
      gsap.set([sai, entra].filter(Boolean), { clearProps: 'transform' });
    },
  });
  if (sai) tl.to(sai, { y: -50, duration: 0.7, ease: 'expo.in' }, 0);
  if (entra) tl.to(entra, { y: 0, duration: 1.1, ease: 'expo.out' }, 1.72);
  tl.to(colsA, { scaleY: 1, duration: 0.6, ease: 'expo.inOut', stagger: each }, 0)
    .to(colsB, { scaleY: 1, duration: 0.6, ease: 'expo.inOut', stagger: each }, 0.09)
    .fromTo(cSym, { scale: 0.3, rotation: -16, opacity: 0, yPercent: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }, 0.5)
    .to(ls, { yPercent: 0, rotation: 0, duration: 0.55, ease: 'back.out(1.6)', stagger: 0.028 }, 0.55)
    .add(() => { meio(); if (entra) gsap.set(entra, { y: 60 }); }, 0.82)
    // segura parado um instante para dar tempo de ler
    .to(ls, { yPercent: -115, duration: 0.38, ease: 'power3.in', stagger: 0.018 }, 1.3)
    .to(cSym, { yPercent: -60, opacity: 0, duration: 0.35, ease: 'power3.in' }, 1.34)
    .set([...colsA, ...colsB], { transformOrigin: '50% 0%' }, 1.5)
    .to(colsB, { scaleY: 0, duration: 0.7, ease: 'expo.inOut', stagger: each }, 1.5)
    .to(colsA, { scaleY: 0, duration: 0.7, ease: 'expo.inOut', stagger: each }, 1.6)
    .add(() => depois && depois(), 1.9);
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
let returnScrollY = 0;
catview.inert = true;
const showCat = (open) => {
  catOpen = open;
  catview.classList.toggle('is-open', open);
  catview.setAttribute('aria-hidden', String(!open));
  catview.inert = !open;
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
/* ---------- Pedido montado no catálogo ----------
   Cada produto ganha "Adicionar" e, depois, os botões − / +. A barra de baixo mostra o total e
   abre o WhatsApp com a lista já escrita, em vez de uma conversa por produto. */
const cart = new Map();
const cartBar = $('[data-cart]');
const cartN = $('[data-cart-n]');
const cartList = $('[data-cart-list]');
const cartSend = $('[data-cart-send]');
const nomeDe = (it) => $('.item__name', it).textContent.trim();
const desenhaQtd = (it) => {
  const q = cart.get(it.id) || 0;
  const box = $('[data-qty]', it);
  box.classList.toggle('has', q > 0);
  $('.qty__n', box).textContent = q;
  it.classList.toggle('in-cart', q > 0);
};
const desenhaCarrinho = () => {
  const linhas = items.filter((it) => cart.get(it.id)).map((it) => [nomeDe(it), cart.get(it.id)]);
  const total = linhas.reduce((t, [, q]) => t + q, 0);
  cartBar.classList.toggle('is-on', total > 0);
  catview.classList.toggle('has-cart', total > 0);
  cartN.textContent = `${total} ${total === 1 ? 'item' : 'itens'}`;
  cartList.textContent = linhas.map(([n]) => n).join(', ');
  const msg = 'Olá, Casa do Morango! 🍓 Quero fazer um pedido:\n\n' + linhas.map(([n, q]) => `• ${q} × ${n}`).join('\n') + '\n\nPode me confirmar a disponibilidade e o valor?';
  cartSend.href = 'https://wa.me/5563992594750?text=' + encodeURIComponent(msg);
};
const muda = (it, d) => {
  const q = Math.max(0, (cart.get(it.id) || 0) + d);
  if (q) cart.set(it.id, q); else cart.delete(it.id);
  desenhaQtd(it); desenhaCarrinho();
  if (!reduce && d > 0) gsap.fromTo($('.qty__n', it), { scale: 1.5 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
};
items.forEach((it) => {
  const nome = nomeDe(it);
  const box = document.createElement('div');
  box.className = 'qty'; box.dataset.qty = '';
  box.innerHTML = `<button type="button" class="qty__add" aria-label="Adicionar ${nome} ao pedido"><span aria-hidden="true">+</span> Adicionar</button>`
    + `<div class="qty__ctl"><button type="button" class="qty__b" data-d="-1" aria-label="Tirar um ${nome}">−</button>`
    + `<span class="qty__n" aria-live="polite">0</span>`
    + `<button type="button" class="qty__b" data-d="1" aria-label="Mais um ${nome}">+</button></div>`;
  $('.item__body', it).appendChild(box);
  $('.qty__add', box).addEventListener('click', () => muda(it, 1));
  $$('.qty__b', box).forEach((b) => b.addEventListener('click', () => muda(it, +b.dataset.d)));
});
desenhaCarrinho();

const placeCat = (item) => {
  catScroll.scrollTop = 0;
  if (item) catScroll.scrollTop = item.getBoundingClientRect().top - Math.max(96, (innerHeight - item.offsetHeight) / 2);
};
const openCatalog = (item, comCortina = true) => {
  if (catOpen) { setFilter('todos', false); placeCat(item); if (item) focusItem(item); return; }
  if (comCortina) history.pushState({ catalogo: 1 }, '', '#catalogo');
  returnScrollY = scrollY;
  const menuWasOpen = root.classList.contains('menu-open');
  const meio = () => {
    if (menuWasOpen) setMenu(false);
    setFilter('todos', false);
    showCat(true);
    placeCat(item);
    if (!reduce && !leve) gsap.fromTo(items, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.03, delay: 0.45, clearProps: 'transform,opacity' });
  };
  const depois = () => { if (item) focusItem(item); $('[data-catview-close]').focus({ preventScroll: true }); };
  if (reduce || !comCortina) { meio(); depois(); return; }
  curtainRun('Catálogo', meio, depois, { entra: null });
};
const closeCatalog = () => {
  if (!catOpen) return;
  const volta = () => {
    showCat(false); clearTimeout(focusTimer); items.forEach((x) => x.classList.remove('is-focus'));
    // volta exatamente para onde a pessoa estava (o navegador pode pular para a âncora no "voltar")
    if (lenis) lenis.scrollTo(returnScrollY, { immediate: true, force: true });
    else window.scrollTo(0, returnScrollY);
  };
  if (reduce) { volta(); return; }
  curtainRun('Casa do Morango', volta, () => $('[data-cat-open]')?.focus({ preventScroll: true }), { sai: catScroll });
};
// "Voltar" usa o histórico, assim o botão voltar do celular também fecha o catálogo
$('[data-catview-close]').addEventListener('click', () => {
  if (busy) return;
  if (history.state?.catalogo) history.back();
  else { history.replaceState(null, '', location.pathname + location.search); closeCatalog(); }
});
window.addEventListener('popstate', () => {
  const tryClose = () => (busy ? setTimeout(tryClose, 200) : closeCatalog());
  if (catOpen) tryClose();
});
// link direto para o catálogo (ex.: alguém compartilhou .../#item-morango): abre já na tela do catálogo
{
  const alvo = location.hash && document.getElementById(location.hash.slice(1));
  if (alvo && catview.contains(alvo)) openCatalog(alvo.closest('.item'), false);
}

/* ---------- Política de privacidade: mesma tela e mesma cortina do catálogo, aberta pelo rodapé ---------- */
const privview = $('[data-privview]');
const privScroll = $('[data-privview-scroll]');
let privOpen = false;
let privReturnY = 0;
privview.inert = true;
const showPriv = (open) => {
  privOpen = open;
  privview.classList.toggle('is-open', open);
  privview.setAttribute('aria-hidden', String(!open));
  privview.inert = !open;
  hdr.inert = open;
  pageContent.forEach((el) => { el.inert = open; });
  root.classList.toggle('catview-open', open);
  if (lenis) open ? lenis.stop() : lenis.start();
};
const openPriv = (comCortina = true) => {
  if (privOpen) return;
  if (comCortina) history.pushState({ privacidade: 1 }, '', '#privacidade');
  privReturnY = scrollY;
  const meio = () => { showPriv(true); privScroll.scrollTop = 0; };
  const depois = () => $('[data-privview-close]').focus({ preventScroll: true });
  if (reduce || !comCortina) { meio(); depois(); return; }
  curtainRun('Privacidade', meio, depois, { entra: privScroll });
};
const closePriv = () => {
  if (!privOpen) return;
  const volta = () => {
    showPriv(false);
    if (lenis) lenis.scrollTo(privReturnY, { immediate: true, force: true });
    else window.scrollTo(0, privReturnY);
  };
  if (reduce) { volta(); return; }
  curtainRun('Casa do Morango', volta, () => $('.ftr__priv')?.focus({ preventScroll: true }), { sai: privScroll });
};
$('[data-privview-close]').addEventListener('click', () => {
  if (busy) return;
  if (history.state?.privacidade) history.back();
  else { history.replaceState(null, '', location.pathname + location.search); closePriv(); }
});
window.addEventListener('popstate', () => {
  const tryClose = () => (busy ? setTimeout(tryClose, 200) : closePriv());
  if (privOpen) tryClose();
});
if (location.hash === '#privacidade') openPriv(false);

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const target = $(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (busy) return;
  if (catview.contains(target)) { openCatalog(target.classList.contains('item') ? target : null); return; }
  if (privview.contains(target)) { openPriv(); return; }
  history.replaceState(history.state, '', a.getAttribute('href') === '#inicio' ? location.pathname : a.getAttribute('href'));
  const label = a.dataset.label;
  if (!label || reduce) {
    if (root.classList.contains('menu-open')) setMenu(false);
    jumpTo(target, !reduce);
    return;
  }
  curtainTo(target, label);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || busy) return;
  if (catOpen) $('[data-catview-close]').click();
  else if (privOpen) $('[data-privview-close]').click();
});

/* ---------- Entrada do topo ---------- */
const heroLines = $$('.hero__title .line > span');
const heroFades = $$('[data-hero-in]');
const heroFrame = $('[data-hero-frame]');
if (!reduce) {
  gsap.set(heroLines, { yPercent: 115 });
  gsap.set(heroFades, { opacity: 0, y: 22 });
  if (leve) {
    // celular: só transformação e opacidade (recorte animado numa foto grande pesa no celular)
    gsap.set(heroFrame, { opacity: 0, y: 30, scale: 0.97 });
  } else {
    gsap.set(heroFrame, { clipPath: 'inset(100% 0% 0% 0% round 34px)' });
    gsap.set($('img', heroFrame), { scale: 1.28 });
  }
}
const heroIn = () => {
  if (reduce) return;
  const tl = gsap.timeline();
  if (leve) tl.to(heroFrame, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity' }, 0);
  else {
    tl.to(heroFrame, { clipPath: 'inset(0% 0% 0% 0% round 34px)', duration: 1.35, ease: 'expo.inOut' }, 0)
      .to($('img', heroFrame), { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.2);
  }
  tl.to(heroLines, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09 }, 0.15)
    .to(heroFades, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' }, 0.45);
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

/* ---------- Abertura (toda entrada no site, exceto link direto com #) ---------- */
if (root.classList.contains('has-intro')) {
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
  /*
    Saída sem tela por cima: o letreiro sobe e some dentro da máscara, o morango dá uma
    pequena descida (antecipação) e voa, girando de leve, até o lugar dele no logo do topo.
    Quando pousa, o resto do logo se escreve a partir dele e os itens do topo descem um a um,
    enquanto o fundo creme da abertura se dissolve na página e o topo do site monta.
  */
  const logo = $('.hdr__logo');
  const logoImg = $('.hdr__logo-dark');
  const hdrItems = $$('.hdr__nav a, .hdr__cta, [data-burger]').filter((el) => el.offsetParent);
  gsap.set(logo, { opacity: 0 });
  gsap.set(hdrItems, { opacity: 0, y: -18 });
  const voa = () => {
    const a = sym.getBoundingClientRect();
    const r = logoImg.getBoundingClientRect();
    // o morango ocupa os primeiros 105 px dos 420 de largura do logo horizontal
    const alvo = { x: r.left + r.width * (105 / 420) / 2, y: r.top + r.height / 2, h: r.height };
    const s = alvo.h / a.height;
    gsap.set(sym, { transformOrigin: '50% 50%' });
    gsap.timeline({ onComplete: pousa })
      .to(sym, { x: `+=${alvo.x - (a.left + a.width / 2)}`, y: `+=${alvo.y - (a.top + a.height / 2)}`, scale: s, duration: 1, ease: 'expo.inOut' }, 0)
      .to(sym, { rotation: -12, duration: 0.5, ease: 'power2.out' }, 0)
      .to(sym, { rotation: 0, duration: 0.5, ease: 'power2.inOut' }, 0.5);
  };
  const pousa = () => {
    gsap.set(logo, { opacity: 1, clipPath: 'inset(0% 75% 0% 0%)' });
    gsap.set(sym, { opacity: 0 });
    gsap.timeline()
      .to(logo, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.out', clearProps: 'clipPath,opacity' }, 0)
      .fromTo(logo, { scale: 0.94 }, { scale: 1, duration: 0.6, ease: 'back.out(2.4)', transformOrigin: '0% 50%', clearProps: 'transform' }, 0)
      .to(hdrItems, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.06, clearProps: 'transform,opacity' }, 0.1);
  };
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
    // saída: barra e contador somem, o letreiro sobe para dentro da máscara, linha por linha
    .to('.intro__load', { opacity: 0, y: 10, duration: 0.3, ease: 'power2.in' }, 2.0)
    .to(words, { yPercent: -115, duration: 0.5, ease: 'power3.in', stagger: 0.08 }, 2.02)
    // antecipação do morango e voo até o logo
    .to(sym, { y: 10, scale: 1.04, duration: 0.2, ease: 'power2.out' }, 2.12)
    .add(voa, 2.34)
    // o fundo da abertura se dissolve na página enquanto o topo monta
    .to('.intro', { backgroundColor: 'rgba(255, 248, 241, 0)', duration: 0.8, ease: 'power2.inOut' }, 2.5)
    .add(heroIn, 2.5)
    .add(() => {}, 4.2);
} else {
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

/* ---------- Banca: a foto abre de um cartão até a largura toda; título palavra por palavra ---------- */
if (!reduce) {
  const banca = $('[data-banca]');
  const palavras = $$('[data-banca-title] .banca__l > span');
  // computador: a foto abre de um cartão arredondado até a largura toda e se afasta de leve ao rolar.
  // celular: nada preso à rolagem (é o que travava); a foto só aparece com um esmaecer rápido.
  if (!leve) {
    gsap.fromTo('[data-banca-bg]', { clipPath: 'inset(7% 5% 7% 5% round 40px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: banca, start: 'top bottom', end: 'top 15%', scrub: 0.6 },
    });
    gsap.fromTo('[data-banca-img]', { scale: 1.1 }, {
      scale: 1, ease: 'none', force3D: true,
      scrollTrigger: { trigger: banca, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  } else {
    gsap.set('[data-banca-img]', { opacity: 0 });
    ScrollTrigger.create({ trigger: banca, start: 'top 85%', once: true, onEnter: () => gsap.to('[data-banca-img]', { opacity: 1, duration: 0.7, ease: 'power2.out' }) });
  }
  gsap.set('[data-banca-sym]', { scale: 0.3, rotation: -16, opacity: 0 });
  gsap.set(palavras, { yPercent: 115, rotation: 7 });
  gsap.set('[data-banca-fade]', { opacity: 0, y: 22 });
  ScrollTrigger.create({
    trigger: '[data-banca-title]', start: 'top 82%', once: true,
    onEnter: () => gsap.timeline()
      .to('[data-banca-sym]', { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)' }, 0)
      .to(palavras, { yPercent: 0, rotation: 0, duration: 0.85, ease: 'expo.out', stagger: 0.07 }, 0.12)
      .to('[data-banca-fade]', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, clearProps: 'transform' }, 0.55),
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
