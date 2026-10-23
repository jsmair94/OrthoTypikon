import { expect, test, type Page } from '@playwright/test';

const localeStorageKey = 'orthotypikon-admin-locale';

async function mockAdminApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/api/admin/session' && request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'browser-test-session' }),
      });
      return;
    }

    const body = pathname === '/api/admin/overview'
      ? {
          dailyContent: { total: 0, published: 0, draft: 0 },
          calendarEntries: { total: 0, published: 0, draft: 0 },
          saints: { total: 0, published: 0, draft: 0 },
          fastingGuidance: { total: 0, published: 0, draft: 0 },
          fastingRecipes: { total: 0, published: 0, draft: 0 },
          learningEntries: { total: 0, published: 0, draft: 0 },
          prayerRequestsPending: 0,
          prayerRequestsHidden: 0,
        }
      : { items: [], total: 0, page: 1, limit: 30 };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function signIn(page: Page) {
  await mockAdminApi(page);
  await page.goto('/');
  await page.getByTestId('input-admin-key').fill('browser-test-key');
  await page.getByTestId('button-submit-login').click();
  await expect(page.getByTestId('link-overview')).toBeVisible();
}

test('selects Arabic, English, and Greek and restores the saved language after reload', async ({ page }) => {
  await signIn(page);

  const locales = [
    { code: 'ar', overview: 'نظرة عامة', direction: 'rtl' },
    { code: 'en', overview: 'Overview', direction: 'ltr' },
    { code: 'el', overview: 'Επισκόπηση', direction: 'ltr' },
  ] as const;

  for (const locale of locales) {
    await page.getByTestId(`button-admin-language-${locale.code}`).click();
    await expect(page.getByTestId(`button-admin-language-${locale.code}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', locale.code);
    await expect(page.locator('html')).toHaveAttribute('dir', locale.direction);
    await expect(page.locator('[data-admin-locale-root]')).toHaveAttribute('dir', locale.direction);
    await expect(page.getByTestId('link-overview')).toContainText(locale.overview);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), localeStorageKey)).toBe(locale.code);
  }

  await page.reload();
  await expect(page.getByTestId('link-overview')).toContainText('Επισκόπηση');
  await expect(page.getByTestId('button-admin-language-el')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('keeps the selected language in sync while moving between admin pages', async ({ page }) => {
  await signIn(page);

  await page.getByTestId('link-daily-content').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Daily content' })).toBeVisible();

  await page.getByTestId('button-admin-language-ar').click();
  await expect(page.getByRole('heading', { level: 1, name: 'المحتوى اليومي' })).toBeVisible();
  await expect(page.getByTestId('link-calendar')).toContainText('التقويم');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  await page.getByTestId('link-calendar').click();
  await expect(page.getByRole('heading', { level: 1, name: 'التقويم' })).toBeVisible();

  await page.getByTestId('button-admin-language-el').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ημερολόγιο' })).toBeVisible();
  await expect(page.getByTestId('link-daily-content')).toContainText('Ημερήσιο περιεχόμενο');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  await page.getByTestId('link-daily-content').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ημερήσιο περιεχόμενο' })).toBeVisible();

  await page.getByTestId('button-admin-language-en').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Daily content' })).toBeVisible();
  await expect(page.getByTestId('link-calendar')).toContainText('Calendar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
