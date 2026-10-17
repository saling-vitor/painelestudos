'use strict';
/* MEUS MAPAS · V15.52 · fluxo de estudo
   1. Retomar no tópico (F1/P1-10): o leitor informa o último tópico visível; a Home oferece "Continuar" nesse ponto.
   2. Revisão guiada no leitor (F2): fila de tópicos vencidos, um por vez, com Errei/Difícil/Ok/Fácil e "próximo".
   3. Estado da nuvem e uso do aparelho (P1-11): sondagem só de leitura, sem token e sem gravar nada.
   Nenhum mapa é alterado: o leitor só lê data-topic-id e envia uma mensagem para esta janela (mesma origem). */
(() => {
  if (window.StudyFlow) return;
  const RESUME_KEY = 'studyapp.resume.v1';
  const GUIDED_KEY = 'studyapp.guidedReview.v1';
  const MAX_RESUME = 60;

  const readJson = (store, key, fallback) => { try { const v = JSON.parse(store.getItem(key) || 'null'); return v && typeof v === 'object' ? v : fallback; } catch { return fallback; } };
  const writeJson = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rerender = (view) => { try { if (window.Prancha?.schedule && typeof state !== 'undefined' && (!view || state.view === view)) Prancha.schedule(view || state.view); } catch {} };

  /* ---------- 1 · retomar no tópico ---------- */
  const resume = {
    all() { return readJson(localStorage, RESUME_KEY, {}); },
    get(mapKey) { const r = mapKey ? this.all()[mapKey] : null; return r && r.topicId ? r : null; },
    set(mapKey, row) {
      if (!mapKey || !row?.topicId) return;
      const all = this.all();
      all[mapKey] = { topicId: String(row.topicId).slice(0, 120), title: String(row.title || '').slice(0, 140), at: Date.now() };
      const keys = Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0));
      keys.slice(MAX_RESUME).forEach((k) => delete all[k]);
      writeJson(localStorage, RESUME_KEY, all);
    }
  };
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    const d = e.data;
    if (!d || d.source !== 'meus-mapas-reader' || d.type !== 'topic' || typeof d.topicId !== 'string') return;
    const frame = document.getElementById('readerFrame');
    if (!frame || e.source !== frame.contentWindow) return;
    const key = typeof state !== 'undefined' ? state.readerMapKey : '';
    if (key) resume.set(key, d);
  });

  /* ---------- 2 · revisão guiada no leitor ---------- */
  const RATINGS = [['wrong', 'Errei'], ['hard', 'Difícil'], ['ok', 'Ok'], ['easy', 'Fácil']];
  const guided = {
    session() { const s = readJson(sessionStorage, GUIDED_KEY, null); return s && Array.isArray(s.ids) ? s : null; },
    save(s) { if (s) writeJson(sessionStorage, GUIDED_KEY, s); else { try { sessionStorage.removeItem(GUIDED_KEY); } catch {} } },
    due() { try { return (window.StudyPlanner?.dueTopics?.() || []).filter((r) => r && r.id && r.mapKey && r.topicId); } catch { return []; } },
    count() { return this.due().length; },
    start() {
      const rows = this.due();
      if (!rows.length) { if (typeof toast === 'function') toast('Nenhum tópico vencido para revisar agora.'); return false; }
      this.save({ ids: rows.slice(0, 40).map((r) => r.id), i: 0, rated: 0, startedAt: Date.now() });
      return this.open();
    },
    current() {
      const s = this.session();
      if (!s) return null;
      const rows = this.due();
      while (s.i < s.ids.length) {
        const row = rows.find((r) => r.id === s.ids[s.i]);
        if (row) { this.save(s); return { s, row }; }
        s.i++;
      }
      this.save(s);
      return { s, row: null };
    },
    open() {
      const cur = this.current();
      if (!cur?.row) { this.finish(); return false; }
      if (typeof openMap === 'function') openMap(cur.row.mapKey, { topicId: cur.row.topicId, replace: readerOpen() });
      paintBar();
      return true;
    },
    rate(rating) {
      const cur = this.current();
      if (!cur?.row) return this.finish();
      const rec = window.StudyPlanner?.rateTopic?.(cur.row.id, rating);
      if (!rec) { if (typeof toast === 'function') toast('Não foi possível registrar esta revisão.'); return; }
      cur.s.i++; cur.s.rated++;
      this.save(cur.s);
      /* reabrir o leitor sempre: o mapa relê o estado do tópico que acabou de ser avaliado */
      const next = this.current();
      if (!next?.row) {
        if (typeof openMap === 'function') openMap(cur.row.mapKey, { topicId: cur.row.topicId, replace: true });
        this.finish();
        return;
      }
      this.open();
    },
    skip() { const cur = this.current(); if (!cur) return; cur.s.i++; this.save(cur.s); this.open(); },
    finish(silent) {
      const s = this.session();
      this.save(null);
      paintBar();
      if (!silent && s && typeof toast === 'function') toast(s.rated ? 'Revisão guiada concluída · ' + s.rated + ' ' + (s.rated === 1 ? 'tópico avaliado' : 'tópicos avaliados') + '.' : 'Revisão guiada encerrada.');
      rerender();
    }
  };
  function readerOpen() { return !!document.getElementById('reader')?.classList.contains('open'); }
  function bar() {
    let el = document.getElementById('guidedReviewBar');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'guidedReviewBar';
    el.className = 'guided-review-bar';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Revisão guiada');
    el.hidden = true;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-gr]');
      if (!b) return;
      const a = b.dataset.gr;
      if (a === 'exit') guided.finish();
      else if (a === 'skip') guided.skip();
      else guided.rate(a);
    });
    (document.getElementById('reader') || document.body).appendChild(el);
    return el;
  }
  function paintBar() {
    const cur = guided.session() ? guided.current() : null;
    const el = cur?.row || document.getElementById('guidedReviewBar') ? bar() : null;
    if (!el) return;
    if (!cur?.row || !readerOpen()) { el.hidden = true; return; }
    const { s, row } = cur;
    const code = row.map?.code ? row.map.code + ' · ' : '';
    el.innerHTML = '<div class="gr-copy"><b>Revisão guiada · ' + (s.i + 1) + ' de ' + s.ids.length + '</b><span>' + esc(code + (row.title || 'Tópico')) + '</span></div>' +
      '<div class="gr-rate" role="group" aria-label="Como foi este tópico?">' + RATINGS.map(([k, t]) => '<button type="button" data-gr="' + k + '" class="gr-' + k + '">' + t + '</button>').join('') + '</div>' +
      '<div class="gr-nav"><button type="button" data-gr="skip">Pular</button><button type="button" data-gr="exit" aria-label="Encerrar revisão guiada">Encerrar</button></div>';
    el.hidden = false;
  }
  /* o leitor abre e fecha por vários caminhos; a faixa acompanha a classe "open" */
  function watchReader() {
    const reader = document.getElementById('reader');
    if (!reader) return setTimeout(watchReader, 400);
    new MutationObserver(() => { if (guided.session()) paintBar(); }).observe(reader, { attributes: true, attributeFilter: ['class'] });
    if (guided.session()) paintBar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchReader, { once: true }); else watchReader();

  /* ---------- 3 · estado da nuvem e uso do aparelho ---------- */
  let cloud = { state: 'unknown', at: 0 }, cloudBusy = false;
  async function probeCloud() {
    const cfg = window.STUDY_APP_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { cloud = { state: 'unconfigured', at: Date.now() }; return cloud; }
    if (navigator.onLine === false) { cloud = { state: 'offline', at: Date.now() }; return cloud; }
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => ctl?.abort(), 8000);
    try {
      const r = await fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/auth/v1/health', { headers: { apikey: cfg.supabaseAnonKey }, cache: 'no-store', signal: ctl?.signal });
      cloud = { state: r.ok ? 'ok' : ([402, 503, 540].includes(r.status) ? 'paused' : 'error'), code: r.status, at: Date.now() };
    } catch (e) {
      cloud = { state: navigator.onLine === false ? 'offline' : 'unreachable', at: Date.now() };
    } finally { clearTimeout(timer); }
    return cloud;
  }
  function cloudStatus() {
    if (!cloudBusy && Date.now() - cloud.at > 10 * 60 * 1000) {
      cloudBusy = true;
      probeCloud().finally(() => { cloudBusy = false; rerender('settings'); });
    }
    return cloud;
  }
  let usage = null, usageAt = 0, usageBusy = false;
  function localBytes() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) || ''; n += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch {} return n; }
  async function measureUsage() {
    const out = { local: localBytes(), used: null, quota: null, persisted: null };
    try { const e = await navigator.storage?.estimate?.(); if (e) { out.used = e.usage ?? null; out.quota = e.quota ?? null; } } catch {}
    try { out.persisted = await navigator.storage?.persisted?.() ?? null; } catch {}
    return out;
  }
  function storageUsage() {
    if (!usageBusy && Date.now() - usageAt > 60 * 1000) {
      usageBusy = true;
      measureUsage().then((u) => { usage = u; usageAt = Date.now(); }).finally(() => { usageBusy = false; rerender('settings'); });
    }
    return usage;
  }
  const fmtBytes = (n) => { if (n == null || !isFinite(n)) return '—'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return (i ? n.toFixed(n < 10 ? 1 : 0).replace('.', ',') : Math.round(n)) + ' ' + u[i]; };

  window.StudyFlow = { resume, guided, paintBar, cloudStatus, probeCloud, storageUsage, fmtBytes };

  /* ações das pranchas */
  const P = window.Prancha;
  if (P?.actions) {
    P.actions['guided-review'] = () => guided.start();
  }
})();
