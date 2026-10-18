import { test, expect } from '@playwright/test';
import { setupPrancha, seedProgress, go, screen, noRuntimeErrors, noHorizontalOverflow, mapRows } from './helpers/prancha-mock.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

const VIEWS = ['home', 'courses', 'maps', 'simulations', 'progress', 'agenda', 'settings'];

test.afterEach(async ({ page }, info) => {
  expect(noRuntimeErrors(page, info.project.name), 'sem erros de JavaScript').toEqual([]);
});

test('Prancha [G] · as sete páginas desenham a prancha com dados reais e sem rolagem lateral', async ({ page }) => {
  await setupPrancha(page);
  await seedProgress(page);
  for (const view of VIEWS) {
    await go(page, view);
    const root = page.locator('.pr[data-prancha="' + view + '"]');
    await expect(root.locator('.pr-carimbo').first()).toBeVisible();
    expect(await noHorizontalOverflow(page), 'overflow em ' + view).toEqual([]);
  }
  /* a soma de tópicos vem do catálogo real (408) e do progresso semeado (126 marcados) */
  await go(page, 'maps');
  await expect(page.locator('.pr[data-prancha="maps"] .pr-sub').first()).toContainText('126 de 408');
});

test('Início [G] · cinco telas com seletor, carimbo próprio e troca manual respeitada', async ({ page }) => {
  await setupPrancha(page);
  await seedProgress(page);
  await go(page, 'home');
  const home = page.locator('.pr[data-prancha="home"]');
  await expect(home).toHaveAttribute('data-screen', 'hoje');
  await expect(home.locator('.pr-carimbo .pr-k').first()).toContainText('DEMHAB');
  await expect(home.locator('.pr-carimbo .pr-pct').first()).toContainText('3');
  await expect(home.locator('.pr-tile')).toHaveCount(14);
  await screen(page, 'todos');
  await expect(home.locator('.pr-carimbo .pr-sub').first()).toContainText('126 de 408');
  await expect(home.locator('.pr-tl')).toBeVisible();
  await screen(page, 'rev');
  await expect(home.locator('.pr-carimbo .pr-k').first()).toContainText('Revisões');
  await expect(home.locator('.pr-rcal > div')).toHaveCount(7);
  await expect(home.locator('.pr-tab[data-arg="pos"]')).toBeDisabled();
  /* a escolha manual sobrevive a um novo desenho da Home */
  await page.evaluate(() => renderHome());
  await page.waitForTimeout(200);
  await expect(home).toHaveAttribute('data-screen', 'rev');
});

test('Início [G] · Em sessão usa o cronômetro real do app e não cria contagem paralela', async ({ page }) => {
  await setupPrancha(page);
  await go(page, 'home');
  await screen(page, 'sessao');
  const home = page.locator('.pr[data-prancha="home"]');
  await home.getByRole('button', { name: 'Sessão livre' }).click();
  await expect.poll(() => page.evaluate(() => !!StudyDashboard.active())).toBe(true);
  await expect(home).toHaveAttribute('data-screen', 'sessao');
  await expect(home.locator('[data-pr-clock]')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/pr-session-home/);
  await home.getByRole('button', { name: 'Pausar' }).click();
  await expect.poll(() => page.evaluate(() => StudyDashboard.active()?.running)).toBe(false);
  await home.getByRole('button', { name: 'Retomar' }).click();
  await expect.poll(() => page.evaluate(() => StudyDashboard.active()?.running)).toBe(true);
  /* Finalizar exige segundo toque */
  const fin = home.getByRole('button', { name: 'Finalizar' });
  await fin.click();
  expect(await page.evaluate(() => !!StudyDashboard.active())).toBe(true);
  await home.getByRole('button', { name: /Toque de novo/ }).click();
  await expect.poll(() => page.evaluate(() => !!StudyDashboard.active())).toBe(false);
  await page.evaluate(() => document.querySelector('.planner-modal')?.remove());
  const sessions = await page.evaluate(() => StudyDashboard.exportData().sessions.length);
  expect(sessions).toBe(1);
});

