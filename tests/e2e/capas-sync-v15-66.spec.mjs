import { test, expect } from '@playwright/test';
import { setupPrancha } from './helpers/prancha-mock.mjs';

/* V15.66 · capas trocadas num aparelho chegam aos outros: as preferências são puxadas ao voltar para o app
   e a capa de banca escolhida para um simulado viaja junto */
test.use({ storageState: { cookies: [], origins: [] } });

test('Capas [G] · capa da banca do simulado vai nas preferências e o app puxa a nuvem ao voltar', async ({ page }) => {
  await setupPrancha(page, { courses: [{ id: 'casan', title: 'CASAN', board: 'Instituto AOCP', examOffset: 20 }] });
  const r = await page.evaluate(async () => {
    localStorage.setItem('studyapp.simulationCoverLocal', JSON.stringify({ 'casan|s01': 'fgv' }));
    const out = window.localPreferences();
    const merged = window.mergePreferencePayloads({ simCapas: { 'casan|s01': 'fgv' } }, { simCapas: { 'casan|s02': 'aocp' } }, 2, 1);
    localStorage.removeItem('studyapp.simulationCoverLocal');
    window.applyPreferences({ simCapas: merged.simCapas });
    const applied = JSON.parse(localStorage.getItem('studyapp.simulationCoverLocal') || '{}');
    let calls = 0;
    const real = window.syncPreferencesCloud;
    window.syncPreferencesCloud = async () => { calls++; return true; };
    const sc = window.StudyCloud, saved = { configured: sc.configured, session: sc.session };
    sc.configured = () => true; sc.session = () => ({ user: { id: 'u1' } });
    await window.MeusMapasPullPrefs(true);
    sc.configured = saved.configured; sc.session = saved.session; window.syncPreferencesCloud = real;
    return { sent: out.simCapas, merged: merged.simCapas, applied, calls };
  });
  expect(r.sent).toEqual({ 'casan|s01': 'fgv' });
  expect(r.merged).toEqual({ 'casan|s01': 'fgv', 'casan|s02': 'aocp' });
  expect(r.applied).toEqual({ 'casan|s01': 'fgv', 'casan|s02': 'aocp' });
  expect(r.calls).toBe(1);
});
