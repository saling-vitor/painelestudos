'use strict';
/* MEUS MAPAS · Prancha · Configurações como ficha técnica.
   As folhas recebem os painéis reais do app (mesmos IDs e eventos); só a organização muda. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.settings) return;
  const U = P.util, ui = P.ui, { esc, fmtMin } = U;
  let offlineInfo = null, restoreCount = null, probing = false;

  const FOLHAS = [
    ['01', 'conta', 'Conta e nuvem', ['.sync-panel']],
    ['02', 'rotina', 'Rotina de estudo', ['#studySettingsPanel']],
    ['03', 'plan', 'Planejamento adaptativo', ['#plannerAdvancedSettings']],
    ['04', 'auto', 'Automação', ['#studyAutomationPanel']],
    ['05', 'dados', 'Backup e restauração', ['.backup-panel']],
    ['06', 'app', 'Aparelho e aplicativo', ['#appUpdatePanel', '#appAppearancePanel', '#appDiagnosticPanel']],
    ['07', 'adm', 'Administração', ['.admin-panel']]
  ];
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
    if (!session) issues.push(['conta', 'o', 'A conta não está conectada.', 'Entre para sincronizar progresso e biblioteca.']);
    else if (syncErr) issues.push(['conta', 'o', 'A última sincronização falhou.', 'Toque em Sincronizar agora; nada local é perdido.']);
    if (backupAge === null || backupAge > 14) issues.push(['dados', 'o', backupAge === null ? 'Nenhum backup baixado neste aparelho.' : 'O último backup tem ' + backupAge + ' dias.', 'Vale ter uma cópia do progresso e da agenda fora da nuvem.']);
    if (upd) issues.push(['app', 'l', 'Há uma atualização do aplicativo pronta.', 'Atualize na folha 06.']);
    if (session && pending && !syncErr) issues.push(['conta', 'l', pending + ' ' + U.plural(pending, 'alteração aguardando', 'alterações aguardando') + ' envio.', 'A sincronização envia assim que houver conexão.']);
    return { session, pending, lastBackup, backupAge, autos, cfg, upd, issues, syncErr };
  }
  function folhaState(id, st) { const i = st.issues.filter((x) => x[0] === id); return i.some((x) => x[1] === 'o') ? 'o' : i.length ? 'l' : ''; }

  function render(root) {
    if (offlineInfo === null || restoreCount === null) probe();
    const st = status(), goals = P.time.goals();
    const label = typeof APP_VERSION_LABEL !== 'undefined' ? APP_VERSION_LABEL : '';
    const m = /^(V[\d.]+)(-.+)?$/.exec(label) || [label, label, ''];
    const okN = FOLHAS.filter(([, id]) => !folhaState(id, st)).length;
    const first = st.issues.find((x) => x[1] === 'o') || st.issues[0];
    const v = first ? ui.verdict(first[1] === 'o' ? '' : 'l', (st.issues.length > 1 ? st.issues.length + ' coisas pedem atenção. ' : '') + first[2], first[3] + (st.issues.length > 1 ? ' ' + st.issues.slice(1).map((x) => x[2]).join(' ') : '')) : ui.verdict('m', 'Tudo em ordem.', 'Nuvem sincronizada, backup recente e aplicativo atualizado.');
    const mode = (st.cfg.mode || 'balanced');
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">Meus Mapas · ficha técnica · ' + esc(U.fmtDayYear(new Date())) + '</span><div class="pr-big"><span class="pr-pct pr-num" style="font-size:clamp(40px,6.5vw,72px)">' + esc(m[1]) + '</span><span class="pr-sub">' + esc((m[2] || '').replace(/^-/, '') + ' · ' + (st.upd ? 'atualização disponível' : 'versão instalada') + ' · ' + (matchMedia('(display-mode: standalone)').matches ? 'app instalado' : 'navegador')) + '</span></div>' +
      ui.states([['ok', okN, 'var(--pr-musgo)'], ['at', FOLHAS.length - okN, 'var(--pr-oxido)']], FOLHAS.length + ' folhas: ' + okN + ' ok') + ui.legend([['Folhas ok', okN, 'var(--pr-musgo)'], ['Pedem atenção', FOLHAS.length - okN, 'var(--pr-oxido)']]) + v +
      '<div class="pr-row">' + (first?.[0] === 'dados' || !st.lastBackup ? ui.btn('Baixar backup', ui.act('backup'), 'p') : '') + (st.session ? ui.btn('Sincronizar agora', ui.act('sync-now'), first?.[0] === 'dados' || !st.lastBackup ? 'g' : 'p') : ui.btn('Entrar na conta', ui.act('goto', 'conta'), 'p')) + '</div></div><div class="pr-c-b">' +
      ui.cell('Nuvem', st.session ? (st.syncErr ? 'com erro' : 'conectada') : 'desconectada', st.session && !st.syncErr ? 'ok' : 'ox', st.session ? (st.pending ? st.pending + ' ' + U.plural(st.pending, 'alteração pendente', 'alterações pendentes') : 'nada pendente') : 'entre na conta') +
      ui.cell('Offline', offlineInfo ? offlineInfo.cached + '/' + offlineInfo.total : '…', offlineInfo && offlineInfo.total && offlineInfo.cached >= offlineInfo.total ? 'ok' : '', offlineInfo ? (offlineInfo.total ? 'arquivos neste aparelho' : 'nada a baixar') : 'verificando') +
      ui.cell('Automação', st.autos + ' ' + U.plural(st.autos, 'ativa'), '', 'modo ' + esc({ light: 'leve', balanced: 'equilibrado', intense: 'intenso' }[mode] || mode)) +
      ui.cell('Metas', fmtMin(goals.daily) + ' · ' + fmtMin(goals.weekly), '', 'por dia · por semana') +
      ui.cell('Backup', st.lastBackup ? (st.backupAge === 0 ? 'hoje' : 'há ' + st.backupAge + ' d') : 'nunca', st.backupAge === null || st.backupAge > 14 ? 'ox' : 'ok', (restoreCount ?? '…') + ' ' + U.plural(restoreCount || 0, 'ponto', 'pontos') + ' de restauração') +
      ui.cell('Ícone', esc(document.getElementById('appIconCurrent')?.textContent || 'Automático'), '', 'tema escuro nanquim') + '</div></section>';
    const toc = '<nav class="pr-toc" aria-label="Folhas">' + FOLHAS.map(([n, id, t]) => '<a href="#" data-pr-act="goto" data-arg="' + id + '"><i class="' + folhaState(id, st) + '"></i>' + n + ' ' + esc(t) + '</a>').join('') + '<a href="#" data-pr-act="goto" data-arg="risco"><i class="o"></i>Zona de risco</a></nav>';
    const folhas = FOLHAS.map(([n, id, t]) => { const s = folhaState(id, st); return '<section class="pr-folha" id="pr-f-' + id + '"><span class="n">' + n + '</span><div class="bd"><h4>' + esc(t) + '<span class="pr-chip ' + (s === 'o' ? 'ox' : s === 'l' ? 'l' : 'ok') + '">' + (s === 'o' ? 'pede atenção' : s === 'l' ? 'aviso' : 'ok') + '</span></h4><div class="pr-host" data-pr-host="' + id + '"></div></div></section>'; }).join('');
    const zr = '<section class="pr-zr" id="pr-f-risco"><span class="pr-k o">Zona de risco</span><p style="font-size:13.5px">Apaga registros de tempo ou recarrega o aplicativo. O progresso dos mapas, a agenda, as anotações e os simulados não são afetados. Cada ação pede um segundo toque e, para o tempo, uma confirmação.</p><div class="pr-row">' + ui.btn('Zerar hoje', ui.act('reset-time', 'today'), 'd') + ui.btn('Zerar semana', ui.act('reset-time', 'week'), 'd') + ui.btn('Zerar todo o histórico de tempo', ui.act('reset-time', 'all'), 'd') + ui.btn('Forçar atualização do aplicativo', ui.act('force-update'), 'd') + ui.btn('Usar a interface clássica', ui.act('classic'), 'g') + '</div></section>';
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
        if (panel) host.appendChild(panel);
      }
      if (!host.children.length) host.innerHTML = '<p class="pr-mono">Carregando os controles desta folha…</p>';
    }
  }
  /* os painéis de rotina, planejamento e automação são criados depois; reorganiza quando aparecerem */
  let watch = 0;
  function rehome() {
    const root = document.querySelector('[data-prancha="settings"]');
    if (!root || state.view !== 'settings') return;
    for (const [, id, , sels] of FOLHAS) {
      const host = root.querySelector('[data-pr-host="' + id + '"]');
      if (!host) continue;
      for (const sel of sels) { const panel = document.querySelector(sel); if (panel && panel.parentElement !== host && !panel.contains(host)) { host.querySelector(':scope>.pr-mono')?.remove(); host.appendChild(panel); } }
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
      'force-update': (a, el) => P.armed(el, () => document.getElementById('forceAppRefreshBtn')?.click(), 'Toque de novo para recarregar')
    }
  };
  window.addEventListener('studycloud:queuechange', () => { if (state.view === 'settings') P.schedule('settings'); });
})();
