import { test, expect } from '@playwright/test';
import { setupPrancha, noRuntimeErrors } from './helpers/prancha-mock.mjs';

/* V15.67 · mapa → disciplina: leis citadas só pelo número no edital, aprendizado entre cursos e menu na sigla */
test.use({ storageState: { cookies: [], origins: [] } });
const row = (course) => ([code, title, category, short = ''], i) => ({ id: course + i, user_id: 'e2e-user', course_id: course, code, title, short_title: short, topics: 5, branches: 1, category, accent: 'auto', filename: code + '.html', storage_path: 'e2e-user/' + course + '/' + code, storage_id: '', created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' });
const CASAN = [['ANAREG', 'Agência Nacional de Águas e Regulação', 'Infraestrutura e Mobilidade Urbana', 'ANA e Regulação'], ['ATUSOC', 'Atualidades de urbanização e agenda social', 'Conhecimentos Gerais e Atualidades', 'Agenda social contemporânea'], ['IGRAC', 'Estatuto da Igualdade Racial', 'Outros', 'Lei 12.288/2010']].map(row('casan'));

test('Raio-X [G] · os mapas reais da CASAN caem nas disciplinas certas', async ({ page }) => {
  const g = 'Conhecimentos Gerais e Atualidades';
  const reais = [['ETICACID', 'Ética e cidadania', g, 'Ética e cidadania'], ['HISTGEOSC', 'História e Geografia de Santa Catarina', g, 'História e Geografia de SC'], ['HISTBR', 'História do Brasil', g, 'História do Brasil'], ['GEOBR', 'Geografia do Brasil', g, 'Geografia do Brasil'], ['AMBCLIMA', 'Ambiente e clima', 'Meio Ambiente e Sustentabilidade', 'Ambiente e clima'], ['RELINT', 'Relações internacionais', g, 'Relações internacionais'], ['ATUPOL', 'Atualidades de política, economia e globalização', g, 'Política e economia atual'], ['ATUSOC', 'Atualidades de urbanização e agenda social', g, 'Agenda social contemporânea'], ['ANAREG', 'Agência Nacional de Águas e Regulação', 'Infraestrutura e Mobilidade Urbana', 'ANA e Regulação']].map(row('casan'));
  await setupPrancha(page, { courses: [{ id: 'casan', title: 'CASAN', board: 'Instituto AOCP', examOffset: 24 }], extraMaps: reais });
  const r = await page.evaluate(async () => {
    const E = window.Prancha.editais, pages = await (await fetch('tests/fixtures/edital-casan-paginas.json')).json();
    E.importKit('casan', JSON.stringify(window.MeusMapasEditalReader.lerEdital(pages, { cargo: 'Arquiteto' })));
    const out = {}; for (const m of combinedMaps().filter((x) => x.courseId === 'casan' && /^[A-Z]{5,}$/.test(x.code) && x.code !== 'DEMHAB')) out[m.code] = E.disciplinaDoMapa(m, 'casan')?.id;
    return out;
  });
  const atu = 'conhecimentos-gerais-atualidades';
  expect(r).toMatchObject({ ETICACID: atu, HISTGEOSC: atu, HISTBR: atu, GEOBR: atu, AMBCLIMA: atu, RELINT: atu, ATUPOL: atu, ATUSOC: atu, ANAREG: 'legislacao' });
});

test('Raio-X [G] · lei citada pelo número leva o mapa à Legislação; a escolha feita vale para outro curso', async ({ page }) => {
  await setupPrancha(page, { courses: [{ id: 'casan', title: 'CASAN', board: 'Instituto AOCP', examOffset: 24 }, { id: 'ijui', title: 'Ijuí', board: 'FUNDATEC', examOffset: 50 }], extraMaps: [...CASAN, ...[['ANAREG', 'Águas do Brasil', 'Infraestrutura e Mobilidade Urbana']].map(row('ijui'))] });
  const r = await page.evaluate(async () => {
    const E = window.Prancha.editais;
    {
      const l = [...E.leisDe('1. Lei nº 9.984/2000, e suas alterações. 2. Lei Federal no 12.288/2010. 3. NBR 9050:2020 e 120 questões')];
      window.__leis = l;
    }
    const pages = await (await fetch('tests/fixtures/edital-casan-paginas.json')).json();
    E.importKit('casan', JSON.stringify(window.MeusMapasEditalReader.lerEdital(pages, { cargo: 'Arquiteto' })));
    E.set('ijui', { prova: [{ id: 'lp', nome: 'Língua Portuguesa', questoes: 10, peso: 1, categorias: ['Português'] }, { id: 'leg', nome: 'Legislação Municipal', questoes: 10, peso: 1, categorias: [] }, { id: 'esp', nome: 'Conhecimentos Específicos', questoes: 20, peso: 1, categorias: [], padrao: true }] });
    const ms = combinedMaps(), by = (c, k) => E.disciplinaDoMapa(ms.find((m) => m.code === k && m.courseId === c), c)?.id;
    return { leis: window.__leis, ana: by('casan', 'ANAREG'), igrac: by('casan', 'IGRAC'), atu: by('casan', 'ATUSOC'), ijuiAntes: by('ijui', 'ANAREG') };
  });
  expect(r.leis.sort()).toEqual([12288, 9984].sort());
  expect(r.ana).toBe('legislacao');
  expect(r.igrac).toBe('legislacao');
  expect(r.atu).toBe('conhecimentos-gerais-atualidades');
  expect(r.ijuiAntes).toBe('esp');
  /* Raio-X: a sigla mostra por que está ali e abre um menu para mover */
  await page.evaluate(() => openCourse('casan'));
  const rx = page.locator('.pr[data-prancha="course"] .pr-raiox-card');
  const leg = rx.locator('.pr-dsc', { hasText: 'Legislação' });
  const chip = leg.locator('button.pr-chip', { hasText: 'ANAREG' });
  await expect(chip).toHaveClass(/via-(lei|conteudo)/);
  await chip.click();
  await expect(leg.locator('[data-pr-menu-panel]:not([hidden])')).toContainText(/lei que o edital pede|programa do edital/);
  await leg.locator('[data-pr-menu-panel]:not([hidden]) button', { hasText: 'Fixar aqui' }).click();
  await expect.poll(() => page.evaluate(() => window.Prancha.editais.get('casan').mapaDisciplina?.ANAREG)).toBe('legislacao');
  /* aprendido: no outro curso a mesma sigla vai para a disciplina do mesmo tipo */
  const ij = await page.evaluate(() => { const E = window.Prancha.editais; return { apr: E.aprendidos().ANAREG, d: E.disciplinaDoMapa(combinedMaps().find((m) => m.code === 'ANAREG' && m.courseId === 'ijui'), 'ijui')?.id }; });
  expect(ij).toEqual({ apr: 'leg', d: 'leg' });
  noRuntimeErrors(page);
});