test('Início [G] · Pós-prova aparece depois da data, registra gabarito e não apaga dados', async ({ page }) => {
  await setupPrancha(page, { courses: [{ id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01 · Arquiteto', board: 'FUNDATEC', examOffset: -1 }] });
  await seedProgress(page);
  await go(page, 'home');
  const home = page.locator('.pr[data-prancha="home"]');
  await expect(home).toHaveAttribute('data-screen', 'pos');
  await expect(home.locator('.pr-carimbo .pr-k').first()).toContainText('Pós-prova · DEMHAB');
  const before = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('mindmap_state::')).length);
  await home.locator('form[data-pr-submit="save-gabarito"] input[name="correct"]').fill('41');
  await home.locator('form[data-pr-submit="save-gabarito"] input[name="total"]').fill('60');
  await home.locator('form[data-pr-submit="save-gabarito"] button[type="submit"]').click();
  await expect(home.locator('.pr-cell').filter({ hasText: 'Gabarito' })).toContainText('68%');
  const after = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('mindmap_state::')).length);
  expect(after).toBe(before);
  const store = await page.evaluate(() => Prancha.store.read().closures['porto-alegre']);
  expect(store.gabarito).toMatchObject({ correct: 41, total: 60 });
  /* "Manter ativo" dispensa a tela sem arquivar */
  await home.getByRole('button', { name: 'Manter ativo' }).click();
  await page.locator('#confirmAccept').click();
  await expect(home).not.toHaveAttribute('data-screen', 'pos');
  expect(await page.evaluate(() => combinedCourses()[0].status)).toBe('active');
});

test('Revisões [G] · adiar as do dia da prova move sem excluir', async ({ page }) => {
  await setupPrancha(page, { courses: [{ id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01', board: 'FUNDATEC', examOffset: 0 }] });
  await seedProgress(page);
  const result = await page.evaluate(() => {
    const sched = readReviewSchedule(), keys = combinedMaps().slice(0, 3).map((m) => m._key);
    const exam = new Date(); exam.setHours(12, 0, 0, 0);
    keys.forEach((k) => (sched[k] = { dueAt: exam.toISOString(), reason: 'review', lastReviewedAt: '', sourceModifiedAt: '' }));
    writeReviewSchedule(sched);
    const beforeKeys = Object.keys(readReviewSchedule());
    const r = Prancha.reviews.postponeExamDay();
    const after = readReviewSchedule();
    return { lost: beforeKeys.filter((k) => !after[k]), moved: r.moved, due: keys.map((k) => after[k].dueAt.slice(0, 10)) };
  });
  expect(result.moved).toBeGreaterThanOrEqual(3);
  /* nenhuma revisão existente desaparece (o app pode agendar outras em paralelo) */
  expect(result.lost).toEqual([]);
  const tomorrow = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); return d.toISOString().slice(0, 10); }); /* meio-dia local: mesma data em UTC a qualquer hora */
  for (const d of result.due) expect(d >= tomorrow.slice(0, 10) || d === tomorrow).toBeTruthy();
});

test('Cursos [G] · quadro por data da prova e curso com planta como menu, lista e capas', async ({ page }) => {
  await setupPrancha(page);
  await seedProgress(page);
  await go(page, 'courses');
  const list = page.locator('.pr[data-prancha="courses"]');
  await expect(list.locator('.pr-cr')).toHaveCount(1);
  await expect(list.locator('.pr-cr .pr-mini i')).toHaveCount(14);
  await list.locator('.pr-cr').getByRole('button', { name: 'Entrar' }).click();
  const course = page.locator('.pr[data-prancha="course"]');
  await expect(course).toBeVisible();
  await expect(course.locator('.pr-tile')).toHaveCount(14);
  await course.locator('.pr-tile[data-arg$="::cf88"]').click();
  await expect(course.locator('.pr-pick h3')).toContainText('Constituição');
  await course.locator('.pr-chipf[data-arg="completed"]').click();
  await expect(course.locator('.pr-tbl tbody tr')).toHaveCount(4);
  await course.locator('.pr-seg button[data-arg="capas"]').click();
  await expect(course.locator('[data-pr-legacy] .map-card').first()).toBeVisible();
  /* o card legado mantém o menu de gerenciamento */
  await expect(course.locator('[data-pr-legacy] [data-map-menu]').first()).toBeAttached();
  await course.locator('.pr-seg button[data-arg="lista"]').click();
  await expect(course.locator('.pr-tbl')).toBeVisible();
});

test('Todos os Mapas [G] · filtros com contagem, ordenação, três leituras e favorito persistente', async ({ page }) => {
  await setupPrancha(page);
  await seedProgress(page);
  await go(page, 'maps');
  const lib = page.locator('.pr[data-prancha="maps"]');
  await expect(lib.locator('.pr-chipf[data-arg="feito"] .pr-mono')).toHaveText('4');
  await lib.locator('.pr-chipf[data-arg="nao"]').click();
  await expect(lib.locator('.pr-gm')).toHaveCount(9);
  await lib.locator('.pr-chipf[data-arg="todos"]').first().click();
  await lib.locator('select[data-pr-input="sort"]').selectOption('tam');
  await expect(lib.locator('.pr-gm').first()).toContainText(/Constituição/);
  await lib.locator('.pr-tab[data-arg="lista"]').click();
  await expect(lib.locator('.pr-tbl tbody tr')).toHaveCount(14);
  await lib.locator('.pr-tab[data-arg="grupo"]').click();
  await expect(lib.locator('.pr-grph').first()).toBeVisible();
  await lib.locator('.pr-tab[data-arg="grade"]').click();
  const fav = lib.locator('.pr-gm .pr-fav').first();
  const key = await fav.getAttribute('data-arg');
  await fav.click();
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem('studyapp.favs') || '[]').includes(k), key)).toBe(true);
  await lib.locator('.pr-chipf[data-arg="fav"]').click();
  await expect(lib.locator('.pr-gm')).toHaveCount(1);
});

