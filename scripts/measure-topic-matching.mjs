#!/usr/bin/env node
/* V15.52 · F3 — mede quanto da recuperação pós-simulado consegue apontar um tópico de mapa.
   Usa a mesma regra do app (study-automation: tokenSet + topicMatchScore, corte >= 4) sobre:
   - os tópicos das questões de cada simulado publicado (campo "topic" no HTML do simulado);
   - os tópicos dos mapas no índice de busca (data/search-index.json; gere com scripts/build-search-index.mjs).
   Só lê arquivos. Saída: resumo por simulado e a lista dos tópicos sem correspondência (para ajustar títulos ou criar sinônimos).
   Uso: node scripts/measure-topic-matching.mjs [--json] [--cut=4] */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const CUT = Number((args.find((a) => a.startsWith('--cut=')) || '--cut=4').slice(6)) || 4;

const norm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();
const tokenSet = (v) => new Set(norm(v).split(/\s+/).filter((w) => w.length > 2));
const score = (label, item) => {
  const a = tokenSet(label), b = tokenSet([item.title, item.label, item.section, item.branch, item.mapCode].filter(Boolean).join(' '));
  let s = 0;
  for (const w of a) if (b.has(w)) s += w.length >= 8 ? 4 : 2;
  return s;
};

const indexPath = path.join(ROOT, 'data/search-index.json');
if (!fs.existsSync(indexPath)) { console.error('data/search-index.json não existe. Rode antes: node scripts/build-search-index.mjs'); process.exit(2); }
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const topics = (index.items || []).filter((i) => i.topicId);
const sims = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/simulados.json'), 'utf8')).simulations || [];

const report = [];
for (const sim of sims) {
  const file = path.join(ROOT, sim.href || '');
  if (!sim.href || !fs.existsSync(file)) { report.push({ id: sim.id, error: 'arquivo não encontrado' }); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const labels = [...html.matchAll(/"topic"\s*:\s*"((?:[^"\\]|\\.){1,200})"/g)].map((m) => { try { return JSON.parse('"' + m[1] + '"'); } catch { return m[1]; } });
  const unique = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  const pool = topics.filter((t) => !sim.courseId || t.courseId === sim.courseId);
  const rows = unique.map((label) => {
    let best = null;
    for (const t of pool) { const s = score(label, t); if (!best || s > best.s) best = { s, t }; }
    return { label, score: best?.s || 0, map: best?.t?.mapCode || '', topic: best?.t?.title || '', matched: (best?.s || 0) >= CUT };
  });
  const hit = rows.filter((r) => r.matched).length;
  report.push({ id: sim.id, title: sim.title, questionsWithTopic: labels.length, uniqueTopics: unique.length, matched: hit, coverage: unique.length ? Math.round((hit / unique.length) * 100) : 0, unmatched: rows.filter((r) => !r.matched).map((r) => r.label), rows });
}

if (asJson) { console.log(JSON.stringify({ cut: CUT, mapTopics: topics.length, report }, null, 2)); process.exit(0); }
console.log('Correspondência tópico de simulado → tópico de mapa (corte ' + CUT + ', ' + topics.length + ' tópicos de mapa no índice)\n');
for (const r of report) {
  if (r.error) { console.log('· ' + r.id + ': ' + r.error); continue; }
  console.log('· ' + r.title + ': ' + r.matched + '/' + r.uniqueTopics + ' tópicos distintos com correspondência (' + r.coverage + '%) · ' + r.questionsWithTopic + ' questões com tópico');
  if (r.unmatched.length) console.log('  sem correspondência: ' + r.unmatched.slice(0, 25).join(' | ') + (r.unmatched.length > 25 ? ' | …' : ''));
}
const tot = report.filter((r) => !r.error).reduce((a, r) => ({ u: a.u + r.uniqueTopics, m: a.m + r.matched }), { u: 0, m: 0 });
console.log('\nTotal: ' + tot.m + '/' + tot.u + ' (' + (tot.u ? Math.round((tot.m / tot.u) * 100) : 0) + '%)');
