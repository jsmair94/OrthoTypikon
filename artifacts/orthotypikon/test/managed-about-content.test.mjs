import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { moreContent, resolveAboutBody } from '../data/moreContent.ts';

test('saved About copy is selected for each supported mobile language', () => {
  const saved = {
    ar: { aboutBody: 'نص عربي محفوظ' },
    en: { aboutBody: 'Saved English copy' },
    el: { aboutBody: 'Αποθηκευμένο ελληνικό κείμενο' },
  };

  for (const locale of ['ar', 'en', 'el']) {
    assert.equal(resolveAboutBody(locale, saved[locale].aboutBody), saved[locale].aboutBody);
  }
});

test('the bundled About paragraph remains visible for missing or blank saved copy', () => {
  for (const locale of ['ar', 'en', 'el']) {
    const bundled = moreContent[locale].aboutBody;
    assert.ok(bundled.length > 40);
    assert.equal(resolveAboutBody(locale), bundled);
    assert.equal(resolveAboutBody(locale, null), bundled);
    assert.equal(resolveAboutBody(locale, ''), bundled);
    assert.equal(resolveAboutBody(locale, ' \n '), bundled);
  }
});

test('the web companion selects saved and bundled paragraphs for Arabic and English', () => {
  const saved = {
    ar: { aboutBody: 'نص عربي محفوظ للويب' },
    en: { aboutBody: 'Saved web About copy' },
  };
  for (const locale of ['ar', 'en']) {
    assert.equal(resolveAboutBody(locale, saved[locale].aboutBody), saved[locale].aboutBody);
    assert.equal(resolveAboutBody(locale), moreContent[locale].aboutBody);
  }
});

test('both About screens request managed content and use the shared locale fallback', async () => {
  const mobileScreen = await readFile(new URL('../app/info/[section].tsx', import.meta.url), 'utf8');
  const webScreen = await readFile(
    new URL('../../orthotypikon-companion/src/App.tsx', import.meta.url),
    'utf8',
  );

  assert.match(mobileScreen, /fetchManagedContent<.*>\('about'\)/);
  assert.match(mobileScreen, /resolveAboutBody\(language, managedAboutBody\)/);
  assert.match(webScreen, /\/api\/content\/about/);
  assert.match(webScreen, /resolveAboutBody\(app\.locale, managedAboutBody\)/);
});