test('Mapas compartilhados [G] · vínculo aparece no outro concurso sem duplicar estado', async ({ page }) => {
  const extra = mapRows('trb').slice(0, 1).map((m) => ({ ...m, id: 'trb-1', code: 'TRBX', title: 'Mapa do Tribunal' }));
  await setupPrancha(page, { courses: [{ id: 'porto-alegre', title: 'DEMHAB Porto Alegre', subtitle: 'CP 01', board: 'FUNDATEC', examOffset: 3 }, { id: 'trb', title: 'TRB Tribunal', subtitle: 'Analista', board: 'FGV', examOffset: 90, createdAt: '2026-09-02T00:00:00.000Z' }], extraMaps: extra });
  await seedProgress(page);
  const r = await page.evaluate(() => {
    const cf = combinedMaps().find((m) => m.code === 'CF88');
    const statesBefore = Object.keys(localStorage).filter((k) => k.startsWith('mindmap_state::')).length;
    Prancha.links.link(cf._key, 'trb', true);
    const trb = Prancha.data.mapsForCourse('trb');
    const linked = trb.find((m) => m._key === cf._key);
    return { n: trb.length, linkedFrom: linked?._linkedFrom, pct: Prancha.data.prog(linked).marked, statesAfter: Object.keys(localStorage).filter((k) => k.startsWith('mindmap_state::')).length, statesBefore, own: Prancha.data.mapsForCourse('trb', { includeLinked: false }).length };
  });
  expect(r.n).toBe(2);
  expect(r.own).toBe(1);
  expect(r.linkedFrom).toBe('porto-alegre');
  expect(r.pct).toBe(44);
  expect(r.statesAfter).toBe(r.statesBefore);
});

