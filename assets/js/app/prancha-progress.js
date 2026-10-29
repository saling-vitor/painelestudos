'use strict';
/* MEUS MAPAS · Prancha · Progresso como prancha de obra: carimbo, planta, curva e detalhes. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.progress) return;
  const U = P.util, ui = P.ui, { esc, fmtMin, fmtSec, fmtDay, fmtNum, plural, pct } = U;
  let sel = '', tileFilter = 'todos', hoverKey = '';

  function curve(courseId, p, ex, f) {
    const hist = P.history.read(), keys = Object.keys(hist).sort();
    const pts = keys.map((k) => { const h = hist[k]; const v = courseId ? h.byCourse?.[courseId] : [h.marked, h.total]; return v ? { d: U.parseDate(k), v: v[0], t: v[1] } : null; }).filter(Boolean);
    const total = p.total || 1, today = U.startDay();
    if (!pts.length || U.dateKey(pts[pts.length - 1].d) !== U.dateKey(today)) pts.push({ d: today, v: p.marked, t: total });
    const start = pts[0].d;
    const planEnd = f?.finishDate && ex?.date ? (f.finishDate < ex.date ? f.finishDate : null) : null;
    let end = U.addDays(today, 7);
    if (ex?.date && ex.date > end) end = U.addDays(ex.date, 4);
    if (U.daysBetween(start, end) < 14) end = U.addDays(start, 14);
    const W = 640, H = 250, L = 42, R = 16, T = 14, B = 30, span = Math.max(1, U.daysBetween(start, end));
    const x = (d) => L + (U.daysBetween(start, d) / span) * (W - L - R), y = (v) => T + (1 - v / total) * (H - T - B);
    let g = '';
    const step = total > 400 ? 200 : total > 120 ? 50 : 20;
    for (let t = 0; t <= total; t += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="rgba(236,226,208,.06)"/><text x="' + (L - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end">' + t + '</text>';
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(total) + '" y2="' + y(total) + '" stroke="var(--pr-latao-e)" stroke-dasharray="2 4"/><text x="' + (L + 6) + '" y="' + (y(total) + 14) + '" style="fill:var(--pr-latao-e)">' + total + ' tópicos</text>';
    const ticks = (U.dateKey(start) === U.dateKey(today) ? [today] : [start, today]).concat(ex?.date && ex.date > today ? [ex.date] : []);
    ticks.forEach((d, i) => { g += '<text x="' + x(d) + '" y="' + (H - 10) + '" text-anchor="' + (i === 0 ? 'start' : 'middle') + '">' + (U.dateKey(d) === U.dateKey(today) ? 'hoje' : fmtDay(d)) + '</text>'; });
    const path = pts.map((q, i) => (i ? 'L' : 'M') + x(q.d).toFixed(1) + ' ' + y(q.v).toFixed(1)).join(' ');
    if (pts.length > 1) g += '<path d="' + path + ' L' + x(today).toFixed(1) + ' ' + y(0) + ' L' + x(start).toFixed(1) + ' ' + y(0) + ' Z" fill="rgba(195,170,132,.10)"/>';
    g += '<path d="' + path + '" fill="none" stroke="var(--pr-latao)" stroke-width="2"/>';
    const pace = P.time.pace(courseId);
    if (pace && pace.perDay > 0) { const endV = Math.min(total, p.marked + pace.perDay * U.daysBetween(today, end)); g += '<line x1="' + x(today) + '" y1="' + y(p.marked) + '" x2="' + x(end) + '" y2="' + y(endV) + '" stroke="var(--pr-papel-3)" stroke-width="1.5" stroke-dasharray="4 4"/>'; }
    if (f?.remainingTopics && f.finishDate) { const fe = f.finishDate > end ? end : f.finishDate; const fv = f.finishDate > end ? p.marked + (total - p.marked) * (U.daysBetween(today, end) / Math.max(1, U.daysBetween(today, f.finishDate))) : total; g += '<line x1="' + x(today) + '" y1="' + y(p.marked) + '" x2="' + x(fe) + '" y2="' + y(fv) + '" stroke="var(--pr-latao)" stroke-width="1.5" stroke-dasharray="6 4"/>' + (f.finishDate <= end ? '<circle cx="' + x(fe) + '" cy="' + y(total) + '" r="4" fill="#000" stroke="var(--pr-latao)" stroke-width="1.5"/><text x="' + (x(fe) - 6) + '" y="' + (y(total) - 8) + '" text-anchor="end" style="fill:var(--pr-latao)">plano: ' + fmtDay(f.finishDate) + '</text>' : ''); }
    if (ex?.date && ex.date >= start && ex.date <= end) g += '<line x1="' + x(ex.date) + '" x2="' + x(ex.date) + '" y1="' + T + '" y2="' + y(0) + '" stroke="var(--pr-oxido)" stroke-width="1.5"/><text x="' + (x(ex.date) - 5) + '" y="' + y(total * 0.1) + '" text-anchor="end" style="fill:var(--pr-oxido)">prova ' + fmtDay(ex.date) + '</text>';
    g += '<circle cx="' + x(today) + '" cy="' + y(p.marked) + '" r="4.5" fill="var(--pr-latao)" stroke="#000" stroke-width="2"/><text x="' + (x(today) - 8) + '" y="' + (y(p.marked) - 10) + '" text-anchor="end" style="fill:var(--pr-papel)">' + p.marked + '</text>';
    const note = keys.length < 2 ? '<p class="pr-mono">A curva começou a ser registrada em ' + esc(fmtDay(pts[0].d)) + '. Cada dia em que o app abre grava um ponto; dias anteriores não são reconstruídos.</p>' : '';
    return '<div class="pr-chart" tabindex="0" role="region" aria-label="Curva de avanço (role para os lados)"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tópicos marcados ao longo do tempo">' + g + '</svg></div>' + note;
  }
  function heat() {
    const days = P.time.days(), keys = Object.keys(days).filter((k) => days[k] > 0).sort(), first = keys[0] ? U.parseDate(keys[0]) : null;
    const today = U.startDay(), startW = U.addDays(today, -((today.getDay() + 6) % 7) - 11 * 7);
    let html = '', tot = 0, streak = 0;
    const labels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
    for (let r = 0; r < 7; r++) {
      html += '<span>' + labels[r] + '</span>';
      for (let w = 0; w < 12; w++) {
        const d = U.addDays(startW, w * 7 + r), k = U.dateKey(d), sec = Number(days[k] || 0), m = sec / 60;
        tot += sec;
        if (d > today) { html += '<i class="fut" title="' + fmtDay(d) + '"></i>'; continue; }
        if (!first || d < first) { html += '<i title="' + fmtDay(d) + ': sem registro"></i>'; continue; }
        const a = m === 0 ? 0 : m < 40 ? 0.3 : m < 90 ? 0.5 : m < 180 ? 0.75 : 1;
        html += '<i title="' + fmtDay(d) + ': ' + fmtMin(m) + '" style="' + (a ? 'background:color-mix(in srgb,var(--pr-latao) ' + a * 100 + '%,var(--pr-g3))' : 'background:var(--pr-g2);outline:1px solid var(--pr-linha-s)') + '"></i>';
      }
    }
    for (let i = 0; i < 400; i++) { const k = U.dateKey(U.addDays(today, -i)); if (Number(days[k] || 0) > 0) streak++; else if (i > 0) break; }
    return { html, tot, streak, first };
  }
  function weekBars() {
    const days = P.time.days(), goal = P.time.goals().daily, today = U.startDay(), mon = U.addDays(today, -((today.getDay() + 6) % 7));
    const vals = Array.from({ length: 7 }, (_, i) => { const d = U.addDays(mon, i); return { d, m: Number(days[U.dateKey(d)] || 0) / 60 }; });
    const max = Math.max(goal, ...vals.map((x) => x.m), 1);
    return '<div class="pr-week" role="img" aria-label="Minutos por dia nesta semana">' + vals.map((x, i) => '<div class="col"><div class="b ' + (x.m < goal ? 'low' : '') + (U.dateKey(x.d) === U.dateKey(today) ? ' today' : '') + '" style="height:' + Math.max(2, (x.m / max) * 92) + 'px" title="' + fmtMin(x.m) + '"></div><span>' + 'STQQSSD'[i] + '</span></div>').join('') + '<div class="pr-goal" style="bottom:' + ((goal / max) * 92 + 22) + 'px"><em>meta ' + fmtMin(goal) + '</em></div></div>';
  }
  function resolveDoubt(id) {
    const data = window.StudyDashboard?.exportData?.();
    const row = data?.doubts?.find((d) => d.id === id);
    if (!row) return;
    row.resolved = !row.resolved; row.updatedAt = new Date().toISOString(); data.updatedAt = row.updatedAt;
    window.StudyDashboard.importData(data, { merge: false, silent: true });
    if (typeof touchPreferences === 'function') touchPreferences();
  }


  /* ---------- V15.58 · o que o mapa registra ---------- */
  function notaCard(s) {
    const np = P.editais.notaProjetada?.(s.id);
    if (!np) return ui.card(ui.head('Nota projetada', 'Sem estrutura da prova') + ui.empty('Cadastre a prova do edital', 'Com questões, peso e mínimo por disciplina, a nota projetada aparece aqui.', ui.btn('Prova do edital', ui.act('course-edital', s.id), 'g sm') + ui.btn('Importar planejamento do kit', ui.act('import-kit', s.id), 'g sm')));
    const fp = P.editais.fmtPt;
    return ui.card(ui.head('Nota projetada', (np.estimativa ? 'Estimativa: parte das disciplinas ainda sem questões respondidas' : 'Pelo domínio registrado nas questões dos mapas'), '<span class="pr-k ' + (np.aprovado ? 'ok' : 'o') + '">' + fp(np.pontos) + ' / ' + fp(np.max) + ' pts</span>') +
      '<div class="pr-nota">' + np.por.map((r) => { const w = r.max ? Math.min(100, (r.pontos / r.max) * 100) : 0, mk = r.max ? Math.min(100, (r.minimo / r.max) * 100) : 0; return '<div class="pr-nt' + (r.ok ? '' : ' x') + '" style="--c:' + r.cor + '"><span class="nm">' + esc(r.nome) + '</span><span class="bar"><i style="width:' + w + '%"></i>' + (r.minimo ? '<b style="left:' + mk + '%" title="mínimo ' + fp(r.minimo) + '"></b>' : '') + '</span><span class="v">' + fp(r.pontos) + (r.minimo ? ' · mín ' + fp(r.minimo) : '') + (r.estimativa ? ' *' : '') + '</span></div>'; }).join('') + '</div>' +
      '<p class="pr-mono">' + (np.aprovado ? 'Acima de todos os mínimos' + (np.minimoGeral !== null ? ' e do mínimo geral (' + fp(np.minimoGeral) + ')' : '') + '.' : 'Abaixo do mínimo em ' + np.por.filter((r) => !r.ok).map((r) => esc(r.nome)).join(', ') + (np.minimoGeral !== null && np.pontos < np.minimoGeral ? ' · geral ' + fp(np.minimoGeral) : '') + '.') + (np.estimativa ? ' * cobertura × 0,7 enquanto não há questões respondidas.' : '') + '</p>');
  }
  function cdCard(maps) {
    const Q = { ok: [], ilusao: [], leitura: [], aberto: [] };
    for (const m of maps) { const ms = P.mastery.of(m); if (ms.dominio === null) { if (ms.cobertura >= 50) Q.leitura.push(m); else Q.aberto.push(m); continue; } (ms.cobertura >= 50 ? (ms.dominio >= 70 ? Q.ok : Q.ilusao) : (ms.dominio >= 70 ? Q.ok : Q.aberto)).push(m); }
    const box = (k, t, d, cls) => '<div class="pr-q ' + cls + '"><span class="pr-k">' + t + ' · ' + Q[k].length + '</span><p>' + d + '</p><div class="pr-row">' + Q[k].slice(0, 6).map((m) => '<button type="button" class="pr-sig" style="--c:' + P.mapColor(m) + '" data-pr-act="open-map" data-arg="' + esc(P.data.keyOf(m)) + '" title="' + esc(m.title) + '">' + esc(m.code || '') + '</button>').join('') + (Q[k].length > 6 ? '<span class="pr-mono">+' + (Q[k].length - 6) + '</span>' : '') + '</div></div>';
    return ui.card(ui.head('Cobertura × domínio', 'Marcar o tópico não é o mesmo que acertar a questão') + '<div class="pr-quad">' + box('ok', 'Dominado', 'Lido e com acerto ≥ 70% nas questões do mapa.', 'ok') + box('ilusao', 'Ilusão de domínio', 'Marcado, mas errando nas questões. Revise antes de seguir.', 'o') + box('leitura', 'Só leitura', 'Marcado sem nenhuma questão respondida no mapa.', 'l') + box('aberto', 'Em aberto', 'Pouco lido ainda.', '') + '</div>');
  }
  function matrizCard(s) {
    const mx = P.mastery.matriz?.(s.id);
    if (!mx) return '';
    const cel = (v, cls) => '<span class="pr-mx ' + cls + '">' + (v === null ? '—' : v + '%') + '</span>';
    return ui.card(ui.head('Matriz pelo programa', mx.fonte === 'programa' ? mx.rows.length + ' itens do edital · ' + mx.semMapa + ' sem mapa' : 'Por disciplina · importe o planejamento do kit para ver item a item', '<span class="pr-mono">cobertura · domínio</span>') +
      '<div class="pr-list pr-matriz">' + mx.rows.slice(0, 40).map((r) => '<div class="pr-li' + (r.mapas.length ? '' : ' x') + '"><span class="pr-row" style="flex-wrap:nowrap">' + (r.mapas.length ? r.mapas.slice(0, 3).map((m) => '<span class="pr-sig" style="--c:' + P.mapColor(m) + '">' + esc(m.code || '') + '</span>').join('') : '<span class="pr-sig">sem mapa</span>') + '</span><span>' + esc(r.item) + (r.disciplina && r.disciplina !== r.item ? '<br><span class="t">' + esc(r.disciplina) + '</span>' : '') + '</span><span class="pr-row" style="flex-wrap:nowrap">' + cel(r.mapas.length ? r.cobertura : null, !r.mapas.length ? '' : r.cobertura >= 80 ? 'ok' : r.cobertura < 30 ? 'o' : '') + cel(r.dominio, r.dominio === null ? '' : r.dominio >= 70 ? 'ok' : 'o') + '</span></div>').join('') + '</div>' + (mx.rows.length > 40 ? '<p class="pr-mono">+' + (mx.rows.length - 40) + ' itens na Matriz do edital.</p>' : ''));
  }
  function cadernoCard(s) {
    const ca = P.mastery.caderno?.(s.id);
    if (!ca || !ca.list.length) return ui.card(ui.head('Erros por armadilha', 'Nenhum erro classificado ainda') + ui.empty('Responda questões nos mapas ou faça um treino', 'Cada erro é classificado pela armadilha da banca: exceção, prazo, competência, troca de conceitos…'));
    const max = ca.list[0].total || 1;
    return ui.card(ui.head('Erros por armadilha', ca.total + ' erros classificados · mapas, treinos e simulados', ui.btn('Caderno de erros', ui.act('nav', 'errors'), 'g sm')) + '<div class="pr-list">' + ca.list.slice(0, 6).map((r) => '<div class="pr-li pr-arm"><span class="pr-mono">' + r.total + '</span><span><b>' + esc(r.label) + '</b><span class="bar"><i style="width:' + Math.round((r.total / max) * 100) + '%"></i></span><span class="t">' + esc(r.antidoto) + ' · mapa ' + r.mapa + ' · treino ' + r.treino + ' · simulado ' + r.simulado + '</span></span><span class="pr-row" style="flex-wrap:nowrap">' + r.mapas.map((x) => '<button type="button" class="pr-sig" style="--c:' + P.mapColor(x.map) + '" data-pr-act="open-map" data-arg="' + esc(P.data.keyOf(x.map)) + '" title="' + esc(x.map.title) + ' · ' + x.n + '">' + esc(x.map.code || '') + '</button>').join('') + '</span></div>').join('') + '</div>');
  }

  /* ---------- V15.63 · desempenho do TEC Concursos ---------- */
  const pc = (x) => (x === null || x === undefined ? '—' : Math.round(x * 100) + '%');
  const tecInput = '<input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden data-pr-change="tec-file" data-pr-tec>';
  function tecCard(s) {
    const R = P.tec?.resumo?.(s.id);
    const imp = (l, cls) => ui.btn(l, ui.act('tec-pick'), cls || 'g sm');
    if (!R) return ui.card(ui.head('Desempenho no TEC', 'Questões resolvidas no TEC Concursos') + ui.empty('Importe a planilha do TEC', 'No TEC: Estatísticas › Desempenho › exportar (.xlsx). O app projeta a sua nota no formato da banca, aponta os assuntos que mais custam pontos e mostra a evolução entre uma importação e outra.', imp('Importar planilha do TEC', 'p')) + tecInput);
    const fp = P.editais.fmtPt, sn = R.snap, quando = fmtDay(new Date(sn.at));
    const sub = fmtNum(sn.total.q) + ' questões · ' + pc(sn.total.a / sn.total.q) + ' de acerto · leitura de ' + quando;
    const evol = R.evol ? '<div class="pr-tec-ev"><span class="pr-k l">Desde a leitura anterior</span><p><b>' + (R.evol.dq > 0 ? '+' + fmtNum(R.evol.dq) + ' questões · ' + pc(R.evol.recente) + ' de acerto nelas' : 'Nenhuma questão nova') + '</b> · média geral ' + pc(R.evol.antes) + ' → ' + pc(R.evol.agora) + '</p>' + (R.evol.materias.length ? '<div class="pr-row">' + R.evol.materias.slice(0, 5).map((m) => '<span class="pr-chip' + (m.recente !== null && m.antes !== null && m.recente < m.antes - 0.05 ? ' ox' : m.recente !== null && m.antes !== null && m.recente > m.antes + 0.05 ? ' ok' : '') + '" title="antes ' + pc(m.antes) + ' · nas novas ' + pc(m.recente) + '">' + esc(m.n) + ' +' + m.dq + ' · ' + pc(m.recente) + '</span>').join('') + '</div>' : '') + '</div>' : '';
    const acoes = '<div class="pr-row">' + imp('Importar nova leitura') + ui.btn('Descartar esta leitura', ui.act('tec-remove', sn.id), 'g sm') + tecInput + '</div>';
    if (R.semProva) return ui.card(ui.head('Desempenho no TEC', sub) + ui.empty('Cadastre a prova do edital', 'Com as disciplinas da prova, o acerto do TEC vira nota projetada no formato da banca.', ui.btn('Prova do edital', ui.act('course-edital', s.id), 'g sm')) + evol + acoes);
    const res = R.res, ok = res.aprovado;
    const barras = '<div class="pr-nota">' + R.por.map((r) => { const w = r.max ? Math.min(100, (r.pontos / r.max) * 100) : 0, mk = r.max ? Math.min(100, (r.minimo / r.max) * 100) : 0; const am = r.semDados ? 'sem questões no TEC · média geral' : pc(r.taxa) + ' em ' + fmtNum(r.q) + ' q' + (r.amostra === 'pequena' ? ' · amostra pequena' : ''); return '<div class="pr-nt' + (r.ok ? '' : ' x') + '" style="--c:' + r.cor + '"><span class="nm">' + esc(r.nome) + '<span class="t">' + esc(am) + '</span></span><span class="bar"><i style="width:' + w + '%"></i>' + (r.minimo ? '<b style="left:' + mk + '%" title="mínimo ' + fp(r.minimo) + '"></b>' : '') + '</span><span class="v">' + r.acertos + '/' + r.questoes + ' · ' + fp(r.pontos) + ' pts' + (r.minimo ? ' · mín ' + fp(r.minimo) : '') + '</span></div>'; }).join('') + '</div>';
    const falhas = res.falhas.filter((f) => !f.etapa);
    const veredito = '<p class="pr-mono">' + (res.indeterminado ? 'Nota padronizada: o corte depende da turma; veja o acerto por disciplina.' : ok === false || falhas.length || res.geralOk === false ? 'Com esse acerto, ficaria abaixo ' + (falhas.length ? 'do mínimo em ' + falhas.map((f) => esc(f.nome)).join(', ') : '') + (res.geralOk === false ? (falhas.length ? ' e ' : '') + 'do mínimo geral (' + fp(res.minimoGeral) + ')' : '') + '.' : 'Com esse acerto, passaria todos os mínimos' + (res.minimoGeral !== null ? ' e o geral (' + fp(res.minimoGeral) + ')' : '') + '.') + ' Conta: questões da prova × acerto no TEC em cada disciplina' + (res.regras?.penalidade ? ', descontando os erros' : '') + '.</p>';
    const fr = R.fracos.length ? '<div class="pr-list pr-tec-fr">' + R.fracos.slice(0, 8).map((f) => '<div class="pr-li" style="--c:' + f.cor + '"><span class="pr-mono pr-tec-pc">' + pc(f.taxa) + '</span><span><b>' + esc(f.nome) + '</b><span class="t">' + esc((f.pai ? f.pai + ' · ' : '') + f.materia + ' · ' + f.q + ' questões · ' + f.discNome) + '</span></span><span class="pr-row" style="flex-wrap:nowrap">' + (f.mapa ? '<button type="button" class="pr-sig" style="--c:' + P.mapColor(f.mapa) + '" data-pr-act="open-map" data-arg="' + esc(P.data.keyOf(f.mapa)) + '" title="Abrir ' + esc(f.mapa.title) + '">' + esc(f.mapa.code || 'Mapa') + '</button>' : '<span class="t">sem mapa</span>') + '</span></div>').join('') + '</div>' : ui.empty('Nenhum ponto fraco claro', 'Todos os assuntos com 6 ou mais questões estão perto ou acima de 70% de acerto.');
    const discs = P.editais.prova(s.id);
    const lista = R.fora.length || R.snap.materias.length ? R.snap.materias.slice(0, 60) : [];
    const lig = '<details class="pr-rot pr-tec-lg"><summary>Matérias do TEC → disciplinas da prova · ' + (R.snap.materias.length - R.fora.length) + ' ligadas' + (R.fora.length ? ', ' + R.fora.length + ' fora da prova (' + fmtNum(R.fora.reduce((t, m) => t + m.q, 0)) + ' q)' : '') + '</summary><form data-pr-submit="tec-map" data-n="' + lista.length + '"><div class="pr-list">' + lista.map((m, i) => { const k = P.tec.key(m.n), l = R.lig.get(k) || {}; return '<label class="pr-li pr-tec-li"><span class="pr-mono">' + fmtNum(m.q) + '</span><span><b>' + esc(m.n) + '</b><span class="t">' + pc(m.a / m.q) + ' de acerto' + (l.via === 'manual' ? ' · ligado por você' : l.via ? ' · ✦ automático' : '') + '</span></span><input type="hidden" name="k' + i + '" value="' + esc(k) + '"><input type="hidden" name="c' + i + '" value="' + esc(l.id || '-') + '"><select name="d' + i + '" aria-label="Disciplina de ' + esc(m.n) + '">' + discs.map((d) => '<option value="' + esc(d.id) + '"' + (l.id === d.id ? ' selected' : '') + '>' + esc(d.nome) + '</option>').join('') + '<option value="-"' + (!l.id ? ' selected' : '') + '>— fora da prova</option></select></label>'; }).join('') + '</div><div class="pr-row" style="margin-top:10px"><button type="submit" class="pr-btn p">Salvar ligações</button><span class="pr-mono">✦ ligado pelo nome e pelos assuntos; mude o que não fizer sentido para esta prova.</span></div></form></details>';
    return ui.card(ui.head('Nota pelo TEC', sub, '<span class="pr-k ' + (ok ? 'ok' : 'o') + '">' + fp(res.pontos) + ' / ' + fp(res.max ?? res.maxPontos) + (res.max === 10 ? '' : ' pts') + '</span>') + barras + veredito +
      '<div class="pr-tec-sub"><span class="pr-k l">Onde o TEC mostra que você perde mais pontos</span><p class="pr-mono">Assuntos abaixo de 70%, ordenados pelo valor da disciplina na prova e pelo número de questões.</p>' + fr + '</div>' + evol + lig + acoes);
  }
  async function tecFile(el) {
    const f = el.files?.[0];
    el.value = '';
    if (!f) return;
    try {
      const snap = await window.MeusMapasTec.lerArquivo(f);
      const r = P.tec.save(snap);
      if (typeof toast === 'function') toast(r.igual ? 'Esta planilha é igual à última leitura do TEC.' : 'TEC importado: ' + fmtNum(snap.total.q) + ' questões em ' + snap.materias.length + ' matérias.');
    } catch (err) { console.warn('[TEC]', err); if (typeof toast === 'function') toast(err?.message || 'Não foi possível ler a planilha do TEC.'); }
    /* o campo de arquivo com foco impediria o redesenho (proteção de digitação) */
    if (document.activeElement?.matches?.('input[type="file"]')) document.activeElement.blur();
    P.schedule('progress');
  }
  function render(root) {
    const S = P.courses.active();
    if (!sel || (sel !== 'todos' && !S.some((s) => String(s.id) === sel))) sel = P.courses.priority()?.id ? String(P.courses.priority().id) : S[0] ? String(S[0].id) : 'todos';
    const tabs = S.map((s) => ({ id: String(s.id), label: s.sigla })).concat(S.length > 1 ? [{ id: 'todos', label: 'Todos' }] : []);
    const top = ui.top({ eyebrow: 'Aprendizado', title: 'Progresso', tabs: tabs.length ? tabs : null, active: sel, label: 'Concurso', tabAct: 'course', right: '<div class="pr-row">' + ui.btn('Matriz do edital', ui.act('nav', 'matrix'), 'g sm') + ui.btn('Caderno de erros', ui.act('nav', 'errors'), 'g sm') + '</div>' });
    const s = sel === 'todos' ? null : S.find((x) => String(x.id) === sel);
    const maps = s ? P.data.mapsForCourse(s.id, { includeLinked: false }) : S.flatMap((x) => x.maps);
    if (!maps.length) { root.innerHTML = top + ui.card(ui.empty('Nenhum progresso para mostrar', 'Abra um mapa e marque os tópicos como OK, REV ou DIF.', ui.btn('Todos os Mapas', ui.act('nav', 'maps'), 'p'))); return; }
    const p = P.data.agg(maps), ex = s?.exam || null, f = s?.forecast || null, h = s?.health || null;
    const rest = Math.max(0, p.total - p.marked), goals = P.time.goals(), week = P.time.week();
    const pace = P.time.pace(s ? s.id : '');
    const paceTxt = pace && pace.days >= 3 ? (Math.round(pace.perDay * 10) / 10).toString().replace('.', ',') + '/dia' : h?.actualTopicsPerDay ? (Math.round(h.actualTopicsPerDay * 10) / 10).toString().replace('.', ',') + '/dia' : '—';
    const paceNote = pace && pace.days >= 3 ? 'desde ' + fmtDay(U.parseDate(pace.since)) : h?.actualTopicsPerDay ? 'estimado pelas sessões dos últimos 7 dias' : 'sem histórico suficiente';
    const perDay = pace && pace.days >= 3 ? pace.perDay : h?.actualTopicsPerDay || 0;
    const finishPace = perDay > 0 ? U.addDays(new Date(), Math.ceil(rest / perDay)) : null;
    const done = maps.filter((m) => { const q = P.data.prog(m); return q.total > 0 && q.marked >= q.total; }).length, never = maps.filter((m) => !P.data.prog(m).marked && !P.data.prog(m).lastActivity).length;
    let v;
    if (ex && (ex.phase === 'before' || ex.phase === 'today')) v = ui.verdict(h?.status === 'risk' ? '' : h?.status === 'healthy' ? 'm' : 'l', 'Faltam ' + ex.days + ' ' + plural(ex.days, 'dia') + ' e ' + fmtNum(rest) + ' ' + plural(rest, 'tópico') + '.', (finishPace ? 'No ritmo registrado (' + paceTxt + ') o edital fecha em ' + esc(U.fmtDayYear(finishPace)) + (finishPace > ex.date ? ', depois da prova.' : ', antes da prova.') : 'Ainda não há ritmo registrado para projetar.') + (f?.remainingSeconds ? ' O plano do app cobre o restante em ' + fmtSec(f.remainingSeconds) + ' de leitura: ' + fmtSec(f.remainingSeconds / Math.max(1, ex.days)) + ' por dia.' : ''));
    else if (!s) v = ui.verdict('l', fmtNum(rest) + ' tópicos abertos em ' + S.length + ' ' + plural(S.length, 'concurso') + '.', 'Escolha um concurso no seletor para ver o prazo e a curva contra a prova.');
    else v = ui.verdict('n', ex?.phase === 'after' ? 'A prova já passou.' : 'Sem data de prova.', ex?.phase === 'after' ? 'O fechamento fica na tela Pós-prova do Início.' : 'Defina a data para o veredito comparar o ritmo com o prazo.');
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc(s ? s.sigla + ' · ' + P.courses.label(s.course) : 'Todos os concursos') + '</span><div class="pr-big"><span class="pr-pct pr-num">' + pct(p.marked, p.total) + '<small>%</small></span><span class="pr-sub">' + fmtNum(p.marked) + ' de ' + fmtNum(p.total) + ' tópicos · ' + maps.length + ' mapas</span></div>' + ui.stateBar(p) + ui.stateLegend(p) + v + '</div><div class="pr-c-b">' +
      ui.cell('Prova', ex?.date ? esc(fmtDay(ex.date)) : '—', ex?.days !== null && ex?.days !== undefined && ex.days >= 0 && ex.days <= 7 ? 'ox' : '', ex?.date ? (ex.days > 0 ? 'em ' + ex.days + ' ' + plural(ex.days, 'dia') : ex.days === 0 ? 'hoje' : 'realizada') : 'sem data') +
      ui.cell('Restam', fmtNum(rest), '', 'tópicos') +
      ui.cell('Plano do app', f?.remainingSeconds ? fmtSec(f.remainingSeconds) : '—', 'l', f?.remainingSeconds && ex?.days > 0 ? fmtSec(f.remainingSeconds / ex.days) + '/dia até a prova' : 'leitura estimada') +
      ui.cell('Ritmo registrado', paceTxt, ex && finishPace && finishPace > ex.date ? 'ox' : '', paceNote) +
      ui.cell('Esta semana', fmtSec(week), week >= goals.weekly * 60 ? 'ok' : '', 'meta ' + fmtMin(goals.weekly)) +
      ui.cell('Mapas fechados', done + ' / ' + maps.length, done ? 'ok' : '', never + ' nunca ' + plural(never, 'aberto')) + '</div></section>';
    const catAgg = {};
    maps.forEach((m) => { const c = m.category || 'Outros', q = P.data.prog(m); catAgg[c] ||= [0, 0]; catAgg[c][0] += q.total; catAgg[c][1] += q.marked; });
    const cats = '<div class="pr-cats">' + Object.entries(catAgg).sort((a, b) => b[1][0] - a[1][0]).map(([n, [t, mk]]) => '<div class="pr-cat" style="--c:' + P.categoryPigment(n) + '"><span class="nm"><i></i><span>' + esc(n) + '</span></span><span class="bar"><i style="width:' + pct(mk, t) + '%"></i></span><span class="v">' + pct(mk, t) + '% · ' + mk + '/' + t + '</span></div>').join('') + '</div>';
    const curveCard = ui.card(ui.head('Curva de avanço', 'Tópicos marcados até a prova') + curve(s ? s.id : '', p, ex, f) + ui.legend([['Feito', '', 'var(--pr-latao)'], ['Plano do app', '', 'transparent'], ['Ritmo registrado', '', 'transparent'], ['Prova', '', 'var(--pr-oxido)']]).replace('<em style="background:transparent"></em>Plano', '<em style="background:transparent;border:1px dashed var(--pr-latao)"></em>Plano').replace('<em style="background:transparent"></em>Ritmo', '<em style="background:transparent;border:1px dashed var(--pr-papel-3)"></em>Ritmo'));
    const TF = [['todos', 'Todos'], ['fraco', 'Abaixo de 50%'], ['nunca', 'Nunca abertos'], ['feito', 'Concluídos']];
    const okT = (m) => { const q = P.data.prog(m), r = q.total ? q.marked / q.total : 0; return tileFilter === 'todos' || (tileFilter === 'fraco' && r < 0.5) || (tileFilter === 'nunca' && !q.marked && !q.lastActivity) || (tileFilter === 'feito' && r >= 1); };
    const tilesHtml = ui.tiles(maps, { sel: hoverKey }).replace(/class="pr-tile( on)?"([^>]*data-arg="([^"]+)")/g, (mm, on, rest2, key) => 'class="pr-tile' + (on || '') + (okT(maps.find((m) => P.data.keyOf(m) === key) || {}) ? '' : ' dim') + '"' + rest2);
    const planta = ui.card(ui.head('Planta do edital', 'Cada mapa é um lote, do tamanho dos seus tópicos', '<div class="pr-chips" role="group" aria-label="Filtrar mapas">' + TF.map(([id, l]) => ui.chipf(id, l, undefined, tileFilter === id, 'tile-filter')).join('') + '</div>') + tilesHtml + '<div class="pr-detail" data-pr-detail aria-live="polite">' + detail(hoverKey) + '</div>');
    const hm = heat();
    const ritmo = ui.card(ui.head('Ritmo', 'Últimas 12 semanas', '<span class="pr-k">' + fmtSec(hm.tot) + '</span>') + '<div class="pr-heat" role="img" aria-label="Minutos estudados por dia nas últimas 12 semanas">' + hm.html + '</div>' + (hm.first ? '' : '<p class="pr-mono">Nenhum tempo registrado ainda. Quadrados apagados são dias sem registro; ausência de estudo aparece com borda.</p>') + '<span class="pr-k">Esta semana · minutos por dia</span>' + weekBars() + '<div class="pr-streak"><span>Hoje <b>' + fmtSec(P.time.today()) + '</b></span><span>Meta <b>' + fmtMin(goals.daily) + '</b>/dia</span><span>Dias seguidos <b>' + hm.streak + '</b></span>' + (hm.first ? '<span>Registro desde <b>' + fmtDay(hm.first) + '</b></span>' : '') + '</div>');
    const sim = P.sims.summary(s ? s.id : '');
    const cut = s ? P.sims.cutoff(s.id) : null;
    let simCard;
    if (!sim.total) simCard = ui.card(ui.head('Simulados', 'Nenhum simulado') + ui.empty('Importe um simulado', 'A evolução da nota aparece aqui depois da primeira tentativa.', ui.btn('Importar simulado', ui.act('import-sim'), 'g sm')));
    else if (!sim.done) { const n = sim.list[0]; simCard = ui.card(ui.head('Simulados', 'Nenhum simulado feito') + '<div class="pr-empty"><b>0 de ' + sim.total + ' simulados</b><p>A curva de notas aparece aqui depois do primeiro.</p>' + ui.btn('Fazer ' + esc(P.sims.code(n.sim)) + (n.sim.durationMinutes ? ' · ' + fmtMin(n.sim.durationMinutes) : ''), ui.act('open-sim', n.key), 'p') + '</div><span class="pr-mono">Depois do simulado: nota contra o corte e acerto por disciplina.</span>'); }
    else {
      const att = sim.list.flatMap((r) => r.attempts.map((a) => ({ a, r }))).sort((x, y) => (Date.parse(x.a.finishedAt || 0) || 0) - (Date.parse(y.a.finishedAt || 0) || 0)).slice(-8);
      const max = 100;
      simCard = ui.card(ui.head('Simulados', sim.done + ' de ' + sim.total + ' feitos · melhor ' + sim.best + '%', ui.btn('Resultados', ui.act('nav', 'simulations'), 'g sm')) + '<div class="pr-week" role="img" aria-label="Notas das tentativas" style="grid-template-columns:repeat(' + att.length + ',minmax(0,1fr))">' + att.map((x) => '<div class="col"><span class="pr-mono">' + Math.round(Number(x.a.score) || 0) + '%</span><div class="b' + (cut && Number(x.a.score) < cut.value ? ' low' : '') + '" style="height:' + Math.max(2, ((Number(x.a.score) || 0) / max) * 80) + 'px"></div><span>' + esc(P.sims.code(x.r.sim).replace('SIM ', 'S')) + '</span></div>').join('') + (cut ? '<div class="pr-goal" style="bottom:' + ((cut.value / max) * 80 + 22) + 'px"><em>corte ' + cut.value + '%</em></div>' : '') + '</div>');
    }
    const pri = P.plan.priorities(3, s ? s.id : '');
    const focus = ui.card(ui.head('Onde focar agora', 'Três prioridades, com o motivo', pri[0] ? ui.btn('Começar a primeira · ' + fmtMin(pri[0].minutes), ui.act('focus-start', pri[0].key, { 'data-min': pri[0].minutes }), 'p') : '') + (pri.length ? '<div class="pr-focus">' + pri.map((r) => { const m = r.map, q = r.progress; return '<div class="pr-fo" style="--c:' + P.mapColor(m) + '"><div class="top"><span class="pr-sig">' + esc(m.code || '') + '</span><span class="pr-mono">' + q.marked + '/' + q.total + ' · ' + ui.mapState(q) + '</span></div><b style="font-size:var(--fs-body-sm)">' + esc(m.title) + '</b><div class="pr-why">' + r.reasons.slice(0, 4).map((x) => '<span class="' + (/prova|atras/.test(x) ? 'o' : /DIF|REV|revis|peso/.test(x) ? 'l' : '') + '">' + esc(x) + '</span>').join('') + '</div>' + (window.StudyPlanner?.showPriorityExplanation ? '<button type="button" class="pr-link" style="all:unset;cursor:pointer;color:var(--pr-latao-c);font-size:var(--fs-caption)" data-pr-act="explain" data-arg="' + esc(r.key) + '">Por que este mapa?</button>' : '') + ui.btn('Abrir mapa', ui.act('open-map', r.key), 'sm') + '</div>'; }).join('') + '</div>' : ui.empty('Nada pendente', 'Todos os mapas deste recorte estão em dia.')));
    const ds = P.doubts.list({ open: false }).filter((d) => !s || String(d.courseId) === String(s.id) || (d.mapKey && typeof mapById === 'function' && mapById(d.mapKey)?.courseId === s.id)).slice(0, 12);
    const dv = ui.card(ui.head('Anotações', 'Dúvidas ' + (ds.filter((d) => !d.resolved).length ? 'abertas' : ''), '<span class="pr-mono">' + ds.filter((d) => !d.resolved).length + ' abertas</span>') + (ds.length ? '<div class="pr-list">' + ds.map((d) => { const m = d.mapKey && typeof mapById === 'function' ? mapById(d.mapKey) : null; return '<div class="pr-li" style="--c:' + (m ? P.mapColor(m) : 'var(--pr-papel-3)') + (d.resolved ? ';opacity:.6' : '') + '"><span class="pr-sig">' + esc(m?.code || '—') + '</span><span>' + esc(d.text) + '<br><span class="t">' + esc(ui.lastLabel(d.createdAt)) + (d.resolved ? ' · resolvida' : '') + '</span></span><span class="pr-row" style="flex-wrap:nowrap">' + (m ? ui.btn('Abrir', ui.act('open-map', d.mapKey), 'g sm') : '') + ui.btn(d.resolved ? 'Reabrir' : 'Resolver', ui.act('doubt', d.id), 'sm') + '</span></div>'; }).join('') + '</div>' : ui.empty('Nenhuma dúvida anotada', 'No leitor, use o botão de dúvida para guardar o que precisa conferir.')));
    const v58 = s ? '<div class="pr-two">' + notaCard(s) + cdCard(maps) + '</div>' + tecCard(s) + '<div class="pr-two">' + matrizCard(s) + cadernoCard(s) + '</div>' : '';
    root.innerHTML = top + carimbo + v58 + '<div class="pr-two">' + curveCard + ui.card(ui.head('Por categoria', 'Onde o edital está coberto') + cats) + '</div>' + planta + '<div class="pr-two">' + ritmo + simCard + '</div>' + focus + dv;
  }
  function detail(key) {
    const m = key && typeof mapById === 'function' ? mapById(key) : null;
    if (!m) return 'Passe o mouse ou toque num lote para ver o detalhe.';
    const q = P.data.prog(m), sec = Number(window.StudyTime?.mapSeconds?.(key) || 0);
    return '<b>' + esc(m.code + ' · ' + m.title) + '</b> — ' + esc(m.category || '') + ' · ' + q.marked + ' de ' + q.total + ' tópicos · ' + q.difficult + ' DIF · ' + q.review + ' REV · ' + (sec ? fmtSec(sec) + ' de estudo' : 'ainda não estudado') + ' ' + ui.btn('Abrir', ui.act('open-map', key), 'sm');
  }
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest?.('[data-prancha="progress"] .pr-tile');
    if (!t || t.dataset.arg === hoverKey) return;
    hoverKey = t.dataset.arg;
    const root = t.closest('.pr'); root.querySelectorAll('.pr-tile').forEach((x) => x.classList.toggle('on', x === t));
    const d = root.querySelector('[data-pr-detail]'); if (d) d.innerHTML = detail(hoverKey);
  });
  P.pages.progress = {
    render,
    actions: {
      course: (id) => { sel = id; P.schedule('progress'); },
      'tile-filter': (id) => { tileFilter = id; P.schedule('progress'); },
      'pick-map': (key, el, root) => { hoverKey = key; root.querySelectorAll('.pr-tile').forEach((x) => x.classList.toggle('on', x.dataset.arg === key)); const d = root.querySelector('[data-pr-detail]'); if (d) d.innerHTML = detail(key); },
      doubt: (id) => { resolveDoubt(id); P.schedule('progress'); },
      'tec-pick': (a, el, root) => root.querySelector('[data-pr-tec]')?.click(),
      'tec-file': (v, el) => { tecFile(el); },
      'tec-remove': (id) => { P.tec.remove(id); if (typeof toast === 'function') toast('Leitura do TEC descartada.'); P.schedule('progress'); },
      'tec-map': (fd) => {
        const id = sel, patch = {};
        for (let i = 0; i < 200; i++) { const k = fd.get('k' + i); if (k === null) break; const v = String(fd.get('d' + i) || '-'), c = String(fd.get('c' + i) || '-'); if (v !== c) patch[k] = v; }
        if (Object.keys(patch).length) P.tec.setMap(id, patch);
        if (typeof toast === 'function') toast(Object.keys(patch).length ? 'Ligações do TEC salvas.' : 'Nada mudou nas ligações.');
        P.schedule('progress');
      },
      explain: (key, el) => { const row = P.plan.priorities(50).find((r) => r.key === key); if (row) window.StudyPlanner.showPriorityExplanation(row, el); },
      'focus-start': async (key, el) => { const map = typeof mapById === 'function' ? mapById(key) : null; if (!window.StudyDashboard?.active?.()) window.StudyDashboard?.start?.({ map, mode: 'planned', minutes: Number(el?.dataset.min) || 20, label: map?.code || 'Sessão' }); if (map && typeof openMap === 'function') await openMap(key); }
    }
  };
})();
