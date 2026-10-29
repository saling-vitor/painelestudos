'use strict';
/* MEUS MAPAS · Prancha · Configurações como ficha técnica.
   As folhas recebem os painéis reais do app (mesmos IDs e eventos); só a organização muda. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.settings) return;
  const U = P.util, ui = P.ui, { esc, fmtMin } = U;
  let offlineInfo = null, restoreCount = null, probing = false;

  const FOLHAS = [
    /* [número, id, título da folha, painéis, rótulo curto do índice] — V15.53.1: índice com rótulo curto para caber inteiro */
    ['01', 'conta', 'Conta e nuvem', ['.sync-panel'], 'Conta'],
    ['02', 'rotina', 'Rotina de estudo', ['#studySettingsPanel'], 'Rotina'],
    ['03', 'plan', 'Planejamento adaptativo', ['#plannerAdvancedSettings'], 'Planejamento'],
    ['04', 'auto', 'Automação', ['#studyAutomationPanel'], 'Automação'],
    ['05', 'dados', 'Backup e restauração', ['.backup-panel'], 'Backup'],
    ['06', 'app', 'Aparelho e aplicativo', ['#appUpdatePanel', '#appAppearancePanel', '#appDiagnosticPanel'], 'Aparelho'],
    ['07', 'adm', 'Administração', ['.admin-panel'], 'Admin'],
    /* V15.56 · padrões de edital por banca; painel próprio das pranchas (sem painel legado) */
    ['08', 'editais', 'Concursos e editais', [], 'Editais'],
    /* V15.57 · auditoria do acervo (só leitura) */
    ['09', 'acervo', 'Auditoria do acervo', [], 'Acervo']
  ];
  /* V15.55 · painéis técnicos que entram recolhidos na folha */
  const COLLAPSED = { '#appDiagnosticPanel': ['Diagnóstico técnico', 'Versão, nuvem, offline e ambiente desta instalação'] };
  /* Reutiliza o details existente para preservar o estado aberto durante redesenhos. */
  function mountPanel(host, sel, panel) {
    if (!COLLAPSED[sel]) { host.appendChild(panel); return; }
    let wrapper = panel.closest('details.pr-disc') || host.querySelector(':scope > details.pr-disc');
    if (!wrapper) {
      wrapper = document.createElement('details');
      wrapper.className = 'pr-disc';
      wrapper.innerHTML = '<summary><b>' + COLLAPSED[sel][0] + '</b><span>' + COLLAPSED[sel][1] + '</span></summary>';
    }
    if (panel.parentElement !== wrapper) wrapper.appendChild(panel);
    host.appendChild(wrapper);
  }
  function probe() {
    if (probing) return;
    probing = true;
    Promise.all([
      typeof offlineLibraryStatus === 'function' ? offlineLibraryStatus().catch(() => null) : null,
      typeof listRestorePoints === 'function' ? listRestorePoints().then((l) => (Array.isArray(l) ? l.length : null)).catch(() => null) : null
    ]).then(([o, r]) => { offlineInfo = o; restoreCount = r; probing = false; if (state.view === 'settings') P.schedule('settings'); });
  }
  function status() {
    const session = typeof StudyCloud !== 'undefined' ? StudyCloud.session() : null;
    const pending = (typeof StudyCloud !== 'undefined' ? StudyCloud.pendingCount?.() || 0 : 0) + (typeof preferencesPending === 'function' && preferencesPending() ? 1 : 0);
    const lastBackup = localStorage.getItem('studyapp.lastBackupAt') || '';
    const backupAge = lastBackup ? U.daysBetween(new Date(lastBackup), new Date()) : null;
    const cfg = window.StudyAutomation?.settings?.() || {};
    const autos = ['autoAgenda', 'autoReplan', 'simRecovery', 'archiveSuggestions', 'importInference'].filter((k) => cfg[k] !== false).length;
    const upd = typeof appUpdateState !== 'undefined' && appUpdateState.updateAvailable;
    const syncErr = typeof state !== 'undefined' && state.cloudSyncError;
    const issues = [];
    /* V15.52 · P1-11: sondagem só de leitura do projeto Supabase (sem token; a cada 10 min no máximo) */
    const cloud = window.StudyFlow?.cloudStatus?.() || { state: 'unknown' };
    if (cloud.state === 'paused' || cloud.state === 'unreachable') issues.push(['conta', 'o', cloud.state === 'paused' ? 'O projeto da nuvem (Supabase) está pausado ou fora do ar.' : 'A nuvem (Supabase) não respondeu.', 'Projetos gratuitos pausam após dias sem uso; reative no painel do Supabase. O progresso continua salvo neste aparelho e sobe quando a nuvem voltar.']);
    if (!session) issues.push(['conta', 'o', 'A conta não está conectada.', 'Entre para sincronizar progresso e biblioteca.']);
    else if (syncErr) issues.push(['conta', 'o', 'A última sincronização falhou.', 'Toque em Sincronizar agora; nada local é perdido.']);
    if (backupAge === null || backupAge > 14) issues.push(['dados', 'o', backupAge === null ? 'Nenhum backup baixado neste aparelho.' : 'O último backup tem ' + backupAge + ' dias.', 'Vale ter uma cópia do progresso e da agenda fora da nuvem.']);
    if (upd) issues.push(['app', 'l', 'Há uma atualização do aplicativo pronta.', 'Atualize na folha 06.']);
    if (session && pending && !syncErr) issues.push(['conta', 'l', pending + ' ' + U.plural(pending, 'alteração aguardando', 'alterações aguardando') + ' envio.', 'A sincronização envia assim que houver conexão.']);
    return { session, pending, lastBackup, backupAge, autos, cfg, upd, issues, syncErr, cloud };
  }
  /* V15.56 · folha 08: estrutura típica de prova por banca, ponto de partida ao criar um curso */
  let editBanca = '';
  function padraoForm(banca, p) {
    const blank = () => ({ nome: '', questoes: '', peso: 1, minimo: '', minimoEm: 'pontos', nova: true });
    const rows = (p?.prova?.length ? p.prova : []).concat([blank(), blank(), blank()]);
    return '<form data-pr-submit="save-padrao" data-n="' + rows.length + '" data-orig="' + esc(banca || '') + '" class="pr-padrao-form"><label class="pr-field"><span>Banca</span><input name="banca" required maxlength="30" value="' + esc(banca || '') + '" placeholder="Ex.: AOCP"></label>' +
      rows.map((d, i) => '<div class="pr-fgrid d"><label class="pr-field"><span>Disciplina' + (d.nova ? ' (nova)' : '') + '</span><input name="nome' + i + '" maxlength="60" value="' + esc(d.nome || '') + '"></label><label class="pr-field"><span>Questões</span><input name="questoes' + i + '" type="number" min="0" inputmode="numeric" value="' + esc(d.questoes ?? '') + '"></label><label class="pr-field"><span>Pts/questão</span><input name="peso' + i + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(d.peso ?? 1) + '"></label><label class="pr-field"><span>Mínimo</span><input name="minimo' + i + '" type="number" min="0" step="any" inputmode="decimal" value="' + esc(d.minimo ?? '') + '"></label><label class="pr-field"><span>Mínimo em</span><select name="minimoEm' + i + '"><option value="pontos"' + (d.minimoEm !== 'acertos' ? ' selected' : '') + '>pontos</option><option value="acertos"' + (d.minimoEm === 'acertos' ? ' selected' : '') + '>acertos</option></select></label><input type="hidden" name="cats' + i + '" value="' + esc(JSON.stringify(d.categorias || [])) + '"><input type="hidden" name="id' + i + '" value="' + esc(d.id || '') + '"></div>').join('') +
      '<div class="pr-fgrid"><label class="pr-field"><span>Mínimo geral (pontos)</span><input name="minimoGeral" type="number" min="0" step="any" inputmode="decimal" value="' + esc(p?.minimoGeral ?? '') + '"></label><label class="pr-field"><span>Títulos (pontos máx.)</span><input name="titulos" type="number" min="0" step="any" inputmode="decimal" value="' + esc(p?.titulos ?? '') + '" placeholder="Sem títulos"></label><label class="pr-field"><span>Fonte</span><input name="fonte" maxlength="120" value="' + esc(p?.fonte || '') + '"></label></div><div class="pr-row"><button type="submit" class="pr-btn sm">Salvar padrão</button>' + ui.btn('Cancelar', ui.act('edit-padrao', ''), 'g sm') + '</div></form>';
  }
  function editaisPanel() {
    const all = P.editais.padroes(), keys = Object.keys(all).sort();
    const list = keys.map((k) => {
      const p = all[k], max = P.editais.pontosMax(p.prova), used = P.courses.list().filter((c) => U.norm(c.board).includes(U.norm(k))).length;
      return '<div class="pr-li"><span class="pr-sig">' + esc(k) + '</span><span><b>' + p.prova.map((d) => esc(d.nome) + ' ' + d.questoes + (d.peso !== 1 ? ' (' + String(d.peso).replace('.', ',') + ' pt/q)' : '')).join(' · ') + '</b><br><span class="t">' + String(max).replace('.', ',') + ' pontos' + (p.minimoGeral != null ? ' · mínimo geral ' + String(p.minimoGeral).replace('.', ',') : '') + ' · mínimos ' + p.prova.map((d) => String(d.minimo).replace('.', ',') + (d.minimoEm === 'acertos' ? ' ac.' : '')).join(' · ') + (p.titulos ? ' · títulos ' + String(p.titulos).replace('.', ',') : '') + (used ? ' · ' + used + ' ' + U.plural(used, 'curso') + ' desta banca' : '') + (p.fonte ? ' · ' + esc(p.fonte) : '') + '</span></span><span class="pr-row" style="flex-wrap:nowrap">' + ui.btn('Editar', ui.act('edit-padrao', k), 'g sm') + (p.base ? '' : ui.btn('Remover', ui.act('remove-padrao', k), 'g sm')) + '</span></div>';
    }).join('');
    const editing = editBanca && all[editBanca];
    return '<p class="pr-detail">A estrutura de prova de cada banca é o ponto de partida ao criar um curso: no curso, “Usar estrutura” copia pesos e mínimos, que podem ser ajustados ao edital.</p><div class="pr-list">' + list + '</div>' +
      /* formulário aberto por estado (não por <details>): sobrevive aos redesenhos da prancha durante a sincronização */
      (editing ? '<span class="pr-k l">Editando ' + esc(editBanca) + '</span>' + padraoForm(editBanca, all[editBanca]) : editBanca === '__nova__' ? '<span class="pr-k l">Nova banca</span>' + padraoForm('', null) : ui.btn('+ Nova banca', ui.act('edit-padrao', '__nova__'), 'g sm')) +
      '<form data-pr-submit="save-meta-entre" class="pr-row" style="align-items:flex-end"><label class="pr-field"><span>Meta diária entre concursos (min)</span><input name="meta" type="number" min="5" max="480" step="5" inputmode="numeric" value="' + esc(P.prefs.get('metaEntre')) + '" style="width:120px"></label><button type="submit" class="pr-btn sm">Salvar</button><span class="pr-mono">Usada no Início quando nenhum concurso tem prova marcada.</span></form>' + v58Panel();
  }
  /* V15.58 · peso do edital no plano, planejamento do kit e exportação para o Notion */
  function v58Panel() {
    const on = P.prefs.get('planoPeso') !== false, cs = P.courses.active();
    return '<div class="pr-li" style="grid-template-columns:minmax(0,1fr) auto"><span><b>Peso do edital no plano</b><br><span class="t">' + (on ? 'Ligado: as prioridades e a revisão usam os pontos por tópico de cada disciplina e o risco de mínimo dos simulados.' : 'Desligado: as prioridades usam só a fatia de cada categoria no curso.') + '</span></span><button type="button" class="pr-btn sm' + (on ? '' : ' g') + '" role="switch" aria-checked="' + on + '" data-pr-act="plano-peso">' + (on ? 'Ligado' : 'Desligado') + '</button></div>' +
      (() => { const t = P.prefs.get('planoTec') !== false; return '<div class="pr-li" style="grid-template-columns:minmax(0,1fr) auto"><span><b>Desempenho do TEC no plano</b><br><span class="t">' + (t ? 'Ligado: os assuntos fracos da última planilha do TEC sobem a prioridade dos mapas ligados a eles.' : 'Desligado: o TEC aparece só no Progresso.') + '</span></span><button type="button" class="pr-btn sm' + (t ? '' : ' g') + '" role="switch" aria-checked="' + t + '" data-pr-act="plano-tec">' + (t ? 'Ligado' : 'Desligado') + '</button></div>'; })() +
      (cs.length ? '<span class="pr-k l">Planejamento do kit</span><p class="pr-detail">O kit do Template exporta um JSON (meus-mapas/app-edital/v1) com a prova, as fases e o programa do edital. Importe no curso para ver a Matriz pelo programa no Progresso.</p><div class="pr-row">' + cs.map((c) => ui.btn('Importar em ' + esc(c.sigla), ui.act('import-kit', c.id), 'g sm')).join('') + '</div>' : '') +
      '<span class="pr-k l">Levar para o Notion</span><p class="pr-detail">Dois CSV para importar como bancos de dados do Notion (Importar → CSV): cursos e mapas com progresso, domínio e pontos do edital. Só leitura; nada é enviado.</p><div class="pr-row">' + ui.btn('Cursos.csv', ui.act('csv', 'cursos'), 'g sm') + ui.btn('Mapas.csv', ui.act('csv', 'mapas'), 'g sm') + '</div>';
  }
  function csvOf(kind) {
    const q = (v) => { const t = v === null || v === undefined ? '' : String(v); return /[",;\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const rows = [];
    if (kind === 'cursos') {
      rows.push(['Curso', 'Sigla', 'Banca', 'Prova', 'Tópicos', 'Marcados', 'Cobertura %', 'Nota projetada', 'Pontos máximos']);
      for (const c of P.courses.active()) { const p = P.data.agg(c.maps), np = P.editais.notaProjetada?.(c.id); rows.push([P.courses.label(c.course), c.sigla, c.course?.board || '', c.exam?.date ? U.dateKey(c.exam.date) : '', p.total, p.marked, p.total ? Math.round((p.marked / p.total) * 100) : 0, np ? np.pontos : '', np ? np.max : '']); }
    } else {
      rows.push(['Mapa', 'Código', 'Curso', 'Categoria', 'Tópicos', 'Marcados', 'DIF', 'REV', 'Cobertura %', 'Domínio %', 'Questões respondidas', 'Pontos do edital']);
      for (const c of P.courses.active()) for (const m of P.data.mapsForCourse(c.id, { includeLinked: false })) { const p = P.data.prog(m), ms = P.mastery.of(m); rows.push([m.title, m.code || '', c.sigla, m.category || '', p.total, p.marked, p.difficult, p.review, ms.cobertura, ms.dominio ?? '', ms.respondidas, P.editais.pontosDoMapa(m, c.id) ?? '']); }
    }
    return '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n');
  }
  function acervoPanel() {
    const r = P.audit.run(), F = window.StudyFlow || {};
    const head = '<p class="pr-detail">' + r.verificados + ' de ' + r.total + ' mapas verificados' + (r.bytes && F.fmtBytes ? ' · ' + F.fmtBytes(r.bytes) + ' de HTML' : '') + '. A verificação só lê; nada é alterado.</p>';
    if (!r.items.length) return head + ui.empty('Nada a verificar ainda', 'Os mapas e cursos aparecem aqui depois da primeira sincronização.');
    const order = { aviso: 0, info: 1, ok: 2 };
    return head + '<div class="pr-list">' + r.items.slice().sort((a, b) => order[a.sev] - order[b.sev]).map((x) => '<div class="pr-li"><span class="pr-chip ' + (x.sev === 'aviso' ? 'ox' : x.sev === 'ok' ? 'ok' : 'l') + '">' + esc(x.tipo) + '</span><span><b>' + esc(x.titulo) + '</b><br><span class="t">' + esc(x.detalhe || '') + '</span></span>' + (x.course ? ui.btn('Abrir curso', ui.act('open-course', x.course), 'g sm') : x.keys?.length ? ui.btn('Ver mapas', ui.act('nav', 'maps'), 'g sm') : '<span></span>') + '</div>').join('') + '</div>';
  }
  function folhaState(id, st) {
    if (id === 'acervo') return P.audit.run().avisos ? 'l' : ''; const i = st.issues.filter((x) => x[0] === id); return i.some((x) => x[1] === 'o') ? 'o' : i.length ? 'l' : ''; }

  function render(root) {
    if (offlineInfo === null || restoreCount === null) probe();
    const st = status(), goals = P.time.goals();
    const F = window.StudyFlow || { fmtBytes: (n) => String(n) }, usage = F.storageUsage?.() || null;
    const label = typeof APP_VERSION_LABEL !== 'undefined' ? APP_VERSION_LABEL : '';
    const m = /^(V[\d.]+)(-.+)?$/.exec(label) || [label, label, ''];
    const okN = FOLHAS.filter(([, id]) => !folhaState(id, st)).length;
    const first = st.issues.find((x) => x[1] === 'o') || st.issues[0];
    const v = first ? ui.verdict(first[1] === 'o' ? '' : 'l', (st.issues.length > 1 ? st.issues.length + ' coisas pedem atenção. ' : '') + first[2], first[3] + (st.issues.length > 1 ? ' ' + st.issues.slice(1).map((x) => x[2]).join(' ') : '')) : ui.verdict('m', 'Tudo em ordem.', 'Nuvem sincronizada, backup recente e aplicativo atualizado.');
    const mode = (st.cfg.mode || 'balanced');
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">Meus Mapas · ficha técnica · ' + esc(U.fmtDayYear(new Date())) + '</span><div class="pr-big"><span class="pr-pct pr-num" style="font-size:clamp(40px,6.5vw,72px)">' + esc(m[1]) + '</span><span class="pr-sub">' + esc((m[2] || '').replace(/^-/, '') + ' · ' + (st.upd ? 'atualização disponível' : 'versão instalada') + ' · ' + (matchMedia('(display-mode: standalone)').matches ? 'app instalado' : 'navegador')) + '</span></div>' +
      ui.states([['ok', okN, 'var(--pr-musgo)'], ['at', FOLHAS.length - okN, 'var(--pr-oxido)']], FOLHAS.length + ' folhas: ' + okN + ' ok') + ui.legend([['Folhas ok', okN, 'var(--pr-musgo)'], ['Pedem atenção', FOLHAS.length - okN, 'var(--pr-oxido)']]) + v +
      '<div class="pr-row">' + (first?.[0] === 'dados' || !st.lastBackup ? ui.btn('Baixar backup', ui.act('backup'), 'p') : '') + (st.session ? ui.btn('Sincronizar agora', ui.act('sync-now'), first?.[0] === 'dados' || !st.lastBackup ? 'g' : 'p') : ui.btn('Entrar na conta', ui.act('goto', 'conta'), 'p')) + ui.btn(st.upd ? 'Atualizar para ' + esc(String(appUpdateState.latest?.label || 'nova versão').replace(/-[A-Z+]+$/, '')) : 'Atualizar app', ui.act('app-update'), st.upd ? 'p' : 'g') + '</div></div><div class="pr-c-b">' +
      ui.cell('Nuvem', st.session ? (st.syncErr ? 'com erro' : 'conectada') : 'desconectada', st.session && !st.syncErr ? 'ok' : 'ox', st.session ? (st.pending ? st.pending + ' ' + U.plural(st.pending, 'alteração pendente', 'alterações pendentes') : 'nada pendente') : 'entre na conta') +
      ui.cell('Offline', offlineInfo ? offlineInfo.cached + '/' + offlineInfo.total : '…', offlineInfo && offlineInfo.total && offlineInfo.cached >= offlineInfo.total ? 'ok' : '', offlineInfo ? (offlineInfo.total ? 'arquivos neste aparelho' : 'nada a baixar') : 'verificando') +
      ui.cell('Automação', st.autos + ' ' + U.plural(st.autos, 'ativa'), '', 'modo ' + esc({ light: 'leve', balanced: 'equilibrado', intense: 'intenso' }[mode] || mode)) +
      ui.cell('Metas', fmtMin(goals.daily) + ' · ' + fmtMin(goals.weekly), '', 'por dia · por semana') +
      ui.cell('Backup', st.lastBackup ? (st.backupAge === 0 ? 'hoje' : 'há ' + st.backupAge + ' d') : 'nunca', st.backupAge === null || st.backupAge > 14 ? 'ox' : 'ok', (restoreCount ?? '…') + ' ' + U.plural(restoreCount || 0, 'ponto', 'pontos') + ' de restauração') +
      ui.cell('Ícone', esc(document.getElementById('appIconCurrent')?.textContent || 'Automático'), '', 'tema escuro nanquim') +
      ui.cell('Supabase', { ok: 'no ar', paused: 'pausado', unreachable: 'sem resposta', error: 'com erro', offline: 'sem conexão', unconfigured: 'não configurado' }[st.cloud.state] || 'verificando', st.cloud.state === 'ok' ? 'ok' : ['paused', 'unreachable', 'error'].includes(st.cloud.state) ? 'ox' : '', st.cloud.at ? 'verificado às ' + new Date(st.cloud.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'serviço de login e dados') +
      ui.cell('Neste aparelho', usage ? F.fmtBytes(usage.used ?? usage.local) : '…', usage && usage.quota && usage.used / usage.quota > .8 ? 'ox' : '', usage ? 'dados locais ' + F.fmtBytes(usage.local) + (usage.quota ? ' · cota ' + F.fmtBytes(usage.quota) : '') + (usage.persisted ? ' · protegido' : '') : 'medindo o armazenamento') + '</div></section>';
    const toc = '<nav class="pr-toc" aria-label="Folhas">' + FOLHAS.map(([n, id, t, , curto]) => '<a href="#" data-pr-act="goto" data-arg="' + id + '" title="' + esc(n + ' · ' + t) + '" aria-label="' + esc(n + ' ' + t) + '"><i class="' + folhaState(id, st) + '"></i><b>' + n + '</b>' + esc(curto || t) + '</a>').join('') + '<a href="#" data-pr-act="goto" data-arg="risco" title="Zona de risco" aria-label="Zona de risco"><i class="o"></i>Risco</a></nav>';
    const folhas = FOLHAS.map(([n, id, t]) => { const s = folhaState(id, st); return '<section class="pr-folha" id="pr-f-' + id + '"><span class="n">' + n + '</span><div class="bd"><h4>' + esc(t) + '<span class="pr-chip ' + (s === 'o' ? 'ox' : s === 'l' ? 'l' : 'ok') + '">' + (s === 'o' ? 'pede atenção' : s === 'l' ? 'aviso' : 'ok') + '</span></h4><div class="pr-host" data-pr-host="' + id + '"></div></div></section>'; }).join('');
    const zr = '<section class="pr-zr" id="pr-f-risco"><span class="pr-k o">Zona de risco</span><p style="font-size:var(--fs-body-sm)">Apaga registros de tempo ou recarrega o aplicativo. O progresso dos mapas, a agenda, as anotações e os simulados não são afetados. Cada ação pede um segundo toque e, para o tempo, uma confirmação.</p><div class="pr-row">' + ui.btn('Zerar hoje', ui.act('reset-time', 'today'), 'd') + ui.btn('Zerar semana', ui.act('reset-time', 'week'), 'd') + ui.btn('Zerar todo o histórico de tempo', ui.act('reset-time', 'all'), 'd') + ui.btn('Forçar atualização do aplicativo', ui.act('force-update'), 'd') + '</div></section>';
    /* V15.52 · P2-2: a opção "Usar a interface clássica" saiu da tela (pouco usada). A ação "classic" e o caminho de volta
       continuam no código por duas semanas; a remoção definitiva fica para uma versão seguinte. */
    /* tira os painéis das folhas antes de reescrever, para não destruí-los */
    const parking = document.createDocumentFragment();
    root.querySelectorAll('[data-pr-host] > *').forEach((n) => parking.appendChild(n));
    root.innerHTML = ui.top({ eyebrow: 'Sistema', title: 'Configurações', desc: 'Ficha técnica do aplicativo: carimbo do sistema, índice e folhas numeradas.' }) + carimbo + toc + folhas + zr;
    const view = root.closest('.view');
    view?.querySelector('.settings-layout-v3')?.classList.replace('settings-layout-v3', 'settings-layout-prancha');
    for (const [, id, , sels] of FOLHAS) {
      const host = root.querySelector('[data-pr-host="' + id + '"]');
      for (const sel of sels) {
        const panel = parking.querySelector?.(sel) || document.querySelector(sel);
        if (!panel) continue;
        mountPanel(host, sel, panel);
      }
      if (id === 'editais') { host.innerHTML = editaisPanel(); continue; }
      if (id === 'acervo') { host.innerHTML = acervoPanel(); continue; }
      if (!host.children.length) host.innerHTML = '<div class="pr-mono" data-pr-wait>' + ui.skeleton(2) + '</div>';
    }
  }
  /* os painéis de rotina, planejamento e automação são criados depois; reorganiza quando aparecerem */
  let watch = 0;
  function rehome() {
    const root = document.querySelector('[data-prancha="settings"]');
    if (!root || state.view !== 'settings') return;
    for (const [, id, , sels] of FOLHAS) {
      const host = root.querySelector('[data-pr-host="' + id + '"]');
      if (!host || !sels.length) continue;
      for (const sel of sels) {
        const panel = document.querySelector(sel);
        if (panel && panel.closest('[data-pr-host]') !== host && !panel.contains(host)) {
          host.querySelector(':scope>.pr-mono')?.remove();
          mountPanel(host, sel, panel);
        }
      }
    }
  }
  window.addEventListener('studyapp:navigation', (e) => { if (e.detail?.view === 'settings') { clearInterval(watch); let n = 0; watch = setInterval(() => { rehome(); if (++n > 12) clearInterval(watch); }, 250); } });

  P.pages.settings = {
    render,
    renderWhileTyping: false,
    actions: {
      goto: (id) => { const el = document.getElementById('pr-f-' + id); el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); },
      backup: () => { if (typeof downloadStudyBackup === 'function') downloadStudyBackup(); setTimeout(() => P.schedule('settings'), 300); },
      'reset-time': (scope, el) => P.armed(el, () => { const b = document.querySelector('[data-study-time-reset="' + scope + '"]'); if (b) b.click(); else if (typeof toast === 'function') toast('Abra a folha 02 e tente de novo.'); }, 'Toque de novo'),
      classic: (a, el) => P.armed(el, () => P.setClassic(true), 'Toque de novo para trocar'),
      'save-meta-entre': (fd) => { const v = Math.round(Number(fd.get('meta'))); if (!(v >= 5 && v <= 480)) { if (typeof toast === 'function') toast('Informe entre 5 e 480 minutos.'); return; } P.prefs.set('metaEntre', v); if (typeof toast === 'function') toast('Meta entre concursos: ' + v + ' min por dia.'); P.renderNow('settings'); },
      'plano-peso': () => { P.prefs.set('planoPeso', P.prefs.get('planoPeso') === false); P.renderNow('settings'); },
      'plano-tec': () => { P.prefs.set('planoTec', P.prefs.get('planoTec') === false); P.renderNow('settings'); },
      csv: (kind) => { const blob = new Blob([csvOf(kind)], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (kind === 'cursos' ? 'Cursos' : 'Mapas') + '_MeusMapas.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); },
      'edit-padrao': (k) => { editBanca = k || ''; P.renderNow('settings'); document.getElementById('pr-f-editais')?.scrollIntoView({ block: 'start' }); },
      'remove-padrao': (k, el) => P.armed(el, () => { P.store.patch('padroes', k, null); editBanca = ''; P.renderNow('settings'); }, 'Toque de novo para remover'),
      'save-padrao': (fd, form) => {
        const banca = String(fd.get('banca') || '').trim().toUpperCase(), n = Number(form.dataset.n) || 0, prova = [];
        for (let i = 0; i < n; i++) { const nome = String(fd.get('nome' + i) || '').trim(); if (!nome) continue; prova.push({ id: String(fd.get('id' + i) || ''), nome, questoes: fd.get('questoes' + i), peso: fd.get('peso' + i), minimo: fd.get('minimo' + i), minimoEm: String(fd.get('minimoEm' + i) || 'pontos'), categorias: U.safeJson(String(fd.get('cats' + i) || '[]'), []) }); }
        const list = P.editais.normProva(prova);
        if (!banca || !list.length) { if (typeof toast === 'function') toast('Informe a banca e ao menos uma disciplina com questões.'); return; }
        const mg = String(fd.get('minimoGeral') || '').trim();
        if (form.dataset.orig && form.dataset.orig !== banca) P.store.patch('padroes', form.dataset.orig, null);
        const tt = String(fd.get('titulos') || '').trim();
        P.editais.setPadrao(banca, { prova: list, minimoGeral: mg === '' ? null : Number(mg.replace(',', '.')), titulos: tt === '' ? null : Number(tt.replace(',', '.')), fonte: String(fd.get('fonte') || '').trim() });
        editBanca = '';
        if (typeof toast === 'function') toast('Padrão ' + banca + ' salvo.');
        P.renderNow('settings');
      },
      'app-update': () => window.MeusMapasUpdate?.run?.(),
      'force-update': (a, el) => P.armed(el, () => document.getElementById('forceAppRefreshBtn')?.click(), 'Toque de novo para recarregar')
    }
  };
  window.addEventListener('studycloud:queuechange', () => { if (state.view === 'settings') P.schedule('settings'); });
})();
