'use strict';
/* MEUS MAPAS · V15.64 · leitor do caderno de prova (PDF com texto) e do gabarito.
   Entrada: páginas como { w, h, lines } — lines saídas de MeusMapasEditalLayout.layoutLines (texto com posição).
   Saída: seções (cabeçalhos de disciplina do caderno), textos de apoio, questões com enunciado e alternativas,
   e as regiões de cada questão na página (para recortar figuras, tabelas e fórmulas como imagem).
   Funções puras: rodam no navegador e nos testes em Node. */
(function (root) {
  const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const DISC = /^(l[ií]ngua portuguesa|portugu[eê]s|matem[aá]tica|racioc[ií]nio|inform[aá]tica|no[cç][oõ]es de inform|legisla[cç][aã]o|conhecimentos (gerais|espec[ií]ficos|b[aá]sicos|pedag)|atualidades|realidade|hist[oó]ria|geografia|direito|[eé]tica|estatuto|l[ií]ngua (inglesa|espanhola)|ingl[eê]s|espanhol|administra[cç][aã]o p|parte (i|ii|iii|1|2|3)\b|m[oó]dulo|bloco)/i;
  const ALT = /^\(?([A-Ea-e])\)\s*(.*)$/;
  const QNUM = /^(?:QUEST[ÃA]O\s*(?:N[ºo°.]\s*)?)?0*(\d{1,3})(\s*[.)\-–—:]\s*|\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ“"(])|$)(.*)$/i;
  const MATH = /[\u{1D400}-\u{1D7FF}∑√∫≤≥≠±×÷πΔ]/u;
  const FIG = /\b(figura|imagem|ilustra|tabela|quadro|gr[aá]fico|esquema|desenho|planta (baixa|de)|corte|fachada|observe|a seguir representad|abaixo representad|croqui|perspectiva)\b/i;

  /* ---------- cabeçalhos e rodapés repetidos ---------- */
  function repetidos(pages) {
    const cnt = new Map();
    for (const p of pages) {
      const seen = new Set();
      for (const l of p.lines || []) { if (l.y < p.h - 70 && l.y > 60) continue; const k = norm(l.text).replace(/\d+/g, '#'); if (!seen.has(k)) { seen.add(k); cnt.set(k, (cnt.get(k) || 0) + 1); } }
    }
    const min = Math.max(2, Math.ceil(pages.length * 0.4));
    return new Set([...cnt.entries()].filter(([, n]) => n >= min).map(([k]) => k));
  }
  /* ---------- divisão em colunas: a faixa vertical perto do meio menos coberta por texto ---------- */
  function divisa(p) {
    const w = p.w || 595, lo = Math.round(w * 0.38), hi = Math.round(w * 0.62), cov = new Array(hi - lo + 1).fill(0);
    let n = 0;
    for (const l of p.lines) { if (l.cells.length === 1 && l.cells[0].x2 - l.cells[0].x < w * 0.15) continue; n++; for (const c of l.cells) for (let x = Math.max(lo, Math.floor(c.x)); x <= Math.min(hi, Math.ceil(c.x2)); x++) cov[x - lo]++; }
    if (n < 8) return null;
    /* faixas quase vazias (≤ 8% das linhas); fica a mais perto do meio da página */
    let best = null;
    for (let i = 0; i < cov.length; i++) if (cov[i] <= n * 0.08 && (best === null || Math.abs(i + lo - w / 2) < Math.abs(best + lo - w / 2))) best = i;
    if (best === null) return null;
    /* com duas colunas de verdade, a faixa do meio fica quase vazia e há texto dos dois lados */
    const x = best + lo, left = p.lines.filter((l) => l.cells.some((c) => c.x2 < x)).length, right = p.lines.filter((l) => l.cells.some((c) => c.x > x)).length;
    return cov[best] <= n * 0.08 && left > 6 && right > 6 ? x : null;
  }
  /* ---------- páginas → fluxo de leitura (coluna da esquerda, depois a da direita) ---------- */
  function fluxo(pages) {
    const rep = repetidos(pages), out = [];
    pages.forEach((p, pi) => {
      const mid = divisa(p), L = [], R = [];
      const push = (col, l, cells) => { if (!cells.length) return; const text = cells.map((c) => c.s).join(' ').replace(/\s+/g, ' ').trim(); if (!text) return; let gap = 0; for (let i = 1; i < cells.length; i++) gap = Math.max(gap, cells[i].x - cells[i - 1].x2); (col === 0 ? L : col === 1 ? R : out).push({ p: pi, col, y: l.y, h: l.h, x: cells[0].x, x2: cells[cells.length - 1].x2, n: cells.length, gap, text }); };
      const flush = () => { out.push(...L.splice(0), ...R.splice(0)); };
      for (const l of p.lines) {
        const k = norm(l.text).replace(/\d+/g, '#');
        if ((l.y > p.h - 70 || l.y < 60) && (rep.has(k) && /[a-z]{3}/.test(k) || /^(p[aá]gina|pag\.?)\s*#|tipo #+\s*[–-]\s*p[aá]gina/.test(k)) || (l.y < 50 && /^#+$/.test(k))) continue;
        if (mid === null) { push(-1, l, l.cells); continue; }
        const cross = l.cells.some((c) => c.x < mid - 4 && c.x2 > mid + 4);
        if (cross) { flush(); push(-1, l, l.cells); continue; }
        push(0, l, l.cells.filter((c) => c.x2 <= mid + 4));
        push(1, l, l.cells.filter((c) => c.x >= mid - 4));
      }
      flush();
      out.push({ p: pi, quebra: true });
    });
    return out;
  }
  const colBounds = (pages, pi, col) => { const p = pages[pi], mid = divisa(p) ?? p.w / 2; return col === 0 ? [18, mid - 2] : col === 1 ? [mid + 2, p.w - 18] : [18, p.w - 18]; };

  /* ---------- leitura do caderno ---------- */
  function lerProva(pages, opts = {}) {
    pages = (pages || []).filter((p) => p && Array.isArray(p.lines));
    const avisos = [];
    if (!pages.length) return { secoes: [], questoes: 0, avisos: ['O PDF não tem páginas legíveis.'] };
    const texto = pages.map((p) => p.lines.map((l) => l.text).join('\n'));
    if (texto.join('').replace(/\s/g, '').length < 400) return { secoes: [], questoes: 0, avisos: ['O PDF parece ser imagem (escaneado): não há texto para ler. Use um caderno com texto selecionável.'] };
    const meta = metaDe(texto);
    /* começa na primeira página com alternativas; a capa fica de fora */
    const temAlt = (t) => /^\s*\(?[A]\)\s+\S/m.test(t), capa = (t) => /caderno|inscri[cç][aã]o|instru[cç][oõ]es|candidato/i.test(t) && !temAlt(t);
    const primAlt = Math.max(0, texto.findIndex(temAlt));
    const ini = primAlt > 1 && !capa(texto[primAlt - 1]) ? primAlt - 1 : primAlt;
    const stream0 = fluxo(pages).filter((e) => e.p >= ini), stream = [];
    /* “QUESTÃO” e o número às vezes saem em linhas separadas (corpos de letra diferentes) */
    for (let i = 0; i < stream0.length; i++) {
      const e = stream0[i], nx = stream0[i + 1];
      if (!e.quebra && /^QUEST[ÃA]O$/i.test(e.text.trim()) && nx && !nx.quebra && nx.p === e.p && nx.col === e.col && Math.abs(nx.y - e.y) < e.h * 1.2 && /^\d{1,3}\b/.test(nx.text)) { stream.push({ ...e, text: 'QUESTÃO ' + nx.text, y: Math.min(e.y, nx.y) }); i++; continue; }
      stream.push(e);
    }
    const bodyH = median(stream.filter((e) => !e.quebra).map((e) => e.h)) || 10;
    /* FUNDATEC e outras numeram “QUESTÃO 01 –”: aí só esse rótulo abre questão (as linhas numeradas do texto não) */
    const soQuestao = stream.filter((e) => !e.quebra && /^QUEST[ÃA]O\s*(N[ºo°.]\s*)?\d{1,3}/i.test(e.text)).length >= 3;
    const secoes = [];
    let sec = null, q = null, alt = -1, lastN = 0, pend = [], prev = null, colStart = new Map();
    const novaSecao = (titulo) => { sec = { titulo, intro: null, questoes: [] }; secoes.push(sec); };
    const reg = (qq, e) => { const k = e.p + ':' + e.col; let r = qq.regioes.find((x) => x.k === k); if (!r) { const [x0, x1] = colBounds(pages, e.p, e.col); r = { k, page: e.p, col: e.col, x0, x1, top: e.y + e.h, bot: e.y }; qq.regioes.push(r); } r.top = Math.max(r.top, e.y + e.h * 1.6); r.bot = Math.min(r.bot, e.y - e.h * 0.35); };
    const fechar = () => { q = null; alt = -1; };
    for (const e of stream) {
      if (e.quebra) { prev = null; continue; }
      const t = e.text.trim(), ck = e.p + ':' + e.col;
      if (!colStart.has(ck)) colStart.set(ck, Math.min(...stream.filter((x) => !x.quebra && x.p === e.p && x.col === e.col).map((x) => x.x)));
      const left = colStart.get(ck), atLeft = e.x <= left + 14;
      const primeiroDaColuna = !prev || prev.p !== e.p || prev.col !== e.col;
      /* cabeçalho de disciplina */
      const tt = /^(\S ){3,}\S$/.test(t) ? segmentar(t.replace(/ /g, '')) : t;
      const grande = e.h >= bodyH * 1.18, palavras = tt.split(/\s+/), fimSolto = /^(de|da|do|das|dos|a|o|e|em|no|na|que|para|com|ou|se|ao|à|um|uma|por|as|os)$/i.test(palavras[palavras.length - 1] || '');
      const curto = tt.length <= 70 && palavras.length <= 9 && !fimSolto && !/[.;:?,]$/.test(tt) && /[a-zà-ú]{3}/i.test(tt) && /^[A-ZÀ-Ú]/.test(tt);
      const ehDisc = DISC.test(tt);
      const titulo = grande && e.h >= bodyH * 1.25 && tt.length <= 70 && !QNUM.test(t) && !ALT.test(t) && /[a-zà-ú]{3}/i.test(tt) && !/[.;:?,!]$/.test(tt) && !/,/.test(tt) &&
        (ehDisc || (prev?.titulo && /^[A-ZÀ-Úa-zà-ú]/.test(tt)) || (/^[A-ZÀ-Ú]/.test(tt) && palavras.length <= 6 && !fimSolto));
      const continuacao = q && alt >= 0 && !grande && e.x - left > q.alts[alt].ind + 3 && e.x - left < q.alts[alt].ind + 45 && (q.alts[alt].ck === ck || !(e.n === 1 && tt.length < 45));
      /* título em várias linhas (“História e Aspectos / Geoeconômicos do Estado…”): junta ao cabeçalho recém-aberto */
      if (titulo && prev && prev.titulo && sec && !sec.questoes.length && prev.p === e.p && prev.y - e.y <= e.h * 2) { sec.titulo += ' ' + tt; e.titulo = true; prev = e; continue; }
      if (titulo || (curto && (!continuacao || /[.?!)”"]$/.test(prev?.text || '')) && !ALT.test(t) && ehDisc && (!q || alt >= 1) && (e.n === 1 || grande))) {
        if (q && alt < 1 && !grande) { /* parte do enunciado */ } else { fechar(); if (pend.length && sec && !sec.questoes.length) { sec.intro = sec.intro || mkIntro(pend); } pend = []; novaSecao(tt.replace(/\s+/g, ' ')); e.titulo = true; prev = e; continue; }
      }
      /* início de questão: o próximo número, rente à margem da coluna */
      const m = QNUM.exec(t);
      if (m && atLeft && (!soQuestao || /^QUEST/i.test(t))) {
        const n = +m[1], sep = (m[2] || '').trim(), resto = m[3] || '';
        const ok = (n === lastN + 1 || (lastN === 0 && n <= 3)) && !(resto && /^\d/.test(resto) && !/[.)\-–—:]/.test(sep)) && (resto === '' || !ALT.test(resto));
        if (ok) {
          if (!sec) novaSecao('Prova');
          q = { n, stem: [], alts: [], apoio: null, regioes: [], linhas: 0, gaps: 0, celulas: 0, secao: sec.titulo };
          if (pend.length) { if (!sec.questoes.length && !sec.intro) sec.intro = mkIntro(pend); else q.apoio = pend.map((x) => x.text); pend = []; }
          if (resto) q.stem.push(resto);
          sec.questoes.push(q); lastN = n; alt = -1; reg(q, e); prev = e; continue;
        }
      }
      if (q) {
        const a = ALT.exec(t), want = String.fromCharCode(65 + alt + 1);
        if (a && a[1].toUpperCase() === want && (alt >= 0 || q.stem.length)) { alt++; q.alts.push({ x: e.x, ind: e.x - left, ck, s: [a[2]] }); reg(q, e); q.linhas++; if (e.gap > e.h * 3) q.celulas++; prev = e; continue; }
        const gap = prev && !primeiroDaColuna ? prev.y - e.y : 0;
        if (gap > Math.max(e.h, prev?.h || 0) * 3.6) q.gaps++;
        if (alt < 0) { q.stem.push(t); reg(q, e); q.linhas++; if (e.gap > e.h * 3) q.celulas++; if (MATH.test(t)) q.math = true; prev = e; continue; }
        const A = q.alts[alt], continua = e.x - left > A.ind + 3 || (!primeiroDaColuna && gap <= e.h * 1.9 && !atLeft);
        if (continua) { A.s.push(t); reg(q, e); q.linhas++; if (MATH.test(t)) q.math = true; prev = e; continue; }
        if (alt < 1) { q.stem.push(t); reg(q, e); prev = e; continue; }
        fechar();
      }
      pend.push(e); prev = e;
    }
    /* limpeza: questões sem alternativas saem; quantidade de alternativas mais comum vira a esperada.
       Caderno de itens para julgar (certo/errado, verdadeiro/falso): cada item vira questão de duas opções. */
    const todas = secoes.flatMap((s) => s.questoes);
    const semAlt = todas.filter((x) => x.alts.length < 2).length;
    const ce = semAlt > todas.length * 0.6 && /julgue|certo ou errado|verdadeiro ou falso|c\s*ou\s*e\b/i.test(texto.join(' '));
    if (ce) for (const x of todas) if (x.alts.length < 2) { x.stem = x.stem.concat(...x.alts.map((a) => a.s)); x.alts = [{ x: 0, ind: 0, s: ['Certo'] }, { x: 0, ind: 0, s: ['Errado'] }]; x.ce = true; }
    const nAlt = ce ? 2 : median(todas.map((x) => x.alts.length).filter((n) => n >= 2)) || 5;
    for (const s of secoes) s.questoes = s.questoes.filter((x) => { if (x.alts.length >= 2) return true; avisos.push('Questão ' + x.n + ': alternativas não encontradas; ficou de fora.'); return false; });
    const out = secoes.filter((s) => s.questoes.length).map((s) => ({
      titulo: s.titulo,
      intro: s.intro,
      questoes: s.questoes.map((x) => {
        const stem = juntar(x.stem), alts = x.alts.map((a) => juntar(a.s));
        const figura = !!(x.math || x.gaps || x.celulas >= 2 || FIG.test(stem));
        if (alts.length !== nAlt) avisos.push('Questão ' + x.n + ': ' + alts.length + ' alternativas (esperado ' + nAlt + ').');
        return { n: x.n, stem, alternativas: alts, ce: !!x.ce, apoio: x.apoio ? juntar(x.apoio) : '', figura, regioes: x.regioes.map(({ page, col, x0, x1, top, bot }) => ({ page, col, x0, x1, top: Math.round(top), bot: Math.round(bot) })) };
      })
    }));
    const nums = out.flatMap((s) => s.questoes.map((x) => x.n));
    for (let i = 1; i < nums.length; i++) if (nums[i] !== nums[i - 1] + 1) avisos.push('Numeração salta de ' + nums[i - 1] + ' para ' + nums[i] + '.');
    return { meta, secoes: out, questoes: nums.length, alternativas: nAlt, formato: ce ? 'certo-errado' : 'multipla', avisos };
  }
  /* título com letras espaçadas (“L Í N G U A  P O R T U G U E S A”): separa as palavras por um dicionário curto */
  const PAL = 'lingua portuguesa raciocinio logico logica quantitativo matematico matematica informatica conhecimentos conhecimento especificos especifico gerais basicos basica legislacao atualidades nocoes direito administrativo constitucional etica e de da do das dos administracao publica historia geografia estatistica ingles inglesa espanhol'.split(' ').sort((a, b) => b.length - a.length);
  function segmentar(s) {
    const n = norm(s).replace(/\s/g, '');
    if (n.length !== s.length) return s;
    const out = [];
    let i = 0;
    while (i < n.length) { const w = PAL.find((p) => n.startsWith(p, i)); if (!w) return s; out.push(s.slice(i, i + w.length)); i += w.length; }
    return out.join(' ');
  }
  /* junta linhas desfazendo a hifenização de fim de linha */
  function juntar(ls) { return ls.reduce((s, l) => { l = String(l).trim(); if (!l) return s; if (!s) return l; return /[A-Za-zÀ-ú]-$/.test(s) && /^[a-zà-ú]/.test(l) ? s.slice(0, -1) + l : s + ' ' + l; }, '').replace(/\s+/g, ' ').trim(); }
  function mkIntro(es) {
    const ls = es.map((e) => e.text);
    let titulo = '';
    if (ls.length > 2 && ls[0].length < 90 && !/[.;:]$/.test(ls[0]) && !/^instru/i.test(ls[0])) titulo = ls[0];
    let linhas = titulo ? ls.slice(1) : ls;
    /* texto com linhas numeradas no caderno (01, 02…): o motor numera de novo, então o número sai do texto */
    if (linhas.filter((l) => /^\d{1,3}\s+\S/.test(l)).length >= linhas.length * 0.6) linhas = linhas.map((l) => l.replace(/^\d{1,3}\s+/, ''));
    return { titulo, linhas };
  }
  function metaDe(texto) {
    const t0 = texto.slice(0, 2).join('\n'), linhas = (texto[0].trim().length > 80 ? texto[0] : t0).split('\n').map((s) => s.trim()).filter((l) => l && !/^\(/.test(l));
    const tudo = texto.join(' '), banca = /fundatec/i.test(tudo) ? 'FUNDATEC' : /instituto aocp|\bT\d{7}N\b|\bM\d{7}N\b/i.test(texto.join(' ')) ? 'Instituto AOCP' : /objetiva concursos|objetivas? concursos/i.test(tudo) ? 'Objetiva' : /cebraspe|cespe/i.test(t0) ? 'Cebraspe' : /\bfgv\b|getulio vargas/i.test(t0) ? 'FGV' : /\bfcc\b|carlos chagas/i.test(t0) ? 'FCC' : /fepese/i.test(t0) ? 'FEPESE' : /legalle/i.test(t0) ? 'Legalle' : '';
    const edital = (t0.match(/edital[^\n]{0,80}?n[º°o.]?\s*[\d./-]+(?:\s*[-–]\s*[A-Z]+)?/i) || [''])[0].replace(/\s+/g, ' ').trim();
    const ent = [...new Set(linhas.map((l) => l.replace(/\s{2,}.*$/, '').trim()).filter((l) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 .,–\-/()]{8,}$/.test(l) && !/edital|n[íi]vel|tipo|turno|inscri|nome|caderno|instituto aocp|fundatec|objetiva|^T\d+N$|^M\d+N$/i.test(l)))].slice(0, 3);
    const CARGO = /arquitet|engenh|analista|t[eé]cnico|profissional|especialista|agente|professor|assistente|auditor|fiscal|perito|urbanista/i;
    const cands = linhas.map((l) => l.replace(/\s{2,}.*$/, '').trim()).filter((l) => l.length >= 6 && l.length <= 90 && CARGO.test(l) && l === l.toUpperCase() && !/minist[eé]rio|prefeitura|secretaria|companhia|instituto|funda[cç][aã]o|universidade|munic[ií]pio/i.test(l));
    let cargo = cands[0] || (texto[0].match(/(?:cargo|emprego)\s*:\s*([^\n]{4,80})/i) || [])[1] || '';
    cargo = cargo.replace(/^\d{1,3}\s*[—–-]\s*/, '');
    const meio = cargo.length / 2;
    if (cargo.length > 10 && cargo.length % 2 === 0 && cargo.slice(0, meio) === cargo.slice(meio)) cargo = cargo.slice(0, meio);
    const tipo = (texto.join('\n').match(/tipo\s*0*(\d)\b/i) || [])[1] || '';
    const entidade = ent.filter((l) => l !== cargo).slice(0, 2).join(' — ');
    return { banca, edital, entidade, cargo: cargo.replace(/\s+/g, ' ').trim(), tipo };
  }

  /* ---------- gabarito ---------- */
  const LETRA = /^(?:[A-Ea-e]|X|\*|ANULADA|NULA|ANUL\.?|#)$/i;
  const letra = (s) => { const v = String(s).trim().toUpperCase(); return /^[A-E]$/.test(v) ? v : 'X'; };
  /* linhas de números seguidas de linhas de letras (alinhadas por x), pares "1 C", "01-C" e "1 2 3 / C E A" */
  function lerGabarito(pages) {
    const blocos = [];
    let cur = null;
    const novo = (titulo) => { cur = { titulo: titulo || 'Gabarito', respostas: {} }; blocos.push(cur); };
    for (const p of pages || []) {
      const ls = p.lines || [];
      for (let i = 0; i < ls.length; i++) {
        const l = ls[i], cells = l.cells.flatMap((c) => c.s.split(/\s+/).map((s, j, arr) => ({ s, x: c.x + (c.x2 - c.x) * (j / Math.max(1, arr.length)) }))).filter((c) => c.s);
        const nums = cells.filter((c) => /^\d{1,3}$/.test(c.s));
        if (nums.length >= 3 && nums.length === cells.length) {
          const nx = ls[i + 1];
          const lets = nx ? nx.cells.flatMap((c) => c.s.split(/\s+/).map((s, j, arr) => ({ s, x: c.x + (c.x2 - c.x) * (j / Math.max(1, arr.length)) }))).filter((c) => c.s) : [];
          if (lets.length && lets.every((c) => LETRA.test(c.s))) {
            if (!cur) novo('');
            for (const n of nums) { const best = lets.reduce((b, c) => (!b || Math.abs(c.x - n.x) < Math.abs(b.x - n.x) ? c : b), null); if (best && Math.abs(best.x - n.x) < 30) cur.respostas[+n.s] = letra(best.s); }
            i++; continue;
          }
        }
        /* pares na mesma linha: "1 C 2 E" ou "01-C" ou "Questão 1 Gabarito C" */
        /* OCR costuma dobrar a letra (“Cc”) ou colar número e letra (“1A”) */
        const toks = l.text.replace(/(\d)\s*[-–:.)]\s*([A-Ea-eX*])\b/g, '$1 $2').replace(/\b(\d{1,3})([A-Ea-e])\b/g, '$1 $2').split(/\s+/).map((t) => (/^([A-Ea-e])\1$/i.test(t) ? t[0] : t));
        let pares = 0;
        for (let j = 0; j + 1 < toks.length; j++) if (/^\d{1,3}$/.test(toks[j]) && LETRA.test(toks[j + 1])) pares++;
        if (pares >= 1 && pares * 2 >= toks.length - 1) {
          if (!cur) novo('');
          for (let j = 0; j + 1 < toks.length; j++) if (/^\d{1,3}$/.test(toks[j]) && LETRA.test(toks[j + 1])) { cur.respostas[+toks[j]] = letra(toks[j + 1]); j++; }
          continue;
        }
        /* título de bloco: cargo/prova/tipo entre tabelas */
        /* “2 - Arquiteto” (código do cargo) é título de bloco; cabeçalhos repetidos (Anexo, Edital, Prefeitura) não */
        const codigoCargo = /^\d{1,3}\s*[-–—]\s*[A-ZÀ-Úa-zà-ú]/.test(l.text) && !/^\d{1,3}\s*[-–—]\s*[A-Ea-eX*]\b/.test(l.text);
        const generico = /anexo|edital|gabaritos? (preliminar|definitiv|oficial)|prefeitura|concurso p|assinatura|executora|p[aá]gina/i.test(l.text);
        if (l.text.length > 6 && l.text.length < 140 && /[a-z]{4}/i.test(l.text) && (codigoCargo || (!generico && /(prova|tipo|cargo|analista|arquitet|engenh|t[eé]cnico|profissional|agente|especialista)/i.test(l.text)))) {
          if (!cur || Object.keys(cur.respostas).length) novo(l.text.trim()); else cur.titulo = l.text.trim();
        }
      }
    }
    return blocos.filter((b) => Object.keys(b.respostas).length >= 5);
  }
  /* digitado: "CEADB…", "1C 2E", "1-C, 2-E", com X ou * para anulada */
  function gabaritoDoTexto(s) {
    const t = String(s || '').toUpperCase();
    const out = {};
    if (/\d/.test(t)) { t.replace(/(\d{1,3})\s*[-–:.)=]?\s*([A-EX*])/g, (m, n, l) => { out[+n] = letra(l); return m; }); return out; }
    [...t.replace(/[^A-EX*]/g, '')].forEach((l, i) => { out[i + 1] = letra(l); });
    return out;
  }
  /* bloco do gabarito que mais combina com o caderno (cargo, tipo, número de questões) */
  function escolherBloco(blocos, meta, total) {
    if (!blocos.length) return -1;
    const cargo = norm(meta?.cargo || ''), tipo = meta?.tipo || '';
    const ws = cargo.split(/\W+/).filter((w) => w.length > 4);
    const sc = blocos.map((b) => { const t = norm(b.titulo); let s = ws.filter((w) => t.includes(w)).length * 2; if (tipo && new RegExp('(tipo|prova)\\s*0*' + tipo + '\\b').test(t)) s += 3; const n = Object.keys(b.respostas).length; if (total && n === total) s += 1; return s; });
    return sc.indexOf(Math.max(...sc));
  }
  const api = { lerProva, lerGabarito, gabaritoDoTexto, escolherBloco, fluxo, divisa, juntar };
  root.MeusMapasProvaReader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
