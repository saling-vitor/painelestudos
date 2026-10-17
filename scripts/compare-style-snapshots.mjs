// Compara dois conjuntos de snapshots de estilo computado gravados pela suíte de auditoria (AUDIT_OUT).
// Saída em Markdown: por tela e viewport, quantos elementos mudaram de estilo ou geometria.
// Uso: node scripts/compare-style-snapshots.mjs <pasta-base> <pasta-nova>
import fs from 'node:fs'; import path from 'node:path';
const [a, b] = process.argv.slice(2);
const list = (d) => { const out = []; const walk = (p) => { if (!fs.existsSync(p)) return; for (const f of fs.readdirSync(p)) { const q = path.join(p, f); fs.statSync(q).isDirectory() ? walk(q) : f.endsWith('.json') && out.push(path.relative(d, q)); } }; walk(path.join(d, 'styles')); return out.map((f) => 'styles/' + f.replace(/^styles\//, '')); };
const files = [...new Set([...list(a), ...list(b)])].sort();
if (!files.length) { console.log('### Comparação visual\n\nNenhum snapshot gerado (ver o log do job).'); process.exit(0); }
const rows = []; let total = 0, changed = 0;
for (const f of files) {
  const pa = path.join(a, f.replace(/^styles\//, 'styles/')), pb = path.join(b, f);
  if (!fs.existsSync(pa) || !fs.existsSync(pb)) { rows.push(`| ${f.replace('styles/', '').replace('.json', '')} | — | ausente em ${fs.existsSync(pa) ? 'PR' : 'main'} |`); continue; }
  const A = JSON.parse(fs.readFileSync(pa, 'utf8')), B = JSON.parse(fs.readFileSync(pb, 'utf8'));
  const keys = new Set([...Object.keys(A), ...Object.keys(B)]); const diff = [...keys].filter((k) => A[k] !== B[k]).length;
  total += keys.size; changed += diff; rows.push(`| ${f.replace('styles/', '').replace('.json', '')} | ${keys.size} | ${diff} |`);
}
console.log(`### Comparação visual com a main (informativa)\n\n${changed} de ${total} elementos mudaram de estilo ou posição. Diferenças pequenas podem ser estados transitórios (sincronização, relógio); as capturas estão no artefato \`comparacao-visual\`.\n\n| Tela / viewport | Elementos | Mudaram |\n| --- | --- | --- |\n${rows.join('\n')}`);
