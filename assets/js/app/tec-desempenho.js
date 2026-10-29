'use strict';
/* MEUS MAPAS · V15.63 · leitura da planilha de desempenho do TEC Concursos (Estatísticas › Desempenho › exportar).
   Aceita o .xlsx exportado (descompactado aqui mesmo, sem biblioteca externa) e .csv.
   Colunas esperadas: Hierarquia · índice (matéria/assunto) · Questões Resolvidas · Acertos (%) · Quantidade de acertos ·
   Erros (%) · Quantidade de erros. Linhas sem hierarquia são matérias; "01", "02.01"… são assuntos da matéria acima.
   Funções puras (exceto a descompactação, que usa DecompressionStream): rodam no navegador e nos testes em Node. */
(function (root) {
  const norm = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();
  const num = (v) => { if (typeof v === 'number') return v; const s = String(v ?? '').replace(/\s|%/g, ''); const n = Number(/,\d+$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s); return Number.isFinite(n) ? n : 0; };

  /* ---------- zip mínimo (só leitura): diretório central + deflate-raw ---------- */
  async function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador não abre .xlsx; exporte em .csv.');
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }
  async function unzip(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Arquivo não é uma planilha .xlsx válida.');
    const n = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {}, dec = new TextDecoder();
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      files[name] = { method, csize, lo };
    }
    return {
      names: Object.keys(files),
      async bytes(name) {
        const f = files[name];
        if (!f) return null;
        const start = f.lo + 30 + dv.getUint16(f.lo + 26, true) + dv.getUint16(f.lo + 28, true), raw = u8.subarray(start, start + f.csize);
        const data = f.method === 0 ? raw.slice() : f.method === 8 ? await inflate(raw) : null;
        if (!data) throw new Error('Compressão do arquivo não suportada.');
        return data;
      },
      async text(name) { const b = await this.bytes(name); return b ? new TextDecoder().decode(b) : null; }
    };
  }
  const unxml = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
  const tTexts = (x) => { let s = ''; x.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (m, t) => { s += unxml(t); return m; }); return s; };
  const colIdx = (ref) => { const L = String(ref).replace(/\d+/g, ''); let n = 0; for (const ch of L) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  /* primeira planilha → linhas de células (texto ou número) */
  async function xlsxRows(buf) {
    const z = await unzip(buf);
    const sst = [];
    const ss = await z.text('xl/sharedStrings.xml');
    if (ss) ss.replace(/<si>([\s\S]*?)<\/si>/g, (m, si) => { sst.push(tTexts(si)); return m; });
    let sheet = 'xl/worksheets/sheet1.xml';
    if (!z.names.includes(sheet)) sheet = z.names.filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n)).sort()[0];
    const xml = sheet ? await z.text(sheet) : null;
    if (!xml) throw new Error('A planilha não tem abas legíveis.');
    const rows = [];
    xml.replace(/<row\b[^>]*>([\s\S]*?)<\/row>/g, (m, body) => {
      const r = [];
      body.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (m2, attrs, inner = '') => {
        const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1], t = /\bt="([^"]+)"/.exec(attrs)?.[1] || 'n';
        const i = ref ? colIdx(ref) : r.length;
        let v = null;
        if (t === 'inlineStr') v = tTexts(inner);
        else { const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]; if (raw !== undefined) v = t === 's' ? sst[+raw] ?? '' : t === 'str' || t === 'b' || t === 'e' ? unxml(raw) : Number(raw); }
        r[i] = v;
        return m2;
      });
      rows.push(Array.from({ length: r.length }, (_, i) => (r[i] === undefined ? null : r[i])));
      return m;
    });
    return rows;
  }
  /* CSV com ; , ou tab, aspas opcionais */
  function csvRows(text) {
    const t = String(text || '').replace(/^﻿/, ''), first = t.split(/\r?\n/, 1)[0] || '';
    const sep = [';', '\t', ','].map((c) => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = [];
    let row = [], cur = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
      if (ch === '"') q = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim())).map((r) => r.map((c) => { const s = String(c).trim(); return s === '' ? null : !/^0\d/.test(s) && !/^\d{2}(\.\d{2})+$/.test(s) && /^-?[\d.]+(,\d+)?%?$|^-?\d+(\.\d+)?%?$/.test(s) ? num(s) : s; }));
  }

  /* ---------- linhas → matérias e assuntos ---------- */
  function colunas(header) {
    const h = header.map(norm), find = (re, not) => h.findIndex((x) => re.test(x) && !(not && not.test(x)));
    const c = {
      hier: find(/hierarq/),
      nome: find(/^indice$|assunto|materia|^nome|disciplina/),
      q: find(/quest.*resolv|^resolvidas|^questoes$|^total/),
      acN: find(/quantidade de acertos|^acertos$|^n.? acertos/),
      acP: find(/acertos.*%|% acertos|aproveitamento/),
      erN: find(/quantidade de erros|^erros$/)
    };
    if (c.nome < 0) c.nome = h.findIndex((x, i) => i !== c.hier && x);
    return c.nome >= 0 && c.q >= 0 && (c.acN >= 0 || c.acP >= 0) ? c : null;
  }
  function parseRows(rows) {
    const hi = rows.findIndex((r) => r && colunas(r || []));
    if (hi < 0) throw new Error('Não achei as colunas do TEC (índice, Questões Resolvidas, Acertos). Exporte de Estatísticas › Desempenho.');
    const c = colunas(rows[hi]), materias = [];
    let cur = null;
    for (const r of rows.slice(hi + 1)) {
      if (!r) continue;
      const nome = String(r[c.nome] ?? '').replace(/\s+/g, ' ').trim(), hier = c.hier >= 0 ? String(r[c.hier] ?? '').trim() : '';
      const q = Math.round(num(r[c.q]));
      if (!nome || !q) continue;
      let a = c.acN >= 0 && r[c.acN] !== null && r[c.acN] !== undefined ? Math.round(num(r[c.acN])) : Math.round((q * num(r[c.acP])) / 100);
      a = Math.max(0, Math.min(q, a));
      const e = c.erN >= 0 && r[c.erN] !== null && r[c.erN] !== undefined ? Math.max(0, Math.min(q - a, Math.round(num(r[c.erN])))) : q - a;
      /* "Sem Classificação" sem hierarquia logo abaixo de uma matéria é um assunto dela, não uma matéria nova */
      if (!hier && cur && /^sem classifica/i.test(norm(nome))) { cur.s.push({ h: 'sc', n: 'Sem classificação', q, a, e }); continue; }
      if (!hier) { cur = { n: nome, q, a, e, s: [] }; materias.push(cur); continue; }
      if (!cur) { cur = { n: 'Sem matéria', q: 0, a: 0, e: 0, s: [], soma: true }; materias.push(cur); }
      cur.s.push({ h: hier, n: nome, q, a, e });
    }
    /* sem linhas de matéria (CSV de um só nível): soma dos assuntos de primeiro nível */
    for (const m of materias) if (m.soma) { const top = m.s.filter((x) => !x.h.includes('.')); m.q = top.reduce((s, x) => s + x.q, 0); m.a = top.reduce((s, x) => s + x.a, 0); m.e = top.reduce((s, x) => s + x.e, 0); delete m.soma; }
    /* mesma matéria repetida no arquivo: junta */
    const by = new Map();
    for (const m of materias) { const k = norm(m.n); const o = by.get(k); if (o) { o.q += m.q; o.a += m.a; o.e += m.e; o.s.push(...m.s); } else by.set(k, m); }
    const list = [...by.values()].filter((m) => m.q > 0).sort((x, y) => y.q - x.q);
    if (!list.length) throw new Error('A planilha não tem questões resolvidas.');
    const q = list.reduce((s, m) => s + m.q, 0), a = list.reduce((s, m) => s + m.a, 0), e = list.reduce((s, m) => s + m.e, 0);
    return { total: { q, a, e }, materias: list };
  }
  async function lerArquivo(file) {
    const name = String(file?.name || ''), buf = await file.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isZip = u8[0] === 0x50 && u8[1] === 0x4b;
    const rows = isZip ? await xlsxRows(u8) : csvRows(new TextDecoder(/�/.test(new TextDecoder().decode(u8.subarray(0, 4000))) ? 'windows-1252' : 'utf-8').decode(u8));
    return { arquivo: name, ...parseRows(rows) };
  }
  /* assuntos com nível: "02" = 1, "02.01" = 2; "sc" = 1 */
  const nivel = (h) => (h === 'sc' ? 1 : String(h).split('.').length);
  const taxa = (x) => (x && x.q ? x.a / x.q : null);
  /* diferença entre duas leituras: o que foi feito entre elas (questões novas e acerto só nelas) */
  function delta(novo, velho) {
    if (!novo || !velho) return null;
    const vm = new Map((velho.materias || []).map((m) => [norm(m.n), m]));
    const materias = (novo.materias || []).map((m) => { const o = vm.get(norm(m.n)) || { q: 0, a: 0 }; const dq = m.q - o.q, da = m.a - o.a; return { n: m.n, dq, da, antes: taxa(o), agora: taxa(m), recente: dq > 0 ? da / dq : null }; }).filter((x) => x.dq > 0);
    const dq = novo.total.q - velho.total.q, da = novo.total.a - velho.total.a;
    return { dq, da, recente: dq > 0 ? da / dq : null, antes: taxa(velho.total), agora: taxa(novo.total), materias: materias.sort((x, y) => y.dq - x.dq) };
  }
  const api = { unzip, xlsxRows, csvRows, parseRows, lerArquivo, nivel, taxa, delta, norm };
  root.MeusMapasTec = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
