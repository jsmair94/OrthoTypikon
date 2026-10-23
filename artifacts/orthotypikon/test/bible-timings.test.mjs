import assert from 'node:assert/strict';
import test from 'node:test';
import { findActiveBibleVerse } from '../lib/bibleTimings.ts';

const verses = [
  { number: 1, text: 'first', startTime: 0, endTime: 2.5 },
  { number: 2, text: 'second', startTime: 2.5, endTime: 5 },
];

test('audio position selects the verse whose timing interval contains it', () => {
  assert.equal(findActiveBibleVerse(verses, 0)?.number, 1);
  assert.equal(findActiveBibleVerse(verses, 2.49)?.number, 1);
  assert.equal(findActiveBibleVerse(verses, 2.5)?.number, 2);
  assert.equal(findActiveBibleVerse(verses, 4.99)?.number, 2);
  assert.equal(findActiveBibleVerse(verses, 5), null);
});

test('invalid audio positions do not highlight a verse', () => {
  assert.equal(findActiveBibleVerse(verses, Number.NaN), null);
  assert.equal(findActiveBibleVerse(verses, -0.1), null);
});
