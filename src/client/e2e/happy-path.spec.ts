import { expect, test } from '@playwright/test';

test('public happy path smoke: home and survey code page render', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toContainText(/QUIS|khảo sát|survey/i);

  await page.goto('/survey-code');
  await expect(page.locator('body')).toContainText(/mã|code|khảo sát|survey/i);
});
