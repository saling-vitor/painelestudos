// Resumo dos testes Playwright para o painel da execução ($GITHUB_STEP_SUMMARY).
// Uso: node scripts/ci-summary.mjs <resultado.json> "<rótulo>"
import fs from 'node:fs';
const [file, label = 'E2E'] = process.argv.slice(2);
let data;
try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { console.log(`### ${label}\n\nSem relatório JSON (a execução parou antes dos testes).`); process.exit(0); }
const out = { passed: 0, failed: 0, flaky: 0, skipped: 0 }; const failures = [];
const walk = (suite, trail = []) => {
  for (const s of suite.suites || []) walk(s, [...trail, s.title]);
  for (const spec of suite.specs || []) for (const t of spec.tests || []) {
    const st = t.status; // expected | unexpected | flaky | skipped
    if (st === 'expected') out.passed++; else if (st === 'flaky') out.flaky++; else if (st === 'skipped') out.skipped++;
    else { out.failed++; failures.push([...trail, spec.title].filter(Boolean).join(' › ')); }
  }
};
for (const s of data.suites || []) walk(s, []);
const mins = ((data.stats?.duration || 0) / 60000).toFixed(1);
console.log(`### ${label}\n\n| Aprovados | Falharam | Instáveis | Pulados | Duração |\n| --- | --- | --- | --- | --- |\n| ${out.passed} | ${out.failed} | ${out.flaky} | ${out.skipped} | ${mins} min |`);
if (failures.length) console.log('\n**Falhas:**\n\n' + failures.slice(0, 30).map((f) => '- ' + f).join('\n'));
