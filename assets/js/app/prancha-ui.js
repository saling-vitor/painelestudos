'use strict';
/* MEUS MAPAS · Prancha · componentes e controlador de renderização.
   Cada view ganha um contêiner .pr no topo; a view legada continua no DOM (oculta)
   para que todos os módulos existentes, IDs e eventos sigam funcionando. */
(() => {
  if (window.Prancha?.ui) return;
  const P = (window.Prancha = window.Prancha || {});
  const U = P.util;
  const { esc } = U;

  /* ---------- componentes ---------- */
  const attrs = (o = {}) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => (v === true ? ' ' + k : ' ' + k + '="' + esc(v) + '"')).join('');
  const btn = (label, a = {}, cls = '') => '<button type="button" class="pr-btn' + (cls ? ' ' + cls : '') + '"' + attrs(a) + '>' + label + '</button>';
  const act = (name, arg, extra = {}) => ({ 'data-pr-act': name, 'data-arg': arg === undefined ? undefined : String(arg), ...extra });
  const cell = (label, value, cls = '', note = '') => '<div class="pr-cell"><span>' + esc(label) + '</span><b class="pr-num' + (cls ? ' ' + cls : '') + '">' + value + '</b><span>' + note + '</span></div>';
  const verdict = (cls, bold, rest = '') => '<div class="pr-verdict ' + (cls || '') + '"><i></i><p>' + (bold ? '<b>' + bold + '</b> ' : '') + rest + '</p></div>';
  const states = (segs, label = '') => {
    const t = segs.reduce((s, x) => s + Math.max(0, x[1]), 0) || 1;
    return '<div class="pr-states" role="img" aria-label="' + esc(label) + '">' + segs.map((x) => '<i style="width:' + ((Math.max(0, x[1]) / t) * 100).toFixed(2) + '%;background:' + x[2] + '"></i>').join('') + '</div>';
  };
  const legend = (items) => '<div class="pr-legend">' + items.map(([label, value, color, outline]) => '<span><em style="background:' + color + (outline ? ';border:1px solid var(--pr-linha)' : '') + '"></em>' + esc(label) + (value !== undefined && value !== '' ? ' <b class="pr-num">' + value + '</b>' : '') + '</span>').join('') + '</div>';
  const STATE_COLORS = { ok: 'var(--pr-musgo)', rev: 'var(--pr-latao)', dif: 'var(--pr-oxido)', pend: 'var(--pr-g3)' };
  const stateSegs = (p) => [['OK', Math.max(0, (p.marked || 0) - (p.review || 0) - (p.difficult || 0)), STATE_COLORS.ok], ['REV', p.review || 0, STATE_COLORS.rev], ['DIF', p.difficult || 0, STATE_COLORS.dif], ['PEND', Math.max(0, (p.total || 0) - (p.marked || 0)), STATE_COLORS.pend]];
  const stateBar = (p, label) => states(stateSegs(p), label || 'Tópicos por estado');
  const stateLegend = (p) => legend(stateSegs(p).map(([l, v, c]) => [l, U.fmtNum(v), c, l === 'PEND']));
  const stbar = (p, h = 5) => {
    const t = Math.max(1, p.total || 0), ok = Math.max(0, (p.marked || 0) - (p.review || 0) - (p.difficult || 0));
    return '<span class="pr-stbar" style="height:' + h + 'px" aria-hidden="true"><i style="width:' + (ok / t) * 100 + '%;background:var(--pr-musgo)"></i><i style="width:' + ((p.review || 0) / t) * 100 + '%;background:var(--pr-latao)"></i><i style="width:' + ((p.difficult || 0) / t) * 100 + '%;background:var(--pr-oxido)"></i></span>';
  };
  /* V15.55 · enquanto a primeira carga da nuvem não chega, o vazio vira esqueleto (não é vazio, está chegando) */
  const cloudPending = () => {
    try {
      return !!(typeof state !== 'undefined' && state.cloudLoading && typeof StudyCloud !== 'undefined' && StudyCloud.session()
        && !(state.cloudCourses?.length || state.cloudMaps?.length || state.cloudSimulations?.length));
    } catch { return false; }
  };
  const skeleton = (lines = 2) => '<div class="pr-skel" aria-busy="true" aria-label="Carregando da nuvem"><i class="t"></i>'
    + Array.from({ length: lines }, () => '<i></i>').join('') + '</div>';
  const empty = (title, text = '', actionHtml = '') => {
    if (cloudPending()) { P.skeletonShown = true; return skeleton(text ? 2 : 1); }
    return '<div class="pr-empty"><b>' + esc(title) + '</b>' + (text ? '<p>' + text + '</p>' : '') + actionHtml + '</div>';
  };
  function cov({ img = '', sig = '', color = 'var(--pr-latao)', cls = '', label = '' } = {}) {
    return '<div class="pr-cov' + (img ? ' has-img' : '') + (cls ? ' ' + cls : '') + '" style="--c:' + esc(color) + '" role="img" aria-label="' + esc(label || 'Capa ' + sig) + '">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove(\'has-img\');this.remove()">' : '') + '<span class="r"></span><span class="s">' + esc(sig) + '</span></div>';
  }
  const mapCov = (m, cls = '') => { let img = ''; try { img = typeof mapCover === 'function' ? mapCover(m) || '' : ''; } catch {} return cov({ img, sig: m?.code || 'MAPA', color: P.mapColor(m), cls, label: 'Capa ' + (m?.code || '') }); };
  const courseCov = (c, cls = '') => { let img = ''; try { img = typeof courseCover === 'function' ? courseCover(c) || '' : ''; } catch {} return cov({ img, sig: P.courses.sigla(c), color: P.courses.color(c), cls, label: 'Capa ' + (c?.title || '') }); };

  /* planta do edital: cada mapa é um lote do tamanho dos seus tópicos */
  function tiles(list, { sel = '', cls = '', pick = 'pick-map' } = {}) {
    if (!list.length) return empty('Nenhum mapa neste curso', 'Importe os mapas HTML do edital para desenhar a planta.');
    return '<div class="pr-tiles ' + cls + '">' + list.map((m) => {
      const p = P.data.prog(m), k = P.data.keyOf(m), w = Math.max(6, p.total || Number(m.topics) || 6), pc = U.pct(p.marked, p.total);
      return '<button type="button" class="pr-tile' + (k === sel ? ' on' : '') + '" data-pr-act="' + pick + '" data-arg="' + esc(k) + '" style="--w:' + w + ';--c:' + P.mapColor(m) + ';--p:' + pc + '%" aria-label="' + esc((m.code || '') + ': ' + pc + '% de ' + p.total + ' tópicos') + '"><span class="fill"></span><span class="stripe"></span><span class="flags">' + (p.difficult ? '<span class="d">DIF ' + p.difficult + '</span>' : '') + (p.review ? '<span class="r">REV ' + p.review + '</span>' : '') + (m._linkedFrom ? '<span class="s">vinc.</span>' : '') + '</span><span class="in"><span class="sig">' + esc(m.code || 'MAPA') + '</span><span><span class="pc">' + pc + '%</span><br><span class="tp">' + p.marked + '/' + p.total + '</span></span></span></button>';
    }).join('') + '</div>';
  }
  function mini(list, color) {
    if (!list.length) return '<div class="pr-mini" aria-hidden="true"><i style="--w:1;--p:0%;--c:' + (color || 'var(--pr-linha)') + '"></i></div>';
    return '<div class="pr-mini" role="img" aria-label="Planta: ' + list.length + ' mapas">' + list.map((m) => { const p = P.data.prog(m); return '<i style="--w:' + Math.max(4, p.total || 4) + ';--p:' + U.pct(p.marked, p.total) + '%;--c:' + (color || P.mapColor(m)) + '" title="' + esc((m.code || '') + ' · ' + U.pct(p.marked, p.total) + '%') + '"></i>'; }).join('') + '</div>';
  }
  function top({ eyebrow = '', title = '', desc = '', tabs = null, active = '', label = '', tabAct = 'tab', right = '' } = {}) {
    const tabHtml = tabs ? '<div class="pr-tabs" role="tablist" aria-label="' + esc(label || title) + '">' + tabs.map((t) => '<button type="button" class="pr-tab" role="tab" data-pr-act="' + tabAct + '" data-arg="' + esc(t.id) + '" aria-selected="' + (t.id === active) + '"' + (t.disabled ? ' disabled' : '') + '>' + esc(t.label) + (t.badge !== undefined && t.badge !== '' ? '<small>' + esc(t.badge) + '</small>' : '') + '</button>').join('') + '</div>' : '';
    return '<header class="pr-top"><div class="pr-head"><div>' + (eyebrow ? '<div class="pr-eyebrow">' + esc(eyebrow) + '</div>' : '') + (title ? '<h1>' + esc(title) + '</h1>' : '') + (desc ? '<p>' + desc + '</p>' : '') + '</div>' + right + '</div>' + (tabHtml || label ? '<div class="pr-bar">' + (label ? '<span class="pr-lbl">' + esc(label) + '</span>' : '') + tabHtml + '</div>' : '') + '</header>';
  }
  const card = (inner, cls = '', a = {}) => '<section class="pr-card ' + cls + '"' + attrs(a) + '>' + inner + '</section>';
  const head = (k, h, right = '', kcls = '') => '<div class="pr-head"><div>' + (k ? '<span class="pr-k ' + kcls + '">' + esc(k) + '</span>' : '') + (h ? '<h3>' + h + '</h3>' : '') + '</div>' + right + '</div>';
  const chipf = (id, label, count, pressed, act, color, title) => '<button type="button" class="pr-chipf" data-pr-act="' + act + '" data-arg="' + esc(id) + '" aria-pressed="' + !!pressed + '"' + (title && title !== label ? ' title="' + esc(title) + '"' : '') + (color ? ' style="--c:' + color + '"' : '') + '>' + (color ? '<i></i>' : '') + esc(label) + (count !== undefined ? ' <span class="pr-mono">' + count + '</span>' : '') + '</button>';
  const seg = (items, active, act, label = '') => '<div class="pr-seg" role="group" aria-label="' + esc(label) + '">' + items.map(([id, l]) => '<button type="button" data-pr-act="' + act + '" data-arg="' + esc(id) + '" aria-pressed="' + (id === active) + '">' + esc(l) + '</button>').join('') + '</div>';
  function menu(id, items) {
    return '<div class="pr-menu">' + btn((typeof uiIcon === 'function' ? uiIcon('more', 'ui-icon-sm') : '⋯'), { 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'Mais ações', 'data-pr-menu': id }, 'g sm') + '<div role="menu" data-pr-menu-panel="' + esc(id) + '" hidden>' + items.filter(Boolean).map(([label, a, cls]) => '<button type="button" role="menuitem" class="' + (cls || '') + '"' + attrs(a) + '>' + esc(label) + '</button>').join('') + '</div></div>';
  }
  const lastLabel = (iso) => { const ms = typeof activityTimestamp === 'function' ? activityTimestamp(iso) : Date.parse(iso || 0) || 0; if (!ms) return 'nunca'; const d = U.daysBetween(new Date(ms), new Date()); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : 'há ' + d + ' d'; };
  const mapState = (p) => (p.total > 0 && p.marked >= p.total ? 'concluído' : p.marked ? 'em andamento' : p.lastActivity ? 'aberto' : 'não iniciado');

  P.ui = { attrs, btn, act, cell, verdict, states, legend, stateSegs, stateBar, stateLegend, stbar, empty, skeleton, cov, mapCov, courseCov, tiles, mini, top, card, head, chipf, seg, menu, lastLabel, mapState, STATE_COLORS };

  /* ---------- controlador ---------- */
  const pages = (P.pages = P.pages || {});
  const actions = (P.actions = P.actions || {});
  const OFF = () => { try { return localStorage.getItem('studyapp.prancha.off') === '1'; } catch { return false; } };
  P.enabled = () => !OFF();

  function rootFor(view) {
    const host = document.querySelector('.view[data-view="' + view + '"]');
    if (!host) return null;
    let root = host.querySelector(':scope>.pr[data-prancha="' + view + '"]');
    if (!root) {
      root = document.createElement('div');
      root.className = 'pr';
      root.dataset.prancha = view;
      host.prepend(root);
      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('submit', onSubmit);
      root.addEventListener('keydown', onKey);
    }
    host.classList.add('pr-on');
    return root;
  }
  /* P1-9 · índice de seções no celular: atalhos para os blocos da prancha (Início e Progresso). */
  const SECNAV_VIEWS = new Set(['home', 'progress']);
  function secLabel(card, view) {
    if (view === 'progress' && card.classList.contains('pr-carimbo')) return 'Resumo';
    const k = card.querySelector('.pr-head .pr-k, .pr-k');
    const h = card.querySelector('h3, h2');
    let t = ((k && k.textContent) || (h && h.textContent) || '').trim();
    t = t.split(' · ')[0].trim();
    return t.length > 28 ? t.slice(0, 26) + '…' : t;
  }
  function buildSecNav(view, root) {
    if (!SECNAV_VIEWS.has(view)) return;
    const cards = [...root.querySelectorAll(':scope > .pr-card, :scope > .pr-two > .pr-card, :scope > .pr-three > .pr-card, :scope > div > .pr-card')]
      .filter((c, i, a) => a.indexOf(c) === i && !c.closest('.pr-top'));
    const seen = new Set();
    const items = [];
    cards.forEach((c, i) => {
      const label = secLabel(c, view);
      if (!label || seen.has(label)) return;
      seen.add(label);
      if (!c.id) c.id = 'pr-s-' + view + '-' + i;
      items.push('<a href="#' + c.id + '" data-pr-act="secnav" data-arg="' + c.id + '">' + esc(label) + '</a>');
    });
    if (items.length < 3) return;
    const nav = document.createElement('nav');
    nav.className = 'pr-toc pr-secnav';
    nav.setAttribute('aria-label', 'Seções desta prancha');
    nav.innerHTML = items.join('');
    const top = root.querySelector(':scope > .pr-top');
    if (top) top.after(nav); else root.prepend(nav);
  }
  /* No celular e no iPad a barra do app não fica fixa e o position:sticky das pranchas não tem efeito (o <body> vira contêiner de rolagem).
     Em vez de mexer nesse comportamento global, o índice é fixado por JS quando passa do topo, com um espaço reservado. */
  function unstick(nav) { nav.classList.remove('is-stuck'); nav.style.left = ''; nav.style.width = ''; nav.__ph?.remove(); nav.__ph = null; }
  let stickyTopFor = '';
  function syncStickyTop() {
    const key = innerWidth + 'x' + innerHeight;
    if (stickyTopFor === key) return;
    stickyTopFor = key;
    const tb = document.querySelector('.topbar-wrap');
    const pinned = tb && getComputedStyle(tb).position === 'sticky' && tb.offsetHeight > 0;
    document.documentElement.style.setProperty('--pr-sticky-top', (pinned ? tb.offsetHeight + 1 : 8) + 'px');
  }
  function stickNav() {
    syncStickyTop();
    const nav = document.querySelector('.view.active .pr .pr-toc');
    document.querySelectorAll('.pr-toc.is-stuck').forEach((n) => { if (n !== nav) unstick(n); });
    if (!nav) return;
    const html = document.documentElement;
    const tb = document.querySelector('.topbar-wrap');
    const stickyBroken = !tb || tb.getBoundingClientRect().bottom <= 0;
    const needsPin = nav.offsetHeight > 0 && stickyBroken;
    if (!needsPin || html.classList.contains('mobile-menu-open')) { unstick(nav); return; }
    const ref = (nav.__ph || nav).getBoundingClientRect().top;
    if (ref < 6 && !nav.__ph) {
      const ph = document.createElement('div');
      ph.className = 'pr-toc-ph'; ph.style.height = nav.offsetHeight + 'px'; ph.setAttribute('aria-hidden', 'true');
      nav.before(ph); nav.__ph = ph; nav.classList.add('is-stuck');
    }
    if (nav.__ph) { const r = nav.__ph.getBoundingClientRect(); nav.style.left = Math.max(8, r.left - 6) + 'px'; nav.style.width = (r.width + 12) + 'px'; } else if (ref >= 6 && nav.__ph) unstick(nav);
    if (!nav.classList.contains('pr-secnav')) return;
    let cur = null;
    nav.querySelectorAll('a[data-arg]').forEach((a) => { const t = document.getElementById(a.dataset.arg); if (t && t.getBoundingClientRect().top < 150) cur = a; });
    nav.querySelectorAll('a[aria-current]').forEach((a) => { if (a !== cur) a.removeAttribute('aria-current'); });
    if (cur && !cur.hasAttribute('aria-current')) {
      cur.setAttribute('aria-current', 'location');
      const l = cur.offsetLeft - 12; if (l < nav.scrollLeft || cur.offsetLeft + cur.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = Math.max(0, l);
    }
  }
  let stickRaf = 0;
  const onStickScroll = () => { if (!stickRaf) stickRaf = requestAnimationFrame(() => { stickRaf = 0; stickNav(); }); };
  window.addEventListener('scroll', onStickScroll, { passive: true });
  window.addEventListener('resize', onStickScroll, { passive: true });
  P.stickNav = stickNav;
  actions.secnav = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    /* salto direto: a rolagem suave podia ser interrompida por um redesenho da prancha (ex.: índice de busca chegando) */
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };

  /* V15.53.3 · capas sem piscar. Cada redesenho troca o innerHTML e recriava as <img>; a nova imagem
     precisava decodificar de novo e, nesse intervalo, a capa aparecia vazia (só o fundo e o disco).
     Antes de redesenhar, guardamos as imagens já carregadas; depois, a nova marcação recebe o mesmo nó
     (mesmo endereço) e, se o endereço mudou, a imagem antiga fica visível até a nova terminar de carregar. */
  function collectImgs(root) {
    const bySrc = new Map(), bySlot = new Map();
    root.querySelectorAll('img').forEach((img) => {
      if (!img.complete || !img.naturalWidth) return;
      const src = img.getAttribute('src') || '';
      if (src && !bySrc.has(src)) bySrc.set(src, []);
      if (src) bySrc.get(src).push(img);
      const slot = img.parentElement?.getAttribute('aria-label');
      if (slot && !bySlot.has(slot)) bySlot.set(slot, img);
    });
    return { bySrc, bySlot };
  }
  function reuseImgs(root, keep) {
    if (!keep.bySrc.size) return;
    root.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const same = keep.bySrc.get(src);
      if (same && same.length) {
        const old = same.shift();
        for (const attr of ['class', 'alt', 'style']) { if (img.hasAttribute(attr)) old.setAttribute(attr, img.getAttribute(attr)); else old.removeAttribute(attr); }
        img.replaceWith(old);
        return;
      }
      if (img.complete && img.naturalWidth) return;
      const slot = img.parentElement?.getAttribute('aria-label');
      const prev = slot && keep.bySlot.get(slot);
      if (!prev || prev.isConnected) return;
      /* endereço novo para a mesma capa: mostra a antiga por cima até a nova carregar */
      const ghost = prev;
      ghost.classList.add('pr-img-ghost');
      img.insertAdjacentElement('afterend', ghost);
      const done = () => ghost.remove();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      img.loading = 'eager';
    });
  }

  const queue = new Set();
  let raf = 0;
  function schedule(view) {
    if (!P.enabled()) return;
    if (view === 'matrix' || view === 'errors' || view === 'map' || view === 'simulation') return;
    queue.add(view || (typeof state !== 'undefined' ? state.view : 'home'));
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const list = [...queue]; queue.clear(); list.forEach(renderNow); });
  }
  function renderNow(view) {
    const page = pages[view];
    if (!page || typeof state === 'undefined' || state.view !== view) return;
    const root = rootFor(view);
    if (!root) return;
    if (root.contains(document.activeElement) && document.activeElement.matches('input,select,textarea') && !page.renderWhileTyping) return;
    const scrollY = window.scrollY;
    P.__frame = {};
    const keepImgs = collectImgs(root);
    try { page.render(root); reuseImgs(root, keepImgs); reapplyArmed(root); buildSecNav(view, root); root.dataset.rendered = String(Date.now()); }
    catch (e) { console.error('[Prancha] falha ao desenhar ' + view, e); root.innerHTML = '<div class="pr-empty"><b>Não foi possível desenhar esta prancha.</b><p>O conteúdo original continua disponível abaixo.</p></div>'; root.closest('.view')?.classList.remove('pr-on'); }
    finally { P.__frame = null; }
    if (Math.abs(window.scrollY - scrollY) > 2) window.scrollTo(0, scrollY);
    stickNav();
    document.body.classList.toggle('pr-session-home', view === 'home' && root.dataset.screen === 'sessao');
  }
  P.schedule = schedule;
  P.collectImgs = collectImgs;
  P.reuseImgs = reuseImgs;
  P.renderNow = renderNow;
  P.rootFor = rootFor;

  /* delegação de eventos */
  function closeMenus(except) { document.querySelectorAll('.pr [data-pr-menu-panel]').forEach((p) => { if (p !== except) { p.hidden = true; p.parentElement?.querySelector('[data-pr-menu]')?.setAttribute('aria-expanded', 'false'); } }); }
  function onClick(e) {
    const mbtn = e.target.closest('[data-pr-menu]');
    if (mbtn) { e.stopPropagation(); const panel = mbtn.parentElement.querySelector('[data-pr-menu-panel]'); const open = panel.hidden; closeMenus(panel); panel.hidden = !open; mbtn.setAttribute('aria-expanded', String(open)); if (open) panel.querySelector('button')?.focus(); return; }
    const el = e.target.closest('[data-pr-act]');
    if (!el || el.disabled) return;
    const root = e.currentTarget, view = root.dataset.prancha, name = el.dataset.prAct;
    const fn = pages[view]?.actions?.[name] || actions[name];
    if (!fn) return;
    e.preventDefault();
    if (el.closest('[data-pr-menu-panel]')) closeMenus();
    try { fn(el.dataset.arg, el, root, e); } catch (err) { console.error('[Prancha] ação ' + name, err); if (typeof toast === 'function') toast('Não foi possível concluir a ação.'); }
  }
  function onChange(e) {
    const el = e.target.closest('[data-pr-change]');
    if (!el) return;
    const root = e.currentTarget, view = root.dataset.prancha, fn = pages[view]?.actions?.[el.dataset.prChange] || actions[el.dataset.prChange];
    if (fn) fn(el.value, el, root, e);
  }
  function onSubmit(e) {
    const form = e.target.closest('form[data-pr-submit]');
    if (!form) return;
    e.preventDefault();
    const root = e.currentTarget, view = root.dataset.prancha, fn = pages[view]?.actions?.[form.dataset.prSubmit] || actions[form.dataset.prSubmit];
    if (fn) fn(new FormData(form), form, root, e);
  }
  function onKey(e) {
    if (e.key === 'Escape') closeMenus();
    const tab = e.target.closest('.pr-tab');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const list = [...tab.parentElement.querySelectorAll('.pr-tab:not(:disabled)')], i = list.indexOf(tab), next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
      next?.focus(); next?.click(); e.preventDefault();
    }
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.pr-menu')) closeMenus(); });

  /* confirmação na própria página: primeiro toque arma, segundo executa */
  /* confirmação em dois toques; o estado sobrevive a um redesenho da prancha durante a janela de 5 s */
  let armedState = null;
  const armedId = (el) => (el.dataset.prAct || '') + '|' + (el.dataset.arg || '');
  function disarm(el) { if (!el) return; delete el.dataset.armed; el.classList.remove('armed'); if (el.dataset.label) el.textContent = el.dataset.label; }
  function armed(el, run, label = 'Toque de novo para confirmar') {
    const id = armedId(el), live = armedState && armedState.id === id && armedState.until > Date.now();
    if (el.dataset.armed === '1' || live) { armedState = null; disarm(el); run(); return; }
    el.dataset.label = el.textContent; el.dataset.armed = '1'; el.classList.add('armed'); el.textContent = label;
    armedState = { id, label, original: el.dataset.label, until: Date.now() + 5000 };
    setTimeout(() => {
      if (armedState && armedState.id === id && armedState.until <= Date.now() + 50) armedState = null;
      document.querySelectorAll('.pr [data-armed="1"]').forEach((b) => { if (armedId(b) === id) disarm(b); });
    }, 5000);
  }
  function reapplyArmed(root) {
    if (!armedState || armedState.until <= Date.now()) { armedState = null; return; }
    root.querySelectorAll('[data-pr-act]').forEach((b) => {
      if (armedId(b) !== armedState.id) return;
      b.dataset.label = armedState.original; b.dataset.armed = '1'; b.classList.add('armed'); b.textContent = armedState.label;
    });
  }
  function confirmAction(title, message, run, label = 'Confirmar') {
    if (typeof askConfirm === 'function') return askConfirm(title, message, run, label);
    if (window.confirm(title + '\n\n' + message)) run();
  }
  P.armed = armed;
  P.confirm = confirmAction;

  /* ações globais reutilizadas por várias pranchas */
  Object.assign(actions, {
    'open-map': (key, el) => { if (typeof openMap === 'function') openMap(key, el?.dataset.topic ? { topicId: el.dataset.topic } : {}); },
    'open-course': (id) => { if (typeof openCourse === 'function') openCourse(id); },
    'nav': (view) => { if (typeof nav === 'function') nav(view); },
    'open-sim': (key) => { if (typeof openSimulation === 'function') openSimulation(key); },
    'sim-history': (key) => { if (typeof openSimulationHistory === 'function') openSimulationHistory(key); },
    'manage-map': (key) => { if (typeof openMapAdmin === 'function') openMapAdmin(key); },
    'update-map': (key) => { if (typeof openMapHtmlUpdate === 'function') openMapHtmlUpdate(key); },
    'manage-course': (id) => { if (typeof openCourseAdminFor === 'function') openCourseAdminFor(id); },
    'course-edital': (id) => { if (typeof openCourseEdital === 'function') openCourseEdital(id); },
    'new-course': () => { const b = document.getElementById('newCourseBtn2') || document.getElementById('newCourseBtn'); b?.click(); },
    'import-maps': () => { const b = document.getElementById('importBtn2') || document.getElementById('importBtn'); b?.click(); },
    'import-sim': () => document.getElementById('importSimulationBtn')?.click(),
    'fav': (key, el) => {
      if (typeof favs === 'undefined') return;
      if (favs.has(key)) favs.delete(key); else favs.add(key);
      try { localStorage.setItem('studyapp.favs', JSON.stringify([...favs])); } catch {}
      if (typeof touchPreferences === 'function') touchPreferences();
      el?.setAttribute('aria-pressed', String(favs.has(key)));
      if (el) el.setAttribute('aria-label', favs.has(key) ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    },
    'start-session': (key) => {
      const map = key && typeof mapById === 'function' ? mapById(key) : null;
      if (window.StudyDashboard?.active?.()) { if (typeof nav === 'function') nav('home'); return; }
      window.StudyDashboard?.start?.({ map, general: !map, mode: 'free', label: map ? map.code || map.title : 'Sessão de estudo' });
      if (map && typeof openMap === 'function') openMap(key);
      schedule('home');
    },
    'timer-toggle': () => { const a = window.StudyDashboard?.active?.(); if (!a) return; if (a.running) window.StudyDashboard.pause(); else window.StudyDashboard.resume(); schedule(state.view); },
    'timer-finish': (arg, el) => armed(el, () => { window.StudyDashboard?.finish?.(); schedule(state.view); }, 'Toque de novo para finalizar'),
    'timer-focus': () => { if (state?.readerMapKey && typeof toggleReaderFocus === 'function') toggleReaderFocus(); else { const a = window.StudyDashboard?.active?.(); if (a?.mapKey && typeof openMap === 'function') openMap(a.mapKey).then?.(() => typeof setReaderFocus === 'function' && setReaderFocus(true)); else if (typeof toast === 'function') toast('Abra um mapa para usar o modo foco.'); } },
    'review-queue': () => { if (typeof startReviewQueue === 'function') startReviewQueue(); },
    'sync-now': () => { if (typeof syncNow === 'function') syncNow(); else document.getElementById('syncTop')?.click(); }
  });

  /* ---------- ligação com o app ---------- */
  function wrapRender(name, view) {
    const base = window[name];
    if (typeof base !== 'function' || base.__prancha) return;
    const wrapped = function () { const r = base.apply(this, arguments); schedule(view || state.view); return r; };
    wrapped.__prancha = true;
    window[name] = wrapped;
  }
  function install() {
    P.installSync?.();
    if (!P.enabled()) { document.documentElement.classList.add('pr-disabled'); classicReturn(); return; }
    [['renderHome', 'home'], ['renderCoursesPage', 'courses'], ['renderCurrentMaps', 'course'], ['renderAllMaps', 'maps'], ['renderSimulations', 'simulations'], ['renderProgress', 'progress'], ['renderStudyAgenda', 'agenda'], ['renderSettings', 'settings'], ['renderHomeSimulations', 'home'], ['updateCloudUI', null]].forEach(([n, v]) => wrapRender(n, v));
    window.addEventListener('studyapp:navigation', (e) => { const v = e.detail?.view; schedule(v); if (v !== 'home') document.body.classList.remove('pr-session-home'); setTimeout(() => P.history?.record?.(), 300); });
    window.addEventListener('storage', (e) => { if (!e.key || /^(studyapp\.|mindmap_)/.test(e.key)) schedule(state.view); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(state.view); });
    window.addEventListener('studyapp:map-state', () => schedule(state.view));
    /* reinstala os wrappers depois que os módulos tardios (automação, central) se ligarem */
    setTimeout(() => { [['renderHome', 'home'], ['renderProgress', 'progress'], ['renderSettings', 'settings'], ['renderStudyAgenda', 'agenda']].forEach(([n, v]) => wrapRender(n, v)); schedule(state.view); }, 400);
    schedule(typeof state !== 'undefined' ? state.view : 'home');
    setTimeout(() => P.history?.record?.(), 1500);
  }
  /* interface clássica: o mesmo aplicativo sem as pranchas, com um caminho de volta em Configurações */
  P.setClassic = (on) => { try { if (on) localStorage.setItem('studyapp.prancha.off', '1'); else localStorage.removeItem('studyapp.prancha.off'); } catch {} location.reload(); };
  function classicReturn() {
    let n = 0;
    const put = () => {
      const panel = document.getElementById('appAppearancePanel');
      if (panel && !panel.querySelector('[data-pr-classic-return]')) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'secondary'; b.dataset.prClassicReturn = '1';
        b.textContent = 'Voltar à interface em pranchas';
        b.addEventListener('click', () => P.setClassic(false));
        panel.appendChild(b);
      }
      if (!panel && ++n < 40) setTimeout(put, 250);
    };
    put();
  }
  P.install = install;
})();
