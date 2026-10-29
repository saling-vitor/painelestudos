'use strict';
/* MEUS MAPAS · V15.62 · leitor do edital.
   Entrada: as páginas do PDF já em linhas com células (edital-layout.js). Saída: um planejamento no formato
   meus-mapas/app-edital/v1 (prova, blocos, regras, etapas, fases e ficha do cargo) com avisos e confiança, para o
   usuário conferir antes de salvar. Tudo roda no aparelho; nada é enviado.
   Como lê: acha os quadros de prova pelo cabeçalho (Questões/Itens, Valor/Peso, Mínimo, Total), dá a cada coluna o
   sentido do cabeçalho pela posição x, monta as linhas (nomes quebrados em duas linhas e células mescladas de
   Módulo/Área/Cargo pela distância vertical) e escolhe o quadro do cargo (Arquiteto, nível superior). As regras que não
   cabem na tabela (mínimos em %, não zerar, certo/errado, discursiva, nota final) saem do texto corrido.
   Testado com 39 editais de FGV, FCC, Cebraspe, AOCP, FUNDATEC, Legalle, FEPESE, FURB e FAU. */
(function (root) {
  const ascii = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const NUM = /^[-–—]$|^\(?\d{1,4}(?:[.,]\d{1,3})?\)?%?$/;
  const isNum = (s) => NUM.test(String(s).trim()) && /\d/.test(s);
  const toNum = (s) => { const t = String(s).replace(/[()%\s]/g, ''); const n = Number(/,\d{1,3}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const r2 = (n) => Math.round(n * 100) / 100;
  const EXTENSO = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };

  /* ---------- colunas do cabeçalho ---------- */
  function colTipo(txt) {
    const t = ascii(txt);
    if (/minim/.test(t) && /do total|total de pontos|pontuacao minima|minimo de pontos|nota minima/.test(t)) return 'mg';
    if (/minim/.test(t)) return /acert|questo/.test(t) ? 'min-ac' : /%|percent/.test(t) ? 'min-pct' : /pont|nota/.test(t) ? 'min-pt' : 'min-ac';
    if (/peso total|total de cada|valor total|pontuacao total|total de pontos|total por/.test(t)) return 't';
    if (/disciplina|componente|conteudo|materia|assunto/.test(t)) return 'label';
    if (/pontos do total|total geral|total da prova|pontuacao maxima da prova/.test(t)) return 'tt';
    if (/quest|itens|\bitem/.test(t) && !/valor|pont|peso/.test(t)) return 'q';
    if (/quest|itens/.test(t) && /(n[ºo°.]?|numero|quantidade|qtd)/.test(t) && !/por quest|cada quest|\/ ?quest/.test(t)) return 'q';
    if (/peso/.test(t)) return 'v';
    if (/valor|pontos ?\/ ?quest|pontos por|por questao|cada questao|pontuacao por|pontos\/item|unit/.test(t) && !/total|maxim/.test(t)) return 'v';
    if (/total|maxim|pontuacao|pontos/.test(t)) return 't';
    if (/carater/.test(t)) return 'car';
    if (/cargo|perfil|especialidade|nivel|emprego|funcao|funcoes/.test(t)) return 'cargo';
    if (/modulo|bloco|parte|area de conhecimento|grupo|tipo de prova|prova\b|objetiva/.test(t)) return 'grupo';
    if (/conhecimento|area/.test(t)) return 'label';
    return null;
  }
  const GRUPO_HEAD = /^(m[óo]dulo\b|conhecimentos (gerais|b[áa]sicos|espec[íi]ficos)\s*:?$|parte\s+[ivx\d]+\b|bloco\s+[ivx\d]+\b|prova objetiva\s*\(?p\d)/i;
  const HEAD_HINT = /quest|itens|valor|peso|pontos|m[ií]nimo|total|disciplina|componente|conte[uú]do|mat[eé]ria|[áa]rea|m[óo]dulo|car[áa]ter|cargo/i;
  /* cabeçalho = 1 a 6 linhas curtas seguidas com palavras de tabela, uma delas falando de questões/itens */
  function headerAt(lines, i) {
    const L = lines[i];
    if (!L || !L.cells.some((c) => /quest(õ|o)es|itens|^quest\.?$|^ques-$/i.test(c.s) && c.s.length <= 40)) return null;
    if (L.cells.some((c) => c.s.length > 70)) return null;
    let a = i, b = i;
    const short = (l) => l && l.cells.length && l.cells.every((c) => c.s.length <= 48 && (c.s.length <= 14 || HEAD_HINT.test(c.s) && !/:\s*$|\b(para|que|os|as|aos|pelos|conforme|seguir|abaixo)\b/i.test(c.s)) && !/^\d+\.$|^(anexo|tabela|quadro)\b/i.test(c.s)) && !l.cells.some((c) => isNum(c.s) && !/^\d{1,2}$/.test(c.s)) && l.cells.some((c) => HEAD_HINT.test(c.s) || c.s.length <= 14);
    while (a > 0 && i - a < 5 && short(lines[a - 1]) && !GRUPO_HEAD.test(lines[a - 1].text.trim()) && !lines[a - 1].cells.some((c) => /^(tabela|quadro|anexo)\b/i.test(c.s)) && Math.abs(lines[a - 1].y - lines[a].y) < L.h * 2.6) a--;
    while (b + 1 < lines.length && b - i < 5 && short(lines[b + 1]) && !GRUPO_HEAD.test(lines[b + 1].text.trim()) && !lines[b + 1].cells.some((c) => isNum(c.s)) && Math.abs(lines[b + 1].y - lines[b].y) < L.h * 2.6) b++;
    const cells = [];
    for (let k = a; k <= b; k++) for (const c of lines[k].cells) cells.push({ ...c, y: lines[k].y, cx: (c.x + c.x2) / 2 });
    /* junta células empilhadas da mesma coluna (sobreposição em x) */
    cells.sort((p, q) => p.x - q.x);
    const cols = [];
    for (const c of cells) {
      const hit = cols.find((k) => c.x < k.x2 + 2 && c.x2 > k.x - 2 && Math.abs(c.cx - k.cx) < Math.max(40, (k.x2 - k.x) / 1.2));
      if (hit) { hit.parts.push(c); hit.x = Math.min(hit.x, c.x); hit.x2 = Math.max(hit.x2, c.x2); hit.cx = (hit.x + hit.x2) / 2; }
      else cols.push({ x: c.x, x2: c.x2, cx: c.cx, parts: [c] });
    }
    for (const k of cols) { k.txt = k.parts.sort((p, q) => q.y - p.y).map((p) => p.s).join(' ').replace(/(\w)- (\w)/g, '$1$2'); k.tipo = colTipo(k.txt); }
    const numCols = cols.filter((k) => ['q', 'v', 't', 'tt', 'mg', 'min-ac', 'min-pt', 'min-pct'].includes(k.tipo));
    if (!numCols.some((k) => k.tipo === 'q')) return null;
    if (!cols.some((k) => ['label', 'grupo', 'cargo'].includes(k.tipo)) && cols[0] && !cols[0].tipo) cols[0].tipo = 'label';
    return { a, b, cols: cols.sort((p, q) => p.x - q.x) };
  }

  const LABEL_STOP = /^(total|totais|subtotal|valor total|pontua[çc][ãa]o (total|m[áa]xima))\b/i;
  /* linhas do quadro até o texto corrido voltar */
  function readTable(page, hdr, pageNo) {
    const { cols } = hdr, out = [], loose = [], heads = [];
    if (hdr.a > 0 && GRUPO_HEAD.test(page[hdr.a - 1].text.trim()) && page[hdr.a - 1].text.length < 80) heads.push({ y: page[hdr.a - 1].y, s: page[hdr.a - 1].text.trim() });
    const numCols = cols.filter((k) => ['q', 'v', 't', 'tt', 'mg', 'min-ac', 'min-pt', 'min-pct'].includes(k.tipo));
    const textCols = cols.filter((k) => !numCols.includes(k));
    const qCol = numCols.find((k) => k.tipo === 'q');
    let labelCol = textCols.filter((k) => k.tipo === 'label').pop() || textCols.filter((k) => k.tipo === 'grupo').pop() || textCols[textCols.length - 1];
    const firstNumX = Math.min(...numCols.map((k) => k.x));
    let blank = 0, end = hdr.b, labX = Infinity;
    for (let i = hdr.b + 1; i < page.length; i++) {
      const L = page[i];
      const prose = L.cells.some((c) => c.s.length > 95) || /^\d{1,2}(\.\d{1,2}){1,4}\.?\s+[A-ZÀ-Úa-z]/.test(L.text) && !/^\d{1,2}\.\d{1,2}\s{2,}\d/.test(L.text) || /^(tabela|quadro|anexo)\s/i.test(L.text) && i > hdr.b + 1;
      if (prose) break;
      const nums = L.cells.filter((c) => isNum(c.s) && c.x >= firstNumX - 25);
      const texts = L.cells.filter((c) => !nums.includes(c));
      if (!nums.length && !texts.length) continue;
      if (!nums.length) { blank++; if (blank > 9) break; } else blank = 0;
      /* subtítulo de bloco dentro da tabela (FGV: "Módulo I – Conhecimentos Gerais"; TJSC: "MÓDULO DE CONHECIMENTOS GERAIS") */
      if (!nums.length && texts.length && GRUPO_HEAD.test(L.text.trim()) && L.text.length < 80) { heads.push({ y: L.y, s: L.text.replace(/\s{2,}.*$/, '').trim() }); end = i; continue; }
      if (!nums.length && texts.length && /^(disciplinas?|quest(õ|o)es|n[ºo°]\.? de quest)/i.test(L.text) && L.text.length < 60) { end = i; continue; }
      const rec = { y: L.y, h: L.h, label: [], grupo: [], cargo: [], car: [], vals: {}, line: L.text };
      /* célula que atravessa a coluna do rótulo (cargo + disciplina coladas): parte na posição da coluna */
      const split = [];
      for (const c of texts) {
        const lx = Math.min(labelCol ? labelCol.x : Infinity, labX);
        const left = labelCol ? textCols.filter((t) => t !== labelCol && t.x2 <= labelCol.x + 2).pop() : null;
        const k = labelCol && left && c.x <= left.x2 + 15 && c.x < lx - 12 && c.x2 > lx + 20 ? labelCol : null;
        if (!k) { split.push(c); if (labelCol && c.x > (textCols.find((t) => t.x2 <= labelCol.x + 2)?.x2 ?? -Infinity) + 20 && c.x < firstNumX - 10 && Math.abs(c.x - labelCol.x) < 80) labX = Math.min(labX, c.x); continue; }
        const pos = Math.round(((lx - c.x) / (c.x2 - c.x)) * c.s.length);
        let cut = c.s.lastIndexOf(' ', pos + 2); if (cut < 1) cut = c.s.indexOf(' ', pos);
        if (cut < 1) { split.push(c); continue; }
        const xm = c.x + ((c.x2 - c.x) * cut) / c.s.length;
        split.push({ x: c.x, x2: xm, s: c.s.slice(0, cut).trim() }, { x: Math.max(lx, k.x), x2: c.x2, s: c.s.slice(cut).trim() });
      }
      for (const c of split) {
        const cx = (c.x + c.x2) / 2;
        let best = null, bd = Infinity;
        for (const k of textCols) { const d = c.x >= k.x - 6 && c.x <= k.x2 + 6 ? 0 : Math.min(Math.abs(cx - k.cx), Math.abs(c.x - k.x)); if (d < bd) { bd = d; best = k; } }
        /* texto que começa na faixa das colunas numéricas é rótulo solto (ex.: "Avaliação de Títulos (C)* 20,00") */
        const tipo = c.x >= firstNumX - 10 && !/car/.test(best?.tipo || '') ? 'label' : best ? best.tipo : 'label';
        const bucket = tipo === 'cargo' ? rec.cargo : tipo === 'grupo' && best !== labelCol ? rec.grupo : tipo === 'car' ? rec.car : rec.label;
        bucket.push(c.s);
      }
      for (const c of nums) {
        const cx = (c.x + c.x2) / 2;
        let best = null, bd = Infinity;
        for (const k of numCols) { const d = Math.abs(cx - k.cx); if (d < bd) { bd = d; best = k; } }
        if (best && rec.vals[best.tipo] === undefined) rec.vals[best.tipo] = c.s;
        else if (best) { /* duas células na mesma coluna: a mais à direita vai para a próxima coluna livre */
          const next = numCols.find((k) => k.cx > best.cx && rec.vals[k.tipo] === undefined); if (next) rec.vals[next.tipo] = c.s;
        }
      }
      end = i;
      if (rec.vals.q !== undefined && toNum(rec.vals.q) !== null) out.push(rec); else loose.push(rec);
    }
    return { rows: out, loose, heads, cols, page: pageNo, start: hdr.a, end, labelCol, qCol };
  }

  /* nomes quebrados e células mescladas: cada pedaço solto vai para a linha numérica mais próxima na vertical */
  function assemble(tb) {
    const rows = tb.rows.map((r) => ({ ...r, label: r.label.slice(), grupo: r.grupo.slice(), cargo: r.cargo.slice() }));
    if (!rows.length) return [];
    const near = (y) => { let best = rows[0], bd = Infinity; for (const r of rows) { const d = Math.abs(r.y - y); if (d < bd - 0.01) { bd = d; best = r; } } return { r: best, d: bd }; };
    const grupoBlocks = [], cargoBlocks = [];
    for (const l of tb.loose) {
      if (l.label.length) {
        const txt = l.label.join(' ');
        if (LABEL_STOP.test(txt) || /discursiv|reda[çc][ãa]o|estudo de caso|car[áa]ter:|^\(\*\)/i.test(l.line)) continue;
        const { r, d } = near(l.y);
        if (d < l.h * 3.2) (l.y > r.y ? r.label.unshift : r.label.push).call(r.label, ...(l.y > r.y ? [txt] : [txt])), r._lab = (r._lab || []).concat([[l.y, txt]]);
      }
      if (l.vals.mg !== undefined || l.vals.tt !== undefined || l.vals.t !== undefined) { const { r } = near(l.y); r.tot = { ...(r.tot || {}), mg: l.vals.mg ?? r.tot?.mg, tt: l.vals.tt ?? l.vals.t ?? r.tot?.tt }; }
      if (l.grupo.length) grupoBlocks.push({ y: l.y, s: l.grupo.join(' ') });
      if (l.cargo.length) cargoBlocks.push({ y: l.y, s: l.cargo.join(' ') });
    }
    /* ordem de leitura do nome: de cima para baixo */
    for (const r of rows) {
      if (r._lab) { const parts = [[r.y, r.label.filter((x) => !r._lab.some(([, t]) => t === x)).join(' ')], ...r._lab].filter(([, t]) => t).sort((a, b) => b[0] - a[0]); r.label = parts.map(([, t]) => t); }
      if (r.grupo.length) grupoBlocks.push({ y: r.y, s: r.grupo.join(' '), own: r });
      if (r.cargo.length) cargoBlocks.push({ y: r.y, s: r.cargo.join(' '), own: r });
    }
    /* blocos de grupo: pedaços vizinhos de texto da coluna Módulo/Área viram um bloco só */
    const mergeBlocks = (bl, gap = 14, any = false) => { bl.sort((a, b) => b.y - a.y); const out = []; for (const b of bl) { const L = out[out.length - 1]; if (L && (Math.abs(L.y2 - b.y) < gap && (any || !b.own && !L.own) && !/^m[óo]dulo|^conhecimentos|^parte|^p\d/i.test(b.s) || Math.abs(L.y2 - b.y) < gap * 3 && /^conhecimentos$/i.test(L.s.trim()) && /^(gerais|b[áa]sicos|espec[íi]ficos)$/i.test(b.s.trim()))) { if (L.own && b.own !== L.own || b.own && !L.own) L.own = null; L.s += ' ' + b.s; L.y2 = b.y; L.ym = (L.y1 + b.y) / 2; } else out.push({ y1: b.y, y2: b.y, ym: b.y, s: b.s, own: b.own }); } return out; };
    const gb = mergeBlocks(grupoBlocks);
    for (const r of rows) {
      if (!gb.length) break;
      let best = null, bd = Infinity;
      for (const b of gb) { if (b.own && b.own !== r) continue; const d = b.own === r ? -1 : r.y <= b.y1 + 2 && r.y >= b.y2 - 2 ? 0 : Math.abs(b.ym - r.y); if (d < bd) { bd = d; best = b; } }
      r.grupoTxt = best ? best.s : '';
    }
    for (const r of rows) r.cargoTxt = r.cargo.join(' ');
    /* subtítulos de bloco valem para as linhas abaixo deles */
    if (tb.heads && tb.heads.length) for (const r of rows) { const h = tb.heads.filter((x) => x.y > r.y).sort((a, b) => a.y - b.y)[0]; if (h && !r.grupoTxt) r.grupoTxt = h.s; }
    const hh = rows[0].h || 9;
    rows.cargoBlocks = mergeBlocks(cargoBlocks, hh * 2.3, true).filter((b) => b.s.length > 2 && !/^car[áa]ter/i.test(b.s));
    return rows;
  }

  const cleanLabel = (s) => String(s || '').replace(/^tabela\s+[a-z0-9.]+\s+/i, '').replace(/^\d+ª\s+/, '').replace(/^\d{2}\s+(?=[A-ZÀ-Ú])/, '').replace(/\s+\d+\s*horas?(\s*e\s*\d+\s*min(utos)?)?\s*$/i, '').replace(/\b(primeira|segunda|terceira)\b\s*/gi, '').replace(/\s*–\s*etapa\b/gi, ' –').replace(/^prova objetiva\s+(?=conhecimentos)/i, '').replace(/car[áa]ter:.*$/i, '').replace(/\(\*\).*$/, '').replace(/^\d{1,2}\s*[.)\-–]\s*(?=[A-ZÀ-Ú])/, '').replace(/^\d{1,2}\.(?=[A-ZÀ-Ú])/, '').replace(/^(?:\d{2}\s+)?\d+h\d*(?:min)?\s+/i, '').replace(/\((E|C|E\/C|C\/E|EC)\)\s*\*?/gi, '').replace(/\*+/g, '').replace(/\s+/g, ' ').replace(/^[–—\-•·:\s]+|[–—\-•·:\s]+$/g, '').replace(/\s+(e|de|da|do|das|dos)$/i, '').trim();
  const MIN = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'no', 'na']);
  const titulo = (s) => (/[a-zà-ú]/.test(s) ? s : s.toLowerCase().split(' ').map((w, i) => (i && MIN.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ').replace(/\b(Ii|Iii|Iv|Vi)\b/g, (m) => m.toUpperCase()));
  const cleanGrupo = (s) => titulo(cleanLabel(s)).replace(/^m[óo]dulo\s+([IVX]+|\d)\s*[–—\-:]?\s*/i, (m, n) => 'Módulo ' + n + ' – ').replace(/\s*–\s*$/, '').trim();

  /* uma tabela pode ter vários cargos (FUNDATEC Anexo III): corta quando um nome se repete ou depois de Títulos/Prática */
  function splitGroups(rows) {
    const groups = [];
    let cur = [], seen = new Set();
    for (const r of rows) {
      const k = ascii(cleanLabel(r.label.join(' '))).slice(0, 30);
      if (k && seen.has(k) && cur.length) { groups.push(cur); cur = []; seen = new Set(); }
      cur.push(r); if (k) seen.add(k);
      if (/titulos|pratica|habilidade/.test(k)) { groups.push(cur); cur = []; seen = new Set(); }
    }
    if (cur.length) groups.push(cur);
    return groups.filter((g) => g.some((r) => !/titulos|pratica|habilidade/.test(ascii(r.label.join(' ')))));
  }

  /* ---------- texto corrido ---------- */
  const flat = (pages) => pages.map((p) => p.map((l) => l.text).join('\n')).join('\n');
  function numPt(s) {
    const t = ascii(s).trim();
    if (EXTENSO[t] !== undefined) return EXTENSO[t];
    return toNum(s);
  }
  /* trecho em volta do cargo, para regras que variam por cargo */
  function cargoRe(cargo) { const c = ascii(cargo || 'arquitet').replace(/[^a-z ]/g, '').trim().split(/\s+/)[0] || 'arquitet'; return new RegExp(c.slice(0, Math.max(6, c.length - 2)), 'i'); }

  function regrasTexto(T, cargo) {
    const t = T.replace(/\s+/g, ' ');
    const a = ascii(t);
    const res = { avisos: [] };
    if (/certo ou errado|julgue o item certo|codigo c,.*codigo e/.test(a)) res.formato = 'certo-errado';
    const neg = /(\d+(?:,\d+)?) ponto negativo|uma resposta errada anula uma resposta certa|cada (?:resposta|questao|item) errad[ao] anula/.exec(a);
    if (neg) res.penalidade = neg[1] ? toNum(neg[1]) : 1;
    if (/escore padronizado|nota padronizada/.test(a)) res.escala = 'padronizada';
    else if (/avaliadas?, cada uma, na escala de 0 \(zero\) a 10|na escala de 0 \(zero\) a 10 \(dez\)/.test(a) && /media aritmetica ponderada/.test(a)) res.escala = 'media10';
    if (/nao zerar|zerar (?:nenhuma|qualquer)|nota zero em (?:qualquer|alguma) (?:das )?(?:disciplina|prova)/.test(a)) res.naoZerar = true;
    const alt = /(\d|quatro|cinco) \((?:quatro|cinco)\)? ?(?:alternativas|opcoes)|com (quatro|cinco) alternativas|(\d) alternativas/.exec(a);
    if (alt) { const v = numPt(alt[1] || alt[2] || alt[3]); if (v === 4 || v === 5) res.alternativas = v; }
    /* mínimo geral */
    const pct = /(?:igual ou superior a|minimo,? de|no minimo,?|pelo menos) (\d{1,3}) ?% (?:\([^)]*\) )?(?:do total de pontos|da pontuacao (?:maxima|total)|dos pontos|do total da prova|do total|da nota maxima)/.exec(a) || /(\d{1,3})% \([^)]*\) da pontuacao maxima/.exec(a);
    const acTot = /acertar,? no minimo,? (\d{1,3}) \([^)]*\) questoes do total/.exec(a) || /acertar,? no minimo,? (\d{1,3}) \([^)]*\) questoes;? e/.exec(a);
    const ptsTot = /(?:obter|obtiver|alcancar)(?: no minimo| nota igual ou superior a| pontuacao igual ou superior a| minimo de)? (\d{1,3}(?:,\d{1,2})?) (?:\([^)]*\) )?pontos (?:na prova objetiva|no total|no conjunto)/.exec(a) || /nota (?:na prova objetiva )?(?:igual ou superior a|inferior a) (\d{1,3}(?:,\d{1,2})?) (?:\([^)]*\) )?(?:pontos)?(?: na prova objetiva| no conjunto das provas objetivas)?/.exec(a);
    const ptsMais = /obtiverem (\d{1,3}(?:,\d{1,2})?) pontos ou mais na (?:nota final da )?prova/.exec(a);
    const ptsAprov = /(?:devera obter|obtiver|obter) (?:no minimo,? |nota igual ou superior a |nota minima de |pontuacao igual ou superior a )?(\d{1,3}(?:,\d{1,3})?) (?:\([^)]*\) )?(?:pontos )?para (?:ser considerado )?aprovad/.exec(a) || /para ser aprovado na prova objetiva,? o candidato devera obter nota igual ou superior a (\d{1,3}(?:,\d{1,3})?)/.exec(a);
    if (acTot) { res.minimoGeral = toNum(acTot[1]); res.minimoGeralEm = 'acertos'; }
    else if (pct) { res.minimoGeral = toNum(pct[1]); res.minimoGeralEm = 'pct'; }
    else if (ptsMais) { res.minimoGeral = toNum(ptsMais[1]); res.minimoGeralEm = 'pontos'; }
    else if (ptsAprov) { res.minimoGeral = toNum(ptsAprov[1]); res.minimoGeralEm = 'pontos'; }
    else if (ptsTot) { res.minimoGeral = toNum(ptsTot[1]); res.minimoGeralEm = 'pontos'; }
    /* mínimos de bloco/módulo (FGV, Cebraspe, Cesgranrio) */
    const blocos = [];
    const reB = /(?:acertar|obtiver nota igual ou superior a|obter),? (?:no minimo,? )?(\d{1,3})% \([^)]*\) (?:das questoes|da pontuacao(?: atribuida a)?)(?: d[oa])? (?:do |da )?(modulo [ivx]+|conhecimentos (?:basicos|gerais|especificos)|parte [ivx\d]+)/g;
    let m; while ((m = reB.exec(a))) blocos.push({ chave: m[2], minimo: toNum(m[1]), minimoEm: 'pct' });
    const reC = /nota inferior a (\d{1,3}(?:,\d{1,2})?) pontos na prova objetiva de (conhecimentos (?:basicos|gerais|especificos))(?: \((p\d)\))?/g;
    while ((m = reC.exec(a))) blocos.push({ chave: m[3] || m[2], alt: m[2], minimo: toNum(m[1]), minimoEm: 'pontos' });
    const reD = /(?:obtiver|obter),? (?:cumulativamente, )?(?:no minimo )?(\d{1,3}) \([^)]*\) pontos no (modulo [ivx]+)/g;
    while ((m = reD.exec(a))) blocos.push({ chave: m[2], minimo: toNum(m[1]), minimoEm: 'pontos' });
    const reE = /acertar,? no minimo,? (\d{1,3}) \([^)]*\) questoes de (conhecimentos (?:basicos|gerais|especificos))/g;
    while ((m = reE.exec(a))) blocos.push({ chave: m[2], minimo: toNum(m[1]), minimoEm: 'acertos' });
    if (blocos.length) res.blocos = blocos;
    if ((a.match(/(?:considerado aprovado|serao considerados aprovados),? para o cargo de/g) || []).length > 1) res.avisos.push('o edital tem mínimos diferentes por cargo; confira os blocos');
    if (/no conjunto das provas objetivas/.test(a) && /nota inferior a (\d{1,3}(?:,\d{1,2})?) pontos no conjunto/.test(a)) { const k = /nota inferior a (\d{1,3}(?:,\d{1,2})?) pontos no conjunto/.exec(a); res.minimoGeral = toNum(k[1]); res.minimoGeralEm = 'pontos'; }
    /* etapas */
    const etapas = [];
    const disc = /prova discursiva[^.]{0,160}?(?:valer[aá]|valendo|valor de|totalizar[aá]) (?:ate |no maximo )?(\d{1,3}(?:,\d{1,2})?) (?:\([^)]*\) )?pontos/.exec(a) || /(?:redacao|estudo de caso)[^.]{0,120}?(?:valer[aá]|valendo|escala de 0 \(zero\) a) (?:ate )?(\d{1,3}(?:,\d{1,2})?)/.exec(a);
    if (disc) {
      const max = toNum(disc[1]);
      const mins = [];
      for (const rx of [/(?:aprovad[oa] na prova discursiva|habilitado)[^.]{0,120}?(?:igual ou superior a|npd ?≥|>=) ?(\d{1,3}(?:,\d{1,2})?)/g, /reprovado na prova discursiva[^.]{0,80}?inferior a (\d{1,3}(?:,\d{1,2})?)/g, /npd ≥ (\d{1,3}(?:,\d{1,2})?)/g]) { let mm; while ((mm = rx.exec(a))) { const v = toNum(mm[1]); if (v !== null) mins.push(v); } }
      const minM = mins.length ? [null, String(Math.max(...mins.filter((v) => v <= toNum(disc[1]))))] : null;
      const tipo = /estudo de caso/.test(a.slice(Math.max(0, disc.index - 80), disc.index + 200)) ? 'estudo-caso' : /redacao/.test(a.slice(Math.max(0, disc.index - 40), disc.index + 200)) ? 'redacao' : 'discursiva';
      const corr = /(?:serao corrigidas|tera(?:o)? corrigidas?|somente serao corrigidas)[^.]{0,220}?(\d{1,3}) \([^)]*\) vezes o numero de vagas/.exec(a);
      if (max && max <= 200) etapas.push({ tipo, max, minimo: minM ? toNum(minM[1]) : 0, carater: 'EC', nota: corr ? 'corrige até ' + corr[1] + '× as vagas' : '' });
    }
    const prat = /prova pratica[^.]{0,120}?(?:valer[aá]|valendo|totalizar[aá]) (?:ate )?(\d{1,3}(?:,\d{1,2})?) (?:\([^)]*\) )?pontos/.exec(a);
    if (prat && cargoRe(cargo).test(t.slice(Math.max(0, prat.index - 600), prat.index + 300))) etapas.push({ tipo: 'pratica', max: toNum(prat[1]), minimo: 0, carater: 'EC' });
    const tit = /(?:avaliacao|prova) de titulos[^.]{0,140}?(?:valer[aá]|escala de 0 \(zero\) a|pontuacao maxima de|maximo de|no maximo) (?:no maximo )?(\d{1,3}(?:,\d{1,2})?)/.exec(a);
    if (tit) etapas.push({ tipo: 'titulos', max: toNum(tit[1]), minimo: 0, carater: 'C' });
    if (etapas.length) res.etapas = etapas;
    /* nota final */
    const pond = /nota final = \[?\(?(\d(?:,\d+)?) ?[x×*] ?nota da prova objetiva\)? ?\+ ?\(?(\d(?:,\d+)?) ?[x×*] ?nota da prova de titulos/.exec(a);
    if (pond) { res.notaFinal = 'ponderada'; res.pesoObjetiva = toNum(pond[1]); res.pesoTitulos = toNum(pond[2]); }
    else if (/nf ?= ?\(npo ?\+ ?np[pd]\) ?\/ ?2/.test(a)) res.notaFinal = 'media';
    return res;
  }

  /* ---------- cronograma ---------- */
  const FASE_RE = [
    ['inscricoes', /per[ií]odo (de|das) inscri[çc][õo]es|inscri[çc][õo]es (pela internet|via internet|online)|abertura das inscri/i],
    ['homologacao', /homologa[çc][ãa]o (preliminar )?das inscri|inscri[çc][õo]es homologadas|deferimento das inscri|lista preliminar de inscritos/i],
    ['prova', /aplica[çc][ãa]o d[ao]s? provas?|realiza[çc][ãa]o d[ao]s? provas? (objetiva|te[óo]rico|escrita)|data (prov[aá]vel )?da prova objetiva|prova objetiva\s*[–-]?\s*data/i],
    ['gabarito', /gabaritos? preliminar/i],
    ['recursos', /recursos?.{0,60}gabarito/i],
    ['resultado', /resultado final|classifica[çc][ãa]o final|homologa[çc][ãa]o do resultado/i]
  ];
  function fasesTexto(pages, anoBase) {
    const lines = pages.flat();
    let ix = -1;
    lines.forEach((l, k) => { const t = l.text.trim(); if (/^(anexo\s+[ivxlc\d]+\s*[–-]?\s*)?cronograma\b/i.test(t) && t.length < 90 && !/;\s*$/.test(t)) ix = k; });
    if (ix < 0) ix = lines.findIndex((l) => /cronograma/i.test(l.text) && l.text.length < 90 && /anexo|cronograma de|cronograma\s*$|cronograma previsto|cronograma do/i.test(l.text) && !/;\s*$/.test(l.text));
    const r1 = fasesDe(ix >= 0 ? lines.slice(ix) : lines, anoBase);
    return r1.length >= 3 || ix < 0 ? r1 : (() => { const r2 = fasesDe(lines, anoBase); return r2.length > r1.length ? r2 : r1; })();
  }
  function fasesDe(scan, anoBase) {
    const out = {};
    const dataDe = (s) => {
      let m = /(\d{1,2})\/(\d{1,2})\s*(?:a|à|até|e)\s*\d{1,2}\/\d{1,2}\/(\d{4})/.exec(s) || /(?<![\/\d])(\d{1,2})\s*(?:e|a|à|até|ou)\s*\d{1,2}\/(\d{1,2})\/(\d{2,4})/.exec(s) || /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
      if (m) { const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); return y + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0'); }
      m = /(\d{1,2})\/(\d{1,2})(?!\/)/.exec(s);
      if (m && anoBase) return anoBase + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
      return null;
    };
    for (let i = 0; i < scan.length; i++) {
      const s = scan[i].text;
      for (const [id, re] of FASE_RE) {
        if (out[id] || !re.test(s)) continue;
        if (id === 'prova' && /pr[aá]tica|aptid[ãa]o|t[íi]tulos|biopsicossocial|discursiva/i.test(s) && !/objetiva/i.test(s)) continue;
        if (id === 'resultado' && /t[íi]tulos|pr[aá]tica|biopsico|preliminar/i.test(s)) continue;
        const solo = (t) => /^\s*[\d/ eaà]+\s*$/.test(t || '');
        const d = dataDe(s) || (solo(scan[i + 1]?.text) ? dataDe(scan[i + 1].text) : null) || (solo(scan[i - 1]?.text) ? dataDe(scan[i - 1].text) : null);
        if (d && /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d)) out[id] = d;
      }
    }
    /* ordem do cronograma: inscrições ≤ homologação ≤ prova ≤ gabarito ≤ recursos ≤ resultado; fora de ordem sai */
    const ord = ['inscricoes', 'homologacao', 'prova', 'gabarito', 'recursos', 'resultado'];
    if (out.prova) { for (const k of ['inscricoes', 'homologacao']) if (out[k] && out[k] > out.prova) delete out[k]; for (const k of ['gabarito', 'recursos', 'resultado']) if (out[k] && out[k] < out.prova) delete out[k]; }
    if (out.inscricoes && out.homologacao && out.homologacao < out.inscricoes) delete out.homologacao;
    return ord.filter((k) => out[k]).map((id) => ({ id, data: out[id] }));
  }

  /* ---------- ficha do cargo (quadro de cargos) ---------- */
  function fichaCargo(pages, cargo) {
    const re = cargoRe(cargo), lines = pages.flat();
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (!re.test(L.text) || L.text.length > 260) continue;
      const win = [L.text, lines[i + 1]?.text || '', lines[i + 2]?.text || '', lines[i - 1]?.text || ''].join(' ');
      const venc = /R?\$?\s?(\d{1,2}\.\d{3},\d{2})/.exec(win);
      if (!venc) continue;
      const carga = /(\d{2})\s?(?:h(?:oras)?|horas semanais)\b/i.exec(win);
      const vagas = /\b(\d{1,3}\s?\+\s?C\.?\s?R\.?|C\.?R\.?|\d{1,2})\b(?=[^\d]*(?:\d{2}\s?h|R\$|\d{1,2}\.\d{3},\d{2}))/.exec(L.text.replace(re, ''));
      return { vencimento: 'R$ ' + venc[1], carga: carga ? carga[1] + ' h semanais' : undefined, vagas: vagas ? vagas[1].replace(/\s/g, ' ') : undefined };
    }
    return {};
  }

  /* ---------- escolha do quadro e montagem ---------- */
  function contextoAntes(page, a) {
    const out = [];
    for (let k = a - 1; k >= 0 && a - k <= 12; k--) { const t = page[k].text; out.unshift(t); if (/^(tabela|quadro|anexo)\b|^\d+(\.\d+)+\.?\s/i.test(t)) break; }
    return out.join(' ');
  }
  /* cargo-pai quando o edital chama o arquiteto de outra coisa (ALE-RO: Analista Legislativo / Arquitetura;
     SEDUC-PA: Analista de Gestão ... – Arquitetura e Urbanismo) */
  function cargoPai(pages, cargo) {
    const lines = pages.flat(), re = cargoRe(cargo);
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].text;
      if (!re.test(t) || t.length > 200) continue;
      const m = /^(.{6,90}?)\s+[–-]\s+arquitet/i.exec(t) || (/^\s*[–-]?\s*arquitet/i.test(t) && /[–-]\s*$/.test(lines[i - 1]?.text || '') ? [0, lines[i - 1].text.replace(/[–-]\s*$/, '')] : null);
      if (m) { let pai = m[1]; for (let k = i - 1; k >= Math.max(0, i - 2) && pai.length < 60; k--) { const prev = lines[k].text.split(/\s{3,}/)[0]; if (/^[A-ZÀ-Ú][a-zà-ú]/.test(prev) && prev.length < 50 && !/[.:;]$/.test(prev) && /^(analista|t[ée]cnico|especialista|inspetor|assessor|engenheiro|fiscal|agente|perito)/i.test(prev + ' ' + pai) && !/^(analista|t[ée]cnico|especialista|inspetor|assessor|engenheiro|fiscal|agente|perito)/i.test(pai)) pai = prev + ' ' + pai; } pai = pai.split(/\s{3,}/).pop().trim(); if (/^(analista|t[ée]cnico|especialista|inspetor|assessor|engenheiro|fiscal|agente|perito)/i.test(pai)) return pai.replace(/\s+/g, ' '); }
      if (/^arquitet\w*\b/i.test(t.trim()) && /\d/.test(t)) {
        for (let k = i - 1; k >= Math.max(0, i - 25); k--) { const h = /^N[ÍI]VEL\s+\S+\s*[–-]\s*(.{4,60})$/i.exec(lines[k].text.trim()); if (h) return titulo(h[1].trim()); }
      }
    }
    return '';
  }
  function itemTexto(T, num) { const i = T.search(new RegExp('(^|\\n)' + num.replace(/\./g, '\\.') + '\\.?\\s')); if (i < 0) return ''; const rest = T.slice(i + 1, i + 1600); const j = rest.slice(num.length + 2).search(/\n\d{1,2}(\.\d{1,2}){1,4}\.?\s/); return j < 0 ? rest : rest.slice(0, j + num.length + 2); }
  function pontuaCandidato(ctx, cargoTxt, cargo, rows, pai, T) {
    const c = ascii(ctx + ' ' + cargoTxt), re = new RegExp(ascii(cargo || 'arquitet').slice(0, 7));
    let s = 0;
    if (re.test(ascii(cargoTxt))) s += 9; else if (re.test(c)) s += 6;
    const exceto = /exce(to|ção)[^.)]*$/.test('') || /exceto[^)]*/.exec(c);
    if (exceto && re.test(exceto[0])) s -= 12;
    if (/superior/.test(c)) s += 3;
    if (/fundamental|medio|tecnico|magisterio|professor/.test(ascii(cargoTxt || ctx)) && !/superior/.test(c) && !re.test(c)) s -= 4;
    if (/advogad|procurador|medic|enferm|professor|economista|fiscal tribut|contador|psicolog/.test(ascii(cargoTxt)) && !re.test(ascii(cargoTxt)) && !/exceto/.test(ascii(cargoTxt))) s -= 3;
    if (pai) {
      const pa = ascii(pai).split(' ').slice(0, 3).join(' ');
      if (pa && c.includes(pa)) s += 6;
      const it = /(exceto )?nas especialidades descritas no item (\d+(?:\.\d+)+)/.exec(c);
      if (it && T) { const txt = ascii(itemTexto(T, it[2])); if (re.test(txt)) s += it[1] ? -9 : 5; else if (it[1]) s += 3; }
      if (/para o cargo de/.test(c) && pa && !c.includes(pa) && !re.test(c)) s -= 4;
    }
    s += Math.min(3, rows.length / 3);
    return s;
  }

  let lerEdital = function lerEditalBase(pages, opts = {}) {
    const cargo = opts.cargo || 'Arquiteto';
    const T = flat(pages);
    const anoBase = Number((/(?:edital|concurso)[^\n]{0,60}?\b(20\d\d)\b/i.exec(T) || /\b(20\d\d)\b/.exec(T) || [])[1]) || null;
    const cands = [], pai = cargoPai(pages, cargo);
    pages.forEach((page, pn) => {
      for (let i = 0; i < page.length; i++) {
        const hdr = headerAt(page, i);
        if (!hdr) continue;
        const tb = readTable(page, hdr, pn);
        i = Math.max(i, tb.end);
        if (!tb.rows.length) continue;
        const rows = assemble(tb), ctx = contextoAntes(page, hdr.a);
        /* com coluna Cargo: cada linha vai para o bloco de cargo mais próximo na vertical; sem ela, corta por nome repetido */
        let gs;
        const cb = rows.cargoBlocks || [];
        if (cb.length >= 2) {
          const by = cb.map((b) => ({ b, rows: [] }));
          let prev = null;
          for (const r of rows) { let best = by[0], bd = Infinity; for (const x of by) { const d = r.y <= x.b.y1 + 2 && r.y >= x.b.y2 - 2 ? -1 : Math.abs(x.b.ym - r.y); if (d < bd) { bd = d; best = x; } } if (prev && /t[ií]tulos|pr[áa]tica|habilidade/i.test(r.label.join(' '))) best = prev; best.rows.push(r); prev = best; }
          gs = by.filter((x) => x.rows.length).map((x) => Object.assign(x.rows, { cargoTxt: x.b.s }));
        } else gs = splitGroups(rows);
        for (const g of gs) {
          const cargoTxt = g.cargoTxt || g.map((r) => r.cargoTxt).filter(Boolean).join(' ') + ' ' + cb.map((b) => b.s).join(' ');
          cands.push({ rows: g, all: rows, ctx, cargoTxt, page: pn, cols: tb.cols, score: pontuaCandidato(ctx, cargoTxt, cargo, g, pai, T) });
        }
      }
    });
    const avisos = [];
    const best = cands.sort((p, q) => q.score - p.score)[0] || null;
    let prova = [], grupos = [], titulos = null, mg = null, extra = [], ttLido = null;
    if (best) {
      const seen = new Set();
      for (const r of best.rows) {
        let nome = titulo(cleanLabel(r.label.join(' '))) || cleanGrupo(r.grupoTxt || '') || '';
        const inl = /^((?:m[óo]dulo\s+[ivx\d]+|grupo\s+[ivx\d]+|parte\s+[ivx\d]+)\s*[:–-]?\s*(?:conhecimentos\s+(?:gerais|b[áa]sicos|espec[íi]ficos))?)\s+(.{3,})$/i.exec(nome);
        if (inl && !r.grupoTxt) { r.grupoTxt = inl[1]; nome = inl[2]; }
        if (/discursiv|reda[çc][ãa]o|estudo de caso|de acordo com|conforme (o )?item|pe[çc]a pr[áa]tica/i.test(nome)) continue;
        if (/^\d+$/.test(cleanGrupo(r.grupoTxt || '')) || /^objeto\b|^[a-zà-ú]/.test(nome)) continue;
        if (!nome || LABEL_STOP.test(nome)) continue;
        const v = r.vals, q = toNum(v.q);
        if (/t[ií]tulos/i.test(nome)) { titulos = toNum(v.t ?? v.tt ?? r.tot?.tt ?? v.mg ?? v.v ?? v.q); continue; }
        if (/pr[aá]tica|habilidade/i.test(nome)) { extra.push({ tipo: 'pratica', max: toNum(v.t ?? v.mg ?? v.q), carater: 'EC' }); continue; }
        if (!q || q > 150) continue;
        let peso = v.v !== undefined ? toNum(v.v) : null;
        const tot = v.t !== undefined ? toNum(v.t) : null;
        if ((peso === null || peso === 0) && tot) peso = r2(tot / q);
        if (peso === null) peso = 1;
        let minimo = 0, minimoEm = 'pontos';
        if (v['min-ac'] !== undefined) { minimo = toNum(v['min-ac']) || 0; minimoEm = 'acertos'; }
        else if (v['min-pt'] !== undefined) { minimo = toNum(v['min-pt']) || 0; minimoEm = 'pontos'; }
        else if (v['min-pct'] !== undefined) { minimo = toNum(v['min-pct']) || 0; minimoEm = 'pct'; }
        if (mg === null && (v.mg !== undefined || r.tot?.mg !== undefined)) mg = toNum(v.mg ?? r.tot.mg);
        if (v.tt !== undefined || r.tot?.tt !== undefined) ttLido = toNum(v.tt ?? r.tot.tt);
        const grupo = /^(objetiva|prova objetiva|total|teórico|te[óo]rico-objetiva)\b/i.test(cleanGrupo(r.grupoTxt || '')) ? '' : cleanGrupo(r.grupoTxt || '');
        const k = ascii(nome);
        if (seen.has(k)) nome += ' (2)';
        seen.add(k);
        prova.push({ nome, grupo: grupo && ascii(grupo) !== k ? grupo : '', questoes: q, peso, minimo, minimoEm });
      }
      /* total de pontos lido da última coluna (FUNDATEC: "Nº Pontos do total") para conferir */
      if (best.ctx && /exceto/i.test(best.ctx) && cargoRe(cargo).test(best.ctx)) avisos.push('o quadro escolhido cita o cargo numa exceção');
      if (best.score < 3) avisos.push('não achei o quadro específico do cargo; usei o mais provável');
    } else {
      /* sem tabela: distribuição escrita em texto ("a) Língua Portuguesa - 10 (dez) questões, cada questão com peso igual a 2") */
      const tx = T.replace(/\s+/g, ' ');
      const re = /(?:^|[;:.]\s|\b[a-h]\)\s)([A-ZÀ-Ú][^;:\d]{2,170}?)\s*[-–]\s*(\d{1,3}) \([^)]*\) quest(?:õ|o)es,?(?: cada quest(?:ã|a)o com peso igual a (\d{1,2}(?:,\d{1,2})?))?/g;
      let m2; while ((m2 = re.exec(tx))) prova.push({ nome: m2[1].replace(/,? para cada .*$/i, '').replace(/\s*\([^)]*\)/g, '').trim(), grupo: '', questoes: Number(m2[2]), peso: m2[3] ? toNum(m2[3]) : 1, minimo: 0, minimoEm: 'pontos' });
      if (prova.length) avisos.push('quadro montado a partir do texto do edital'); else avisos.push('não encontrei o quadro de provas');
    }
    const regras = regrasTexto(T, cargo);
    avisos.push(...regras.avisos);
    /* blocos: casa os mínimos do texto com os grupos das disciplinas */
    const nomesG = [...new Set(prova.map((d) => d.grupo).filter(Boolean))];
    if (regras.blocos && regras.blocos.length) {
      for (const b of regras.blocos) {
        const k = b.chave.replace('modulo ', 'modulo ');
        let g = nomesG.find((n) => ascii(n).includes(k) || (b.alt && ascii(n).includes(b.alt)));
        if (!g && /especific/.test(b.chave)) {
          /* sem coluna de grupo: Específicos = disciplinas de conhecimentos específicos, o resto = básicos/gerais */
          prova.forEach((d) => { if (!d.grupo) d.grupo = /espec[ií]fic/i.test(d.nome) ? 'Conhecimentos Específicos' : 'Conhecimentos Básicos'; });
          g = 'Conhecimentos Específicos';
        } else if (!g && /basicos|gerais|modulo i$|^p1$/.test(b.chave) && prova.some((d) => d.grupo)) g = nomesG.find((n) => !/espec/i.test(n));
        if (g && !grupos.some((x) => x.nome === g)) grupos.push({ nome: g, minimo: b.minimo, minimoEm: b.minimoEm });
      }
      for (const n of new Set(prova.map((d) => d.grupo).filter(Boolean))) if (!grupos.some((x) => x.nome === n) && regras.blocos.some((b) => /basicos|gerais|modulo i\b/.test(b.chave)) && !/espec/i.test(n)) { const b = regras.blocos.find((x) => /basicos|gerais|modulo i\b/.test(x.chave)); grupos.push({ nome: n, minimo: b.minimo, minimoEm: b.minimoEm }); }
    }
    if (regras.escala === 'media10' && !grupos.length && prova.length) {
      prova.forEach((d) => { if (!d.grupo) d.grupo = /espec[ií]fic/i.test(d.nome) ? 'Conhecimentos Específicos' : 'Conhecimentos Gerais'; });
    }
    if (regras.escala === 'media10') {
      const pe = /peso (\d) \([^)]*\) a nota da prova objetiva de conhecimentos gerais;? b?\)? ?peso (\d)/.exec(ascii(T.replace(/\s+/g, ' ')));
      for (const n of new Set(prova.map((d) => d.grupo).filter(Boolean))) { let g = grupos.find((x) => x.nome === n); if (!g) { g = { nome: n, minimo: 0, minimoEm: 'pontos' }; grupos.push(g); } if (pe) g.peso = /espec/i.test(n) ? Number(pe[2]) : Number(pe[1]); }
    }
    /* grupos sem mínimo também entram (a coluna Módulo/Área do quadro) */
    for (const n of new Set(prova.map((d) => d.grupo).filter(Boolean))) if (!grupos.some((x) => x.nome === n)) grupos.push({ nome: n, minimo: 0, minimoEm: 'pontos' });
    /* grupo que é só a disciplina (Legalle "Conhecimentos Específicos") não ajuda: tira */
    for (const g of grupos.slice()) { const ds = prova.filter((d) => d.grupo === g.nome); if (ds.length === 1 && !g.minimo && ascii(ds[0].nome) === ascii(g.nome)) { ds[0].grupo = ''; grupos.splice(grupos.indexOf(g), 1); } }
    if (grupos.length === 1 && !grupos[0].minimo) { prova.forEach((d) => { d.grupo = ''; }); grupos = []; }
    const etapas = (regras.etapas || []).slice();
    if (titulos && !etapas.some((x) => x.tipo === 'titulos')) etapas.push({ tipo: 'titulos', max: titulos, minimo: 0, carater: 'C' });
    for (const x of extra) if (x.max && !etapas.some((e) => e.tipo === x.tipo)) etapas.push(x);
    const totalPts = prova.reduce((s, d) => s + d.questoes * d.peso, 0);
    let minimoGeral = regras.minimoGeral ?? null, minimoGeralEm = regras.minimoGeralEm || 'pontos';
    if (mg !== null && mg > 0 && mg <= totalPts) { minimoGeral = mg; minimoGeralEm = 'pontos'; }
    if (minimoGeralEm === 'pontos' && minimoGeral !== null && totalPts && minimoGeral > totalPts) { avisos.push('mínimo geral maior que o total da prova; confira'); }
    /* conferências */
    if (prova.length && prova.every((d) => d.peso === 1) && totalPts && minimoGeral && minimoGeralEm === 'pontos' && minimoGeral > totalPts) minimoGeral = null;
    const nq = prova.reduce((s, d) => s + d.questoes, 0);
    if (prova.length && (nq < 10 || nq > 200)) avisos.push('número total de questões incomum (' + nq + ')');
    if (prova.some((d) => d.peso > 20)) avisos.push('valor por questão alto; confira a coluna');
    if (regras.escala === 'padronizada') avisos.push('nota padronizada: o app não calcula aprovação sozinho');
    const fases = fasesTexto(pages, anoBase);
    const ficha = fichaCargo(pages, cargo);
    let confianca = 'baixa';
    if (prova.length >= 2 && best && best.score >= 6 && !avisos.length) confianca = 'alta';
    else if (prova.length >= 2) confianca = 'média';
    const plan = {
      schema: 'meus-mapas/app-edital/v1',
      prova: prova.map((d, i) => ({ id: ascii(d.nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'd' + i, ...d, padrao: i === prova.length - 1 || /espec[ií]fic/i.test(d.nome) && !prova.slice(i + 1).some((x) => /espec[ií]fic/i.test(x.nome)) })),
      grupos, minimoGeral, minimoGeralEm,
      ...(regras.formato ? { formato: regras.formato } : {}), ...(regras.penalidade ? { penalidade: regras.penalidade } : {}), ...(regras.alternativas ? { alternativas: regras.alternativas } : {}),
      ...(regras.escala ? { escala: regras.escala } : {}), ...(regras.naoZerar ? { naoZerar: true } : {}),
      etapas, ...(regras.notaFinal ? { notaFinal: regras.notaFinal } : {}), ...(regras.pesoObjetiva !== undefined ? { pesoObjetiva: regras.pesoObjetiva } : {}),
      fases, cargo: ficha, fonte: best ? 'Lido do PDF do edital · quadro na p. ' + (best.page + 1) : 'Lido do PDF do edital',
      leitura: { em: new Date().toISOString(), confianca, avisos, cargoPai: pai || undefined, quadro: best ? { pagina: best.page + 1, contexto: best.ctx.slice(0, 160) } : null, candidatos: cands.length }
    };
    /* peso da objetiva/títulos na nota final ponderada vai para as etapas */
    if (regras.notaFinal === 'ponderada' && regras.pesoTitulos !== undefined) { let tt = plan.etapas.find((x) => x.tipo === 'titulos'); if (!tt && totalPts) { tt = { tipo: 'titulos', max: Math.round(totalPts * 100) / 100, minimo: 0, carater: 'C' }; plan.etapas.push(tt); } if (tt) tt.peso = regras.pesoTitulos; }
    if (plan.prova.filter((d) => d.padrao).length > 1) plan.prova.forEach((d, i, a) => { d.padrao = i === a.map((x) => x.padrao).lastIndexOf(true); });
    return plan;
  };

  /* categorias dos mapas do app que cada disciplina recebe (o resto cai na disciplina padrão, a de Específicos) */
  const CATS = [['Português', /portugu|l[ií]ngua portuguesa/i], ['Informática', /inform[áa]tica/i], ['Raciocínio lógico', /racioc[ií]nio|matem[áa]tica/i], ['Legislação e Administração', /legisla|direito|administra[çc][ãa]o p[úu]blica|[ée]tica|estatuto|lei org[âa]nica|normativos/i]];
  function categorizar(prova) {
    const usadas = new Set();
    for (const d of prova) {
      d.categorias = [];
      if (d.padrao) continue;
      for (const [cat, re] of CATS) if (re.test(d.nome) && !usadas.has(cat) && !/espec[ií]fic/i.test(d.nome)) { d.categorias.push(cat); usadas.add(cat); }
    }
    return prova;
  }
  const fmt = (n) => String(Math.round(Number(n || 0) * 100) / 100).replace('.', ',');
  function resumo(plan) {
    if (!plan || !plan.prova || !plan.prova.length) return 'Quadro de provas não encontrado no PDF.';
    const nq = plan.prova.reduce((s, d) => s + d.questoes, 0), pts = plan.prova.reduce((s, d) => s + d.questoes * d.peso, 0);
    const mg = plan.minimoGeral == null ? '' : ' · mínimo ' + (plan.minimoGeralEm === 'pct' ? fmt(plan.minimoGeral) + '%' : plan.minimoGeralEm === 'acertos' ? fmt(plan.minimoGeral) + ' acertos' : fmt(plan.minimoGeral) + ' pts');
    const et = (plan.etapas || []).map((x) => ' · ' + (x.tipo === 'titulos' ? 'títulos ' : x.tipo === 'pratica' ? 'prática ' : 'discursiva ') + fmt(x.max)).join('');
    return plan.prova.length + ' disciplinas · ' + nq + ' questões · ' + fmt(pts) + ' pontos' + mg + et + (plan.formato === 'certo-errado' ? ' · certo/errado' : '');
  }
  const _ler = lerEdital;
  lerEdital = function (pages, opts) { const p = _ler(pages, opts); categorizar(p.prova); return p; };
  const api = { lerEdital: (pages, opts) => lerEdital(pages, opts), regrasTexto, fasesTexto, colTipo, resumo, categorizar };
  root.MeusMapasEditalReader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
