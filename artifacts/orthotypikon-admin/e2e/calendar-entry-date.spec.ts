import { expect, test, type Page } from '@playwright/test';

type CalendarEntry = {
  id: string;
  gregorianDate: string;
  calendarSystem: 'gregorian' | 'julian';
  locale: 'ar' | 'en' | 'el';
  feastTitle: string | null;
  fastingTitle: string | null;
  liturgy: string | null;
  color: string | null;
  commemoratedSaints: string[];
  commemoratedSaintBios: string[];
  saintIds: string[];
  publicationStatus: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
};

const timestamp = '2026-11-05T12:00:00.000Z';
const initialEntries: CalendarEntry[] = [
  {
    id: 'gregorian-entry',
    gregorianDate: '2024-03-25',
    calendarSystem: 'gregorian',
    locale: 'en',
    feastTitle: 'Gregorian feast',
    fastingTitle: null,
    liturgy: null,
    color: null,
    commemoratedSaints: ['Saint John'],
    commemoratedSaintBios: ['John biography'],
    saintIds: [],
    publicationStatus: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: 'julian-entry',
    gregorianDate: '2026-04-01',
    calendarSystem: 'julian',
    locale: 'en',
    feastTitle: 'Julian feast',
    fastingTitle: null,
    liturgy: null,
    color: null,
    commemoratedSaints: [],
    commemoratedSaintBios: [],
    saintIds: [],
    publicationStatus: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

async function mockAdminApi(page: Page) {
  let entries = initialEntries.map((entry) => ({ ...entry }));
  const writes: Array<{ method: string; id?: string; body: Record<string, unknown> }> = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname === '/api/admin/session' && request.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'calendar-test-session' }) });
      return;
    }
    if (pathname === '/api/admin/overview') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dailyContent: { total: 0, published: 0, draft: 0 },
          calendarEntries: { total: entries.length, published: 0, draft: entries.length },
          saints: { total: 0, published: 0, draft: 0 },
          fastingGuidance: { total: 0, published: 0, draft: 0 },
          fastingRecipes: { total: 0, published: 0, draft: 0 },
          learningEntries: { total: 0, published: 0, draft: 0 },
          prayerRequestsPending: 0,
          prayerRequestsHidden: 0,
        }),
      });
      return;
    }
    if (pathname === '/api/admin/calendar-entries' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: entries, pagination: { page: 1, limit: 30, total: entries.length, hasMore: false } }),
      });
      return;
    }
    if (pathname === '/api/admin/calendar-entries' && request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ method: 'POST', body });
      const created: CalendarEntry = {
        ...body,
        id: 'created-entry',
        createdAt: timestamp,
        updatedAt: timestamp,
      } as CalendarEntry;
      entries = [...entries, created];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(created) });
      return;
    }
    if (pathname.startsWith('/api/admin/calendar-entries/') && request.method() === 'PUT') {
      const id = pathname.split('/').at(-1) ?? '';
      const body = request.postDataJSON() as Record<string, unknown>;
      writes.push({ method: 'PUT', id, body });
      const updated: CalendarEntry = {
        ...entries.find((entry) => entry.id === id)!,
        ...body,
        id,
        updatedAt: timestamp,
      } as CalendarEntry;
      entries = entries.map((entry) => entry.id === id ? updated : entry);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) });
      return;
    }
    if (/^\/api\/admin\/calendar-entries\/[^/]+\/permanent$/.test(pathname) && request.method() === 'DELETE') {
      const id = pathname.split('/').at(-2) ?? '';
      writes.push({ method: 'DELETE', id, body: {} });
      entries = entries.filter((entry) => entry.id !== id);
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], pagination: { page: 1, limit: 30, total: 0, hasMore: false } }) });
  });

  return writes;
}

