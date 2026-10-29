'use strict';
/* MEUS MAPAS · V15.64–65 · simulado a partir do caderno oficial (PDF) e do gabarito.
   Lê o caderno com o leitor de provas, recorta como imagem as questões com figura, tabela ou fórmula,
   monta o EXAM_DATA do motor V08 (assets/sim/motor-prova-v08.html) e entrega o HTML ao importador de simulados
   do app — o mesmo caminho de um simulado HTML, com resultado por disciplina no formato da banca.
   V15.65: gabarito escaneado (OCR), revisão questão a questão, lote de PDFs, cada questão ligada ao mapa do assunto
   (os erros entram no plano e no caderno de erros) e banco local de questões oficiais para simulados misturados. */
(() => {
  const P = window.Prancha;
  if (!P || P.provaSim) return;
  const U = P.util, ui = P.ui, { esc } = U;
  const R = () => window.MeusMapasProvaReader;
  const MOTOR = 'assets/sim/motor-prova-v08.html';
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  let st = null; /* { aberto, lendo, prova:{arquivo, doc, leitura}, gab:{arquivo, blocos, bloco, texto, ocr}, ajustes:{n:{...}}, lote:[], criando, banco } */
  const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  async function abrirPdf(file) { const lib = await loadCoursePdfJs(); return lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; }
  async function paginasDoc(doc) {
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
      pages.push({ w: vp.width, h: vp.height, lines: window.MeusMapasEditalLayout.layoutLines(tc.items) });
    }
    return pages;
  }
  async function pdfPaginas(file) { const doc = await abrirPdf(file); return { doc, pages: await paginasDoc(doc) }; }
  const semTexto = (pages) => pages.reduce((n, p) => n + p.lines.reduce((m, l) => m + l.text.length, 0), 0) < 40;

  /* ---------- OCR do gabarito escaneado (tesseract.js sob demanda, só quando o PDF não tem texto) ---------- */
  let tessP = null;
  function carregarTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tessP) tessP = new Promise((ok, no) => { const s = document.createElement('script'); s.src = TESS; s.async = true; s.onload = () => (window.Tesseract ? ok(window.Tesseract) : no(new Error('OCR indisponível.'))); s.onerror = () => { tessP = null; no(new Error('Sem conexão para o leitor de imagem (OCR). Digite o gabarito.')); }; document.head.appendChild(s); });
    return tessP;
  }
  async function canvasDe(file, doc) {
    const out = [];
    if (doc) {
      for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
        const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 2.5 }), c = document.createElement('canvas');
        c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        await pg.render({ canvasContext: ctx, viewport: vp }).promise;
        out.push({ c, scale: 2.5 });
      }
    } else {
      const img = await createImageBitmap(file), k = Math.min(2.5, 2400 / Math.max(img.width, 1)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      out.push({ c, scale: k });
    }
    return out;
  }
  /* palavras do OCR → linhas no mesmo formato do layout do PDF (coordenadas em pontos, y para cima) */
  function linhasDoOcr(data, c, scale) {
    const lines = [];
    for (const ln of data.lines || []) {
      const cells = (ln.words || []).map((w) => ({ x: w.bbox.x0 / scale, x2: w.bbox.x1 / scale, s: String(w.text || '').trim() })).filter((x) => x.s).sort((a, b) => a.x - b.x);
      if (!cells.length) continue;
      const y = (c.height - (ln.bbox?.y1 ?? cells[0].y)) / scale;
      lines.push({ y, h: ((ln.bbox?.y1 || 0) - (ln.bbox?.y0 || 0)) / scale || 10, cells, text: cells.map((x) => x.s).join(' ') });
    }
    return { w: c.width / scale, h: c.height / scale, lines: lines.sort((a, b) => b.y - a.y) };
  }
  /* duas leituras (bloco único e colunas) — onde concordam, a resposta vale; onde divergem, fica para conferir */
  async function ocrPaginas(file, doc) {
    const telas = await canvasDe(file, doc);
    const custom = P.provaSim.ocr;
    if (custom) { const pages = []; for (const t of telas) pages.push(linhasDoOcr(await custom(t.c), t.c, t.scale)); return [pages]; }
    const T = await carregarTesseract();
    const w = await T.createWorker('eng');
    try {
      const passes = [];
      for (const psm of ['6', '4']) {
        await w.setParameters({ tessedit_char_whitelist: '0123456789ABCDEXabcdex-–.:()', preserve_interword_spaces: '1', tessedit_pageseg_mode: psm });
        const pages = [];
        for (const t of telas) { const { data } = await w.recognize(t.c); pages.push(linhasDoOcr(data, t.c, t.scale)); }
        passes.push(pages);
      }
      return passes;
    } finally { try { await w.terminate(); } catch {} }
  }
  function juntarOcr(passes) {
    const lidos = passes.map((pg) => R().lerGabarito(pg));
    const base = lidos.reduce((a, b) => (Object.keys(b[0]?.respostas || {}).length > Object.keys(a[0]?.respostas || {}).length ? b : a), []);
    if (!base.length) return [];
    if (lidos.length < 2) return base.map((b) => ({ ...b, duvidas: [] }));
    return base.map((b, i) => {
      const outros = lidos.map((l) => l[i]?.respostas || l[0]?.respostas || {});
      const nums = [...new Set(outros.flatMap((o) => Object.keys(o)))].map(Number).sort((x, y) => x - y), resp = {}, duvidas = [];
      for (const n of nums) { const vs = outros.map((o) => o[n]).filter(Boolean); if (vs.every((v) => v === vs[0])) { resp[n] = vs[0]; if (vs.length < outros.length) duvidas.push(n); } else duvidas.push(n); }
      const max = nums.length ? nums[nums.length - 1] : 0;
      for (let n = 1; n <= max; n++) if (!resp[n] && !duvidas.includes(n)) duvidas.push(n);
      return { ...b, respostas: resp, duvidas: duvidas.sort((x, y) => x - y) };
    });
  }
  async function lerGabaritoArquivo(file) {
    const ehImg = /^image\//.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name || '');
    let doc = null, pages = [];
    if (!ehImg) { doc = await abrirPdf(file); pages = await paginasDoc(doc); }
    let blocos = ehImg ? [] : R().lerGabarito(pages), ocr = false;
    if (!blocos.length && (ehImg || semTexto(pages))) { blocos = juntarOcr(await ocrPaginas(file, doc)); ocr = true; }
    return { blocos, ocr };
  }

  /* ---------- recorte das regiões da questão (coordenadas do PDF) em uma imagem só, empilhada ---------- */
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

  /* ---------- questão → mapa do curso (título, sigla e categoria do mapa contra o enunciado) ---------- */
  const STOP = new Set('assinale alternativa correta correto incorreta incorreto segundo acordo sobre quanto relacao seguir abaixo afirmar afirmativas assertivas analise considere considerando quais estao apenas texto questao respectivamente lacunas preenche sentido trecho seguinte seguintes item itens dessa desse esta este pela pelo para como mais menos entre quando onde qual quais cada todos todas sendo sera seria podem pode deve devem'.split(' '));
  const toks = (s) => norm(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w)).map((w) => w.slice(0, 7));
  function mapaDaQuestao(course, d, texto) {
    if (!course) return null;
    const pe = P.editais.pesoEsforco(course.id), daDisc = d && pe ? pe.rows.find((r) => r.id === d.id)?.mapas || [] : [];
    const todos = P.data.mapsForCourse(course.id, { includeLinked: false });
    const ws = new Set(toks(texto));
    if (!ws.size) return null;
    let best = null;
    for (const m of daDisc.length ? daDisc : todos) {
      const mt = [...new Set(toks([m.title, m.shortTitle, m.short_title, m.category].join(' ')))];
      const hit = mt.filter((w) => ws.has(w)).length;
      const sc = hit / Math.sqrt(Math.max(1, mt.length));
      if (hit && (!best || sc > best.sc)) best = { m, sc, hit };
    }
    return best && (best.hit >= 2 || best.sc >= 0.5) ? best.m : daDisc.length === 1 ? daDisc[0] : null;
  }

  /* ---------- EXAM_DATA do motor V08 a partir da leitura, das respostas e dos ajustes da revisão ---------- */
  async function montar(course, leitura, respostas, { doc, titulo, ajustes = {} } = {}) {
    const m = leitura.meta || {}, prova = course ? P.editais.prova(course.id) : [];
    const cache = new Map(), anuladas = [], banco = [];
    const sections = [];
    let figuras = 0, semResposta = 0, ligadas = 0;
    const ano = ((m.edital || '').match(/(20\d\d|19\d\d)/) || [])[1] || '';
    const code = 'PROVA_' + [slug(m.banca), slug(m.entidade).split('_').slice(0, 3).join('_'), ano, slug(m.cargo).split('_')[0]].filter(Boolean).join('_');
    for (const s of leitura.secoes) {
      const d = prova.length ? P.editais.secaoDisciplina(s.titulo, prova) : null;
      const questions = [];
      for (const q of s.questoes) {
        const aj = ajustes[q.n] || {};
        if (aj.fora) continue;
        const ans = aj.resp || respostas[q.n];
        if (ans === 'X') { anuladas.push(q.n); continue; }
        if (!ans) { semResposta++; continue; }
        const alts = q.alternativas.slice();
        while (alts.length < leitura.alternativas) alts.push('');
        const mapa = mapaDaQuestao(course, d, q.stem + ' ' + alts.join(' '));
        if (mapa) ligadas++;
        const row = {
          number: q.n,
          stem: (anuladas.length ? '<b>[caderno: ' + String(q.n).padStart(2, '0') + ']</b> ' : '') + (q.apoio ? txt(q.apoio) + '<br><br>' : '') + txt(q.stem),
          alternatives: alts.map((a, i) => String.fromCharCode(65 + i) + ') ' + txt(a)),
          answer: q.ce ? (ans === 'C' ? 'A' : ans === 'E' ? 'B' : ans) : ans,
          explanation: 'Gabarito oficial: ' + ans + '.',
          /* o tópico com o título do mapa faz o erro do simulado subir a prioridade desse mapa no plano */
          topic: mapa ? mapa.title : s.titulo, difficulty: 'Oficial', styleTag: '',
          ...(mapa ? { reference: 'Mapa ' + (mapa.code || mapa.title) } : {})
        };
        const fig = aj.figura !== undefined ? aj.figura : q.figura;
        if (fig && doc) { try { row.image = await recorte(doc, q.regioes, cache); if (row.image) { row.imageCaption = 'Fonte: caderno oficial' + (m.entidade ? ' — ' + m.entidade : '') + ', questão ' + q.n + '.'; figuras++; } } catch (e) { console.warn('[prova] recorte', q.n, e); } }
        questions.push(row);
        banco.push({ id: code + '#' + q.n, code, banca: m.banca || '', entidade: m.entidade || '', cargo: m.cargo || '', ano, secao: s.titulo, n: q.n, stem: row.stem, alternatives: row.alternatives, answer: row.answer, image: row.image || '', imageCaption: row.imageCaption || '', intro: s.intro && s.intro.linhas.length ? { titulo: s.intro.titulo || '', linhas: s.intro.linhas } : null, at: new Date().toISOString() });
      }
      if (!questions.length) continue;
      sections.push({ title: s.titulo.toUpperCase(), weight: d?.peso ?? 1, minPoints: d ? P.editais.minPts(d) : 0, expectedCount: questions.length, ...(s.intro && s.intro.linhas.length ? { intro: { title: s.intro.titulo || '', author: 'Texto do caderno oficial', lines: s.intro.linhas.map(txt) } } : {}), questions });
    }
    const total = sections.reduce((n, s) => n + s.questions.length, 0);
    const mg = course ? P.editais.minimoGeral(course.id) : null;
    const exam = {
      meta: { entity: m.entidade || course?.title || 'Caderno oficial', exam: [m.edital, 'caderno oficial'].filter(Boolean).join(' — '), role: m.cargo || course?.subtitle || '', level: '', duration: '4h', code, version: 'CADERNO OFICIAL', date: new Date().toLocaleDateString('pt-BR'), expectedQuestions: total, alternativesCount: leitura.alternativas, scratchSlots: Math.max(60, total), ...(mg ? { minTotalPoints: mg } : {}) },
      instructions: [
        'Questões e alternativas do caderno oficial' + (m.banca ? ' (' + m.banca + ')' : '') + ', com o gabarito ' + (titulo ? '“' + titulo + '”' : 'oficial') + '.',
        total + ' questões' + (leitura.formato === 'certo-errado' ? ' para julgar (A = Certo, B = Errado).' : ', alternativas de A a ' + String.fromCharCode(64 + leitura.alternativas) + '.'),
        'Questões com figura, tabela ou fórmula trazem o recorte do caderno logo abaixo do enunciado.',
        anuladas.length ? 'Anuladas no gabarito e fora deste simulado: ' + anuladas.join(', ') + '. O número do caderno aparece entre colchetes.' : 'Nenhuma questão anulada no gabarito informado.',
        ligadas ? ligadas + ' questões ligadas a mapas do curso: os erros sobem a prioridade desses mapas no plano.' : 'Nenhuma questão ligada a mapa do curso.'
      ],
      sections
    };
    return { exam, total, figuras, anuladas, semResposta, ligadas, banco };
  }
  async function html(exam, board, titulo) {
    const r = await fetch(MOTOR, { cache: 'force-cache' });
    if (!r.ok) throw new Error('Motor do simulado indisponível.');
    const tpl = await r.text(), m = exam.meta, n = exam.meta.expectedQuestions;
    const title = titulo || 'Prova ' + [board, m.entity.split(' — ')[0]].filter(Boolean).join(' · ');
    const meta = [['simulation-title', title], ['simulation-code', m.code], ['simulation-board', board || ''], ['simulation-subtitle', [m.role, m.exam].filter(Boolean).join(' — ')], ['simulation-question-count', String(n)], ['simulation-duration-minutes', '240'], ['simulation-version', m.version || 'Caderno oficial']]
      .map(([k, v]) => '<meta name="' + k + '" content="' + String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '" />').join('\n');
    const json = JSON.stringify(exam).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return { title, html: tpl.replace('<!--MM_META-->', meta).replace('{{TITULO}}', txt(title)).replace('{{MARCA}}', txt((m.version === 'BANCO DE QUESTÕES' ? 'Simulado misturado' : 'Prova oficial') + (board ? ' — ' + board : ''))).replace('/*__EXAM_DATA__*/null', () => json) };
  }

  /* ---------- banco local de questões oficiais (IndexedDB deste aparelho) ---------- */
  const DB = 'meusmapas-banco-questoes';
  function db() { return new Promise((ok, no) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('q', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } }); }
  async function bancoSalvar(rows) { if (!rows.length) return; const d = await db(); await new Promise((ok, no) => { const t = d.transaction('q', 'readwrite'); const s = t.objectStore('q'); rows.forEach((r) => s.put(r)); t.oncomplete = ok; t.onerror = () => no(t.error); }); d.close(); }
  async function bancoTudo() { try { const d = await db(); const rows = await new Promise((ok, no) => { const r = d.transaction('q').objectStore('q').getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => no(r.error); }); d.close(); return rows; } catch { return []; } }
  async function bancoLimpar() { const d = await db(); await new Promise((ok) => { const t = d.transaction('q', 'readwrite'); t.objectStore('q').clear(); t.oncomplete = ok; t.onerror = ok; }); d.close(); }
  async function bancoResumo() { const rows = await bancoTudo(); const provas = new Set(rows.map((r) => r.code)), bancas = [...new Set(rows.map((r) => r.banca).filter(Boolean))].sort(); return { n: rows.length, provas: provas.size, bancas }; }
  function embaralhar(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  /* simulado misturado no formato do concurso: para cada disciplina da prova, questões do banco da mesma disciplina */
  async function misturado(course, banca) {
    const prova = P.editais.prova(course.id);
    if (!prova.length) throw new Error('Cadastre a prova do edital do curso para montar o simulado misturado.');
    let rows = await bancoTudo();
    if (banca) rows = rows.filter((r) => norm(r.banca) === norm(banca));
    const sections = [], faltas = [];
    for (const d of prova) {
      const pool = rows.filter((r) => P.editais.secaoDisciplina(r.secao, prova)?.id === d.id);
      /* questões que dependem de texto vão em bloco do mesmo caderno, com o texto no enunciado da primeira */
      const grupos = new Map();
      for (const r of embaralhar(pool)) { const k = r.intro ? r.code + '|' + r.secao : r.id; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r); }
      const escolha = [];
      for (const g of grupos.values()) { if (escolha.length >= d.questoes) break; g.sort((a, b) => a.n - b.n); escolha.push(...g.slice(0, d.questoes - escolha.length)); }
      if (escolha.length < d.questoes) faltas.push(d.nome + ' (' + escolha.length + ' de ' + d.questoes + ')');
      if (!escolha.length) continue;
      const vistos = new Set();
      const questions = escolha.map((r, i) => {
        const k = r.code + '|' + r.secao, comTexto = r.intro && !vistos.has(k);
        if (r.intro) vistos.add(k);
        return { number: i + 1, stem: '<b>[' + esc(r.banca || 'prova') + (r.ano ? ' ' + r.ano : '') + ' · ' + esc((r.entidade || '').split(' — ')[0].slice(0, 50)) + ', q. ' + r.n + ']</b> ' + r.stem, ...(comTexto ? { body: '<b>' + txt(r.intro.titulo || 'Texto') + '</b><br>' + r.intro.linhas.map(txt).join(' ') } : {}), alternatives: r.alternatives, answer: r.answer, explanation: 'Gabarito oficial: ' + r.answer + '.', topic: d.nome, difficulty: 'Oficial', styleTag: '', ...(r.image ? { image: r.image, imageCaption: r.imageCaption } : {}) };
      });
      sections.push({ title: d.nome.toUpperCase(), weight: d.peso, minPoints: P.editais.minPts(d), expectedCount: questions.length, questions });
    }
    const total = sections.reduce((n, s) => n + s.questions.length, 0);
    if (!total) throw new Error('O banco ainda não tem questões das disciplinas desta prova.');
    const alts = Math.max(...sections.flatMap((s) => s.questions.map((q) => q.alternatives.length)));
    const mg = P.editais.minimoGeral(course.id), quando = new Date();
    const code = 'MISTO_' + slug(P.courses.sigla?.(course) || course.title).slice(0, 16) + '_' + quando.toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const exam = { meta: { entity: course.title, exam: 'Simulado misturado de questões oficiais' + (banca ? ' — ' + banca : ''), role: course.subtitle || '', level: '', duration: '4h', code, version: 'BANCO DE QUESTÕES', date: quando.toLocaleDateString('pt-BR'), expectedQuestions: total, alternativesCount: alts, scratchSlots: Math.max(60, total), ...(mg ? { minTotalPoints: mg } : {}) },
      instructions: ['Questões oficiais de provas anteriores' + (banca ? ' da ' + banca : '') + ', na estrutura da prova do ' + course.title + '.', 'A origem de cada questão aparece entre colchetes; textos de apoio vêm no enunciado da primeira questão do bloco.', faltas.length ? 'Faltaram questões no banco para: ' + faltas.join(', ') + '.' : 'Todas as disciplinas completas.'], sections };
    return { exam, total, faltas, banca };
  }

  /* ---------- painel em Simulados ---------- */
  function respostas() {
    if (!st?.gab) return {};
    if (st.gab.texto) return R().gabaritoDoTexto(st.gab.texto);
    return st.gab.blocos?.[st.gab.bloco]?.respostas || {};
  }
  const ajusteDe = (n) => (st.ajustes ||= {})[n] ||= {};
  function revisao(L, rs) {
    const qs = L.secoes.flatMap((s) => s.questoes.map((q) => ({ ...q, secao: s.titulo })));
    const letras = Array.from({ length: L.alternativas }, (_, i) => String.fromCharCode(65 + i));
    const linha = (q) => {
      const aj = st.ajustes?.[q.n] || {}, r = aj.resp || rs[q.n] || '', fig = aj.figura !== undefined ? aj.figura : q.figura, vazias = q.alternativas.filter((a) => !a).length;
      const duv = st.gab?.ocr && !st.gab.texto && (st.gab.blocos?.[st.gab.bloco]?.duvidas || []).includes(q.n) && !aj.resp;
      const alerta = (q.alternativas.length < L.alternativas || vazias ? '<span class="pr-chip ox">' + q.alternativas.length + ' alt.' + (vazias ? ' · ' + vazias + ' vazia' + (vazias > 1 ? 's' : '') : '') + '</span>' : '') + (duv ? '<span class="pr-chip ox">conferir resposta</span>' : '');
      return '<div class="pr-li pr-rv' + (aj.fora ? ' x' : '') + '"><span class="pr-mono">' + String(q.n).padStart(2, '0') + '</span><span><b>' + esc(q.stem.slice(0, 110)) + (q.stem.length > 110 ? '…' : '') + '</b><span class="t">' + esc(q.secao) + ' · ' + esc((q.alternativas[0] || '').slice(0, 50)) + '</span></span><span class="pr-row pr-rv-c">' + alerta +
        '<select data-pr-change="prova-ajuste" data-n="' + q.n + '" data-campo="resp" aria-label="Resposta da questão ' + q.n + '"><option value="">' + (rs[q.n] ? 'gab. ' + rs[q.n] : '—') + '</option>' + letras.concat(['X']).map((l) => '<option value="' + l + '"' + (aj.resp === l ? ' selected' : '') + '>' + (l === 'X' ? 'anulada' : l) + '</option>').join('') + '</select>' +
        '<label class="pr-check"><input type="checkbox" data-pr-change="prova-ajuste" data-n="' + q.n + '" data-campo="figura"' + (fig ? ' checked' : '') + '> imagem</label>' +
        '<label class="pr-check"><input type="checkbox" data-pr-change="prova-ajuste" data-n="' + q.n + '" data-campo="incluir"' + (aj.fora ? '' : ' checked') + '> incluir</label></span></div>';
    };
    const duvs = st.gab?.ocr && !st.gab.texto ? st.gab.blocos?.[st.gab.bloco]?.duvidas || [] : [];
    const suspeitas = qs.filter((q) => q.alternativas.length < L.alternativas || q.alternativas.some((a) => !a) || !rs[q.n] || (duvs.includes(q.n) && !st.ajustes?.[q.n]?.resp)).length;
    return '<details class="pr-rot pr-rvd"' + (st.revAberta ? ' open' : '') + '><summary>Revisar questão a questão · ' + qs.length + (suspeitas ? ' · ' + suspeitas + ' para conferir' : '') + '</summary><p class="pr-mono">Troque a resposta, ligue o recorte do caderno quando faltar figura ou texto, ou tire do simulado a questão mal lida.</p><div class="pr-list">' + qs.map(linha).join('') + '</div></details>';
  }
  function bancoHtml(course) {
    const b = st.banco;
    if (!b) { bancoResumo().then((x) => { if (st) { st.banco = x; P.schedule('simulations'); } }); return ''; }
    return '<div class="pr-ps pr-banco"><span class="pr-k l">Banco de questões oficiais · neste aparelho</span>' + (b.n ? '<p>' + b.n + ' questões de ' + b.provas + ' prova' + (b.provas > 1 ? 's' : '') + (b.bancas.length ? ' · ' + esc(b.bancas.join(', ')) : '') + '. Cada simulado criado daqui entra no banco.</p><div class="pr-row">' +
      (b.bancas.length > 1 ? '<select data-pr-change="prova-banca" aria-label="Banca do simulado misturado"><option value="">Todas as bancas</option>' + b.bancas.map((x) => '<option' + (st.bancaSel === x ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' : '') +
      ui.btn(st.criando === 'misto' ? 'Montando…' : 'Montar simulado misturado', { ...ui.act('prova-misto', course?.id || ''), disabled: !course || !!st.criando }, 'g sm') + ui.btn('Esvaziar banco', ui.act('prova-banco-limpar'), 'g sm') + '</div>' + (course ? '' : '<p class="pr-mono">Escolha um concurso no filtro acima: o simulado segue a estrutura da prova dele.</p>') : '<p class="pr-mono">Vazio. Ao criar um simulado de uma prova, as questões ficam guardadas aqui para montar simulados misturados no formato do seu concurso.</p>') + '</div>';
  }
  function loteHtml() {
    if (!st.lote?.length) return '';
    const provas = st.lote.filter((x) => x.tipo === 'prova');
    /* cada caderno pode trocar o gabarito pareado: lista todos os blocos de todos os gabaritos do lote */
    const opcoes = st.lote.flatMap((g, gi) => (g.tipo === 'gab' ? g.blocos.map((b, bi) => [gi + ':' + bi, g.arquivo.slice(0, 30) + ' › ' + b.titulo.slice(0, 50) + ' (' + Object.keys(b.respostas).length + ')']) : []));
    const selGab = (x, i) => x.tipo !== 'prova' ? '' : '<select data-pr-change="prova-lote-gab" data-i="' + i + '" aria-label="Gabarito de ' + esc(x.arquivo) + '"><option value="">' + (x.gab ? 'pareado: ' + esc(x.gab.arquivo.slice(0, 30)) : '— sem gabarito') + '</option>' + opcoes.map(([v, l]) => '<option value="' + v + '"' + (x.gabSel === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '<option value="-">— não criar este</option></select>';
    return '<div class="pr-ps"><span class="pr-k l">Lote · ' + st.lote.length + ' arquivos</span><div class="pr-list">' + st.lote.map((x, i) => '<div class="pr-li pr-pv"><span class="pr-mono">' + (x.tipo === 'prova' ? 'PROVA' : x.tipo === 'gab' ? 'GAB.' : '?') + '</span><span><b>' + esc(x.arquivo) + '</b><span class="t">' + esc(x.status || '') + '</span>' + selGab(x, i) + '</span><span class="pr-chip ' + (x.tipo === 'prova' && x.cobertura >= 0.8 ? 'ok' : x.tipo === 'gab' ? '' : 'ox') + '">' + (x.tipo === 'prova' ? Math.round((x.cobertura || 0) * 100) + '% no gabarito' : x.tipo === 'gab' ? (x.blocos?.length || 0) + ' bloco(s)' : 'não lido') + '</span></div>').join('') + '</div>' +
      '<div class="pr-row" style="margin-top:8px">' + ui.btn(st.criando === 'lote' ? 'Montando…' : 'Criar ' + provas.filter((x) => x.cobertura >= 0.5).length + ' simulado(s)', { ...ui.act('prova-lote-criar'), disabled: !!st.criando || !provas.some((x) => x.cobertura >= 0.5) }, 'p') + ui.btn('Limpar lote', ui.act('prova-lote-limpar'), 'g sm') + '</div></div>';
  }
  function panel(course) {
    if (!st?.aberto) return '';
    const L = st.prova?.leitura, rs0 = respostas(), rs = { ...rs0 };
    for (const [n, aj] of Object.entries(st.ajustes || {})) if (aj.resp) rs[n] = aj.resp;
    const nums = L ? L.secoes.flatMap((s) => s.questoes.map((q) => q.n)).filter((n) => !st.ajustes?.[n]?.fora) : [];
    const cobertas = nums.filter((n) => rs[n]).length, prova = course ? P.editais.prova(course.id) : [];
    const head = ui.head('Simulado a partir da prova', 'Caderno oficial em PDF + gabarito → simulado interativo', ui.btn('Vários PDFs ou .zip', ui.act('prova-pick', 'lote'), 'g sm') + '<input type="file" accept="application/pdf,.pdf,image/*,.zip,application/zip" multiple hidden data-pr-change="prova-lote" data-pr-prova="lote">' + ui.btn('Fechar', ui.act('prova-fechar'), 'g sm'));
    const passo1 = '<div class="pr-ps"><span class="pr-k l">1 · Caderno de questões</span>' + (st.lendo === 'prova' ? '<p class="pr-mono">Lendo o caderno…</p>' : L ? '<p><b>' + esc(st.prova.arquivo) + '</b> · ' + L.questoes + ' questões' + (L.meta.banca ? ' · ' + esc(L.meta.banca) : '') + (L.meta.entidade ? ' · ' + esc(L.meta.entidade) : '') + '</p>' : '<p class="pr-mono">PDF com texto selecionável (não escaneado).</p>') +
      '<div class="pr-row">' + ui.btn(L ? 'Trocar caderno' : 'Escolher o PDF da prova', ui.act('prova-pick', 'prova'), L ? 'g sm' : 'p') + '<input type="file" accept="application/pdf,.pdf" hidden data-pr-change="prova-file" data-pr-prova="prova"></div></div>';
    const blocos = st.gab?.blocos || [];
    const passo2 = '<div class="pr-ps"><span class="pr-k l">2 · Gabarito</span>' + (st.lendo === 'gab' ? '<p class="pr-mono">Lendo o gabarito…' + (st.lendoOcr ? ' (imagem: reconhecendo letras, pode levar alguns segundos)' : '') + '</p>' : '') +
      (blocos.length > 1 ? '<label class="pr-field"><span>Qual gabarito do arquivo</span><select data-pr-change="prova-bloco">' + blocos.map((b, i) => '<option value="' + i + '"' + (i === st.gab.bloco ? ' selected' : '') + '>' + esc(b.titulo.slice(0, 90)) + ' · ' + Object.keys(b.respostas).length + '</option>').join('') + '</select></label>' : blocos.length === 1 ? '<p><b>' + esc(st.gab.arquivo || '') + '</b> · ' + Object.keys(blocos[0].respostas).length + ' respostas' + (st.gab.ocr ? ' · lido da imagem' + (blocos[0].duvidas?.length ? ': ' + blocos[0].duvidas.length + ' para conferir na revisão (' + blocos[0].duvidas.slice(0, 12).join(', ') + (blocos[0].duvidas.length > 12 ? '…' : '') + ')' : ', confira na revisão') : '') + '</p>' : '') +
      (L?.marcadas && !blocos.length && !st.gab?.texto ? '<p class="pr-tec-av">Este caderno já vem com uma alternativa marcada em cada questão (' + Object.keys(L.marcadas).length + '). Se forem as respostas oficiais, use como gabarito. ' + ui.btn('Usar as marcadas', ui.act('prova-marcadas'), 'g sm') + '</p>' : '') +
      '<div class="pr-row">' + ui.btn(blocos.length ? 'Trocar gabarito' : 'Gabarito (PDF ou foto)', ui.act('prova-pick', 'gab'), 'g sm') + '<input type="file" accept="application/pdf,.pdf,image/*" hidden data-pr-change="prova-file" data-pr-prova="gab"></div>' +
      '<label class="pr-field"><span>Ou digite o gabarito (ex.: CEADB… ou 1-C 2-E; X = anulada)</span><textarea rows="2" data-pr-change="prova-gabtxt" placeholder="CEADBCADEA…">' + esc(st.gab?.texto || '') + '</textarea></label></div>';
    let resumo = '';
    if (L && L.questoes) {
      const fig = L.secoes.reduce((n, s) => n + s.questoes.filter((q) => (st.ajustes?.[q.n]?.figura ?? q.figura)).length, 0), anul = nums.filter((n) => rs[n] === 'X').length;
      resumo = '<div class="pr-ps"><span class="pr-k l">3 · Conferência</span><div class="pr-list">' + L.secoes.map((s) => { const d = prova.length ? P.editais.secaoDisciplina(s.titulo, prova) : null; const qs = s.questoes.filter((q) => !st.ajustes?.[q.n]?.fora), ok = qs.filter((q) => rs[q.n]).length; return '<div class="pr-li pr-pv"><span class="pr-mono">' + qs.length + '</span><span><b>' + esc(s.titulo) + '</b><span class="t">questões ' + s.questoes[0].n + '–' + s.questoes[s.questoes.length - 1].n + (s.intro ? ' · com texto de apoio' : '') + (d ? ' · conta como ' + esc(d.nome) + ' (peso ' + P.editais.fmtPt(d.peso) + ')' : '') + '</span></span><span class="pr-chip ' + (ok === qs.length ? 'ok' : 'ox') + '">' + ok + '/' + qs.length + ' no gabarito</span></div>'; }).join('') + '</div>' +
        '<p class="pr-mono">' + cobertas + ' de ' + nums.length + ' questões com resposta' + (anul ? ' · ' + anul + ' anulada' + (anul > 1 ? 's' : '') + ' (fica de fora)' : '') + ' · ' + fig + ' com figura, tabela ou fórmula (vão como imagem do caderno)' + (L.formato === 'certo-errado' ? ' · itens Certo/Errado' : '') + '</p>' +
        (L.avisos.length ? '<details class="pr-rot"><summary>' + L.avisos.length + ' aviso' + (L.avisos.length > 1 ? 's' : '') + ' da leitura</summary><ul class="pr-mono">' + L.avisos.slice(0, 20).map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul></details>' : '') +
        revisao(L, rs0) +
        '<div class="pr-row" style="margin-top:10px">' + ui.btn(st.criando === 'um' ? 'Montando…' : 'Criar simulado interativo', { ...ui.act('prova-criar', course?.id || ''), disabled: !!st.criando || cobertas < nums.length * 0.5 }, 'p') + '<span class="pr-mono">Abre o importador com o arquivo pronto: confira o concurso e salve.</span></div></div>';
    } else if (L) resumo = '<div class="pr-ps">' + ui.empty('Nenhuma questão encontrada', L.avisos[0] || 'O leitor não achou questões numeradas com alternativas neste PDF.') + '</div>';
    return ui.card(head + '<div class="pr-pgrid">' + passo1 + passo2 + '</div>' + resumo + loteHtml() + bancoHtml(course));
  }
  function fimLeitura() { st.lendo = ''; st.lendoOcr = false; if (document.activeElement?.matches?.('input[type="file"]')) document.activeElement.blur(); P.schedule('simulations'); }
  async function lerArquivo(kind, file) {
    st.lendo = kind; P.schedule('simulations');
    try {
      if (kind === 'prova') {
        const { doc, pages } = await pdfPaginas(file);
        st.prova = { arquivo: file.name, doc, leitura: R().lerProva(pages) }; st.ajustes = {};
        if (st.gab?.blocos?.length) st.gab.bloco = Math.max(0, R().escolherBloco(st.gab.blocos, st.prova.leitura.meta, st.prova.leitura.questoes));
      } else {
        st.lendoOcr = /^image\//.test(file.type); P.schedule('simulations');
        const { blocos, ocr } = await lerGabaritoArquivo(file);
        if (!blocos.length) throw new Error(ocr ? 'Não consegui ler as respostas da imagem. Digite o gabarito no campo ao lado.' : 'Não achei respostas neste PDF. Digite o gabarito no campo ao lado.');
        st.gab = { arquivo: file.name, blocos, ocr, bloco: Math.max(0, R().escolherBloco(blocos, st.prova?.leitura?.meta, st.prova?.leitura?.questoes)), texto: '' };
      }
    } catch (e) { console.warn('[prova]', e); if (typeof toast === 'function') toast(e?.message || 'Não foi possível ler o arquivo.'); }
    fimLeitura();
  }
  /* lote: cada PDF é lido; quem tem questões é caderno, quem tem só respostas é gabarito; cada caderno fica com o
     bloco de gabarito que mais combina (cargo, tipo, número de questões e nome do arquivo) */
  const nomeToks = (s) => new Set(norm(s).replace(/\.[a-z]+$/, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/^(prova|gabarito|caderno|preliminar|definitivo|questoes|tipo)$/.test(w)));
  function parearLote() {
    const gabs = st.lote.filter((x) => x.tipo === 'gab'), df = new Map(), lidos = st.lote.filter((x) => x.cab);
    for (const x of lidos) for (const w of R().tokensCab(x.cab)) df.set(w, (df.get(w) || 0) + 1);
    for (const p of st.lote.filter((x) => x.tipo === 'prova' && !x.gabSel)) {
      let best = null;
      for (const g of gabs) {
        const nt = nomeToks(g.arquivo), pt = nomeToks(p.arquivo), comum = [...pt].filter((w) => nt.has(w)).length;
        const i = R().escolherBloco(g.blocos, p.leitura.meta, p.leitura.questoes), b = g.blocos[i];
        const nums = p.leitura.secoes.flatMap((s) => s.questoes.map((q) => q.n)), cob = nums.filter((n) => b.respostas[n]).length / Math.max(1, nums.length);
        /* o que mais pesa: o mesmo concurso (cidade/órgão/edital em comum nos cabeçalhos); depois cargo, nome do arquivo e cobertura */
        const af = Math.min(6, R().afinidade(p.cab || '', g.cab || '', df, lidos.length)), exato = Object.keys(b.respostas).length === nums.length ? 1 : 0;
        /* com vários gabaritos no lote, sem nada em comum (órgão, cidade, edital, nome do arquivo) não pareia */
        if (gabs.length > 1 && !af && !comum) continue;
        const sc = af * 3 + comum * 2 + cob * 3 + exato + (norm(b.titulo).includes(norm(p.leitura.meta.cargo).split(' ').filter((w) => w.length > 4).pop() || '#') ? 2 : 0);
        if (!best || sc > best.sc) best = { sc, g, i, cob };
      }
      if ((!best || best.cob < 0.5) && p.leitura.marcadas) best = { g: { arquivo: 'respostas marcadas no caderno', blocos: [{ titulo: 'marcadas no caderno', respostas: p.leitura.marcadas }] }, i: 0, cob: 1 };
      p.gab = best ? { arquivo: best.g.arquivo, blocos: best.g.blocos, bloco: best.i } : null; p.cobertura = best?.cob || 0;
      p.status = p.leitura.questoes + ' questões' + (p.leitura.meta.banca ? ' · ' + p.leitura.meta.banca : '') + (best ? ' · gabarito: ' + best.g.arquivo + ' › ' + best.g.blocos[best.i].titulo.slice(0, 60) : ' · sem gabarito no lote');
    }
  }
  /* .zip com cadernos e gabaritos: os PDFs e imagens de dentro entram no lote (pastas e outros arquivos são ignorados) */
  async function expandirZips(files) {
    const out = [];
    for (const f of files) {
      if (!/\.zip$/i.test(f.name || '') && f.type !== 'application/zip' && f.type !== 'application/x-zip-compressed') { out.push(f); continue; }
      const z = await window.MeusMapasTec.unzip(new Uint8Array(await f.arrayBuffer()));
      for (const n of z.names) {
        if (/\/$|__MACOSX|(^|\/)\./.test(n) || !/\.(pdf|png|jpe?g|webp)$/i.test(n)) continue;
        const b = await z.bytes(n), nome = n.split('/').pop(), tipo = /\.pdf$/i.test(nome) ? 'application/pdf' : /\.png$/i.test(nome) ? 'image/png' : /\.webp$/i.test(nome) ? 'image/webp' : 'image/jpeg';
        out.push(new File([b], nome, { type: tipo }));
      }
    }
    return out;
  }
  async function lerLote(files0) {
    st.lote = st.lote || []; st.lendo = 'lote'; P.schedule('simulations');
    let files = files0;
    try { files = await expandirZips(files0); } catch (e) { console.warn('[prova] zip', e); if (typeof toast === 'function') toast('Não consegui abrir o .zip: ' + (e?.message || e)); }
    for (const f of files) {
      const row = { arquivo: f.name, tipo: '', status: 'lendo…' };
      st.lote.push(row); P.schedule('simulations');
      try {
        const ehImg = /^image\//.test(f.type);
        if (!ehImg) {
          const { doc, pages } = await pdfPaginas(f), L = R().lerProva(pages);
          const bl = R().lerGabarito(pages);
          /* caderno de verdade: muitas questões com alternativas; arquivo de gabaritos de vários cargos pode “parecer” ter algumas */
          if (L.questoes >= 5 && !(bl.length >= 3 && L.questoes < 20)) { Object.assign(row, { tipo: 'prova', doc, leitura: L, cab: R().cabecalho(pages) }); continue; }
          if (bl.length) { Object.assign(row, { tipo: 'gab', blocos: bl, cab: R().cabecalho(pages), status: bl.map((b) => b.titulo).slice(0, 3).join(' · ') }); continue; }
        }
        const { blocos, ocr } = await lerGabaritoArquivo(f);
        if (blocos.length) Object.assign(row, { tipo: 'gab', blocos, status: (ocr ? 'lido da imagem · ' : '') + blocos.map((b) => b.titulo).slice(0, 3).join(' · ') });
        else row.status = 'nem caderno com questões nem gabarito legível';
      } catch (e) { console.warn('[prova] lote', f.name, e); row.status = 'erro ao ler: ' + (e?.message || e); }
    }
    parearLote(); fimLeitura();
  }
  async function entregar(files, courseId, msg) {
    if (typeof openSimulationImportDialog === 'function' && typeof prepareSimulationImportFiles === 'function') {
      openSimulationImportDialog();
      const sel = document.getElementById('simulationImportCourse');
      if (sel && courseId) sel.value = courseId;
      await prepareSimulationImportFiles(files);
      if (typeof toast === 'function') toast(msg);
    }
  }
  async function criar(courseId) {
    if (!st?.prova?.leitura || st.criando) return;
    st.criando = 'um'; P.schedule('simulations');
    try {
      const course = courseId ? P.courses.byId(courseId) : null, L = st.prova.leitura;
      const titulo = st.gab?.texto ? 'digitado' : st.gab?.blocos?.[st.gab.bloco]?.titulo || '';
      const r = await montar(course, L, respostas(), { doc: st.prova.doc, titulo, ajustes: st.ajustes || {} });
      if (!r.total) throw new Error('Nenhuma questão com resposta no gabarito.');
      const out = await html(r.exam, L.meta.banca);
      const file = new File([out.html], r.exam.meta.code + '.html', { type: 'text/html' });
      P.provaSim.ultimo = { file, ...r };
      try { await bancoSalvar(r.banco); st.banco = null; } catch (e) { console.warn('[prova] banco', e); }
      await entregar([file], courseId, 'Simulado montado: ' + r.total + ' questões' + (r.figuras ? ', ' + r.figuras + ' com imagem do caderno' : '') + (r.ligadas ? ', ' + r.ligadas + ' ligadas a mapas' : '') + '. Confira e salve.');
    } catch (e) { console.warn('[prova]', e); if (typeof toast === 'function') toast(e?.message || 'Não foi possível montar o simulado.'); }
    st.criando = false; P.schedule('simulations');
  }
  async function criarLote(courseId) {
    if (st.criando) return;
    st.criando = 'lote'; P.schedule('simulations');
    try {
      const course = courseId ? P.courses.byId(courseId) : null, files = [], ult = [];
      for (const p of st.lote.filter((x) => x.tipo === 'prova' && x.cobertura >= 0.5)) {
        const b = p.gab.blocos[p.gab.bloco];
        const r = await montar(course, p.leitura, b.respostas, { doc: p.doc, titulo: b.titulo });
        if (!r.total) continue;
        const out = await html(r.exam, p.leitura.meta.banca);
        files.push(new File([out.html], r.exam.meta.code + '.html', { type: 'text/html' })); ult.push(r);
        try { await bancoSalvar(r.banco); } catch (e) { console.warn('[prova] banco', e); }
      }
      st.banco = null;
      if (!files.length) throw new Error('Nenhum caderno do lote tem gabarito suficiente.');
      P.provaSim.ultimoLote = { files, resultados: ult };
      await entregar(files, courseId, files.length + ' simulados montados. Confira e salve.');
    } catch (e) { console.warn('[prova] lote', e); if (typeof toast === 'function') toast(e?.message || 'Não foi possível montar o lote.'); }
    st.criando = false; P.schedule('simulations');
  }
  async function criarMisto(courseId) {
    if (st.criando) return;
    const course = courseId ? P.courses.byId(courseId) : null;
    if (!course) return;
    st.criando = 'misto'; P.schedule('simulations');
    try {
      const r = await misturado(course, st.bancaSel || '');
      const out = await html(r.exam, r.banca || 'Questões oficiais', 'Misturado · ' + (P.courses.sigla?.(course) || course.title) + ' · ' + r.exam.meta.date);
      const file = new File([out.html], r.exam.meta.code + '.html', { type: 'text/html' });
      P.provaSim.ultimoMisto = { file, ...r };
      await entregar([file], courseId, 'Simulado misturado: ' + r.total + ' questões oficiais' + (r.faltas.length ? ' (faltaram em ' + r.faltas.length + ' disciplina' + (r.faltas.length > 1 ? 's' : '') + ')' : '') + '.');
    } catch (e) { console.warn('[prova] misto', e); if (typeof toast === 'function') toast(e?.message || 'Não foi possível montar o simulado misturado.'); }
    st.criando = false; P.schedule('simulations');
  }
  const actions = {
    'prova-abrir': () => { st = st || { aberto: true }; st.aberto = true; P.schedule('simulations'); window.scrollTo({ top: 0 }); },
    'prova-fechar': () => { if (st) st.aberto = false; P.schedule('simulations'); },
    'prova-pick': (kind, el, root) => root.querySelector('[data-pr-prova="' + kind + '"]')?.click(),
    'prova-file': (v, el) => { const f = el.files?.[0]; if (f) lerArquivo(el.dataset.prProva, f); el.value = ''; },
    'prova-lote': (v, el) => { const fs = [...(el.files || [])]; el.value = ''; if (fs.length) lerLote(fs); },
    'prova-lote-limpar': () => { st.lote = []; P.schedule('simulations'); },
    'prova-lote-gab': (v, el) => {
      const p = st.lote[Number(el.dataset.i)];
      if (!p) return;
      p.gabSel = v;
      if (v === '-') { p.gab = null; p.cobertura = 0; }
      else if (v) { const [gi, bi] = v.split(':').map(Number), g = st.lote[gi], b = g?.blocos?.[bi]; if (b) { const nums = p.leitura.secoes.flatMap((s) => s.questoes.map((q) => q.n)); p.gab = { arquivo: g.arquivo, blocos: g.blocos, bloco: bi }; p.cobertura = nums.filter((n) => b.respostas[n]).length / Math.max(1, nums.length); p.status = p.leitura.questoes + ' questões · gabarito escolhido: ' + g.arquivo + ' › ' + b.titulo.slice(0, 60); } }
      else parearLote();
      el.blur?.(); P.schedule('simulations');
    },
    'prova-lote-criar': () => { criarLote(state.simulationCourseFilter || ''); },
    'prova-bloco': (v, el) => { if (st?.gab) { st.gab.bloco = Number(v) || 0; st.gab.texto = ''; } el?.blur?.(); P.schedule('simulations'); },
    'prova-gabtxt': (v) => { st.gab = { ...(st.gab || { blocos: [], bloco: 0 }), texto: String(v || '').trim() }; P.schedule('simulations'); },
    'prova-ajuste': (v, el) => { const aj = ajusteDe(Number(el.dataset.n)), c = el.dataset.campo; if (c === 'resp') { if (v) aj.resp = v; else delete aj.resp; } else if (c === 'figura') aj.figura = !!el.checked; else if (c === 'incluir') aj.fora = !el.checked; st.revAberta = true; el.blur?.(); P.schedule('simulations'); },
    'prova-marcadas': () => { const m = st?.prova?.leitura?.marcadas; if (m) st.gab = { arquivo: 'respostas marcadas no caderno', blocos: [{ titulo: 'marcadas no caderno', respostas: m }], bloco: 0, texto: '' }; P.schedule('simulations'); },
    'prova-criar': (courseId) => { criar(courseId); },
    'prova-misto': (courseId) => { criarMisto(courseId); },
    'prova-banca': (v) => { st.bancaSel = v; },
    'prova-banco-limpar': (a, el) => P.armed ? P.armed(el, async () => { await bancoLimpar(); st.banco = null; P.schedule('simulations'); }, 'Toque de novo para esvaziar') : bancoLimpar().then(() => { st.banco = null; P.schedule('simulations'); })
  };
  const install = () => { const pg = P.pages.simulations; if (pg) Object.assign(pg.actions, actions); };
  install();
  P.provaSim = { panel, montar, html, misturado, actions, state: () => st, install, banco: { tudo: bancoTudo, limpar: bancoLimpar, salvar: bancoSalvar, resumo: bancoResumo }, ocr: null, linhasDoOcr, ultimo: null };
})();
