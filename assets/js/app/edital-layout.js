'use strict';
/* MEUS MAPAS · V15.62 · texto do edital com o desenho das tabelas.
   O pdf.js entrega trechos soltos (às vezes um por caractere) com posição. Aqui eles viram linhas na ordem de leitura,
   cada linha com suas células (x inicial e final), para o leitor do edital achar colunas de tabela pela posição.
   Funções puras: rodam iguais no navegador e nos testes em Node. */
(function (root) {
  function layoutLines(items) {
    const its = [];
    for (const it of items || []) {
      const s = it && it.str;
      if (!s || !it.transform || !s.trim() && !(it.width > 0)) continue;
      const h = Math.abs(it.transform[3]) || Math.abs(it.height) || 8;
      its.push({ s, x: it.transform[4], y: it.transform[5], w: Math.abs(it.width) || s.length * h * 0.5, h });
    }
    if (!its.length) return [];
    /* linhas: mesma altura dentro de ~45% do corpo da letra */
    its.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    for (const it of its) {
      const L = rows.length ? rows[rows.length - 1] : null;
      if (L && Math.abs(L.y - it.y) <= Math.max(2, Math.min(L.h, it.h) * 0.45)) { L.items.push(it); L.h = Math.max(L.h, it.h); }
      else rows.push({ y: it.y, h: it.h, items: [it] });
    }
    const out = [];
    for (const L of rows) {
      L.items.sort((a, b) => a.x - b.x);
      /* células: trechos separados por mais de ~1,3 largura de caractere (um espaço comum fica abaixo disso) */
      const cells = [];
      let cur = null;
      for (const it of L.items) {
        const ch = it.h * 0.5;
        if (!it.s.trim()) { if (cur) cur.sp = true; continue; }
        if (cur) {
          const gap = it.x - cur.x2;
          if (gap > ch * 1.3) { cells.push(cur); cur = null; }
          else { cur.s += (gap > ch * 0.25 || cur.sp) && !/\s$/.test(cur.s) ? ' ' + it.s : it.s; cur.x2 = Math.max(cur.x2, it.x + it.w); cur.sp = false; continue; }
        }
        cur = { x: it.x, x2: it.x + it.w, s: it.s, sp: false };
      }
      if (cur) cells.push(cur);
      const cl = cells.map((c) => ({ x: Math.round(c.x * 10) / 10, x2: Math.round(c.x2 * 10) / 10, s: c.s.normalize('NFC').replace(/\s+/g, ' ').trim() })).filter((c) => c.s);
      if (!cl.length) continue;
      let text = '';
      cl.forEach((c, i) => { text += i ? (c.x - cl[i - 1].x2 > L.h * 0.5 * 2.2 ? '   ' : ' ') + c.s : c.s; });
      out.push({ y: Math.round(L.y * 10) / 10, h: L.h, cells: cl, text });
    }
    return out;
  }
  const layoutPage = (items) => layoutLines(items).map((l) => l.text).join('\n');
  const api = { layoutLines, layoutPage };
  root.MeusMapasEditalLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