test('Simulados [G] · resultado com corte declarado, disciplinas e gabarito por questão', async ({ page }) => {
  await setupPrancha(page);
  await page.evaluate(() => {
    const s = combinedSimulations()[0], k = s._key;
    const mk = (n, a) => ({ number: n, section: n <= 30 ? 'Legislação' : 'Arquitetura', topic: 'T' + n, userAnswer: a, answer: 'C' });
    const mistakes = [3, 7, 11, 40].map((n) => mk(n, 'A')).concat([59, 60].map((n) => mk(n, '')));
    const a = { score: 90, correct: 54, wrong: 4, blank: 2, total: 60, durationSeconds: 9000, finishedAt: new Date().toISOString(), sections: { 'Legislação': { correct: 27, total: 30 }, 'Arquitetura': { correct: 27, total: 30 } }, mistakes };
    state.simAttempts[k] = [a]; state.simResults[k] = a;
  });
  await go(page, 'simulations');
  const sims = page.locator('.pr[data-prancha="simulations"]');
  await sims.locator('[data-pr-act="cut-focus"]').click();
  await sims.locator('form[data-pr-submit="save-cut"] input[name="value"]').fill('75');
  await sims.locator('form[data-pr-submit="save-cut"] select[name="kind"]').selectOption('oficial');
  await sims.locator('form[data-pr-submit="save-cut"] button[type="submit"]').click();
  await expect(sims.locator('.pr-cell').filter({ hasText: 'Corte' })).toContainText('75%');
  await sims.locator('.pr-tab[data-arg="res"]').click();
  await expect(sims.locator('.pr-carimbo .pr-pct')).toContainText('90');
  await expect(sims.locator('.pr-verdict').first()).toContainText('Acima do corte de 75% (oficial)');
  await expect(sims.locator('.pr-qg button')).toHaveCount(60);
  await expect(sims.locator('.pr-qg button.er')).toHaveCount(4);
  await expect(sims.locator('.pr-qg button.ok')).toHaveCount(54);
  await sims.locator('.pr-qg button[data-arg="7"]').click();
  await expect(sims.locator('.pr-qg + .pr-detail')).toContainText('errada');
});

test('Progresso [G] · curva usa histórico diário gravado e não inventa dias anteriores', async ({ page }) => {
  await setupPrancha(page);
  await seedProgress(page);
  await page.evaluate(() => Prancha.history.record());
  await expect.poll(() => page.evaluate(() => Object.values(Prancha.history.read())[0]?.marked)).toBe(126);
  expect(await page.evaluate(() => Object.keys(Prancha.history.read()).length)).toBe(1);
  const h = await page.evaluate(() => Prancha.history.read());
  const day = Object.values(h)[0];
  expect(day.marked).toBe(126);
  expect(day.total).toBe(408);
  await go(page, 'progress');
  const prog = page.locator('.pr[data-prancha="progress"]');
  await expect(prog.locator('.pr-chart svg')).toBeVisible();
  await expect(prog).toContainText('dias anteriores não são reconstruídos');
  await expect(prog.locator('.pr-cell').filter({ hasText: 'Ritmo registrado' })).toBeVisible();
  await expect(prog.getByRole('button', { name: 'Matriz do edital' })).toBeVisible();
});

