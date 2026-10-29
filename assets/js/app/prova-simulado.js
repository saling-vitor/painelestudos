'use strict';
/* MEUS MAPAS · V15.64 · simulado a partir do caderno oficial (PDF) e do gabarito.
   Lê o caderno com o leitor de provas, recorta como imagem as questões com figura, tabela ou fórmula,
   monta o EXAM_DATA do motor V08 (assets/sim/motor-prova-v08.html) e entrega o HTML ao importador de simulados
   do app — o mesmo caminho de um simulado HTML, com resultado por disciplina no formato da banca. */
(() => {
  const P = window.Prancha;
  if (!P || P.provaSim) return;
  const U = P.util, ui = P.ui, { esc } = U;
  const R = () => window.MeusMapasProvaReader;
  const MOTOR = 'assets/sim/motor-prova-v08.html';
  let st = null; /* { aberto, lendo, prova:{arquivo, doc, pages, leitura}, gab:{arquivo, blocos, bloco, texto}, criando } */

  async function pdfPaginas(file) {
    const lib = await loadCoursePdfJs();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
      pages.push({ w: vp.width, h: vp.height, lines: window.MeusMapasEditalLayout.layoutLines(tc.items) });
    }
    return { doc, pages };
  }
  /* recorte das regiões da questão (coordenadas do PDF) em uma imagem só, empilhada */
  async function recorte(doc, regioes, cache) {
    const scale = 2, partes = [];
    for (const r of regioes) {
      let c = cache.get(r.page);
      if (!c) {
        const pg = await doc.getPage(r.page + 1), vp = pg.getViewport({ scale });
        c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvasContext: ctx, viewport: vp }).promise;
        c.ph = vp.height / scale; cache.set(r.page, c);
      }
      const x = Math.max(0, r.x0 * scale), y = Math.max(0, (c.ph - r.top - 4) * scale), w = Math.min(c.width - x, (r.x1 - r.x0) * scale), h = Math.min(c.height - y, (r.top - r.bot + 8) * scale);
      if (w > 10 && h > 10) partes.push([c, x, y, w, h]);
    }
    if (!partes.length) return '';
    const W = Math.max(...partes.map((p) => p[3])), H = partes.reduce((s, p) => s + p[4], 0), max = 1000, k = Math.min(1, max / W);
    const out = document.createElement('canvas'); out.width = Math.round(W * k); out.height = Math.round(H * k);
    const ctx = out.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    let y = 0;
    for (const [c, sx, sy, w, h] of partes) { ctx.drawImage(c, sx, sy, w, h, 0, y * k, w * k, h * k); y += h; }
    return out.toDataURL('image/jpeg', 0.8);
  }
  const txt = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

  /* EXAM_DATA do motor V08 a partir da leitura e das respostas */
  async function montar(course, leitura, respostas, { doc, titulo } = {}) {
    const m = leitura.meta || {}, prova = course ? P.editais.prova(course.id) : [];
    const cache = new Map(), anuladas = [];
    const sections = [];
    let figuras = 0, semResposta = 0;
    for (const s of leitura.secoes) {
      const d = prova.length ? P.editais.secaoDisciplina(s.titulo, prova) : null;
      const questions = [];
      for (const q of s.questoes) {
        const ans = respostas[q.n];
        if (ans === 'X') { anuladas.push(q.n); continue; }
        if (!ans) { semResposta++; continue; }
        const alts = q.alternativas.slice();
        while (alts.length < leitura.alternativas) alts.push('');
        const row = {
          number: q.n,
          stem: (anuladas.length ? '<b>[caderno: ' + String(q.n).padStart(2, '0') + ']</b> ' : '') + (q.apoio ? txt(q.apoio) + '<br><br>' : '') + txt(q.stem),
          alternatives: alts.map((a, i) => String.fromCharCode(65 + i) + ') ' + txt(a)),
          answer: q.ce ? (ans === 'C' ? 'A' : ans === 'E' ? 'B' : ans) : ans,
          explanation: 'Gabarito oficial: ' + ans + '.',
          topic: s.titulo, difficulty: 'Oficial', styleTag: ''
        };
        if (q.figura && doc) { try { row.image = await recorte(doc, q.regioes, cache); if (row.image) { row.imageCaption = 'Fonte: caderno oficial' + (m.entidade ? ' — ' + m.entidade : '') + ', questão ' + q.n + '.'; figuras++; } } catch (e) { console.warn('[prova] recorte', q.n, e); } }
        questions.push(row);
      }
      if (!questions.length) continue;
      sections.push({ title: s.titulo.toUpperCase(), weight: d?.peso ?? 1, minPoints: d ? P.editais.minPts(d) : 0, expectedCount: questions.length, ...(s.intro && s.intro.linhas.length ? { intro: { title: s.intro.titulo || '', author: 'Texto do caderno oficial', lines: s.intro.linhas.map(txt) } } : {}), questions });
    }
    const total = sections.reduce((n, s) => n + s.questions.length, 0);
    const mg = course ? P.editais.minimoGeral(course.id) : null;
    const ano = (m.edital.match(/(20\d\d|19\d\d)/) || [])[1] || '';
    const code = 'PROVA_' + [slug(m.banca), slug(m.entidade).split('_').slice(0, 3).join('_'), ano].filter(Boolean).join('_');
    const exam = {
      meta: { entity: m.entidade || course?.title || 'Caderno oficial', exam: [m.edital, 'caderno oficial'].filter(Boolean).join(' — '), role: m.cargo || course?.subtitle || '', level: '', duration: '4h', code, version: 'CADERNO OFICIAL', date: new Date().toLocaleDateString('pt-BR'), expectedQuestions: total, alternativesCount: leitura.alternativas, scratchSlots: Math.max(60, total), ...(mg ? { minTotalPoints: mg } : {}) },
      instructions: [
        'Questões e alternativas do caderno oficial' + (m.banca ? ' (' + m.banca + ')' : '') + ', com o gabarito ' + (titulo ? '“' + titulo + '”' : 'oficial') + '.',
        total + ' questões' + (leitura.formato === 'certo-errado' ? ' para julgar (A = Certo, B = Errado).' : ', alternativas de A a ' + String.fromCharCode(64 + leitura.alternativas) + '.'),
        'Questões com figura, tabela ou fórmula trazem o recorte do caderno logo abaixo do enunciado.',
        anuladas.length ? 'Anuladas no gabarito e fora deste simulado: ' + anuladas.join(', ') + '. O número do caderno aparece entre colchetes.' : 'Nenhuma questão anulada no gabarito informado.'
      ],
      sections
    };
    return { exam, total, figuras, anuladas, semResposta };
  }
  async function html(exam, board) {
    const r = await fetch(MOTOR, { cache: 'force-cache' });
    if (!r.ok) throw new Error('Motor do simulado indisponível.');
    const tpl = await r.text(), m = exam.meta, n = exam.meta.expectedQuestions;
    const title = 'Prova ' + [board, m.entity.split(' — ')[0]].filter(Boolean).join(' · ');
    const meta = [['simulation-title', title], ['simulation-code', m.code], ['simulation-board', board || ''], ['simulation-subtitle', [m.role, m.exam].filter(Boolean).join(' — ')], ['simulation-question-count', String(n)], ['simulation-duration-minutes', '240'], ['simulation-version', 'Caderno oficial']]
      .map(([k, v]) => '<meta name="' + k + '" content="' + String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '" />').join('\n');
    const json = JSON.stringify(exam).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return { title, html: tpl.replace('<!--MM_META-->', meta).replace('{{TITULO}}', txt(title)).replace('{{MARCA}}', txt('Prova oficial' + (board ? ' — ' + board : ''))).replace('/*__EXAM_DATA__*/null', () => json) };
  }

  /* ---------- painel em Simulados ---------- */
  function respostas() {
    if (!st?.gab) return {};
    if (st.gab.texto) return R().gabaritoDoTexto(st.gab.texto);
    return st.gab.blocos?.[st.gab.bloco]?.respostas || {};
  }
  function panel(course) {
    if (!st?.aberto) return '';
    const L = st.prova?.leitura, rs = respostas(), nums = L ? L.secoes.flatMap((s) => s.questoes.map((q) => q.n)) : [];
    const cobertas = nums.filter((n) => rs[n]).length, prova = course ? P.editais.prova(course.id) : [];
    const head = ui.head('Simulado a partir da prova', 'Caderno oficial em PDF + gabarito → simulado interativo', ui.btn('Fechar', ui.act('prova-fechar'), 'g sm'));
    const passo1 = '<div class="pr-ps"><span class="pr-k l">1 · Caderno de questões</span>' + (st.lendo === 'prova' ? '<p class="pr-mono">Lendo o caderno…</p>' : L ? '<p><b>' + esc(st.prova.arquivo) + '</b> · ' + L.questoes + ' questões' + (L.meta.banca ? ' · ' + esc(L.meta.banca) : '') + (L.meta.entidade ? ' · ' + esc(L.meta.entidade) : '') + '</p>' : '<p class="pr-mono">PDF com texto selecionável (não escaneado).</p>') +
      '<div class="pr-row">' + ui.btn(L ? 'Trocar caderno' : 'Escolher o PDF da prova', ui.act('prova-pick', 'prova'), L ? 'g sm' : 'p') + '<input type="file" accept="application/pdf,.pdf" hidden data-pr-change="prova-file" data-pr-prova="prova"></div></div>';
    const blocos = st.gab?.blocos || [];
    const passo2 = '<div class="pr-ps"><span class="pr-k l">2 · Gabarito</span>' + (st.lendo === 'gab' ? '<p class="pr-mono">Lendo o gabarito…</p>' : '') +
      (blocos.length > 1 ? '<label class="pr-field"><span>Qual gabarito do arquivo</span><select data-pr-change="prova-bloco">' + blocos.map((b, i) => '<option value="' + i + '"' + (i === st.gab.bloco ? ' selected' : '') + '>' + esc(b.titulo.slice(0, 90)) + ' · ' + Object.keys(b.respostas).length + '</option>').join('') + '</select></label>' : blocos.length === 1 ? '<p><b>' + esc(st.gab.arquivo || '') + '</b> · ' + Object.keys(blocos[0].respostas).length + ' respostas</p>' : '') +
      '<div class="pr-row">' + ui.btn(blocos.length ? 'Trocar PDF do gabarito' : 'PDF do gabarito', ui.act('prova-pick', 'gab'), 'g sm') + '<input type="file" accept="application/pdf,.pdf" hidden data-pr-change="prova-file" data-pr-prova="gab"></div>' +
      '<label class="pr-field"><span>Ou digite o gabarito (ex.: CEADB… ou 1-C 2-E; X = anulada)</span><textarea rows="2" data-pr-change="prova-gabtxt" placeholder="CEADBCADEA…">' + esc(st.gab?.texto || '') + '</textarea></label></div>';
    let resumo = '';
    if (L && L.questoes) {
      const fig = L.secoes.reduce((n, s) => n + s.questoes.filter((q) => q.figura).length, 0), anul = nums.filter((n) => rs[n] === 'X').length;
      resumo = '<div class="pr-ps"><span class="pr-k l">3 · Conferência</span><div class="pr-list">' + L.secoes.map((s) => { const d = prova.length ? P.editais.secaoDisciplina(s.titulo, prova) : null; const ok = s.questoes.filter((q) => rs[q.n]).length; return '<div class="pr-li pr-pv"><span class="pr-mono">' + s.questoes.length + '</span><span><b>' + esc(s.titulo) + '</b><span class="t">questões ' + s.questoes[0].n + '–' + s.questoes[s.questoes.length - 1].n + (s.intro ? ' · com texto de apoio' : '') + (d ? ' · conta como ' + esc(d.nome) + ' (peso ' + P.editais.fmtPt(d.peso) + ')' : '') + '</span></span><span class="pr-chip ' + (ok === s.questoes.length ? 'ok' : 'ox') + '">' + ok + '/' + s.questoes.length + ' no gabarito</span></div>'; }).join('') + '</div>' +
        '<p class="pr-mono">' + cobertas + ' de ' + nums.length + ' questões com resposta' + (anul ? ' · ' + anul + ' anulada' + (anul > 1 ? 's' : '') + ' (fica de fora)' : '') + ' · ' + fig + ' com figura, tabela ou fórmula (vão como imagem do caderno)' + (L.formato === 'certo-errado' ? ' · itens Certo/Errado' : '') + '</p>' +
        (L.avisos.length ? '<details class="pr-rot"><summary>' + L.avisos.length + ' aviso' + (L.avisos.length > 1 ? 's' : '') + ' da leitura</summary><ul class="pr-mono">' + L.avisos.slice(0, 20).map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul></details>' : '') +
        '<div class="pr-row" style="margin-top:10px">' + ui.btn(st.criando ? 'Montando…' : 'Criar simulado interativo', { ...ui.act('prova-criar', course?.id || ''), disabled: !!st.criando || cobertas < nums.length * 0.5 }, 'p') + '<span class="pr-mono">Abre o importador com o arquivo pronto: confira o concurso e salve.</span></div></div>';
    } else if (L) resumo = '<div class="pr-ps">' + ui.empty('Nenhuma questão encontrada', L.avisos[0] || 'O leitor não achou questões numeradas com alternativas neste PDF.') + '</div>';
    return ui.card(head + '<div class="pr-pgrid">' + passo1 + passo2 + '</div>' + resumo);
  }
  async function lerArquivo(kind, file) {
    st.lendo = kind; P.schedule('simulations');
    try {
      if (kind === 'prova') {
        const { doc, pages } = await pdfPaginas(file);
        st.prova = { arquivo: file.name, doc, pages, leitura: R().lerProva(pages) };
        if (st.gab?.blocos?.length) st.gab.bloco = Math.max(0, R().escolherBloco(st.gab.blocos, st.prova.leitura.meta, st.prova.leitura.questoes));
      } else {
        const { pages } = await pdfPaginas(file);
        const blocos = R().lerGabarito(pages);
        if (!blocos.length) throw new Error('Não achei respostas neste PDF (gabarito escaneado?). Digite o gabarito no campo ao lado.');
        st.gab = { arquivo: file.name, blocos, bloco: Math.max(0, R().escolherBloco(blocos, st.prova?.leitura?.meta, st.prova?.leitura?.questoes)), texto: '' };
      }
    } catch (e) { console.warn('[prova]', e); if (typeof toast === 'function') toast(e?.message || 'Não foi possível ler o PDF.'); }
    st.lendo = '';
    if (document.activeElement?.matches?.('input[type="file"]')) document.activeElement.blur();
    P.schedule('simulations');
  }
  async function criar(courseId) {
    if (!st?.prova?.leitura || st.criando) return;
    st.criando = true; P.schedule('simulations');
    try {
      const course = courseId ? P.courses.byId(courseId) : null, L = st.prova.leitura;
      const titulo = st.gab?.texto ? 'digitado' : st.gab?.blocos?.[st.gab.bloco]?.titulo || '';
      const r = await montar(course, L, respostas(), { doc: st.prova.doc, titulo });
      if (!r.total) throw new Error('Nenhuma questão com resposta no gabarito.');
      const out = await html(r.exam, L.meta.banca);
      const file = new File([out.html], r.exam.meta.code + '.html', { type: 'text/html' });
      P.provaSim.ultimo = { file, ...r };
      if (typeof openSimulationImportDialog === 'function' && typeof prepareSimulationImportFiles === 'function') {
        openSimulationImportDialog();
        const sel = document.getElementById('simulationImportCourse');
        if (sel && courseId) sel.value = courseId;
        await prepareSimulationImportFiles([file]);
        if (typeof toast === 'function') toast('Simulado montado: ' + r.total + ' questões' + (r.figuras ? ', ' + r.figuras + ' com imagem do caderno' : '') + '. Confira e salve.');
      }
    } catch (e) { console.warn('[prova]', e); if (typeof toast === 'function') toast(e?.message || 'Não foi possível montar o simulado.'); }
    st.criando = false; P.schedule('simulations');
  }
  const actions = {
    'prova-abrir': () => { st = st || { aberto: true }; st.aberto = true; P.schedule('simulations'); window.scrollTo({ top: 0 }); },
    'prova-fechar': () => { if (st) st.aberto = false; P.schedule('simulations'); },
    'prova-pick': (kind, el, root) => root.querySelector('[data-pr-prova="' + kind + '"]')?.click(),
    'prova-file': (v, el) => { const f = el.files?.[0]; if (f) lerArquivo(el.dataset.prProva, f); el.value = ''; },
    'prova-bloco': (v) => { if (st?.gab) { st.gab.bloco = Number(v) || 0; st.gab.texto = ''; } P.schedule('simulations'); },
    'prova-gabtxt': (v) => { st.gab = { ...(st.gab || { blocos: [], bloco: 0 }), texto: String(v || '').trim() }; P.schedule('simulations'); },
    'prova-criar': (courseId) => { criar(courseId); }
  };
  const install = () => { const pg = P.pages.simulations; if (pg) Object.assign(pg.actions, actions); };
  install();
  P.provaSim = { panel, montar, html, actions, state: () => st, install, ultimo: null };
})();
