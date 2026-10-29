'use strict';
/* MEUS MAPAS · Prancha · Cursos: quadro de concursos pela data da prova e o curso com a planta do edital como menu. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.courses) return;
  const U = P.util, ui = P.ui, { esc, fmtMin, fmtSec, fmtDay, fmtNum, plural, pct } = U;
  const VKEY = 'studyapp.prancha.courseView';
  let pickKey = '', showArchived = false;
  const viewMode = () => { try { return localStorage.getItem(VKEY) || 'lista'; } catch { return 'lista'; } };

  function statusChip(s) {
    const ex = s.exam, h = s.health;
    if (P.courses.isArchived(s.course)) return '<span class="pr-chip">arquivado</span>';
    if (P.courses.closure(s.course.id).aguardandoAt) return '<span class="pr-chip l">aguardando convocação</span>';
    const cls = h?.status === 'risk' ? 'ox' : h?.status === 'healthy' ? 'ok' : h?.status === 'attention' ? 'l' : '';
    const label = ex.phase === 'after' ? 'prova realizada' : ex.phase === 'nodate' ? 'sem data de prova' : (h?.label || 'sem dados').toLowerCase();
    return '<span class="pr-chip ' + cls + '">' + esc(label) + '</span>';
  }
  function courseMenu(c) {
    const archived = P.courses.isArchived(c);
    return ui.menu('c-' + c.id, [
      ['Gerenciar curso', ui.act('manage-course', c.id)],
      typeof courseHasEdital === 'function' && courseHasEdital(c) ? ['Abrir edital', ui.act('course-edital', c.id)] : null,
      [archived ? 'Reativar curso' : 'Arquivar curso', ui.act('archive', c.id), archived ? '' : 'd']
    ]);
  }
  /* V15.60 · planta da linha do curso: lotes com a sigla legível, em várias fileiras, na altura da capa */
  function crPlanta(s) {
    const list = s.maps;
    if (!list.length) return '<div class="pr-crp vazio"><span class="pr-k">Planta do edital</span><p>Nenhum mapa importado ainda</p></div>';
    const done = list.filter((m) => { const p = P.data.prog(m); return p.total > 0 && p.marked >= p.total; }).length;
    return '<div class="pr-crp"><span class="pr-k">Planta do edital · ' + list.length + ' ' + plural(list.length, 'mapa') + ' · ' + done + ' ' + plural(done, 'fechado') + '</span><div class="pr-crp-t" role="img" aria-label="' + esc('Planta: ' + list.length + ' mapas, ' + done + ' fechados') + '">' + list.map((m) => { const p = P.data.prog(m), pc = U.pct(p.marked, p.total); return '<i style="--w:' + Math.max(4, p.total || 4) + ';--p:' + pc + '%;--c:' + P.mapColor(m) + '" title="' + esc((m.code || '') + ' · ' + (m.shortTitle || m.title || '') + ' · ' + pc + '%') + '"><b>' + esc(m.code || '') + '</b></i>'; }).join('') + '</div></div>';
  }
  function crRow(s, primary) {
    const c = s.course, p = s.progress, ex = s.exam;
    return '<div class="pr-cr' + (P.courses.isArchived(c) ? ' archived' : '') + '" style="--c:' + s.color + '">' + ui.courseCov(c) +
      '<div style="display:grid;gap:6px;min-width:0"><div class="pr-row">' + statusChip(s) + '</div><h3>' + esc(c.title) + '</h3><span class="pr-mono">' + esc(P.courses.label(c) || c.city || '') + '</span>' +
      '<div class="pr-cells"><div><span>Prova</span><b class="' + (ex.days !== null && ex.days >= 0 && ex.days < 15 ? 'ox' : '') + '">' + esc(ex.date ? U.fmtDayYear(ex.date) : 'sem data') + '</b></div><div><span>Progresso</span><b>' + pct(p.marked, p.total) + '%</b></div><div><span>Tópicos</span><b>' + fmtNum(p.marked) + '/' + fmtNum(p.total) + '</b></div><div><span>Mapas</span><b>' + s.maps.length + '</b></div></div></div>' +
      crPlanta(s) + '<div class="pr-row">' + ui.btn('Entrar', ui.act('open-course', c.id), primary ? 'p' : 'g') + courseMenu(c) + '</div></div>';
  }

  /* V15.58 · linha do tempo: fases de cada concurso não arquivado numa faixa de 4 meses */
  function timeline(S) {
    const t0 = U.addDays(new Date(), -14), t1 = U.addDays(t0, 135), span = U.daysBetween(t0, t1);
    const x = (d) => Math.max(0, Math.min(100, (U.daysBetween(t0, d) / span) * 100));
    const lanes = S.filter((s) => !P.courses.isArchived(s.course)).map((s) => ({ s, ev: P.editais.fases(s.course).filter((f) => f.date && f.date >= t0 && f.date <= t1) })).filter((l) => l.ev.length);
    if (!lanes.length) return '';
    const prazo = new Set(['recursos', 'inscricoes']);
    let months = '';
    for (let d = new Date(t0.getFullYear(), t0.getMonth() + 1, 1); d < t1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months += '<span class="mo" style="left:' + x(d) + '%">' + U.MESES[d.getMonth()] + '</span>';
    const rows = lanes.map(({ s, ev }) => '<div class="ln" style="--c:' + s.color + '"><button type="button" class="nm" data-pr-act="open-course" data-arg="' + esc(s.id) + '">' + esc(s.sigla) + '</button><div class="tr">' + (ev.length > 1 ? '<span class="run" style="left:' + x(ev[0].date) + '%;width:' + (x(ev[ev.length - 1].date) - x(ev[0].date)) + '%"></span>' : '') + ev.map((f, i) => '<span class="ev' + (f.status === 'passada' ? ' done' : '') + (prazo.has(f.id) ? ' pz' : '') + (i % 2 ? ' lo' : '') + '" style="left:' + x(f.date) + '%" title="' + esc(f.label + ' · ' + U.fmtDayYear(f.date)) + '"><i></i><span>' + esc(f.label.split(' ')[0] + ' ' + fmtDay(f.date)) + '</span></span>').join('') + '</div></div>').join('');
    return ui.card(ui.head('Linha do tempo dos concursos', 'Fases de cada edital, de ' + esc(fmtDay(t0)) + ' a ' + esc(U.fmtDayYear(t1)), '<span class="pr-mono">datas da Régua do edital de cada curso</span>') + '<div class="pr-tlc" role="group" aria-label="Linha do tempo das fases dos concursos"><div class="hd">' + months + '<span class="hj" style="left:' + x(new Date()) + '%"><b>hoje</b></span></div>' + rows + '</div>');
  }
  function renderList(root) {
    const all = P.courses.list(), S = all.map((c) => P.courses.summary(c)), active = S.filter((s) => !P.courses.isRetired(s.course)), archived = S.filter((s) => P.courses.isRetired(s.course));
    active.sort((a, b) => { const k = (x) => (x.exam.days === null ? 1e6 : x.exam.days < 0 ? 1e5 - x.exam.days : x.exam.days); return k(a) - k(b); });
    const top = ui.top({ eyebrow: 'Cursos', title: 'Meus Cursos', desc: 'Concursos pela data da prova, cada um com a planta do seu edital.', right: ui.btn('+ Novo concurso', ui.act('new-course'), 'p') });
    if (!all.length) { root.innerHTML = top + ui.card(ui.empty(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Nenhum concurso ainda' : 'Sua biblioteca está desconectada', typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Crie um concurso e importe os mapas do edital.' : 'Entre na sua conta em Configurações para carregar seus concursos.', ui.btn(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Novo concurso' : 'Abrir Configurações', ui.act(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'new-course' : 'nav', 'settings'), 'p'))); return; }
    const maps = active.flatMap((s) => s.maps), gp = P.data.agg(maps);
    const fut = active.filter((s) => s.exam.phase === 'before' || s.exam.phase === 'today');
    const risk = active.filter((s) => s.health?.status === 'risk'), nod = active.filter((s) => s.exam.phase === 'nodate'), ok = active.filter((s) => s.health?.status === 'healthy');
    const goals = P.time.goals();
    const v = fut[0] ? ui.verdict(fut[0].health?.status === 'risk' ? '' : 'l', 'A próxima prova é ' + esc(fut[0].sigla) + (fut[0].exam.days === 0 ? ', hoje.' : ', em ' + fut[0].exam.days + ' ' + plural(fut[0].exam.days, 'dia') + '.'), 'Faltam ' + fmtNum(fut[0].progress.total - fut[0].progress.marked) + ' dos ' + fmtNum(fut[0].progress.total) + ' tópicos. ' + esc(fut[0].health?.message || '')) : ui.verdict('n', 'Nenhuma prova futura marcada.', 'Defina a data em Gerenciar curso para o plano calcular o ritmo.');
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">Meus Cursos · ' + active.length + ' ' + plural(active.length, 'concurso') + ' · ' + maps.length + ' mapas</span><div class="pr-big"><span class="pr-pct pr-num">' + pct(gp.marked, gp.total) + '<small>%</small></span><span class="pr-sub">' + fmtNum(gp.marked) + ' de ' + fmtNum(gp.total) + ' tópicos marcados</span></div>' +
      ui.states(active.map((s) => [s.sigla, s.progress.marked, s.color]).concat([['pend', gp.total - gp.marked, 'var(--pr-g3)']]), 'Progresso por concurso') + ui.legend(active.map((s) => [s.sigla, fmtNum(s.progress.marked) + '/' + fmtNum(s.progress.total), s.color])) + v + '</div><div class="pr-c-b">' +
      ui.cell('Próxima prova', fut[0] ? esc(fmtDay(fut[0].exam.date)) : '—', fut[0] && fut[0].exam.days < 15 ? 'ox' : '', fut[0] ? esc(fut[0].sigla + ' · ' + (fut[0].course.board || '')) : 'sem data marcada') +
      ui.cell('Em risco', risk.length, risk.length ? 'ox' : 'ok', risk.length ? esc(risk.map((s) => s.sigla).join(', ')) : 'nenhum') +
      ui.cell('Sem data', nod.length, nod.length ? 'l' : 'mu', nod.length ? 'defina para o plano calcular' : 'todos com data') +
      ui.cell('Em dia', ok.length, ok.length ? 'ok' : 'mu', ok.length ? esc(ok.map((s) => s.sigla).join(', ')) : '—') +
      ui.cell('Mapas', maps.length, '', active.reduce((n, s) => n + s.mapsDone, 0) + ' concluídos') +
      ui.cell('Hoje', fmtSec(P.time.today()), '', 'meta ' + fmtMin(goals.daily)) + '</div></section>';
    const list = active.map((s, i) => crRow(s, i === 0)).join('') || ui.empty('Nenhum concurso em estudo', 'Os concursos encerrados (arquivados ou com prova realizada) estão abaixo.');
    const arch = archived.length ? ui.card(ui.head('Encerrados', archived.length + ' ' + plural(archived.length, 'concurso'), ui.btn(showArchived ? 'Ocultar' : 'Mostrar', ui.act('toggle-archived'), 'g sm')) + (showArchived ? '<div style="display:grid;gap:10px">' + archived.map((s) => crRow(s, false)).join('') + '</div>' : '<p style="font-size:var(--fs-body-sm)">Arquivados ou com a prova já realizada: ficam fora do Início, do plano e das revisões. Mapas, progresso e histórico continuam guardados — reative pelo menu ⋯ ou informe uma nova data de prova em Gerenciar curso.</p>')) : '';
    root.innerHTML = top + carimbo + timeline(S) + ui.head('Concursos pela data da prova', 'Cada concurso numa linha, com a sua planta') + '<div style="display:grid;gap:10px">' + list + '</div>' + arch;
  }

  /* ---------- curso ---------- */
  function topicsOf(m, limit = 6) {
    const st = (typeof readMapState === 'function' ? readMapState(m).topicStates : null) || {}, key = P.data.keyOf(m);
    const idx = ((typeof state !== 'undefined' && state.searchIndex?.items) || []).filter((it) => it.topicId && (it.mapKey === key || String(it.mapCode || '').toLowerCase() === String(m.code || '').toLowerCase()));
    if (!idx.length) return '';
    const rest = idx.length - limit;
    return '<div class="pr-tps">' + idx.slice(0, limit).map((it, i) => { const s = st[it.topicId]; return '<div><i class="' + (s === 'done' ? 'ok' : s === 'review' ? 'rv' : s === 'difficult' ? 'df' : '') + '"></i><span>' + (i + 1) + '. ' + esc(it.title || it.label || it.topicId) + '</span></div>'; }).join('') + (rest > 0 ? '<div><i></i><span style="color:var(--pr-papel-3)">+ ' + rest + ' tópicos</span></div>' : '') + '</div>';
  }
  function actionLabel(p) { return p.total > 0 && p.marked >= p.total ? 'Revisar' : p.marked ? 'Continuar do tópico ' + (p.marked + 1) : 'Começar'; }
  function pickPanel(m, course, folha) {
    if (!m) return ui.card(ui.empty('Escolha um lote', 'Toque num mapa da planta para ver o detalhe.'), 'pr-pick');
    const p = P.data.prog(m), k = P.data.keyOf(m), sec = Number(window.StudyTime?.mapSeconds?.(k) || 0);
    const linked = P.links.courses(k), others = P.courses.list().filter((c) => String(c.id) !== String(m.courseId) && !P.courses.isArchived(c));
    const origin = m._linkedFrom ? P.courses.byId(m._linkedFrom) : null;
    const share = others.length ? '<details class="pr-add"><summary>Compartilhar com outro concurso</summary><form data-pr-submit="link" data-key="' + esc(k) + '"><p style="font-size:var(--fs-caption)">O mapa aparece no outro concurso sem duplicar o HTML; o progresso continua um só, identificado pelo curso de origem.</p><label class="pr-field"><span>Concurso</span><select name="course">' + others.map((c) => '<option value="' + esc(c.id) + '"' + (linked.includes(String(c.id)) ? ' disabled' : '') + '>' + esc(P.courses.sigla(c) + ' · ' + c.title) + (linked.includes(String(c.id)) ? ' (já vinculado)' : '') + '</option>').join('') + '</select></label><button type="submit" class="pr-btn sm">Vincular</button>' + (linked.length ? '<div class="pr-list">' + linked.map((id) => { const c = P.courses.byId(id); return c ? '<div class="pr-li"><span class="pr-sig" style="--c:' + P.courses.color(c) + '">' + esc(P.courses.sigla(c)) + '</span><span>' + esc(c.title) + '</span>' + ui.btn('Desvincular', ui.act('unlink', k + '|' + id), 'g sm') + '</div>' : ''; }).join('') + '</div>' : '') + '</form></details>' : '';
    return ui.card('<span class="pr-k">' + esc((folha || '') + ' · ' + (m.category || '')) + '</span>' + ui.mapCov(m) + '<h3>' + esc(m.title) + '</h3>' + ui.stbar(p, 6) + '<span class="pr-mono">' + p.marked + '/' + p.total + ' tópicos · ' + ui.mapState(p) + ' · ' + (sec ? fmtSec(sec) + ' de estudo' : 'ainda não estudado') + '</span>' + (origin ? '<span class="pr-chip l">compartilhado de ' + esc(P.courses.sigla(origin)) + '</span>' : '') + topicsOf(m) + '<div class="pr-row">' + ui.btn(actionLabel(p), ui.act('open-map', k), 'p') + (m._linkedFrom ? '' : ui.btn('Gerenciar', ui.act('manage-map', k), 'g sm')) + '</div>' + alcanceSeg(m) + share, 'pr-pick');
  }
  /* ---------- V15.56 · régua do edital e raio-x da prova ---------- */
  const E = P.editais;
  function regua(c) {
    const fases = E.fases(c), atual = fases.find((f) => f.status === 'atual');
    const cells = fases.map((f) => '<li class="' + f.status + '"><span class="t">' + esc(f.label) + '</span><span class="d">' + (f.date ? esc(U.fmtDayYear(f.date)) : 'sem data') + '</span>' + (f.status === 'atual' ? '<span class="pr-chip l">agora</span>' : '') + '</li>').join('');
    const next = E.proximoMarco(c);
    const note = next ? 'Próximo marco: <b>' + esc(next.label) + '</b> ' + (next.days === 0 ? 'hoje' : 'em ' + next.days + ' ' + plural(next.days, 'dia')) + ' (' + esc(fmtDay(next.date)) + ').' : atual ? 'Fase atual: ' + esc(atual.label.toLowerCase()) + '.' : 'Informe as datas do cronograma para acompanhar o concurso até a convocação.';
    const e = E.get(c.id) || {};
    const form = '<details class="pr-add"><summary>Editar cronograma</summary><form data-pr-submit="save-fases" data-course="' + esc(c.id) + '"><p class="pr-mono">A data da prova vem de Gerenciar curso. As demais saem do cronograma do edital; deixe em branco o que ainda não foi divulgado.</p><div class="pr-fgrid">' +
      E.FASES.filter(([id]) => id !== 'prova').map(([id, label]) => '<label class="pr-field"><span>' + esc(label) + '</span><input type="date" name="' + id + '" value="' + esc(e.fases?.[id]?.date || '') + '"></label>').join('') + '</div><button type="submit" class="pr-btn sm">Salvar cronograma</button></form></details>';
    return ui.card(ui.head('Régua do edital', 'Fases do concurso', '', 'l') + '<ol class="pr-regua" aria-label="Fases do concurso">' + cells + '</ol><p class="pr-detail">' + note + '</p>' + form, 'pr-regua-card');
  }
  /* V15.62 · Raio-X por edital: disciplinas e blocos com mínimo em pontos, acertos ou %, certo/errado com desconto,
     escalas da FCC, etapas (discursiva, prática, títulos) e a fórmula da nota final. Cada edital monta a prova do seu jeito. */
  const fpt = (n) => E.fmtPt(n);
  const UN = [['pontos', 'pontos'], ['acertos', 'acertos'], ['pct', '%']];
  const opt = (list, cur) => list.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  const fld = (label, html, cls = '') => '<label class="pr-field' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' + html + '</label>';
  const numIn = (name, v, ph = '') => '<input name="' + name + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(v ?? '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>';
  const unTxt = (v, em) => (em === 'acertos' ? fpt(v) + ' ac.' : em === 'pct' ? fpt(v) + '%' : fpt(v) + ' pts');
  let corEsc = null, corAtual = null;
  function discRow(d, i, grupos) {
    return '<div class="pr-fgrid d" data-row="' + i + '">' + fld('Disciplina' + (d.nova ? ' (nova)' : ''), '<input name="nome' + i + '" value="' + esc(d.nome || '') + '" maxlength="80"' + (d.nova ? ' placeholder="Opcional"' : '') + '>') + fld('Bloco', '<input name="grupo' + i + '" value="' + esc(d.grupo || '') + '" maxlength="60" list="pr-grupos" placeholder="—">') + fld('Questões', '<input name="questoes' + i + '" type="number" min="0" inputmode="numeric" value="' + esc(d.questoes ?? '') + '">') + fld('Pts/questão', numIn('peso' + i, d.peso ?? 1)) + fld('Mínimo', numIn('minimo' + i, d.minimo)) + fld('Mínimo em', '<select name="minimoEm' + i + '">' + opt(UN, d.minimoEm || 'pontos') + '</select>') + fld('Cor', '<select name="cor' + i + '" class="pr-cor-sel"' + (corAtual?.[d.id] ? ' style="--c:' + corAtual[d.id] + '"' : '') + '>' + opt([['', 'automática']].concat(E.PIG_FILA.filter((n) => P.pigments[n]).map((n) => [n, n.charAt(0).toUpperCase() + n.slice(1)])), (corEsc || {})[d.id] || '') + '</select>') + '<input type="hidden" name="id' + i + '" value="' + esc(d.id || '') + '"></div>';
  }
  function etapaRow(x, i) {
    return '<div class="pr-fgrid et">' + fld('Etapa', '<select name="et_tipo' + i + '"><option value="">—</option>' + opt(E.ETAPAS, x.tipo || '') + '</select>') + fld('Nome', '<input name="et_nome' + i + '" value="' + esc(x.nome || '') + '" maxlength="80" placeholder="Ex.: Estudo de caso">') + fld('Vale até', numIn('et_max' + i, x.max)) + fld('Mínimo', numIn('et_min' + i, x.minimo)) + fld('Mínimo em', '<select name="et_minEm' + i + '">' + opt([['pontos', 'pontos'], ['pct', '%']], x.minimoEm || 'pontos') + '</select>') + fld('Caráter', '<select name="et_car' + i + '">' + opt([['EC', 'elimin. e classif.'], ['E', 'eliminatório'], ['C', 'classificatório']], x.carater || 'EC') + '</select>') + fld('Peso na final', numIn('et_peso' + i, x.peso, '1')) + '</div>';
  }
  function provaForm(c, prova, e, cats, maps = []) {
    const rg = E.regrasDe(e, prova);
    corEsc = e.cores || {}; corAtual = prova.length ? E.cores(c.id) : {};
    const blank = () => ({ id: '', nome: '', grupo: '', questoes: '', peso: 1, minimo: '', minimoEm: 'pontos', nova: true });
    const rows = (prova.length ? prova : []).concat([blank(), blank(), blank()]);
    const nomesG = [...new Set(prova.map((d) => d.grupo).filter(Boolean))];
    const disc = '<datalist id="pr-grupos">' + ['Conhecimentos Básicos', 'Conhecimentos Gerais', 'Conhecimentos Específicos', 'Módulo I', 'Módulo II', 'P1', 'P2'].concat(nomesG).map((g) => '<option value="' + esc(g) + '">').join('') + '</datalist>' + rows.map((d, i) => discRow(d, i, nomesG)).join('');
    const blocos = rg.grupos.length ? '<span class="pr-k">Mínimo e peso de cada bloco</span>' + rg.grupos.map((g, j) => '<div class="pr-fgrid">' + fld(esc(g.nome), '<input type="hidden" name="g_nome' + j + '" value="' + esc(g.nome) + '">' + numIn('g_min' + j, g.minimo || '')) + fld('Mínimo em', '<select name="g_minEm' + j + '">' + opt(UN, g.minimoEm) + '</select>') + fld('Peso do bloco (FCC)', numIn('g_peso' + j, g.peso === 1 ? '' : g.peso, '1')) + '</div>').join('') : '<p class="pr-mono">Dica: preencha “Bloco” (ex.: Conhecimentos Básicos / Específicos, Módulo I / II, P1 / P2) quando o edital tiver mínimo por bloco; ao salvar, os campos de mínimo do bloco aparecem aqui.</p>';
    const etapas = rg.etapas.concat([{}, {}]);
    const regras = '<span class="pr-k">Regras da objetiva</span><div class="pr-fgrid">' + fld('Banca', '<input name="banca" value="' + esc(e.banca || '') + '" maxlength="40" placeholder="Ex.: AOCP">') + fld('Mínimo geral', numIn('minimoGeral', e.minimoGeral)) + fld('Mínimo geral em', '<select name="minimoGeralEm">' + opt(UN, rg.minimoGeralEm) + '</select>') + fld('Formato', '<select name="formato">' + opt([['multipla', 'múltipla escolha'], ['certo-errado', 'certo / errado']], rg.formato) + '</select>') + fld('Desconto por erro', numIn('penalidade', rg.penalidade || '', '0'), 'pr-pen') + fld('Escala da nota', '<select name="escala">' + opt(E.ESCALAS, rg.escala) + '</select>') + '<label class="pr-field pr-check"><input type="checkbox" name="naoZerar"' + (rg.naoZerar ? ' checked' : '') + '><span>Elimina quem zerar qualquer disciplina</span></label></div>' +
      '<span class="pr-k">Outras etapas (discursiva, prática, títulos)</span>' + etapas.map(etapaRow).join('') +
      '<div class="pr-fgrid">' + fld('Nota final', '<select name="notaFinal">' + opt(E.NOTAS_FINAIS, rg.notaFinal) + '</select>') + fld('Peso da objetiva na final', numIn('pesoObjetiva', rg.pesoObjetiva, '1')) + fld('Fonte', '<input name="fonte" value="' + esc(e.fonte || '') + '" maxlength="160" placeholder="Ex.: edital, Anexo III">') + '</div>';
    const link = prova.length && cats.length ? '<span class="pr-k">Categoria dos mapas → disciplina</span><div class="pr-fgrid">' + cats.map((cat, j) => { const cur = E.disciplinaDoMapa({ category: cat }, c.id); return fld(esc(cat), '<select name="cat' + j + '" data-cat="' + esc(cat) + '">' + prova.map((d) => '<option value="' + esc(d.id) + '"' + (cur?.id === d.id ? ' selected' : '') + '>' + esc(d.nome) + '</option>').join('') + '</select>'); }).join('') + '</div>' : '';
    /* V15.62 · cada mapa → disciplina: automático (categoria ou conteúdo) ou escolha fixa */
    const md = e.mapaDisciplina || {}, auto = prova.length ? E.autoMapas(c.id) : {};
    const mlist = prova.length ? maps.filter((m) => m.code).map((m, j) => { const code = String(m.code).toUpperCase(), fixo = md[code] || '', atual = E.disciplinaDoMapa({ ...m, _key: P.data.keyOf(m), code: '' }, c.id); return fld(esc(m.code) + ' · ' + esc(String(m.title || '').slice(0, 40)), '<input type="hidden" name="mm_code' + j + '" value="' + esc(code) + '"><select name="mm' + j + '"><option value="">automático → ' + esc(atual ? atual.nome : '—') + (auto[P.data.keyOf(m)] && atual && !atual.categorias.includes(String(m.category || '')) ? ' (conteúdo)' : '') + '</option>' + prova.map((d) => '<option value="' + esc(d.id) + '"' + (fixo === d.id ? ' selected' : '') + '>' + esc(d.nome) + '</option>').join('') + '</select>'); }) : [];
    const mapasSec = mlist.length ? '<span class="pr-k">Mapas → disciplina</span><p class="pr-mono">Automático usa a categoria do mapa ou, sem ela, o conteúdo do mapa comparado ao programa do edital. Escolha uma disciplina para fixar.</p><div class="pr-fgrid">' + mlist.join('') + '</div>' : '';
    const cargo = e.cargo || {};
    const ficha = mapasSec + '<span class="pr-k">Ficha do cargo (opcional)</span><div class="pr-fgrid">' + [['vagas', 'Vagas'], ['carga', 'Carga horária'], ['vencimento', 'Vencimento'], ['validade', 'Validade do concurso'], ['desempate', 'Desempate']].map(([k, l]) => fld(l, '<input name="cargo_' + k + '" value="' + esc(cargo[k] || '') + '" maxlength="120">')).join('') + '</div>';
    return '<form data-pr-submit="save-prova" data-course="' + esc(c.id) + '" data-n="' + rows.length + '" data-ng="' + rg.grupos.length + '" data-ne="' + etapas.length + '" data-cats="' + esc(JSON.stringify(cats)) + '" data-nm="' + mlist.length + '"><p class="pr-mono">Copie o quadro de provas do edital: uma linha por componente, do jeito que a banca escreve. Linha sem nome é ignorada; para remover uma disciplina, apague o nome.</p>' + disc + blocos + regras + link + ficha + '<div class="pr-row"><button type="submit" class="pr-btn sm">Salvar estrutura</button>' + ui.btn('Ler o PDF do edital', ui.act('edital-pdf', c.id), 'g sm') + ui.btn('Importar .json', ui.act('import-kit', c.id), 'g sm') + (prova.length ? ui.btn('Remover estrutura', ui.act('clear-prova', c.id), 'g sm') : '') + '</div></form>';
  }
  /* estrutura gravada de uma banca, curso de outra: foi o que deixou a CASAN (AOCP) com a prova do DEMHAB (FUNDATEC) */
  function bancaDiverge(c, e) {
    const b = U.norm(c.board || ''), eb = U.norm(e.banca || '');
    if (b && eb) return !b.includes(eb) && !eb.includes(b) ? e.banca : '';
    const m = /(FUNDATEC|AOCP|FGV|CEBRASPE|CESPE|VUNESP|FCC|OBJETIVA|FEPESE|IBAM|IBFC|QUADRIX|LEGALLE|LA ?SALLE|FURB|FAU|IBADE|CONSULPLAN|CESGRANRIO)/i.exec(e.fonte || '');
    return b && m && !b.includes(U.norm(m[1])) ? m[1].toUpperCase() : '';
  }
  const ET_TXT = { E: 'eliminatória', C: 'classificatória', EC: 'eliminatória e classificatória' };
  /* V15.62 · leitura do PDF do edital aguardando conferência (por curso, só nesta sessão) */
  const leituras = new Map();
  function leituraPanel(c) {
    const st = leituras.get(String(c.id));
    if (!st) return '';
    if (st.lendo) return '<div class="pr-leitura"><span class="pr-k l">Lendo o edital</span><p class="pr-detail">' + esc(st.msg || 'Abrindo o PDF…') + '</p></div>';
    if (st.erro) return '<div class="pr-leitura"><span class="pr-k">Leitura do edital</span>' + ui.verdict('', 'Não deu para ler o quadro de provas.', esc(st.erro)) + '<div class="pr-row">' + ui.btn('Fechar', ui.act('descartar-leitura', c.id), 'g sm') + '</div></div>';
    const p = st.plan, R = window.MeusMapasEditalReader;
    if (!p.prova.length) return '<div class="pr-leitura"><span class="pr-k">Leitura do edital</span>' + ui.verdict('', 'Quadro de provas não encontrado.', 'O PDF foi lido, mas nenhuma tabela de questões do cargo apareceu. ' + (p.fases.length ? p.fases.length + ' datas do cronograma foram encontradas.' : '')) + '<div class="pr-row">' + (p.fases.length ? ui.btn('Aplicar só o cronograma', ui.act('aplicar-leitura', c.id + '|fases'), 'g sm') : '') + ui.btn('Fechar', ui.act('descartar-leitura', c.id), 'g sm') + '</div></div>';
    const rows = p.prova.map((d) => '<tr><td>' + esc(d.nome) + (d.grupo ? ' <span class="pr-mono">' + esc(d.grupo) + '</span>' : '') + '</td><td>' + d.questoes + '</td><td>' + fpt(d.peso) + '</td><td>' + (d.minimo ? unTxt(d.minimo, d.minimoEm) : '—') + '</td></tr>').join('');
    const fases = p.fases.map((f) => (E.FASES.find(([id]) => id === f.id) || [, f.id])[1] + ' ' + U.fmtDay(U.parseDate(f.data))).join(' · ');
    const av = p.leitura?.avisos || [];
    return '<div class="pr-leitura"><span class="pr-k l">Lido do PDF · confiança ' + esc(p.leitura?.confianca || '—') + '</span><h3>' + esc(R ? R.resumo(p) : '') + '</h3>' + (av.length ? ui.verdict('l', 'Confira antes de aplicar.', esc(av.join('; ')) + '.') : '') + '<table class="pr-ltab"><thead><tr><th>Disciplina</th><th>Questões</th><th>Pts/q</th><th>Mínimo</th></tr></thead><tbody>' + rows + '</tbody></table>' + (p.grupos.filter((g) => g.minimo).length ? '<p class="pr-mono">Blocos: ' + p.grupos.filter((g) => g.minimo).map((g) => esc(g.nome) + ' mín. ' + unTxt(g.minimo, g.minimoEm)).join(' · ') + '</p>' : '') + (fases ? '<p class="pr-mono">Cronograma: ' + esc(fases) + '</p>' : '') + (p.cargo?.vencimento ? '<p class="pr-mono">Cargo: ' + esc([p.cargo.vagas && 'vagas ' + p.cargo.vagas, p.cargo.carga, p.cargo.vencimento].filter(Boolean).join(' · ')) + '</p>' : '') + (p.leitura?.quadro?.pagina ? '<p class="pr-mono">Quadro na página ' + p.leitura.quadro.pagina + ': “' + esc(p.leitura.quadro.contexto.slice(0, 120)) + '”</p>' : '') + '<div class="pr-row">' + ui.btn('Aplicar ao Raio-X', ui.act('aplicar-leitura', c.id), 'p sm') + ui.btn('Descartar', ui.act('descartar-leitura', c.id), 'g sm') + '</div></div>';
  }
  function pickPdf() {
    return new Promise((resolve) => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,.pdf'; inp.onchange = () => resolve(inp.files?.[0] || null); inp.addEventListener('cancel', () => resolve(null)); inp.click(); });
  }
  async function lerPdfDoCurso(id) {
    const c = P.courses.byId(id), key = String(id);
    if (!c || typeof window.lerEditalDoArquivo !== 'function') { if (typeof toast === 'function') toast('Leitor de edital indisponível nesta versão.'); return; }
    let blob = null;
    try { const doc = typeof currentCourseDoc === 'function' ? currentCourseDoc(id, 'edital') : null; if (doc?.storagePath && window.StudyCloud?.downloadBlobCached) blob = await StudyCloud.downloadBlobCached(doc.storagePath); else if (c.edital) blob = await (await fetch(c.edital)).blob(); } catch { blob = null; }
    if (!blob) blob = await pickPdf();
    if (!blob) return;
    leituras.set(key, { lendo: true, msg: 'Abrindo o PDF…' }); P.schedule('course');
    try {
      const plan = await window.lerEditalDoArquivo(blob, { cargo: c.subtitle || 'Arquiteto', onPage: (n, max) => { if (n % 10 === 0) { leituras.set(key, { lendo: true, msg: 'Página ' + n + ' de ' + max + '…' }); P.schedule('course'); } } });
      if (c.board) plan.banca = c.board;
      leituras.set(key, { plan });
    } catch (e) { leituras.set(key, { erro: String(e?.message || e) }); }
    P.schedule('course');
  }
  function raioX(c, all) {
    const prova = E.prova(c.id), e = E.get(c.id) || {}, cats = [...new Set(all.map((m) => m.category).filter(Boolean))];
    if (!prova.length) {
      const pad = E.padraoDaBanca(c.board), list = Object.keys(E.padroes());
      const use = pad ? ui.btn('Usar estrutura ' + esc(pad.banca), ui.act('apply-padrao', c.id + '|' + pad.banca), 'g sm') : list.length ? '<span class="pr-row"><span class="pr-mono">Padrões de outras bancas (confira com o edital):</span>' + list.map((b) => ui.btn('Usar ' + esc(b), ui.act('apply-padrao', c.id + '|' + b), 'g sm')).join('') + '</span>' : '';
      return ui.card(ui.head('Raio-X da prova', 'Estrutura ainda não informada', '', 'l') + leituraPanel(c) + '<p class="pr-detail">Leia o PDF do edital: o app encontra o quadro de provas do seu cargo, os mínimos, as etapas e o cronograma, e você confere antes de salvar.</p><div class="pr-row">' + ui.btn('Ler o PDF do edital', ui.act('edital-pdf', c.id), 'p sm') + use + ui.btn('Importar .json', ui.act('import-kit', c.id), 'g sm') + '</div><details class="pr-add"><summary>Informar manualmente</summary>' + provaForm(c, [], e, cats) + '</details>', 'pr-raiox-card');
    }
    const cores = E.cores(c.id), autoMap = E.autoMapas(c.id);
    const rg = E.regras(c.id), maxPts = E.pontosMax(prova), maxObj = E.maxObjetiva(prova, rg), mg = E.minimoGeral(c.id), nq = prova.reduce((n, d) => n + d.questoes, 0);
    const disc = prova.map((d) => {
      const ms = all.filter((m) => E.disciplinaDoMapa(m, c.id)?.id === d.id), color = cores[d.id] || (ms[0] ? P.mapColor(ms[0]) : 'var(--pr-latao)');
      const pts = d.questoes * d.peso, share = maxPts ? Math.round((pts / maxPts) * 100) : 0;
      const minTxt = d.minimo ? (d.minimoEm === 'pontos' ? fpt(d.minimo) : unTxt(d.minimo, d.minimoEm) + '<small>' + fpt(E.minPts(d)) + ' pts</small>') : rg.naoZerar ? '1 ac.<small>não zerar</small>' : '—';
      return '<div class="pr-dsc" style="--c:' + color + '"><span class="pr-k">' + esc(d.nome) + (d.padrao ? ' · demais conteúdos' : '') + '</span>' + (d.grupo ? '<span class="pr-chip">' + esc(d.grupo) + '</span>' : '') + '<b class="pr-sig">' + d.questoes + ' q<small>' + share + '% da objetiva</small></b><div class="pr-dcells"><span><i>' + (d.peso === 1 ? 'Peso' : 'Pts/q') + '</i>' + fpt(d.peso) + '</span><span><i>Pontos</i>' + fpt(pts) + '</span><span><i>Mínimo</i>' + minTxt + '</span></div><div class="pr-row">' + (ms.length ? ms.map((m) => { const au = autoMap[P.data.keyOf(m)] && !(e.mapaDisciplina || {})[String(m.code || '').toUpperCase()] && !d.categorias.includes(String(m.category || '')); return '<span class="pr-chip c' + (au ? ' auto' : '') + '" style="--c:' + P.mapColor(m) + '"' + (au ? ' title="Ligado pelo conteúdo do mapa e do edital"' : '') + '>' + esc(m.code || m.title) + (au ? ' ✦' : '') + '</span>'; }).join('') : '<span class="pr-mono">nenhum mapa ligado</span>') + '</div></div>';
    }).join('');
    const blocos = rg.grupos.length ? '<div class="pr-ficha pr-blocos">' + rg.grupos.map((g) => '<span><i>' + esc(g.nome) + '</i>' + g.questoes + ' q · ' + fpt(g.max) + ' pts' + (g.minimo ? ' · mín. ' + unTxt(g.minimo, g.minimoEm) : '') + (rg.escala === 'media10' && g.peso !== 1 ? ' · peso ' + fpt(g.peso) : '') + '</span>').join('') + '</div>' : '';
    const semMin = prova.every((d) => !d.minimo);
    const fmtTxt = rg.formato === 'certo-errado' ? 'certo/errado' + (rg.penalidade ? ' · errada desconta ' + (rg.penalidade === 1 ? '1 certa' : fpt(rg.penalidade)) : '') : (rg.alternativas ? rg.alternativas + ' alternativas' : 'múltipla escolha') + (rg.penalidade ? ' · erro desconta ' + fpt(rg.penalidade) : '');
    const mgTxt = rg.minimoGeral === null ? '—' : rg.minimoGeralEm === 'pontos' ? fpt(rg.minimoGeral) + ' pts' + (maxObj ? ' (' + Math.round((rg.minimoGeral / maxObj) * 100) + '%)' : '') : unTxt(rg.minimoGeral, rg.minimoGeralEm) + (mg !== null && rg.minimoGeralEm === 'pct' ? ' (' + fpt(mg) + ' pts)' : '');
    const nfMax = rg.etapas.length && maxObj !== null ? E.pontuarCom(prova, rg, {}, { etapas: Object.fromEntries(rg.etapas.map((x) => [x.id, x.max])) }).notaFinal.max : null;
    const cells = [['Objetiva', rg.escala === 'padronizada' ? 'escore padronizado' : fpt(maxObj) + ' pts' + (rg.escala === 'media10' ? ' (média 0–10)' : '')], ['Mínimo geral', mgTxt], ['Mínimo por disciplina', rg.naoZerar ? 'não zerar nenhuma' : semMin ? 'não há' : prova.filter((d) => d.minimo).length + ' de ' + prova.length], ['Formato', fmtTxt]].concat(rg.etapas.some((x) => x.tipo === 'titulos') ? [['Títulos', 'até ' + fpt(rg.etapas.find((x) => x.tipo === 'titulos').max) + ' pts']] : []).concat(nfMax !== null ? [['Nota final máx.', fpt(nfMax) + ' pts']] : []);
    const regra = '<div class="pr-ficha pr-regra">' + cells.map(([l, v]) => '<span><i>' + l + '</i>' + v + '</span>').join('') + '</div>';
    const etapas = rg.etapas.length ? '<div class="pr-ficha pr-etapas">' + rg.etapas.map((x) => '<span><i>' + esc(x.nome) + '</i>até ' + fpt(x.max) + ' pts' + (x.minimo ? ' · mín. ' + (x.minimoEm === 'pct' ? fpt(x.minimo) + '%' : fpt(x.minimo)) : '') + '<small>' + ET_TXT[x.carater] + (x.nota ? ' · ' + esc(x.nota) : '') + '</small></span>').join('') + '</div><p class="pr-mono pr-nf">' + esc(E.formulaNotaFinal(rg)) + '</p>' : '';
    const padr = rg.escala === 'padronizada' ? ui.verdict('l', 'Nota padronizada.', 'A banca converte seus acertos pela média e pelo desvio do grupo; o app mostra acertos e pontos brutos, mas não consegue dizer sozinho se você passou.') : '';
    const cargo = e.cargo || {}, fichaCells = [['Vagas', cargo.vagas], ['Carga horária', cargo.carga], ['Vencimento', cargo.vencimento], ['Validade', cargo.validade], ['Desempate', cargo.desempate]].filter(([, v]) => v);
    const ficha = fichaCells.length ? '<div class="pr-ficha">' + fichaCells.map(([l, v]) => '<span><i>' + l + '</i>' + esc(v) + '</span>').join('') + '</div>' : '';
    const outra = bancaDiverge(c, e);
    const alerta = outra ? ui.verdict('', 'Esta estrutura veio de ' + esc(outra) + ', mas o curso é ' + esc(c.board) + '.', 'Cada edital monta a prova do seu jeito: leia o PDF do edital ou ajuste em “Editar estrutura da prova”.') : '';
    const lido = e.leitura ? '<p class="pr-mono">Lido do PDF do edital em ' + esc(U.fmtDay(new Date(e.leitura.em))) + (e.leitura.confianca ? ' · confiança ' + esc(e.leitura.confianca) : '') + (e.leitura.avisos?.length ? ' · confira: ' + esc(e.leitura.avisos.join('; ')) : '') + '</p>' : '';
    const sub = prova.length + ' ' + plural(prova.length, 'disciplina') + ' · ' + nq + ' questões · ' + (rg.escala === 'padronizada' ? 'nota padronizada' : fpt(maxObj) + ' pontos') + (rg.minimoGeral !== null ? ' · mínimo geral ' + (rg.minimoGeralEm === 'pontos' ? fpt(rg.minimoGeral) : unTxt(rg.minimoGeral, rg.minimoGeralEm)) : '') + rg.etapas.map((x) => ' · + ' + (x.tipo === 'titulos' ? fpt(x.max) + ' de títulos' : x.nome.toLowerCase() + ' ' + fpt(x.max))).join('');
    return ui.card(ui.head('Raio-X da prova', sub, e.fonte ? '<span class="pr-mono">' + esc(e.fonte) + '</span>' : '', 'l') + leituraPanel(c) + alerta + padr + regra + blocos + '<div class="pr-dscs">' + disc + '</div>' + etapas + ficha + lido + '<details class="pr-add"><summary>Editar estrutura da prova</summary>' + provaForm(c, prova, e, cats, all) + '</details>', 'pr-raiox-card');
  }
  /* V15.57 · fechamento no curso: gabarito, recursos ligados aos mapas e aguardando convocação */
  const REC_ST = [['preparando', 'Preparando'], ['enviado', 'Enviado'], ['deferido', 'Deferido'], ['indeferido', 'Indeferido']];
  function fechamento(c, all) {
    const cl = P.courses.closure(c.id), prova = E.prova(c.id), sig = P.courses.sigla(c);
    const gp = prova.length && cl.gabarito?.porDisciplina ? E.pontuar(c.id, Object.fromEntries(Object.entries(cl.gabarito.porDisciplina).map(([k, v]) => [k, v.acertos])), { erros: cl.gabarito.erros, etapas: cl.gabarito.etapas }) : null;
    const gab = gp ? ui.gabCard(gp, sig) : ui.card(ui.head('Gabarito', cl.gabarito ? cl.gabarito.correct + ' de ' + cl.gabarito.total + ' acertos' : 'Ainda não registrado', '', 'l') + (prova.length ? '<p class="pr-detail">Seus acertos por disciplina contra o gabarito preliminar dão a nota no formato da banca.</p>' + ui.gabForm(c, prova) : '<p class="pr-detail">Informe a estrutura da prova no Raio-X para registrar o gabarito por disciplina.</p>'));
    const recs = (Array.isArray(cl.recursos) ? cl.recursos : []).filter((r) => r && !r.removed);
    const own = all.filter((m) => !m._linkedFrom);
    const recList = recs.length ? '<div class="pr-list">' + recs.map((r) => { const m = r.mapKey && typeof mapById === 'function' ? mapById(r.mapKey) : null; return '<div class="pr-li rec" style="--c:' + (m ? P.mapColor(m) : 'var(--pr-latao)') + '"><span class="pr-sig">Q' + esc(r.questao) + '</span><span><b>' + esc(r.motivo || 'Sem fundamentação anotada') + '</b><br><span class="t">' + esc(m ? m.code + ' · ' + (m.shortTitle || m.title) : 'sem mapa ligado') + '</span></span><span class="pr-row" style="flex-wrap:nowrap"><select class="pr-sel" aria-label="Situação do recurso da questão ' + esc(r.questao) + '" data-pr-change="recurso-status" data-course="' + esc(c.id) + '" data-rid="' + esc(r.id) + '">' + REC_ST.map(([id, l]) => '<option value="' + id + '"' + (r.status === id ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' + (m ? ui.btn('Abrir mapa', ui.act('open-map', r.mapKey), 'g sm') : '') + ui.btn('Remover', ui.act('recurso-del', c.id + '|' + r.id), 'g sm') + '</span></div>'; }).join('') + '</div>' : '<p class="pr-detail">Nenhuma questão marcada para recurso.</p>';
    const recForm = '<details class="pr-add"><summary>+ Marcar questão para recurso</summary><form data-pr-submit="recurso-add" data-course="' + esc(c.id) + '"><div class="pr-fgrid"><label class="pr-field"><span>Questão nº</span><input name="questao" type="number" min="1" inputmode="numeric" required></label><label class="pr-field"><span>Mapa da fundamentação</span><select name="mapKey"><option value="">Nenhum</option>' + own.map((m) => '<option value="' + esc(P.data.keyOf(m)) + '">' + esc((m.code || '') + ' · ' + (m.shortTitle || m.title)) + '</option>').join('') + '</select></label></div><label class="pr-field"><span>Fundamentação (resumo)</span><input name="motivo" maxlength="200" placeholder="Ex.: gabarito ignora a exceção do art. 30"></label><button type="submit" class="pr-btn sm">Marcar</button></form></details>';
    const enviados = recs.filter((r) => r.status === 'enviado').length;
    const recCard = ui.card(ui.head('Recursos', recs.length ? recs.length + ' ' + plural(recs.length, 'questão', 'questões') + (enviados ? ' · ' + enviados + ' ' + plural(enviados, 'enviada') : '') : 'Nenhuma questão marcada', '', 'l') + recList + recForm);
    const ag = !!cl.aguardandoAt, cargo = (E.get(c.id) || {}).cargo || {};
    const wait = ui.card(ui.head('Depois do resultado', ag ? 'Aguardando convocação' : 'Destino do curso', '', 'l') + '<p class="pr-detail">' + (ag ? 'Marcado em ' + esc(fmtDay(cl.aguardandoAt)) + '. O curso fica fora do plano e do Início, com mapas e progresso guardados' + (cargo.validade ? '; validade do concurso: ' + esc(cargo.validade) : '') + '.' : 'Com aprovação em cadastro reserva, marque como aguardando convocação: o curso não é arquivado e continua identificado em Meus Cursos.') + '</p><div class="pr-row">' + ui.btn(ag ? 'Desmarcar' : 'Aguardando convocação', ui.act('aguardando', c.id), ag ? 'g sm' : 'sm') + ui.btn('Fechamento no Início', ui.act('go-pos'), 'g sm') + '</div>');
    return '<div class="pr-two">' + gab + recCard + '</div>' + wait;
  }
  function alcanceSeg(m) {
    if (m._linkedFrom) return '';
    const k = P.data.keyOf(m), cur = E.alcance(m);
    return '<label class="pr-field"><span>Alcance do mapa</span><select data-pr-change="set-alcance" data-key="' + esc(k) + '">' + E.ALCANCES.map(([id, l]) => '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label><p class="pr-mono">' + (cur === 'local' ? 'Local: sai da biblioteca quando este concurso encerrar.' : cur === 'misto' ? 'Misto: parte vale em outros editais; continua na biblioteca.' : 'Continua na biblioteca depois que este concurso encerrar.') + '</p>';
  }
  function mapRowMenu(m) {
    const k = P.data.keyOf(m), fav = typeof favs !== 'undefined' && favs.has(k);
    return ui.menu('m-' + k, [['Abrir', ui.act('open-map', k)], [fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos', ui.act('fav-menu', k)], !m._linkedFrom && typeof mapCanUpdateHtml === 'function' && mapCanUpdateHtml(m) ? ['Atualizar HTML', ui.act('update-map', k)] : null, !m._linkedFrom ? ['Gerenciar mapa', ui.act('manage-map', k)] : null, m._linkedFrom ? ['Desvincular deste concurso', ui.act('unlink', k + '|' + m._linkedTo), 'd'] : null]);
  }
  function listTable(list, fol, course) {
    if (!list.length) return ui.empty('Nada neste filtro', 'Troque o filtro de situação ou de conteúdo.');
    return '<div class="pr-tbl"><table><thead><tr><th>Folha</th><th>Mapa</th><th class="hide-m"></th><th class="hide-m">Categoria</th><th>Tópicos</th><th>Estado</th><th class="hide-m">Última</th><th></th></tr></thead><tbody>' + list.map((m) => {
      const p = P.data.prog(m), k = P.data.keyOf(m), origin = m._linkedFrom ? P.courses.byId(m._linkedFrom) : null;
      return '<tr style="--c:' + P.mapColor(m) + '" data-pr-act="pick-row" data-arg="' + esc(k) + '"><td class="fn">' + esc(fol.get(k) || '') + '</td><td><span class="pr-sig">' + esc(m.code || '') + '</span></td><td class="hide-m"><b>' + esc(m.title) + '</b>' + (origin ? ' <span class="pr-chip l">de ' + esc(P.courses.sigla(origin)) + '</span>' : '') + '</td><td class="hide-m"><span class="pr-chip c">' + esc(m.category || 'Outros') + '</span></td><td class="pr-num">' + p.marked + '/' + p.total + '</td><td style="min-width:110px">' + ui.stbar(p) + '<span class="pr-mono">' + ui.mapState(p) + '</span></td><td class="pr-mono hide-m">' + ui.lastLabel(p.lastActivity) + '</td><td><span class="pr-row" style="flex-wrap:nowrap">' + ui.btn(p.total > 0 && p.marked >= p.total ? 'Revisar' : p.marked ? 'Continuar' : 'Começar', ui.act('open-map', k), p.total > 0 && p.marked >= p.total ? 'g sm' : 'sm') + mapRowMenu(m) + '</span></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  /* ---------- V15.58 · peso da prova no curso ---------- */
  const PKEY = 'studyapp.prancha.plantaMedida';
  const medida = () => { try { return localStorage.getItem(PKEY) === 'p' ? 'p' : 't'; } catch { return 't'; } };
  let relampago = false;
  function pesoCard(c) {
    const pe = E.pesoEsforco(c.id);
    if (!pe || !pe.totTopicos) return '';
    const pc = (x) => Math.round(x * 100), fp = E.fmtPt;
    const bar = (key, fatia, label) => '<div class="pr-pe"><span class="pr-k">' + esc(label) + '</span>' + ui.states(pe.rows.map((r) => [r.nome, r[key], r.cor]), label) + ui.legend(pe.rows.map((r) => [r.nome, pc(r[fatia]) + '%', r.cor])) + '</div>';
    const cells = '<div class="pr-pe-cells">' + pe.rows.map((r) => '<div class="pr-cell"><span>' + esc(r.nome) + ' · ponto por tópico</span><b class="pr-num" style="color:' + r.cor + '">' + fp(r.ppt) + '</b><span>' + fp(r.pontos) + ' pts ÷ ' + r.topicos + ' ' + plural(r.topicos, 'tópico') + ' · ' + pc(r.cobertura) + '% marcados</span></div>').join('') + '</div>';
    const on = P.prefs.get('planoPeso') !== false;
    const v = pe.razao && pe.razao >= 2 ? ui.verdict('l', 'Um tópico de ' + esc(pe.max.nome) + ' vale cerca de ' + Math.round(pe.razao) + ' tópicos de ' + esc(pe.min.nome) + '.', esc(pe.max.nome) + ' vale ' + pc(pe.max.fatiaPontos) + '% da prova e ocupa ' + pc(pe.max.fatiaTopicos) + '% dos tópicos; ' + pc(pe.max.cobertura) + '% deles estão marcados. ' + (on ? 'O plano automático já usa esse peso.' : 'O uso do peso no plano está desligado em Configurações → Concursos e editais.')) : '';
    return ui.card(ui.head('Peso × Esforço', 'O que a prova vale contra o que os mapas pedem', '', 'l') + bar('topicos', 'fatiaTopicos', 'Tópicos nos mapas · ' + pe.totTopicos) + bar('pontos', 'fatiaPontos', 'Pontos na prova · ' + fp(pe.totPontos)) + cells + v, 'pr-pe-card');
  }
  function placar(c) {
    if (!E.prova(c.id).length) return '';
    const rows = P.sims.summary(c.id).list.filter((r) => r.attempts.length).map((r) => ({ r, gp: E.pontuarTentativa(c.id, r.latest) })).filter((x) => x.gp)
      .sort((a, b) => (Date.parse(b.r.latest.finishedAt || 0) || 0) - (Date.parse(a.r.latest.finishedAt || 0) || 0));
    if (!rows.length) return '';
    const last = rows[0], fp = ui.fmtPts;
    const v = last.gp.aprovado ? ui.verdict('m', 'Aprovado no total e em todas as disciplinas.', last.gp.minimoGeral !== null ? fp(last.gp.pontos - last.gp.minimoGeral) + ' pontos acima do mínimo geral.' : '') : ui.verdict('', 'No ' + esc(P.sims.code(last.r.sim)) + ', ' + esc(ui.elimText(last.gp)) + '.', 'Passar no total e cair no mínimo de uma disciplina elimina; o plano dá prioridade a ela.');
    const others = rows.slice(1).map((x) => '<div class="pr-li"><span class="pr-sig">' + esc(P.sims.code(x.r.sim)) + '</span><span>' + fp(x.gp.pontos) + ' de ' + fp(x.gp.max) + ' pontos<br><span class="t">' + esc(x.gp.aprovado ? 'aprovado em todas as disciplinas' : ui.elimText(x.gp)) + '</span></span>' + ui.btn('Resultado', ui.act('sim-result', x.r.key), 'g sm') + '</div>').join('');
    return ui.card(ui.head('Placar de simulados', esc(P.sims.code(last.r.sim)) + ' · ' + fp(last.gp.pontos) + ' de ' + fp(last.gp.max) + ' pontos', ui.btn('Resultado', ui.act('sim-result', last.r.key), 'g sm'), 'l') + ui.gabRows(last.gp) + v + (others ? '<div class="pr-list">' + others + '</div>' : ''));
  }
  /* revisão relâmpago: tópicos ⭐ e 🔢 dos mapas do curso, na ordem do peso da disciplina e do estado */
  function relampagoItems(c) {
    const own = P.data.mapsForCourse(c.id, { includeLinked: false }), byKey = new Map(own.map((m) => [P.data.keyOf(m), m]));
    const idx = ((typeof state !== 'undefined' && state.searchIndex?.items) || []).filter((it) => it.topicId && byKey.has(it.mapKey) && (it.markers || []).some((x) => x === 'star' || x === 'num'));
    const st = new Map(), rank = { difficult: 0, review: 1 };
    return idx.map((it) => {
      const m = byKey.get(it.mapKey);
      if (!st.has(it.mapKey)) st.set(it.mapKey, (typeof readMapState === 'function' ? readMapState(m).topicStates : null) || {});
      const s = st.get(it.mapKey)[it.topicId] || '';
      return { it, m, s, ppt: E.pptDoMapa(m, c.id) || 0 };
    }).sort((a, b) => b.ppt - a.ppt || (rank[a.s] ?? 2) - (rank[b.s] ?? 2));
  }
  function relampagoCard(c, ex) {
    const vesp = ex.phase === 'before' && ex.days <= 2 || ex.phase === 'today';
    if (!vesp && !relampago) return '';
    const list = relampagoItems(c);
    if (!list.length) return ui.card(ui.head('Revisão relâmpago', 'Sem tópicos marcados com ⭐ ou 🔢', ui.btn('Fechar', ui.act('relampago'), 'g sm'), 'l') + '<p class="pr-detail">Os mapas deste curso não declaram marcadores; a Auditoria do acervo (Configurações) lista quais.</p>');
    const shown = list.slice(0, 14), mins = Math.max(10, Math.round(list.length * 0.8));
    const lab = { difficult: 'DIF', review: 'REV', done: 'OK' };
    return ui.card(ui.head(vesp ? 'Véspera · revisão relâmpago' : 'Revisão relâmpago', list.length + ' ' + plural(list.length, 'tópico') + ' ⭐/🔢 · ~' + fmtMin(mins), '<span class="pr-row">' + ui.btn('Começar · ' + fmtMin(Math.min(mins, 40)), ui.act('relampago-start', c.id, { 'data-min': Math.min(mins, 40) }), 'p sm') + (vesp ? '' : ui.btn('Fechar', ui.act('relampago'), 'g sm')) + '</span>', 'l') +
      '<p class="pr-detail">Ordem: disciplina que mais pesa na prova primeiro; dentro dela, DIF e REV antes.</p><div class="pr-list">' + shown.map((x) => '<div class="pr-li" style="--c:' + P.mapColor(x.m) + '"><span class="pr-sig">' + esc(x.m.code || '') + '</span><span><b style="font-size:var(--fs-body-sm)">' + ((x.it.markers || []).includes('star') ? '⭐ ' : '') + ((x.it.markers || []).includes('num') ? '🔢 ' : '') + esc(x.it.title) + '</b><br><span class="t">' + esc((lab[x.s] || 'aberto') + (x.ppt ? ' · ' + E.fmtPt(x.ppt) + ' pt por tópico' : '')) + '</span></span>' + ui.btn('Abrir', ui.act('open-map', P.data.keyOf(x.m), { 'data-topic': x.it.topicId }), 'g sm') + '</div>').join('') + '</div>' + (list.length > shown.length ? '<p class="pr-mono">+ ' + (list.length - shown.length) + ' ' + plural(list.length - shown.length, 'tópico') + ' na sequência da sessão</p>' : ''));
  }
  /* reaproveitar: mapas portáteis deste curso vinculados ao próximo concurso, sem copiar o HTML */
  function reaproveitar(c, all) {
    const port = all.filter((m) => !m._linkedFrom && E.alcance(m) !== 'local');
    if (!port.length) return '';
    const targets = P.courses.list().filter((x) => String(x.id) !== String(c.id) && !P.courses.isRetired(x));
    if (!targets.length) return ui.card(ui.head('Reaproveitar mapas', port.length + ' ' + plural(port.length, 'mapa portátil', 'mapas portáteis'), '', 'l') + '<p class="pr-detail">Crie o próximo concurso para vincular estes mapas a ele. O progresso e as revisões continuam os mesmos.</p>' + ui.btn('+ Novo concurso', ui.act('new-course'), 'g sm'));
    const t = port.reduce((n, m) => n + (P.data.prog(m).total || 0), 0);
    return ui.card(ui.head('Reaproveitar mapas', port.length + ' ' + plural(port.length, 'mapa portátil', 'mapas portáteis') + ' · ' + t + ' tópicos', '', 'l') + '<form data-pr-submit="reuse-maps" data-n="' + port.length + '"><label class="pr-field"><span>Vincular ao concurso</span><select name="course">' + targets.map((x) => '<option value="' + esc(x.id) + '">' + esc(P.courses.sigla(x) + ' · ' + x.title) + '</option>').join('') + '</select></label><div class="pr-checks">' + port.map((m, i) => '<label><input type="checkbox" name="k' + i + '" value="' + esc(P.data.keyOf(m)) + '" checked> <span class="pr-sig" style="--c:' + P.mapColor(m) + '">' + esc(m.code || '') + '</span> ' + esc(m.shortTitle || m.title) + (E.alcance(m) === 'misto' ? ' <span class="pr-chip l">misto</span>' : '') + '</label>').join('') + '</div><p class="pr-mono">O mapa aparece no outro concurso sem duplicar o HTML; mistos têm partes locais.</p><button type="submit" class="pr-btn sm">Vincular selecionados</button></form>');
  }

  /* V15.61 · baixar todos os HTML do curso de uma vez, num .zip (gerador próprio, sem dependências; deflate nativo quando o navegador oferece) */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function deflateRaw(b) {
    if (typeof CompressionStream !== 'function') return null;
    try { return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); } catch { return null; }
  }
  async function buildZip(files, onStep) {
    const enc = new TextEncoder(), parts = [], central = [], d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data), z = await deflateRaw(data);
      const packed = z && z.length < data.length ? z : data, method = packed === data ? 0 : 8;
      const head = (sig, extra) => { const h = new DataView(new ArrayBuffer(extra)); h.setUint32(0, sig, true); return h; };
      const lh = head(0x04034b50, 30);
      lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, method, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, packed.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      parts.push(lh.buffer, name, packed);
      const ch = head(0x02014b50, 46);
      ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, method, true); ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, packed.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + packed.length;
      onStep?.(central.length / 2);
    }
    const cSize = central.reduce((n, x) => n + x.byteLength, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }

  /* V15.61 · aviso de progresso do .zip na barra lateral (acima de "Nuvem conectada"); sem barra lateral visível, flutua no canto */
  function zipProgress(sigla) {
    if (!document.getElementById('prZipCss')) {
      const st = document.createElement('style'); st.id = 'prZipCss';
      st.textContent = '.pr-zip{box-sizing:border-box;width:100%;max-width:100%;min-width:0;grid-template-columns:minmax(0,1fr);overflow:hidden;padding:12px;margin-bottom:10px;border:1px solid var(--pr-latao,#c9a46b);border-radius:12px;background:#0a0a09;color:var(--pr-papel,#ece4d4);display:grid;gap:7px;font-size:13px;line-height:1.3}' +
        '.pr-zip.float{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9999;width:min(280px,calc(100vw - 32px));margin:0;box-shadow:0 10px 30px rgba(0,0,0,.55)}' +
        '.pr-zip-h{min-width:0;display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.pr-zip-h b{font-weight:700;min-width:0;overflow-wrap:anywhere}.pr-zip-h span{flex:none;font-family:var(--mono,ui-monospace,monospace);font-weight:700;color:var(--pr-latao,#c9a46b);font-variant-numeric:tabular-nums}' +
        '.pr-zip-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}.pr-zip-bar i{display:block;height:100%;width:0;background:var(--pr-latao,#c9a46b);border-radius:inherit;transition:width .25s ease}' +
        '.pr-zip-s{min-width:0;font-size:12px;opacity:.7;font-family:var(--mono,ui-monospace,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pr-zip.ok{border-color:var(--pr-musgo,#8fa86b)}.pr-zip.ok .pr-zip-bar i{background:var(--pr-musgo,#8fa86b)}.pr-zip.err{border-color:var(--pr-oxido,#c0634a)}' +
        '@media (prefers-reduced-motion:reduce){.pr-zip-bar i{transition:none}}';
      document.head.appendChild(st);
    }
    document.getElementById('prZip')?.remove();
    const el = document.createElement('div');
    el.id = 'prZip'; el.className = 'pr-zip'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="pr-zip-h"><b>Gerando .zip · ' + esc(sigla) + '</b><span>0%</span></div><div class="pr-zip-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><div class="pr-zip-s">Preparando…</div>';
    const side = document.querySelector('.side'), bottom = side?.querySelector('.side-bottom');
    const sideOn = bottom && side.getClientRects().length && getComputedStyle(side).display !== 'none' && getComputedStyle(side).visibility !== 'hidden';
    if (sideOn) bottom.prepend(el); else { el.classList.add('float'); document.body.appendChild(el); }
    const pctEl = el.querySelector('.pr-zip-h span'), bar = el.querySelector('.pr-zip-bar'), fill = bar.firstChild, sub = el.querySelector('.pr-zip-s');
    return {
      set(v, text) { const n = Math.max(0, Math.min(100, Math.round(v))); pctEl.textContent = n + '%'; fill.style.width = n + '%'; bar.setAttribute('aria-valuenow', n); if (text) sub.textContent = text; },
      done(text, kind) { el.classList.add(kind || 'ok'); if (kind !== 'err') this.set(100); sub.textContent = text; setTimeout(() => el.remove(), kind === 'err' ? 8000 : 5000); }
    };
  }
  const safeName = (v) => String(v || '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
  let zipBusy = false;
  async function downloadCourseZip(id) {
    const say = (t) => { if (typeof toast === 'function') toast(t); };
    if (zipBusy) { document.getElementById('prZip')?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], 300); return say('O .zip ainda está sendo montado — acompanhe na barra lateral.'); }
    const c = typeof courseById === 'function' ? courseById(id) : null, all = c ? P.data.mapsForCourse(c.id) : [];
    if (!all.length || typeof mapHtml !== 'function') return say('Nenhum mapa para baixar neste curso.');
    zipBusy = true;
    const fol = P.data.folhas(all), used = new Set(), files = [], falhas = [];
    let bar = null;
    try {
      bar = zipProgress(P.courses.sigla(c) || c.title || 'curso');
      let i = 0;
      for (const m of all) {
        bar.set((i / all.length) * 80, 'Lendo ' + (i + 1) + ' de ' + all.length + ' · ' + (m.code || m.title || 'mapa'));
        i++;
        let html = '';
        try { html = await mapHtml(m); } catch (e) { console.warn('zip', m?.code, e); }
        if (!html) { falhas.push(m.code || m.title || '?'); continue; }
        let base = safeName([fol.get(P.data.keyOf(m)), m.code, m.title].filter(Boolean).join(' - ')) || 'mapa', name = base + '.html', n = 2;
        while (used.has(name.toLowerCase())) name = base + ' (' + n++ + ').html';
        used.add(name.toLowerCase());
        files.push({ name, text: html });
      }
      if (!files.length) { bar.done('Nenhum mapa pôde ser lido. Confira a conexão.', 'err'); return say('Não consegui ler nenhum mapa agora. Confira a conexão e tente de novo.'); }
      bar.set(80, 'Compactando ' + files.length + ' ' + plural(files.length, 'arquivo') + '…');
      const blob = await buildZip(files, (j) => bar.set(80 + (j / files.length) * 18, 'Compactando ' + j + ' de ' + files.length + '…')), d = new Date(), stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = safeName('Meus Mapas - ' + (P.courses.sigla(c) || c.title) + ' - ' + stamp) + '.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      bar.done('Download iniciado · ' + files.length + ' ' + plural(files.length, 'mapa') + ' · ' + (blob.size / 1048576).toFixed(1).replace('.', ',') + ' MB' + (falhas.length ? ' · ' + falhas.length + ' fora' : ''));
      say(files.length + ' ' + plural(files.length, 'mapa baixado', 'mapas baixados') + ' no .zip' + (falhas.length ? '; ' + falhas.length + ' não ' + plural(falhas.length, 'abriu', 'abriram') + ' (' + falhas.slice(0, 4).join(', ') + (falhas.length > 4 ? '…' : '') + ').' : '.'));
    } catch (e) { console.warn(e); bar?.done('Não foi possível montar o .zip.', 'err'); say('Não foi possível montar o .zip.'); }
    finally { zipBusy = false; }
  }
  function renderCourse(root) {
    const c = typeof courseById === 'function' ? courseById(state.courseId) : null;
    if (!c) { root.innerHTML = ui.card(ui.empty('Curso não encontrado', 'Ele pode ter sido removido ou ainda não sincronizou.', ui.btn('Meus Cursos', ui.act('nav', 'courses'), 'g'))); return; }
    const s = P.courses.summary(c), p = s.progress, ex = s.exam, h = s.health, f = s.forecast;
    const all = P.data.mapsForCourse(c.id), own = s.maps, linkedN = all.length - own.length;
    const fol = P.data.folhas(all);
    const filters = (typeof COURSE_STUDY_FILTERS !== 'undefined' ? COURSE_STUDY_FILTERS : [{ id: 'all', label: 'Todos' }]);
    const match = (m, id) => (typeof matchesCourseStudyFilter === 'function' ? matchesCourseStudyFilter(m, id) : true);
    const cur = state.courseStudyFilter || 'all', cat = state.category || 'Todos';
    const shown = all.filter((m) => match(m, cur) && (cat === 'Todos' || m.category === cat));
    const cats = typeof mapCategoriesFor === 'function' ? mapCategoriesFor(all) : [...new Set(all.map((m) => m.category))];
    if (!pickKey || !all.some((m) => P.data.keyOf(m) === pickKey)) { const r = (typeof courseResumeMap === 'function' ? courseResumeMap(own) : null) || P.plan.priorities(1, c.id)[0]?.map || all[0]; pickKey = r ? P.data.keyOf(r) : ''; }
    const pickMap = all.find((m) => P.data.keyOf(m) === pickKey);
    const top1 = P.plan.priorities(1, c.id)[0];
    const revCount = own.reduce((n, m) => { const q = P.data.prog(m); return n + (q.review || 0) + (q.difficult || 0); }, 0);
    const timeCourse = own.reduce((n, m) => n + Number(window.StudyTime?.mapSeconds?.(P.data.keyOf(m)) || 0), 0);
    const sim = P.sims.summary(c.id);
    const rest = Math.max(0, p.total - p.marked);
    let v;
    if (ex.phase === 'archived') v = ui.verdict('n', 'Curso arquivado.', 'Ele está fora das prioridades automáticas. Reative pelo menu ⋯.');
    else if (ex.phase === 'after') v = ui.verdict('l', 'A prova já passou.', 'Os mapas deste curso saíram do Início, do plano e das revisões (nada foi apagado); os portáteis continuam na biblioteca. Gabarito, recursos e o destino do curso estão logo abaixo; para estudar uma próxima fase, informe a nova data em Gerenciar curso.');
    else if (ex.phase === 'nodate') v = ui.verdict('n', 'Sem data de prova.', 'Defina a data em Gerenciar curso para calcular o ritmo.');
    else v = ui.verdict(h?.status === 'risk' ? '' : h?.status === 'healthy' ? 'm' : 'l', (ex.days === 0 ? 'Prova hoje' : 'Prova em ' + ex.days + ' ' + plural(ex.days, 'dia')) + ', ' + fmtNum(rest) + ' ' + plural(rest, 'tópico aberto', 'tópicos abertos') + '.', (f?.remainingSeconds ? 'O plano estima ' + fmtSec(f.remainingSeconds) + ' de leitura para o restante. ' : '') + (top1 ? 'Próximo agora: ' + esc(top1.map.code || top1.map.title) + ', ' + fmtMin(top1.minutes) + '.' : ''));
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc(s.sigla + ' · ' + P.courses.label(c)) + '</span><div class="pr-big"><span class="pr-pct pr-num">' + pct(p.marked, p.total) + '<small>%</small></span><span class="pr-sub">' + fmtNum(p.marked) + ' de ' + fmtNum(p.total) + ' tópicos · ' + own.length + ' mapas' + (linkedN ? ' · +' + linkedN + ' ' + plural(linkedN, 'vinculado') : '') + '</span></div>' + ui.stateBar(p) + ui.stateLegend(p) + v +
      '<div class="pr-row">' + (top1 ? ui.btn('Estudar agora · ' + esc(top1.map.code || ''), ui.act('study-now', top1.key, { 'data-min': top1.minutes }), 'p') : '') + (window.StudyAutomation?.run ? ui.btn('Atualizar plano', ui.act('replan'), 'g') : '') + '</div></div><div class="pr-c-b">' +
      ui.cell('Prova', ex.date ? esc(fmtDay(ex.date)) : '—', ex.days !== null && ex.days >= 0 && ex.days <= 7 ? 'ox' : '', ex.date ? (ex.days > 0 ? 'em ' + ex.days + ' ' + plural(ex.days, 'dia') : ex.days === 0 ? 'hoje' : 'realizada') : 'sem data') +
      ui.cell('Restam', fmtNum(rest), '', 'tópicos') + ui.cell('Mapas', s.mapsDone + ' / ' + own.length, s.mapsDone === own.length && own.length ? 'ok' : '', 'concluídos') +
      ui.cell('Revisões', fmtNum(revCount), revCount ? 'l' : 'mu', 'tópicos REV e DIF') + ui.cell('Tempo no curso', fmtSec(timeCourse), '', p.lastActivity ? 'última atividade ' + ui.lastLabel(p.lastActivity) : 'sem atividade') +
      ui.cell('Simulados', sim.done + ' / ' + sim.total, '', sim.total ? (sim.best !== null ? 'melhor ' + sim.best + '%' : 'nenhum feito') : 'nenhum importado') + '</div></section>';
    const hasEdital = typeof courseHasEdital === 'function' && courseHasEdital(c);
    const acts = '<div class="pr-acts" role="group" aria-label="Ações do curso"><button type="button" data-pr-act="course-edital" data-arg="' + esc(c.id) + '"' + (hasEdital ? '' : ' disabled title="Nenhum edital anexado"') + '>Edital</button><button type="button" data-pr-act="course-sims" data-arg="' + esc(c.id) + '">Simulados</button></div>' + ui.menu('course-' + c.id, [['Revisão relâmpago', ui.act('relampago')], ['Importar mapas', ui.act('import-maps')], all.length ? ['Baixar mapas (.zip)', ui.act('download-zip', c.id)] : null, ['Gerenciar curso', ui.act('manage-course', c.id)], [P.courses.isArchived(c) ? 'Reativar curso' : 'Arquivar curso', ui.act('archive', c.id), P.courses.isArchived(c) ? '' : 'd']]);
    const chips = '<div class="pr-chips" role="group" aria-label="Situação">' + filters.map((x) => ui.chipf(x.id, x.label, all.filter((m) => match(m, x.id)).length, cur === x.id, 'filter')).join('') + '</div>';
    const catChips = '<div class="pr-chips" role="group" aria-label="Conteúdo">' + ui.chipf('Todos', 'Todo', undefined, cat === 'Todos', 'cat', undefined, 'Todo o conteúdo') + cats.map((x) => ui.chipf(x, (typeof categoryShortName === 'function' ? categoryShortName(x) : x), all.filter((m) => m.category === x).length, cat === x, 'cat', P.categoryPigment(x), x)).join('') + '</div>';
    const legendCats = ui.legend(cats.map((x) => [(typeof categoryShortName === 'function' ? categoryShortName(x) : x), '', P.categoryPigment(x)]));
    const pe = E.pesoEsforco(c.id), med = pe ? medida() : 't';
    const ordem = pe ? new Map(pe.rows.map((r, i) => [r.id, i])) : null;
    const plantaList = med === 'p' ? all.slice().sort((a, b) => (ordem.get(E.disciplinaDoMapa(a, c.id)?.id) ?? 99) - (ordem.get(E.disciplinaDoMapa(b, c.id)?.id) ?? 99)) : all;
    const tileOpts = med === 'p' ? { sel: pickKey, weight: (m) => (E.pontosDoMapa(m, c.id) || 0) * 4, note: (m) => E.fmtPt(E.pontosDoMapa(m, c.id) || 0) + ' pts' } : { sel: pickKey };
    const plantaRight = (pe ? ui.seg([['t', 'Tópicos'], ['p', 'Pontos']], med, 'planta-medida', 'Medida da planta') : '') + legendCats;
    const planta = ui.card(ui.head('Planta do edital', med === 'p' ? 'Cada mapa é um lote, do tamanho do que vale na prova' : 'Cada mapa é um lote, do tamanho dos seus tópicos', '<div class="pr-row">' + plantaRight + '</div>') + ui.tiles(plantaList, tileOpts).replace(/class="pr-tile( on)?"([^>]*data-arg="([^"]+)")/g, (mm, on, rest, key) => 'class="pr-tile' + (on || '') + (shown.some((m) => P.data.keyOf(m) === key) ? '' : ' dim') + '"' + rest));
    const mode = viewMode();
    let listing;
    if (mode === 'capas') {
      listing = shown.length && typeof mapCard === 'function' ? '<div class="map-grid pr-legacy-grid" data-pr-legacy>' + shown.filter((m) => !m._linkedFrom).map(mapCard).join('') + '</div>' + (shown.some((m) => m._linkedFrom) ? '<p class="pr-mono">' + shown.filter((m) => m._linkedFrom).length + ' mapa(s) vinculado(s) aparecem na lista.</p>' : '') : ui.empty('Nada neste filtro', 'Troque o filtro de situação ou de conteúdo.');
    } else listing = listTable(shown, fol, c);
    const mapsCard = ui.card('<div class="pr-vw"><div><span class="pr-k">Mapas do curso</span><h3>' + shown.length + ' de ' + all.length + ' mapas · ' + shown.reduce((n, m) => n + P.data.prog(m).marked, 0) + '/' + shown.reduce((n, m) => n + P.data.prog(m).total, 0) + ' tópicos</h3></div>' + ui.seg([['lista', 'Lista'], ['capas', 'Capas']], mode, 'view-mode', 'Visualização') + '</div>' + listing);
    root.innerHTML = '<div class="pr-crumb"><button type="button" data-pr-act="nav" data-arg="courses">' + (typeof uiIcon === 'function' ? uiIcon('chevron-left', 'ui-icon-sm') : '‹') + ' Meus Cursos</button><span>›</span><span>' + esc(s.sigla) + '</span></div>' + '<header class="pr-top"><div class="pr-head"><div><div class="pr-eyebrow">' + esc([c.institution, c.city].filter(Boolean).join(' · ') || 'Curso') + '</div><h1>' + esc(c.title) + '</h1></div></div></header>' + regua(c) + carimbo + relampagoCard(c, ex) + (ex.phase === 'after' ? fechamento(c, all) + reaproveitar(c, all) : '') + raioX(c, all) + pesoCard(c) + placar(c) + '<div class="pr-vw">' + '<div class="pr-row">' + acts + '</div>' + chips + '</div>' + catChips + '<div class="pr-side2">' + planta + pickPanel(pickMap, c, fol.get(pickKey)) + '</div>' + mapsCard;
    const legacy = root.querySelector('[data-pr-legacy]');
    if (legacy && typeof bindMapCards === 'function') bindMapCards(legacy);
  }

  const shared = {
    archive: (id) => P.archiveCourse?.(id),
    'download-zip': (id) => downloadCourseZip(id),
    'toggle-archived': () => { showArchived = !showArchived; P.schedule('courses'); },
    filter: (id) => { state.courseStudyFilter = id; P.schedule('course'); },
    cat: (id) => { state.category = id; P.schedule('course'); },
    'view-mode': (id) => { try { localStorage.setItem(VKEY, id); } catch {} P.schedule('course'); },
    'pick-map': (key) => { pickKey = key; P.schedule('course'); },
    'pick-row': (key, el, root, e) => { if (e.target.closest('button,.pr-menu')) return; pickKey = key; P.renderNow('course'); root.querySelector('.pr-pick')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
    'fav-menu': (key) => { P.actions.fav(key); P.schedule(state.view); },
    'planta-medida': (id) => { try { localStorage.setItem(PKEY, id === 'p' ? 'p' : 't'); } catch {} P.schedule('course'); },
    relampago: () => { relampago = !relampago; P.schedule('course'); if (relampago) window.scrollTo({ top: 0 }); },
    'relampago-start': async (id, el) => { const c = P.courses.byId(id), first = c ? relampagoItems(c)[0] : null; if (!window.StudyDashboard?.active?.()) window.StudyDashboard?.start?.({ map: first?.m, mode: 'planned', minutes: Number(el?.dataset.min) || 25, label: 'Revisão relâmpago' }); if (first && typeof openMap === 'function') await openMap(P.data.keyOf(first.m), { topicId: first.it.topicId }); },
    'sim-result': (key) => { if (typeof nav === 'function') nav('simulations'); setTimeout(() => P.pages.simulations?.actions?.result?.(key), 30); },
    'reuse-maps': (fd, form) => { const id = fd.get('course'); if (!id) return; let n = 0; for (let i = 0; i < Number(form.dataset.n || 0); i++) { const k = fd.get('k' + i); if (k) { P.links.link(k, id, true); n++; } } if (typeof toast === 'function') toast(n ? n + ' ' + plural(n, 'mapa vinculado', 'mapas vinculados') + ' ao ' + P.courses.sigla(P.courses.byId(id)) + '.' : 'Nenhum mapa selecionado.'); P.schedule(state.view); },
    'course-sims': (id) => { state.simulationCourseFilter = id; if (typeof nav === 'function') nav('simulations'); },
    'study-now': async (key, el) => { const map = typeof mapById === 'function' ? mapById(key) : null; if (!window.StudyDashboard?.active?.()) window.StudyDashboard?.start?.({ map, mode: 'planned', minutes: Number(el?.dataset.min) || 20, label: map?.code || 'Sessão' }); if (map && typeof openMap === 'function') await openMap(key); },
    replan: () => { try { window.StudyAutomation?.run?.(); if (typeof toast === 'function') toast('Plano atualizado.'); } catch (e) { console.warn(e); } P.schedule(state.view); },
    link: (fd, form) => { const id = fd.get('course'); if (!id) return; P.links.link(form.dataset.key, id, true); if (typeof toast === 'function') toast('Mapa vinculado ao ' + P.courses.sigla(P.courses.byId(id)) + '.'); P.schedule(state.view); },
    /* V15.56 · editais */
    'save-fases': (fd, form) => {
      const id = form.dataset.course, cur = E.get(id) || {}, fases = { ...(cur.fases || {}) };
      for (const [f] of E.FASES) { if (f === 'prova') continue; const v = String(fd.get(f) || ''); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) fases[f] = { date: v }; else delete fases[f]; }
      E.set(id, { fases });
      if (typeof toast === 'function') toast('Cronograma salvo.');
      P.schedule('course');
    },
    'save-prova': (fd, form) => {
      const id = form.dataset.course, n = Number(form.dataset.n) || 0, ng = Number(form.dataset.ng) || 0, ne = Number(form.dataset.ne) || 0, cats = U.safeJson(form.dataset.cats || '[]', []);
      const s = (k) => String(fd.get(k) ?? '').trim(), nz = (k) => { const v = s(k); return v === '' ? null : Number(v.replace(',', '.')); };
      const prova = [], coresIn = [];
      for (let i = 0; i < n; i++) { const nome = s('nome' + i); if (!nome) continue; coresIn.push([s('id' + i), nome, s('cor' + i)]); prova.push({ id: s('id' + i), nome, grupo: s('grupo' + i), questoes: fd.get('questoes' + i), peso: fd.get('peso' + i), minimo: fd.get('minimo' + i), minimoEm: s('minimoEm' + i) || 'pontos', categorias: [] }); }
      let list = E.normProva(prova);
      if (!list.length) { if (typeof toast === 'function') toast('Informe ao menos uma disciplina com número de questões.'); return; }
      const prev = E.prova(id);
      list = list.map((d) => ({ ...d, categorias: prev.find((x) => x.id === d.id)?.categorias || (/portugu/i.test(d.nome) ? ['Português'] : /legisla/i.test(d.nome) ? ['Legislação e Administração'] : []), padrao: prev.find((x) => x.id === d.id)?.padrao ?? d.padrao }));
      cats.forEach((cat, j) => { const dest = s('cat' + j); if (!dest) return; list.forEach((d) => { d.categorias = d.categorias.filter((x) => x !== cat); if (d.id === dest && !d.padrao) d.categorias.push(cat); }); });
      if (!list.some((d) => d.padrao)) list[list.length - 1].padrao = true;
      const grupos = []; for (let j = 0; j < ng; j++) { const nome = s('g_nome' + j); if (nome) grupos.push({ nome, minimo: nz('g_min' + j) ?? 0, minimoEm: s('g_minEm' + j) || 'pontos', peso: nz('g_peso' + j) ?? 1 }); }
      const etapas = []; for (let j = 0; j < ne; j++) { const tipo = s('et_tipo' + j), max = nz('et_max' + j); if (!tipo || !max) continue; etapas.push({ tipo, nome: s('et_nome' + j), max, minimo: nz('et_min' + j) ?? 0, minimoEm: s('et_minEm' + j), carater: s('et_car' + j), peso: nz('et_peso' + j) }); }
      const cargo = {}; for (const k of ['vagas', 'carga', 'vencimento', 'validade', 'desempate']) { const v = s('cargo_' + k); if (v) cargo[k] = v; }
      const nm = Number(form.dataset.nm) || 0, mapaDisciplina = { ...(E.get(id)?.mapaDisciplina || {}) };
      for (let j = 0; j < nm; j++) { const code = s('mm_code' + j); if (!code) continue; const v = s('mm' + j); if (v && list.some((d) => d.id === v)) mapaDisciplina[code] = v; else delete mapaDisciplina[code]; }
      const cores = {}; for (const [cid, nome, cor] of coresIn) { if (!cor) continue; const d = list.find((x) => (cid && x.id === cid) || x.nome === nome); if (d) cores[d.id] = cor; }
      E.set(id, { mapaDisciplina, cores, prova: list, grupos, etapas, titulos: null, minimoGeral: nz('minimoGeral'), minimoGeralEm: s('minimoGeralEm') || 'pontos', formato: s('formato') || 'multipla', penalidade: nz('penalidade') ?? 0, escala: s('escala') || 'soma', notaFinal: s('notaFinal') || 'soma', pesoObjetiva: nz('pesoObjetiva'), naoZerar: fd.get('naoZerar') === 'on', banca: s('banca').toUpperCase().slice(0, 40), fonte: s('fonte'), cargo });
      if (typeof toast === 'function') toast('Estrutura da prova salva.');
      P.schedule('course');
    },
    'edital-pdf': (id) => { lerPdfDoCurso(id); },
    'descartar-leitura': (id) => { leituras.delete(String(id)); P.schedule('course'); },
    'aplicar-leitura': (arg) => {
      const [id, modo] = String(arg).split('|'), st = leituras.get(String(id));
      if (!st?.plan) return;
      const plan = modo === 'fases' ? { schema: st.plan.schema, fases: st.plan.fases, programa: [], prova: [], leitura: st.plan.leitura } : st.plan;
      try {
        if (modo === 'fases') { const fases = { ...(E.get(id)?.fases || {}) }; for (const f of plan.fases) fases[f.id] = { date: f.data }; E.set(id, { fases }); }
        else { const r = E.importKit(id, JSON.stringify(plan)); if (typeof toast === 'function') toast('Raio-X montado: ' + r.disciplinas + ' disciplinas · ' + r.fases + ' datas do cronograma. Ajuste o que precisar em “Editar estrutura da prova”.'); }
        leituras.delete(String(id));
      } catch (e) { if (typeof toast === 'function') toast(String(e?.message || e)); }
      if (typeof touchPreferences === 'function') touchPreferences();
      P.schedule('course');
    },
    'clear-prova': (id, el) => P.armed(el, () => { E.set(id, { prova: [], grupos: [], etapas: [], minimoGeral: null, titulos: null, banca: '', fonte: '', leitura: null }); P.schedule('course'); }, 'Toque de novo para remover'),
    'apply-padrao': (arg) => { const [id, banca] = String(arg).split('|'); if (E.aplicarPadrao(id, banca) && typeof toast === 'function') toast('Estrutura ' + banca + ' aplicada. Confira e ajuste se o edital for diferente.'); P.schedule('course'); },
    'recurso-add': (fd, form) => {
      const id = form.dataset.course, cl = P.courses.closure(id), q = Math.round(Number(fd.get('questao')));
      if (!(q > 0)) { if (typeof toast === 'function') toast('Informe o número da questão.'); return; }
      const recs = (Array.isArray(cl.recursos) ? cl.recursos : []).filter((r) => r && !r.removed);
      recs.push({ id: 'r' + Date.now().toString(36), questao: q, mapKey: String(fd.get('mapKey') || ''), motivo: String(fd.get('motivo') || '').trim().slice(0, 200), status: 'preparando', at: new Date().toISOString() });
      P.store.patch('closures', id, { ...cl, recursos: recs.sort((a, b) => a.questao - b.questao) });
      P.schedule('course');
    },
    'recurso-status': (value, el) => { const id = el.dataset.course, cl = P.courses.closure(id); P.store.patch('closures', id, { ...cl, recursos: (cl.recursos || []).map((r) => (r.id === el.dataset.rid ? { ...r, status: value } : r)) }); P.schedule('course'); },
    'recurso-del': (arg) => { const [id, rid] = String(arg).split('|'), cl = P.courses.closure(id); P.store.patch('closures', id, { ...cl, recursos: (cl.recursos || []).filter((r) => r.id !== rid) }); P.schedule('course'); },
    aguardando: (id) => { const cl = P.courses.closure(id); P.store.patch('closures', id, { ...cl, aguardandoAt: cl.aguardandoAt ? '' : new Date().toISOString() }); P.schedule(state.view); },
    'go-pos': () => { try { sessionStorage.setItem('studyapp.prancha.homeScreen', 'pos'); } catch {} if (typeof nav === 'function') nav('home'); },
    'set-alcance': (value, el) => { E.setAlcance(el.dataset.key, value); P.schedule(state.view); },
    unlink: (arg) => { const [key, id] = String(arg).split('|'); P.confirm('Desvincular mapa?', 'O mapa deixa de aparecer neste concurso. O HTML, o progresso e o curso de origem não mudam.', () => { P.links.link(key, id, false); P.schedule(state.view); }, 'Desvincular'); }
  };
  P.pages.courses = { render: renderList, actions: shared };
  P.pages.course = { render: renderCourse, actions: shared };
})();
