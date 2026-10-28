'use strict';
/* MEUS MAPAS · Prancha · Início em cinco telas: Hoje, Todos, Revisões, Em sessão, Pós-prova. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.home) return;
  const U = P.util, ui = P.ui, { esc, fmtMin, fmtSec, fmtDay, fmtLong, fmtNum, plural, pct } = U;

  const SCREENS = [['hoje', 'Hoje'], ['todos', 'Todos'], ['rev', 'Revisões'], ['sessao', 'Em sessão'], ['pos', 'Pós-prova'], ['entre', 'Entre concursos']];
  const SKEY = 'studyapp.prancha.homeScreen';
  let lastAuto = '', tick = 0, quick = 0, selTile = '';
  const manual = { get: () => { try { return sessionStorage.getItem(SKEY) || ''; } catch { return ''; } }, set: (v) => { try { v ? sessionStorage.setItem(SKEY, v) : sessionStorage.removeItem(SKEY); } catch {} } };

  function autoScreen() {
    if (P.session.read()) return 'sessao';
    if (P.courses.postExam()) return 'pos';
    if (P.courses.priority()) return 'hoje';
    if (!P.courses.active().length && entreMaps().length) return 'entre';
    return P.courses.active().length ? 'todos' : 'hoje';
  }
  function currentScreen() {
    const auto = autoScreen();
    if (auto !== lastAuto) { lastAuto = auto; manual.set(''); }
    const m = manual.get();
    if (m === 'pos' && !P.courses.postExam()) return auto;
    if (m === 'entre' && !entreMaps().length) return auto;
    return m || auto;
  }

  /* V15.57 · entressafra: mapas portáteis/mistos de concursos encerrados (os locais ficam guardados) */
  const entreMaps = () => P.memo('entre', () => { const live = new Set(P.data.maps().map(P.data.keyOf)); return P.data.libraryMaps().filter((m) => !live.has(P.data.keyOf(m))); });

  /* ---------- peças compartilhadas ---------- */
  function planItems(course) {
    const today = new Date();
    const agenda = P.agenda.blocks(today);
    if (agenda.length) {
      return agenda.map((b) => {
        const it = b.item, map = it.mapKey && typeof mapById === 'function' ? mapById(it.mapKey) : null;
        return { id: it.id, kind: 'agenda', map, key: it.mapKey || '', code: map?.code || (it.kind === 'simulation' ? 'SIM' : 'LIVRE'), title: map ? (map.shortTitle || map.title) : String(it.title || 'Sessão').replace(/^Iniciar\s*·\s*/i, ''), minutes: b.minutes, startLabel: P.agenda.fromMin(b.start) + (b.explicit ? '' : ' (sem horário)'), done: !!it.completedAt, color: map ? P.mapColor(map) : 'var(--pr-pg-argila)' };
      });
    }
    const snap = P.plan.daily();
    return (snap.items || []).filter((x) => x.kind === 'map').map((x, i) => {
      const map = typeof mapById === 'function' ? mapById(x.key) : null;
      const done = map ? Number(window.StudyTime?.mapSeconds?.(x.key) || 0) > 0 && (P.agenda.sessionsForDate(today).some((s) => s.mapKey === x.key)) : false;
      return { id: 'coach-' + i, kind: 'coach', map, key: x.key, code: x.code || map?.code || 'MAPA', title: x.title, minutes: Number(x.minutes) || 20, reason: x.reason, done, color: map ? P.mapColor(map) : 'var(--pr-latao)' };
    });
  }
  function dayline(items, curKey = '') {
    const total = items.reduce((s, x) => s + x.minutes, 0);
    if (!items.length) return '<div class="pr-dayline" role="img" aria-label="Régua do dia vazia"><span class="free" style="flex:1">nada planejado</span></div>';
    const goal = P.time.goals().daily, free = Math.max(0, goal - total);
    return '<div class="pr-dayline" role="img" aria-label="Régua do dia: ' + fmtMin(total) + ' planejados">' + items.map((x) => '<span class="' + (x.done ? 'done' : '') + (curKey && x.key === curKey ? ' cur' : '') + '" style="flex:' + x.minutes + ';--c:' + x.color + '" title="' + esc(x.code + ' · ' + fmtMin(x.minutes)) + '">' + esc(x.code) + '</span>').join('') + (free > 0 ? '<span class="free" style="flex:' + Math.min(free, total * 2 || free) + '">' + fmtMin(free) + ' livres</span>' : '') + '</div>';
  }
  function planList(items, curKey = '') {
    if (!items.length) return ui.empty('Nenhum bloco para hoje', 'Planeje na Agenda ou use "Tenho só" para montar um bloco agora.', ui.btn('Abrir a Agenda', ui.act('nav', 'agenda'), 'g sm'));
    return '<div class="pr-list">' + items.map((x, i) => '<div class="pr-pi' + (x.done ? ' done' : '') + (curKey && x.key === curKey ? ' cur' : '') + '" style="--c:' + x.color + '"><span class="n">' + (x.done ? '✓' : i + 1) + '</span><span><b>' + esc(x.title) + '</b><small>' + esc([x.code, x.startLabel, x.reason].filter(Boolean).join(' · ')) + '</small></span><span class="pr-mono">' + fmtMin(x.minutes) + '</span>' + (x.done ? '<span class="pr-chip ok">feito</span>' : ui.btn('Iniciar', ui.act(x.kind === 'agenda' ? 'start-agenda' : 'start-plan', x.kind === 'agenda' ? x.id : x.key, { 'data-min': x.minutes }), 'sm')) + '</div>').join('') + '</div>';
  }
  function retomar() {
    /* V15.54: mapa de concurso encerrado não volta para "Retomar"; usa o último mapa em estudo */
    let lm = typeof lastMap === 'function' ? lastMap() : null;
    if (lm && window.StudyScope?.mapRetired?.(lm)) {
      const ts = (m) => { const p = P.data.prog(m); return typeof activityTimestamp === 'function' ? activityTimestamp(p.lastActivity) : Date.parse(p.lastActivity || 0) || 0; };
      lm = P.data.maps().filter((m) => ts(m) > 0).sort((a, b) => ts(b) - ts(a))[0] || null;
    }
    if (!lm) return ui.card('<span class="pr-k">Retomar onde parei</span>' + ui.empty('Nenhum mapa aberto ainda', 'O último mapa estudado aparece aqui.'));
    const p = P.data.prog(lm), k = P.data.keyOf(lm);
    /* V15.52 · F1: o leitor registra o último tópico visível; "Continuar" abre direto nele */
    const r = window.StudyFlow?.resume?.get(k);
    const topic = r ? '<span class="pr-ret-topic"><span class="pr-k">Tópico</span>' + esc(r.title || 'último tópico lido') + '</span>' : '';
    return ui.card('<span class="pr-k">Retomar onde parei</span><div class="pr-ret">' + ui.mapCov(lm) + '<div style="display:grid;gap:6px;min-width:0"><b>' + esc((lm.code ? lm.code + ' · ' : '') + lm.title) + '</b>' + topic + ui.stbar(p) + '<span class="pr-mono">' + p.marked + '/' + p.total + ' · ' + pct(p.marked, p.total) + '% · ' + esc(typeof mapActivityText === 'function' ? mapActivityText(p) : '') + '</span>' + ui.btn(r ? 'Continuar no tópico' : 'Continuar', ui.act('open-map', k, r ? { 'data-topic': r.topicId } : {}), 'sm') + '</div></div>', 'pr-retomar');
  }
  function nextSimCard(course) {
    const s = P.sims.summary(course?.id || '');
    if (!s.total) return ui.card('<span class="pr-k">Próximo simulado</span>' + ui.empty('Nenhum simulado neste concurso', 'Importe um simulado em HTML para treinar no formato da banca.', ui.btn('Importar simulado', ui.act('import-sim'), 'g sm')));
    const next = s.list.find((r) => !r.attempts.length) || s.list.slice().sort((a, b) => (a.best ?? 0) - (b.best ?? 0))[0];
    const sim = next.sim, dur = Number(sim.durationMinutes) || 0;
    const ex = course ? P.courses.examState(course) : null;
    let v = '';
    if (ex && ex.phase === 'before' && !next.attempts.length) {
      const day = suggestSimDay(ex.date, dur);
      v = day ? ui.verdict('l', '', 'Cabe um simulado completo (' + fmtMin(dur || 180) + ') antes da prova: ' + esc(fmtLong(day)) + '.') : ui.verdict('', '', 'Não há um dia livre com ' + fmtMin(dur || 180) + ' antes da prova. Considere um simulado parcial.');
    }
    return ui.card('<span class="pr-k">Próximo simulado</span><h3>' + esc(P.sims.code(sim) + ' · ' + (sim.board || '')) + '</h3><span class="pr-mono">' + (Number(sim.questions) || '—') + ' questões · ' + (dur ? fmtMin(dur) : 'sem duração') + ' · ' + s.done + ' de ' + s.total + ' ' + plural(s.done, 'feito') + '</span>' + v + ui.btn('Abrir ' + esc(P.sims.code(sim)), ui.act('open-sim', next.key), ''));
  }
  /* sugestão de dia (não grava): dia disponível antes da prova com a menor carga planejada */
  function suggestSimDay(exam, minutes) {
    const settings = window.StudyPlanner?.settings?.() || { availableDays: [1, 2, 3, 4, 5, 6], maxDailyMinutes: 120 };
    const days = U.daysBetween(new Date(), exam);
    let best = null, bestLoad = Infinity;
    for (let i = 1; i < days; i++) {
      const d = U.addDays(new Date(), i);
      if (!settings.availableDays.includes(d.getDay())) continue;
      const load = P.agenda.blocks(d).reduce((s, b) => s + b.minutes, 0);
      if (load < bestLoad) { best = d; bestLoad = load; }
    }
    return best;
  }
  function doubtCard() {
    const list = P.doubts.list();
    if (!list.length) return ui.card('<span class="pr-k">Dúvida aberta</span>' + ui.empty('Nenhuma dúvida aberta', 'Anote dúvidas no leitor; elas aparecem aqui.'));
    const d = list[0], map = d.mapKey && typeof mapById === 'function' ? mapById(d.mapKey) : null;
    return ui.card('<span class="pr-k">Dúvida aberta</span><b style="font-size:var(--fs-body-sm)">' + esc((map?.code ? map.code + ' · ' : '') + d.text) + '</b><span class="pr-mono">' + esc(ui.lastLabel(d.createdAt)) + ' · ' + list.length + ' ' + plural(list.length, 'aberta') + '</span>' + ui.btn('Ver dúvidas', ui.act('nav', 'progress'), 'g sm'));
  }

  /* ---------- 1 · HOJE ---------- */
  function screenHoje() {
    const pc = P.courses.priority();
    const all = P.data.maps(), gp = P.data.agg(all);
    const goals = P.time.goals(), today = P.time.today(), week = P.time.week();
    const items = planItems(pc?.course);
    const planned = items.reduce((s, x) => s + x.minutes, 0), doneMin = Math.round(today / 60);
    const q = P.reviews.queue(), qCount = q.reduce((s, x) => s + x.count, 0);
    let carimbo;
    if (pc) {
      const c = pc.course, ex = pc.exam, p = pc.progress, h = pc.health, f = pc.forecast;
      const rest = Math.max(0, p.total - p.marked), simS = P.sims.summary(c.id);
      const big = ex.phase === 'today' ? '<span class="pr-pct ox">Hoje</span><span class="pr-sub">é dia de prova · ' + esc(fmtLong(ex.date)) + '</span>' : '<span class="pr-pct pr-num ' + (ex.days <= 7 ? 'ox' : '') + '">' + ex.days + '<small> ' + plural(ex.days, 'dia') + '</small></span><span class="pr-sub">até a prova · ' + esc(fmtLong(ex.date)) + '</span>';
      let v;
      if (ex.phase === 'today') v = ui.verdict('l', 'Dia de prova.', 'Nenhuma sessão nova é sugerida hoje; as revisões que caíam hoje podem ser adiadas para amanhã na tela Revisões.');
      else {
        const need = ex.days > 0 ? Math.ceil(rest / ex.days) : rest;
        const fcTxt = f && f.remainingSeconds ? ' O plano do app estima ' + fmtSec(f.remainingSeconds) + ' de leitura para o restante: ' + fmtSec(f.remainingSeconds / Math.max(1, ex.days)) + ' por dia.' : '';
        v = ui.verdict(h?.status === 'risk' ? '' : h?.status === 'healthy' ? 'm' : 'l', 'Faltam ' + ex.days + ' ' + plural(ex.days, 'dia') + ' e ' + fmtNum(rest) + ' ' + plural(rest, 'tópico') + '.', esc(h?.message || '') + (rest ? ' São ' + need + ' ' + plural(need, 'tópico') + ' por dia.' : '') + fcTxt + ' Hoje: ' + fmtSec(today) + '.' + esc(marcoAviso()));
      }
      carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc('Hoje · ' + pc.sigla + ' · ' + P.courses.label(c)) + '</span><div class="pr-big">' + big + '</div>' +
        ui.states([['feito', doneMin, 'var(--pr-latao)'], ['planejado', Math.max(0, planned - doneMin), 'var(--pr-g3)']], 'Plano de hoje: ' + fmtMin(doneMin) + ' de ' + fmtMin(planned) + ' feitos') +
        ui.legend([['Feito hoje', fmtSec(today), 'var(--pr-latao)'], ['Planejado', fmtMin(planned), 'var(--pr-g3)', true]]) + v + '</div><div class="pr-c-b">' +
        ui.cell('Meta de hoje', fmtSec(today) + ' / ' + fmtMin(goals.daily), today >= goals.daily * 60 ? 'ok' : '', items.length + ' ' + plural(items.length, 'bloco planejado', 'blocos planejados')) +
        ui.cell('Semana', fmtSec(week) + ' / ' + fmtMin(goals.weekly), '', esc(U.DSEM_LONGO[new Date().getDay()]) + ' · ' + ((7 - ((new Date().getDay() + 6) % 7)) - 1) + ' dias restantes') +
        ui.cell('Restam', fmtNum(rest), ex.days <= 7 && rest ? 'ox' : '', 'de ' + fmtNum(p.total) + ' tópicos') +
        ui.cell('A revisar', fmtNum(qCount), qCount ? 'l' : 'mu', '<button type="button" class="pr-link" data-pr-act="screen" data-arg="rev">abrir a fila →</button>') +
        ui.cell('Progresso geral', pct(gp.marked, gp.total) + '%', '', '<button type="button" class="pr-link" data-pr-act="screen" data-arg="todos">' + fmtNum(gp.marked) + '/' + fmtNum(gp.total) + ' · ' + P.courses.active().length + ' ' + plural(P.courses.active().length, 'concurso') + ' →</button>') +
        ui.cell('Simulados', simS.done + ' de ' + simS.total, '', simS.done ? 'melhor nota ' + simS.best + '%' : simS.total ? 'nenhum feito' : 'nenhum importado') + '</div></section>';
    } else {
      const cs = P.courses.active();
      carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">Hoje · ' + esc(U.fmtLong(new Date())) + '</span><div class="pr-big"><span class="pr-pct pa pr-num">' + fmtSec(today) + '</span><span class="pr-sub">estudados hoje · meta ' + fmtMin(goals.daily) + '</span></div>' +
        ui.verdict('n', cs.length ? 'Nenhum concurso com data de prova.' : 'Nenhum concurso cadastrado.', cs.length ? 'Defina a data da prova para o carimbo contar os dias e o plano calcular o ritmo.' : 'Crie um concurso e importe os mapas do edital para começar.') +
        '<div class="pr-row">' + (cs.length ? ui.btn('Definir data da prova', ui.act('manage-course', cs[0].id), 'p') : ui.btn('Novo concurso', ui.act('new-course'), 'p')) + '</div></div><div class="pr-c-b">' +
        ui.cell('Meta de hoje', fmtSec(today) + ' / ' + fmtMin(goals.daily), '', '') + ui.cell('Semana', fmtSec(week) + ' / ' + fmtMin(goals.weekly), '', '') +
        ui.cell('A revisar', fmtNum(qCount), qCount ? 'l' : 'mu', '<button type="button" class="pr-link" data-pr-act="screen" data-arg="rev">abrir a fila →</button>') + ui.cell('Progresso geral', pct(gp.marked, gp.total) + '%', '', fmtNum(gp.marked) + '/' + fmtNum(gp.total)) + '</div></section>';
    }
    /* Agora: a prioridade número 1 do app, uma única ação cheia */
    const top = P.plan.priorities(1)[0];
    let agora;
    if (top) {
      const m = top.map, p = top.progress;
      const quickBtns = [15, 30, 60, 90].map((n) => '<button type="button" data-pr-act="quick" data-arg="' + n + '" aria-pressed="' + (quick === n) + '">' + fmtMin(n) + '</button>').join('');
      agora = ui.card(ui.head('Agora', esc(m.title), ui.btn('Começar · ' + fmtMin(top.minutes), ui.act('start-plan', top.key, { 'data-min': top.minutes }), 'p'), 'l') + '<div class="pr-now">' + ui.mapCov(m) + '<div style="display:grid;gap:10px;min-width:0"><div class="pr-why">' + top.reasons.slice(0, 4).map((r) => '<span class="' + (/prova|atras/.test(r) ? 'o' : /DIF|REV|revis/.test(r) ? 'l' : '') + '">' + esc(r) + '</span>').join('') + '</div><p style="font-size:var(--fs-body-sm)">' + esc((m.code || '') + ' · ' + p.marked + '/' + p.total + ' tópicos · ' + ui.mapState(p)) + '</p><div><span class="pr-k">Tenho só</span><div class="pr-qk" role="group" aria-label="Tempo disponível" style="margin-top:6px">' + quickBtns + '</div></div></div></div>');
    } else agora = ui.card(ui.head('Agora', 'Nada pendente agora') + ui.empty('Todos os mapas estão em dia', 'Importe novos mapas ou revise os concluídos.'));
    const done = items.filter((x) => x.done).length;
    const plano = ui.card(ui.head('Plano do dia', fmtMin(planned) + ' · ' + items.length + ' ' + plural(items.length, 'bloco') + ' · ' + done + ' ' + plural(done, 'feito'), ui.btn('Agenda', ui.act('nav', 'agenda'), 'g sm')) + dayline(items) + planList(items));
    let planta = '';
    if (pc) {
      const list = P.data.mapsForCourse(pc.id);
      planta = ui.card(ui.head('Planta do edital · ' + pc.sigla, pc.mapsDone + ' ' + plural(pc.mapsDone, 'mapa fechado', 'mapas fechados') + ', ' + pc.mapsNever + ' ainda ' + plural(pc.mapsNever, 'vazio'), ui.btn('Abrir curso', ui.act('open-course', pc.id), 'g sm')) + ui.tiles(list, { sel: selTile, cls: 'sm' }) + '<div class="pr-detail" data-pr-detail aria-live="polite">' + tileDetail(selTile) + '</div>');
    }
    /* P1-10: "Retomar" ocupa o vão sob o "Agora" (a coluna do plano é mais alta); simulado e dúvida seguem em dupla */
    return carimbo + '<div class="pr-two"><div class="pr-stack">' + agora + retomar() + '</div>' + plano + '</div>' + planta + '<div class="pr-three pr-pair">' + nextSimCard(pc?.course) + doubtCard() + '</div>';
  }
  function tileDetail(key) {
    const m = key && typeof mapById === 'function' ? mapById(key) : null;
    if (!m) return 'Toque num lote para ver o mapa.';
    const p = P.data.prog(m), sec = Number(window.StudyTime?.mapSeconds?.(key) || 0);
    return '<b>' + esc(m.code + ' · ' + m.title) + '</b> — ' + esc(m.category || '') + ' · ' + p.marked + ' de ' + p.total + ' tópicos · ' + p.difficult + ' DIF · ' + p.review + ' REV · ' + (sec ? fmtSec(sec) + ' de estudo' : 'ainda não estudado') + ' ' + ui.btn('Abrir', ui.act('open-map', key), 'sm');
  }

  /* ---------- 2 · TODOS ---------- */
  function screenTodos() {
    const S = P.courses.active(), all = S.flatMap((s) => s.maps), gp = P.data.agg(all);
    if (!S.length) return ui.card(ui.empty('Nenhum concurso ativo', 'Crie um concurso para organizar os mapas do edital.', ui.btn('Novo concurso', ui.act('new-course'), 'p')));
    const fut = S.filter((s) => s.exam.phase === 'before' || s.exam.phase === 'today');
    const risk = S.filter((s) => s.health?.status === 'risk'), q = P.reviews.queue(), qCount = q.reduce((s, x) => s + x.count, 0);
    const goals = P.time.goals(), week = P.time.week();
    const segs = S.map((s) => [s.sigla, s.progress.marked, s.color]).concat([['pend', Math.max(0, gp.total - gp.marked), 'var(--pr-g3)']]);
    const others = S.filter((s) => s !== risk[0]);
    let v;
    if (risk.length === 1) v = ui.verdict('', 'Só o ' + esc(risk[0].sigla) + ' pede atenção agora.', (risk[0].exam.days !== null && risk[0].exam.days >= 0 ? 'Prova em ' + risk[0].exam.days + ' ' + plural(risk[0].exam.days, 'dia') + ' com ' + fmtNum(risk[0].progress.total - risk[0].progress.marked) + ' tópicos abertos. ' : '') + (others.length ? others.map((s) => esc(s.sigla) + ': ' + esc((s.health?.label || '').toLowerCase() || 'sem dados')).join(' · ') + '.' : ''));
    else if (risk.length > 1) v = ui.verdict('', risk.length + ' concursos em risco.', risk.map((s) => esc(s.sigla) + ' (' + esc(s.health.message) + ')').join(' '));
    else v = ui.verdict('m', 'Nenhum concurso em risco.', fut.length ? 'A próxima prova é ' + esc(fut[0].sigla) + ', em ' + fut[0].exam.days + ' ' + plural(fut[0].exam.days, 'dia') + '.' : 'Nenhum concurso tem data de prova futura.');
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">Todos os concursos · ' + S.length + ' ' + plural(S.length, 'concurso') + ' · ' + all.length + ' mapas</span><div class="pr-big"><span class="pr-pct pr-num">' + pct(gp.marked, gp.total) + '<small>%</small></span><span class="pr-sub">' + fmtNum(gp.marked) + ' de ' + fmtNum(gp.total) + ' tópicos estudados</span></div>' + ui.states(segs, 'Tópicos estudados por concurso') + ui.legend(S.map((s) => [s.sigla, fmtNum(s.progress.marked) + '/' + fmtNum(s.progress.total), s.color])) + v + '</div><div class="pr-c-b">' +
      ui.cell('Próxima prova', fut[0] ? (fut[0].exam.days === 0 ? 'hoje' : fut[0].exam.days + ' ' + plural(fut[0].exam.days, 'dia')) : '—', fut[0] && fut[0].exam.days <= 7 ? 'ox' : '', fut[0] ? esc(fut[0].sigla + ' · ' + fmtDay(fut[0].exam.date)) : 'sem data marcada') +
      ui.cell('Depois', fut[1] ? fut[1].exam.days + ' ' + plural(fut[1].exam.days, 'dia') : '—', '', fut[1] ? esc(fut[1].sigla + ' · ' + U.fmtDayYear(fut[1].exam.date)) : 'nenhuma outra prova') +
      ui.cell('Em risco', risk.length, risk.length ? 'ox' : 'ok', 'de ' + S.length + ' ' + plural(S.length, 'concurso')) +
      ui.cell('Restam', fmtNum(gp.total - gp.marked), '', 'tópicos ' + (S.length > 1 ? 'nos ' + S.length : 'no concurso')) +
      ui.cell('Semana', fmtSec(week) + ' / ' + fmtMin(goals.weekly), '', 'meta única para todos') +
      ui.cell('A revisar', fmtNum(qCount), qCount ? 'l' : 'mu', 'em ' + q.length + ' ' + plural(q.length, 'mapa')) + '</div></section>';
    /* linha do tempo das provas */
    const dated = S.filter((s) => s.exam.date && s.exam.days >= 0);
    let tl;
    if (dated.length) {
      const t0 = U.startDay(), end = U.addDays(dated[dated.length - 1].exam.date, Math.max(7, Math.round(dated[dated.length - 1].exam.days * 0.08)));
      const span = Math.max(1, U.daysBetween(t0, end)), x = (d) => Math.max(0, Math.min(100, (U.daysBetween(t0, d) / span) * 100));
      let months = '';
      for (let d = new Date(t0.getFullYear(), t0.getMonth() + 1, 1); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months += '<span class="mo" style="left:' + x(d) + '%">' + U.MESES[d.getMonth()] + (d.getMonth() === 0 ? ' ' + d.getFullYear() : '') + '</span>';
      const marks = '<div class="mk hoje" style="left:0%"><b>HOJE</b><span>' + fmtDay(t0) + '</span><i></i></div>' + dated.map((s, i) => '<div class="mk' + (i % 2 ? ' lo' : '') + '" style="left:' + x(s.exam.date) + '%;--c:' + s.color + '"><b>' + esc(s.sigla) + '</b><span>' + esc(U.fmtDayYear(s.exam.date)) + '</span><i></i></div>').join('');
      const runs = dated.map((s) => '<span class="run" style="left:0;width:' + x(s.exam.date) + '%;background:color-mix(in srgb,' + s.color + ' 30%,transparent)"></span>').reverse().join('');
      const nodate = S.filter((s) => !s.exam.date).map((s) => s.sigla);
      tl = ui.card(ui.head('Linha do tempo das provas', esc(U.MESES_LONGOS[t0.getMonth()] + ' de ' + t0.getFullYear() + ' a ' + U.MESES_LONGOS[end.getMonth()] + ' de ' + end.getFullYear()), nodate.length ? '<span class="pr-mono">' + esc(nodate.join(', ')) + ' sem data fica' + (nodate.length > 1 ? 'm' : '') + ' fora da linha</span>' : '') + '<div class="pr-tl" role="img" aria-label="Linha do tempo das provas"><div class="ax"></div>' + runs + months + marks + '</div>');
    } else tl = ui.card(ui.head('Linha do tempo das provas', 'Nenhuma prova futura marcada') + '<p>Defina a data da prova em cada concurso para vê-las na linha do tempo.</p>');
    const rows = S.map((s) => '<div class="pr-crow" style="--c:' + s.color + '"><div class="id"><b>' + esc(s.sigla) + '</b><span class="pr-mono">' + esc(s.course.title) + '</span><span class="pr-mono">' + esc(P.courses.label(s.course)) + '</span></div>' + ui.mini(s.maps) + '<div class="pr-sd"><span class="pr-chip ' + (s.health?.status === 'risk' ? 'ox' : s.health?.status === 'healthy' ? 'ok' : s.exam.date ? 'l' : '') + '">' + esc(s.exam.date ? (s.exam.days > 0 ? 'prova em ' + s.exam.days + ' d' : s.exam.days === 0 ? 'prova hoje' : 'prova realizada') : 'sem data') + '</span><span class="pr-mono">' + pct(s.progress.marked, s.progress.total) + '% · ' + fmtNum(s.progress.marked) + '/' + fmtNum(s.progress.total) + '</span>' + ui.btn('Entrar', ui.act('open-course', s.id), 'sm') + '</div></div>').join('');
    return carimbo + tl + ui.card(ui.head('Planta dos concursos', 'Um lote por mapa, na largura dos seus tópicos', ui.btn('+ Novo concurso', ui.act('new-course'), 'g sm')) + '<div>' + rows + '</div>');
  }

  /* ---------- 3 · REVISÕES ---------- */
  function screenRev() {
    const q = P.reviews.queue(), total = q.reduce((s, x) => s + x.count, 0), minutes = q.reduce((s, x) => s + x.minutes, 0);
    const cal = P.reviews.calendar(7), byCourse = new Map();
    q.forEach((r) => { const id = String(r.map.courseId); const row = byCourse.get(id) || { course: r.course, count: 0, minutes: 0 }; row.count += r.count; row.minutes += r.minutes; byCourse.set(id, row); });
    const groups = [...byCourse.values()];
    const planner = window.StudyPlanner?.exportData?.() || { topicReviews: {} }, todayK = U.dateKey();
    const doneToday = Object.values(planner.topicReviews || {}).filter((r) => r?.lastReviewedAt && U.dateKey(new Date(r.lastReviewedAt)) === todayK).length + Object.values((typeof readReviewSchedule === 'function' ? readReviewSchedule() : {})).filter((r) => r?.lastReviewedAt && U.dateKey(new Date(r.lastReviewedAt)) === todayK).length;
    const overdue = q.filter((r) => r.overdueDays > 0).length;
    const first = groups.slice().sort((a, b) => ((a.course && P.courses.examState(a.course).days) ?? 1e6) - ((b.course && P.courses.examState(b.course).days) ?? 1e6))[0];
    const firstEx = first?.course ? P.courses.examState(first.course) : null;
    const examToday = P.courses.active().some((s) => s.exam.phase === 'today');
    let v;
    if (!total) v = ui.verdict('m', 'Nenhuma revisão vencida.', cal[1]?.count ? 'Amanhã vencem ' + cal[1].count + '.' : 'A fila está zerada.');
    else v = ui.verdict('l', 'A fila toda leva cerca de ' + fmtMin(minutes) + '.', (first && firstEx && firstEx.days !== null && firstEx.days >= 0 && groups.length > 1 ? 'Com a prova de ' + esc(P.courses.sigla(first.course)) + ' em ' + firstEx.days + ' ' + plural(firstEx.days, 'dia') + ', os ' + first.count + ' itens dele vêm primeiro (' + fmtMin(first.minutes) + ').' : '') + ' Estimativa: tempo médio por tópico registrado em cada mapa; sem histórico, 50 s por tópico.');
    const firstMap = q[0];
    const guidedN = window.StudyFlow?.guided?.count?.() || 0;
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">Revisões de hoje · revisão por tópico e por mapa</span><div class="pr-big"><span class="pr-pct pr-num' + (total ? '' : ' ok') + '">' + fmtNum(total) + '</span><span class="pr-sub">' + plural(total, 'revisão vencida', 'revisões vencidas') + ' · em ' + q.length + ' ' + plural(q.length, 'mapa') + '</span></div>' +
      ui.states(groups.map((g) => [P.courses.sigla(g.course), g.count, g.course ? P.courses.color(g.course) : 'var(--pr-latao)']), 'Revisões vencidas por concurso') + ui.legend(groups.map((g) => [P.courses.sigla(g.course), g.count, g.course ? P.courses.color(g.course) : 'var(--pr-latao)'])) + v +
      '<div class="pr-row">' + (total ? ui.btn('Revisar ' + esc(firstMap.map.code || '') + ' · ' + fmtMin(firstMap.minutes), ui.act('open-map', firstMap.key), 'p') + ui.btn('Fila inteira', ui.act('review-queue'), 'g') + (window.StudyPlanner?.showTopicReview ? ui.btn('Revisão por tópico', ui.act('topic-review'), 'g') : '') : '') + (guidedN ? ui.btn('Revisão guiada no leitor · ' + guidedN, ui.act('guided-review'), total ? 'g' : 'p') : '') + (examToday ? ui.btn('Adiar revisões do dia da prova', ui.act('postpone-exam'), 'g') : '') + '</div></div><div class="pr-c-b">' +
      ui.cell('Vencidas', fmtNum(total), total ? 'l' : 'ok', 'hoje, ' + fmtDay(new Date())) + ui.cell('Feitas hoje', doneToday, doneToday ? 'ok' : '', 'tópicos e mapas avaliados') +
      ui.cell('Tempo', total ? '~' + fmtMin(minutes) : '—', '', 'estimativa pela fila') + ui.cell('Mapas', q.length, '', groups.length > 1 ? groups.map((g) => g.count + ' ' + esc(P.courses.sigla(g.course))).join(' · ') : '') +
      ui.cell('Atrasadas', overdue, overdue ? 'ox' : 'ok', overdue ? 'mapas com revisão de dias anteriores' : 'nada de dias anteriores') + ui.cell('Amanhã', cal[1]?.count ?? 0, '', 'já agendadas') + '</div></section>';
    const fila = q.length ? '<div class="pr-list">' + q.map((r, i) => '<div class="pr-pi" style="--c:' + P.mapColor(r.map) + '"><span class="n">' + (i + 1) + '</span><span><b>' + esc((r.map.code ? r.map.code + ' · ' : '') + r.map.title) + '</b><small>' + esc([r.topics ? r.topics + ' ' + plural(r.topics, 'tópico') : '', r.mapDue ? 'revisão do mapa' : '', r.overdueDays ? 'atrasada ' + r.overdueDays + ' d' : '', r.examDays !== null && r.examDays >= 0 ? 'prova em ' + r.examDays + ' d' : ''].filter(Boolean).join(' · ')) + '</small></span><span class="pr-mono" title="' + esc('base: ' + r.estimatedBasis) + '">~' + fmtMin(r.minutes) + '</span>' + ui.btn('Revisar', ui.act('open-map', r.key), 'sm') + '</div>').join('') + '</div>' : ui.empty('Fila vazia', 'Quando um mapa ou tópico vencer, ele entra aqui na ordem: prova mais perto primeiro, depois o mapa com mais itens.');
    const maxN = Math.max(1, ...cal.map((d) => d.count));
    const rcal = '<div class="pr-rcal" role="img" aria-label="Revisões nos próximos 7 dias">' + cal.map((d, i) => '<div><b class="pr-num">' + d.count + '</b><span class="b' + (i === 0 ? ' today' : '') + (d.exam ? ' pv' : '') + '" style="height:' + Math.max(d.exam ? 12 : 2, (d.count / maxN) * 110) + 'px"></span><span>' + (i === 0 ? 'hoje' : U.DSEM[d.date.getDay()].toLowerCase()) + '<br>' + d.date.getDate() + (d.exam ? '<br>prova' : '') + '</span></div>').join('') + '</div>';
    const examIn = cal.find((d) => d.exam);
    const calNote = examIn && examIn.count ? '<p style="font-size:var(--fs-body-sm)">No dia da prova (' + esc(fmtLong(examIn.date)) + ') as revisões podem ser adiadas para o dia seguinte, sem excluir nenhuma.</p>' + ui.btn('Adiar revisões do dia da prova', ui.act('postpone-exam'), 'g sm') : '<p style="font-size:var(--fs-body-sm)">' + (examIn ? 'Nenhuma revisão cai no dia da prova (' + esc(fmtLong(examIn.date)) + '). ' : '') + 'Contagem pelo agendamento atual de cada mapa e tópico.</p>';
    const next = q[1] || q[0];
    const rban = next ? ui.card(ui.head('No leitor', 'A faixa que leva de um mapa ao próximo', '<span class="pr-mono">aparece ao concluir cada mapa da fila</span>') + '<div class="pr-li" style="--c:' + P.mapColor(next.map) + '"><span class="pr-sig">' + esc(next.map.code || '') + '</span><span><b style="font-size:var(--fs-body-sm)">Próximo na fila: ' + esc(next.map.title) + '</b><br><span class="t">' + next.count + ' ' + plural(next.count, 'item', 'itens') + ' · ~' + fmtMin(next.minutes) + ' · ' + (q.indexOf(next) + 1) + ' de ' + q.length + ' mapas</span></span>' + ui.btn('Ir para ' + esc(next.map.code || 'o mapa'), ui.act('open-map', next.key), 'sm') + '</div>') : '';
    return carimbo + '<div class="pr-side2">' + ui.card(ui.head('Fila em ordem', 'Prova mais perto primeiro, depois o mapa com mais itens') + fila) + ui.card('<span class="pr-k">Próximos 7 dias</span>' + rcal + calNote) + '</div>' + rban;
  }

  /* ---------- 4 · EM SESSÃO ---------- */
  function topicsHtml(map, limit = 8) {
    if (!map) return '';
    const st = (typeof readMapState === 'function' ? readMapState(map).topicStates : null) || {};
    const key = P.data.keyOf(map);
    const idx = ((typeof state !== 'undefined' && state.searchIndex?.items) || []).filter((it) => it.mapKey === key || String(it.mapCode || '').toLowerCase() === String(map.code || '').toLowerCase()).filter((it) => it.topicId);
    if (!idx.length) return '<p class="pr-mono">Lista de tópicos indisponível para este mapa; o progresso aparece no carimbo.</p>';
    const pending = idx.filter((it) => !st[it.topicId]), marked = idx.filter((it) => st[it.topicId]);
    const list = [...marked.slice(-3), ...pending].slice(0, limit);
    return '<div class="pr-tops">' + list.map((it) => { const s = st[it.topicId]; return '<div class="' + (s === 'done' ? 'ok' : s === 'review' ? 'rv' : s === 'difficult' ? 'df' : '') + '"><i></i><span>' + esc(it.title || it.label || it.topicId) + '</span><span class="pr-mono">' + (s === 'done' ? 'OK' : s === 'review' ? 'REV' : s === 'difficult' ? 'DIF' : '') + '</span></div>'; }).join('') + '</div>';
  }
  function screenSessao() {
    const s = P.session.read(), goals = P.time.goals();
    if (!s) {
      const items = planItems(), first = items.find((x) => !x.done);
      return '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">Em sessão · nenhuma sessão ativa</span><div class="pr-big"><span class="pr-tmr paused pr-num">00:00</span></div>' + ui.verdict('n', 'O cronômetro está parado.', 'Ao iniciar uma sessão, o tempo é registrado no mapa e na meta do dia; a Home passa a mostrar esta tela.') + '<div class="pr-ctl">' + (first ? ui.btn('Começar o 1º bloco · ' + esc(first.code), ui.act(first.kind === 'agenda' ? 'start-agenda' : 'start-plan', first.kind === 'agenda' ? first.id : first.key, { 'data-min': first.minutes }), 'p') : '') + ui.btn('Sessão livre', ui.act('start-free'), first ? 'g' : 'p') + ui.btn('Pomodoro · ' + fmtMin(goals.pomodoroWork), ui.act('start-pomodoro'), 'g') + '</div></div><div class="pr-c-b">' + ui.cell('Meta de hoje', fmtSec(P.time.today()) + ' / ' + fmtMin(goals.daily), '', '') + ui.cell('Semana', fmtSec(P.time.week()) + ' / ' + fmtMin(goals.weekly), '', '') + '</div></section>';
    }
    const a = s.active, map = s.map, p = s.progress, sp = s.startProgress;
    const target = s.target, elapsed = s.elapsed;
    const items = planItems(), idx = items.findIndex((x) => x.key && x.key === a.mapKey), next = items.filter((x) => !x.done && x.key !== a.mapKey)[0];
    const modeLabel = a.mode === 'pomodoro' ? 'pomodoro' : a.mode === 'planned' ? 'sessão planejada' : 'sessão livre';
    const deltaMarked = p && sp ? Math.max(0, p.marked - (sp.marked || 0)) : 0, deltaRev = p && sp ? Math.max(0, (p.review || 0) - (sp.review || 0)) : 0;
    const ends = target ? new Date(Date.now() + Math.max(0, target - elapsed) * 1000) : null;
    let v;
    if (!s.running) v = ui.verdict('l', 'Sessão pausada.', 'O tempo só volta a contar quando você retomar.');
    else if (deltaMarked) v = ui.verdict('m', 'No ritmo: ' + deltaMarked + ' ' + plural(deltaMarked, 'tópico marcado', 'tópicos marcados') + ' em ' + fmtSec(elapsed) + '.', next ? 'Depois vem ' + esc(next.code) + ', ' + fmtMin(next.minutes) + '.' : '');
    else v = ui.verdict('n', 'Sessão em andamento.', 'Os tópicos marcados no leitor aparecem aqui.' + (next ? ' Depois vem ' + esc(next.code) + ', ' + fmtMin(next.minutes) + '.' : ''));
    const openDoubts = P.doubts.list().filter((d) => d.mapKey && d.mapKey === a.mapKey).length;
    const clock = '<span class="pr-tmr pr-num' + (s.running ? '' : ' paused') + '" data-pr-clock>' + U.fmtClock(target ? Math.max(0, target - elapsed) : elapsed) + (target ? '<small> / ' + U.fmtClock(target) + '</small>' : '') + '</span>';
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc('Em sessão · ' + (map?.code || a.label || 'Estudo') + ' · ' + modeLabel + (idx >= 0 ? ' · bloco ' + (idx + 1) + ' de ' + items.length : '')) + '</span><div class="pr-big">' + clock + '</div>' +
      (target ? ui.states([['decorrido', Math.min(elapsed, target), 'var(--pr-latao)'], ['restante', Math.max(0, target - elapsed), 'var(--pr-g3)']], 'Sessão: ' + pct(elapsed, target) + '% do tempo') : '') +
      ui.legend([['Decorrido', '<span data-pr-elapsed>' + fmtSec(elapsed) + '</span>', 'var(--pr-latao)']].concat(target ? [['Restante', fmtSec(Math.max(0, target - elapsed)), 'var(--pr-g3)', true], ['Termina', ends.toTimeString().slice(0, 5), 'transparent']] : [])) + v +
      '<div class="pr-ctl">' + ui.btn(s.running ? 'Pausar' : 'Retomar', ui.act('timer-toggle'), 'p') + ui.btn('Modo foco', ui.act('timer-focus'), 'g') + (a.mapKey ? ui.btn('Abrir o mapa', ui.act('open-map', a.mapKey), 'g') : '') + ui.btn('Finalizar', ui.act('timer-finish'), 'd') + '</div></div><div class="pr-c-b">' +
      ui.cell('Meta de hoje', fmtSec(P.time.today()) + ' / ' + fmtMin(goals.daily), 'l', 'contando esta sessão') +
      ui.cell(a.mode === 'pomodoro' ? 'Pomodoro' : 'Alvo', target ? fmtSec(target) : 'livre', '', a.mode === 'pomodoro' ? 'pausa de ' + fmtMin(goals.pomodoroBreak) + ' ao fim' : target ? 'tempo planejado' : 'sem tempo-alvo') +
      ui.cell('Nesta sessão', deltaMarked, deltaMarked ? 'ok' : '', 'tópicos marcados') + ui.cell('Marcados REV', deltaRev, deltaRev ? 'l' : '', 'voltam na revisão') +
      ui.cell('Dúvidas', openDoubts, '', 'abertas neste mapa') + ui.cell('Depois', next ? esc(next.code) : '—', '', next ? fmtMin(next.minutes) + (next.kind === 'agenda' ? ' · agenda' : ' · plano') : 'nada planejado') + '</div></section>';
    const mapCard = map ? ui.card(ui.head('Mapa aberto', esc(map.title), '<span class="pr-mono">' + p.marked + '/' + p.total + ' tópicos</span>') + '<div class="pr-now">' + ui.mapCov(map) + topicsHtml(map) + '</div>') : ui.card(ui.head('Sessão geral', 'Sem mapa vinculado') + '<p>O tempo entra na meta do dia. Abra um mapa para registrar o tempo nele.</p>');
    const plano = ui.card(ui.head('Plano do dia', idx >= 0 ? 'Bloco ' + (idx + 1) + ' de ' + items.length + ' em curso' : items.length + ' ' + plural(items.length, 'bloco')) + dayline(items, a.mapKey) + planList(items, a.mapKey));
    return carimbo + '<div class="pr-two">' + mapCard + plano + '</div>' + ui.card('<span class="pr-k">O resto da Home fica em espera</span><p style="font-size:var(--fs-body-sm)">Planta, simulados e cursos voltam ao finalizar a sessão. ' + '</p><div class="pr-row">' + ui.btn('Ver Início completo', ui.act('screen', 'hoje'), 'g sm') + '</div>');
  }

  /* ---------- 5 · PÓS-PROVA ---------- */
  const { fmtPts, elimText, gabForm: gabFormProva, gabCard } = ui;
  /* V15.57 · próximo marco do cronograma (gabarito, recursos, resultado, convocação) */
  function marcoCard(c) {
    const fases = P.editais.fases(c), next = P.editais.proximoMarco(c);
    if (!fases.some((f) => f.date && f.id !== 'prova')) return ui.card(ui.head('Próximo marco', 'Cronograma não informado') + '<p class="pr-detail">Informe as datas de gabarito, recursos e resultado na Régua do edital do curso para acompanhar os prazos depois da prova.</p>' + ui.btn('Abrir curso', ui.act('open-course', c.id), 'g sm'));
    const prazo = next && /recursos|convocacao/.test(next.id);
    const lst = '<div class="pr-list">' + fases.filter((f) => f.date || f.status !== 'futura').map((f) => '<div class="pr-li"><span class="pr-chip ' + (f.status === 'futura' ? '' : 'ok') + '">' + (f.status === 'futura' ? (f.days === 0 ? 'hoje' : f.days + ' d') : 'feito') + '</span><span><b>' + esc(f.label) + '</b><br><span class="t">' + (f.date ? esc(fmtLong(f.date)) : 'sem data') + '</span></span><span></span></div>').join('') + '</div>';
    const big = next ? '<div class="pr-big"><span class="pr-pct pr-num' + (prazo && next.days <= 3 ? ' ox' : '') + '">' + next.days + '<small> ' + plural(next.days, 'dia') + '</small></span><span class="pr-sub">' + esc(next.label.toLowerCase()) + ' · ' + esc(fmtDay(next.date)) + '</span></div>' : '<p class="pr-detail">Todas as fases com data já passaram.</p>';
    return ui.card(ui.head('Próximo marco · ' + P.courses.sigla(c), next ? esc(next.label) : 'Cronograma concluído', ui.btn('Cronograma', ui.act('open-course', c.id), 'g sm'), 'l') + big + (prazo ? ui.verdict('', esc(next.label) + ' é um prazo.', 'Depois da data não há como recorrer ou entregar documentos.') : '') + lst);
  }
  function marcoAviso() {
    const out = [];
    for (const c of P.courses.list()) { if (P.courses.isArchived(c)) continue; const m = P.editais.proximoMarco(c); if (m && m.days <= 7) out.push(P.courses.sigla(c) + ': ' + m.label.toLowerCase() + (m.days === 0 ? ' hoje' : ' em ' + m.days + ' ' + plural(m.days, 'dia'))); }
    return out.length ? ' Marcos próximos: ' + out.join(' · ') + '.' : '';
  }
  function screenPos() {
    const s = P.courses.postExam();
    if (!s) return ui.card(ui.empty('Nenhuma prova recém-realizada', 'Esta tela aparece sozinha no dia seguinte à data da prova de um concurso ativo.'));
    const c = s.course, cl = s.exam.closure || {}, p = s.progress;
    const next = P.courses.priority();
    const steps = [true, !!cl.gabarito, !!cl.doubtsAt, P.courses.isArchived(c)];
    const doneSteps = steps.filter(Boolean).length;
    const openD = P.doubts.list().filter((d) => String(d.courseId) === String(c.id) || (d.mapKey && typeof mapById === 'function' && mapById(d.mapKey)?.courseId === c.id));
    const cut = P.sims.cutoff(c.id);
    const gab = cl.gabarito ? pct(cl.gabarito.correct, cl.gabarito.total) : null;
    /* V15.56 · com a estrutura da prova, o gabarito é por disciplina: acertos × peso contra cada mínimo */
    const prova = P.editais.prova(c.id);
    const gp = prova.length && cl.gabarito?.porDisciplina ? P.editais.pontuar(c.id, Object.fromEntries(Object.entries(cl.gabarito.porDisciplina).map(([k, v]) => [k, v.acertos]))) : null;
    let pace = null;
    if (next) { const rest = Math.max(0, next.progress.total - next.progress.marked), days = Math.max(1, next.exam.days); pace = { perDay: rest / days, minutes: next.forecast?.secondsPerTopic ? (rest / days) * next.forecast.secondsPerTopic / 60 : null, rest, days }; }
    const common = P.links.common().filter((g) => g.some((m) => String(m.courseId) === String(c.id)) && next && g.some((m) => String(m.courseId) === String(next.id)));
    const qOthers = P.reviews.queue().filter((r) => String(r.map.courseId) !== String(c.id)).reduce((x, r) => x + r.count, 0);
    const v = next ? ui.verdict('l', 'Feche o ' + esc(s.sigla) + ' e passe o plano para o ' + esc(next.sigla) + '.', 'São ' + fmtNum(pace.rest) + ' tópicos em ' + pace.days + ' ' + plural(pace.days, 'dia') + ': ' + (pace.perDay < 1 ? 'menos de 1' : Math.ceil(pace.perDay)) + ' por dia' + (pace.minutes ? ', cerca de ' + fmtMin(pace.minutes) : '') + '.') : ui.verdict('n', 'Feche o ' + esc(s.sigla) + '.', 'Nenhum outro concurso tem prova marcada; defina a próxima data para o plano recalcular.');
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc('Pós-prova · ' + s.sigla + ' · prova feita ' + fmtLong(s.exam.date)) + '</span><div class="pr-big">' + (next ? '<span class="pr-pct pa pr-num">' + next.exam.days + '<small> ' + plural(next.exam.days, 'dia') + '</small></span><span class="pr-sub">até a próxima prova · ' + esc(next.sigla + ' · ' + U.fmtDayYear(next.exam.date)) + '</span>' : '<span class="pr-pct pa" style="font-size:clamp(40px,6vw,64px)">Sem data</span><span class="pr-sub">nenhuma prova futura marcada</span>') + '</div>' +
      ui.states([['feito', doneSteps, 'var(--pr-musgo)'], ['falta', 4 - doneSteps, 'var(--pr-g3)']], 'Fechamento: ' + doneSteps + ' de 4 passos') + ui.legend([['Fechamento', doneSteps + ' de 4 passos', 'var(--pr-musgo)']]) + v +
      '<div class="pr-row">' + (cl.gabarito ? '' : ui.btn('Registrar meu gabarito', ui.act('focus-gabarito'), 'p')) + ui.btn('Arquivar ' + esc(s.sigla), ui.act('archive-course', c.id), cl.gabarito ? 'p' : 'g') + ui.btn('Manter ativo', ui.act('dismiss-post', c.id), 'g') + '</div></div><div class="pr-c-b">' +
      ui.cell(s.sigla, pct(p.marked, p.total) + '%', '', fmtNum(p.marked) + '/' + fmtNum(p.total) + ' até a prova') +
      (gp ? ui.cell('Gabarito', fmtPts(gp.pontos) + ' pts', gp.aprovado ? 'ok' : 'ox', gp.aprovado ? 'de ' + fmtPts(gp.max) + ' · aprovado no total e em cada disciplina' : 'de ' + fmtPts(gp.max) + ' · ' + esc(elimText(gp))) :
      ui.cell('Gabarito', gab !== null ? gab + '%' : '—', gab !== null && cut ? (gab >= cut.value ? 'ok' : 'ox') : '', gab !== null ? cl.gabarito.correct + ' de ' + cl.gabarito.total + (cut ? ' · corte ' + cut.value + '% (' + cut.kind + ')' : '') : 'ainda não registrado')) +
      ui.cell('Próximo', next ? esc(next.sigla) : '—', '', next ? esc((next.health?.label || '').toLowerCase()) + ' · ' + next.progress.marked + '/' + next.progress.total : 'sem data') +
      ui.cell('Ritmo novo', pace ? (pace.perDay < 1 ? '<1' : Math.ceil(pace.perDay)) + '/dia' : '—', 'l', pace?.minutes ? '~' + fmtMin(pace.minutes) + ' por dia' : 'tópicos por dia') +
      ui.cell('Mapas em comum', common.length, '', common.length ? esc(common.map((g) => g[0].code).slice(0, 3).join(', ')) : 'nenhum conteúdo repetido') +
      ui.cell('Revisões', fmtNum(qOthers), '', 'dos outros concursos') + '</div></section>';
    const gabForm = gp ? '<span class="pr-mono">' + fmtPts(gp.pontos) + ' pts · ' + gp.corretas + ' de ' + gp.questoes + ' acertos' + '</span>' : cl.gabarito ? '<span class="pr-mono">' + cl.gabarito.correct + ' de ' + cl.gabarito.total + ' · ' + gab + '%</span>' : prova.length ? gabFormProva(c, prova) : '<form data-pr-submit="save-gabarito" data-course="' + esc(c.id) + '" class="pr-row" style="gap:6px"><label class="pr-field"><span>Acertos</span><input name="correct" type="number" min="0" inputmode="numeric" required style="width:90px"></label><label class="pr-field"><span>de</span><input name="total" type="number" min="1" inputmode="numeric" required style="width:90px" value="' + esc(P.sims.summary(c.id).list[0]?.sim.questions || '') + '"></label><button type="submit" class="pr-btn sm">Registrar</button></form>';
    const chk = '<div class="pr-chk">' +
      '<div class="ok"><span class="n">✓</span><span><b>Prova feita</b><small>' + esc(fmtLong(s.exam.date)) + ' · marcada pela data do curso</small></span><span class="pr-mono">feito</span></div>' +
      '<div class="' + (steps[1] ? 'ok' : '') + '" data-pr-gabarito><span class="n">' + (steps[1] ? '✓' : 2) + '</span><span><b>Registrar o gabarito</b><small>Seus acertos contra o gabarito preliminar dão a nota estimada' + (cut ? ' e a comparação com o corte' : '') + '</small></span>' + gabForm + '</div>' +
      '<div class="' + (steps[2] ? 'ok' : '') + '"><span class="n">' + (steps[2] ? '✓' : 3) + '</span><span><b>Guardar as dúvidas abertas</b><small>' + openD.length + ' ' + plural(openD.length, 'dúvida aberta', 'dúvidas abertas') + ' deste curso; ficam guardadas no histórico, nada é apagado</small></span>' + (steps[2] ? '<span class="pr-mono">feito</span>' : '<span class="pr-row">' + ui.btn('Ver', ui.act('nav', 'progress'), 'g sm') + ui.btn('Concluir', ui.act('close-doubts', c.id), 'sm') + '</span>') + '</div>' +
      '<div class="' + (steps[3] ? 'ok' : '') + '"><span class="n">' + (steps[3] ? '✓' : 4) + '</span><span><b>Arquivar o curso</b><small>Sai da Home e das prioridades; mapas, progresso e histórico continuam na biblioteca e o curso pode ser reativado em Cursos</small></span>' + ui.btn('Arquivar', ui.act('archive-course', c.id), 'g sm') + '</div></div>';
    let nextCard;
    if (next) {
      const weeks = Math.max(1, Math.min(52, Math.ceil(next.exam.days / 7))), studied = Math.round((next.progress.marked / Math.max(1, next.progress.total)) * weeks);
      nextCard = ui.card(ui.head('Próximo concurso · ' + next.sigla, fmtNum(pace.rest) + ' tópicos em ' + next.exam.days + ' ' + plural(next.exam.days, 'dia'), '<span class="pr-chip ' + (next.health?.status === 'risk' ? 'ox' : next.health?.status === 'healthy' ? 'ok' : 'l') + '">' + esc((next.health?.label || 'sem dados').toLowerCase()) + '</span>') +
        '<div class="pr-pace" style="--n:' + weeks + ';--c:' + next.color + '" role="img" aria-label="' + weeks + ' semanas até a prova">' + Array.from({ length: weeks }, (_, i) => '<i class="' + (i < studied ? 'f' : i === studied ? 'h' : '') + '"></i>').join('') + '</div>' +
        ui.legend([['proporção já estudada', '', 'color-mix(in srgb,' + next.color + ' 60%,transparent)'], ['esta semana', '', 'var(--pr-latao)'], ['semanas à frente', '', 'var(--pr-g3)', true]]) + '<p style="font-size:var(--fs-body-sm)">Cada célula é uma semana até ' + esc(U.fmtDayYear(next.exam.date)) + '.</p>' + ui.btn('Trazer ' + esc(next.sigla) + ' para o plano', ui.act('plan-next', next.id), ''));
    } else nextCard = ui.card(ui.head('Próximo concurso', 'Nenhum com prova marcada') + '<p>Defina a data da prova de outro concurso para o plano recomeçar.</p>' + ui.btn('Ver cursos', ui.act('nav', 'courses'), 'g sm'));
    return carimbo + (gp ? gabCard(gp, s.sigla) : '') + marcoCard(c) + '<div class="pr-two">' + ui.card(ui.head('Fechar o ' + s.sigla, 'Quatro passos, nesta ordem') + chk) + nextCard + '</div>' + ui.card(ui.head('Planta final · ' + s.sigla, 'Como o edital ficou no dia da prova', '<span class="pr-mono">fica guardada no curso</span>') + ui.tiles(s.maps, { cls: 'sm' }));
  }

  /* ---------- 6 · ENTRE CONCURSOS (V15.57) ---------- */
  function screenEntre() {
    const list = entreMaps();
    if (!list.length) return ui.card(ui.empty('Nada guardado para manutenção', 'Os mapas portáteis de concursos encerrados aparecem aqui.'));
    const all = P.data.allMaps(), locals = all.filter((m) => P.editais.alcance(m) === 'local' && window.StudyScope?.mapRetired?.(m));
    const rows = list.map((m) => ({ m, p: P.data.prog(m), k: P.data.keyOf(m) }));
    const keys = new Set(rows.map((r) => r.k));
    let due = 0; try { due = (window.StudyPlanner?.dueTopics?.('', new Date()) || []).filter((t) => keys.has(String(t.mapKey || P.data.keyOf(t.map)))).length; } catch {}
    const ag = P.data.agg(list), fix = ag.review + ag.difficult, meta = Number(P.prefs.get('metaEntre')) || 40;
    const retired = P.courses.retired(), last = retired.map((x) => x.exam.date).filter(Boolean).sort((a, b) => b - a)[0];
    rows.sort((a, b) => (b.p.review + b.p.difficult) - (a.p.review + a.p.difficult) || U.pct(a.p.marked, a.p.total) - U.pct(b.p.marked, b.p.total));
    const first = rows[0];
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc('Entre concursos' + (last ? ' · desde ' + fmtDay(U.addDays(last, 1)) : '')) + '</span><div class="pr-big"><span class="pr-pct pr-num">' + fmtNum(ag.total) + '</span><span class="pr-sub">tópicos portáteis guardados em ' + list.length + ' ' + plural(list.length, 'mapa') + '</span></div>' + ui.stateBar(ag, 'Mapas portáteis por estado') + ui.stateLegend(ag) +
      ui.verdict('l', 'Ritmo de manutenção: ' + fmtMin(meta) + ' por dia.', 'Revise os mapas que servem em qualquer edital; os ' + locals.length + ' ' + plural(locals.length, 'mapa local', 'mapas locais') + ' ficam guardados até outro concurso do mesmo órgão.') +
      '<div class="pr-row">' + ui.btn('Revisar ' + esc(first.m.code || '') + ' · ' + fmtMin(Math.min(meta, 40)), ui.act('start-plan', first.k, { 'data-min': Math.min(meta, 40) }), 'p') + ui.btn('+ Novo concurso', ui.act('new-course'), 'g') + '</div></div><div class="pr-c-b">' +
      ui.cell('Mapas portáteis', list.length, '', fmtNum(ag.marked) + ' de ' + fmtNum(ag.total) + ' tópicos marcados') + ui.cell('Para firmar', fmtNum(fix), fix ? 'l' : 'ok', ag.review + ' REV · ' + ag.difficult + ' DIF') +
      ui.cell('Revisões vencidas', fmtNum(due), due ? 'l' : 'ok', 'nos mapas portáteis') + ui.cell('Meta de manutenção', fmtMin(meta), '', 'ajuste em Configurações · folha 08') +
      ui.cell('Hoje', fmtSec(P.time.today()), '', 'estudados') + ui.cell('Encerrados', retired.length, '', plural(retired.length, 'concurso', 'concursos') + ' com mapas guardados') + '</div></section>';
    const lst = '<div class="pr-list">' + rows.map((r) => '<div class="pr-li" style="--c:' + P.mapColor(r.m) + '"><span class="pr-sig">' + esc(r.m.code || '') + '</span><span><b>' + esc(r.m.shortTitle || r.m.title) + '</b><br><span class="t">' + esc([r.m.category, U.pct(r.p.marked, r.p.total) + '%', r.p.review ? r.p.review + ' REV' : '', r.p.difficult ? r.p.difficult + ' DIF' : '', P.editais.alcance(r.m) === 'misto' ? 'misto' : ''].filter(Boolean).join(' · ')) + '</span></span>' + ui.btn(r.p.review + r.p.difficult ? 'Revisar' : 'Abrir', ui.act('open-map', r.k), 'sm') + '</div>').join('') + '</div>';
    const guard = locals.length ? ui.card(ui.head('Guardados', locals.length + ' ' + plural(locals.length, 'mapa local', 'mapas locais')) + '<p class="pr-detail">' + esc(locals.map((m) => m.code).join(' · ')) + '. Voltam se houver outro concurso do mesmo órgão; o progresso continua salvo. Para mudar, altere o alcance no painel do mapa, dentro do curso.</p>') : '';
    return carimbo + '<div class="pr-two">' + ui.card(ui.head('O que entra na manutenção', 'Primeiro o que tem REV e DIF') + lst) + guard + '</div>';
  }

  /* ---------- render ---------- */
  function render(root) {
    const screen = currentScreen();
    root.dataset.screen = screen;
    const q = P.reviews.queue(), qCount = q.reduce((s, x) => s + x.count, 0), sess = P.session.read(), post = P.courses.postExam();
    const entreOn = !!entreMaps().length;
    const tabs = SCREENS.filter(([id]) => id !== 'entre' || entreOn).map(([id, label]) => ({ id, label, badge: id === 'rev' && qCount ? qCount : id === 'sessao' && sess ? '●' : '', disabled: id === 'pos' && !post }));
    const body = screen === 'entre' ? screenEntre() : screen === 'todos' ? screenTodos() : screen === 'rev' ? screenRev() : screen === 'sessao' ? screenSessao() : screen === 'pos' ? screenPos() : screenHoje();
    root.innerHTML = ui.top({ eyebrow: 'Início · ' + U.fmtLong(new Date()), tabs, active: screen, label: 'Início', tabAct: 'screen' }) + body;
    clearInterval(tick);
    if (screen === 'sessao' && sess) tick = setInterval(() => updateClock(root), 1000);
  }
  let sinceFull = 0;
  function updateClock(root) {
    const s = P.session.read();
    if (!s || state.view !== 'home' || root.dataset.screen !== 'sessao') { clearInterval(tick); if (!s) P.schedule('home'); return; }
    if (++sinceFull >= 30) { sinceFull = 0; P.schedule('home'); return; }
    const el = root.querySelector('[data-pr-clock]'), ee = root.querySelector('[data-pr-elapsed]');
    if (el) el.firstChild.nodeValue = U.fmtClock(s.target ? Math.max(0, s.target - s.elapsed) : s.elapsed);
    if (ee) ee.textContent = fmtSec(s.elapsed);
  }

  P.pages.home = {
    render,
    actions: {
      screen: (id) => { manual.set(id === autoScreen() ? '' : id); P.schedule('home'); window.scrollTo({ top: 0 }); },
      quick: (n) => { quick = Number(n); if (window.StudyPlanner?.showTimePlan) window.StudyPlanner.showTimePlan(quick, { focusOnStart: false }); P.schedule('home'); },
      'pick-map': (key, el, root) => { selTile = key; root.querySelectorAll('.pr-tile').forEach((t) => t.classList.toggle('on', t.dataset.arg === key)); const d = root.querySelector('[data-pr-detail]'); if (d) d.innerHTML = tileDetail(key); },
      'start-plan': async (key, el) => {
        const map = typeof mapById === 'function' ? mapById(key) : null;
        if (window.StudyDashboard?.active?.()) { manual.set('sessao'); P.schedule('home'); return; }
        window.StudyDashboard?.start?.({ map, general: !map, mode: 'planned', minutes: Number(el?.dataset.min) || 20, label: map?.code || 'Sessão planejada' });
        manual.set('');
        if (map && typeof openMap === 'function') await openMap(key);
        P.schedule('home');
      },
      'start-agenda': async (id) => { if (window.StudyDashboard?.active?.()) { manual.set('sessao'); P.schedule('home'); return; } await window.StudyPlanner?.startAgendaItem?.(id); manual.set(''); P.schedule('home'); },
      'start-free': () => { window.StudyDashboard?.start?.({ general: true, mode: 'free', label: 'Sessão de estudo' }); manual.set(''); P.schedule('home'); },
      'start-pomodoro': () => { window.StudyDashboard?.startPomodoro?.(P.time.goals().pomodoroWork); manual.set(''); P.schedule('home'); },
      'topic-review': () => window.StudyPlanner?.showTopicReview?.(),
      'postpone-exam': () => P.confirm('Adiar revisões do dia da prova?', 'As revisões que caem no dia de uma prova passam para o dia seguinte. Nenhuma revisão é excluída.', () => { const r = P.reviews.postponeExamDay(); if (typeof toast === 'function') toast(r.moved ? r.moved + ' ' + plural(r.moved, 'revisão adiada', 'revisões adiadas') + ' para o dia seguinte.' : 'Nenhuma revisão cai no dia de uma prova.'); P.schedule('home'); }, 'Adiar'),
      'focus-gabarito': (a, el, root) => { const f = root.querySelector('[data-pr-gabarito] input'); f?.scrollIntoView({ block: 'center', behavior: 'smooth' }); f?.focus(); },
      'save-gabarito': (fd, form) => {
        if (form.dataset.ponderado) { P.actions['save-gab-pond'](fd, form); return; }
        const correct = Math.round(Number(fd.get('correct'))), total = Math.round(Number(fd.get('total')));
        if (!(total > 0) || !(correct >= 0) || correct > total) { if (typeof toast === 'function') toast('Confira os números: acertos entre 0 e o total de questões.'); return; }
        const id = form.dataset.course, cl = P.courses.closure(id);
        P.store.patch('closures', id, { ...cl, gabarito: { correct, total, at: new Date().toISOString() } });
        if (typeof toast === 'function') toast('Gabarito registrado: ' + pct(correct, total) + '%.');
        P.schedule('home');
      },
      'close-doubts': (id) => { P.store.patch('closures', id, { ...P.courses.closure(id), doubtsAt: new Date().toISOString() }); P.schedule('home'); },
      'dismiss-post': (id) => P.confirm('Manter o curso ativo?', 'A tela Pós-prova deixa de aparecer para este curso. Como a prova já passou, os mapas dele continuam fora do plano e das revisões; para voltar a estudá-lo, informe uma nova data de prova (ex.: próxima fase) em Cursos.', () => { P.store.patch('closures', id, { ...P.courses.closure(id), dismissedAt: new Date().toISOString() }); manual.set(''); P.schedule('home'); }, 'Manter ativo'),
      'archive-course': (id) => archiveCourse(id),
      'plan-next': (id) => { try { window.StudyAutomation?.syncAgenda?.({ force: true }); } catch {} if (typeof toast === 'function') toast('Plano recalculado com o próximo concurso.'); if (typeof nav === 'function') nav('agenda'); }
    }
  };

  /* arquivar usa o fluxo real do app (status na nuvem); nada é apagado */
  function archiveCourse(id) {
    const c = P.courses.byId(id);
    if (!c || typeof toggleCourseArchive !== 'function') return;
    const archived = P.courses.isArchived(c);
    P.confirm(archived ? 'Reativar curso?' : 'Arquivar ' + (c.title || 'curso') + '?', archived ? 'O curso volta para a Home, a Agenda e as prioridades.' : 'O curso sai da Home, da Agenda e das prioridades automáticas. Mapas, progresso, simulados e histórico continuam guardados, e você pode reativá-lo em Cursos.', async () => {
      state.adminCourseId = id;
      try { if (typeof createRestorePoint === 'function') await createRestorePoint('before-course-archive', 'Antes de ' + (archived ? 'reativar' : 'arquivar') + ' curso'); } catch {}
      try { await toggleCourseArchive(); if (!archived) P.store.patch('closures', id, { ...P.courses.closure(id), archivedAt: new Date().toISOString() }); }
      catch (e) { console.error(e); if (typeof toast === 'function') toast('Não foi possível ' + (archived ? 'reativar' : 'arquivar') + ' agora. Verifique a conexão.'); }
      manual.set('');
      P.schedule(state.view);
    }, archived ? 'Reativar' : 'Arquivar');
  }
  P.archiveCourse = archiveCourse;
})();