test('Agenda [G] · Dia, Semana e Mês; sessão com horário sem duplicar', async ({ page }) => {
  await setupPrancha(page);
  await go(page, 'agenda');
  const ag = page.locator('.pr[data-prancha="agenda"]');
  for (const m of ['dia', 'semana', 'mes']) {
    await ag.locator('.pr-tab[data-arg="' + m + '"]').click();
    await expect(ag.locator(m === 'dia' ? '.pr-dg' : m === 'semana' ? '.pr-wkg' : '.pr-mg')).toBeVisible();
  }
  await expect(ag.locator('.pr-mc.prova')).toHaveCount(1);
  const before = await page.evaluate(() => StudyDashboard.exportData().agenda.filter((x) => !x.deleted).length);
  await ag.locator('details.pr-add summary').click();
  await ag.locator('form[data-pr-submit="add"] input[name="start"]').fill('07:30');
  await ag.locator('form[data-pr-submit="add"] input[name="minutes"]').fill('45');
  await ag.locator('form[data-pr-submit="add"] button[type="submit"]').click();
  await expect.poll(() => page.evaluate(() => StudyDashboard.exportData().agenda.filter((x) => !x.deleted).length)).toBe(before + 1);
  const after = await page.evaluate(() => StudyDashboard.exportData().agenda.filter((x) => !x.deleted));
  const created = after[after.length - 1];
  expect(await page.evaluate((id) => Prancha.agenda.start(StudyDashboard.exportData().agenda.find((x) => x.id === id)), created.id)).toBe('07:30');
  await ag.locator('.pr-tab[data-arg="dia"]').click();
  await expect(ag.locator('.pr-blk').filter({ hasText: '07:30' })).toBeVisible();
});

test('Configurações [G] · sete folhas com os painéis reais e zona de risco com confirmação', async ({ page }) => {
  await setupPrancha(page);
  await go(page, 'settings');
  const st = page.locator('.pr[data-prancha="settings"]');
  await expect(st.locator('.pr-folha')).toHaveCount(7);
  await expect(st.locator('[data-pr-host="conta"] .sync-panel')).toBeAttached();
  await expect(st.locator('[data-pr-host="dados"] #downloadBackupBtn')).toBeAttached();
  await expect(st.locator('[data-pr-host="app"] #checkAppUpdateBtn')).toBeAttached();
  await expect(st.locator('[data-pr-host="adm"] .admin-panel')).toBeAttached();
  await expect.poll(() => st.locator('[data-pr-host="rotina"] #studyGoalsForm').count()).toBe(1);
  await expect.poll(() => st.locator('[data-pr-host="auto"] #studyAutomationPanel').count()).toBe(1);
  await expect(st.locator('.pr-toc a')).toHaveCount(8);
  const zr = st.locator('.pr-zr').getByRole('button', { name: 'Zerar hoje' });
  await zr.click();
  await expect(st.locator('.pr-zr .pr-btn.armed')).toHaveCount(1);
  await expect(page.locator('#confirmModal.open')).toHaveCount(0);
});

test('Sincronização [G] · preferências e backup carregam o estado das pranchas', async ({ page }) => {
  await setupPrancha(page);
  const r = await page.evaluate(() => {
    Prancha.sims.setCutoff('porto-alegre', 72, 'meta');
    const prefs = localPreferences();
    const backup = buildStudyBackup();
    const merged = window.mergePreferencePayloads({ prancha: { updatedAt: '2026-01-01T00:00:00.000Z', cutoffs: { 'course:x': { value: 50, kind: 'meta', updatedAt: '2026-01-01T00:00:00.000Z' } } } }, prefs, 1, 2);
    return { prefs: !!prefs.prancha?.cutoffs?.['course:porto-alegre'], backup: !!backup.data.prancha?.cutoffs?.['course:porto-alegre'], merged: Object.keys(merged.prancha.cutoffs).sort() };
  });
  expect(r.prefs).toBe(true);
  expect(r.backup).toBe(true);
  expect(r.merged).toEqual(['course:porto-alegre', 'course:x']);
});