test('calendar create and edit preserve the date in the selected calendar system', async ({ page }) => {
  const writes = await mockAdminApi(page);
  await page.goto('/');
  await page.getByTestId('input-admin-key').fill('calendar-test-key');
  await page.getByTestId('button-submit-login').click();
  await expect(page.getByTestId('link-overview')).toBeVisible();
  await page.getByTestId('link-calendar').click();

  await page.getByTestId('button-new-record').click();
  await expect(page.getByTestId('input-fastingTitle')).toHaveCount(0);
  await expect(page.getByTestId('input-liturgy')).toHaveCount(0);
  await expect(page.getByTestId('input-color')).toHaveCount(0);
  await expect(page.getByTestId('input-saintIds')).toHaveCount(0);
  await expect(page.getByLabel('Gregorian date')).toHaveAttribute('type', 'date');
  await page.getByTestId('input-calendarSystem').selectOption('gregorian');
  await page.getByTestId('input-gregorianDate').fill('2000-02-29');
  await page.getByTestId('input-commemoratedSaint1').fill('Saint Basil the Great');
  await page.getByTestId('input-commemoratedSaintBio1').fill('Bishop of Caesarea.');
  await page.getByTestId('input-commemoratedSaint2').fill('Saint Gregory');
  await page.getByTestId('button-save-record').click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({
    method: 'POST',
    body: { gregorianDate: '2000-02-29', calendarSystem: 'gregorian', commemoratedSaints: ['Saint Basil the Great', 'Saint Gregory'], commemoratedSaintBios: ['Bishop of Caesarea.', ''] },
  });

  await page.getByTestId('button-new-record').click();
  await page.getByTestId('input-calendarSystem').selectOption('julian');
  await expect(page.getByLabel('Julian date')).toHaveAttribute('type', 'text');
  await page.getByTestId('input-gregorianDate').fill('2026-04-01');
  await page.getByTestId('button-save-record').click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toMatchObject({
    method: 'POST',
    body: { gregorianDate: '2026-04-01', calendarSystem: 'julian' },
  });

  await page.getByTestId('button-edit-calendar-gregorian-entry').click();
  await expect(page.getByLabel('Gregorian date')).toHaveValue('2024-03-25');
  await expect(page.getByTestId('input-commemoratedSaint1')).toHaveValue('Saint John');
  await expect(page.getByTestId('input-commemoratedSaintBio1')).toHaveValue('John biography');
  await page.getByTestId('input-gregorianDate').fill('2004-02-29');
  await page.getByTestId('button-save-record').click();
  await expect.poll(() => writes.length).toBe(3);
  expect(writes[2]).toMatchObject({
    method: 'PUT',
    id: 'gregorian-entry',
    body: { gregorianDate: '2004-02-29', calendarSystem: 'gregorian' },
  });

  await page.getByTestId('button-edit-calendar-julian-entry').click();
  await expect(page.getByLabel('Julian date')).toHaveValue('2026-04-01');
  await expect(page.getByTestId('input-gregorianDate')).toHaveAttribute('type', 'text');
  await page.getByTestId('button-save-record').click();
  await expect.poll(() => writes.length).toBe(4);
  expect(writes[3]).toMatchObject({
    method: 'PUT',
    id: 'julian-entry',
    body: { gregorianDate: '2026-04-01', calendarSystem: 'julian' },
  });
});

test('calendar editor rejects a date invalid in the selected calendar', async ({ page }) => {
  await mockAdminApi(page);
  await page.goto('/');
  await page.getByTestId('input-admin-key').fill('calendar-test-key');
  await page.getByTestId('button-submit-login').click();
  await expect(page.getByTestId('link-overview')).toBeVisible();
  await page.getByTestId('link-calendar').click();
  await page.getByTestId('button-new-record').click();
  await page.getByTestId('input-calendarSystem').selectOption('julian');
  await page.getByTestId('input-gregorianDate').fill('1900-02-29');
  await page.getByTestId('input-gregorianDate').fill('1900-02-30');
  await page.getByTestId('button-save-record').click();
  await expect(page.getByRole('alert')).toContainText('Enter a real date');

  await page.getByTestId('input-gregorianDate').fill('1900-02-29');
  await page.getByTestId('button-save-record').click();
  await expect(page.getByRole('alert')).toContainText('cannot yet be stored');
});

test('calendar entry can be permanently deleted after confirmation', async ({ page }) => {
  const writes = await mockAdminApi(page);
  await page.goto('/');
  await page.getByTestId('input-admin-key').fill('calendar-test-key');
  await page.getByTestId('button-submit-login').click();
  await page.getByTestId('link-overview').waitFor();
  await page.getByTestId('link-calendar').click();

  const deleteButton = page.getByTestId('button-delete-calendar-julian-entry');
  await page.once('dialog', (dialog) => dialog.dismiss());
  await deleteButton.click();
  await expect(deleteButton).toBeVisible();
  expect(writes).toHaveLength(0);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('Permanently delete this calendar entry? This cannot be undone.');
    await dialog.accept();
  });
  await deleteButton.click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ method: 'DELETE', id: 'julian-entry' });
  await expect(deleteButton).toHaveCount(0);
});
