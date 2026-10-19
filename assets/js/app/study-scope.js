'use strict';
/* MEUS MAPAS · Escopo de estudo (V15.54).
   Um concurso está ENCERRADO quando foi arquivado ou quando a data da prova já
   passou (o dia da prova ainda conta como ativo). Os mapas de concursos
   encerrados saem de tudo o que pede estudo — Início, plano do dia, Agora,
   revisões, prioridades, agenda automática, progresso geral e buscas rápidas —
   e ficam guardados na biblioteca (Todos os Mapas → "Mostrar encerrados") e em
   Cursos → Encerrados. Nada é apagado: progresso, histórico e revisões
   continuam salvos e voltam sozinhos se o curso for reativado ou ganhar uma
   nova data de prova. */
(() => {
  if (window.StudyScope) return;
  const KEY = 'studyapp.scope.hideClosed';
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function parse(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
    const t = String(value).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(t);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const examPassed = (value, now = new Date()) => { const d = parse(value); return !!d && day0(d) < day0(now); };
  function enabled() { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } }
  function setEnabled(on) { try { on ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, '0'); } catch {} }
  function courseRetired(course, now = new Date()) {
    if (!course) return false;
    if (course.status === 'archived') return true;
    return examPassed(course.examDate || course.exam_date, now);
  }
  function courseReason(course, now = new Date()) {
    if (!course) return '';
    if (course.status === 'archived') return 'archived';
    return examPassed(course.examDate || course.exam_date, now) ? 'past-exam' : '';
  }
  const all = (name) => { try { const fn = globalThis[name]; return typeof fn === 'function' ? (fn() || []) : []; } catch { return []; } };
  function courseOf(map) {
    if (!map?.courseId) return null;
    return all('combinedCourses').find((c) => String(c.id) === String(map.courseId)) || null;
  }
  /* mapa sem curso encontrado: vale a data de prova gravada no próprio mapa */
  function mapRetired(map, now = new Date()) {
    if (!map) return false;
    const c = courseOf(map);
    return c ? courseRetired(c, now) : examPassed(map.examDate, now);
  }
  function maps(list) {
    const src = Array.isArray(list) ? list : all('combinedMaps');
    if (!enabled()) return src.slice();
    /* uma passada pelos cursos por chamada (barato mesmo com centenas de mapas) */
    const now = new Date(), state = new Map();
    for (const c of all('combinedCourses')) if (c) state.set(String(c.id), courseRetired(c, now));
    return src.filter((m) => {
      if (!m) return false;
      const id = String(m.courseId || '');
      return !(state.has(id) ? state.get(id) : examPassed(m.examDate, now));
    });
  }
  function retiredMaps(list) {
    const src = Array.isArray(list) ? list : all('combinedMaps');
    const keep = new Set(maps(src));
    return src.filter((m) => m && !keep.has(m));
  }
  function courses(list) {
    const src = Array.isArray(list) ? list : all('combinedCourses');
    if (!enabled()) return src.filter((c) => c && c.status !== 'archived');
    return src.filter((c) => c && !courseRetired(c));
  }
  window.StudyScope = { enabled, setEnabled, courseRetired, courseReason, mapRetired, maps, retiredMaps, courses, examPassed };
  window.studyScopeMaps = maps;
  window.studyScopeCourses = courses;
})();