test('Fluxo [G] · curso → mapa abre o Reader pela prancha, rota sobrevive a reload e voltar', async ({ page }) => {
  test.setTimeout(90000);
  await setupPrancha(page);
  await go(page, 'courses');
  await page.locator('.pr[data-prancha="courses"] [data-pr-act="open-course"]').first().click();
  await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);
  await expect(page).toHaveURL(/#course\//);
  const course = page.locator('.pr[data-prancha="course"]');
  await expect(course).toBeVisible();
  await course.locator('[data-pr-act="open-map"]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  await page.locator('#readerClose').click();
  await expect(page.locator('#reader')).not.toHaveClass(/open/);
  await page.reload();
  await expect(page.locator('[data-view="course"]')).toHaveClass(/active/);
  await expect(page.locator('.pr[data-prancha="course"]')).toBeVisible();
  /* voltar por histórico (no WebKit a troca de hash não dispara "load"). No WebKit móvel o Reader
     deixa entradas #map/… a mais no histórico — comportamento anterior às pranchas, igual na
     interface clássica —, por isso volta-se até sair do curso, no máximo quatro vezes. */
  for (let i = 0; i < 4 && (await page.evaluate(() => state.view)) === 'course'; i++) {
    await page.evaluate(() => history.back());
    await page.waitForTimeout(600);
  }
  await expect(page.locator('[data-view="course"]')).not.toHaveClass(/active/);
});

test('Fluxo [G] · Todos os Mapas e Início abrem o Reader; busca global continua funcionando', async ({ page }) => {
  test.setTimeout(90000);
  await setupPrancha(page);
  await go(page, 'maps');
  await page.locator('.pr[data-prancha="maps"] [data-pr-act="open-map"]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  await page.locator('#readerClose').click();
  await go(page, 'home');
  const home = page.locator('.pr[data-prancha="home"]');
  await expect(home.locator('[data-pr-act="open-map"]').first()).toBeVisible();
  await home.locator('[data-pr-act="open-map"]').first().click();
  await expect(page.locator('#reader')).toHaveClass(/open/);
  await page.locator('#readerClose').click();
  const input = page.locator('#globalSearch:visible');
  if (await input.count()) {
    await input.fill('demhab');
    await expect(page.locator('#globalSearchPanel [role="option"]').first()).toBeVisible();
  }
});

test('Configurações [G] · opção da interface clássica oculta, com caminho de volta preservado', async ({ page }) => {
  await setupPrancha(page);
  await go(page, 'settings');
  /* V15.52: o botão saiu da Zona de risco; quem já usa a clássica continua com o caminho de volta. */
  await expect(page.locator('.pr[data-prancha="settings"] .pr-zr').getByRole('button', { name: 'Usar a interface clássica' })).toHaveCount(0);
  await Promise.all([page.waitForEvent('load'), page.evaluate(() => Prancha.setClassic(true))]);
  await page.waitForFunction(() => typeof Prancha !== 'undefined');
  expect(await page.evaluate(() => Prancha.enabled())).toBe(false);
  await page.evaluate(() => nav('settings'));
  const back = page.locator('[data-pr-classic-return]');
  await expect(back).toBeAttached();
  await Promise.all([page.waitForEvent('load'), back.evaluate((el) => el.click())]);
  await page.waitForFunction(() => typeof Prancha !== 'undefined');
  expect(await page.evaluate(() => Prancha.enabled())).toBe(true);
});

test('Capas [G] · redesenhar a prancha reaproveita as imagens já carregadas (sem piscar)', async ({ page }) => {
  await setupPrancha(page);
  await go(page, 'maps');
  const lib = page.locator('.pr[data-prancha="maps"]');
  await expect(lib.locator('.pr-cov img').first()).toBeVisible();
  await page.waitForFunction(() => [...document.querySelectorAll('.pr[data-prancha="maps"] .pr-cov img')].slice(0, 3).every((i) => i.complete && i.naturalWidth > 0));
  const same = await page.evaluate(() => {
    const before = [...document.querySelectorAll('.pr[data-prancha="maps"] .pr-cov img')].slice(0, 3);
    before.forEach((img, i) => { img.dataset.tag = 'antes-' + i; });
    window.Prancha.renderNow('maps');
    const after = [...document.querySelectorAll('.pr[data-prancha="maps"] .pr-cov img')].slice(0, 3);
    return after.map((img) => img.dataset.tag || '');
  });
  expect(same).toEqual(['antes-0', 'antes-1', 'antes-2']);
});
