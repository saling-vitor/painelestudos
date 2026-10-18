'use strict';
/* MEUS MAPAS · Prancha · Todos os Mapas como índice de pranchas: carimbo do acervo e três leituras. */
(() => {
  const P = window.Prancha;
  if (!P || P.pages.maps) return;
  const U = P.util, ui = P.ui, { esc, fmtNum, plural, pct } = U;
  const KEY = 'studyapp.prancha.mapsView';
  const st = (() => { try { return { view: 'grade', sort: 'az', group: 'cat', ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { view: 'grade', sort: 'az', group: 'cat' }; } })();
  st.fe = 'todos'; st.fc = 'todos'; st.fco = 'todos'; st.q = '';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ view: st.view, sort: st.sort, group: st.group })); } catch {} };
  let offline = null, offlineBusy = false;

  const isFav = (k) => typeof favs !== 'undefined' && favs.has(k);
  const FE = [
    ['todos', 'Todos', () => true], ['feito', 'Concluídos', (m, p) => p.total > 0 && p.marked >= p.total], ['and', 'Em andamento', (m, p) => p.marked > 0 && p.marked < p.total],
    ['nao', 'Nunca abertos', (m, p) => !p.marked && !p.lastActivity], ['rev', 'Com revisão', (m, p) => p.review > 0], ['dif', 'Difíceis', (m, p) => p.difficult > 0],
    ['fav', 'Favoritos', (m) => isFav(P.data.keyOf(m))], ['off', 'Disponível offline', (m) => !!offline?.has(P.data.keyOf(m))]
  ];
  const SORTS = [['az', 'A–Z'], ['prog', 'Progresso'], ['tam', 'Tamanho'], ['par', 'Parado'], ['rec', 'Recentes']];
  function refreshOffline() {
    if (offlineBusy || typeof mapAvailableOffline !== 'function') return;
    offlineBusy = true;
    const all = P.data.maps();
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
    return a.map((x) => x.m);
  }
  function card(m, fol) {
    const p = P.data.prog(m), k = P.data.keyOf(m), c = P.courses.byId(m.courseId), fav = isFav(k);
    return '<div class="pr-gm" style="--c:' + P.mapColor(m) + '" data-pr-act="open-map" data-arg="' + esc(k) + '" role="link" tabindex="0" aria-label="' + esc('Abrir ' + (m.code || '') + ' · ' + m.title) + '">' + ui.mapCov(m) +
      '<button type="button" class="pr-fav" data-pr-act="fav" data-arg="' + esc(k) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '">' + (typeof uiIcon === 'function' ? uiIcon('star', 'ui-icon-sm') : '★') + '</button>' +
      '<div class="stamp"><div><span>Folha</span><b>' + esc(fol.get(k) || '—') + '</b></div><div><span>Tópicos</span><b>' + p.marked + '/' + p.total + '</b></div><div><span>Feito</span><b>' + pct(p.marked, p.total) + '%</b></div></div>' +
      '<div class="ti"><b>' + esc(m.title) + '</b>' + ui.stbar(p) + '<div class="pr-row sp"><span class="pr-mono">' + esc(ui.mapState(p) + ' · ' + ui.lastLabel(p.lastActivity) + (c ? ' · ' + P.courses.sigla(c) : '')) + '</span>' + rowMenu(m) + '</div></div></div>';
  }
  function rowMenu(m) {
    const k = P.data.keyOf(m);
    return ui.menu('am-' + k, [['Abrir', ui.act('open-map', k)], [isFav(k) ? 'Remover dos favoritos' : 'Adicionar aos favoritos', ui.act('fav-menu', k)], typeof mapCanUpdateHtml === 'function' && mapCanUpdateHtml(m) ? ['Atualizar HTML', ui.act('update-map', k)] : null, ['Gerenciar mapa', ui.act('manage-map', k)], ['Abrir o curso', ui.act('open-course', m.courseId)]]);
  }
  function table(list, fol) {
    return '<div class="pr-tbl"><table><thead><tr><th>Folha</th><th>Mapa</th><th class="hide-m"></th><th class="hide-m">Categoria</th><th class="hide-m">Concurso</th><th>Tópicos</th><th>Estado</th><th class="hide-m">Última</th><th></th></tr></thead><tbody>' + list.map((m) => {
      const p = P.data.prog(m), k = P.data.keyOf(m), c = P.courses.byId(m.courseId);
      return '<tr style="--c:' + P.mapColor(m) + '" data-pr-act="open-map" data-arg="' + esc(k) + '"><td class="fn">' + esc(fol.get(k) || '') + '</td><td><span class="pr-sig">' + esc(m.code || '') + '</span></td><td class="hide-m"><b>' + esc(m.title) + '</b></td><td class="hide-m"><span class="pr-chip c">' + esc(m.category || 'Outros') + '</span></td><td class="pr-mono hide-m">' + esc(c ? P.courses.sigla(c) : '') + '</td><td class="pr-num">' + p.marked + '/' + p.total + '</td><td style="min-width:110px">' + ui.stbar(p) + '<span class="pr-mono">' + ui.mapState(p) + '</span></td><td class="pr-mono hide-m">' + ui.lastLabel(p.lastActivity) + '</td><td><span class="pr-row" style="flex-wrap:nowrap">' + ui.btn('Abrir', ui.act('open-map', k), p.total > 0 && p.marked >= p.total ? 'g sm' : 'sm') + rowMenu(m) + '</span></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function render(root) {
    const all = P.data.maps();
    if (offline === null) refreshOffline();
    const top = ui.top({ eyebrow: 'Biblioteca global', title: 'Todos os Mapas', tabs: [{ id: 'grade', label: 'Grade' }, { id: 'lista', label: 'Lista' }, { id: 'grupo', label: 'Agrupado' }], active: st.view, label: 'Todos os Mapas', tabAct: 'view' });
    if (!all.length) { root.innerHTML = top + ui.card(ui.empty(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Nenhum mapa na biblioteca' : 'Biblioteca desconectada', typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Importe os mapas HTML de um concurso.' : 'Entre na sua conta para carregar os mapas.', ui.btn(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'Importar mapas' : 'Abrir Configurações', ui.act(typeof StudyCloud !== 'undefined' && StudyCloud.session() ? 'import-maps' : 'nav', 'settings'), 'p'))); return; }
    const fol = P.data.folhas(all), gp = P.data.agg(all);
    const progs = new Map(all.map((m) => [P.data.keyOf(m), P.data.prog(m)]));
    const done = all.filter((m) => { const p = progs.get(P.data.keyOf(m)); return p.total > 0 && p.marked >= p.total; }).length;
    const never = all.filter((m) => { const p = progs.get(P.data.keyOf(m)); return !p.marked && !p.lastActivity; });
    const andN = all.length - done - never.length;
    const courses = P.courses.list(), cats = typeof mapCategoriesFor === 'function' ? mapCategoriesFor(all) : [...new Set(all.map((m) => m.category))];
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
    const okCat = (m) => st.fc === 'todos' || m.category === st.fc;
    const list = sorted(base.filter((m) => fe[2](m, progs.get(P.data.keyOf(m))) && okCat(m)));
    const feChips = '<div class="pr-chips" role="group" aria-label="Estado">' + FE.filter((x) => x[0] !== 'off' || offline).map(([id, label, fn]) => ui.chipf(id, label, base.filter((m) => okCat(m) && fn(m, progs.get(P.data.keyOf(m)))).length, st.fe === id, 'fe')).join('') + '</div>';
    const catChips = '<div class="pr-chips" role="group" aria-label="Categoria">' + ui.chipf('todos', 'Todas', undefined, st.fc === 'todos', 'fc', undefined, 'Todas as categorias') + cats.map((x) => ui.chipf(x, (typeof categoryShortName === 'function' ? categoryShortName(x) : x), base.filter((m) => m.category === x && fe[2](m, progs.get(P.data.keyOf(m)))).length, st.fc === x, 'fc', P.categoryPigment(x), x)).join('') + '</div>';
    const courseChips = courses.length > 1 ? '<div class="pr-chips" role="group" aria-label="Concurso">' + ui.chipf('todos', 'Todos os concursos', undefined, st.fco === 'todos', 'fco') + courses.map((c) => ui.chipf(String(c.id), P.courses.sigla(c), all.filter((m) => String(m.courseId) === String(c.id)).length, st.fco === String(c.id), 'fco', P.courses.color(c))).join('') + '</div>' : '';
    const tool = '<div class="pr-tool"><div class="grp">' + feChips + '</div><div class="grp"><label class="pr-field" style="min-width:200px"><span class="pr-k">Buscar</span><input type="search" value="' + esc(st.q) + '" placeholder="Código, título ou tema" data-pr-input="q" aria-label="Buscar mapas"></label><div style="display:grid;gap:4px"><span class="pr-k">Ordenar</span>' + ui.seg(SORTS, st.sort, 'sort', 'Ordenar') + '</div></div></div>';
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
    root.innerHTML = top + carimbo + tool + catChips + courseChips + '<p class="pr-mono" aria-live="polite">' + list.length + ' de ' + all.length + ' mapas</p>' + body;
  }
  let qTimer = 0;
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-prancha="maps"] [data-pr-input="q"]');
    if (!el) return;
    st.q = el.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { const pos = el.selectionStart; P.pages.maps.render(P.rootFor('maps')); const n = P.rootFor('maps').querySelector('[data-pr-input="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } }, 180);
  });
  P.pages.maps = {
    render,
    actions: {
      view: (id) => { st.view = id; save(); P.schedule('maps'); },
      fe: (id) => { st.fe = id; P.schedule('maps'); },
      fc: (id) => { st.fc = id; P.schedule('maps'); },
      fco: (id) => { st.fco = id; P.schedule('maps'); },
      sort: (id) => { st.sort = id; save(); P.schedule('maps'); },
      group: (id) => { st.group = id; save(); P.schedule('maps'); },
      clear: () => { st.fe = 'todos'; st.fc = 'todos'; st.fco = 'todos'; st.q = ''; P.schedule('maps'); },
      'fav-menu': (key) => { P.actions.fav(key); P.schedule('maps'); },
      fav: (key, el, root, e) => { e?.stopPropagation(); P.actions.fav(key, el); }
    }
  };
  document.addEventListener('keydown', (e) => { const g = e.target.closest?.('[data-prancha="maps"] .pr-gm'); if (g && (e.key === 'Enter' || e.key === ' ') && e.target === g) { e.preventDefault(); g.click(); } });
})();
