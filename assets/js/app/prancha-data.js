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
  /* V15.56: editais (estrutura da prova e cronograma por curso), padroes (estrutura típica por banca)
     e mapMeta (alcance de cada mapa) entram no mesmo armazenamento, sincronizado e no backup. */
  const SECTIONS = ['closures', 'cutoffs', 'links', 'history', 'agendaStarts', 'editais', 'padroes', 'mapMeta', 'prefs', 'treinos', 'modelo', 'tec'];
  const emptyStore = () => ({ version: 1, updatedAt: '', ...Object.fromEntries(SECTIONS.map((k) => [k, {}])) });
  function normalizeStore(v) {
    const s = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? { ...x } : {});
    return { version: 1, updatedAt: String(s.updatedAt || ''), ...Object.fromEntries(SECTIONS.map((k) => [k, obj(s[k])])) };
  }
  function readStore() { return normalizeStore(safeJson(localStorage.getItem(STORE_KEY) || '{}', {})); }
  function writeStore(value, { touch = true } = {}) {
    const data = normalizeStore(value);
    if (touch) data.updatedAt = new Date().toISOString();
    P.__amClear?.();
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
      ...Object.fromEntries(SECTIONS.map((k) => [k, mergeRecordMap(a[k], b[k])]))
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
  /* allMaps: acervo completo (biblioteca, cursos, histórico). maps: só o que está em estudo —
     mapas de concursos encerrados (arquivados ou com prova já realizada) ficam de fora (V15.54). */
  const allMaps = () => memo('allMaps', () => (call('combinedMaps') || []).filter(Boolean));
  const maps = () => memo('maps', () => (window.StudyScope ? window.StudyScope.maps(allMaps()) : allMaps()));
  const isRetired = (c) => (window.StudyScope ? window.StudyScope.courseRetired(c) : c?.status === 'archived');
  const keyOf = (m) => (m ? String(m._key || call('mapKey', m) || '') : '');
  const prog = (m) => memo('p:' + keyOf(m), () => call('mapProgress', m)) || { done: 0, review: 0, difficult: 0, marked: 0, pending: 0, total: Number(m?.topics) || 0, pct: 0, pctRaw: 0, lastActivity: '' };
  const agg = (list) => call('aggregateProgress', list) || { done: 0, review: 0, difficult: 0, marked: 0, pending: 0, total: 0, pct: 0, pctRaw: 0, lastActivity: '' };
  const courseById = (id) => courses().find((c) => String(c.id) === String(id)) || null;
  const examDate = (c) => parseDate(c?.examDate || c?.exam_date);
  const isArchived = (c) => c?.status === 'archived';

  /* V15.60 · nome de exibição completo: a sigla curta que é só o começo do nome da cidade ou do órgão
     (MONTE → MONTENEGRO, IJUI → IJUÍ) aparece por extenso; siglas de órgão (CASAN, DMHAB) ficam como estão. */
  function courseSigla(c) {
    const code = courseCode(c);
    if (!c || code === 'CURSO') return code;
    const fold = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const k = fold(code);
    if (!k) return code;
    const inst = String(c.institution || '').replace(/^.*?\b(?:Prefeitura(?: Municipal)?|Munic[ií]pio|C[aâ]mara(?: Municipal)?)\s+de\s+/i, '');
    const cands = [String(c.city || '').split(/[\/,–-]/)[0], inst.split(/[\/,–-]/)[0]].concat(String(c.title || '').split(/\s+/)).map((x) => String(x || '').trim()).filter(Boolean);
    for (const name of cands) {
      const f = fold(name);
      if (f.length <= 18 && f.length >= k.length && f.startsWith(k)) return name.toUpperCase();
    }
    return code;
  }
  function courseCode(c) {
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
    const all = allMaps();
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
    for (const m of allMaps()) {
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
  const byExam = (a, b) => {
    const da = a.exam.days, db = b.exam.days;
    const ka = da === null ? 1e6 : da < 0 ? 1e5 - da : da, kb = db === null ? 1e6 : db < 0 ? 1e5 - db : db;
    return ka - kb || String(a.course.title).localeCompare(String(b.course.title), 'pt-BR');
  };
  /* concursos em estudo: nem arquivados nem com prova já realizada */
  function activeSummaries(today = new Date()) {
    return memo('as', () => courses().filter((c) => !isRetired(c)).map((c) => courseSummary(c, today)).sort(byExam));
  }
  /* encerrados: arquivados ou com prova realizada (Cursos → Encerrados) */
  function retiredSummaries(today = new Date()) {
    return memo('rs', () => courses().filter((c) => isRetired(c)).map((c) => courseSummary(c, today)).sort(byExam));
  }
  function unarchivedSummaries(today = new Date()) {
    return memo('us', () => courses().filter((c) => !isArchived(c)).map((c) => courseSummary(c, today)).sort(byExam));
  }
  /* curso prioritário: o de prova futura mais próxima (inclui hoje) */
  function priorityCourse(today = new Date()) {
    const s = activeSummaries(today);
    return s.find((x) => x.exam.phase === 'before' || x.exam.phase === 'today') || null;
  }
  /* curso em pós-prova: prova passou há até 30 dias, curso não arquivado e fechamento não concluído.
     (Ele já está fora do estudo; esta tela só serve para registrar gabarito e arquivar.) */
  function postExamCourse(today = new Date()) {
    return unarchivedSummaries(today).filter((x) => x.exam.phase === 'after' && x.exam.days >= -30 && !x.exam.closure.dismissedAt).sort((a, b) => b.exam.days - a.exam.days)[0] || null;
  }
  P.courses = { list: courses, byId: courseById, sigla: courseSigla, code: courseCode, color: courseColor, label: courseLabel, examDate, examState: courseExamState, summary: courseSummary, active: activeSummaries, retired: retiredSummaries, priority: priorityCourse, postExam: postExamCourse, isArchived, isRetired, closure, health };

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
        const all = allMaps();
        if (!all.length) return;
        const p = agg(all), byCourse = {};
        for (const c of courses()) { const q = agg(all.filter((m) => String(m.courseId) === String(c.id))); let np = null; try { np = notaProjetada(c.id); } catch {} byCourse[c.id] = np ? [q.marked, q.total, np.pontos] : [q.marked, q.total]; }
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
    const live = new Set(all.map(keyOf));
    const topics = (window.StudyPlanner?.dueTopics?.('', today) || []).filter((t) => t && live.has(String(t.mapKey || keyOf(t.map))));
    const allTopics = (window.StudyPlanner?.topicReviews?.('') || []).filter((t) => t && live.has(String(t.mapKey || keyOf(t.map))));
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
      /* V15.58 · pontos da prova que dependem desta revisão: pontos por tópico da disciplina × itens */
      const ppt = pptDoMapa(row.map);
      row.ppt = ppt || 0;
      row.pontos = ppt ? Math.round(ppt * count * 100) / 100 : 0;
      return row;
    });
    list.sort((a, b) => {
      const ea = a.examDays === null || a.examDays < 0 ? 1e6 : a.examDays, eb = b.examDays === null || b.examDays < 0 ? 1e6 : b.examDays;
      return ea - eb || b.pontos - a.pontos || b.overdueDays - a.overdueDays || b.count - a.count;
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
    /* V15.54: blocos de estudo ligados a mapas de concursos encerrados não entram no dia */
    const retired = (x) => { if (!x.mapKey || !window.StudyScope || typeof mapById !== 'function') return false; const m = mapById(x.mapKey); return !!m && window.StudyScope.mapRetired(m); };
    return (data.agenda || []).filter((x) => !x.deleted && x.date === k && !retired(x)).map((x) => ({ ...x, kind: x.kind || 'study', startResolved: agendaStart(x), startDefault: !agendaStart(x) }));
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
  /* V15.58 · revisões com horário: um bloco do dia (não gravado na agenda) no horário escolhido em Agenda,
     com a duração estimada pela fila; não existe no dia de prova nem quando nada vence. */
  function reviewBlock(d) {
    const cfg = pref('revHorario') || {};
    if (!cfg.on || !/^\d{2}:\d{2}$/.test(String(cfg.start || ''))) return null;
    const day = parseDate(d) || new Date(), t0 = startDay();
    if (day < t0 || !(cfg.days || [1, 2, 3, 4, 5, 6]).includes(day.getDay())) return null;
    if (courses().some((c) => !isArchived(c) && examDate(c) && dateKey(examDate(c)) === dateKey(day))) return null;
    const off = daysBetween(t0, day);
    if (off > 30) return null;
    let count = 0, minutes = 0;
    if (off === 0) { const q = reviewQueue(); count = q.reduce((n, x) => n + x.count, 0); minutes = q.reduce((n, x) => n + x.minutes, 0); }
    else { const cal = reviewCalendar(off + 1)[off]; count = cal ? cal.count : 0; minutes = Math.round((count * 50) / 60); }
    if (!count) return null;
    const max = Math.max(10, Number(cfg.max) || 40);
    return { id: 'rev-' + dateKey(day), kind: 'review', title: 'Revisões do dia', date: dateKey(day), minutes: Math.max(10, Math.min(max, minutes)), count, virtual: true, startResolved: cfg.start, startDefault: false };
  }
  function dayBlocksRaw(d) {
    const rv = reviewBlock(d);
    const items = agendaForDate(d).concat(rv ? [rv] : []).sort((a, b) => (toMin(a.startResolved) ?? 1e4) - (toMin(b.startResolved) ?? 1e4));
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
  P.agenda = { reviewBlock, data: agendaData, start: agendaStart, setStart: setAgendaStart, forDate: agendaForDate, sessionsForDate, blocks: dayBlocks, free: freeSlots, toMin, fromMin, DEFAULT_START };

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
  /* V15.57 · unidade do corte: '%' (padrão, como antes) ou 'pts' (pontos da banca, quando há estrutura da prova) */
  function setCourseCutoff(courseId, value, kind, unit = '%') {
    const v = Number(String(value).replace(',', '.')), u = unit === 'pts' ? 'pts' : '%';
    const max = u === 'pts' ? Math.max(1, pontosMax(provaOf(courseId))) : 100;
    if (!Number.isFinite(v) || v <= 0 || v > max) return null;
    return patchStore('cutoffs', 'course:' + courseId, { value: Math.round(v * 10) / 10, kind: ['oficial', 'meta', 'estimativa'].includes(kind) ? kind : 'meta', unit: u });
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
      const live = new Set(maps().map(keyOf));
      const rows = priorityAll(courseId) || window.StudyPlanner?.priorityRows?.(courseId ? mapsForCourse(courseId, { includeLinked: false }) : maps()) || [];
      return rows.filter((r) => (courseId || live.has(r.key || keyOf(r.map)))).filter((r) => r.progress.pending > 0 || r.progress.difficult > 0 || r.progress.review > 0 || r.dueTopics > 0).slice(0, n);
    } catch { return []; }
  }
  function dailyPlan() { return memo('dp', () => dailyPlanRaw()); }
  function dailyPlanRaw() { try { return window.StudyCoach?.snapshot?.() || { items: [], summary: {} }; } catch { return { items: [], summary: {} }; } }
  P.plan = { priorities, daily: dailyPlan };

  /* ---------- editais (V15.56) ----------
     editais[courseId] = { banca, prova:[{id,nome,questoes,peso,minimo,categorias[],padrao}], minimoGeral, fonte,
                           fases:{<fase>:{date}}, cargo:{vagas,carga,vencimento,validade,desempate}, updatedAt }
     padroes[BANCA]    = { prova, minimoGeral, fonte, updatedAt }  (ponto de partida ao criar um curso)
     mapMeta[mapKey]   = { alcance, updatedAt }                       (local · estadual · portátil · misto)
     Sem estrutura da prova, nada muda: as funções devolvem [] ou null e as telas seguem como antes. */
  const FASES = [['inscricoes', 'Inscrições'], ['homologacao', 'Homologação'], ['prova', 'Prova'], ['gabarito', 'Gabarito preliminar'], ['recursos', 'Recursos'], ['resultado', 'Resultado final'], ['convocacao', 'Convocação']];
  const PADROES_BASE = {
    FUNDATEC: {
      prova: [
        { id: 'lp', nome: 'Língua Portuguesa', questoes: 10, peso: 1, minimo: 4, categorias: ['Português'] },
        { id: 'leg', nome: 'Legislação', questoes: 10, peso: 1, minimo: 4, categorias: ['Legislação e Administração'] },
        { id: 'esp', nome: 'Conhecimentos Específicos', questoes: 40, peso: 2, minimo: 40, categorias: [], padrao: true }
      ],
      minimoGeral: 50,
      fonte: 'Edital DEMHAB 001/2026, item 13.1.2 (60 questões, nível superior)'
    },
    /* V15.61 · AOCP (CASAN 003/2026, Tabela 9.1): 50 questões de 1 ponto, sem mínimo por área, 50% no total, títulos até 10 */
    AOCP: {
      prova: [
        { id: 'lp', nome: 'Língua Portuguesa', questoes: 10, peso: 1, minimo: 0, categorias: ['Português'] },
        { id: 'rlm', nome: 'Raciocínio Lógico-Matemático', questoes: 7, peso: 1, minimo: 0, categorias: [] },
        { id: 'atu', nome: 'Conhecimentos Gerais - Atualidades', questoes: 3, peso: 1, minimo: 0, categorias: [] },
        { id: 'leg', nome: 'Legislação', questoes: 5, peso: 1, minimo: 0, categorias: ['Legislação e Administração'] },
        { id: 'esp', nome: 'Conhecimentos Específicos', questoes: 25, peso: 1, minimo: 0, categorias: [], padrao: true }
      ],
      minimoGeral: 25,
      titulos: 10,
      fonte: 'Edital CASAN 003/2026, Tabela 9.1 (50 questões, todos os cargos)'
    }
  };
  const ALCANCES = [['local', 'Local'], ['estadual', 'Estadual'], ['portatil', 'Portátil'], ['misto', 'Misto']];
  const num = (v, d = 0) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
  const r2 = (n) => Math.round(n * 100) / 100;
  /* V15.62 · unidades de mínimo vistas nos editais: pontos (DEMHAB), acertos (Ijuí, Legalle, TJSC) e % (FGV, Cesgranrio, Legalle no total) */
  const UNIDADES = ['pontos', 'acertos', 'pct'];
  const unidade = (u) => (UNIDADES.includes(u) ? u : 'pontos');
  function normDisc(d, i) {
    if (!d || typeof d !== 'object') return null;
    const nome = String(d.nome || '').trim();
    if (!nome) return null;
    const id = String(d.id || norm(nome).replace(/\s+/g, '-') || 'd' + i).slice(0, 40);
    return { id, nome, questoes: Math.max(0, Math.round(num(d.questoes))), peso: Math.max(0, num(d.peso, 1)), minimo: Math.max(0, num(d.minimo)), minimoEm: unidade(d.minimoEm), grupo: String(d.grupo || '').trim().slice(0, 60), categorias: Array.isArray(d.categorias) ? d.categorias.map(String) : [], padrao: !!d.padrao };
  }
  /* mínimo (de disciplina ou bloco) convertido em pontos, para comparar com a nota e desenhar a régua */
  const minEmPts = (minimo, em, max, questoes) => r2(em === 'acertos' ? minimo * (questoes ? max / questoes : 1) : em === 'pct' ? (minimo / 100) * max : minimo);
  const minPts = (d) => minEmPts(d.minimo, d.minimoEm, d.questoes * d.peso, d.questoes);
  function normProva(list) {
    const out = (Array.isArray(list) ? list : []).map(normDisc).filter((d) => d && d.questoes > 0);
    if (out.length && !out.some((d) => d.padrao)) out[out.length - 1].padrao = true;
    return out;
  }
  function editalOf(courseId) { const r = readStore().editais[courseId]; return r && !r.removed ? r : null; }
  function provaOf(courseId) { return memo('ep:' + courseId, () => normProva(editalOf(courseId)?.prova)); }
  function setEdital(courseId, patch) { return patchStore('editais', courseId, patch); }
  const pontosMax = (prova) => prova.reduce((s, d) => s + d.questoes * d.peso, 0);
  /* ---------- V15.62 · regras da prova além das disciplinas ----------
     grupos[]   blocos/módulos/partes com mínimo próprio e peso (FGV Módulo I/II, Cebraspe P1/P2, FCC Gerais × Específicos)
     minimoGeralEm  pontos · acertos (TJSC: 48 questões) · pct (Legalle: 50% do total)
     naoZerar   eliminado quem zerar qualquer disciplina (FGV AMAZUL, IBADE CAU-RO)
     formato    multipla · certo-errado; penalidade = fração do valor da questão descontada por erro (Cebraspe: 1)
     escala     soma (padrão) · media10 (FCC: cada prova de 0 a 10, média ponderada pelos pesos dos grupos) · padronizada (FCC: escore média 50, DP 10)
     etapas[]   discursiva · redacao · estudo-caso · pratica · titulos · oral, com máximo, mínimo, caráter e peso na nota final
     notaFinal  soma (padrão) · ponderada (FEPESE: 0,8 × objetiva + 0,2 × títulos) · media (FURB: (NPO + NPP) / 2) */
  const ETAPAS = [['discursiva', 'Prova discursiva'], ['redacao', 'Redação'], ['estudo-caso', 'Estudo de caso'], ['pratica', 'Prova prática'], ['titulos', 'Títulos'], ['oral', 'Prova oral']];
  const ESCALAS = [['soma', 'Soma dos pontos'], ['media10', 'Cada prova de 0 a 10, média ponderada'], ['padronizada', 'Escore padronizado (depende do grupo)']];
  const NOTAS_FINAIS = [['soma', 'Soma das etapas'], ['ponderada', 'Média ponderada pelos pesos'], ['media', 'Média simples das etapas']];
  function normEtapa(x, i) {
    if (!x || typeof x !== 'object') return null;
    const tipo = ETAPAS.some(([id]) => id === x.tipo) ? x.tipo : 'discursiva', max = Math.max(0, num(x.max));
    if (!max) return null;
    const carater = ['E', 'C', 'EC'].includes(x.carater) ? x.carater : tipo === 'titulos' ? 'C' : 'EC';
    return { id: String(x.id || tipo + (i ? '-' + i : '')).slice(0, 40), tipo, nome: String(x.nome || ETAPAS.find(([id]) => id === tipo)[1]).trim().slice(0, 80), max, minimo: Math.max(0, num(x.minimo)), minimoEm: x.minimoEm === 'pct' ? 'pct' : 'pontos', carater, peso: x.peso === undefined || x.peso === '' || x.peso === null ? null : Math.max(0, num(x.peso)), nota: String(x.nota || '').slice(0, 200) };
  }
  function regrasDe(e, prova) {
    e = e || {};
    const usados = new Set(prova.map((d) => d.grupo).filter(Boolean));
    const gIn = Array.isArray(e.grupos) ? e.grupos : [];
    const grupos = [...usados].map((nome) => { const g = gIn.find((x) => String(x.nome || '').trim() === nome) || {}; const ds = prova.filter((d) => d.grupo === nome); return { id: norm(nome).replace(/\s+/g, '-').slice(0, 40) || 'g', nome, minimo: Math.max(0, num(g.minimo)), minimoEm: unidade(g.minimoEm), peso: Math.max(0, num(g.peso, 1)) || 1, questoes: ds.reduce((s, d) => s + d.questoes, 0), max: ds.reduce((s, d) => s + d.questoes * d.peso, 0), ids: ds.map((d) => d.id) }; });
    let etapas = (Array.isArray(e.etapas) ? e.etapas : []).map(normEtapa).filter(Boolean);
    const tit = num(e.titulos, NaN);
    if (Number.isFinite(tit) && tit > 0 && !etapas.some((x) => x.tipo === 'titulos')) etapas.push(normEtapa({ tipo: 'titulos', max: tit, carater: 'C', peso: e.pesoTitulos }, etapas.length));
    const formato = e.formato === 'certo-errado' ? 'certo-errado' : 'multipla';
    const escala = ESCALAS.some(([id]) => id === e.escala) ? e.escala : 'soma';
    const nfTipo = NOTAS_FINAIS.some(([id]) => id === e.notaFinal) ? e.notaFinal : 'soma';
    const mgv = num(e.minimoGeral, NaN);
    return {
      grupos, etapas, formato, escala, notaFinal: nfTipo,
      pesoObjetiva: e.pesoObjetiva === undefined || e.pesoObjetiva === null || e.pesoObjetiva === '' ? null : Math.max(0, num(e.pesoObjetiva)),
      penalidade: Math.max(0, num(e.penalidade, 0)), alternativas: [2, 4, 5].includes(Number(e.alternativas)) ? Number(e.alternativas) : formato === 'certo-errado' ? 2 : null,
      naoZerar: !!e.naoZerar, minimoGeral: Number.isFinite(mgv) ? mgv : null, minimoGeralEm: unidade(e.minimoGeralEm)
    };
  }
  function regras(courseId) { return memo('er:' + courseId, () => regrasDe(editalOf(courseId), provaOf(courseId))); }
  /* nota máxima da objetiva na escala do edital */
  const maxObjetiva = (prova, rg) => (rg.escala === 'media10' ? 10 : rg.escala === 'padronizada' ? null : pontosMax(prova));
  /* mínimo geral sempre na escala da nota objetiva (pontos), para as réguas e a nota projetada */
  function minimoGeralDe(prova, rg) {
    if (rg.minimoGeral === null) return null;
    const max = maxObjetiva(prova, rg) ?? 0, q = prova.reduce((s, d) => s + d.questoes, 0);
    return minEmPts(rg.minimoGeral, rg.minimoGeralEm, max, q);
  }
  function minimoGeral(courseId) { return minimoGeralDe(provaOf(courseId), regras(courseId)); }
  function titulosOf(courseId) { return regras(courseId).etapas.find((x) => x.tipo === 'titulos')?.max ?? null; }
  /* disciplina da prova a que o mapa pertence: pela categoria; o que não casa vai para a disciplina padrão */
  function disciplinaDoMapa(map, courseId = map?.courseId) {
    const prova = provaOf(courseId);
    if (!prova.length || !map) return null;
    /* V15.59 · o planejamento do kit diz a disciplina de cada mapa pela sigla; vale antes da categoria */
    const md = editalOf(courseId)?.mapaDisciplina, viaKit = md && map.code ? md[String(map.code).toUpperCase()] : null;
    if (viaKit) { const d = prova.find((x) => x.id === viaKit); if (d) return d; }
    /* V15.67 · a escolha que você fez para esta sigla em outro curso vale antes da categoria */
    const auto0 = autoDisciplina(map, courseId);
    if (auto0?.via === 'aprendido') { const d = prova.find((x) => x.id === auto0.id); if (d) return d; }
    const cat = String(map.category || '');
    const porCat = prova.find((d) => d.categorias.includes(cat));
    if (porCat) return porCat;
    /* V15.62 · sem categoria ligada: a disciplina cujo conteúdo (edital + palavras-chave) mais se parece com o mapa */
    const auto = auto0;
    if (auto) { const d = prova.find((x) => x.id === auto.id); if (d) return d; }
    return prova.find((d) => d.padrao) || null;
  }
  /* ---------- V15.62 · ligação automática mapa → disciplina pelo conteúdo ----------
     Palavras do mapa (título, sigla, categoria, tópicos) contra as de cada disciplina (nome, conteúdo programático
     lido do edital e um dicionário por área). Palavras que aparecem em todas as disciplinas pesam menos. */
  const STOPW = new Set('de da do das dos e a o em no na para por com ou as os ao aos um uma que se sua seu suas seus sobre entre como mais pela pelo pelas pelos nocoes conhecimentos prova cargo lei leis federal municipal estadual nacional geral gerais especificos especifico especificas basicos aplicada aplicadas mapa mental tema temas parte modulo'.split(' '));
  const toks = (s) => norm(String(s || '')).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOPW.has(w) && !/^\d+$/.test(w)).map((w) => w.slice(0, 7));
  const DICAS = [
    [/atualidad|conhecimentos gerais|realidade|historia|geografia/, 'atualidades historia geografia etica cidadania sociedade economia politica cultura meio ambiente globalizacao urbanizacao seguranca saude educacao tecnologia relacoes internacionais desenvolvimento sustentavel estado municipio brasil mundo regiao populacao turismo simbolos'],
    [/portugu/, 'portugues gramatica interpretacao texto textual ortografia acentuacao crase concordancia regencia pontuacao sintaxe morfologia semantica coesao coerencia redacao oficial figuras linguagem colocacao pronominal'],
    [/informat/, 'informatica computador windows linux word excel planilha internet navegador email seguranca virus backup nuvem rede arquivo sistema operacional'],
    [/raciocin|matemat/, 'raciocinio logico matematica proposicoes tabela verdade conjuntos porcentagem juros razao proporcao regra tres equacao funcao probabilidade estatistica geometria sequencias'],
    [/legisla|direito|estatuto/, 'legislacao lei organica estatuto servidor constituicao administrativo administracao publica improbidade licitacao contratos etica regime juridico codigo decreto normas igualdade racial agencia reguladora regulacao resolucao competencias atribuicoes']
  ];
  /* V15.67 · leis que os editais citam só pelo número: o assunto de cada uma entra no conteúdo da disciplina
     (ex.: "Lei nº 9.984/2000" na Legislação da CASAN = Agência Nacional de Águas e Saneamento Básico) */
  const LEIS = {
    9984: 'agencia nacional aguas saneamento basico regulacao recursos hidricos normas referencia ana',
    14026: 'marco legal saneamento basico regulacao agencia nacional aguas universalizacao concessao',
    11445: 'saneamento basico politica nacional diretrizes abastecimento agua esgotamento sanitario residuos drenagem',
    9433: 'politica nacional recursos hidricos aguas bacia hidrografica outorga comites',
    12288: 'estatuto igualdade racial discriminacao populacao negra',
    10257: 'estatuto cidade politica urbana plano diretor funcao social propriedade',
    13089: 'estatuto metropole regiao metropolitana governanca interfederativa',
    6766: 'parcelamento solo urbano loteamento desmembramento',
    13465: 'regularizacao fundiaria reurb urbana rural',
    12587: 'politica nacional mobilidade urbana transporte',
    12651: 'codigo florestal vegetacao nativa preservacao permanente reserva legal',
    9605: 'crimes ambientais sancoes penais administrativas meio ambiente',
    6938: 'politica nacional meio ambiente sisnama licenciamento',
    12305: 'politica nacional residuos solidos',
    14133: 'licitacoes contratos administrativos',
    8666: 'licitacoes contratos administrativos',
    10520: 'pregao licitacao modalidade',
    13303: 'estatuto empresas estatais sociedades economia mista licitacoes',
    8429: 'improbidade administrativa',
    12527: 'acesso informacao transparencia',
    13709: 'protecao dados pessoais lgpd',
    9784: 'processo administrativo federal',
    8112: 'regime juridico servidores publicos civis uniao',
    13146: 'estatuto pessoa deficiencia inclusao acessibilidade',
    10098: 'acessibilidade pessoas deficiencia mobilidade reduzida',
    12378: 'arquitetura urbanismo conselho cau exercicio profissional',
    11888: 'assistencia tecnica habitacao interesse social athis',
    11124: 'sistema nacional habitacao interesse social fundo',
    11977: 'minha casa minha vida habitacao',
    14620: 'minha casa minha vida habitacao',
    8987: 'concessao permissao servicos publicos',
    11079: 'parceria publico privada ppp',
    12846: 'anticorrupcao empresa responsabilizacao',
    101: 'responsabilidade fiscal financas publicas',
    10406: 'codigo civil',
    8078: 'codigo defesa consumidor',
    9795: 'educacao ambiental politica nacional',
    11428: 'mata atlantica vegetacao',
    9985: 'unidades conservacao snuc natureza',
    11284: 'gestao florestas publicas',
    12187: 'seguranca barragens',
    13105: 'codigo processo civil',
    12016: 'estatuto pessoa idosa',
    10741: 'estatuto pessoa idosa',
    8069: 'estatuto crianca adolescente'
  };
  /* números de lei citados num texto ("Lei nº 9.984/2000", "Lei 14.026", "LC 101/2000"), sem os pontos */
  function leisDe(texto) {
    const out = new Set(), t = String(texto || '');
    const re = /(?:\b(?:lei|leis|decreto|decreto-lei|lc|lei complementar|lei federal|lei estadual|lei municipal|lei org[aâ]nica)\b[^0-9]{0,16})?(\d{1,2}\.\d{3}|\d{3,5})(?:\s*\/\s*(\d{2,4}))?/gi;
    let m;
    while ((m = re.exec(t))) {
      const temPrefixo = /^\D*(lei|decreto|lc)/i.test(m[0]), n = m[1].replace(/\./g, '');
      if (!temPrefixo && !(m[1].includes('.') && m[2])) continue;
      if (/^(19|20)\d\d$/.test(n) && !m[2]) continue;
      out.add(Number(n));
    }
    return out;
  }
  /* V15.67 · aprendizado: quando você fixa um mapa numa disciplina, o "tipo" dela (Português, Legislação, Atualidades…)
     fica guardado pela sigla e vale para os outros cursos, presentes e futuros */
  const TIPOS = [['lp', /portugu|lingua patria|interpreta[cç]ao de texto/], ['rlm', /raciocin|matemat|logic/], ['inf', /informat|tecnologia da informa/], ['atu', /atualidad|conhecimentos gerais|realidade|historia|geografia/], ['leg', /legisla|direito|estatuto|etica no servi|nocoes de administra/], ['esp', /especific|tecnic|profission/]];
  const tipoDe = (nome) => { const n = norm(nome); return (TIPOS.find(([, re]) => re.test(n)) || [null])[0]; };
  function aprendidos() { const r = readStore().prefs.discAprendida; return (r && !r.removed && r.value && typeof r.value === 'object') ? r.value : {}; }
  function aprender(code, discNome) {
    const c = String(code || '').toUpperCase(), t = discNome ? tipoDe(discNome) : null, cur = aprendidos();
    if (!c || (t ? cur[c] === t : !cur[c])) return;
    const next = { ...cur }; if (t) next[c] = t; else delete next[c];
    patchStore('prefs', 'discAprendida', { value: next });
  }
  /* V15.67 · fora de um quadro de desenho o memo não guarda nada; o planejador e a agenda perguntam a disciplina de
     cada mapa e recalculavam tudo a cada chamada. Guarda por alguns segundos e zera quando o armazenamento muda. */
  const AM_CACHE = new Map();
  P.__amClear = () => AM_CACHE.clear();
  function autoMapas(courseId) {
    const hit = AM_CACHE.get(courseId);
    if (hit && Date.now() - hit.t < 4000) return hit.v;
    const v = autoMapasRaw(courseId);
    AM_CACHE.set(courseId, { t: Date.now(), v });
    return v;
  }
  function autoMapasRaw(courseId) {
    return memo('am:' + courseId, () => {
      const prova = provaOf(courseId), ed = editalOf(courseId) || {}, cont = ed.conteudos || {};
      if (prova.length < 2) return {};
      const leisDisc = prova.map((d) => leisDe((cont[d.id] || '') + ' ' + d.nome));
      const sets = prova.map((d, i) => { const extra = DICAS.filter(([re]) => re.test(norm(d.nome))).map(([, w]) => w).join(' '); const dasLeis = [...leisDisc[i]].map((n) => LEIS[n] || '').join(' '); return new Set(toks(d.nome + ' ' + (cont[d.id] || '') + ' ' + extra + ' ' + dasLeis)); });
      const leiW = leisDisc.map((ls) => new Set(toks([...ls].map((n) => LEIS[n] || '').join(' '))));
      const df = new Map(); for (const st of sets) for (const w of st) df.set(w, (df.get(w) || 0) + 1);
      const idf = (w) => Math.log(1 + prova.length / (df.get(w) || prova.length));
      const idx = (typeof state !== 'undefined' && state.searchIndex?.items) || [];
      const apr = aprendidos(), tipos = prova.map((d) => tipoDe(d.nome));
      const out = {};
      for (const m of mapsForCourse(courseId, { includeLinked: true })) {
        const k = keyOf(m), st = (typeof readMapState === 'function' ? readMapState(m).topicStates : null) || {};
        const tops = idx.filter((it) => it.mapKey === k).map((it) => it.title).join(' ') + ' ' + Object.keys(st).join(' ').replace(/-/g, ' ');
        const texto = [m.title, m.shortTitle, m.short_title, m.subtitle, tops].join(' ');
        /* 1 · aprendido em outro curso: a disciplina do mesmo tipo (só quando há uma única desse tipo) */
        const t = apr[String(m.code || '').toUpperCase()];
        if (t) { const alvo = tipos.map((x, i) => (x === t ? i : -1)).filter((i) => i >= 0); if (alvo.length === 1) { out[k] = { id: prova[alvo[0]].id, score: 9, via: 'aprendido' }; continue; } }
        /* 2 · o mapa cita uma lei que só uma disciplina pede */
        const leisMapa = leisDe(texto), comLei = prova.map((d, i) => [...leisMapa].filter((n) => leisDisc[i].has(n)).length);
        const maxLei = Math.max(...comLei);
        if (maxLei > 0 && comLei.filter((x) => x === maxLei).length === 1) { out[k] = { id: prova[comLei.indexOf(maxLei)].id, score: 9, via: 'lei' }; continue; }
        /* 3 · palavras do mapa (título, subtítulo, categoria, tópicos) contra o conteúdo de cada disciplina;
           palavras que vêm do assunto de uma lei pedida no edital valem em dobro */
        const ws = [...new Set(toks(texto + ' ' + m.category + ' ' + [...leisMapa].map((n) => LEIS[n] || '').join(' ')))];
        if (!ws.length) continue;
        const sc = sets.map((set, i) => ws.reduce((s, w) => s + (set.has(w) ? idf(w) * (leiW[i].has(w) ? 2 : 1) : 0), 0) / Math.sqrt(ws.length));
        const ord = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
        if (ord[0][0] >= 0.35 && ord[0][0] > (ord[1]?.[0] || 0) * 1.25) out[k] = { id: prova[ord[0][1]].id, score: Math.round(ord[0][0] * 100) / 100, via: 'conteudo' };
      }
      return out;
    });
  }
  function autoDisciplina(map, courseId) { return autoMapas(courseId)[keyOf(map)] || null; }
  const passa = (pts, ac, minimo, em, max, questoes) => (!minimo ? true : em === 'acertos' ? ac >= minimo : pts >= minEmPts(minimo, em, max, questoes) - 1e-9);
  /* nota no formato da banca. opts.erros {disc:n} (certo/errado; sem ele, supõe tudo marcado) e opts.etapas {etapaId: nota} */
  function pontuarCom(prova, rg, acertos = {}, opts = {}) {
    if (!prova.length) return null;
    const errosIn = opts.erros || {}, notasEt = opts.etapas || {};
    let bruto = 0, corretas = 0, questoes = 0;
    const desconto = rg.penalidade;
    const por = prova.map((d) => {
      const a = Math.max(0, Math.min(d.questoes, Math.round(num(acertos[d.id]))));
      const e = desconto ? Math.max(0, Math.min(d.questoes - a, Math.round(num(errosIn[d.id], d.questoes - a)))) : 0;
      const pts = r2(a * d.peso - e * d.peso * desconto), max = d.questoes * d.peso, mp = minPts(d);
      bruto += pts; corretas += a; questoes += d.questoes;
      const zerou = rg.naoZerar && a === 0;
      const ok = passa(pts, a, d.minimo, d.minimoEm, max, d.questoes) && !zerou;
      return { id: d.id, nome: d.nome, grupo: d.grupo, acertos: a, erros: e, questoes: d.questoes, peso: d.peso, pontos: pts, max, minimo: rg.naoZerar && !mp ? r2(d.peso) : mp, minimoAcertos: d.minimoEm === 'acertos' ? d.minimo : rg.naoZerar ? 1 : null, ok, zerou, falta: ok ? 0 : Math.max(zerou ? r2(d.peso) : 0, r2(mp - pts)) };
    });
    bruto = r2(bruto);
    const grupos = rg.grupos.map((g) => {
      const ds = por.filter((x) => x.grupo === g.nome), pts = r2(ds.reduce((s, x) => s + x.pontos, 0)), ac = ds.reduce((s, x) => s + x.acertos, 0), mp = minEmPts(g.minimo, g.minimoEm, g.max, g.questoes);
      const ok = passa(pts, ac, g.minimo, g.minimoEm, g.max, g.questoes);
      return { ...g, pontos: pts, acertos: ac, minimoPts: mp, ok, nota10: g.max ? r2((pts / g.max) * 10) : 0, falta: ok ? 0 : r2(mp - pts) };
    });
    /* nota da objetiva na escala do edital */
    const maxPts = pontosMax(prova);
    let nota = bruto, max = maxPts;
    if (rg.escala === 'media10') {
      const partes = grupos.length ? grupos.map((g) => [g.peso, g.nota10]) : [[1, maxPts ? (bruto / maxPts) * 10 : 0]];
      const sp = partes.reduce((s, [p]) => s + p, 0) || 1;
      nota = r2(partes.reduce((s, [p, n]) => s + p * n, 0) / sp); max = 10;
    }
    const indeterminado = rg.escala === 'padronizada';
    const mg = minimoGeralDe(prova, rg);
    const geralOk = indeterminado ? null : rg.minimoGeral === null ? true : rg.minimoGeralEm === 'acertos' ? corretas >= rg.minimoGeral : nota >= mg - 1e-9;
    const falhas = [...por.filter((x) => !x.ok).map((x) => ({ id: x.id, nome: x.nome, falta: x.falta, zerou: x.zerou })), ...grupos.filter((g) => !g.ok).map((g) => ({ id: 'g:' + g.id, nome: g.nome, falta: g.falta, grupo: true }))];
    /* etapas: notas informadas são checadas contra o mínimo; eliminatórias sem nota ficam pendentes */
    const etapas = rg.etapas.map((x) => {
      const v = notasEt[x.id], tem = v !== undefined && v !== null && v !== '' && Number.isFinite(num(v, NaN));
      const n = tem ? Math.max(0, Math.min(x.max, num(v))) : null, mp = x.minimoEm === 'pct' ? r2((x.minimo / 100) * x.max) : x.minimo;
      const elim = x.carater !== 'C' && x.minimo > 0;
      return { ...x, nota: n, minimoPts: mp, ok: !elim || (tem ? n >= mp - 1e-9 : null), pendente: elim && !tem };
    });
    etapas.filter((x) => x.ok === false).forEach((x) => falhas.push({ id: 'e:' + x.id, nome: x.nome, falta: r2(x.minimoPts - x.nota), etapa: true }));
    const nf = notaFinalDe(rg, nota, max, etapas);
    return { pontos: nota, bruto, max, maxPontos: maxPts, corretas, questoes, por, grupos, etapas, minimoGeral: mg, minimoGeralRaw: rg.minimoGeral, minimoGeralEm: rg.minimoGeralEm, geralOk, indeterminado, aprovado: indeterminado ? null : !falhas.length && geralOk, pendente: etapas.some((x) => x.pendente), falhas, notaFinal: nf, regras: rg };
  }
  /* nota final: soma, média ponderada ou média simples da objetiva com as etapas que entram na conta */
  function notaFinalDe(rg, nota, max, etapas) {
    const partes = [{ nome: 'Objetiva', nota, max, peso: rg.pesoObjetiva ?? 1 }].concat(etapas.filter((x) => x.peso !== 0).map((x) => ({ nome: x.nome, nota: x.nota, max: x.max, peso: x.peso ?? 1 })));
    const conhecidas = partes.every((p) => p.nota !== null && p.nota !== undefined);
    const calc = (k) => {
      if (rg.notaFinal === 'ponderada') return r2(partes.reduce((s, p) => s + p.peso * (p[k] ?? 0), 0));
      if (rg.notaFinal === 'media') return r2(partes.reduce((s, p) => s + (p[k] ?? 0), 0) / partes.length);
      return r2(partes.reduce((s, p) => s + (p[k] ?? 0), 0));
    };
    return { tipo: rg.notaFinal, valor: max === null ? null : calc('nota'), max: max === null ? null : calc('max'), completa: conhecidas, partes };
  }
  /* fórmula legível da nota final, para o Raio-X */
  function formulaNotaFinal(rg) {
    const nomes = ['Objetiva'].concat(rg.etapas.filter((x) => x.peso !== 0).map((x) => x.nome));
    if (nomes.length === 1) return 'Nota final = objetiva';
    if (rg.notaFinal === 'ponderada') return 'Nota final = ' + [fmtPt(rg.pesoObjetiva ?? 1) + ' × Objetiva'].concat(rg.etapas.filter((x) => x.peso !== 0).map((x) => fmtPt(x.peso ?? 1) + ' × ' + x.nome)).join(' + ');
    if (rg.notaFinal === 'media') return 'Nota final = (' + nomes.join(' + ') + ') ÷ ' + nomes.length;
    return 'Nota final = ' + nomes.join(' + ');
  }
  /* V15.62 · cor de cada disciplina: a escolhida no Raio-X; senão a do mapa ligado; senão a da categoria; senão o próximo
     pigmento livre. Sem repetir cor entre disciplinas, para o Raio-X e o Peso × Esforço lerem de relance. */
  const PIG_FILA = ['latao', 'terracota', 'salvia', 'ardosia', 'ametista', 'ocre', 'patina', 'argila', 'cobalto', 'rosa', 'folha', 'canela', 'ceu', 'malva', 'palha', 'petroleo', 'coral', 'indigo', 'pedra'];
  function coresDisciplinas(courseId) {
    return memo('ec:' + courseId, () => {
      const prova = provaOf(courseId), escolha = editalOf(courseId)?.cores || {}, out = {}, usadas = new Set();
      if (!prova.length) return out;
      const maps = mapsForCourse(courseId, { includeLinked: true });
      const livre = () => { const k = PIG_FILA.find((n) => PIG[n] && !usadas.has(PIG[n])); return k ? PIG[k] : '#c3aa84'; };
      for (const d of prova) if (escolha[d.id] && PIG[escolha[d.id]]) { out[d.id] = PIG[escolha[d.id]]; usadas.add(out[d.id]); }
      for (const d of prova) {
        if (out[d.id]) continue;
        const m = maps.find((x) => disciplinaDoMapa(x, courseId)?.id === d.id);
        let c = m ? mapColor(m) : d.categorias[0] ? categoryPigment(d.categorias[0]) : null;
        if (!c || usadas.has(c)) c = livre();
        out[d.id] = c; usadas.add(c);
      }
      return out;
    });
  }
  function pontuar(courseId, acertos = {}, opts = {}) { return pontuarCom(provaOf(courseId), regras(courseId), acertos, opts); }
  /* V15.57 · tentativa de simulado em pontos da banca: cada seção ({nome:{correct,total}}) vai para a
     disciplina de nome equivalente (sem acento/caixa). Só pontua se todas as disciplinas forem encontradas. */
  function secaoDisciplina(nome, prova) {
    const n = norm(nome);
    if (!n) return null;
    return prova.find((d) => norm(d.nome) === n || norm(d.id) === n) || prova.find((d) => n.includes(norm(d.nome)) || norm(d.nome).includes(n)) || prova.find((d) => norm(d.nome).split(' ')[0] === n.split(' ')[0] && n.split(' ')[0].length > 4) || null;
  }
  function pontuarTentativa(courseId, attempt) {
    const prova = provaOf(courseId), sec = attempt?.sections;
    if (!prova.length || !sec || typeof sec !== 'object') return null;
    const ac = {}, seen = new Set();
    for (const [nome, v] of Object.entries(sec)) { const d = secaoDisciplina(nome, prova); if (!d) continue; seen.add(d.id); ac[d.id] = (ac[d.id] || 0) + (Number(v?.correct) || 0); }
    if (seen.size !== prova.length) return null;
    return pontuar(courseId, ac);
  }
  /* cronograma: a data da prova vem do curso (Gerenciar curso); as demais fases, do edital */
  function fasesOf(course, today = new Date()) {
    if (!course) return [];
    const e = editalOf(course.id) || {}, t0 = startDay(today);
    const list = FASES.map(([id, label]) => ({ id, label, date: id === 'prova' ? (examDate(course) || parseDate(e.fases?.prova?.date)) : parseDate(e.fases?.[id]?.date) }));
    let atual = -1;
    list.forEach((f, i) => { if (f.date && f.date <= t0) atual = i; });
    return list.map((f, i) => ({ ...f, status: i === atual ? 'atual' : f.date && f.date < t0 ? 'passada' : i < atual ? 'passada' : 'futura', days: f.date ? daysBetween(t0, f.date) : null }));
  }
  function proximoMarco(course, today = new Date()) { return fasesOf(course, today).find((f) => f.date && f.days >= 0 && f.id !== 'prova') || null; }
  function padroes() {
    const out = {};
    for (const [k, v] of Object.entries(PADROES_BASE)) out[k] = { ...v, prova: normProva(v.prova), base: true };
    for (const [k, v] of Object.entries(readStore().padroes)) { if (!v || v.removed) continue; const prova = normProva(v.prova); if (prova.length) out[k] = { ...v, prova, base: !!PADROES_BASE[k] }; }
    return out;
  }
  function padraoDaBanca(board) {
    const b = norm(board);
    if (!b) return null;
    const all = padroes();
    const k = Object.keys(all).find((x) => b.includes(norm(x)));
    return k ? { banca: k, ...all[k] } : null;
  }
  function setPadrao(banca, value) { const k = String(banca || '').trim().toUpperCase().slice(0, 30); if (!k) return null; return patchStore('padroes', k, value); }
  /* campos de regra que viajam junto com a prova (kit, padrões da banca, leitor do edital) */
  const REGRA_KEYS = ['grupos', 'etapas', 'formato', 'penalidade', 'alternativas', 'escala', 'notaFinal', 'pesoObjetiva', 'naoZerar', 'minimoGeralEm', 'titulos', 'pesoTitulos'];
  function regrasPatch(j) {
    const out = {};
    for (const k of REGRA_KEYS) if (j && j[k] !== undefined) out[k] = k === 'grupos' ? (Array.isArray(j.grupos) ? j.grupos.slice(0, 12).map((g) => ({ nome: String(g.nome || '').slice(0, 60), minimo: num(g.minimo), minimoEm: unidade(g.minimoEm), peso: num(g.peso, 1) })) : []) : k === 'etapas' ? (Array.isArray(j.etapas) ? j.etapas.slice(0, 8).map(normEtapa).filter(Boolean) : []) : j[k];
    return out;
  }
  function aplicarPadrao(courseId, banca) {
    const p = padroes()[String(banca || '').toUpperCase()];
    if (!p) return null;
    return setEdital(courseId, { grupos: [], etapas: [], formato: 'multipla', penalidade: 0, escala: 'soma', notaFinal: 'soma', pesoObjetiva: null, naoZerar: false, minimoGeralEm: 'pontos', ...regrasPatch(p), banca: String(banca).toUpperCase(), prova: p.prova, minimoGeral: p.minimoGeral ?? null, titulos: p.titulos ?? null, fonte: p.fonte || '' });
  }
  /* alcance do mapa: escolha do usuário > catálogo > categoria (Legislação tende a ser local) */
  function alcance(map) {
    if (!map) return 'portatil';
    const meta = readStore().mapMeta[keyOf(map)];
    if (meta && !meta.removed && ALCANCES.some(([id]) => id === meta.alcance)) return meta.alcance;
    if (ALCANCES.some(([id]) => id === map.alcance)) return map.alcance;
    return /legisla|administra/.test(norm(map.category)) ? 'local' : 'portatil';
  }
  function setAlcance(key, value) { if (!ALCANCES.some(([id]) => id === value)) return null; return patchStore('mapMeta', key, { alcance: value }); }
  /* preferências das pranchas (V15.57): prefs[chave] = { value, updatedAt } */
  const PREF_DEFAULTS = { metaEntre: 40, planoPeso: true, revHorario: { on: false, start: '18:00', max: 40, days: [1, 2, 3, 4, 5, 6] } };
  function pref(k) { const r = readStore().prefs[k]; return r && !r.removed && r.value !== undefined ? r.value : PREF_DEFAULTS[k]; }
  function setPref(k, value) { return patchStore('prefs', k, { value }); }
  P.prefs = { get: pref, set: setPref, DEFAULTS: PREF_DEFAULTS };
  /* ---------- peso do edital (V15.58) ----------
     Pontos por tópico de cada disciplina = pontos da disciplina ÷ tópicos dos mapas do curso ligados a ela.
     Pontos do mapa = pontos da disciplina × tópicos do mapa ÷ tópicos da disciplina. Sem estrutura: null. */
  function pesoEsforco(courseId) {
    return memo('pe:' + courseId, () => {
      const prova = provaOf(courseId);
      if (!prova.length) return null;
      const own = mapsForCourse(courseId, { includeLinked: false });
      const rows = prova.map((d) => ({ disc: d, id: d.id, nome: d.nome, pontos: d.questoes * d.peso, topicos: 0, marcados: 0, mapas: [] }));
      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const m of own) {
        const d = disciplinaDoMapa(m, courseId), r = d && byId.get(d.id);
        if (!r) continue;
        const p = prog(m), t = Math.max(0, p.total || Number(m.topics) || 0);
        r.topicos += t; r.marcados += p.marked || 0; r.mapas.push(m);
      }
      const totT = rows.reduce((s, r) => s + r.topicos, 0), totP = rows.reduce((s, r) => s + r.pontos, 0);
      rows.forEach((r) => {
        r.ppt = r.topicos ? r.pontos / r.topicos : 0;
        r.fatiaTopicos = totT ? r.topicos / totT : 0;
        r.fatiaPontos = totP ? r.pontos / totP : 0;
        r.cobertura = r.topicos ? r.marcados / r.topicos : 0;
        r.cor = coresDisciplinas(courseId)[r.id] || (r.mapas[0] ? mapColor(r.mapas[0]) : 'var(--pr-latao)');
      });
      const comPeso = rows.filter((r) => r.ppt > 0);
      const maxR = comPeso.slice().sort((a, b) => b.ppt - a.ppt)[0] || null, minR = comPeso.slice().sort((a, b) => a.ppt - b.ppt)[0] || null;
      return { rows, totTopicos: totT, totPontos: totP, max: maxR, min: minR, razao: maxR && minR && minR.ppt > 0 ? maxR.ppt / minR.ppt : null };
    });
  }
  function pontosDoMapa(map, courseId = map?.courseId) {
    const pe = pesoEsforco(courseId), d = disciplinaDoMapa(map, courseId);
    if (!pe || !d) return null;
    const r = pe.rows.find((x) => x.id === d.id);
    if (!r || !r.topicos) return null;
    const t = Math.max(0, prog(map).total || Number(map.topics) || 0);
    return Math.round(r.pontos * (t / r.topicos) * 10) / 10;
  }
  function pptDoMapa(map, courseId = map?.courseId) {
    const pe = pesoEsforco(courseId), d = disciplinaDoMapa(map, courseId);
    if (!pe || !d) return null;
    return pe.rows.find((x) => x.id === d.id)?.ppt ?? null;
  }
  /* disciplinas abaixo do mínimo na tentativa mais recente de simulado do curso */
  function riscoMinimo(courseId) {
    return memo('rm:' + courseId, () => {
      const list = sims().filter((s) => String(s.courseId) === String(courseId));
      let last = null;
      for (const s of list) for (const a of attempts(s)) { const t = Date.parse(a.finishedAt || 0) || 0; if (!last || t > last.t) last = { a, t }; }
      const r = last ? pontuarTentativa(courseId, last.a) : null;
      return r ? r.falhas.map((f) => f.id) : [];
    });
  }
  const fmtPt = (n) => (Math.round(Number(n || 0) * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  P.editais = { aprender, aprendidos, leisDe, tipoDe, FASES, ALCANCES, get: editalOf, set: setEdital, prova: provaOf, minimoGeral, pontosMax, disciplinaDoMapa, pontuar, pontuarTentativa, secaoDisciplina, fases: fasesOf, proximoMarco, padroes, padraoDaBanca, setPadrao, aplicarPadrao, alcance, setAlcance, normProva, pesoEsforco, pontosDoMapa, pptDoMapa, riscoMinimo, fmtPt, minPts, titulos: titulosOf, regras, regrasDe, pontuarCom, maxObjetiva, formulaNotaFinal, ETAPAS, ESCALAS, NOTAS_FINAIS, UNIDADES, cores: coresDisciplinas, PIG_FILA, autoMapas };


  /* ---------- V15.58 · taxonomia única de armadilhas (conceito 04 do Template de estudos) ----------
     As 8 categorias do Raio-X dos erros são o vocabulário oficial; os rótulos livres das questões dos mapas
     (trapType) e do Raio-X são convertidos na leitura, sem regerar nenhum mapa. */
  const TRAPS = [['excecao-ou-inversao', 'Exceção ou inversão', 'Montar o par regra × exceção e reler o enunciado procurando o “salvo”, “exceto”, “somente”.'], ['prazo-ou-numero', 'Prazo ou número', 'Repetição espaçada dos números-chave (🔢) do mapa, em voz alta.'], ['competencia-ou-sujeito', 'Competência ou sujeito', 'Tabela “quem faz o quê” do tema, com o órgão ou agente de cada ato.'], ['troca-de-conceitos', 'Troca de conceitos', 'Quadro de contraste (card FIXE) para cada par confundido.'], ['literalidade', 'Literalidade', 'Ler o artigo na letra da lei e marcar as palavras que a banca troca.'], ['interpretacao-do-comando', 'Interpretação do comando', 'Sublinhar o comando (CORRETA/INCORRETA, EXCETO) antes de ler as alternativas.'], ['calculo-ou-aplicacao', 'Cálculo ou aplicação', 'Refazer o exercício do zero e conferir a fórmula no ENTENDA.'], ['outra', 'Outra', 'Rever o tópico inteiro no mapa e anotar a dúvida.']];
  const TRAP_EQ = { 'troca': 'troca-de-conceitos', 'troca de conceito': 'troca-de-conceitos', 'troca de conceitos': 'troca-de-conceitos', 'distincao fina': 'troca-de-conceitos', 'inversao': 'excecao-ou-inversao', 'generalizacao': 'excecao-ou-inversao', 'generalizacao indevida': 'excecao-ou-inversao', 'excecao': 'excecao-ou-inversao', 'excecao ou inversao': 'excecao-ou-inversao', 'regra numero': 'prazo-ou-numero', 'prazo ou numero': 'prazo-ou-numero', 'prazo': 'prazo-ou-numero', 'numero': 'prazo-ou-numero', 'regra': 'literalidade', 'memoria': 'literalidade', 'literalidade': 'literalidade', 'aplicacao': 'calculo-ou-aplicacao', 'calculo': 'calculo-ou-aplicacao', 'calculo ou aplicacao': 'calculo-ou-aplicacao', 'competencia ou sujeito': 'competencia-ou-sujeito', 'competencia': 'competencia-ou-sujeito', 'sujeito': 'competencia-ou-sujeito', 'interpretacao do comando': 'interpretacao-do-comando', 'interpretacao': 'interpretacao-do-comando', 'outra': 'outra' };
  function trapId(label) {
    const n = norm(label);
    if (!n || n === 'nenhum' || n === 'conceito central' || n === 'ainda nao identificada') return null;
    if (TRAPS.some(([id]) => id === String(label))) return String(label);
    return TRAP_EQ[n] || 'outra';
  }
  P.armadilhas = { LIST: TRAPS, id: trapId, label: (id) => (TRAPS.find((t) => t[0] === id) || TRAPS[7])[1], antidoto: (id) => (TRAPS.find((t) => t[0] === id) || TRAPS[7])[2], EQ: TRAP_EQ };

  /* ---------- V15.58 · treinos dirigidos (Simulados) ----------
     treinos[id] = { at, simKey, courseId, total, acertos, itens:[{origem, mapKey, topicId, titulo, trap, ok}] } */
  function treinos() { return Object.entries(readStore().treinos).filter(([, v]) => v && !v.removed).map(([id, v]) => ({ id, ...v })).sort((a, b) => (Date.parse(b.at || 0) || 0) - (Date.parse(a.at || 0) || 0)); }
  function saveTreino(row) {
    const id = 'tr-' + Date.now().toString(36);
    patchStore('treinos', id, { ...row, at: new Date().toISOString(), itens: (row.itens || []).slice(0, 60) });
    const data = readStore(), keys = Object.keys(data.treinos).sort((a, b) => (Date.parse(data.treinos[a]?.at || 0) || 0) - (Date.parse(data.treinos[b]?.at || 0) || 0));
    if (keys.length > 40) { keys.slice(0, keys.length - 40).forEach((k) => delete data.treinos[k]); writeStore(data); }
    return id;
  }
  P.treinos = { list: treinos, save: saveTreino };

  /* ---------- V15.58 · questões lidas dos HTML (mapas V211 e simulados V08), sob demanda e em cache ---------- */
  const QCACHE = new Map();
  function questoesDoMapa(map) {
    const k = keyOf(map);
    if (QCACHE.has('m:' + k)) return QCACHE.get('m:' + k);
    const pr = Promise.resolve(typeof mapHtml === 'function' ? mapHtml(map) : '').then((html) => {
      const doc = new DOMParser().parseFromString(html || '', 'text/html'), out = [];
      doc.querySelectorAll('.topic-card[data-topic-id]').forEach((t) => {
        const titulo = (t.querySelector('.topic-name')?.textContent || '').replace(/\s+/g, ' ').trim();
        t.querySelectorAll('script.v134-question-data').forEach((sc) => {
          const d = safeJson(sc.textContent || '', null);
          const vs = (d?.variants || []).filter((v) => v && v.prompt && Array.isArray(v.options) && v.options.length >= 2 && v.correct && !/\[\[/.test(v.prompt));
          if (vs.length) out.push({ topicId: t.getAttribute('data-topic-id'), titulo, bank: d.bank || '', variants: vs });
        });
      });
      return out;
    }).catch(() => []);
    QCACHE.set('m:' + k, pr);
    return pr;
  }
  function questoesDoSimulado(sim) {
    const k = simKey(sim);
    if (QCACHE.has('s:' + k)) return QCACHE.get('s:' + k);
    const pr = Promise.resolve(typeof simulationSourceHtml === 'function' ? simulationSourceHtml(sim) : '').then((html) => {
      const at = String(html || '').search(/EXAM_DATA\s*=\s*\{/);
      if (at < 0) return new Map();
      let i = html.indexOf('{', at), depth = 0, str = false, q = '', end = -1;
      for (let j = i; j < html.length; j++) {
        const ch = html[j];
        if (str) { if (ch === '\\') { j++; continue; } if (ch === q) str = false; continue; }
        if (ch === '"' || ch === "'") { str = true; q = ch; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (!depth) { end = j; break; } }
      }
      const data = end > 0 ? safeJson(html.slice(i, end + 1), null) : null, out = new Map();
      (data?.sections || []).forEach((sec) => (sec.questions || []).forEach((qq) => out.set(Number(qq.number), { ...qq, section: sec.title || '' })));
      return out;
    }).catch(() => new Map());
    QCACHE.set('s:' + k, pr);
    return pr;
  }
  P.questoes = { mapa: questoesDoMapa, simulado: questoesDoSimulado };

  /* ---------- V15.58 · o que o mapa registra (ponte mapa → app, lida direto do estado do Reader) ----------
     O Template V211 grava em mindmap_state::<storage-id> (mesma origem do app): reviewMeta[topic].mastery,
     quizMeta[topic] {attempts, correct, wrong, guessed} e v135.errorPatterns {trapType: n}. Só leitura. */
  function masteryOf(map) {
    return memo('ms:' + keyOf(map), () => {
      const st = (typeof readMapState === 'function' ? readMapState(map) : null) || {};
      const rm = st.reviewMeta || {}, qm = st.quizMeta || {}, ep = st.v135?.errorPatterns || {};
      let respondidas = 0, acertos = 0, chutes = 0, soma = 0, n = 0;
      for (const [id, q] of Object.entries(qm)) {
        if (!q || typeof q !== 'object') continue;
        const at = Number(q.attempts) || 0;
        respondidas += at; acertos += Number(q.correct) || 0; chutes += Number(q.guessed) || 0;
        const ms = Number(rm[id]?.mastery);
        if (at > 0) { soma += Number.isFinite(ms) ? ms : at ? ((Number(q.correct) || 0) / at) * 100 : 0; n++; }
      }
      const traps = {}, sum = mapSummary(map);
      if (sum) {
        /* G27: o resumo do mapa já soma Raio-X por tópico e as alternativas erradas do Teste-se, na taxonomia única */
        for (const t of Object.values(sum.topics)) for (const [k, v] of Object.entries(t.traps || {})) traps[k] = (traps[k] || 0) + (Number(v) || 0);
        for (const e of sum.rxErrors || []) if (e.trap) traps[e.trap] = (traps[e.trap] || 0) + 1;
      } else for (const [k, v] of Object.entries(ep)) { const id = P.armadilhas.id(k); if (id) traps[id] = (traps[id] || 0) + (Number(v) || 0); }
      const p = prog(map);
      return { dominio: n ? Math.round(soma / n) : null, topicosRespondidos: n, respondidas, acertos, chutes, traps, cobertura: p.total ? Math.round((p.marked / p.total) * 100) : 0 };
    });
  }
  P.mastery = { of: masteryOf };
  /* nota projetada por disciplina: domínio médio (ponderado por tópicos) × pontos; sem respostas, cobertura × 0,7 */
  function notaProjetada(courseId) {
    return memo('np:' + courseId, () => {
      const pe = pesoEsforco(courseId);
      if (!pe) return null;
      let total = 0, estimativa = false;
      const por = pe.rows.map((r) => {
        let peso = 0, acc = 0, est = false;
        for (const m of r.mapas) { const t = Math.max(1, prog(m).total || Number(m.topics) || 1), ms = masteryOf(m); let d = ms.dominio; if (d === null) { d = ms.cobertura * 0.7; est = true; } acc += d * t; peso += t; }
        const dom = peso ? acc / peso / 100 : 0, pts = Math.round(r.pontos * dom * 10) / 10;
        if (est) estimativa = true;
        total += pts;
        return { id: r.id, nome: r.nome, pontos: pts, max: r.pontos, minimo: minPts(r.disc), dominio: Math.round(dom * 100), estimativa: est, cor: r.cor, ok: pts >= minPts(r.disc) };
      });
      const mg = minimoGeral(courseId);
      return { por, pontos: Math.round(total * 10) / 10, max: pe.totPontos, minimoGeral: mg, estimativa, aprovado: por.every((x) => x.ok) && (mg === null || total >= mg) };
    });
  }
  P.editais.notaProjetada = notaProjetada;

  /* caderno por armadilha: mapa (v135.errorPatterns) + treinos do app + erros de simulado (styleTag) */
  function cadernoArmadilhas(courseId) {
    return memo('ca:' + courseId, () => {
      const rows = new Map(P.armadilhas.LIST.map((t) => [t[0], { id: t[0], label: t[1], antidoto: t[2], mapa: 0, treino: 0, simulado: 0, total: 0, mapas: new Map() }]));
      const add = (id, campo, n, m) => { const r = id && rows.get(id); if (!r || !n) return; r[campo] += n; r.total += n; if (m) { const k = keyOf(m); r.mapas.set(k, (r.mapas.get(k) || 0) + n); } };
      const maps = mapsForCourse(courseId, { includeLinked: false });
      for (const m of maps) for (const [id, n] of Object.entries(masteryOf(m).traps)) add(id, 'mapa', n, m);
      const byKey = new Map(maps.map((m) => [keyOf(m), m]));
      for (const t of P.treinos.list()) if (String(t.courseId) === String(courseId)) for (const it of t.itens || []) if (!it.ok && it.trap) add(it.trap, 'treino', 1, byKey.get(it.mapKey));
      for (const sm of sims().filter((x) => String(x.courseId) === String(courseId))) for (const a of attempts(sm)) for (const e of Array.isArray(a.mistakes) ? a.mistakes : []) { const id = e.styleTag ? P.armadilhas.id(e.styleTag) : null; if (id) add(id, 'simulado', 1, null); }
      const list = [...rows.values()].filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
      list.forEach((r) => { r.mapas = [...r.mapas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => ({ map: byKey.get(k), n })).filter((x) => x.map); });
      return { list, total: list.reduce((s2, r) => s2 + r.total, 0) };
    });
  }
  P.mastery.caderno = cadernoArmadilhas;

  /* ---------- V15.63 · desempenho do TEC Concursos ----------
     tec[id] = { at, arquivo, total:{q,a,e}, materias:[{n,q,a,e,s:[{h,n,q,a,e}]}] }  — a leitura mais nova inteira;
     as anteriores ficam só com matérias e assuntos de 1º nível, o bastante para a evolução (o armazenamento é sincronizado).
     editais[courseId].tecMap = { <matéria normalizada>: discId | '-' }  — ligação manual matéria do TEC → disciplina. */
  const TEC = () => window.MeusMapasTec || null;
  function tecList() { return memo('tecL', () => Object.entries(readStore().tec).filter(([, v]) => v && !v.removed && Array.isArray(v.materias) && v.total).map(([id, v]) => ({ id, ...v })).sort((a, b) => (Date.parse(b.at || 0) || 0) - (Date.parse(a.at || 0) || 0))); }
  function tecSave(snap) {
    const T = TEC(), data = readStore(), now = new Date().toISOString();
    const live = Object.entries(data.tec).filter(([, v]) => v && !v.removed && v.total).sort((a, b) => (Date.parse(b[1].at || 0) || 0) - (Date.parse(a[1].at || 0) || 0));
    const last = live[0]?.[1];
    if (last && last.total.q === snap.total.q && last.total.a === snap.total.a) return { id: live[0][0], igual: true };
    live.forEach(([k, v], i) => {
      if (i >= 7) { data.tec[k] = { removed: true, at: v.at, updatedAt: now }; return; }
      if (v.materias?.some((m) => (m.s || []).some((x) => T.nivel(x.h) > 1))) data.tec[k] = { ...v, materias: v.materias.map((m) => ({ ...m, s: (m.s || []).filter((x) => T.nivel(x.h) === 1) })), updatedAt: now };
    });
    const id = 'tec-' + Date.now().toString(36);
    data.tec[id] = { at: now, arquivo: String(snap.arquivo || '').slice(0, 120), total: snap.total, materias: snap.materias, updatedAt: now };
    writeStore(data);
    return { id };
  }
  function tecRemove(id) { const d = readStore(); if (d.tec[id]) { d.tec[id] = { removed: true, at: d.tec[id].at, updatedAt: new Date().toISOString() }; writeStore(d); } }
  const TEC_REGRAS = [
    [/portugu|gramatic|redacao|interpretacao de texto/, /portugu|lingua|redacao/],
    [/informatica|^ti |tecnologia da informacao|seguranca da informacao/, /informat|tecnologia/],
    [/raciocinio|matematica|estatistica/, /raciocin|matemat|logic|estatist/],
    [/atualidades|conhecimentos gerais|historia|geografia|realidade/, /atualid|conhecimentos gerais|realidade|historia|geografia/],
    [/direito|legislacao|etica|estatuto|regime juridico/, /legisla|direito|etica|estatuto|regime juridico/]
  ];
  const TEC_GERAL = /portugu|informat|^ti |raciocin|matemat|estatist|atualid|conhecimentos gerais|direito|legisla|etica|administra|contab|economi|ingles|espanhol|historia|geografia|arquivolog|seguranca da informacao|gestao publica|politicas publicas/;
  const tecKey = (n) => norm(n);
  const geralDisc = (d) => TEC_REGRAS.some(([, dre]) => dre.test(norm(d.nome)));
  /* matéria do TEC → disciplina da prova: manual; senão pelo vocabulário (nome, conteúdo do edital, mapas ligados à
     disciplina e assuntos da matéria); senão pela regra do nome; matérias de área específica caem na disciplina padrão. */
  function tecLigacoes(courseId, snap) {
    return memo('tecLg:' + courseId + ':' + (snap?.id || ''), () => {
      const prova = provaOf(courseId);
      if (!prova.length || !snap) return new Map();
      const ed = editalOf(courseId) || {}, man = ed.tecMap || {}, cont = ed.conteudos || {}, pe = pesoEsforco(courseId);
      const sets = prova.map((d) => {
        const extra = DICAS.filter(([re]) => re.test(norm(d.nome))).map(([, w]) => w).join(' ');
        const mapas = (pe?.rows.find((r) => r.id === d.id)?.mapas || []).map((m) => [m.title, m.shortTitle, m.category].join(' ')).join(' ');
        return new Set(toks(d.nome + ' ' + (cont[d.id] || '') + ' ' + extra + ' ' + mapas));
      });
      const df = new Map(); for (const st of sets) for (const w of st) df.set(w, (df.get(w) || 0) + 1);
      const idf = (w) => Math.log(1 + prova.length / (df.get(w) || prova.length));
      const padrao = prova.find((d) => d.padrao) || null, out = new Map();
      for (const m of snap.materias) {
        const k = tecKey(m.n), nn = norm(m.n);
        if (Object.prototype.hasOwnProperty.call(man, k)) { const id = man[k] === '-' ? null : prova.some((d) => d.id === man[k]) ? man[k] : null; out.set(k, { id, via: 'manual' }); continue; }
        const ws = [...new Set(toks(m.n + ' ' + m.n + ' ' + (m.s || []).map((x) => x.n).join(' ')))];
        const sc = sets.map((set) => (ws.length ? ws.reduce((s, w) => s + (set.has(w) ? idf(w) : 0), 0) / Math.sqrt(ws.length) : 0));
        let regra = null, area = false;
        for (const [re, dre] of TEC_REGRAS) if (re.test(nn)) { area = true; const i = prova.findIndex((d) => dre.test(norm(d.nome))); if (i >= 0) { sc[i] += 0.6; regra = regra ?? i; } }
        /* matéria de área específica (Arquitetura, Engenharia…) só cai numa disciplina geral com semelhança forte;
           matéria geral sem disciplina equivalente na prova (Informática sem Informática) fica fora, salvo semelhança forte */
        if (!area) prova.forEach((d, i) => { if (geralDisc(d) && sc[i] < 0.9) sc[i] = 0; });
        const ord = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
        let id = null, via = '';
        if (area && regra === null && ord[0][0] < 0.9) { out.set(k, { id: null, via: 'auto' }); continue; }
        if (ord[0][0] >= 0.35 && ord[0][0] > (ord[1]?.[0] || 0) * 1.15) { id = prova[ord[0][1]].id; via = 'auto'; }
        else if (regra !== null) { id = prova[regra].id; via = 'auto'; }
        else if (padrao && !TEC_GERAL.test(nn)) { id = padrao.id; via = 'padrao'; }
        out.set(k, { id, via });
      }
      return out;
    });
  }
  function setTecMap(courseId, patch) { const ed = editalOf(courseId) || {}; return setEdital(courseId, { tecMap: { ...(ed.tecMap || {}), ...patch } }); }
  /* mapa do curso que mais se parece com o assunto (título e categoria pesam 1, tópicos 0,35) */
  function tecMapaDoAssunto(courseId, nome, mapas) {
    const ws = [...new Set(toks(nome))];
    if (!ws.length) return null;
    const idx = (typeof state !== 'undefined' && state.searchIndex?.items) || [];
    let best = null;
    for (const m of mapas) {
      const t = new Set(toks([m.title, m.shortTitle, m.short_title, m.category].join(' '))), k = keyOf(m);
      const tp = memo('tecTp:' + k, () => new Set(toks(idx.filter((it) => it.mapKey === k).map((it) => it.title).join(' '))));
      const sc = ws.reduce((s, w) => s + (t.has(w) ? 1 : tp.has(w) ? 0.35 : 0), 0) / Math.sqrt(ws.length);
      if (sc >= 0.5 && (!best || sc > best.sc)) best = { m, sc };
    }
    return best?.m || null;
  }
  /* nota real projetada pelo acerto no TEC, pontos fracos ponderados pelo edital e evolução entre leituras */
  /* cache fora do quadro de desenho: o plano de estudo (StudyPlanner) consulta o TEC a cada linha de prioridade */
  const TEC_CACHE = new Map();
  function tecResumo(courseId) {
    const T = TEC(), list = tecList(), snap = list[0];
    if (!T || !snap) return null;
    const st = readStore(), ck = String(courseId) + '|' + snap.id + '|' + (st.updatedAt || '') + '|' + ((typeof state !== 'undefined' && state.searchIndex?.items?.length) || 0) + '|' + maps().length;
    if (TEC_CACHE.has(ck)) return TEC_CACHE.get(ck);
    const r = memo('tecR:' + courseId, () => tecResumoRaw(courseId, T, list, snap));
    if (TEC_CACHE.size > 12) TEC_CACHE.clear();
    TEC_CACHE.set(ck, r);
    return r;
  }
  const pctDe = (v, max) => (max ? v / max : 0);
  function tecResumoRaw(courseId, T, list, snap) {
      const prova = provaOf(courseId), evol = list[1] ? T.delta(snap, list[1]) : null;
      const diasDesde = Math.floor((Date.now() - (Date.parse(snap.at) || Date.now())) / 86400000);
      if (!prova.length) return { snap, evol, semProva: true, n: list.length, diasDesde };
      const ed = editalOf(courseId) || {}, manMapa = ed.tecMapaAssunto || {};
      const lig = tecLigacoes(courseId, snap), rg = regras(courseId), pe = pesoEsforco(courseId), cores = coresDisciplinas(courseId);
      const porDisc = (sn) => {
        const rows = new Map(prova.map((d) => [d.id, { id: d.id, nome: d.nome, q: 0, a: 0, e: 0, materias: [] }]));
        const fora = [];
        for (const m of sn.materias) { const l = lig.get(tecKey(m.n)), r = l?.id && rows.get(l.id); if (!r) { fora.push(m); continue; } r.q += m.q; r.a += m.a; r.e += m.e || Math.max(0, m.q - m.a); r.materias.push(m.n); }
        return { rows, fora };
      };
      const { rows, fora } = porDisc(snap);
      const ligadas = [...rows.values()], qL = ligadas.reduce((s, r) => s + r.q, 0), aL = ligadas.reduce((s, r) => s + r.a, 0);
      const geral = qL ? aL / qL : snap.total.a / snap.total.q;
      const acertos = {}, erros = {};
      for (const d of prova) {
        const r = rows.get(d.id), tx = r.q ? r.a / r.q : geral, te = r.q ? r.e / r.q : 1 - geral;
        r.taxa = tx; r.semDados = !r.q; r.amostra = r.q >= 60 ? 'boa' : r.q >= 20 ? 'media' : 'pequena';
        acertos[d.id] = d.questoes * tx; erros[d.id] = d.questoes * te;
      }
      const res = pontuarCom(prova, rg, acertos, { erros });
      /* meta de acerto: o maior entre o mínimo da disciplina e o ritmo uniforme que leva à nota-alvo
         (nota de corte do curso, se cadastrada; senão o mínimo geral; senão 60% da prova) */
      const maxPts = pontosMax(prova), cut = P.sims?.cutoff?.(courseId) || null, mg = minimoGeralDe(prova, rg);
      const alvoPts = cut ? (cut.unit === 'pts' ? Number(cut.value) : (Number(cut.value) / 100) * maxPts) : mg !== null && mg > 0 ? mg : maxPts * 0.6;
      const alvoFonte = cut ? 'nota de corte' : mg !== null && mg > 0 ? 'mínimo geral' : '60% da prova';
      const uniforme = Math.min(0.95, pctDe(alvoPts, maxPts));
      const np = (() => { try { return notaProjetada(courseId); } catch { return null; } })();
      const por = res.por.map((p) => {
        const d = prova.find((x) => x.id === p.id), r = rows.get(p.id), meta = Math.min(0.95, Math.max(uniforme, pctDe(minPts(d), d.questoes * d.peso)));
        const npRow = np?.por.find((x) => x.id === p.id), temMapas = (pe?.rows.find((x) => x.id === p.id)?.mapas || []).some((m) => masteryOf(m).respondidas >= 5), domMapas = npRow && !npRow.estimativa && temMapas ? npRow.dominio / 100 : null;
        return { ...p, ...r, meta, falta: Math.max(0, meta - r.taxa), domMapas, divergencia: domMapas !== null && !r.semDados ? domMapas - r.taxa : null, cor: cores[p.id] || pe?.rows.find((x) => x.id === p.id)?.cor || 'var(--pr-latao)' };
      });
      const metaDe = new Map(por.map((x) => [x.id, x.meta]));
      /* pontos fracos: assuntos com amostra mínima, sem repetir pai e filho, abaixo da meta da disciplina, pesados pelo valor dela */
      const totQ = prova.reduce((s, d) => s + d.questoes, 0) || 1, fracos = [], doCurso = mapsForCourse(courseId, { includeLinked: false });
      const byKey = new Map(doCurso.map((m) => [keyOf(m), m]));
      for (const m of snap.materias) {
        const l = lig.get(tecKey(m.n)), d = l?.id && prova.find((x) => x.id === l.id);
        if (!d) continue;
        const subs = m.s || [], mapas = pe?.rows.find((r) => r.id === d.id)?.mapas || [];
        for (const x of subs) {
          if (x.q < 6) continue;
          const filhos = x.h !== 'sc' ? subs.filter((y) => y.h.startsWith(x.h + '.') && y.q >= 6) : [];
          if (filhos.length) continue;
          const tx = x.a / x.q, alvo = Math.max(0.6, metaDe.get(d.id) || 0.7), gap = alvo - tx;
          if (gap <= 0.03) continue;
          const pai = x.h.includes('.') ? subs.find((y) => y.h === x.h.split('.').slice(0, -1).join('.')) : null;
          const nome = x.h === 'sc' ? m.n + ' (sem classificação)' : x.n, ak = tecKey(m.n + ' ' + x.n);
          const manual = Object.prototype.hasOwnProperty.call(manMapa, ak) ? manMapa[ak] : undefined;
          const mapa = manual !== undefined ? (manual === '-' ? null : byKey.get(manual) || null) : tecMapaDoAssunto(courseId, x.n + ' ' + (pai?.n || ''), mapas) || tecMapaDoAssunto(courseId, x.n, doCurso);
          fracos.push({ key: ak, nome, materia: m.n, pai: pai?.n || '', q: x.q, a: x.a, taxa: tx, alvo, disc: d.id, discNome: d.nome, cor: cores[d.id] || 'var(--pr-latao)', mapa, viaMapa: manual !== undefined ? 'manual' : mapa ? 'auto' : '', prioridade: gap * d.peso * Math.sqrt(d.questoes / totQ) * Math.log2(1 + x.q) });
        }
      }
      fracos.sort((a, b) => b.prioridade - a.prioridade);
      /* evolução: acerto por disciplina em cada leitura guardada (as antigas têm matéria e 1º nível, o que basta) */
      const serie = list.slice(0, 8).reverse().map((sn) => { const { rows: rr } = porDisc(sn); return { at: sn.at, q: sn.total.q, taxa: Object.fromEntries([...rr.values()].map((x) => [x.id, x.q ? x.a / x.q : null])) }; });
      /* peso de cada mapa no plano: soma das prioridades dos assuntos ligados, relativa ao assunto mais urgente */
      const maxPr = fracos[0]?.prioridade || 1, boost = new Map();
      for (const f of fracos) if (f.mapa) { const k = keyOf(f.mapa), o = boost.get(k) || { rel: 0, assuntos: [] }; o.rel = Math.min(1, o.rel + f.prioridade / maxPr); o.assuntos.push(f); boost.set(k, o); }
      const semMapa = fracos.filter((f) => !f.mapa).slice(0, 8);
      return { snap, evol, n: list.length, diasDesde, lig, por, res, geral, fora: fora.sort((a, b) => b.q - a.q), fracos: fracos.slice(0, 12), todosFracos: fracos, semMapa, serie, boost, alvoPts, alvoFonte, qLigadas: qL };
  }
  /* para o StudyPlanner: { rel 0..1, motivo } do mapa segundo os pontos fracos do TEC; null sem TEC */
  function tecPesoMapa(map) {
    try {
      if (P.prefs?.get?.('planoTec') === false) return null;
      const cid = String(map?.courseId || '');
      if (!cid) return null;
      const R = tecResumo(cid), b = R?.boost?.get(keyOf(map));
      if (!b) return null;
      const f = b.assuntos[0];
      return { rel: b.rel, motivo: 'TEC: ' + f.nome + ' ' + Math.round(f.taxa * 100) + '%' + (b.assuntos.length > 1 ? ' +' + (b.assuntos.length - 1) : '') };
    } catch { return null; }
  }
  function setTecMapaAssunto(courseId, patch) { const ed = editalOf(courseId) || {}; return setEdital(courseId, { tecMapaAssunto: { ...(ed.tecMapaAssunto || {}), ...patch } }); }
  P.tec = { list: tecList, save: tecSave, remove: tecRemove, ligacoes: tecLigacoes, setMap: setTecMap, setMapaAssunto: setTecMapaAssunto, resumo: tecResumo, pesoMapa: tecPesoMapa, key: tecKey };
  /* matriz pelo programa: itens do edital (importados do kit) × mapas que os cobrem; sem programa, por disciplina */
  function matrizPrograma(courseId) {
    return memo('mp:' + courseId, () => {
      const ed = editalOf(courseId) || {}, maps = mapsForCourse(courseId, { includeLinked: false });
      const byCode = new Map(maps.map((m) => [String(m.code || '').toUpperCase(), m]));
      const prog0 = Array.isArray(ed.programa) ? ed.programa : [];
      const cell = (ms) => { const q = agg(ms); const dom = ms.map((m) => masteryOf(m).dominio).filter((x) => x !== null); return { mapas: ms, cobertura: q.total ? Math.round((q.marked / q.total) * 100) : 0, dominio: dom.length ? Math.round(dom.reduce((a, b) => a + b, 0) / dom.length) : null }; };
      if (prog0.length) {
        const rows = prog0.map((it, i) => { const ms = (Array.isArray(it.mapas) ? it.mapas : []).map((c) => byCode.get(String(c).toUpperCase())).filter(Boolean); return { id: it.id || 'it' + (i + 1), item: String(it.item || it.titulo || ''), disciplina: String(it.disciplina || ''), ...cell(ms) }; });
        return { fonte: 'programa', rows, semMapa: rows.filter((r) => !r.mapas.length).length };
      }
      const pe = pesoEsforco(courseId);
      if (!pe) return null;
      const rows = pe.rows.map((r) => ({ id: r.id, item: r.nome, disciplina: r.nome, ...cell(r.mapas) }));
      return { fonte: 'disciplinas', rows, semMapa: rows.filter((r) => !r.mapas.length).length };
    });
  }
  P.mastery.matriz = matrizPrograma;

  /* planejamento do kit (meus-mapas/app-edital/v1): prova, fases e programa → edital do curso. Valida antes de gravar. */
  const prov0 = (e) => Array.isArray(e?.programa) && e.programa.length;
  function importKit(courseId, raw) {
    let j = raw;
    if (typeof j === 'string') { try { j = JSON.parse(j); } catch { throw new Error('O arquivo não é um JSON válido.'); } }
    if (!j || typeof j !== 'object' || !/^meus-mapas\/app-edital\/v1$/.test(String(j.schema || ''))) throw new Error('Formato não reconhecido: esperado meus-mapas/app-edital/v1.');
    const prova = normProva(j.prova);
    const programa = (Array.isArray(j.programa) ? j.programa : []).slice(0, 400).map((it, i) => ({ id: String(it.id || 'it' + (i + 1)).slice(0, 40), item: String(it.item || it.titulo || '').slice(0, 300), disciplina: String(it.disciplina || '').slice(0, 120), mapas: (Array.isArray(it.mapas) ? it.mapas : []).map((c) => String(c).slice(0, 40)).slice(0, 20) })).filter((it) => it.item);
    const ids = new Set(FASES.map((f) => f[0])), fases = { ...(editalOf(courseId)?.fases || {}) };
    let nf = 0;
    for (const f of Array.isArray(j.fases) ? j.fases : []) { const id = String(f?.id || '').toLowerCase(), d = String(f?.data || f?.date || ''); if (ids.has(id) && /^\d{4}-\d{2}-\d{2}$/.test(d)) { fases[id] = { date: d }; nf++; } }
    if (!prova.length && !programa.length) throw new Error('O planejamento não traz prova nem programa.');
    const prev = editalOf(courseId) || {};
    const patch = { ...(programa.length || !prov0(prev) ? { programa } : {}), fases, fonte: String(j.fonte || 'Kit Meus Mapas').slice(0, 200), importadoEm: new Date().toISOString() };
    if (prova.length) { patch.prova = prova; patch.minimoGeral = j.minimoGeral ?? prev.minimoGeral ?? null; patch.titulos = j.titulos ?? prev.titulos ?? null; Object.assign(patch, j.leitura ? { grupos: [], etapas: [], formato: 'multipla', penalidade: 0, alternativas: null, escala: 'soma', notaFinal: 'soma', pesoObjetiva: null, naoZerar: false, minimoGeralEm: 'pontos', titulos: null } : {}, regrasPatch(j)); }
    if (j.conteudos && typeof j.conteudos === 'object') patch.conteudos = Object.fromEntries(Object.entries(j.conteudos).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 6000)]));
    if (j.leitura && typeof j.leitura === 'object') patch.leitura = { em: String(j.leitura.em || new Date().toISOString()), confianca: String(j.leitura.confianca || ''), avisos: (Array.isArray(j.leitura.avisos) ? j.leitura.avisos : []).map(String).slice(0, 6), pagina: j.leitura.quadro?.pagina || null };
    if (j.cargo && typeof j.cargo === 'object') { const cg = {}; for (const k of ['vagas', 'carga', 'vencimento', 'validade', 'desempate']) if (j.cargo[k]) cg[k] = String(j.cargo[k]).slice(0, 80); if (Object.keys(cg).length) patch.cargo = cg; }
    if (j.banca) patch.banca = String(j.banca).toUpperCase().slice(0, 40);
    /* mapas da série: disciplina principal e alcance por sigla (gerar_edital_app.py do kit REV07) */
    const ms = (Array.isArray(j.mapas) ? j.mapas : []).slice(0, 200), dids = new Set((prova.length ? prova : normProva(editalOf(courseId)?.prova)).map((d) => d.id));
    const md = {};
    let alc = 0;
    for (const m of ms) {
      const sig = String(m?.sigla || '').toUpperCase().slice(0, 40), d0 = (Array.isArray(m?.disciplinas) ? m.disciplinas : []).map(String).find((x) => dids.has(x));
      if (sig && d0) md[sig] = d0;
      const map = sig ? mapsForCourse(courseId, { includeLinked: false }).find((x) => String(x.code || '').toUpperCase() === sig) : null;
      if (map && ALCANCES.some(([a]) => a === m.alcance) && setAlcance(keyOf(map), m.alcance)) alc++;
    }
    if (Object.keys(md).length) patch.mapaDisciplina = md;
    setEdital(courseId, patch);
    return { disciplinas: prova.length, itens: programa.length, fases: nf, mapas: Object.keys(md).length, alcances: alc };
  }
  P.editais.importKit = importKit;
  P.editais.regrasPatch = regrasPatch;
  P.editais.REGRA_KEYS = REGRA_KEYS;

  /* ---------- V15.59 · ponte com a Template V211 G27 (mesma origem, só o mapa aberto no leitor) ----------
     Mapa → app: MEUS_MAPAS_MAP_HELLO e MEUS_MAPAS_MAP_SUMMARY (meus-mapas/map-summary/v1). O resumo fica neste aparelho,
     como o estado do mapa, em studyapp.mapSummary::<mapKey>; nunca traz anotações, enunciados nem alternativas.
     App → mapa: MEUS_MAPAS_CONTEXT (meus-mapas/context/v1) com curso, disciplina, peso, pontos por tópico, alcance e motivos do plano. */
  const SUM_KEY = (k) => 'studyapp.mapSummary::' + k;
  function mapSummary(map) {
    const k = keyOf(map);
    if (!k) return null;
    return memo('sum:' + k, () => { try { const v = JSON.parse(localStorage.getItem(SUM_KEY(k)) || 'null'); return v && v.schema === 'meus-mapas/map-summary/v1' && v.topics && typeof v.topics === 'object' ? v : null; } catch { return null; } });
  }
  function readerMap(win) {
    const frame = document.getElementById('readerFrame');
    if (!frame || win !== frame.contentWindow) return null;
    const key = typeof state !== 'undefined' ? state.readerMapKey : '';
    return key && typeof mapById === 'function' ? mapById(key) : null;
  }
  function contextFor(map) {
    const c = courseById(map.courseId), d = disciplinaDoMapa(map), ex = c ? courseExamState(c) : null;
    let motivos = [];
    try { const row = (window.StudyPlanner?.priorityRows?.(mapsForCourse(map.courseId, { includeLinked: false })) || []).find((r) => r.key === keyOf(map)); motivos = (row?.reasons || []).filter((x) => /peso|mínimo|pt|domínio|prova/.test(x)).slice(0, 3); } catch {}
    const ppt = pptDoMapa(map);
    return {
      curso: c ? { sigla: courseCode(c), banca: String(c.board || '').slice(0, 40), cargo: String(c.subtitle || '').replace(/^[^·]*·\s*/, '').slice(0, 60), provaISO: ex?.date ? dateKey(ex.date) : '', fase: ex?.phase || '' } : {},
      disciplina: d ? { nome: d.nome, peso: d.peso, minimo: d.minimo, pontosPorTopico: ppt ? Math.round(ppt * 100) / 100 : null } : null,
      alcance: alcance(map),
      motivosPlano: motivos
    };
  }
  function slimSummary(d) {
    const topics = {};
    for (const [id, t] of Object.entries(d.topics || {}).slice(0, 600)) {
      if (!t || typeof t !== 'object') continue;
      const traps = {};
      for (const [k, n] of Object.entries(t.traps || {})) { const tid = P.armadilhas.id(k); if (tid && Number(n) > 0) traps[tid] = (traps[tid] || 0) + Math.min(999, Number(n)); }
      topics[String(id).slice(0, 120)] = { state: String(t.state || '').slice(0, 12), mastery: Number.isFinite(Number(t.mastery)) && t.mastery !== null ? Math.max(0, Math.min(100, Math.round(Number(t.mastery)))) : null, answered: Number(t.answered) || 0, correct: Number(t.correct) || 0, guesses: Number(t.guesses) || 0, traps, markers: Array.isArray(t.markers) ? t.markers.map(String).slice(0, 6) : [] };
    }
    const rx = (Array.isArray(d.rxErrors) ? d.rxErrors : []).slice(-60).map((e) => ({ topicId: String(e?.topicId || '').slice(0, 120), trap: P.armadilhas.id(e?.trap) || 'outra', when: e?.when || null }));
    const id0 = d.identity || {};
    return { schema: 'meus-mapas/map-summary/v1', templateRelease: String(d.templateRelease || '').slice(0, 30), storageId: String(d.storageId || '').slice(0, 120), identity: { code: String(id0.code || '').slice(0, 20), cutoff: /^\d{4}-\d{2}-\d{2}$/.test(String(id0.cutoff || '')) ? id0.cutoff : '', scope: String(id0.scope || '').slice(0, 12), editalItems: Array.isArray(id0.editalItems) ? id0.editalItems.map(String).slice(0, 80) : [] }, topics, rxErrors: rx, vespera: d.vespera && typeof d.vespera === 'object' ? { items: Number(d.vespera.items) || 0, seen: Number(d.vespera.seen) || 0, minutes: Number(d.vespera.minutes) || 0 } : null, receivedAt: new Date().toISOString() };
  }
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    const d = e.data;
    if (!d || (d.type !== 'MEUS_MAPAS_MAP_HELLO' && d.type !== 'MEUS_MAPAS_MAP_SUMMARY') || d.schema !== 'meus-mapas/map-summary/v1') return;
    const map = readerMap(e.source);
    if (!map) return;
    if (d.type === 'MEUS_MAPAS_MAP_HELLO') {
      try { e.source.postMessage({ type: 'MEUS_MAPAS_CONTEXT', schema: 'meus-mapas/context/v1', storageId: String(d.storageId || ''), ...contextFor(map) }, location.origin); } catch {}
      return;
    }
    try { localStorage.setItem(SUM_KEY(keyOf(map)), JSON.stringify(slimSummary(d))); } catch {}
  });
  P.bridge = { summary: mapSummary, context: contextFor, slim: slimSummary };
  /* ---------- auditoria do acervo (V15.57) ----------
     Só leitura. Usa o índice de busca (gerado no build a partir dos HTML incluídos: marcadores, questões,
     template e fonte legal declarada), os cursos e as tentativas de simulado. Mapas que existem só na
     nuvem não estão no índice e aparecem como "não verificados". */
  function auditAcervo(today = new Date()) {
    return memo('audit', () => {
      const idx = (typeof state !== 'undefined' && state.searchIndex) || {}, sums = Array.isArray(idx.maps) ? idx.maps : [];
      const byKey = new Map(sums.map((m) => [m.mapKey, m])), all = allMaps(), out = [];
      const known = all.filter((m) => byKey.has(keyOf(m))), unknown = all.filter((m) => !byKey.has(keyOf(m)));
      const sumOf = (m) => byKey.get(keyOf(m));
      const semMk = known.filter((m) => { const x = sumOf(m); return x.topics && !x.topicsWithMarkers; });
      const parcial = known.filter((m) => { const x = sumOf(m); return x.topicsWithMarkers && x.topicsWithMarkers < x.topics; });
      if (semMk.length) out.push({ sev: 'aviso', tipo: 'marcadores', titulo: semMk.map((m) => m.code).join(', ') + ' sem nenhum data-markers', detalhe: 'Os filtros ⭐ ⚠️ 💎 🔢 do leitor ficam vazios nesses mapas. Vale regerar no template atual, sem mudar o conteúdo.', keys: semMk.map(keyOf) });
      if (parcial.length) out.push({ sev: 'aviso', tipo: 'marcadores', titulo: parcial.length + ' ' + plural(parcial.length, 'mapa com tópicos', 'mapas com tópicos') + ' sem marcador', detalhe: parcial.map((m) => m.code + ' (' + (sumOf(m).topics - sumOf(m).topicsWithMarkers) + ')').join(', '), keys: parcial.map(keyOf) });
      const semFonte = known.filter((m) => !sumOf(m).fonte), comFonte = known.filter((m) => sumOf(m).fonte);
      if (semFonte.length) out.push({ sev: 'info', tipo: 'fonte legal', titulo: semFonte.length + ' de ' + known.length + ' mapas não declaram a data da fonte', detalhe: (comFonte.length ? comFonte.map((m) => m.code).join(', ') + ' declaram. ' : '') + 'Sem a data, não há como saber se a lei estudada é a vigente.', keys: semFonte.map(keyOf) });
      const antigos = known.filter((m) => sumOf(m).template !== 'V211');
      if (antigos.length) out.push({ sev: 'aviso', tipo: 'template', titulo: antigos.map((m) => m.code).join(', ') + ' fora do Template V211', detalhe: 'Regerar mantém o progresso quando os identificadores dos tópicos são os mesmos.', keys: antigos.map(keyOf) });
      if (unknown.length) out.push({ sev: 'info', tipo: 'nuvem', titulo: unknown.length + ' ' + plural(unknown.length, 'mapa só na nuvem', 'mapas só na nuvem') + ', não verificados', detalhe: unknown.slice(0, 8).map((m) => m.code || m.title).join(', ') + (unknown.length > 8 ? '…' : '') + '. A auditoria lê os HTML incluídos no aplicativo.', keys: unknown.map(keyOf) });
      for (const c of courses()) {
        if (isArchived(c)) continue;
        const ex = courseExamState(c, today), sg = courseSigla(c), cl = closure(c.id);
        if (ex.phase === 'nodate') out.push({ sev: 'aviso', tipo: 'curso', titulo: sg + ' sem data de prova', detalhe: 'Sem a data, o plano não calcula o ritmo nem a régua mostra a fase.', course: c.id });
        if (!provaOf(c.id).length) out.push({ sev: 'aviso', tipo: 'curso', titulo: sg + ' sem estrutura da prova', detalhe: 'Pesos e mínimos alimentam o gabarito em pontos e o valor de cada mapa' + (padraoDaBanca(c.board) ? '; há um padrão ' + padraoDaBanca(c.board).banca + ' pronto para usar.' : '.'), course: c.id });
        if (ex.phase === 'after' && ex.days >= -30 && !cl.gabarito) out.push({ sev: 'aviso', tipo: 'curso', titulo: sg + ': prova feita, gabarito não registrado', detalhe: 'Registre os acertos para ter a nota estimada e acompanhar os recursos.', course: c.id });
        if ((ex.phase === 'before' || ex.phase === 'after') && !fasesOf(c, today).some((f) => f.date && f.id !== 'prova')) out.push({ sev: 'info', tipo: 'curso', titulo: sg + ': cronograma vazio', detalhe: 'Informe gabarito, recursos e resultado na Régua do edital, ou importe o .ics na Agenda.', course: c.id });
      }
      const semSec = sims().filter((sm) => attempts(sm).some((a) => !a.sections || !Object.keys(a.sections).length));
      if (semSec.length) out.push({ sev: 'info', tipo: 'simulados', titulo: semSec.length + ' ' + plural(semSec.length, 'simulado com tentativa', 'simulados com tentativas') + ' sem acerto por disciplina', detalhe: 'Essas tentativas não viram pontos da banca.' });
      const q = sums.reduce((n, m) => n + (Number(m.questions) || 0), 0);
      if (known.length) out.push({ sev: 'ok', tipo: 'questões', titulo: fmtNum(q) + ' variantes de questão em ' + known.length + ' mapas', detalhe: 'Banco embutido nos tópicos (níveis N1 a N3).' });
      if (known.length && !antigos.length) out.push({ sev: 'ok', tipo: 'template', titulo: 'Template V211 em todos os ' + known.length + ' mapas verificados', detalhe: sums.every((m) => m.g26) ? 'Mesma base G26.' : '' });
      return { items: out, avisos: out.filter((x) => x.sev === 'aviso').length, verificados: known.length, total: all.length, bytes: sums.reduce((n, m) => n + (Number(m.bytes) || 0), 0) };
    });
  }
  P.audit = { run: auditAcervo };

  /* biblioteca (V15.56): o que está em estudo + mapas portáteis/mistos de concursos encerrados.
     Só os mapas locais de concursos encerrados ficam ocultos. */
  const libraryMaps = () => memo('lib', () => { const live = new Set(maps().map(keyOf)); return allMaps().filter((m) => live.has(keyOf(m)) || alcance(m) !== 'local'); });

  P.data = { keyOf, prog, agg, maps, allMaps, libraryMaps, folhas, mapsForCourse };

  /* ---------- integração com sincronização e backup ---------- */
  /* V15.66 · a capa da banca escolhida para um simulado (quando o banco não aceita a chave) viaja junto com as preferências */
  function simCapas(next) {
    const K = 'studyapp.simulationCoverLocal';
    try {
      if (next) { localStorage.setItem(K, JSON.stringify({ ...(JSON.parse(localStorage.getItem(K) || '{}') || {}), ...next })); return next; }
      const v = JSON.parse(localStorage.getItem(K) || '{}') || {};
      return Object.keys(v).length ? v : undefined;
    } catch { return undefined; }
  }
  function installSync() {
    if (typeof localPreferences === 'function' && !localPreferences.__prancha) {
      const base = localPreferences;
      const wrapped = function () { const out = base.apply(this, arguments) || {}; out.prancha = readStore(); out.simCapas = simCapas(); return out; };
      wrapped.__prancha = true;
      try { localPreferences = wrapped; } catch {} // eslint-disable-line no-global-assign
      window.localPreferences = wrapped;
    }
    if (typeof window.mergePreferencePayloads === 'function' && !window.mergePreferencePayloads.__prancha) {
      const base = window.mergePreferencePayloads;
      const wrapped = function (local = {}, cloud = {}, lt = 0, ct = 0) {
        const out = base.apply(this, arguments) || {};
        if (local.prancha || cloud.prancha) out.prancha = mergeStore(local.prancha || {}, cloud.prancha || {});
        if (local.simCapas || cloud.simCapas) out.simCapas = lt >= ct ? { ...(cloud.simCapas || {}), ...(local.simCapas || {}) } : { ...(local.simCapas || {}), ...(cloud.simCapas || {}) };
        return out;
      };
      wrapped.__prancha = true;
      window.mergePreferencePayloads = wrapped;
    }
    if (typeof applyPreferences === 'function' && !applyPreferences.__prancha) {
      const base = applyPreferences;
      const wrapped = function (payload = {}) { const r = base.apply(this, arguments); if (payload && payload.prancha && typeof payload.prancha === 'object') importStore(payload.prancha, { merge: true }); if (payload && payload.simCapas && typeof payload.simCapas === 'object') simCapas(payload.simCapas); return r; };
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
