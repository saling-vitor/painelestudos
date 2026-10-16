'use strict';
/* MEUS MAPAS · Prancha · contrato de dados único.
   Todas as pranchas leem daqui: os números vêm dos registros reais do app
   (mapas, progresso, sessões, agenda, revisões, simulados). Nada é inventado:
   quando falta registro, as funções devolvem null/[] e a interface mostra
   estado vazio. */
(() => {
  if (window.Prancha?.data) return;
  const P = (window.Prancha = window.Prancha || {});

  /* ---------- utilitários ---------- */
  const DAY = 86400000;
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const DSEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DSEM_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const esc = (v) => (typeof ESC === 'function' ? ESC(String(v ?? '')) : String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const safeJson = (text, fallback) => { try { const v = JSON.parse(text); return v ?? fallback; } catch { return fallback; } };
  const startDay = (v = new Date()) => { const d = v instanceof Date ? v : new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const addDays = (v, n) => { const d = startDay(v); d.setDate(d.getDate() + Number(n || 0)); return d; };
  const dateKey = (v = new Date()) => { const d = v instanceof Date ? v : new Date(v); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? new Date(value) : null;
    const t = String(value).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(t);
    return Number.isFinite(d.getTime()) ? d : null;
  };
  const daysBetween = (a, b) => Math.round((startDay(b) - startDay(a)) / DAY);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, Number(n) || 0));
  const fmtMin = (minutes) => {
    const n = Math.max(0, Math.round(Number(minutes) || 0));
    if (n < 60) return n + 'min';
    const h = Math.floor(n / 60), m = n % 60;
    return h + 'h' + (m ? String(m).padStart(2, '0') : '');
  };
  const fmtSec = (seconds) => fmtMin((Number(seconds) || 0) / 60);
  const fmtClock = (seconds) => {
    const t = Math.max(0, Math.floor(Number(seconds) || 0)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0');
  };
  const fmtDay = (d) => { const x = parseDate(d); return x ? x.getDate() + ' ' + MESES[x.getMonth()] : '—'; };
  const fmtDayYear = (d, today = new Date()) => { const x = parseDate(d); if (!x) return '—'; return fmtDay(x) + (x.getFullYear() !== today.getFullYear() ? ' ' + x.getFullYear() : ''); };
  const fmtLong = (d) => { const x = parseDate(d); return x ? DSEM_LONGO[x.getDay()] + ', ' + x.getDate() + ' de ' + MESES_LONGOS[x.getMonth()] : '—'; };
  const fmtNum = (n) => Number(n || 0).toLocaleString('pt-BR');
  const plural = (n, one, many) => (Number(n) === 1 ? one : (many || one + 's'));
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const norm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const has = (name) => typeof window[name] === 'function' || (typeof globalThis[name] === 'function');
  const call = (name, ...args) => { try { const fn = globalThis[name]; return typeof fn === 'function' ? fn(...args) : undefined; } catch (e) { console.warn('[Prancha] ' + name, e); return undefined; } };

  /* cache por desenho: os cálculos pesados (progresso, revisões, prioridades) rodam uma vez por quadro */
  const memo = (k, fn) => { const f = P.__frame; if (!f) return fn(); if (!(k in f)) f[k] = fn(); return f[k]; };
  P.memo = memo;
  P.util = { DAY, MESES, MESES_LONGOS, DSEM, DSEM_LONGO, esc, safeJson, startDay, addDays, dateKey, parseDate, daysBetween, clamp, fmtMin, fmtSec, fmtClock, fmtDay, fmtDayYear, fmtLong, fmtNum, plural, pct, norm, call };

  /* ---------- pigmentos (cor semântica de categoria) ---------- */
  /* mesmo mapa de pigmentos das telas antigas (state.js) */
  const PIG = typeof PIGMENTS !== 'undefined' ? PIGMENTS : {};
  const PIG_ORDER = ['latao', 'terracota', 'salvia', 'argila', 'ametista', 'ardosia', 'patina', 'ocre', 'pedra'];
  function categoryPigment(cat) { return typeof window.categoryPigment === 'function' ? window.categoryPigment(cat) : '#c3aa84'; }
  function mapColor(m) { return categoryPigment(m?.category || 'Outros'); }
  P.pigments = PIG;
  P.categoryPigment = categoryPigment;
  P.mapColor = mapColor;

  /* ---------- store Prancha (sincronizado com as preferências da conta) ---------- */
  const STORE_KEY = 'studyapp.prancha.v1';
  const emptyStore = () => ({ version: 1, updatedAt: '', closures: {}, cutoffs: {}, links: {}, history: {}, agendaStarts: {} });
  function normalizeStore(v) {
    const s = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? { ...x } : {});
    return { version: 1, updatedAt: String(s.updatedAt || ''), closures: obj(s.closures), cutoffs: obj(s.cutoffs), links: obj(s.links), history: obj(s.history), agendaStarts: obj(s.agendaStarts) };
  }
  function readStore() { return normalizeStore(safeJson(localStorage.getItem(STORE_KEY) || '{}', {})); }
  function writeStore(value, { touch = true } = {}) {
    const data = normalizeStore(value);
    if (touch) data.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { console.warn('[Prancha] armazenamento indisponível', e); return null; }
    if (touch && typeof touchPreferences === 'function') { try { touchPreferences(); } catch {} }
    return data;
  }
  const rowTs = (r) => Date.parse(r?.updatedAt || r?.at || 0) || 0;
  function mergeRecordMap(a = {}, b = {}) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b || {})) { if (!v || typeof v !== 'object') continue; if (!out[k] || rowTs(v) >= rowTs(out[k])) out[k] = { ...v }; }
    return out;
  }
  function mergeStore(local, incoming) {
    const a = normalizeStore(local), b = normalizeStore(incoming);
    return normalizeStore({
      updatedAt: new Date(Math.max(Date.parse(a.updatedAt || 0) || 0, Date.parse(b.updatedAt || 0) || 0) || Date.now()).toISOString(),
      closures: mergeRecordMap(a.closures, b.closures),
      cutoffs: mergeRecordMap(a.cutoffs, b.cutoffs),
      links: mergeRecordMap(a.links, b.links),
      history: mergeRecordMap(a.history, b.history),
      agendaStarts: mergeRecordMap(a.agendaStarts, b.agendaStarts)
    });
  }
  function importStore(value, { merge = true } = {}) {
    const next = merge ? mergeStore(readStore(), value) : normalizeStore(value);
    writeStore(next, { touch: false });
    return next;
  }
  function patchStore(section, id, patch) {
    const data = readStore();
    const cur = data[section][id] || {};
    data[section][id] = patch === null ? { ...cur, removed: true, updatedAt: new Date().toISOString() } : { ...cur, ...patch, updatedAt: new Date().toISOString() };
    return writeStore(data);
  }
  P.store = { key: STORE_KEY, read: readStore, write: writeStore, merge: mergeStore, import: importStore, patch: patchStore, hasData: () => !!readStore().updatedAt };

  /* ---------- cursos e mapas ---------- */
  const courses = () => memo('courses', () => (call('combinedCourses') || []).filter(Boolean));
  const maps = () => memo('maps', () => (call('combinedMaps') || []).filter(Boolean));
  const keyOf = (m) => (m ? String(m._key || call('mapKey', m) || '') : '');
  const prog = (m) => memo('p:' + keyOf(m), () => call('mapProgress', m)) || { done: 0, review: 0, difficult: 0, marked: 0, pending: 0, total: Number(m?.topics) || 0, pct: 0, pctRaw: 0, lastActivity: '' };
  const agg = (list) => call('aggregateProgress', list) || { done: 0, review: 0, difficult: 0, marked: 0, pending: 0, total: 0, pct: 0, pctRaw: 0, lastActivity: '' };
  const courseById = (id) => courses().find((c) => String(c.id) === String(id)) || null;
  const examDate = (c) => parseDate(c?.examDate || c?.exam_date);
  const isArchived = (c) => c?.status === 'archived';

  function courseSigla(c) {
    if (!c) return 'CURSO';
    const explicit = String(c.code || c.acronym || '').trim();
    if (explicit && explicit.length <= 10) return explicit.toUpperCase();
    const first = String(c.title || '').trim().split(/\s+/)[0] || '';
    if (/^[A-ZÀ-Ý0-9]{2,10}$/.test(first)) return first;
    const inst = /\b([A-Z]{3,10})\b/.exec(String(c.institution || ''));
    if (inst) return inst[1];
    const stop = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'a', 'o']);
    const ini = String(c.title || 'Curso').split(/\s+/).filter((w) => w && !stop.has(w.toLowerCase())).map((w) => w[0]).join('').toUpperCase().slice(0, 5);
    return ini || 'CURSO';
  }
  function courseColor(c) {
    const list = courses().slice().sort((a, b) => String(a.createdAt || a.created_at || a.id).localeCompare(String(b.createdAt || b.created_at || b.id)));
    const i = Math.max(0, list.findIndex((x) => String(x.id) === String(c?.id)));
    return PIG[PIG_ORDER[i % PIG_ORDER.length]];
  }
  function courseLabel(c) {
    if (!c) return '';
    return [c.subtitle, c.board].filter(Boolean).join(' · ');
  }

  /* Folhas: número de prancha calculado (categoria + ordem). Não é gravado. */
  function folhaPrefix(cat) {
    const n = norm(cat);
    if (/legisla|admin|direito|lei/.test(n)) return 'L';
    if (/portugu|lingua/.test(n)) return 'P';
    if (/urban|habita|infraestr|mobilid|planejamento|ambiente/.test(n)) return 'U';
    if (/arquitet|projeto|obras|instala|estrutura|acessib|patrimon|tecnolog/.test(n)) return 'A';
    if (/racioc|matem/.test(n)) return 'R';
    if (/inform/.test(n)) return 'I';
    if (/gerais|atualid/.test(n)) return 'G';
    return 'X';
  }
  function folhas(list) {
    const cnt = {}, out = new Map();
    const order = list.slice().sort((a, b) => {
      const ca = call('mapCategoriesFor', [a, b]) || [];
      if (a.category !== b.category) return ca.indexOf(a.category) - ca.indexOf(b.category);
      return String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR');
    });
    for (const m of order) { const p = folhaPrefix(m.category); cnt[p] = (cnt[p] || 0) + 1; out.set(keyOf(m), p + '-' + String(cnt[p]).padStart(2, '0')); }
    return out;
  }

  /* ---------- mapas compartilhados (vínculo sem duplicar HTML nem progresso) ----------
     links[mapKey] = { courses: [courseId…], updatedAt }. O mapa continua com um único
     estado (o do curso de origem); nos cursos vinculados ele aparece como
     "compartilhado", identificado pelo curso de origem. */
  function linksFor(courseId) {
    const out = [];
    for (const [key, row] of Object.entries(readStore().links)) {
      if (!row || row.removed) continue;
      if ((row.courses || []).map(String).includes(String(courseId))) out.push(key);
    }
    return out;
  }
  function mapsForCourse(courseId, { includeLinked = true } = {}) {
    const all = maps();
    const own = all.filter((m) => String(m.courseId) === String(courseId));
    if (!includeLinked) return own;
    const keys = new Set(own.map(keyOf));
    const linked = linksFor(courseId).map((k) => all.find((m) => keyOf(m) === k)).filter((m) => m && !keys.has(keyOf(m)));
    return [...own, ...linked.map((m) => ({ ...m, _linkedFrom: m.courseId, _linkedTo: courseId }))];
  }
  function linkMap(key, courseId, on = true) {
    const data = readStore();
    const row = data.links[key] && !data.links[key].removed ? data.links[key] : { courses: [] };
    const set = new Set((row.courses || []).map(String));
    if (on) set.add(String(courseId)); else set.delete(String(courseId));
    data.links[key] = { courses: [...set], updatedAt: new Date().toISOString() };
    if (!set.size) data.links[key].removed = true;
    return writeStore(data);
  }
  function linkedCourses(key) { const row = readStore().links[key]; return row && !row.removed ? (row.courses || []).map(String) : []; }
  /* conteúdo em comum detectado (mesmo storageId ou mesmo código+título em cursos diferentes) */
  function commonContent() {
    const groups = new Map();
    for (const m of maps()) {
      const sig = m.storageId ? 'sid:' + m.storageId : 'ct:' + norm(m.code) + '|' + norm(m.title);
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig).push(m);
    }
    return [...groups.values()].filter((g) => new Set(g.map((m) => String(m.courseId))).size > 1);
  }
  P.links = { forCourse: linksFor, link: linkMap, courses: linkedCourses, common: commonContent };

  /* ---------- estado de prova por curso ---------- */
  function closure(courseId) { const r = readStore().closures[courseId]; return r && !r.removed ? r : {}; }
  function courseExamState(c, today = new Date()) {
    const d = examDate(c), cl = closure(c?.id);
    if (!c) return { phase: 'none' };
    if (isArchived(c)) return { phase: 'archived', date: d, days: d ? daysBetween(today, d) : null, closure: cl };
    if (!d) return { phase: 'nodate', date: null, days: null, closure: cl };
    const days = daysBetween(today, d);
    if (days > 0) return { phase: 'before', date: d, days, closure: cl };
    if (days === 0) return { phase: 'today', date: d, days, closure: cl };
    return { phase: 'after', date: d, days, closure: cl };
  }
  function health(c) { return memo('h:' + c?.id, () => healthRaw(c)); }
  function healthRaw(c) { try { return window.StudyAutomation?.courseHealth?.(c) || null; } catch { return null; } }
  function forecast(courseId) { return memo('f:' + courseId, () => forecastRaw(courseId)); }
  function forecastRaw(courseId) { try { return window.StudyPlanner?.forecast?.(courseId) || null; } catch { return null; } }

  function courseSummary(c, today = new Date()) {
    const list = mapsForCourse(c.id, { includeLinked: false });
    const p = agg(list);
    const ex = courseExamState(c, today);
    const h = health(c);
    const done = list.filter((m) => { const q = prog(m); return q.total > 0 && q.marked >= q.total; }).length;
    const never = list.filter((m) => !prog(m).marked && !prog(m).lastActivity).length;
    return { course: c, id: c.id, sigla: courseSigla(c), color: courseColor(c), maps: list, progress: p, exam: ex, health: h, forecast: forecast(c.id), mapsDone: done, mapsNever: never };
  }
  function activeSummaries(today = new Date()) {
    return memo('as', () => courses().filter((c) => !isArchived(c)).map((c) => courseSummary(c, today)).sort((a, b) => {
      const da = a.exam.days, db = b.exam.days;
      const ka = da === null ? 1e6 : da < 0 ? 1e5 - da : da, kb = db === null ? 1e6 : db < 0 ? 1e5 - db : db;
      return ka - kb || String(a.course.title).localeCompare(String(b.course.title), 'pt-BR');
    }));
  }
  /* curso prioritário: o de prova futura mais próxima (inclui hoje) */
  function priorityCourse(today = new Date()) {
    const s = activeSummaries(today);
    return s.find((x) => x.exam.phase === 'before' || x.exam.phase === 'today') || null;
  }
  /* curso em pós-prova: prova passou, curso não arquivado e fechamento não concluído */
  function postExamCourse(today = new Date()) {
    return activeSummaries(today).filter((x) => x.exam.phase === 'after' && !x.exam.closure.dismissedAt).sort((a, b) => b.exam.days - a.exam.days)[0] || null;
  }
  P.courses = { list: courses, byId: courseById, sigla: courseSigla, color: courseColor, label: courseLabel, examDate, examState: courseExamState, summary: courseSummary, active: activeSummaries, priority: priorityCourse, postExam: postExamCourse, isArchived, closure, health };

  /* ---------- metas e tempo ---------- */
  function goals() { const g = window.StudyDashboard?.goals?.() || {}; return { daily: Number(g.dailyMinutes) || 120, weekly: Number(g.weeklyMinutes) || 600, pomodoroWork: Number(g.pomodoroWork) || 25, pomodoroBreak: Number(g.pomodoroBreak) || 5 }; }
  function studyDays() {
    const out = {}, payload = window.StudyTime?.read?.() || { devices: {} };
    for (const dev of Object.values(payload.devices || {})) for (const [k, v] of Object.entries(dev.days || {})) out[k] = (out[k] || 0) + (Number(v) || 0);
    return out;
  }
  function todaySeconds() { return Number(window.StudyTime?.today?.() || 0); }
  function weekSeconds() { return Number(window.StudyTime?.week?.() || 0); }
  /* Ritmo registrado: tópicos marcados por dia ao longo do histórico gravado (não estimado). */
  function recordedPace(courseId) {
    const hist = history();
    const keys = Object.keys(hist).sort();
    if (keys.length < 2) return null;
    const first = hist[keys[0]], last = hist[keys[keys.length - 1]];
    const a = courseId ? first.byCourse?.[courseId]?.[0] : first.marked, b = courseId ? last.byCourse?.[courseId]?.[0] : last.marked;
    const days = daysBetween(parseDate(keys[0]), parseDate(keys[keys.length - 1]));
    if (!days || a === undefined || b === undefined) return null;
    return { perDay: Math.max(0, (b - a) / days), since: keys[0], days };
  }
  P.time = { goals, days: studyDays, today: todaySeconds, week: weekSeconds, pace: recordedPace };

  /* ---------- histórico diário de progresso (curva de avanço) ----------
     Um registro por dia {marked,total,byCourse} gravado quando o app abre ou o
     progresso muda. Nunca reconstrói dias anteriores à implantação. */
  function history() {
    const out = {};
    for (const [k, v] of Object.entries(readStore().history)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && !v.removed) out[k] = v;
    return out;
  }
  let historyTimer = 0;
  function recordHistory() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => {
      try {
        const all = maps();
        if (!all.length) return;
        const p = agg(all), byCourse = {};
        for (const c of courses()) { const q = agg(all.filter((m) => String(m.courseId) === String(c.id))); byCourse[c.id] = [q.marked, q.total]; }
        const key = dateKey(), data = readStore(), cur = data.history[key];
        const same = cur && cur.marked === p.marked && cur.total === p.total && JSON.stringify(cur.byCourse || {}) === JSON.stringify(byCourse);
        if (same) return;
        data.history[key] = { marked: p.marked, total: p.total, byCourse, updatedAt: new Date().toISOString() };
        const keys = Object.keys(data.history).sort();
        while (keys.length > 800) delete data.history[keys.shift()];
        writeStore(data, { touch: !!cur || keys.length > 1 });
      } catch (e) { console.warn('[Prancha] histórico', e); }
    }, 400);
  }
  P.history = { read: history, record: recordHistory };

  /* ---------- revisões ---------- */
  function reviews(today = new Date()) { return memo('rv', () => reviewsRaw(today)); }
  function reviewsRaw(today = new Date()) {
    const all = maps();
    const sum = call('reviewScheduleSummary', all, today) || { due: [], upcoming: [], overdue: [], today: [], dueCount: 0, schedule: {} };
    const topics = (window.StudyPlanner?.dueTopics?.('', today) || []).filter(Boolean);
    const allTopics = (window.StudyPlanner?.topicReviews?.('') || []).filter(Boolean);
    return { summary: sum, topics, allTopics };
  }
  /* fila de revisão por mapa: une revisões de mapa vencidas e tópicos vencidos */
  function reviewQueue(today = new Date()) { return memo('rq', () => reviewQueueRaw(today)); }
  function reviewQueueRaw(today = new Date()) {
    const r = reviews(today), rows = new Map();
    const add = (map, kind, count, due) => {
      if (!map) return;
      const k = keyOf(map);
      const row = rows.get(k) || { map, key: k, topics: 0, mapDue: false, overdueDays: 0, due: null, course: courseById(map.courseId) };
      if (kind === 'topic') row.topics += count; else row.mapDue = true;
      const d = parseDate(due);
      if (d && (!row.due || d < row.due)) row.due = d;
      rows.set(k, row);
    };
    for (const item of r.summary.due || []) add(item.map, 'map', 1, item.schedule?.dueAt);
    for (const t of r.topics) add(t.map || (typeof mapById === 'function' ? mapById(t.mapKey) : null), 'topic', 1, t.dueAt);
    const t0 = startDay(today);
    const list = [...rows.values()].map((row) => {
      row.overdueDays = row.due && row.due < t0 ? daysBetween(row.due, t0) : 0;
      const p = prog(row.map);
      /* estimativa fundamentada: segundos por tópico do histórico real do mapa; sem histórico, 50 s por tópico */
      const sec = Number(window.StudyTime?.mapSeconds?.(row.key) || 0);
      const perTopic = sec > 0 && p.marked > 0 ? clamp(sec / p.marked, 20, 600) : 50;
      const count = row.topics || Math.max(1, (p.review || 0) + (p.difficult || 0)) || 1;
      row.count = count;
      row.perTopicSeconds = perTopic;
      row.estimatedBasis = sec > 0 && p.marked > 0 ? 'histórico' : 'padrão';
      row.minutes = Math.max(5, Math.round((count * perTopic) / 60));
      const ex = row.course ? courseExamState(row.course, today) : { phase: 'none' };
      row.examDays = ex.days;
      return row;
    });
    list.sort((a, b) => {
      const ea = a.examDays === null || a.examDays < 0 ? 1e6 : a.examDays, eb = b.examDays === null || b.examDays < 0 ? 1e6 : b.examDays;
      return ea - eb || b.overdueDays - a.overdueDays || b.count - a.count;
    });
    return list;
  }
  /* próximos dias: contagem de revisões por dia (mapas + tópicos). */
  function reviewCalendar(days = 7, today = new Date()) { return memo('rc:' + days, () => reviewCalendarRaw(days, today)); }
  function reviewCalendarRaw(days = 7, today = new Date()) {
    const r = reviews(today), out = [];
    const sched = r.summary.schedule || {};
    const mapsAll = maps();
    const examDays = new Set(courses().filter((c) => !isArchived(c)).map((c) => examDate(c)).filter(Boolean).map((d) => dateKey(d)));
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i), k = dateKey(d);
      let n = 0;
      for (const m of mapsAll) { const e = sched[keyOf(m)]; if (e?.dueAt && dateKey(parseDate(e.dueAt) || new Date(e.dueAt)) === k) n++; }
      for (const t of r.allTopics) if (t.dueAt && dateKey(new Date(t.dueAt)) === k) n++;
      if (i === 0) n = Math.max(n, reviewQueue(today).reduce((s, x) => s + x.count, 0));
      out.push({ date: d, key: k, count: n, exam: examDays.has(k) });
    }
    return out;
  }
  /* adiar revisões que caem no dia de uma prova para o dia seguinte (não exclui nada) */
  function postponeExamDayReviews() {
    const examKeys = new Set(courses().filter((c) => !isArchived(c)).map((c) => examDate(c)).filter((d) => d && d >= startDay()).map(dateKey));
    if (!examKeys.size) return { moved: 0 };
    let moved = 0;
    const sched = call('readReviewSchedule') || {};
    for (const [k, e] of Object.entries(sched)) {
      if (!e?.dueAt) continue;
      const d = new Date(e.dueAt);
      if (examKeys.has(dateKey(d))) { d.setDate(d.getDate() + 1); sched[k] = { ...e, dueAt: d.toISOString(), postponedFromExam: true }; moved++; }
    }
    if (moved) call('writeReviewSchedule', sched);
    try {
      const planner = window.StudyPlanner?.exportData?.();
      const rows = window.StudyPlanner?.topicReviews?.('') || [];
      if (planner && rows.length) {
        let tmoved = 0;
        for (const row of rows) {
          if (!row?.dueAt) continue;
          const d = new Date(row.dueAt);
          if (!examKeys.has(dateKey(d))) continue;
          d.setDate(d.getDate() + 1);
          planner.topicReviews[row.id] = { ...(row.stored || {}), dueAt: d.toISOString(), postponedFromExam: true, updatedAt: new Date().toISOString() };
          tmoved++;
        }
        if (tmoved) { planner.updatedAt = new Date().toISOString(); window.StudyPlanner.importData(planner, { mergeData: false, silent: true }); moved += tmoved; }
      }
    } catch (e) { console.warn('[Prancha] adiar revisões', e); }
    if (moved && typeof touchPreferences === 'function') touchPreferences();
    return { moved };
  }
  P.reviews = { read: reviews, queue: reviewQueue, calendar: reviewCalendar, postponeExamDay: postponeExamDayReviews };

  /* ---------- agenda ---------- */
  const DEFAULT_START = '19:00';
  function agendaData() { return memo('ad', () => agendaDataRaw()); }
  function agendaDataRaw() { return window.StudyDashboard?.exportData?.() || { agenda: [], sessions: [], doubts: [], goals: {} }; }
  function agendaStart(item) {
    if (!item) return null;
    if (item.start && /^\d{2}:\d{2}$/.test(item.start)) return item.start;
    const s = readStore().agendaStarts[item.id];
    if (s && !s.removed && /^\d{2}:\d{2}$/.test(s.start)) return s.start;
    return null;
  }
  function setAgendaStart(id, start) { if (!/^\d{2}:\d{2}$/.test(String(start || ''))) return null; return patchStore('agendaStarts', id, { start }); }
  function agendaForDate(d) {
    const k = dateKey(d), data = agendaData();
    return (data.agenda || []).filter((x) => !x.deleted && x.date === k).map((x) => ({ ...x, kind: x.kind || 'study', startResolved: agendaStart(x), startDefault: !agendaStart(x) }));
  }
  function sessionsForDate(d) {
    const k = dateKey(d);
    return (agendaData().sessions || []).filter((s) => !s.deleted && s.startedAt && dateKey(new Date(s.startedAt)) === k);
  }
  const toMin = (hhmm) => { const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || '')); return m ? +m[1] * 60 + +m[2] : null; };
  const fromMin = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  /* blocos do dia com horário resolvido; itens antigos sem hora entram às 19:00 (só exibição) e
     ficam em sequência para não sobrepor. Conflitos reais (horários definidos sobrepostos) são marcados. */
  function dayBlocks(d) { return memo('db:' + dateKey(d), () => dayBlocksRaw(d)); }
  function dayBlocksRaw(d) {
    const items = agendaForDate(d).sort((a, b) => (toMin(a.startResolved) ?? 1e4) - (toMin(b.startResolved) ?? 1e4));
    let cursor = toMin(DEFAULT_START);
    const out = [];
    for (const it of items) {
      const mins = Math.max(10, Number(it.minutes) || 30);
      let start = toMin(it.startResolved);
      if (start === null) { start = cursor; }
      out.push({ item: it, start, end: start + mins, minutes: mins, explicit: !!it.startResolved });
      if (!it.startResolved) cursor = start + mins;
    }
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) if (out[i].explicit && out[j].explicit && out[j].start < out[i].end && out[i].start < out[j].end) { out[i].conflict = true; out[j].conflict = true; }
    return out;
  }
  /* horários livres sugeridos (não grava nada): respeitam dias disponíveis e carga máxima */
  function freeSlots(d, { need = 0 } = {}) {
    const settings = window.StudyPlanner?.settings?.() || { availableDays: [1, 2, 3, 4, 5, 6], maxDailyMinutes: 120 };
    const day = parseDate(d) || new Date();
    if (!settings.availableDays.includes(day.getDay())) return [];
    if (courses().some((c) => !isArchived(c) && examDate(c) && dateKey(examDate(c)) === dateKey(day))) return [];
    const blocks = dayBlocks(day), planned = blocks.reduce((s, b) => s + b.minutes, 0);
    let budget = Math.max(0, (settings.maxDailyMinutes || 120) - planned);
    if (need) budget = Math.min(budget, need);
    if (budget < 20) return [];
    const now = new Date(), isToday = dateKey(day) === dateKey(now);
    const windows = [[9 * 60, 12 * 60], [14 * 60, 18 * 60], [20 * 60 + 30, 22 * 60]];
    const out = [];
    for (const [a, b] of windows) {
      let s = a;
      if (isToday) s = Math.max(s, Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 15) * 15);
      while (s + 20 <= b && budget >= 20 && out.length < 3) {
        const len = Math.min(budget, 40, b - s);
        const clash = blocks.some((x) => s < x.end && x.start < s + len);
        if (!clash && len >= 20) { out.push({ start: fromMin(s), minutes: len }); budget -= len; s += len + 30; }
        else s += 15;
      }
    }
    return out;
  }
  P.agenda = { data: agendaData, start: agendaStart, setStart: setAgendaStart, forDate: agendaForDate, sessionsForDate, blocks: dayBlocks, free: freeSlots, toMin, fromMin, DEFAULT_START };

  /* ---------- simulados ---------- */
  function sims() { return (call('combinedSimulations') || []).filter((s) => s && s.status !== 'deleted' && s.status !== 'archived'); }
  function simKey(s) { return s?._key || call('simulationKey', s) || ''; }
  function attempts(s) { return call('simulationAttemptsFor', s) || []; }
  function simCourse(s) { return courseById(s?.courseId); }
  function simCode(s) {
    const m = /SIM(?:ULADO)?[ _-]*0?(\d{1,3})/i.exec(String(s?.code || s?.title || ''));
    return m ? 'SIM ' + String(m[1]).padStart(2, '0') : String(s?.code || 'SIM').slice(0, 10).toUpperCase();
  }
  function cutoffFor(scopeId) { const r = readStore().cutoffs[scopeId]; return r && !r.removed && Number.isFinite(Number(r.value)) ? r : null; }
  /* corte do curso (oficial > meta > estimativa) */
  function courseCutoff(courseId) { return cutoffFor('course:' + courseId); }
  function setCourseCutoff(courseId, value, kind) {
    const v = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0 || v > 100) return null;
    return patchStore('cutoffs', 'course:' + courseId, { value: Math.round(v * 10) / 10, kind: ['oficial', 'meta', 'estimativa'].includes(kind) ? kind : 'meta' });
  }
  function clearCourseCutoff(courseId) { return patchStore('cutoffs', 'course:' + courseId, null); }
  /* gabarito por questão: só quando os erros registrados batem com erradas+branco */
  function answerGrid(attempt) {
    if (!attempt) return null;
    const total = Number(attempt.total) || 0, wrong = Number(attempt.wrong) || 0, blank = Number(attempt.blank) || 0;
    const list = Array.isArray(attempt.mistakes) ? attempt.mistakes.filter((m) => Number(m.number) > 0) : [];
    if (!total || !list.length) return null;
    const nums = new Set(list.map((m) => Number(m.number)));
    if (nums.size !== wrong + blank) return null;
    const cells = [];
    for (let i = 1; i <= total; i++) {
      const mk = list.find((m) => Number(m.number) === i);
      cells.push({ n: i, state: mk ? (String(mk.userAnswer || '').trim() ? 'er' : 'br') : 'ok', mistake: mk || null });
    }
    return cells;
  }
  function simSummary(courseId = '') {
    const list = sims().filter((s) => !courseId || String(s.courseId) === String(courseId));
    const rows = list.map((s) => { const a = attempts(s); const best = a.length ? Math.max(...a.map((x) => Number(x.score) || 0)) : null; return { sim: s, key: simKey(s), attempts: a, latest: a[0] || null, best }; });
    const done = rows.filter((r) => r.attempts.length);
    return { list: rows, done: done.length, total: rows.length, best: done.length ? Math.max(...done.map((r) => r.best)) : null, questions: list.reduce((s, x) => s + (Number(x.questions) || 0), 0) };
  }
  P.sims = { list: sims, key: simKey, attempts, course: simCourse, code: simCode, summary: simSummary, cutoff: courseCutoff, setCutoff: setCourseCutoff, clearCutoff: clearCourseCutoff, grid: answerGrid };

  /* ---------- dúvidas ---------- */
  function doubts({ open = true } = {}) {
    return (agendaData().doubts || []).filter((d) => !d.deleted && (!open || !d.resolved)).sort((a, b) => (Date.parse(b.createdAt || 0) || 0) - (Date.parse(a.createdAt || 0) || 0));
  }
  P.doubts = { list: doubts };

  /* ---------- sessão ativa (cronômetro real do app) ---------- */
  function session() {
    const a = window.StudyDashboard?.active?.();
    if (!a) return null;
    const elapsed = Number(window.StudyDashboard?.elapsed?.() || 0);
    const map = a.mapKey && typeof mapById === 'function' ? mapById(a.mapKey) : null;
    return { active: a, elapsed, target: Number(a.targetSeconds) || 0, running: !!a.running, map, startProgress: a.startProgress || null, progress: map ? prog(map) : null };
  }
  P.session = { read: session };

  /* ---------- prioridades ---------- */
  function priorityAll(courseId) { return memo('pr:' + courseId, () => { try { return window.StudyPlanner?.priorityRows?.(courseId ? mapsForCourse(courseId, { includeLinked: false }) : maps()) || []; } catch { return []; } }); }
  function priorities(n = 3, courseId = '') {
    try {
      const rows = priorityAll(courseId) || window.StudyPlanner?.priorityRows?.(courseId ? mapsForCourse(courseId, { includeLinked: false }) : maps()) || [];
      return rows.filter((r) => r.progress.pending > 0 || r.progress.difficult > 0 || r.progress.review > 0 || r.dueTopics > 0).slice(0, n);
    } catch { return []; }
  }
  function dailyPlan() { return memo('dp', () => dailyPlanRaw()); }
  function dailyPlanRaw() { try { return window.StudyCoach?.snapshot?.() || { items: [], summary: {} }; } catch { return { items: [], summary: {} }; } }
  P.plan = { priorities, daily: dailyPlan };

  P.data = { keyOf, prog, agg, maps, folhas, mapsForCourse };

  /* ---------- integração com sincronização e backup ---------- */
  function installSync() {
    if (typeof localPreferences === 'function' && !localPreferences.__prancha) {
      const base = localPreferences;
      const wrapped = function () { const out = base.apply(this, arguments) || {}; out.prancha = readStore(); return out; };
      wrapped.__prancha = true;
      try { localPreferences = wrapped; } catch {} // eslint-disable-line no-global-assign
      window.localPreferences = wrapped;
    }
    if (typeof window.mergePreferencePayloads === 'function' && !window.mergePreferencePayloads.__prancha) {
      const base = window.mergePreferencePayloads;
      const wrapped = function (local = {}, cloud = {}, lt = 0, ct = 0) {
        const out = base.apply(this, arguments) || {};
        if (local.prancha || cloud.prancha) out.prancha = mergeStore(local.prancha || {}, cloud.prancha || {});
        return out;
      };
      wrapped.__prancha = true;
      window.mergePreferencePayloads = wrapped;
    }
    if (typeof applyPreferences === 'function' && !applyPreferences.__prancha) {
      const base = applyPreferences;
      const wrapped = function (payload = {}) { const r = base.apply(this, arguments); if (payload && payload.prancha && typeof payload.prancha === 'object') importStore(payload.prancha, { merge: true }); return r; };
      wrapped.__prancha = true;
      try { applyPreferences = wrapped; } catch {} // eslint-disable-line no-global-assign
      window.applyPreferences = wrapped;
    }
    if (typeof buildStudyBackup === 'function' && !buildStudyBackup.__prancha) {
      const base = buildStudyBackup;
      const wrapped = function () { const b = base.apply(this, arguments); if (b && b.data) b.data.prancha = readStore(); return b; };
      wrapped.__prancha = true;
      try { buildStudyBackup = wrapped; } catch {} // eslint-disable-line no-global-assign
      window.buildStudyBackup = wrapped;
    }
    if (typeof restoreStudyBackup === 'function' && !restoreStudyBackup.__prancha) {
      const base = restoreStudyBackup;
      const wrapped = async function (backup, options) { const r = await base.apply(this, arguments); try { const v = backup?.data?.prancha; if (v && typeof v === 'object') importStore(v, { merge: options?.replace !== true }); } catch {} return r; };
      wrapped.__prancha = true;
      try { restoreStudyBackup = wrapped; } catch {} // eslint-disable-line no-global-assign
      window.restoreStudyBackup = wrapped;
    }
  }
  P.installSync = installSync;
  installSync();
})();
