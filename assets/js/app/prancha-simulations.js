'use strict';
/* MEUS MAPAS · Prancha · Simulados como ensaio de prova: lista que planeja e resultado que fecha o ciclo. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.simulations) return;
  const U = P.util, ui = P.ui, { esc, fmtMin, fmtSec, fmtNum, plural, pct } = U;
  let screen = 'lista', selKey = '', attemptIdx = 0, qSel = 0, mode = 'lista';
  const CUT_KIND = { oficial: 'oficial', meta: 'meta pessoal', estimativa: 'estimativa' };

  function scopeCourse() {
    const f = String(state.simulationCourseFilter || '');
    if (f) return P.courses.byId(f);
    const pc = P.courses.priority();
    return pc ? pc.course : null;
  }
  function simsFor(courseId) { return P.sims.list().filter((s) => !courseId || String(s.courseId) === String(courseId)); }
  function secColor(name) { const n = U.norm(name); for (const cat of Object.keys({ 'Legislação e Administração': 1, 'Português': 1, 'Arquitetura e Tecnologia': 1, 'Urbanismo e Habitação': 1, 'Raciocínio Lógico e Matemática': 1, 'Informática': 1 })) { const c = U.norm(cat).split(' ')[0]; if (n.includes(c.slice(0, 6))) return P.categoryPigment(cat); } if (/portug|lingua/.test(n)) return P.categoryPigment('Português'); if (/legis|direit|lei|admin|etica/.test(n)) return P.categoryPigment('Legislação e Administração'); if (/urban|habit/.test(n)) return P.categoryPigment('Urbanismo e Habitação'); if (/arquit|tecnol|projet|obra|conforto/.test(n)) return P.categoryPigment('Arquitetura e Tecnologia'); return P.categoryPigment(name); }
  function weekSimSeconds() {
    const start = U.addDays(new Date(), -((new Date().getDay() + 6) % 7));
    let s = 0;
    for (const sim of P.sims.list()) for (const a of P.sims.attempts(sim)) { const t = Date.parse(a.finishedAt || 0) || 0; if (t >= start.getTime()) s += Number(a.durationSeconds) || 0; }
    return s;
  }
  function suggestDay(exam, minutes) {
    const settings = window.StudyPlanner?.settings?.() || { availableDays: [1, 2, 3, 4, 5, 6] };
    const days = exam ? U.daysBetween(new Date(), exam) : 14;
    let best = null, load = Infinity;
    for (let i = 1; i < Math.max(2, days); i++) {
      const d = U.addDays(new Date(), i);
      if (!settings.availableDays.includes(d.getDay())) continue;
      const l = P.agenda.blocks(d).reduce((n, b) => n + b.minutes, 0);
      if (l < load) { best = d; load = l; }
      if (i > 21) break;
    }
    return best;
  }
  function simMenu(r) {
    const k = r.key;
    return ui.menu('s-' + k, [r.attempts.length ? ['Ver resultado', ui.act('result', k)] : null, r.attempts.length ? ['Histórico e desempenho', ui.act('sim-history', k)] : null, ['Gerenciar', ui.act('sim-menu', 'manage|' + k)], ['Trocar capa', ui.act('sim-menu', 'cover|' + k)], ['Vincular a concurso', ui.act('sim-menu', 'link|' + k)], ['Substituir HTML', ui.act('sim-menu', 'replace|' + k)], ['Duplicar', ui.act('sim-menu', 'duplicate|' + k)], ['Exportar', ui.act('sim-menu', 'export|' + k)], ['Excluir', ui.act('sim-menu', 'delete|' + k), 'd']]);
  }

  function renderLista(root, course, rows, tabsHtml) {
    const S = { done: rows.filter((r) => r.attempts.length).length, total: rows.length, questions: rows.reduce((n, r) => n + (Number(r.sim.questions) || 0), 0), best: rows.filter((r) => r.attempts.length).reduce((m, r) => Math.max(m, r.best), -1) };
    const ex = course ? P.courses.examState(course) : null, cut = course ? P.sims.cutoff(course.id) : null;
    const next = rows.find((r) => !r.attempts.length) || rows[0];
    const dur = Number(next?.sim.durationMinutes) || 0;
    const day = next && ex?.phase === 'before' ? suggestDay(ex.date, dur) : null;
    const boards = [...new Set(rows.map((r) => r.sim.board).filter(Boolean))];
    const mistakes = rows.reduce((n, r) => n + ((r.latest?.wrong || 0) + (r.latest?.blank || 0)), 0);
    let v;
    if (!rows.length) v = ui.verdict('n', 'Nenhum simulado ' + (course ? 'neste concurso' : 'importado') + '.', 'Importe um simulado em HTML para treinar no formato da banca.');
    else if (!S.done && ex?.phase === 'before') v = day ? ui.verdict('', 'A prova é em ' + ex.days + ' ' + plural(ex.days, 'dia') + ' e nenhum simulado foi feito.', 'Cabe um simulado completo (' + fmtMin(dur || 180) + ') antes da prova. O dia com menos carga é ' + esc(U.fmtLong(day)) + '.') : ui.verdict('', 'A prova é em ' + ex.days + ' ' + plural(ex.days, 'dia') + ' e nenhum simulado foi feito.', 'Não há um dia disponível antes da prova; um bloco parcial ainda ajuda a calibrar o tempo.');
    else if (!S.done) v = ui.verdict('l', 'Nenhum simulado feito ainda.', 'O resultado mostra a nota contra o corte, o acerto por disciplina e o que revisar.');
    else v = cut ? ui.verdict(S.best >= cut.value ? 'm' : '', 'Melhor nota ' + S.best + '% contra corte de ' + cut.value + '% (' + CUT_KIND[cut.kind] + ').', S.best >= cut.value ? 'Acima do corte.' : 'Faltam ' + Math.round((cut.value - S.best) * 10) / 10 + ' pontos.') : ui.verdict('l', 'Melhor nota ' + S.best + '%.', 'Informe a nota de corte (oficial, meta ou estimativa) para comparar.');
    const single = state.simulationCourseFilter || P.courses.list().filter((c) => simsFor(c.id).length).length <= 1;
    const k = 'Simulados' + (course && single ? ' · ' + P.courses.sigla(course) : ' · todos os concursos') + (boards.length ? ' · ' + boards.join(', ') : '');
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc(k) + '</span><div class="pr-big"><span class="pr-pct pa pr-num">' + S.done + '<small> de ' + S.total + '</small></span><span class="pr-sub">' + plural(S.done, 'simulado feito', 'simulados feitos') + ' · ' + fmtNum(S.questions) + ' questões disponíveis</span></div>' +
      ui.states([['f', S.done, 'var(--pr-latao)'], ['n', S.total - S.done, 'var(--pr-g3)']], S.done + ' de ' + S.total + ' simulados feitos') + ui.legend([['Feitos', S.done, 'var(--pr-latao)'], ['Não iniciados', S.total - S.done, 'var(--pr-g3)', true]]) + v +
      '<div class="pr-row">' + (next ? ui.btn('Fazer ' + esc(P.sims.code(next.sim)) + (dur ? ' · ' + fmtMin(dur) : ''), ui.act('open-sim', next.key), 'p') : ui.btn('Importar simulado', ui.act('import-sim'), 'p')) + (next && day ? ui.btn('Agendar para ' + esc(U.DSEM_LONGO[day.getDay()]), ui.act('schedule-sim', next.key + '|' + U.dateKey(day)), 'g') : '') + '</div></div><div class="pr-c-b">' +
      ui.cell('Prova', ex?.date ? esc(U.fmtDay(ex.date)) : '—', ex?.days !== undefined && ex?.days !== null && ex.days >= 0 && ex.days <= 7 ? 'ox' : '', ex?.date ? (ex.days > 0 ? 'em ' + ex.days + ' ' + plural(ex.days, 'dia') : ex.days === 0 ? 'hoje' : 'realizada') : 'sem data') +
      ui.cell('Por simulado', next ? (Number(next.sim.questions) || '—') + ' q' + (dur ? ' · ' + fmtMin(dur) : '') : '—', '', boards.length ? 'formato ' + esc(boards[0]) : '') +
      ui.cell('Melhor nota', S.done ? S.best + '%' : '—', S.done && cut ? (S.best >= cut.value ? 'ok' : 'ox') : '', S.done ? 'em ' + S.done + ' ' + plural(S.done, 'simulado') : 'sem tentativas') +
      ui.cell('Corte', cut ? cut.value + '%' : '—', cut?.kind === 'oficial' ? '' : 'l', cut ? CUT_KIND[cut.kind] : course ? '<button type="button" class="pr-link" data-pr-act="cut-focus">definir →</button>' : 'escolha um concurso') +
      ui.cell('Erros a revisar', mistakes, mistakes ? 'l' : 'mu', 'nas últimas tentativas') +
      ui.cell('Tempo em simulado', fmtSec(weekSimSeconds()), '', 'esta semana') + '</div></section>';
    let plano = '';
    if (ex?.phase === 'before' && ex.days <= 10) {
      const cells = [];
      for (let i = 0; i <= ex.days; i++) {
        const d = U.addDays(new Date(), i), blocks = P.agenda.blocks(d), isExam = i === ex.days, isDay = day && U.dateKey(d) === U.dateKey(day);
        const simItem = blocks.find((b) => b.item.kind === 'simulation');
        cells.push('<div class="' + (isExam ? 'pv' : isDay || simItem ? 'on' : '') + '"><span class="pr-k' + (isExam ? ' o' : isDay ? ' l' : '') + '">' + U.DSEM[d.getDay()] + ' ' + d.getDate() + '</span><b>' + (isExam ? 'Prova' : simItem ? esc(simItem.item.title) : isDay ? 'Sugestão: ' + esc(P.sims.code(next.sim)) : blocks.length ? 'Plano do dia' : 'Livre') + '</b><span class="pr-mono">' + (isExam ? esc(course.board || '') : blocks.length ? fmtMin(blocks.reduce((n, b) => n + b.minutes, 0)) + ' · ' + blocks.map((b) => (typeof mapById === 'function' && b.item.mapKey ? mapById(b.item.mapKey)?.code : '') || '').filter(Boolean).slice(0, 3).join(', ') : isDay ? fmtMin(dur) : '—') + '</span></div>');
      }
      plano = ui.card(ui.head('Até a prova', 'Onde cada simulado cabe', '<span class="pr-mono">sugestão a partir da agenda · nada é agendado sem você</span>') + '<div class="pr-plano" style="--n:' + Math.min(cells.length, 7) + '">' + cells.join('') + '</div>');
    }
    const cutForm = course ? '<details class="pr-add" data-pr-cut' + (cut ? '' : '') + '><summary>' + (cut ? 'Nota de corte: ' + cut.value + '% · ' + CUT_KIND[cut.kind] : 'Definir a nota de corte de ' + esc(P.courses.sigla(course))) + '</summary><form data-pr-submit="save-cut" data-course="' + esc(course.id) + '" class="pr-row" style="align-items:flex-end"><label class="pr-field"><span>Nota (%)</span><input name="value" type="number" min="1" max="100" step="0.1" inputmode="decimal" required value="' + esc(cut?.value ?? '') + '" style="width:110px"></label><label class="pr-field"><span>Tipo</span><select name="kind"><option value="oficial"' + (cut?.kind === 'oficial' ? ' selected' : '') + '>Oficial (divulgada pela banca)</option><option value="meta"' + (!cut || cut.kind === 'meta' ? ' selected' : '') + '>Meta pessoal</option><option value="estimativa"' + (cut?.kind === 'estimativa' ? ' selected' : '') + '>Estimativa não oficial</option></select></label><button type="submit" class="pr-btn sm">Salvar</button>' + (cut ? ui.btn('Remover', ui.act('clear-cut', course.id), 'g sm') : '') + '</form></details>' : '';
    const filterRow = '<div class="pr-row">' + ui.seg([['', 'Todos os concursos']].concat(P.courses.list().filter((c) => simsFor(c.id).length).map((c) => [String(c.id), P.courses.sigla(c)])), String(state.simulationCourseFilter || ''), 'course-filter', 'Concurso') + (boards.length > 1 ? ui.seg([['', 'Todas as bancas']].concat(boards.map((b) => [b, b])), String(state.simulationBoardFilter || ''), 'board-filter', 'Banca') : '') + '</div>';
    let lib;
    if (mode === 'capas' && typeof simulationCard === 'function') lib = '<div class="simulation-grid pr-legacy-grid" data-pr-legacy-sim>' + rows.map((r) => simulationCard(r.sim)).join('') + '</div>';
    else lib = rows.length ? '<div class="pr-list">' + rows.map((r, i) => '<div class="pr-sr"><span class="n">' + esc(P.sims.code(r.sim)) + '</span><span><b>' + esc(r.sim.title || r.sim.code) + '</b><br><span class="pr-mono">' + esc([r.sim.subtitle, (P.sims.course(r.sim) ? P.courses.sigla(P.sims.course(r.sim)) : ''), r.sim.board].filter(Boolean).join(' · ')) + '</span></span><span class="c"><span>Questões</span><b>' + (Number(r.sim.questions) || '—') + '</b></span><span class="c"><span>Duração</span><b>' + (Number(r.sim.durationMinutes) ? fmtMin(r.sim.durationMinutes) : '—') + '</b></span><span class="c"><span>Melhor</span><b>' + (r.attempts.length ? r.best + '%' : '—') + '</b></span><span class="pr-row" style="flex-wrap:nowrap">' + (r.attempts.length ? ui.btn('Resultado', ui.act('result', r.key), 'g sm') : '') + ui.btn(r.attempts.length ? 'Refazer' : r === next ? 'Fazer agora' : 'Abrir', ui.act('open-sim', r.key), r === next && !r.attempts.length ? 'p sm' : 'sm') + simMenu(r) + '</span></div>').join('') + '</div>' : ui.empty('Nenhum simulado', 'Importe simulados em HTML; eles aparecem aqui com capa, questões e duração.', ui.btn('Importar simulado', ui.act('import-sim'), 'p'));
    root.innerHTML = tabsHtml + filterRow + carimbo + plano + cutForm + ui.card('<div class="pr-vw"><div><span class="pr-k">Biblioteca de simulados</span><h3>' + rows.length + ' ' + plural(rows.length, 'simulado') + (boards.length ? ' · ' + esc(boards.join(', ')) : '') + '</h3></div><div class="pr-row">' + ui.seg([['lista', 'Lista'], ['capas', 'Capas']], mode, 'mode', 'Visualização') + ui.btn('Importar simulado', ui.act('import-sim'), 'g sm') + '</div></div>' + lib);
    const legacy = root.querySelector('[data-pr-legacy-sim]');
    if (legacy && typeof bindSimulationCards === 'function') bindSimulationCards(legacy);
  }

  function renderResultado(root, rows, tabsHtml) {
    const withA = rows.filter((r) => r.attempts.length);
    if (!withA.length) { root.innerHTML = tabsHtml + ui.card(ui.empty('Nenhum resultado ainda', 'Termine um simulado para ver a nota, o acerto por disciplina e o gabarito.', ui.btn('Ver lista', ui.act('screen', 'lista'), 'g'))); return; }
    let r = withA.find((x) => x.key === selKey);
    if (!r) { r = withA.slice().sort((a, b) => (Date.parse(b.latest.finishedAt || 0) || 0) - (Date.parse(a.latest.finishedAt || 0) || 0))[0]; selKey = r.key; attemptIdx = 0; }
    const a = r.attempts[Math.min(attemptIdx, r.attempts.length - 1)], sim = r.sim, course = P.sims.course(sim), cut = course ? P.sims.cutoff(course.id) : null;
    const total = Number(a.total) || 0, correct = Number(a.correct) || 0, wrong = Number(a.wrong) || 0, blank = Number(a.blank) || Math.max(0, total - correct - wrong), score = Math.round(Number(a.score) || pct(correct, total));
    const secs = Object.entries(a.sections || {}).map(([name, v]) => ({ name, correct: Number(v.correct) || 0, total: Number(v.total) || 0 })).filter((x) => x.total).map((x) => ({ ...x, p: pct(x.correct, x.total) })).sort((x, y) => y.total - x.total);
    const best = secs.slice().sort((x, y) => y.p - x.p)[0], worst = secs.slice().sort((x, y) => x.p - y.p)[0];
    const recs = (() => { try { return window.StudyCoach?.recommendations?.(r.key) || []; } catch { return []; } })();
    const dur = Number(a.durationSeconds) || 0, planned = (Number(sim.durationMinutes) || 0) * 60;
    let v;
    if (cut) { const diff = Math.round(((Number(a.score) || pct(correct, total)) - cut.value) * 10) / 10; v = ui.verdict(diff >= 0 ? 'm' : '', (diff >= 0 ? 'Acima' : 'Abaixo') + ' do corte de ' + cut.value + '% (' + CUT_KIND[cut.kind] + ')' + (diff ? ' por ' + Math.abs(diff) + ' ' + plural(Math.abs(diff), 'ponto') : '') + '.', (worst && worst !== best ? esc(worst.name) + ' puxou a nota para baixo (' + worst.p + '%).' : '') + (recs.length ? ' Os erros apontam ' + recs.length + ' ' + plural(recs.length, 'mapa') + ' para revisar.' : '')); }
    else v = ui.verdict('l', 'Nota ' + score + '%.', 'Sem nota de corte informada para ' + (course ? esc(P.courses.sigla(course)) : 'este concurso') + '; defina na lista para comparar. ' + (worst && worst !== best ? esc(worst.name) + ' foi a disciplina mais fraca (' + worst.p + '%).' : ''));
    const attemptSel = r.attempts.length > 1 ? '<label class="pr-field" style="max-width:280px"><span>Tentativa</span><select data-pr-change="attempt">' + r.attempts.map((x, i) => '<option value="' + i + '"' + (i === attemptIdx ? ' selected' : '') + '>' + esc(new Date(x.finishedAt).toLocaleDateString('pt-BR')) + ' · ' + Math.round(Number(x.score) || 0) + '%</option>').join('') + '</select></label>' : '';
    const simSel = withA.length > 1 ? '<label class="pr-field" style="max-width:320px"><span>Simulado</span><select data-pr-change="pick-sim">' + withA.map((x) => '<option value="' + esc(x.key) + '"' + (x.key === r.key ? ' selected' : '') + '>' + esc(P.sims.code(x.sim) + ' · ' + (x.sim.title || '')) + '</option>').join('') + '</select></label>' : '';
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc(P.sims.code(sim) + ' · ' + (sim.title || '') + ' · ' + new Date(a.finishedAt).toLocaleDateString('pt-BR')) + '</span><div class="pr-big"><span class="pr-pct pr-num' + (cut ? (score >= cut.value ? ' ok' : ' ox') : '') + '">' + score + '<small>%</small></span><span class="pr-sub">' + correct + ' certas de ' + total + (dur ? ' · ' + fmtSec(dur) : '') + '</span></div>' +
      ui.states([['c', correct, 'var(--pr-musgo)'], ['e', wrong, 'var(--pr-oxido)'], ['b', blank, 'var(--pr-g3)']], 'Certas, erradas e em branco') + ui.legend([['Certas', correct, 'var(--pr-musgo)'], ['Erradas', wrong, 'var(--pr-oxido)'], ['Em branco', blank, 'var(--pr-g3)', true]]) + v + '</div><div class="pr-c-b">' +
      ui.cell('Certas', correct, 'ok', 'de ' + total) + ui.cell('Erradas', wrong, wrong ? 'ox' : '', 'viram revisões') + ui.cell('Em branco', blank, '', blank ? 'sem resposta' : 'todas respondidas') +
      ui.cell('Tempo', dur ? fmtSec(dur) : '—', '', (planned ? 'de ' + fmtSec(planned) : 'sem duração prevista') + (dur && total ? ' · ' + Math.round(dur / 60 / total * 10) / 10 + ' min/questão' : '')) +
      ui.cell('Melhor disciplina', best ? best.p + '%' : '—', 'l', best ? esc(best.name) : 'sem dados por disciplina') + ui.cell('Pior disciplina', worst ? worst.p + '%' : '—', worst && worst.p < 60 ? 'ox' : '', worst ? esc(worst.name) : '—') + '</div></section>';
    const cats = secs.length ? '<div class="pr-cats">' + secs.map((x) => '<div class="pr-cat" style="--c:' + secColor(x.name) + '"><span class="nm"><i></i><span>' + esc(x.name) + '</span></span><span class="bar"><i style="width:' + x.p + '%"></i></span><span class="v"' + (x.p < 60 ? ' style="color:var(--pr-oxido)"' : '') + '>' + x.p + '% · ' + x.correct + '/' + x.total + '</span></div>').join('') + '</div>' : ui.empty('Sem acerto por disciplina', 'Este simulado não registrou as seções.');
    const grid = P.sims.grid(a);
    const gab = grid ? '<div class="pr-qg">' + grid.map((cel) => '<button type="button" class="' + cel.state + (cel.n === qSel ? ' on' : '') + '" data-pr-act="q" data-arg="' + cel.n + '" aria-label="Questão ' + cel.n + ': ' + (cel.state === 'ok' ? 'certa' : cel.state === 'er' ? 'errada' : 'em branco') + '">' + cel.n + '</button>').join('') + '</div><p class="pr-detail" aria-live="polite">' + qDetail(grid, qSel) + '</p>' : ui.empty('Gabarito por questão indisponível', 'Esta tentativa registrou só os totais; o desenho por questão aparece quando o simulado grava cada erro com o número.');
    const trend = r.attempts.length > 1 ? ui.card(ui.head('Evolução', P.sims.code(sim) + ' · ' + r.attempts.length + ' tentativas') + trendSvg(r.attempts.slice().reverse(), cut)) : '';
    const mistakes = (a.mistakes || []).filter((m) => m.number);
    const errList = recs.length || mistakes.length ? ui.card(ui.head('Depois do simulado', 'Erros que viraram revisões', window.StudyAutomation?.recoverSimulation ? ui.btn('Agendar revisões', ui.act('recover', r.key), 'p sm') : '') + (recs.length ? '<div class="pr-list">' + recs.map((x) => { const m = typeof mapById === 'function' ? mapById(x.key) : null; return '<div class="pr-li" style="--c:' + (m ? P.mapColor(m) : 'var(--pr-latao)') + '"><span class="pr-sig">' + esc(x.code || '') + '</span><span>' + esc(m?.title || '') + '<br><span class="t">' + esc(x.reason || '') + '</span></span>' + ui.btn('Revisar', ui.act('open-map', x.key), 'sm') + '</div>'; }).join('') + '</div>' : '') + (mistakes.length ? '<details class="pr-add"><summary>' + mistakes.length + ' ' + plural(mistakes.length, 'questão errada ou em branco', 'questões erradas ou em branco') + '</summary><div class="pr-list" style="padding:0 12px 12px">' + mistakes.slice(0, 80).map((m) => '<div class="pr-li"><span class="pr-sig" style="--c:' + secColor(m.section) + '">Q' + m.number + '</span><span>' + esc(m.topic || m.section || '') + '<br><span class="t">' + esc((m.userAnswer ? 'marcou ' + m.userAnswer + ' · ' : 'em branco · ') + 'gabarito ' + (m.answer || '—')) + '</span></span><span></span></div>').join('') + '</div></details>' : '')) : '';
    root.innerHTML = tabsHtml + '<div class="pr-row">' + simSel + attemptSel + ui.btn('Histórico completo', ui.act('sim-history', r.key), 'g sm') + '</div>' + carimbo + '<div class="pr-two">' + ui.card(ui.head('Por disciplina', 'Onde acertou e onde errou') + cats) + ui.card(ui.head('Gabarito', 'As ' + total + ' questões', ui.legend([['certa', '', 'var(--pr-musgo)'], ['errada', '', 'var(--pr-oxido)'], ['branco', '', 'var(--pr-g3)', true]])) + gab) + '</div>' + trend + errList;
  }
  function qDetail(grid, n) {
    const c = grid?.find((x) => x.n === n);
    if (!c) return 'Toque numa questão.';
    const m = c.mistake;
    return '<b>Questão ' + n + '</b> · ' + (c.state === 'ok' ? 'certa' : c.state === 'er' ? 'errada · marcou ' + esc(m.userAnswer) + ', gabarito ' + esc(m.answer || '—') : 'em branco · gabarito ' + esc(m?.answer || '—')) + (m?.section ? ' · ' + esc(m.section) : '') + (m?.topic ? ' · ' + esc(m.topic) : '');
  }
  function trendSvg(list, cut) {
    const W = 600, H = 170, L = 34, R = 14, T = 14, B = 26, n = list.length;
    const x = (i) => L + (n === 1 ? 0.5 : i / (n - 1)) * (W - L - R), y = (v) => T + (1 - v / 100) * (H - T - B);
    let g = [0, 50, 100].map((t) => '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="rgba(236,226,208,.06)"/><text x="' + (L - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end">' + t + '</text>').join('');
    if (cut) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(cut.value) + '" y2="' + y(cut.value) + '" stroke="var(--pr-oxido)" stroke-dasharray="4 4"/><text x="' + (W - R) + '" y="' + (y(cut.value) - 5) + '" text-anchor="end" style="fill:var(--pr-oxido)">corte ' + cut.value + '%</text>';
    g += '<path d="' + list.map((a, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(Number(a.score) || 0).toFixed(1)).join(' ') + '" fill="none" stroke="var(--pr-latao)" stroke-width="2"/>';
    g += list.map((a, i) => '<circle cx="' + x(i) + '" cy="' + y(Number(a.score) || 0) + '" r="4" fill="var(--pr-latao)"/><text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + new Date(a.finishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + '</text>').join('');
    return '<div class="pr-chart" tabindex="0" role="region" aria-label="Notas das tentativas (role para os lados)"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Notas das tentativas">' + g + '</svg></div>';
  }

  function render(root) {
    const course = state.simulationCourseFilter ? P.courses.byId(state.simulationCourseFilter) : null;
    let list = simsFor(state.simulationCourseFilter || '');
    if (state.simulationBoardFilter) list = list.filter((s) => String(s.board || '') === String(state.simulationBoardFilter));
    const rows = list.map((s) => { const a = P.sims.attempts(s); return { sim: s, key: P.sims.key(s), attempts: a, latest: a[0] || null, best: a.length ? Math.max(...a.map((x) => Math.round(Number(x.score) || 0))) : null }; });
    const anyRes = rows.some((r) => r.attempts.length);
    const tabsHtml = ui.top({ eyebrow: 'Treino de prova', title: 'Simulados', tabs: [{ id: 'lista', label: 'Lista' }, { id: 'res', label: 'Resultado', disabled: !anyRes }], active: screen === 'res' && anyRes ? 'res' : 'lista', label: 'Simulados', tabAct: 'screen' });
    if (screen === 'res' && anyRes) renderResultado(root, rows, tabsHtml);
    else renderLista(root, course || scopeCourse(), rows, tabsHtml);
  }

  P.pages.simulations = {
    render,
    actions: {
      screen: (id) => { screen = id; P.schedule('simulations'); window.scrollTo({ top: 0 }); },
      mode: (id) => { mode = id; P.schedule('simulations'); },
      result: (key) => { selKey = key; attemptIdx = 0; qSel = 0; screen = 'res'; P.schedule('simulations'); window.scrollTo({ top: 0 }); },
      'course-filter': (id) => { state.simulationCourseFilter = id; const sel = document.getElementById('simulationCourseFilter'); if (sel) sel.value = id; P.schedule('simulations'); },
      'board-filter': (id) => { state.simulationBoardFilter = id; const sel = document.getElementById('simulationBoardFilter'); if (sel) sel.value = id; P.schedule('simulations'); },
      attempt: (v) => { attemptIdx = Number(v) || 0; qSel = 0; P.schedule('simulations'); },
      'pick-sim': (v) => { selKey = v; attemptIdx = 0; qSel = 0; P.schedule('simulations'); },
      q: (n, el, root) => { qSel = Number(n); root.querySelectorAll('.pr-qg button').forEach((b) => b.classList.toggle('on', b.dataset.arg === String(n))); const r = P.sims.list().find((s) => P.sims.key(s) === selKey); const a = r ? P.sims.attempts(r)[attemptIdx] : null; const d = root.querySelector('.pr-qg + .pr-detail'); if (d) d.innerHTML = qDetail(P.sims.grid(a), qSel); },
      'sim-menu': (arg) => { const i = String(arg).indexOf('|'); const action = arg.slice(0, i), key = arg.slice(i + 1); if (typeof handleSimulationMenuAction === 'function') handleSimulationMenuAction(action, key); },
      'cut-focus': (a, el, root) => { const d = root.querySelector('[data-pr-cut]'); if (d) { d.open = true; d.querySelector('input')?.focus(); d.scrollIntoView({ block: 'center', behavior: 'smooth' }); } },
      'save-cut': (fd, form) => { const ok = P.sims.setCutoff(form.dataset.course, fd.get('value'), fd.get('kind')); if (typeof toast === 'function') toast(ok ? 'Nota de corte salva.' : 'Informe uma nota entre 1 e 100.'); P.schedule('simulations'); },
      'clear-cut': (id) => { P.sims.clearCutoff(id); P.schedule('simulations'); },
      'schedule-sim': (arg) => {
        const [key, date] = String(arg).split('|'), sim = P.sims.list().find((s) => P.sims.key(s) === key);
        if (!sim || !window.StudyDashboard?.addAgenda) return;
        const row = window.StudyDashboard.addAgenda({ date, kind: 'simulation', title: P.sims.code(sim) + ' · ' + (sim.board || 'Simulado'), minutes: Number(sim.durationMinutes) || 180 });
        if (row?.id) P.agenda.setStart(row.id, '09:00');
        if (typeof toast === 'function') toast('Simulado agendado para ' + U.fmtLong(U.parseDate(date)) + ', 09:00.');
        P.schedule('simulations');
      },
      recover: (key) => { const sim = P.sims.list().find((s) => P.sims.key(s) === key); const a = sim ? P.sims.attempts(sim)[attemptIdx] : null; let r = null; try { r = window.StudyAutomation.recoverSimulation(key, a || {}); } catch (e) { console.warn(e); } if (typeof toast === 'function') toast(r && (r.topics || r.maps) ? 'Revisões agendadas: ' + (r.topics || 0) + ' tópicos em ' + (r.maps || 0) + ' mapas.' : 'Nenhuma revisão nova: a recuperação está desligada em Configurações ou já foi feita.'); }
    }
  };
})();
