import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('não possui violações críticas',async({page})=>{await page.goto('/#home');const results=await new AxeBuilder({page}).analyze();const critical=results.violations.filter(violation=>['critical','serious'].includes(violation.impact));expect(critical).toEqual([])});
