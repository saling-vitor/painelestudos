// Analisador de declarações CSS comprovadamente sobrescritas (dominância pareada na cascata).
// Uma declaração D1 (seletor-lista L1, contexto C1, propriedade P, importância I1) é morta se,
// para CADA seletor s de L1, existe uma declaração posterior D2 com: s ∈ L2, propriedade P idêntica,
// contexto C2 ⊆ C1 (todas as condições @media/@supports de D2 também envolvem D1), I2 >= I1,
// L2 sem seletores de risco (prefixos de fornecedor) e valor de D2 igual ao de D1 ou sem sintaxe
// que algum navegador alvo possa descartar no parse. Sem @layer, sem @import, mesma origem.
// Uso: npm run audit:css            → relatório sobre as folhas ligadas no index.html, na ordem real
//      npm run audit:css -- --apply → remove as declarações mortas (SHORTHAND=1 inclui dominância por shorthand)
import fs from 'fs'; import path from 'path';
import postcss from 'postcss'; import selParser from 'postcss-selector-parser';

const args = process.argv.slice(2); const apply = args.includes('--apply');
const root = process.cwd();
const files = args.filter(a => a !== '--apply').length ? args.filter(a => a !== '--apply') : [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<link[^>]+href="(assets\/css\/[^"?]+\.css)/g)].map(m => m[1]);

