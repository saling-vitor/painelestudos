'use strict';
/* MEUS MAPAS · Prancha · Agenda como cronograma de obra: carimbo da semana, régua do dia, colunas da semana, mês com siglas. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.agenda) return;
  const U = P.util, ui = P.ui, { esc, fmtMin, fmtSec, fmtDay, plural } = U;
  const MKEY = 'studyapp.prancha.agendaMode';
  let mode = (() => { try { return localStorage.getItem(MKEY) || (matchMedia('(max-width:700px)').matches ? 'dia' : 'semana'); } catch { return 'semana'; } })();
  let cur = U.startDay(), nowTimer = 0;
  const H0 = 6, H1 = 23, HH = 44;

  const mapOf = (it) => (it?.mapKey && typeof mapById === 'function' ? mapById(it.mapKey) : null);
  const colorOf = (it) => { const m = mapOf(it); return m ? P.mapColor(m) : it.kind === 'simulation' ? 'var(--pr-pg-argila)' : it.kind === 'review' ? 'var(--pr-latao)' : 'var(--pr-pg-pedra)'; };
  const codeOf = (it) => mapOf(it)?.code || (it.kind === 'simulation' ? 'SIM' : it.kind === 'review' ? 'REV' : 'LIVRE');
  const titleOf = (it) => { const m = mapOf(it); return m ? m.shortTitle || m.title : String(it.title || 'Sessão').replace(/^Iniciar\s*·\s*/i, ''); };
  const examOn = (d) => P.courses.active().filter((s) => s.exam.date && U.dateKey(s.exam.date) === U.dateKey(d));
  const weekStart = (d) => U.addDays(d, -((U.startDay(d).getDay() + 6) % 7));
  const doneSecOn = (d) => Number(P.time.days()[U.dateKey(d)] || 0);
  /* V15.57 · marcos do cronograma (Régua do edital) de cursos não arquivados; a prova continua com o próprio destaque */
  const PRAZO = new Set(['recursos', 'convocacao', 'inscricoes']);
  function marcosOn(d) {
    const k = U.dateKey(d), out = [];
    for (const c of P.courses.list()) { if (P.courses.isArchived(c)) continue; for (const f of P.editais.fases(c)) if (f.date && f.id !== 'prova' && U.dateKey(f.date) === k) out.push({ c, f, sigla: P.courses.sigla(c), prazo: PRAZO.has(f.id) }); }
    return out;
  }
  const marcoChip = (x) => '<span class="pr-marco' + (x.prazo ? ' ox' : '') + '">' + esc(x.sigla + ' · ' + x.f.label) + '</span>';
  /* importação de .ics (Google Agenda → arquivo exportado): leitura local, sem rede */
  let icsRows = null;
  function parseIcs(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
    const out = []; let cur = null;
    const un = (v) => String(v || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
    for (const ln of lines) {
      if (ln === 'BEGIN:VEVENT') cur = {};
      else if (ln === 'END:VEVENT') { if (cur?.date && cur.summary) out.push(cur); cur = null; }
      else if (cur) {
        const i = ln.indexOf(':'); if (i < 0) continue;
        const key = ln.slice(0, i).split(';')[0].toUpperCase(), val = ln.slice(i + 1);
        if (key === 'SUMMARY') cur.summary = un(val).slice(0, 160);
        if (key === 'DTSTART') { const m = /^(\d{4})(\d{2})(\d{2})/.exec(val); if (m) cur.date = m[1] + '-' + m[2] + '-' + m[3]; }
      }
    }
    return out;
  }
  const FASE_HINT = [['recursos', /recurs/], ['gabarito', /gabarito/], ['homologacao', /homolog/], ['inscricoes', /inscri|isencao/], ['resultado', /resultado|classifica|notas? final/], ['convocacao', /convoca|nomea|posse|titulos/], ['prova', /prova|aplicacao/]];
  function guessIcs(ev) {
    const n = U.norm(ev.summary);
    const c = P.courses.list().find((x) => { const sg = U.norm(P.courses.sigla(x)); return (sg.length >= 3 && n.split(' ').includes(sg)) || (x.title && n.includes(U.norm(x.title))); });
    const f = FASE_HINT.find(([, re]) => re.test(n));
    return { courseId: c ? String(c.id) : '', fase: f ? f[0] : '' };
  }
  function icsCard() {
    if (!icsRows) return '';
    if (!icsRows.length) return ui.card(ui.head('Importar .ics', 'Nenhum evento encontrado no arquivo') + ui.btn('Fechar', ui.act('ics-close'), 'g sm'));
    const cs = P.courses.list().filter((c) => !P.courses.isArchived(c));
    const fases = P.editais.FASES.filter(([id]) => id !== 'prova');
    const rows = icsRows.map((r, i) => '<div class="pr-li"><input type="checkbox" name="on' + i + '" aria-label="Importar ' + esc(r.summary) + '"' + (r.courseId && r.fase && r.fase !== 'prova' ? ' checked' : '') + '><span><b>' + esc(r.summary) + '</b><br><span class="t">' + esc(U.fmtLong(U.parseDate(r.date))) + (r.fase === 'prova' ? ' · a data da prova é definida em Gerenciar curso' : '') + '</span></span><span class="pr-row" style="flex-wrap:nowrap"><select name="c' + i + '" aria-label="Curso"><option value="">Curso…</option>' + cs.map((c) => '<option value="' + esc(c.id) + '"' + (String(c.id) === r.courseId ? ' selected' : '') + '>' + esc(P.courses.sigla(c)) + '</option>').join('') + '</select><select name="f' + i + '" aria-label="Fase"><option value="">Fase…</option>' + fases.map(([id, l]) => '<option value="' + id + '"' + (id === r.fase ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></span></div>').join('');
    return ui.card(ui.head('Importar .ics', icsRows.length + ' ' + plural(icsRows.length, 'evento') + ' no arquivo · confira curso e fase', ui.btn('Cancelar', ui.act('ics-close'), 'g sm'), 'l') + '<form data-pr-submit="ics-save" data-n="' + icsRows.length + '"><div class="pr-list">' + rows + '</div><div class="pr-row" style="margin-top:10px"><button type="submit" class="pr-btn p">Importar marcados</button><span class="pr-mono">Os eventos viram fases na Régua do edital; nada é enviado ao Google.</span></div></form>');
  }
  function reviewsOn(d) { const c = P.reviews.calendar(Math.max(1, U.daysBetween(new Date(), d) + 1)); const x = c.find((r) => r.key === U.dateKey(d)); return x ? x.count : 0; }

  function carimbo() {
    const ws = weekStart(new Date()), we = U.addDays(ws, 6), today = U.startDay();
    const pc = P.courses.priority(), ex = pc?.exam, until = ex && ex.date <= we ? ex.date : null;
    let planned = 0, plannedN = 0, late = 0, doneSec = 0, todayPlanned = 0, todayN = 0;
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(ws, i), blocks = P.agenda.blocks(d);
      doneSec += doneSecOn(d);
      const open = blocks.filter((b) => !b.item.completedAt);
      if (d >= today && (!until || d < until)) { planned += blocks.reduce((n, b) => n + b.minutes, 0); plannedN += blocks.length; }
      if (d < today) late += open.length;
      if (U.dateKey(d) === U.dateKey(today)) { todayPlanned = blocks.reduce((n, b) => n + b.minutes, 0); todayN = blocks.length; }
    }
    const f = pc?.forecast, goals = P.time.goals();
    const daysLeft = until ? Math.max(0, U.daysBetween(today, until)) : null;
    const wantMin = f?.remainingSeconds ? f.remainingSeconds / 60 : 0;
    let v;
    if (until && wantMin) v = planned >= wantMin ? ui.verdict('m', 'A agenda cobre o plano até a prova.', fmtMin(planned) + ' planejadas; o plano do app pede ' + fmtMin(wantMin) + '.') : ui.verdict('', 'A agenda tem ' + fmtMin(planned) + ' até a prova; o plano do app pede ' + fmtMin(wantMin) + '.', 'Faltam ' + fmtMin(wantMin - planned) + '. Replanejar redistribui as sessões atrasadas nos dias disponíveis, dentro da carga máxima.');
    else if (late) v = ui.verdict('l', late + ' ' + plural(late, 'sessão atrasada', 'sessões atrasadas') + ' nesta semana.', 'Replanejar move as atrasadas para os próximos dias disponíveis.');
    else v = ui.verdict('n', planned ? fmtMin(planned) + ' planejadas no resto da semana.' : 'Nada planejado no resto da semana.', 'Toque num horário tracejado para transformá-lo em sessão.');
    const exWeek = ex && ex.date >= ws && ex.date <= we;
    return '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc('Agenda · semana de ' + ws.getDate() + ' a ' + fmtDay(we) + (pc ? ' · ' + pc.sigla : '')) + '</span><div class="pr-big"><span class="pr-pct pa pr-num">' + fmtSec(doneSec) + '</span><span class="pr-sub">feitas · ' + fmtMin(planned) + ' planejadas ' + (until ? 'até a prova' : 'no resto da semana') + '</span></div>' +
      ui.states([['f', doneSec / 60, 'var(--pr-latao)'], ['p', planned, 'var(--pr-g3)']], 'Semana: ' + fmtSec(doneSec) + ' feitas') + ui.legend([['Feito', fmtSec(doneSec), 'var(--pr-latao)'], ['Planejado', fmtMin(planned) + ' · ' + plannedN + ' ' + plural(plannedN, 'sessão', 'sessões'), 'var(--pr-g3)', true]].concat(exWeek ? [['Prova', U.DSEM[ex.date.getDay()].toLowerCase() + ' ' + ex.date.getDate(), 'var(--pr-oxido)']] : [])) + v + pesoSemanaHtml(pc) +
      '<div class="pr-row">' + ui.btn('Replanejar' + (until ? ' até a prova' : ''), ui.act('replan'), 'p') + ui.btn('Exportar .ics', ui.act('ics'), 'g') + ui.btn('Importar .ics', ui.act('ics-pick'), 'g') + '<input type="file" accept=".ics,text/calendar" hidden data-pr-change="ics-file" data-pr-ics>' + '</div></div><div class="pr-c-b">' +
      ui.cell('Hoje', fmtSec(P.time.today()) + ' / ' + fmtMin(todayPlanned), '', todayN + ' ' + plural(todayN, 'sessão', 'sessões')) +
      ui.cell('Até a prova', daysLeft !== null ? daysLeft + ' ' + plural(daysLeft, 'dia') : ex?.days > 0 ? ex.days + ' dias' : '—', daysLeft !== null && daysLeft <= 7 ? 'ox' : '', daysLeft !== null ? Array.from({ length: daysLeft }, (_, i) => U.DSEM[U.addDays(today, i).getDay()].toLowerCase()).join(', ') : pc ? 'prova depois desta semana' : 'sem prova marcada') +
      ui.cell('Planejado', fmtMin(planned), '', plannedN + ' ' + plural(plannedN, 'sessão', 'sessões')) +
      ui.cell('Pedido pelo plano', wantMin ? fmtMin(wantMin) : '—', 'l', wantMin ? 'leitura estimada do restante' : 'sem estimativa') +
      ui.cell('Meta semanal', fmtMin(goals.weekly), '', fmtMin(goals.daily) + ' por dia') +
      ui.cell('Atrasadas', late, late ? 'ox' : 'ok', late ? 'replanejar move para frente' : 'nada para trás') + '</div></section>';
  }

  function dayView() {
    const d = cur, blocks = P.agenda.blocks(d), sessions = P.agenda.sessionsForDate(d), sug = P.agenda.free(d), exams = examOn(d);
    const top = (min) => ((min / 60 - H0) * HH);
    let h = '<div class="pr-dg"><div class="hr" style="height:' + (H1 - H0) * HH + 'px">' + Array.from({ length: H1 - H0 }, (_, i) => (i ? '<span style="top:' + i * HH + 'px">' + String(H0 + i).padStart(2, '0') + 'h</span>' : '')).join('') + '</div><div class="col" style="height:' + (H1 - H0) * HH + 'px">';
    exams.forEach((s) => { h += '<div class="pr-blk" style="--c:var(--pr-oxido);top:' + top(8 * 60) + 'px;height:' + (4 * HH - 4) + 'px"><b>PROVA</b><span>' + esc(s.sigla + ' · ' + (s.course.board || '')) + '</span></div>'; });
    sessions.forEach((s) => { const t = new Date(s.startedAt), m = t.getHours() * 60 + t.getMinutes(), dur = Math.max(10, (Number(s.durationSeconds) || 0) / 60); if (m / 60 < H0 || m / 60 > H1) return; const map = s.mapKey && typeof mapById === 'function' ? mapById(s.mapKey) : null; h += '<div class="pr-blk done" style="--c:' + (map ? P.mapColor(map) : 'var(--pr-musgo)') + ';top:' + top(m) + 'px;height:' + Math.max(24, (dur / 60) * HH - 3) + 'px" title="Sessão realizada"><b>' + esc(map?.code || '✓') + '</b><span>' + t.toTimeString().slice(0, 5) + ' · ' + fmtSec(s.durationSeconds) + ' · feita</span></div>'; });
    let lastBottom = -1e9;
    blocks.forEach((b) => { const it = b.item; const hgt = Math.max(26, (b.minutes / 60) * HH - 3); let tp = top(b.start); if (!b.conflict && tp < lastBottom + 2) tp = lastBottom + 2; lastBottom = tp + hgt; h += '<button type="button" class="pr-blk' + (it.completedAt ? ' done' : '') + (b.conflict ? ' cf' : '') + '" data-pr-act="focus-item" data-arg="' + esc(it.id) + '" style="--c:' + colorOf(it) + ';top:' + tp + 'px;height:' + hgt + 'px"><b>' + esc(codeOf(it)) + '</b><span>' + P.agenda.fromMin(b.start) + ' · ' + fmtMin(b.minutes) + (b.explicit ? '' : ' · sem horário') + (b.conflict ? ' · conflito' : '') + '</span></button>'; });
    sug.forEach((x) => { h += '<button type="button" class="pr-blk sug" data-pr-act="use-slot" data-arg="' + x.start + '|' + x.minutes + '" style="top:' + top(P.agenda.toMin(x.start)) + 'px;height:' + Math.max(24, (x.minutes / 60) * HH - 3) + 'px">+ sugestão · ' + x.start + ' · ' + fmtMin(x.minutes) + '</button>'; });
    if (U.dateKey(d) === U.dateKey(new Date())) { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); if (m / 60 >= H0 && m / 60 <= H1) h += '<div class="pr-nowline" data-pr-now style="top:' + top(m) + 'px"><em>agora ' + n.toTimeString().slice(0, 5) + '</em></div>'; }
    return '<div class="pr-calh">' + ui.btn((typeof uiIcon === 'function' ? uiIcon('chevron-left', 'ui-icon-sm') : '‹'), ui.act('prev', '', { 'aria-label': 'Dia anterior' }), 'g pr-ib') + '<b>' + esc(U.DSEM[d.getDay()] + ' · ' + fmtDay(d)) + '</b>' + ui.btn((typeof uiIcon === 'function' ? uiIcon('chevron-right', 'ui-icon-sm') : '›'), ui.act('next', '', { 'aria-label': 'Próximo dia' }), 'g pr-ib') + '</div>' + h + '</div></div><p class="pr-mono" style="margin-top:8px">Blocos tracejados: horários livres sugeridos (dias disponíveis e carga máxima do planejamento). Itens sem horário aparecem a partir das 19:00.</p>';
  }
  function weekView() {
    const ws = weekStart(cur), max = Math.max(60, (window.StudyPlanner?.settings?.().maxDailyMinutes || 120));
    const cols = Array.from({ length: 7 }, (_, i) => {
      const d = U.addDays(ws, i), blocks = P.agenda.blocks(d), tot = blocks.reduce((n, b) => n + b.minutes, 0), by = {}, ex = examOn(d), done = doneSecOn(d) / 60;
      blocks.forEach((b) => { const c = colorOf(b.item); by[c] = (by[c] || 0) + b.minutes; });
      const scale = Math.max(max, tot);
      const mk = marcosOn(d);
      return '<button type="button" class="pr-wd' + (U.dateKey(d) === U.dateKey(new Date()) ? ' today' : '') + (U.dateKey(d) === U.dateKey(cur) ? ' on' : '') + (ex.length ? ' prova' : '') + (d < U.startDay() ? ' past' : '') + '" data-pr-act="pick-day" data-arg="' + U.dateKey(d) + '"><span class="dn"><span>' + U.DSEM[d.getDay()].toUpperCase() + '</span><b>' + d.getDate() + '</b></span><span class="stk" aria-label="' + fmtMin(tot) + ' planejadas">' + (ex.length ? '<i style="height:100%;background:color-mix(in srgb,var(--pr-oxido) 35%,transparent)"></i>' : Object.entries(by).map(([c, m]) => '<i style="height:' + (m / scale) * 100 + '%;background:' + c + '"></i>').join('')) + '<em style="bottom:' + Math.min(100, (max / scale) * 100) + '%"></em></span><span class="pr-mono">' + (ex.length ? 'prova ' + esc(ex.map((s) => s.sigla).join(', ')) : tot ? fmtMin(tot) + (done ? ' · feito ' + fmtMin(done) : '') : done ? 'feito ' + fmtMin(done) : 'livre') + '</span><span class="sg">' + blocks.map((b) => '<span style="--c:' + colorOf(b.item) + '">' + esc(codeOf(b.item)) + '</span>').join('') + '</span>' + (mk.length ? '<span class="mks">' + mk.map(marcoChip).join('') + '</span>' : '') + '</button>';
    });
    return '<div class="pr-calh">' + ui.btn((typeof uiIcon === 'function' ? uiIcon('chevron-left', 'ui-icon-sm') : '‹'), ui.act('prev', '', { 'aria-label': 'Semana anterior' }), 'g pr-ib') + '<b>' + ws.getDate() + ' — ' + esc(fmtDay(U.addDays(ws, 6))) + '</b>' + ui.btn((typeof uiIcon === 'function' ? uiIcon('chevron-right', 'ui-icon-sm') : '›'), ui.act('next', '', { 'aria-label': 'Próxima semana' }), 'g pr-ib') + '</div><div class="pr-wkg">' + cols.join('') + '</div>' + ui.legend([['carga máxima do planejamento', '', 'transparent']]).replace('<em style="background:transparent"></em>', '<em style="border-top:1px dashed var(--pr-papel-3);height:0;width:14px;border-radius:0"></em>');
  }
  function monthView() {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1), off = (first.getDay() + 6) % 7, start = U.addDays(first, -off);
    const exams = P.courses.active().filter((s) => s.exam.date);
    let h = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((d) => '<span class="dw">' + d + '</span>').join('');
    for (let i = 0; i < 42; i++) {
      const d = U.addDays(start, i);
      if (i >= 35 && d.getMonth() !== cur.getMonth()) break;
      if (d.getMonth() !== cur.getMonth()) { h += '<span class="pr-mc out" aria-hidden="true"></span>'; continue; }
      const blocks = P.agenda.blocks(d), tot = blocks.reduce((n, b) => n + b.minutes, 0), ex = examOn(d), afterAll = exams.length && exams.every((s) => d > s.exam.date);
      h += '<button type="button" class="pr-mc' + (U.dateKey(d) === U.dateKey(new Date()) ? ' today' : '') + (U.dateKey(d) === U.dateKey(cur) ? ' on' : '') + (ex.length ? ' prova' : '') + (afterAll ? ' pos' : '') + '" data-pr-act="pick-day" data-arg="' + U.dateKey(d) + '" aria-label="' + esc(fmtDay(d) + (ex.length ? ', prova' : '') + (tot ? ', ' + fmtMin(tot) : '')) + '"><b>' + d.getDate() + '</b><span class="sg">' + (ex.length ? ex.map((s) => '<span style="--c:var(--pr-oxido)">PROVA ' + esc(s.sigla) + '</span>').join('') : marcosOn(d).map((x) => '<span style="--c:' + (x.prazo ? 'var(--pr-oxido)' : 'var(--pr-latao)') + '">' + esc(x.sigla + ' · ' + x.f.label.split(' ')[0].toUpperCase()) + '</span>').join('') + blocks.map((b) => '<span style="--c:' + colorOf(b.item) + '">' + esc(codeOf(b.item)) + '</span>').join('')) + '</span><span class="ld"><i style="width:' + Math.min(100, (tot / Math.max(60, P.time.goals().daily)) * 100) + '%"></i></span></button>';
    }
    const post = exams.filter((s) => s.exam.date.getMonth() === cur.getMonth() && s.exam.date.getFullYear() === cur.getFullYear());
    return '<div class="pr-calh">' + ui.btn((typeof uiIcon === 'function' ? uiIcon('chevron-left', 'ui-icon-sm') : '‹'), ui.act('prev', '', { 'aria-label': 'Mês anterior' }), 'g pr-ib') + '<b>' + esc(U.MESES_LONGOS[cur.getMonth()] + ' ' + cur.getFullYear()) + '</b>' + ui.btn((typeof uiIcon === 'function' ? uiIcon('chevron-right', 'ui-icon-sm') : '›'), ui.act('next', '', { 'aria-label': 'Próximo mês' }), 'g pr-ib') + '</div><div class="pr-mg">' + h + '</div>' + (post.length ? ui.verdict('l', 'Depois de ' + esc(fmtDay(post[0].exam.date)) + ', o ' + esc(post[0].sigla) + ' sai do plano.', 'A tela Pós-prova do Início sugere arquivar o curso e trazer o próximo concurso.') : '');
  }

  /* ---------- V15.58 · semana pelo peso da prova ---------- */
  function pesoSemana(pc) {
    if (!pc) return null;
    const pe = P.editais.pesoEsforco(pc.id);
    if (!pe) return null;
    const today = U.startDay(), ws = weekStart(today), plan = Object.fromEntries(pe.rows.map((r) => [r.id, 0])), blocos = [];
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(ws, i);
      if (d < today) continue;
      for (const b of P.agenda.blocks(d)) {
        const m = mapOf(b.item);
        if (!m || b.item.completedAt || b.item.virtual) continue;
        const disc = P.editais.disciplinaDoMapa(m, pc.id);
        if (!disc || !(disc.id in plan)) continue;
        plan[disc.id] += b.minutes; blocos.push({ b, disc: disc.id, date: d });
      }
    }
    const total = Object.values(plan).reduce((s, x) => s + x, 0);
    if (!total) return null;
    let w = pe.rows.map((r) => ({ id: r.id, v: r.pontos * (1 - Math.min(0.9, r.cobertura)) }));
    const sw = w.reduce((s, x) => s + x.v, 0) || 1;
    w = w.map((x) => ({ id: x.id, f: Math.max(0.1, x.v / sw) }));
    const sf = w.reduce((s, x) => s + x.f, 0);
    const ideal = Object.fromEntries(w.map((x) => [x.id, Math.round((x.f / sf) * total)]));
    const desvio = pe.rows.map((r) => ({ r, d: plan[r.id] - ideal[r.id] })).sort((a, b) => a.d - b.d);
    return { pe, plan, ideal, total, blocos, falta: desvio[0], sobra: desvio[desvio.length - 1] };
  }
  function pesoSemanaHtml(pc) {
    const x = pesoSemana(pc);
    if (!x) return '';
    const pcs = (v) => Math.round((v / x.total) * 100) + '%';
    const bar = (src, label) => '<span class="pr-k">' + label + '</span>' + ui.states(x.pe.rows.map((r) => [r.nome, src[r.id], r.cor]), label) + ui.legend(x.pe.rows.map((r) => [r.nome, pcs(src[r.id]), r.cor]));
    const fora = x.falta.d <= -60;
    return '<div class="pr-pe">' + bar(x.plan, 'Planejado no resto da semana · ' + fmtMin(x.total)) + bar(x.ideal, 'Ideal pelo peso e pelo que falta') + '</div>' + (fora ? ui.verdict('', esc(x.falta.r.nome) + ' está ' + fmtMin(-x.falta.d) + ' abaixo do ideal nesta semana.', '“Seguir o peso” troca blocos de ' + esc(x.sobra.r.nome) + ' por mapas de ' + esc(x.falta.r.nome) + ', mantendo data e horário.') + '<div class="pr-row">' + ui.btn('Seguir o peso', ui.act('seguir-peso'), 'g sm') + '</div>' : '');
  }
  function trocasPeso(pc) {
    const x = pesoSemana(pc);
    if (!x) return [];
    const plan = { ...x.plan }, out = [], used = new Set();
    const rows = P.plan.priorities(40, pc.id);
    for (let n = 0; n < 8; n++) {
      const dev = x.pe.rows.map((r) => ({ id: r.id, d: plan[r.id] - x.ideal[r.id] })).sort((a, b) => a.d - b.d);
      const under = dev[0], over = dev[dev.length - 1];
      if (under.d > -45 || over.d < 30) break;
      const cand = x.blocos.filter((b) => b.disc === over.id && !used.has(b.b.item.id) && b.b.minutes <= over.d + 20).sort((a, b) => b.date - a.date)[0];
      if (!cand) break;
      const mapRow = rows.find((r) => P.editais.disciplinaDoMapa(r.map, pc.id)?.id === under.id && !out.some((t) => t.to.key === r.key && U.dateKey(t.date) === U.dateKey(cand.date)));
      if (!mapRow) break;
      used.add(cand.b.item.id);
      out.push({ id: cand.b.item.id, date: cand.date, from: mapOf(cand.b.item), to: mapRow, minutes: cand.b.minutes });
      plan[over.id] -= cand.b.minutes; plan[under.id] += cand.b.minutes;
    }
    return out;
  }
  /* ---------- V15.58 · rotina: revisões com horário e semana-modelo ---------- */
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  function modelo() { const r = P.store.read().modelo?.semana; return r && !r.removed && Array.isArray(r.blocos) ? r.blocos : []; }
  function rotinaCard() {
    const cfg = P.prefs.get('revHorario') || {}, pc = P.courses.priority(), prova = pc ? P.editais.prova(pc.id) : [];
    const rev = '<details class="pr-rot"' + (cfg.on ? '' : '') + '><summary>Revisões com horário · ' + (cfg.on ? 'ligado, ' + esc(cfg.start) : 'desligado') + '</summary><form data-pr-submit="rev-config"><p class="pr-mono">Um bloco “Revisões do dia” no horário escolhido, com a duração estimada pela fila; não aparece no dia de prova nem quando nada vence.</p><div class="pr-fgrid"><label class="pr-field"><span>Situação</span><select name="on"><option value="1"' + (cfg.on ? ' selected' : '') + '>Ligado</option><option value="0"' + (cfg.on ? '' : ' selected') + '>Desligado</option></select></label><label class="pr-field"><span>Horário</span><input type="time" name="start" step="60" value="' + esc(cfg.start || '18:00') + '"></label><label class="pr-field"><span>Duração máxima (min)</span><input type="number" name="max" min="10" max="120" step="5" inputmode="numeric" value="' + esc(cfg.max || 40) + '"></label></div><div class="pr-checks">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<label><input type="checkbox" name="d' + d + '"' + ((cfg.days || [1, 2, 3, 4, 5, 6]).includes(d) ? ' checked' : '') + '> ' + DIAS[d] + '</label>').join('') + '</div><button type="submit" class="pr-btn sm">Salvar</button></form></details>';
    const blocos = modelo(), discs = prova.length ? prova : [];
    const optTipo = '<option value="disc:">Estudo (mapa do plano)</option>' + discs.map((d) => '<option value="disc:' + esc(d.id) + '">Estudo · ' + esc(d.nome) + '</option>').join('') + '<option value="simulation:">Simulado</option>';
    const lista = blocos.length ? '<div class="pr-list">' + blocos.map((b, i) => '<div class="pr-li"><span class="pr-sig">' + DIAS[b.dia] + '</span><span>' + esc(b.start + ' · ' + fmtMin(b.minutes)) + '<br><span class="t">' + esc(b.tipo === 'simulation' ? 'Simulado' : (discs.find((d) => d.id === b.disc)?.nome ? 'Estudo · ' + discs.find((d) => d.id === b.disc).nome : 'Estudo · mapa do plano')) + '</span></span>' + ui.btn('Remover', ui.act('modelo-del', String(i)), 'g sm') + '</div>').join('') + '</div>' : '<p class="pr-detail">Nenhum bloco no modelo ainda.</p>';
    const horas = blocos.reduce((n, b) => n + b.minutes, 0);
    const mod = '<details class="pr-rot"><summary>Semana-modelo · ' + (blocos.length ? blocos.length + ' ' + plural(blocos.length, 'bloco') + ', ' + fmtMin(horas) + ' por semana' : 'vazia') + '</summary><p class="pr-mono">Horários fixos por dia; ao aplicar, cada bloco de estudo recebe o mapa que o plano indicar naquele dia. Itens já existentes não são tocados.</p>' + lista +
      '<form data-pr-submit="modelo-add"><div class="pr-fgrid"><label class="pr-field"><span>Dia</span><select name="dia">' + [1, 2, 3, 4, 5, 6, 0].map((d) => '<option value="' + d + '">' + DIAS[d] + '</option>').join('') + '</select></label><label class="pr-field"><span>Início</span><input type="time" name="start" step="60" value="19:00" required></label><label class="pr-field"><span>Minutos</span><input type="number" name="minutes" min="10" max="300" step="5" value="60" inputmode="numeric"></label><label class="pr-field"><span>Tipo</span><select name="tipo">' + optTipo + '</select></label></div><button type="submit" class="pr-btn sm">Adicionar ao modelo</button></form>' +
      (blocos.length ? '<div class="pr-row">' + ui.btn(pc ? 'Aplicar até a prova do ' + esc(pc.sigla) : 'Aplicar nas próximas 4 semanas', ui.act('modelo-aplicar'), 'p sm') + '</div>' : '') + '</details>';
    return ui.card(ui.head('Rotina', 'Revisões com horário e semana-modelo', '', 'l') + rev + mod);
  }
  function aplicarModelo() {
    const blocos = modelo(), pc = P.courses.priority();
    if (!blocos.length || !window.StudyDashboard?.addAgenda) return { n: 0 };
    const today = U.startDay(), end = pc?.exam?.date ? U.addDays(pc.exam.date, -1) : U.addDays(today, 27);
    const rows = P.plan.priorities(40, pc ? pc.id : ''), plan = [];
    for (let d = U.addDays(today, 1); d <= end; d = U.addDays(d, 1)) {
      if (examOn(d).length) continue;
      const exist = P.agenda.blocks(d), usados = new Set();
      for (const b of blocos.filter((x) => x.dia === d.getDay())) {
        const s = P.agenda.toMin(b.start);
        if (s === null || exist.some((x) => s < x.end && x.start < s + b.minutes)) continue;
        if (b.tipo === 'simulation') { plan.push({ date: U.dateKey(d), kind: 'simulation', title: 'Simulado', minutes: b.minutes, start: b.start }); continue; }
        const r = rows.find((x) => !usados.has(x.key) && (!b.disc || P.editais.disciplinaDoMapa(x.map, x.map.courseId)?.id === b.disc)) || rows.find((x) => !usados.has(x.key));
        if (r) usados.add(r.key);
        plan.push({ date: U.dateKey(d), kind: 'study', title: r ? r.map.code || r.map.title : 'Sessão de estudo', minutes: b.minutes, mapKey: r?.key || '', start: b.start });
      }
    }
    return { n: plan.length, plan, end };
  }
  function itemMenu(it) {
    return ui.menu('ag-' + it.id, [[it.completedAt ? 'Marcar como não feita' : 'Marcar como feita', ui.act('toggle-done', it.id)], ['Definir horário', ui.act('set-start', it.id)], ['Mover para amanhã', ui.act('move-next', it.id)], ['Remover da agenda', ui.act('remove', it.id), 'd']]);
  }
  function panel() {
    const d = cur, blocks = P.agenda.blocks(d), ex = examOn(d), sessions = P.agenda.sessionsForDate(d), sug = P.agenda.free(d), revN = U.dateKey(d) >= U.dateKey(new Date()) ? reviewsOn(d) : 0;
    const tot = blocks.reduce((n, b) => n + b.minutes, 0);
    const pri = P.plan.priorities(5);
    const maps = P.data.maps().slice().sort((a, b) => String(a.code).localeCompare(String(b.code)));
    const list = blocks.map((b) => { const it = b.item; return '<div class="pr-it' + (it.completedAt ? ' done' : '') + (b.conflict ? ' cf' : '') + '" style="--c:' + colorOf(it) + '" data-pr-item="' + esc(it.id) + '"><span class="bar"></span><span><b><span class="pr-sig" style="font-size:var(--fs-title);color:' + colorOf(it) + '">' + esc(codeOf(it)) + '</span> ' + esc(titleOf(it)) + '</b><span class="pr-mono">' + P.agenda.fromMin(b.start) + (b.explicit ? '' : ' (sem horário)') + ' · ' + fmtMin(b.minutes) + ' · ' + (it.kind === 'simulation' ? 'simulado' : 'estudo') + (b.conflict ? ' · conflito de horário' : '') + (it.completedAt ? ' · feita' : '') + '</span></span><span class="pr-row" style="flex-wrap:nowrap">' + (it.virtual ? ui.btn('Revisar', ui.act('review-queue'), 'sm') : (it.completedAt ? '' : ui.btn('Iniciar', ui.act('start-item', it.id), 'sm')) + itemMenu(it)) + '</span></div>'; }).join('');
    const done = sessions.map((s) => { const m = s.mapKey && typeof mapById === 'function' ? mapById(s.mapKey) : null; return '<div class="pr-it done" style="--c:' + (m ? P.mapColor(m) : 'var(--pr-musgo)') + '"><span class="bar"></span><span><b>' + esc((m?.code ? m.code + ' · ' : '') + (s.label || 'Sessão')) + '</b><span class="pr-mono">' + new Date(s.startedAt).toTimeString().slice(0, 5) + ' · ' + fmtSec(s.durationSeconds) + ' · realizada</span></span>' + ui.btn('Remover', ui.act('remove-session', s.id), 'g sm') + '</div>'; }).join('');
    const start = blocks.length ? P.agenda.fromMin(Math.max(...blocks.map((b) => b.end))) : '19:00';
    const form = '<details class="pr-add"><summary>+ Adicionar sessão</summary><form data-pr-submit="add"><label class="pr-field"><span>Mapa</span><select name="mapKey"><option value="">Sessão geral</option>' + pri.map((r) => '<option value="' + esc(r.key) + '">★ ' + esc((r.map.code || '') + ' · ' + r.map.title) + '</option>').join('') + maps.map((m) => '<option value="' + esc(P.data.keyOf(m)) + '">' + esc((m.code || '') + ' · ' + m.title) + '</option>').join('') + '</select></label><div class="pr-row" style="flex-wrap:nowrap"><label class="pr-field" style="flex:1"><span>Data</span><input name="date" type="date" required value="' + U.dateKey(d) + '"></label><label class="pr-field" style="flex:1"><span>Início</span><input name="start" type="time" step="60" value="' + start + '"></label></div><div class="pr-row" style="flex-wrap:nowrap"><label class="pr-field" style="flex:1"><span>Minutos</span><input name="minutes" type="number" min="5" max="480" step="5" value="30" inputmode="numeric"></label><label class="pr-field" style="flex:1"><span>Tipo</span><select name="kind"><option value="study">Estudo</option><option value="simulation">Simulado</option></select></label></div><label class="pr-field"><span>Repetição</span><select name="recurrence"><option value="none">Não repetir</option><option value="daily">Diariamente (14 dias)</option><option value="weekdays">Dias úteis (20 dias)</option><option value="weekly">Semanalmente (8 semanas)</option></select></label><button type="submit" class="pr-btn p">Adicionar ao dia ' + d.getDate() + '</button></form></details>';
    const mk = marcosOn(d);
    const mkHtml = mk.length ? '<div class="pr-list">' + mk.map((x) => '<div class="pr-li"><span class="pr-chip ' + (x.prazo ? 'ox' : 'l') + '">' + (x.prazo ? 'prazo' : 'marco') + '</span><span><b>' + esc(x.f.label) + '</b><br><span class="t">' + esc(x.sigla + ' · ' + (x.c.title || '')) + '</span></span>' + ui.btn('Curso', ui.act('open-course', x.c.id), 'g sm') + '</div>').join('') + '</div>' : '';
    return ui.card('<div><span class="pr-k l">' + esc(U.DSEM[d.getDay()] + ' · ' + d.getDate() + ' de ' + U.MESES_LONGOS[d.getMonth()]) + '</span><h3>' + (ex.length ? 'Prova ' + esc(ex.map((s) => s.sigla).join(', ')) : blocks.length ? fmtMin(tot) + ' planejadas' : 'Dia livre') + '</h3></div>' +
      mkHtml + (ex.length ? ui.verdict('', 'Dia da prova.', 'Nenhuma sessão é sugerida' + (revN ? '; ' + revN + ' ' + plural(revN, 'revisão vence', 'revisões vencem') + ' hoje e podem ser adiadas na tela Revisões do Início.' : '.')) : '') +
      (list || done ? '<div class="pr-list">' + list + done + '</div>' : ui.empty('Nada neste dia', ex.length ? 'Boa prova.' : 'Use uma sugestão ou adicione uma sessão.')) +
      (revN && !ex.length && !P.agenda.reviewBlock(d) ? '<div class="pr-li"><span class="pr-sig">REV</span><span>' + revN + ' ' + plural(revN, 'revisão vence', 'revisões vencem') + ' neste dia</span>' + ui.btn('Ver fila', ui.act('go-reviews'), 'g sm') + '</div>' : '') +
      (sug.length ? '<span class="pr-k">Sugestões para este dia</span><div class="pr-row">' + sug.map((x) => ui.btn('+ ' + x.start + ' · ' + fmtMin(x.minutes), ui.act('use-slot', x.start + '|' + x.minutes), 'g sm')).join('') + '</div>' : '') + form, 'pr-panel');
  }

  function render(root) {
    const tabs = [{ id: 'dia', label: 'Dia' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }];
    const body = mode === 'dia' ? dayView() : mode === 'mes' ? monthView() : weekView();
    root.innerHTML = ui.top({ eyebrow: 'Planejamento', title: 'Agenda de estudos', tabs, active: mode, label: 'Agenda', tabAct: 'mode', right: ui.btn('Hoje', ui.act('today'), 'g sm') }) + carimbo() + icsCard() + '<div class="pr-side2">' + ui.card(body) + panel() + '</div>' + rotinaCard();
    clearInterval(nowTimer);
    if (mode === 'dia' && U.dateKey(cur) === U.dateKey(new Date())) nowTimer = setInterval(() => { if (state.view !== 'agenda') return clearInterval(nowTimer); const el = root.querySelector('[data-pr-now]'); if (!el) return; const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); el.style.top = ((m / 60 - H0) * HH) + 'px'; el.querySelector('em').textContent = 'agora ' + n.toTimeString().slice(0, 5); }, 30000);
  }
  function step(dir) { if (mode === 'mes') cur = new Date(cur.getFullYear(), cur.getMonth() + dir, 1); else cur = U.addDays(cur, mode === 'semana' ? 7 * dir : dir); P.schedule('agenda'); }
  function agendaRow(id) { return (window.StudyDashboard?.exportData?.().agenda || []).find((x) => x.id === id && !x.deleted) || null; }
  function patchAgenda(id, fn) { const data = window.StudyDashboard?.exportData?.(); const row = data?.agenda?.find((x) => x.id === id); if (!row) return false; fn(row); row.updatedAt = new Date().toISOString(); data.updatedAt = row.updatedAt; window.StudyDashboard.importData(data, { merge: false, silent: true }); if (typeof touchPreferences === 'function') touchPreferences(); return true; }

  P.pages.agenda = {
    render,
    actions: {
      mode: (id) => { mode = id; try { localStorage.setItem(MKEY, id); } catch {} P.schedule('agenda'); },
      'seguir-peso': () => {
        const pc = P.courses.priority(), t = pc ? trocasPeso(pc) : [];
        if (!t.length) { if (typeof toast === 'function') toast('Nenhuma troca melhora a divisão desta semana.'); return; }
        P.confirm('Seguir o peso da prova?', t.map((x) => U.DSEM[x.date.getDay()] + ' ' + x.date.getDate() + ': ' + (x.from?.code || 'sessão') + ' → ' + (x.to.map.code || x.to.map.title) + ' (' + fmtMin(x.minutes) + ')').join('\n') + '\n\nData, horário e duração não mudam.', () => {
          let n = 0;
          for (const x of t) if (patchAgenda(x.id, (r) => { r.mapKey = x.to.key; r.title = x.to.map.code || x.to.map.title; })) n++;
          if (typeof toast === 'function') toast(n + ' ' + plural(n, 'bloco trocado', 'blocos trocados') + ' pelo peso da prova.');
          P.schedule('agenda');
        }, 'Trocar');
      },
      'rev-config': (fd) => {
        const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => fd.get('d' + d));
        P.prefs.set('revHorario', { on: fd.get('on') === '1', start: /^\d{2}:\d{2}$/.test(String(fd.get('start'))) ? String(fd.get('start')) : '18:00', max: Math.max(10, Math.min(120, Number(fd.get('max')) || 40)), days: days.length ? days : [1, 2, 3, 4, 5, 6] });
        if (typeof toast === 'function') toast('Revisões com horário salvas.');
        P.schedule('agenda');
      },
      'modelo-add': (fd) => {
        const [tipo, disc] = String(fd.get('tipo') || 'disc:').split(':');
        const start = String(fd.get('start') || '');
        if (!/^\d{2}:\d{2}$/.test(start)) return;
        const blocos = modelo().concat([{ dia: Number(fd.get('dia')) || 0, start, minutes: Math.max(10, Math.min(300, Number(fd.get('minutes')) || 60)), tipo: tipo === 'simulation' ? 'simulation' : 'disc', disc: disc || '' }]).sort((a, b) => ((a.dia + 6) % 7) - ((b.dia + 6) % 7) || a.start.localeCompare(b.start));
        P.store.patch('modelo', 'semana', { blocos });
        P.schedule('agenda');
      },
      'modelo-del': (i) => { const blocos = modelo().filter((_, j) => j !== Number(i)); P.store.patch('modelo', 'semana', { blocos }); P.schedule('agenda'); },
      'modelo-aplicar': () => {
        const r = aplicarModelo();
        if (!r.n) { if (typeof toast === 'function') toast('Nenhum horário livre para os blocos do modelo.'); return; }
        P.confirm('Aplicar a semana-modelo?', r.n + ' ' + plural(r.n, 'bloco', 'blocos') + ' de amanhã até ' + U.fmtDayYear(r.end) + ', ' + fmtMin(r.plan.reduce((n, x) => n + x.minutes, 0)) + ' no total. Itens já existentes não mudam.', async () => {
          try { if (typeof createRestorePoint === 'function') await createRestorePoint('before-week-model', 'Antes de aplicar a semana-modelo'); } catch {}
          let n = 0;
          for (const x of r.plan) { const row = window.StudyDashboard.addAgenda({ date: x.date, kind: x.kind, title: x.title, minutes: x.minutes, mapKey: x.mapKey || '' }); if (row?.id) { P.agenda.setStart(row.id, x.start); n++; } }
          if (typeof toast === 'function') toast(n + ' ' + plural(n, 'bloco adicionado', 'blocos adicionados') + ' pela semana-modelo.');
          P.schedule('agenda');
        }, 'Aplicar');
      },
      today: () => { cur = U.startDay(); P.schedule('agenda'); },
      prev: () => step(-1), next: () => step(1),
      'pick-day': (k) => { cur = U.parseDate(k) || U.startDay(); P.schedule('agenda'); },
      'focus-item': (id, el, root) => { const it = root.querySelector('[data-pr-item="' + CSS.escape(id) + '"]'); it?.scrollIntoView({ block: 'center', behavior: 'smooth' }); it?.querySelector('button')?.focus(); },
      replan: () => { if (window.StudyPlanner?.showReplanModal) window.StudyPlanner.showReplanModal(); else window.StudyPlanner?.replanWeek?.('balanced'); setTimeout(() => P.schedule('agenda'), 300); },
      ics: () => window.StudyPlanner?.exportAgendaIcs?.(),
      'ics-pick': (a, el, root) => root.querySelector('[data-pr-ics]')?.click(),
      'ics-file': (v, el) => { const f = el.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const t0 = U.addDays(new Date(), -120); icsRows = parseIcs(String(r.result || '')).filter((e) => (U.parseDate(e.date) || 0) >= t0).slice(0, 200).map((e) => ({ ...e, ...guessIcs(e) })); P.schedule('agenda'); }; r.readAsText(f); },
      'ics-close': () => { icsRows = null; P.schedule('agenda'); },
      'ics-save': (fd, form) => {
        const n = Number(form.dataset.n) || 0, by = {};
        for (let i = 0; i < n; i++) { if (!fd.get('on' + i)) continue; const c = String(fd.get('c' + i) || ''), f = String(fd.get('f' + i) || ''); if (!c || !f || f === 'prova') continue; (by[c] ||= {})[f] = icsRows[i].date; }
        let count = 0;
        for (const [c, fs] of Object.entries(by)) { const cur = P.editais.get(c) || {}, fases = { ...(cur.fases || {}) }; for (const [f, date] of Object.entries(fs)) { fases[f] = { date, origem: 'ics' }; count++; } P.editais.set(c, { fases }); }
        icsRows = null;
        if (typeof toast === 'function') toast(count ? count + ' ' + plural(count, 'marco importado', 'marcos importados') + ' para a Régua do edital.' : 'Nenhum evento marcado com curso e fase.');
        P.schedule('agenda');
      },
      'start-item': async (id) => { if (window.StudyDashboard?.active?.()) { if (typeof toast === 'function') toast('Já existe uma sessão em andamento.'); return; } await window.StudyPlanner?.startAgendaItem?.(id); },
      'toggle-done': (id) => { patchAgenda(id, (r) => { r.completedAt = r.completedAt ? '' : new Date().toISOString(); }); P.schedule('agenda'); },
      'move-next': (id) => { const r = agendaRow(id); if (!r) return; const next = U.addDays(U.parseDate(r.date) || new Date(), 1); window.StudyPlanner?.rescheduleAgendaItem?.(id, U.dateKey(next)); P.schedule('agenda'); },
      'set-start': (id, el, root) => {
        const row = root.querySelector('[data-pr-item="' + CSS.escape(id) + '"]'); if (!row || row.querySelector('form')) return;
        const cur0 = P.agenda.start(agendaRow(id)) || '19:00';
        row.insertAdjacentHTML('beforeend', '<form data-pr-submit="save-start" data-id="' + esc(id) + '" class="pr-row" style="grid-column:1/-1"><label class="pr-field"><span>Início</span><input name="start" type="time" step="60" value="' + cur0 + '" required></label><button type="submit" class="pr-btn sm">Salvar</button></form>');
        row.querySelector('input[name="start"]').focus();
      },
      'save-start': (fd, form) => { P.agenda.setStart(form.dataset.id, String(fd.get('start') || '')); P.schedule('agenda'); },
      remove: (id) => { window.StudyDashboard?.removeAgenda?.(id); setTimeout(() => P.schedule('agenda'), 50); },
      'remove-session': (id) => { window.StudyDashboard?.removeSession?.(id); setTimeout(() => P.schedule('agenda'), 50); },
      'go-reviews': () => { try { sessionStorage.setItem('studyapp.prancha.homeScreen', 'rev'); } catch {} if (typeof nav === 'function') nav('home'); },
      'use-slot': (arg) => {
        const [start, mins] = String(arg).split('|'), top = P.plan.priorities(1)[0];
        const row = window.StudyDashboard?.addAgenda?.({ date: U.dateKey(cur), kind: 'study', title: top ? (top.map.code || top.map.title) : 'Sessão de estudo', minutes: Number(mins) || 30, mapKey: top?.key || '' });
        if (row?.id) P.agenda.setStart(row.id, start);
        if (typeof toast === 'function') toast('Sessão criada às ' + start + (top ? ' · ' + (top.map.code || '') : '') + '.');
        P.schedule('agenda');
      },
      add: (fd) => {
        const payload = { date: String(fd.get('date') || U.dateKey(cur)), kind: String(fd.get('kind') || 'study'), minutes: Math.max(5, Number(fd.get('minutes')) || 30), mapKey: String(fd.get('mapKey') || '') };
        const map = payload.mapKey && typeof mapById === 'function' ? mapById(payload.mapKey) : null;
        payload.title = map ? map.code || map.title : payload.kind === 'simulation' ? 'Simulado' : 'Sessão de estudo';
        const rule = String(fd.get('recurrence') || 'none'), start = String(fd.get('start') || '');
        const created = rule !== 'none' && window.StudyPlanner?.addRecurringAgenda ? window.StudyPlanner.addRecurringAgenda(payload, rule) : [window.StudyDashboard?.addAgenda?.(payload)].filter(Boolean);
        if (/^\d{2}:\d{2}$/.test(start)) created.forEach((r) => r?.id && P.agenda.setStart(r.id, start));
        if (typeof toast === 'function') toast(created.length > 1 ? created.length + ' sessões adicionadas.' : 'Sessão adicionada.');
        cur = U.parseDate(payload.date) || cur;
        P.schedule('agenda');
      }
    }
  };
})();
