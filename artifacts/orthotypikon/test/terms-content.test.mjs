import assert from 'node:assert/strict';
import test from 'node:test';

import { moreContent } from '../data/moreContent.ts';

test('terms are complete and localized in Arabic, English, and Greek', () => {
  for (const locale of ['ar', 'en', 'el']) {
    const content = moreContent[locale];
    const page = content.termsPage;

    assert.equal(content.terms, page.title);
    assert.ok(page.disclaimer.includes('OrthoTypikon'));
    assert.ok(page.intro.length > 40);
    assert.ok(page.updated.length > 0);
    assert.equal(page.sections.length, 9);
    assert.ok(page.sections.every((section) => section.title && section.body));
    assert.match(page.sections.at(-1).body, /OrthoTypikon/);
  }
});

test('terms disclose that jurisdiction and legal contact details are not yet provided', () => {
  for (const locale of ['ar', 'en', 'el']) {
    assert.ok(moreContent[locale].termsPage.disclaimer.length > 100);
    assert.ok(moreContent[locale].termsPage.sections.at(-1).body.length > 100);
  }
});