const norm = s => { let out = '', q = null; for (const ch of s) { if (q) { out += ch; if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") { q = ch; out += ch; continue; } out += ch; } return out; };
function normSel(s) { // espaço fora de aspas
  let out = '', q = null, ws = false;
  for (const ch of s.trim()) {
    if (q) { out += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { if (ws) { out += ' '; ws = false; } q = ch; out += ch; continue; }
    if (/\s/.test(ch)) { ws = true; continue; }
    if (ws) { if (!/[>+~,)]/.test(ch) && !/[>+~,(]$/.test(out)) out += ' '; ws = false; }
    out += ch;
  }
  return out.replace(/\s*([>+~])\s*/g, '$1');
}
function splitSelectors(sel) { const list = []; try { selParser(r => { r.each(s => list.push(normSel(String(s)))); }).processSync(sel); } catch { return null; } return list; }
const normAt = n => '@' + n.name.toLowerCase() + ' ' + n.params.replace(/\s+/g, ' ').replace(/\s*([:(),])\s*/g, '$1').trim().toLowerCase();
const RISKY_SEL = /-webkit-|-moz-|-ms-|:-/i;
const RISKY_VAL = /\b(?:\d*\.?\d+)(?:dvh|svh|lvh|dvw|svw|lvw|dvb|svb|lvb|dvi|svi|lvi|cqw|cqh|cqi|cqb|cqmin|cqmax|rlh|lh|ic|cap)\b|env\(|color-mix\(|oklch\(|oklab\(|\blch\(|\blab\(|light-dark\(|clamp\(|\bmin\(|\bmax\(|round\(|mod\(|rem\(|fit-content|\bclip\b|image-set\(|-webkit-|-moz-|anchor|from\s|calc-size|\bsubgrid\b|\bmasonry\b|\bbalance\b|\bpretty\b|\bstable\b|\bcontents\b|\bstart\b|\bend\b|\bdynamic-range|\bpaint\(/i;
const SIDES=['top','right','bottom','left'];
const SH = {
 background:['background-color','background-image','background-position','background-position-x','background-position-y','background-size','background-repeat','background-attachment','background-origin','background-clip'],
 padding:SIDES.map(x=>'padding-'+x), margin:SIDES.map(x=>'margin-'+x), inset:SIDES.slice(),
 'border-radius':['border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius'],
 gap:['row-gap','column-gap'], overflow:['overflow-x','overflow-y'],
 'border-width':SIDES.map(x=>'border-'+x+'-width'),'border-style':SIDES.map(x=>'border-'+x+'-style'),'border-color':SIDES.map(x=>'border-'+x+'-color'),
 outline:['outline-width','outline-style','outline-color'], flex:['flex-grow','flex-shrink','flex-basis'],
 font:['font-style','font-variant','font-weight','font-stretch','font-size','line-height','font-family'],
 transition:['transition-property','transition-duration','transition-timing-function','transition-delay'],
 'place-items':['align-items','justify-items'],'place-content':['align-content','justify-content'],'place-self':['align-self','justify-self'],
};
for(const x of SIDES) SH['border-'+x]=['border-'+x+'-width','border-'+x+'-style','border-'+x+'-color'];
SH.border=[...SH['border-width'],...SH['border-style'],...SH['border-color'],'border-width','border-style','border-color',...SIDES.map(x=>'border-'+x)];
const COVERS={}; for(const [sh,ls] of Object.entries(SH)) for(const l of ls) (COVERS[l]=COVERS[l]||[]).push(sh);
const SKIP_PARENT = /^(keyframes|-webkit-keyframes|font-face|page|property|counter-style|font-feature-values|layer|scope|starting-style)$/i;

// 1) parse e indexação na ordem real da cascata
const sheets = files.map(f => ({ f, rootNode: postcss.parse(fs.readFileSync(path.join(root, f), 'utf8'), { from: f }) }));
const decls = []; // ordem global
for (const sh of sheets) sh.rootNode.walkDecls(d => {
  const rule = d.parent; if (!rule || rule.type !== 'rule') return;
  let ctx = [], p = rule.parent, skip = false;
  while (p && p.type !== 'root') { if (p.type === 'atrule') { if (SKIP_PARENT.test(p.name) || !/^(media|supports|container)$/i.test(p.name)) skip = true; ctx.push(normAt(p)); } else if (p.type === 'rule') skip = true; p = p.parent; }
  if (skip) return;
  const sels = splitSelectors(rule.selector); if (!sels) return;
  decls.push({ d, f: sh.f, sels, ctx, prop: d.prop.startsWith('--') ? d.prop : d.prop.toLowerCase(), imp: !!d.important, val: d.value.replace(/\s+/g, ' ').trim(), riskySel: sels.some(s => RISKY_SEL.test(s)) });
});
// 2) varredura reversa: índice (seletor|prop) -> lista de dominantes posteriores
const later = new Map(); let dead = [];
for (let i = decls.length - 1; i >= 0; i--) {
  const x = decls[i];
  const dom = (y, sameProp) => (y.imp || !x.imp) && y.ctx.every(c => x.ctx.includes(c)) && !y.riskySel && (sameProp ? (y.val === x.val || x.prop.startsWith('--') || !RISKY_VAL.test(y.val)) : (!RISKY_VAL.test(y.val) && !/\bvar\(|\binherit\b|\bunset\b|\brevert/.test(y.val)));
  const covered = x.sels.every(s => (later.get(s + '\u0000' + x.prop) || []).some(y => dom(y, true)) || (process.env.SHORTHAND && (COVERS[x.prop] || []).some(sh => (later.get(s + '\u0000' + sh) || []).some(y => dom(y, false)))));
  if (covered) dead.push(x);
  for (const s of x.sels) { const k = s + '\u0000' + x.prop; if (!later.has(k)) later.set(k, []); later.get(k).push(x); }
}
// 3) relatório
const byFile = {}; for (const x of dead) { byFile[x.f] = byFile[x.f] || { n: 0, imp: 0 }; byFile[x.f].n++; if (x.imp) byFile[x.f].imp++; }
const total = decls.length; console.log(JSON.stringify({ analisadas: total, mortas: dead.length, importantMortos: dead.filter(x => x.imp).length, porArquivo: byFile }, null, 1));
if (apply) {
  for (const x of dead) x.d.remove();
  for (const sh of sheets) {
    let changed = true; while (changed) { changed = false; sh.rootNode.walk(n => { if ((n.type === 'rule' || (n.type === 'atrule' && /^(media|supports|container)$/i.test(n.name))) && n.nodes && n.nodes.filter(c => c.type !== 'comment').length === 0) { n.remove(); changed = true; } }); }
    fs.writeFileSync(path.join(root, sh.f), sh.rootNode.toString());
  }
}
