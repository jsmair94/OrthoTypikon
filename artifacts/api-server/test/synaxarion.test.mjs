import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { createSynaxarionHomepageRouter } from "../src/routes/synaxarion-homepage.ts";
import {
  parseVerse as parseApiVerse,
  translateSynaxarionPayload as translateApiPayload,
} from "../src/services/synaxarion.ts";
import {
  parseVerse as parseNativeVerse,
  translateSynaxarionPayload as translateNativePayload,
} from "../../orthotypikon/lib/synaxarionSource.ts";
import { resolveHomeDailyContent } from "../../orthotypikon/lib/homeDailyContent.ts";

const SOURCE_VERSE_TEXT =
  "سَلاَمًا أَتْرُكُ لَكُمْ. سَلاَمِي أُعْطِيكُمْ. لاَ تَضْطَرِبْ قُلُوبُكُمْ";
const SOURCE_REFERENCE = "إنجيل يوحنا 14: 27";
const SOURCE_PARAGRAPH =
  `آية اليوم: ”${SOURCE_VERSE_TEXT}” (${SOURCE_REFERENCE})`;

async function requestHomepage(locale, homepageService) {
  const app = express();
  app.use("/api", createSynaxarionHomepageRouter(homepageService));
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address();
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : "";
    const response = await fetch(
      `http://127.0.0.1:${port}/api/synaxarion/homepage${query}`,
    );
    return {
      status: response.status,
      payload: await response.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const sourcePayload = {
  sourceUrl: "https://orthodoxjo.tv/",
  modifiedAt: "2026-09-28T00:00:00",
  dateLabel: "الإثنين 28 أيلول",
  liturgicalLabel: "الإثنين بعد العنصرة",
  commemorations: "تذكار القديسين اليوم",
  verse: {
    text: SOURCE_VERSE_TEXT,
    reference: SOURCE_REFERENCE,
  },
  saintImageUrl: "https://orthodoxjo.tv/saint.jpg",
  gospelUrl: null,
  calendarUrl: null,
};

test("both source parsers separate the Arabic verse from its trailing citation", () => {
  for (const [name, parse] of [
    ["API proxy", parseApiVerse],
    ["native direct fetch", parseNativeVerse],
  ]) {
    assert.deepEqual(parse(SOURCE_PARAGRAPH), {
      text: SOURCE_VERSE_TEXT,
      reference: SOURCE_REFERENCE,
    }, `${name} parser`);
  }
});

const stubbedHomepageService = async (locale = "ar") => {
  if (locale === "ar") return sourcePayload;
  return translateApiPayload(
    sourcePayload,
    locale,
    async (text, targetLocale) => `${targetLocale} translation of ${text}`,
  );
};

for (const [locale, expected] of [
  [
    "ar",
    {
      verseText: SOURCE_VERSE_TEXT,
      verseReference: SOURCE_REFERENCE,
      liturgicalLabel: sourcePayload.liturgicalLabel,
      commemorations: sourcePayload.commemorations,
    },
  ],
  [
    "en",
    {
      verseText: `en translation of ${SOURCE_VERSE_TEXT}`,
      verseReference: `en translation of ${SOURCE_REFERENCE}`,
      liturgicalLabel: `en translation of ${sourcePayload.liturgicalLabel}`,
      commemorations: `en translation of ${sourcePayload.commemorations}`,
    },
  ],
]) {
  test(`HTTP homepage route retains Arabic verse fields and occasion for ${locale}`, async () => {
    const { status, payload } = await requestHomepage(
      locale,
      stubbedHomepageService,
    );

    assert.equal(status, 200);
    assert.equal(payload.verse.text, expected.verseText);
    assert.equal(payload.verse.reference, expected.verseReference);
    assert.notEqual(payload.verse.text, payload.verse.reference);
    assert.equal(payload.liturgicalLabel, expected.liturgicalLabel);
    assert.equal(payload.commemorations, expected.commemorations);
  });
}

for (const locale of ["en", "el"]) {
  test(`API proxy keeps ${locale} verse text and reference separate`, async () => {
    const translate = async (text, targetLocale) =>
      `${targetLocale} translation of ${text}`;
    const payload = await translateApiPayload(
      sourcePayload,
      locale,
      translate,
    );

    assert.equal(payload.verse.text, `${locale} translation of ${SOURCE_VERSE_TEXT}`);
    assert.equal(payload.verse.reference, `${locale} translation of ${SOURCE_REFERENCE}`);
    assert.notEqual(payload.verse.text, payload.verse.reference);
    assert.equal(
      payload.liturgicalLabel,
      `${locale} translation of ${sourcePayload.liturgicalLabel}`,
    );
    assert.equal(
      payload.commemorations,
      `${locale} translation of ${sourcePayload.commemorations}`,
    );
  });

  test(`native direct fetch keeps ${locale} verse text and reference separate`, async () => {
    const translate = async (text, targetLocale) =>
      `${targetLocale} translation of ${text}`;
    const payload = await translateNativePayload(
      sourcePayload,
      locale,
      new AbortController().signal,
      translate,
    );

    assert.equal(payload.verse.text, `${locale} translation of ${SOURCE_VERSE_TEXT}`);
    assert.equal(payload.verse.reference, `${locale} translation of ${SOURCE_REFERENCE}`);
    assert.notEqual(payload.verse.text, payload.verse.reference);
    assert.equal(
      payload.liturgicalLabel,
      `${locale} translation of ${sourcePayload.liturgicalLabel}`,
    );
    assert.equal(
      payload.commemorations,
      `${locale} translation of ${sourcePayload.commemorations}`,
    );
  });
}

test("home content prefers localized live data and keeps localized fallbacks", () => {
  const english = resolveHomeDailyContent(
    {
      liturgicalLabel: "Monday after Pentecost",
      commemorations: "The holy martyrs are commemorated today.",
      verse: {
        text: "Peace I leave with you.",
        reference: "Gospel of John 14:27",
      },
    },
    {
      verseHeading: "Verse of the day",
      verse: "“Peace I leave with you.”",
      verseReference: "John 14:27",
      occasionTitle: "Local calendar fallback",
      occasionDescription: "Local commemorations fallback",
    },
  );

  assert.deepEqual(english, {
    verse: "«Peace I leave with you.»",
    verseReference: "Verse of the day · Gospel of John 14:27",
    occasionTitle: "Monday after Pentecost",
    occasionDescription: "The holy martyrs are commemorated today.",
  });

  const greekFallback = resolveHomeDailyContent(undefined, {
    verseHeading: "Στίχος της ημέρας",
    verse: "«Ειρήνη αφήνω σε σας.»",
    verseReference: "Ιωάννης 14:27",
    occasionTitle: "Η σημερινή εορτή",
    occasionDescription: "Οι Άγιοι που τιμούμε",
  });

  assert.deepEqual(greekFallback, {
    verse: "«Ειρήνη αφήνω σε σας.»",
    verseReference: "Στίχος της ημέρας · Ιωάννης 14:27",
    occasionTitle: "Η σημερινή εορτή",
    occasionDescription: "Οι Άγιοι που τιμούμε",
  });
});
