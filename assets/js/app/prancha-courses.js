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
  function crRow(s, primary) {
    const c = s.course, p = s.progress, ex = s.exam;
    return '<div class="pr-cr' + (P.courses.isArchived(c) ? ' archived' : '') + '" style="--c:' + s.color + '">' + ui.courseCov(c) +
      '<div style="display:grid;gap:6px;min-width:0"><div class="pr-row">' + statusChip(s) + '</div><h3>' + esc(c.title) + '</h3><span class="pr-mono">' + esc(P.courses.label(c) || c.city || '') + '</span>' +
      '<div class="pr-cells"><div><span>Prova</span><b class="' + (ex.days !== null && ex.days >= 0 && ex.days < 15 ? 'ox' : '') + '">' + esc(ex.date ? U.fmtDayYear(ex.date) : 'sem data') + '</b></div><div><span>Progresso</span><b>' + pct(p.marked, p.total) + '%</b></div><div><span>Tópicos</span><b>' + fmtNum(p.marked) + '/' + fmtNum(p.total) + '</b></div><div><span>Mapas</span><b>' + s.maps.length + '</b></div></div></div>' +
      ui.mini(s.maps) + '<div class="pr-row">' + ui.btn('Entrar', ui.act('open-course', c.id), primary ? 'p' : 'g') + courseMenu(c) + '</div></div>';
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
  function provaForm(c, prova, e, cats) {
    const rows = (prova.length ? prova : [{ id: '', nome: '', questoes: '', peso: 1, minimo: '' }]).concat([{ id: '', nome: '', questoes: '', peso: 1, minimo: '', nova: true }]);
    const disc = rows.map((d, i) => '<div class="pr-fgrid d" data-row="' + i + '"><label class="pr-field"><span>Disciplina' + (d.nova ? ' (nova)' : '') + '</span><input name="nome' + i + '" value="' + esc(d.nome || '') + '" maxlength="60"' + (d.nova ? ' placeholder="Opcional"' : '') + '></label><label class="pr-field"><span>Questões</span><input name="questoes' + i + '" type="number" min="0" inputmode="numeric" value="' + esc(d.questoes ?? '') + '"></label><label class="pr-field"><span>Peso</span><input name="peso' + i + '" type="number" min="0" step="0.5" inputmode="decimal" value="' + esc(d.peso ?? 1) + '"></label><label class="pr-field"><span>Mínimo</span><input name="minimo' + i + '" type="number" min="0" step="0.5" inputmode="decimal" value="' + esc(d.minimo ?? '') + '"></label><input type="hidden" name="id' + i + '" value="' + esc(d.id || '') + '"></div>').join('');
    const link = prova.length && cats.length ? '<span class="pr-k">Categoria dos mapas → disciplina</span><div class="pr-fgrid">' + cats.map((cat, j) => { const cur = E.disciplinaDoMapa({ category: cat }, c.id); return '<label class="pr-field"><span>' + esc(cat) + '</span><select name="cat' + j + '" data-cat="' + esc(cat) + '">' + prova.map((d) => '<option value="' + esc(d.id) + '"' + (cur?.id === d.id ? ' selected' : '') + '>' + esc(d.nome) + '</option>').join('') + '</select></label>'; }).join('') + '</div>' : '';
    const cargo = e.cargo || {};
    const ficha = '<span class="pr-k">Ficha do cargo (opcional)</span><div class="pr-fgrid">' + [['vagas', 'Vagas'], ['carga', 'Carga horária'], ['vencimento', 'Vencimento'], ['validade', 'Validade do concurso'], ['desempate', 'Desempate']].map(([k, l]) => '<label class="pr-field"><span>' + l + '</span><input name="cargo_' + k + '" value="' + esc(cargo[k] || '') + '" maxlength="80"></label>').join('') + '</div>';
    return '<form data-pr-submit="save-prova" data-course="' + esc(c.id) + '" data-n="' + rows.length + '" data-cats="' + esc(JSON.stringify(cats)) + '">' + disc + '<div class="pr-fgrid"><label class="pr-field"><span>Mínimo geral (pontos)</span><input name="minimoGeral" type="number" min="0" step="0.5" inputmode="decimal" value="' + esc(e.minimoGeral ?? '') + '"></label><label class="pr-field"><span>Fonte</span><input name="fonte" value="' + esc(e.fonte || '') + '" maxlength="120" placeholder="Ex.: edital, item 13.1.2"></label></div>' + link + ficha + '<div class="pr-row"><button type="submit" class="pr-btn sm">Salvar estrutura</button>' + (prova.length ? ui.btn('Remover estrutura', ui.act('clear-prova', c.id), 'g sm') : '') + '</div></form>';
  }
  function raioX(c, all) {
    const prova = E.prova(c.id), e = E.get(c.id) || {}, cats = [...new Set(all.map((m) => m.category).filter(Boolean))];
    if (!prova.length) {
      const pad = E.padraoDaBanca(c.board), list = Object.keys(E.padroes());
      const use = pad ? ui.btn('Usar estrutura ' + esc(pad.banca), ui.act('apply-padrao', c.id + '|' + pad.banca), 'p sm') : list.length ? '<span class="pr-row">' + list.map((b) => ui.btn('Usar ' + esc(b), ui.act('apply-padrao', c.id + '|' + b), 'g sm')).join('') + '</span>' : '';
      return ui.card(ui.head('Raio-X da prova', 'Estrutura ainda não informada', '', 'l') + '<p class="pr-detail">Com questões, pesos e mínimos de cada disciplina, o curso passa a mostrar quanto cada mapa vale na prova e a nota no formato da banca.' + (pad ? ' A banca deste curso tem um padrão salvo em Configurações.' : '') + '</p>' + use + '<details class="pr-add"><summary>Informar manualmente</summary>' + provaForm(c, [], e, cats) + '</details>', 'pr-raiox-card');
    }
    const max = E.pontosMax(prova), mg = E.minimoGeral(c.id);
    const disc = prova.map((d) => {
      const ms = all.filter((m) => E.disciplinaDoMapa(m, c.id)?.id === d.id), color = ms[0] ? P.mapColor(ms[0]) : 'var(--pr-latao)';
      return '<div class="pr-dsc" style="--c:' + color + '"><span class="pr-k">' + esc(d.nome) + (d.padrao ? ' · demais conteúdos' : '') + '</span><b class="pr-sig">' + d.questoes + ' q</b><div class="pr-dcells"><span><i>Peso</i>' + String(d.peso).replace('.', ',') + '</span><span><i>Pontos</i>' + String(d.questoes * d.peso).replace('.', ',') + '</span><span><i>Mínimo</i>' + String(d.minimo).replace('.', ',') + '</span></div><div class="pr-row">' + (ms.length ? ms.map((m) => '<span class="pr-chip c" style="--c:' + P.mapColor(m) + '">' + esc(m.code || m.title) + '</span>').join('') : '<span class="pr-mono">nenhum mapa ligado</span>') + '</div></div>';
    }).join('');
    const cargo = e.cargo || {}, fichaCells = [['Vagas', cargo.vagas], ['Carga horária', cargo.carga], ['Vencimento', cargo.vencimento], ['Validade', cargo.validade], ['Desempate', cargo.desempate]].filter(([, v]) => v);
    const ficha = fichaCells.length ? '<div class="pr-ficha">' + fichaCells.map(([l, v]) => '<span><i>' + l + '</i>' + esc(v) + '</span>').join('') + '</div>' : '';
    const sub = prova.reduce((n, d) => n + d.questoes, 0) + ' questões · ' + String(max).replace('.', ',') + ' pontos' + (mg !== null ? ' · mínimo geral ' + String(mg).replace('.', ',') : '');
    return ui.card(ui.head('Raio-X da prova', sub, e.fonte ? '<span class="pr-mono">' + esc(e.fonte) + '</span>' : '', 'l') + '<div class="pr-dscs">' + disc + '</div>' + ficha + '<details class="pr-add"><summary>Editar estrutura da prova</summary>' + provaForm(c, prova, e, cats) + '</details>', 'pr-raiox-card');
  }
  /* V15.57 · fechamento no curso: gabarito, recursos ligados aos mapas e aguardando convocação */
  const REC_ST = [['preparando', 'Preparando'], ['enviado', 'Enviado'], ['deferido', 'Deferido'], ['indeferido', 'Indeferido']];
  function fechamento(c, all) {
    const cl = P.courses.closure(c.id), prova = E.prova(c.id), sig = P.courses.sigla(c);
    const gp = prova.length && cl.gabarito?.porDisciplina ? E.pontuar(c.id, Object.fromEntries(Object.entries(cl.gabarito.porDisciplina).map(([k, v]) => [k, v.acertos]))) : null;
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
    const acts = '<div class="pr-acts" role="group" aria-label="Ações do curso"><button type="button" data-pr-act="course-edital" data-arg="' + esc(c.id) + '"' + (hasEdital ? '' : ' disabled title="Nenhum edital anexado"') + '>Edital</button><button type="button" data-pr-act="course-sims" data-arg="' + esc(c.id) + '">Simulados</button></div>' + ui.menu('course-' + c.id, [['Revisão relâmpago', ui.act('relampago')], ['Importar mapas', ui.act('import-maps')], ['Gerenciar curso', ui.act('manage-course', c.id)], [P.courses.isArchived(c) ? 'Reativar curso' : 'Arquivar curso', ui.act('archive', c.id), P.courses.isArchived(c) ? '' : 'd']]);
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
      const id = form.dataset.course, n = Number(form.dataset.n) || 0, cats = U.safeJson(form.dataset.cats || '[]', []);
      const prova = [];
      for (let i = 0; i < n; i++) { const nome = String(fd.get('nome' + i) || '').trim(); if (!nome) continue; prova.push({ id: String(fd.get('id' + i) || ''), nome, questoes: fd.get('questoes' + i), peso: fd.get('peso' + i), minimo: fd.get('minimo' + i), categorias: [] }); }
      let list = E.normProva(prova);
      if (!list.length) { if (typeof toast === 'function') toast('Informe ao menos uma disciplina com número de questões.'); return; }
      const prev = E.prova(id);
      list = list.map((d) => ({ ...d, categorias: prev.find((x) => x.id === d.id)?.categorias || (d.nome === 'Língua Portuguesa' ? ['Português'] : /legisla/i.test(d.nome) ? ['Legislação e Administração'] : []), padrao: prev.find((x) => x.id === d.id)?.padrao ?? d.padrao }));
      cats.forEach((cat, j) => { const dest = String(fd.get('cat' + j) || ''); if (!dest) return; list.forEach((d) => { d.categorias = d.categorias.filter((x) => x !== cat); if (d.id === dest && !d.padrao) d.categorias.push(cat); }); });
      if (!list.some((d) => d.padrao)) list[list.length - 1].padrao = true;
      const cargo = {}; for (const k of ['vagas', 'carga', 'vencimento', 'validade', 'desempate']) { const v = String(fd.get('cargo_' + k) || '').trim(); if (v) cargo[k] = v; }
      const mg = String(fd.get('minimoGeral') || '').trim();
      E.set(id, { prova: list, minimoGeral: mg === '' ? null : Number(mg.replace(',', '.')), fonte: String(fd.get('fonte') || '').trim(), cargo });
      if (typeof toast === 'function') toast('Estrutura da prova salva.');
      P.schedule('course');
    },
    'clear-prova': (id, el) => P.armed(el, () => { E.set(id, { prova: [], minimoGeral: null }); P.schedule('course'); }, 'Toque de novo para remover'),
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
