import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getPrayerCollection,
  prayerCollections,
  PRAYER_COLLECTION_IDS,
} from '../data/prayerCollections.ts';

const preferencesSource = readFileSync(
  new URL('../hooks/usePreferences.tsx', import.meta.url),
  'utf8',
);
const languages = ['ar', 'en', 'el'];

test('all five Library prayer categories have matching localized collections', () => {
  assert.deepEqual(PRAYER_COLLECTION_IDS, [
    'gospels',
    'daily',
    'various',
    'supplications',
    'epistles',
  ]);

  for (const language of languages) {
    for (const collectionId of PRAYER_COLLECTION_IDS) {
      const collection = getPrayerCollection(language, collectionId);
      assert.ok(collection, `Missing ${language} ${collectionId} collection`);
      assert.ok(collection.description.trim());
      assert.ok(collection.entries.length > 0);
      assert.ok(
        collection.entries.every((entry) =>
          entry.title.trim() && entry.reference.trim() && entry.text.trim(),
        ),
        `Incomplete ${language} ${collectionId} entry`,
      );
    }
  }
});

test('the category cards keep five localized names in each supported language', () => {
  const expectedFirstCategory = {
    ar: 'الإنجيل المسموع',
    en: 'Audio Gospel',
    el: 'Ακουστό Ευαγγέλιο',
  };

  for (const language of languages) {
    const localeStart = preferencesSource.indexOf(`  ${language}: {`, preferencesSource.indexOf('export const screenCopy = {'));
    assert.notEqual(localeStart, -1, `Missing ${language} screen copy`);
    const localeEnd = languages
      .map((candidate) => preferencesSource.indexOf(`  ${candidate}: {`, localeStart + 1))
      .filter((index) => index !== -1)
      .sort((left, right) => left - right)[0] ?? preferencesSource.length;
    const libraryCopy = preferencesSource.slice(localeStart, localeEnd);
    const match = libraryCopy.match(/prayerSections:\s*\[([^\]]+)\]/);

    assert.ok(match, `Missing ${language} Library prayer labels`);
    assert.equal((match[1].match(/'/g) ?? []).length / 2, PRAYER_COLLECTION_IDS.length);
    assert.ok(match[1].includes(expectedFirstCategory[language]));
    assert.equal(Object.keys(prayerCollections[language]).length, PRAYER_COLLECTION_IDS.length);
  }
});

test('unknown prayer collection IDs are rejected instead of showing unrelated content', () => {
  assert.equal(getPrayerCollection('en', 'unknown'), null);
});
