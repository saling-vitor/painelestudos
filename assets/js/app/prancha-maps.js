'use strict';
/* MEUS MAPAS · Prancha · Todos os Mapas como índice de pranchas: carimbo do acervo e três leituras. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.maps) return;
  const U = P.util, ui = P.ui, { esc, fmtNum, plural, pct } = U;
  const KEY = 'studyapp.prancha.mapsView';
  const st = (() => { try { return { view: 'grade', sort: 'az', group: 'cat', ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { view: 'grade', sort: 'az', group: 'cat' }; } })();
  st.fe = 'todos'; st.fc = 'todos'; st.fco = 'todos'; st.fa = 'todos'; st.q = ''; st.closed = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ view: st.view, sort: st.sort, group: st.group })); } catch {} };
  let offline = null, offlineBusy = false;

  const isFav = (k) => typeof favs !== 'undefined' && favs.has(k);
  const FE = [
    ['todos', 'Todos', () => true], ['feito', 'Concluídos', (m, p) => p.total > 0 && p.marked >= p.total], ['and', 'Em andamento', (m, p) => p.marked > 0 && p.marked < p.total],
    ['nao', 'Nunca abertos', (m, p) => !p.marked && !p.lastActivity], ['rev', 'Com revisão', (m, p) => p.review > 0], ['dif', 'Difíceis', (m, p) => p.difficult > 0],
    ['fav', 'Favoritos', (m) => isFav(P.data.keyOf(m))], ['off', 'Offline', (m) => !!offline?.has(P.data.keyOf(m))]
  ];
  const SORTS = [['az', 'A–Z'], ['prog', 'Progresso'], ['tam', 'Tamanho'], ['par', 'Parado'], ['rec', 'Recentes'], ['valor', 'Valor na prova'], ['rende', 'Rende agora']];
  /* V15.58 · valor do mapa na prova (pontos da disciplina × fatia de tópicos) e o que ainda rende (× parte não marcada) */
  const valorOf = (m) => { const v = P.editais.pontosDoMapa(m); return v === null || v === undefined ? -1 : v; };
  const rendeOf = (m, p) => { const v = valorOf(m); return v < 0 ? -1 : Math.round(v * (1 - (p.total ? p.marked / p.total : 0)) * 10) / 10; };
  const ptsSort = () => st.sort === 'valor' || st.sort === 'rende';
  const ptsOf = (m, p) => { const v = st.sort === 'rende' ? rendeOf(m, p) : valorOf(m); return v < 0 ? '—' : P.editais.fmtPt(v); };
  function refreshOffline() {
    if (offlineBusy || typeof mapAvailableOffline !== 'function') return;
    offlineBusy = true;
    const all = P.data.allMaps();
    Promise.all(all.map((m) => Promise.resolve(mapAvailableOffline(m)).then((ok) => (ok ? P.data.keyOf(m) : null)).catch(() => null))).then((keys) => { offline = new Set(keys.filter(Boolean)); offlineBusy = false; if (state.view === 'maps') P.schedule('maps'); });
  }
  function sorted(list) {
    const a = list.map((m) => ({ m, p: P.data.prog(m) }));
    const ts = (p) => (typeof activityTimestamp === 'function' ? activityTimestamp(p.lastActivity) : Date.parse(p.lastActivity || 0) || 0);
    if (st.sort === 'az') a.sort((x, y) => String(x.m.title).localeCompare(String(y.m.title), 'pt-BR'));
    if (st.sort === 'prog') a.sort((x, y) => pct(y.p.marked, y.p.total) - pct(x.p.marked, x.p.total));
    if (st.sort === 'tam') a.sort((x, y) => y.p.total - x.p.total);
    if (st.sort === 'par') a.sort((x, y) => (ts(x.p) || 0) - (ts(y.p) || 0));
    if (st.sort === 'rec') a.sort((x, y) => ts(y.p) - ts(x.p));
    if (st.sort === 'valor') a.sort((x, y) => valorOf(y.m) - valorOf(x.m));
    if (st.sort === 'rende') a.sort((x, y) => rendeOf(y.m, y.p) - rendeOf(x.m, x.p));
    return a.map((x) => x.m);
  }
  function card(m, fol) {
    const p = P.data.prog(m), k = P.data.keyOf(m), c = P.courses.byId(m.courseId), fav = isFav(k);
    return '<div class="pr-gm" style="--c:' + P.mapColor(m) + '" data-pr-act="open-map" data-arg="' + esc(k) + '" role="link" tabindex="0" aria-label="' + esc('Abrir ' + (m.code || '') + ' · ' + m.title) + '">' + ui.mapCov(m) +
      '<button type="button" class="pr-fav" data-pr-act="fav" data-arg="' + esc(k) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '">' + (typeof uiIcon === 'function' ? uiIcon('star', 'ui-icon-sm') : '★') + '</button>' +
      '<div class="stamp"><div><span>Folha</span><b>' + esc(fol.get(k) || '—') + '</b></div><div><span>Tópicos</span><b>' + p.marked + '/' + p.total + '</b></div>' + (ptsSort() ? '<div><span>Pts</span><b>' + ptsOf(m, p) + '</b></div>' : '<div><span>Feito</span><b>' + pct(p.marked, p.total) + '%</b></div>') + '</div>' +
      '<div class="ti"><b>' + esc(m.title) + '</b>' + ui.stbar(p) + '<div class="pr-row sp"><span class="pr-mono">' + esc(ui.mapState(p) + ' · ' + ui.lastLabel(p.lastActivity) + (c ? ' · ' + P.courses.sigla(c) : '')) + '</span>' + alcChip(m) + rowMenu(m) + '</div></div></div>';
  }
  /* V15.56 · alcance: portátil (serve em qualquer edital), misto, estadual ou local */
  const ALC_LABEL = Object.fromEntries(P.editais.ALCANCES);
  function alcChip(m) { const a = P.editais.alcance(m); return a === 'local' ? '' : '<span class="pr-chip ' + (a === 'portatil' ? 'ok' : 'l') + '">' + esc(ALC_LABEL[a].toLowerCase()) + '</span>'; }
  function rowMenu(m) {
    const k = P.data.keyOf(m);
    return ui.menu('am-' + k, [['Abrir', ui.act('open-map', k)], [isFav(k) ? 'Remover dos favoritos' : 'Adicionar aos favoritos', ui.act('fav-menu', k)], typeof mapCanUpdateHtml === 'function' && mapCanUpdateHtml(m) ? ['Atualizar HTML', ui.act('update-map', k)] : null, ['Ficha técnica', ui.act('ficha', k)], ['Gerenciar mapa', ui.act('manage-map', k)], ['Abrir o curso', ui.act('open-course', m.courseId)]]);
  }
  function table(list, fol) {
    return '<div class="pr-tbl"><table><thead><tr><th>Folha</th><th>Mapa</th><th class="hide-m"></th><th class="hide-m">Categoria</th><th class="hide-m">Concurso</th><th>Tópicos</th>' + (ptsSort() ? '<th class="hide-m">Pts</th>' : '') + '<th>Estado</th><th class="hide-m">Última</th><th></th></tr></thead><tbody>' + list.map((m) => {
      const p = P.data.prog(m), k = P.data.keyOf(m), c = P.courses.byId(m.courseId);
      return '<tr style="--c:' + P.mapColor(m) + '" data-pr-act="open-map" data-arg="' + esc(k) + '"><td class="fn">' + esc(fol.get(k) || '') + '</td><td><span class="pr-sig">' + esc(m.code || '') + '</span></td><td class="hide-m"><b>' + esc(m.title) + '</b></td><td class="hide-m"><span class="pr-chip c">' + esc(m.category || 'Outros') + '</span></td><td class="pr-mono hide-m">' + esc(c ? P.courses.sigla(c) : '') + '</td><td class="pr-num">' + p.marked + '/' + p.total + '</td>' + (ptsSort() ? '<td class="pr-num hide-m">' + ptsOf(m, p) + '</td>' : '') + '<td style="min-width:110px">' + ui.stbar(p) + '<span class="pr-mono">' + ui.mapState(p) + '</span></td><td class="pr-mono hide-m">' + ui.lastLabel(p.lastActivity) + '</td><td><span class="pr-row" style="flex-wrap:nowrap">' + ui.btn('Abrir', ui.act('open-map', k), p.total > 0 && p.marked >= p.total ? 'g sm' : 'sm') + rowMenu(m) + '</span></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  /* ---------- V15.58 · ficha técnica do mapa (lida do próprio HTML, sob demanda) ----------
     template, versão, estrutura, marcadores por tipo, questões embutidas e procedência declarada
     (metas study-normative-cutoff, study-normative-sources, study-map-scope e study-edital-items do Template G27;
     sem elas, a frase "compilado até…" do texto). */
  const FICHA = new Map();
  let fichaKey = '', fichaBusy = '';
  const MK = [['star', '⭐ Cai muito'], ['warn', '⚠️ Pegadinha'], ['decore', '💎 Decore'], ['imp', '🔷 Importante'], ['num', '🔢 Número-chave'], ['arch', '📐 Arquiteto'], ['target', '🎯 Como cai'], ['update', '🟡 Atualização']];
  function fichaFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html'), meta = (n) => doc.querySelector('meta[name="' + n + '"]')?.content?.trim() || '';
    const topics = [...doc.querySelectorAll('.topic-card[data-topic-id]')], mk = {};
    let semMarc = 0;
    topics.forEach((t) => { const l = String(t.getAttribute('data-markers') || '').split(/[\s,]+/).filter(Boolean); if (!l.length) semMarc++; l.forEach((x) => { mk[x] = (mk[x] || 0) + 1; }); });
    const text = doc.body?.textContent || '';
    const fonteTxt = (text.match(/[^.{}"<>\n]{0,40}\bcompilad[oa]\b[^.{}"<>\n]{0,80}/gi) || []).filter((t) => /\d{4}/.test(t)).sort((a, b) => b.length - a.length)[0] || '';
    const ok = (v) => (/\[\[/.test(v) ? '' : v);
    return { bytes: new Blob([html]).size, release: ok(meta('study-template-release')), g26: /G26/.test(html), v211: /v211-standard/.test(html), versao: ok(meta('study-file-version')), ramos: doc.querySelectorAll('main > .ramo').length, topicos: topics.length, semMarcadores: semMarc, marcadores: mk, questoes: (html.match(/"difficulty"\s*:\s*"N\d"/g) || []).length, corte: ok(meta('study-normative-cutoff')), fontes: ok(meta('study-normative-sources')) || fonteTxt.trim(), alcance: ok(meta('study-map-scope')), itens: ok(meta('study-edital-items')).split(/\s+/).filter(Boolean) };
  }
  function loadFicha(m) {
    const k = P.data.keyOf(m);
    if (FICHA.has(k)) return Promise.resolve(FICHA.get(k));
    if (typeof mapHtml !== 'function') return Promise.resolve(null);
    return mapHtml(m).then((h) => { const f = h ? fichaFromHtml(h) : { erro: 'vazio' }; FICHA.set(k, f);
      /* alcance declarado pelo HTML vale enquanto você não escolher outro */
      if (f.alcance && P.editais.ALCANCES.some(([id]) => id === f.alcance) && !P.store.read().mapMeta?.[k]) P.editais.setAlcance(k, f.alcance);
      return f; }).catch(() => { const f = { erro: 'leitura' }; FICHA.set(k, f); return f; });
  }
  P.fichaMapa = { get: (k) => FICHA.get(k) || null, load: loadFicha, parse: fichaFromHtml };
  function fichaCard() {
    if (!fichaKey) return '';
    const m = typeof mapById === 'function' ? mapById(fichaKey) : null;
    if (!m) { fichaKey = ''; return ''; }
    const f = FICHA.get(fichaKey), close = ui.btn('Fechar', ui.act('ficha', ''), 'g sm');
    if (!f) { if (fichaBusy !== fichaKey) { fichaBusy = fichaKey; loadFicha(m).then(() => { fichaBusy = ''; P.schedule('maps'); }); } return ui.card(ui.head('Ficha técnica · ' + esc(m.code || ''), 'Lendo o HTML do mapa…', close, 'l') + ui.skeleton(2)); }
    if (f.erro) return ui.card(ui.head('Ficha técnica · ' + esc(m.code || ''), 'Não foi possível ler o HTML', close, 'l') + '<p class="pr-detail">O arquivo do mapa não está disponível agora (sem conexão ou fora do cache offline).</p>');
    const mx = Math.max(1, ...Object.values(f.marcadores)), pts = P.editais.pontosDoMapa(m);
    const bars = Object.keys(f.marcadores).length ? '<div class="pr-cats">' + MK.map(([id, l]) => '<div class="pr-cat" style="--c:' + P.mapColor(m) + '"><span class="nm"><span>' + esc(l) + '</span></span><span class="bar"><i style="width:' + ((f.marcadores[id] || 0) / mx) * 100 + '%"></i></span><span class="v">' + (f.marcadores[id] || 0) + '</span></div>').join('') + '</div>' : ui.verdict('', 'Nenhum tópico tem marcadores (data-markers).', 'Os filtros ⭐ ⚠️ 💎 🔢 do mapa e a revisão relâmpago ficam vazios; vale regerar o mapa no template atual.');
    const alerts = [f.semMarcadores && f.semMarcadores < f.topicos ? f.semMarcadores + ' ' + plural(f.semMarcadores, 'tópico sem marcador', 'tópicos sem marcador') : '', !f.corte && !f.fontes ? 'o HTML não declara a data da fonte legal' : ''].filter(Boolean);
    const fonte = f.corte ? 'Corte normativo em ' + esc(U.fmtDayYear(f.corte)) + (f.fontes ? ' · ' + esc(f.fontes) : '') : f.fontes ? '“' + esc(f.fontes.slice(0, 160)) + '”' : 'O HTML não declara a data da fonte legal.';
    return ui.card(ui.head('Ficha técnica · ' + esc(m.code || ''), esc(m.title), close, 'l') + '<div class="pr-pe-cells">' +
      ui.cell('Versão', esc(f.versao || m.version || '—'), '', esc((f.v211 ? 'template V211' : 'template não identificado') + (f.g26 ? ' · G26' : '') + (f.release ? ' · ' + f.release : ''))) +
      ui.cell('Estrutura', f.topicos, '', 'tópicos em ' + f.ramos + ' ' + plural(f.ramos, 'ramo')) + ui.cell('Questões', U.fmtNum(f.questoes), f.questoes ? '' : 'mu', 'variantes N1–N3 embutidas') +
      ui.cell('Arquivo', (f.bytes / 1048576).toFixed(1).replace('.', ','), '', 'MB') + ui.cell('Na prova', pts === null ? '—' : E58fmt(pts), '', pts === null ? 'curso sem estrutura da prova' : 'pontos que o mapa cobre') + '</div>' +
      '<div class="pr-two"><div><span class="pr-k">Marcadores nos tópicos</span>' + bars + '</div><div><span class="pr-k">Procedência</span><p class="pr-detail">' + fonte + '</p>' + (f.itens.length ? '<p class="pr-mono">Itens do edital: ' + esc(f.itens.join(' · ')) + '</p>' : '') + '<div class="pr-row">' + alcChip(m) + '<span class="pr-chip c">' + esc(m.category || 'Outros') + '</span></div>' + (alerts.length ? ui.verdict('l', 'Conferir:', esc(alerts.join('; ')) + '.') : '') + '</div></div>');
  }
  const E58fmt = (n) => P.editais.fmtPt(n);
  function render(root) {
    /* V15.54: concursos encerrados (arquivados ou com prova realizada) ficam ocultos; "Mostrar encerrados" traz o acervo deles.
       V15.56: só os mapas LOCAIS desses concursos saem da vista; portáteis e mistos continuam (servem no próximo edital). */
    const live = P.data.libraryMaps(), every = P.data.allMaps(), hidden = every.length - live.length;
    if (!hidden) st.closed = false;
    const all = st.closed ? every.filter((m) => !live.includes(m)) : live;
    if (offline === null) refreshOffline();
    const top = ui.top({ eyebrow: 'Biblioteca global', title: 'Todos os Mapas', tabs: [{ id: 'grade', label: 'Grade' }, { id: 'lista', label: 'Lista' }, { id: 'grupo', label: 'Agrupado' }], active: st.view, label: 'Todos os Mapas', tabAct: 'view' });
    const closedBar = hidden ? '<div class="pr-row sp" style="margin:4px 0 2px"><span class="pr-mono">' + (st.closed ? 'Mostrando ' + hidden + ' ' + plural(hidden, 'mapa local', 'mapas locais') + ' de concursos encerrados · progresso e histórico guardados' : hidden + ' ' + plural(hidden, 'mapa local', 'mapas locais') + ' de concursos encerrados ' + plural(hidden, 'oculto', 'ocultos') + ' · os portáteis continuam aqui') + '</span>' + ui.btn(st.closed ? 'Voltar aos mapas em estudo' : 'Mostrar encerrados', ui.act('closed'), 'g sm') + '</div>' : '';
    if (!all.length && hidden && !st.closed) { root.innerHTML = top + closedBar + ui.card(ui.empty('Nenhum mapa em estudo', 'Todos os concursos estão encerrados. Crie um novo concurso ou reative um em Cursos.', ui.btn('Ver cursos', ui.act('nav', 'courses'), 'g sm'))); return; }
    if (!all.length) { root.innerHTML = top + ui.card(ui.empty(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Nenhum mapa na biblioteca' : 'Biblioteca desconectada', typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Importe os mapas HTML de um concurso.' : 'Entre na sua conta para carregar os mapas.', ui.btn(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Importar mapas' : 'Abrir Configurações', ui.act(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'import-maps' : 'nav', 'settings'), 'p'))); return; }
    const fol = P.data.folhas(all), gp = P.data.agg(all);
    const progs = new Map(all.map((m) => [P.data.keyOf(m), P.data.prog(m)]));
    const done = all.filter((m) => { const p = progs.get(P.data.keyOf(m)); return p.total > 0 && p.marked >= p.total; }).length;
    const never = all.filter((m) => { const p = progs.get(P.data.keyOf(m)); return !p.marked && !p.lastActivity; });
    const andN = all.length - done - never.length;
    const inList = new Set(all.map((m) => String(m.courseId))), courses = P.courses.list().filter((c) => inList.has(String(c.id))), cats = typeof mapCategoriesFor === 'function' ? mapCategoriesFor(all) : [...new Set(all.map((m) => m.category))];
    const biggest = never.slice().sort((a, b) => progs.get(P.data.keyOf(b)).total - progs.get(P.data.keyOf(a)).total).slice(0, 3);
    const v = never.length ? ui.verdict('l', never.length + ' ' + plural(never.length, 'mapa nunca foi aberto', 'mapas nunca foram abertos') + '.', biggest.length ? 'Os maiores são ' + biggest.map((m) => esc(m.code || m.title) + ' (' + progs.get(P.data.keyOf(m)).total + ')').join(', ') + '. Ordene por "Tamanho" para ver o que pesa mais.' : '') : ui.verdict('m', 'Todos os mapas já foram abertos.', done === all.length ? 'O acervo está concluído.' : 'Ordene por "Parado" para ver os que estão há mais tempo sem estudo.');
    const catCells = cats.map((cname) => { const ms = all.filter((m) => m.category === cname); const t = ms.reduce((n, m) => n + progs.get(P.data.keyOf(m)).total, 0), mk = ms.reduce((n, m) => n + progs.get(P.data.keyOf(m)).marked, 0); return { cname, ms, t, mk }; }).sort((a, b) => b.t - a.t);
    const shownCats = catCells.slice(0, 4);
    const carimbo = '<section class="pr-card pr-carimbo"><div class="pr-c-a"><span class="pr-k l">' + esc('Acervo · ' + all.length + ' mapas em ' + courses.length + ' ' + plural(courses.length, 'concurso')) + '</span><div class="pr-big"><span class="pr-pct pr-num">' + pct(gp.marked, gp.total) + '<small>%</small></span><span class="pr-sub">' + fmtNum(gp.marked) + ' de ' + fmtNum(gp.total) + ' tópicos · ' + all.length + ' mapas</span></div>' +
      ui.states([['c', done, 'var(--pr-musgo)'], ['a', andN, 'var(--pr-latao)'], ['n', never.length, 'var(--pr-g3)']], 'Mapas por estado') + ui.legend([['Concluídos', done, 'var(--pr-musgo)'], ['Em andamento', andN, 'var(--pr-latao)'], ['Nunca abertos', never.length, 'var(--pr-g3)', true]]) + v + '</div><div class="pr-c-b">' +
      shownCats.map((x) => '<div class="pr-cell"><span>' + esc(x.cname) + '</span><b class="pr-num" style="color:' + P.categoryPigment(x.cname) + '">' + pct(x.mk, x.t) + '%</b><span>' + x.ms.length + ' ' + plural(x.ms.length, 'mapa') + ' · ' + x.mk + '/' + x.t + '</span></div>').join('') +
      ui.cell('Revisões', fmtNum(gp.review), gp.review ? 'l' : 'mu', all.filter((m) => progs.get(P.data.keyOf(m)).review).length + ' mapas com REV') + ui.cell('Difíceis', fmtNum(gp.difficult), gp.difficult ? 'ox' : 'mu', gp.difficult ? all.filter((m) => progs.get(P.data.keyOf(m)).difficult).length + ' mapas com DIF' : 'nenhum marcado') + '</div></section>';
    const q = U.norm(st.q);
    const fe = FE.find((x) => x[0] === st.fe) || FE[0];
    const base = all.filter((m) => (!q || U.norm([m.title, m.shortTitle, m.code, m.category, m.board, m.contest].join(' ')).includes(q)) && (st.fco === 'todos' || String(m.courseId) === st.fco));
    const okCat = (m) => (st.fc === 'todos' || m.category === st.fc) && (st.fa === 'todos' || P.editais.alcance(m) === st.fa);
    const list = sorted(base.filter((m) => fe[2](m, progs.get(P.data.keyOf(m))) && okCat(m)));
    const feChips = '<div class="pr-chips" role="group" aria-label="Estado">' + FE.filter((x) => x[0] !== 'off' || offline).map(([id, label, fn]) => ui.chipf(id, label, base.filter((m) => okCat(m) && fn(m, progs.get(P.data.keyOf(m)))).length, st.fe === id, 'fe')).join('') + '</div>';
    const catChips = '<div class="pr-chips" role="group" aria-label="Categoria">' + ui.chipf('todos', 'Todas', undefined, st.fc === 'todos', 'fc', undefined, 'Todas as categorias') + cats.map((x) => ui.chipf(x, (typeof categoryShortName === 'function' ? categoryShortName(x) : x), base.filter((m) => m.category === x && fe[2](m, progs.get(P.data.keyOf(m)))).length, st.fc === x, 'fc', P.categoryPigment(x), x)).join('') + '</div>';
    const alcN = (id) => base.filter((m) => (st.fc === 'todos' || m.category === st.fc) && fe[2](m, progs.get(P.data.keyOf(m))) && P.editais.alcance(m) === id).length;
    const alcChips = '<div class="pr-chips" role="group" aria-label="Alcance">' + ui.chipf('todos', 'Todo alcance', undefined, st.fa === 'todos', 'fa') + P.editais.ALCANCES.map(([id, l]) => { const n = alcN(id); return n || st.fa === id ? ui.chipf(id, l, n, st.fa === id, 'fa') : ''; }).join('') + '</div>';
    const courseChips = courses.length > 1 ? '<div class="pr-chips" role="group" aria-label="Concurso">' + ui.chipf('todos', 'Todos os concursos', undefined, st.fco === 'todos', 'fco') + courses.map((c) => ui.chipf(String(c.id), P.courses.sigla(c), all.filter((m) => String(m.courseId) === String(c.id)).length, st.fco === String(c.id), 'fco', P.courses.color(c))).join('') + '</div>' : '';
    /* V15.53.2 · mesma barra de dentro do curso: busca e ordenação à esquerda, estados à direita, numa linha só. */
    const sortSel = '<span class="pr-sortsel"><select data-pr-input="sort" aria-label="Ordenar mapas">' + SORTS.map(([id, label]) => '<option value="' + id + '"' + (st.sort === id ? ' selected' : '') + '>Ordenar: ' + esc(label) + '</option>').join('') + '</select></span>';
    const tool = '<div class="pr-tool pr-tool-maps"><div class="grp"><input class="pr-qbox" type="search" value="' + esc(st.q) + '" placeholder="Buscar mapa…" data-pr-input="q" aria-label="Buscar mapas por código, título ou tema">' + sortSel + '</div><div class="grp">' + feChips + '</div></div>';
    let body;
    if (!list.length) body = ui.card(ui.empty('Nenhum mapa neste filtro', 'Limpe os filtros para ver todo o acervo.', ui.btn('Limpar filtros', ui.act('clear'), 'g sm')));
    else if (st.view === 'lista') body = table(list, fol);
    else if (st.view === 'grupo') {
      const groups = st.group === 'course' ? courses.map((c) => ({ id: String(c.id), name: P.courses.sigla(c) + ' · ' + c.title, color: P.courses.color(c), all: all.filter((m) => String(m.courseId) === String(c.id)) })) : cats.map((x) => ({ id: x, name: x, color: P.categoryPigment(x), all: all.filter((m) => m.category === x) }));
      body = '<div class="pr-row"><span class="pr-k">Agrupar por</span>' + ui.seg([['cat', 'Categoria'], ['course', 'Concurso']], st.group, 'group', 'Agrupar') + '</div>' + groups.map((g) => {
        const ms = list.filter((m) => (st.group === 'course' ? String(m.courseId) === g.id : m.category === g.id));
        if (!ms.length) return '';
        const ag = P.data.agg(g.all);
        return '<section class="pr-grpc"><div class="pr-grph" style="--c:' + g.color + '"><b>' + esc(g.name) + '</b>' + ui.mini(g.all, g.color) + '<span class="pr-mono">' + g.all.length + ' mapas · ' + ag.marked + '/' + ag.total + ' · ' + pct(ag.marked, ag.total) + '%</span></div><div class="pr-gridm">' + ms.map((m) => card(m, fol)).join('') + '</div></section>';
      }).join('');
    } else body = '<div class="pr-gridm">' + list.map((m) => card(m, fol)).join('') + '</div>';
    root.innerHTML = top + closedBar + carimbo + fichaCard() + tool + catChips + alcChips + courseChips + (ptsSort() && !all.some((m) => valorOf(m) >= 0) ? '<p class="pr-mono">Nenhum curso destes mapas tem a estrutura da prova; informe-a no Raio-X do curso para ordenar por pontos.</p>' : '') + '<p class="pr-mono" aria-live="polite">' + list.length + ' de ' + all.length + ' mapas</p>' + body;
  }
  /* V15.58 · Atualizar HTML com prévia: antes de confirmar, compara os tópicos das duas versões
     (mantidos, novos, removidos, renomeados) e quanto do progresso marcado é preservado. */
  (function installUpdateDiff() {
    const base = window.renderMapUpdatePreview;
    if (typeof base !== 'function' || base.__diff) return;
    const topicsOf = (html) => { const doc = new DOMParser().parseFromString(html || '', 'text/html'); return [...doc.querySelectorAll('.topic-card[data-topic-id]')].map((t) => ({ id: t.getAttribute('data-topic-id'), title: (t.querySelector('.topic-name')?.textContent || '').replace(/\s+/g, ' ').trim() })); };
    let seq = 0;
    const li = (tag, t, note) => '<li><b>' + tag + '</b> ' + esc(t.title || t.id) + (note ? ' <small>' + esc(note) + '</small>' : '') + '</li>';
    const wrapped = function () {
      const r = base.apply(this, arguments);
      try {
        const box = document.getElementById('mapUpdatePreview'), m = typeof currentMapUpdateTarget === 'function' ? currentMapUpdateTarget() : null, c = typeof mapUpdate !== 'undefined' ? mapUpdate.candidate : null;
        if (!box || !m || !c?.html || typeof mapHtml !== 'function') return r;
        const my = ++seq;
        box.insertAdjacentHTML('beforeend', '<div class="map-update-diff" data-update-diff><p class="map-update-empty">Comparando os tópicos das duas versões…</p></div>');
        Promise.resolve(mapHtml(m)).then((cur) => {
          const host = box.querySelector('[data-update-diff]');
          if (my !== seq || !host) return;
          const a = topicsOf(cur), b = topicsOf(c.html), ia = new Map(a.map((t) => [t.id, t])), ib = new Map(b.map((t) => [t.id, t]));
          if (!a.length) { host.innerHTML = '<p class="map-update-empty">Não foi possível ler os tópicos da versão atual para comparar.</p>'; return; }
          const mant = b.filter((t) => ia.has(t.id)), novos = b.filter((t) => !ia.has(t.id)), rem = a.filter((t) => !ib.has(t.id)), ren = mant.filter((t) => ia.get(t.id).title && t.title && ia.get(t.id).title !== t.title);
          const stt = (typeof readMapState === 'function' ? readMapState(m).topicStates : null) || {};
          const marc = a.filter((t) => stt[t.id]).length, kept = mant.filter((t) => stt[t.id]).length;
          const lab = { done: 'OK', review: 'REV', difficult: 'DIF' };
          host.innerHTML = '<div class="map-update-checks"><span>' + mant.length + ' mantidos</span><span>' + novos.length + ' novos</span><span>' + rem.length + ' removidos</span>' + (ren.length ? '<span>' + ren.length + ' renomeados</span>' : '') + '</div>' +
            '<p class="map-update-empty">' + (marc ? 'Seu progresso fica em ' + kept + ' de ' + marc + ' tópicos marcados.' + (marc > kept ? ' O estado dos removidos continua guardado, mas eles saem da fila.' : '') : 'Nenhum tópico marcado neste mapa ainda.') + '</p>' +
            (novos.length || rem.length || ren.length ? '<ul class="map-update-diff-list">' + novos.slice(0, 12).map((t) => li('novo', t)).join('') + ren.slice(0, 12).map((t) => li('renomeado', t, 'antes: ' + ia.get(t.id).title)).join('') + rem.slice(0, 12).map((t) => li('removido', t, lab[stt[t.id]] || '')).join('') + '</ul>' : '<p class="map-update-empty">Os mesmos tópicos nas duas versões.</p>');
        }).catch(() => { const host = box.querySelector('[data-update-diff]'); if (host && my === seq) host.innerHTML = '<p class="map-update-empty">Não foi possível ler a versão atual para comparar.</p>'; });
      } catch (e) { console.warn('[Prancha] prévia da atualização', e); }
      return r;
    };
    wrapped.__diff = true;
    window.renderMapUpdatePreview = wrapped;
  })();
  let qTimer = 0;
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-prancha="maps"] [data-pr-input="q"]');
    if (!el) return;
    st.q = el.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { const pos = el.selectionStart, mroot = P.rootFor('maps'), keep = P.collectImgs?.(mroot); P.pages.maps.render(mroot); if (keep) P.reuseImgs(mroot, keep); const n = P.rootFor('maps').querySelector('[data-pr-input="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } }, 180);
  });
  document.addEventListener('change', (e) => {
    const sel = e.target.closest?.('[data-prancha="maps"] select[data-pr-input="sort"]');
    if (sel) P.pages.maps.actions.sort(sel.value);
  });
  P.pages.maps = {
    render,
    actions: {
      ficha: (key) => { fichaKey = fichaKey === key ? '' : String(key || ''); P.schedule('maps'); if (fichaKey) window.scrollTo({ top: 0 }); },
      view: (id) => { st.view = id; save(); P.schedule('maps'); },
      fe: (id) => { st.fe = id; P.schedule('maps'); },
      fc: (id) => { st.fc = id; P.schedule('maps'); },
      fco: (id) => { st.fco = id; P.schedule('maps'); },
      fa: (id) => { st.fa = id; P.schedule('maps'); },
      sort: (id) => { st.sort = id; save(); P.schedule('maps'); },
      group: (id) => { st.group = id; save(); P.schedule('maps'); },
      closed: () => { st.closed = !st.closed; st.fco = 'todos'; P.schedule('maps'); },
      clear: () => { st.fe = 'todos'; st.fc = 'todos'; st.fco = 'todos'; st.fa = 'todos'; st.q = ''; P.schedule('maps'); },
      'fav-menu': (key) => { P.actions.fav(key); P.schedule('maps'); },
      fav: (key, el, root, e) => { e?.stopPropagation(); P.actions.fav(key, el); }
    }
  };
  document.addEventListener('keydown', (e) => { const g = e.target.closest?.('[data-prancha="maps"] .pr-gm'); if (g && (e.key === 'Enter' || e.key === ' ') && e.target === g) { e.preventDefault(); g.click(); } });
})();
