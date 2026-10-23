import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { createSynaxarionHomepageRouter } from "../src/routes/synaxarion-homepage.ts";
import {
  parseDailyGospelPage as parseApiGospel,
  parseSynaxarionHomepage as parseApiHomepage,
  parseVerse as parseApiVerse,
  translateDailyGospelPayload as translateApiGospelPayload,
  translateSynaxarionPayload as translateApiPayload,
} from "../src/services/synaxarion.ts";
import { prepareDailyGospelSpeechText } from "../src/services/daily-gospel-audio.ts";
import {
  parseDailyGospelPage as parseNativeGospel,
  parseSynaxarionHomepage as parseNativeHomepage,
  parseVerse as parseNativeVerse,
  translateDailyGospelPayload as translateNativeGospelPayload,
  translateSynaxarionPayload as translateNativePayload,
} from "../../orthotypikon/lib/synaxarionSource.ts";
import { resolveHomeDailyContent } from "../../orthotypikon/lib/homeDailyContent.ts";

const SOURCE_VERSE_TEXT =
  "سَلاَمًا أَتْرُكُ لَكُمْ. سَلاَمِي أُعْطِيكُمْ. لاَ تَضْطَرِبْ قُلُوبُكُمْ";
const SOURCE_REFERENCE = "إنجيل يوحنا 14: 27";
const SOURCE_PARAGRAPH =
  `آية اليوم: ”${SOURCE_VERSE_TEXT}” (${SOURCE_REFERENCE})`;
const DAILY_GOSPEL_TEXT = "1 أما يسوع فرجع من الأردن ممتلئًا من الروح القدس. 2 أربعين يومًا يُجرّب من إبليس.";
const DAILY_GOSPEL_HTML = `
  <div class="daily-message-item">
    <h2 class="daily-message-title">الأربعاء 30 أيلول</h2>
  </div>
  <div class="daily-message-item">
    <h2 class="daily-message-title">رسالة بولس الرسول إلى أهل أفسس 5: 25–33</h2>
    <div class="daily-message-body"><p>رسالة بولس لا تُعرض بدل الإنجيل.</p></div>
  </div>
  <div class="daily-message-item">
    <h2 class="daily-message-title">الإنجيل لوقا 4: 1–15</h2>
    <div class="daily-message-body"><p>1 أما يسوع فرجع من الأردن ممتلئًا من الروح القدس. 2 أربعين يومًا يُجرّب من إبليس.</p></div>
  </div>
`;
const HOMEPAGE_PAYLOAD = {
  link: "https://orthodoxjo.tv/",
  modified: "2026-10-21T22:20:55",
  content: {
    rendered: `
      <div data-id="a7bc24a">
        <img src="https://orthodoxjo.tv/saints/pelagia.jpg" />
        <p>الخميس 22 تشرين الأول | 9 تشرين الأول شرقي</p>
        <p>الخميس من الأسبوع الحادي والعشرين بعد العنصرة</p>
        <p>تذكار القديسين اليوم، والقديسة بوبليا الأنطاكية</p>
        <p>أية اليوم :&#8221;${SOURCE_VERSE_TEXT}&#8221; (${SOURCE_REFERENCE})</p>
        <a href="https://orthodoxjo.tv/gospel"><img src="https://orthodoxjo.tv/gospel.jpg" /></a>
        <a href="https://orthodoxjo.tv/calendar"><img src="https://orthodoxjo.tv/calendar.jpg" /></a>
      </div>
      <div data-id="b13ce22"></div>
    `,
  },
};

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

async function requestDailyGospel(dailyGospelService, locale = "ar") {
  const app = express();
  app.use(
    "/api",
    createSynaxarionHomepageRouter(undefined, dailyGospelService),
  );
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address();
    const response = await fetch(
      `http://127.0.0.1:${port}/api/synaxarion/daily-gospel?locale=${locale}`,
    );
    return {
      status: response.status,
      payload: await response.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function requestDailyGospelAudio(audioService) {
  const app = express();
  app.use(
    "/api",
    createSynaxarionHomepageRouter(undefined, undefined, audioService),
  );
  app.use((error, _req, res, _next) => {
    res.status(error.status ?? 500).json({
      error: error.message,
      code: error.code ?? "INTERNAL_ERROR",
    });
  });
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address();
    const response = await fetch(
      `http://127.0.0.1:${port}/api/synaxarion/daily-gospel/audio`,
    );
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      body: Buffer.from(await response.arrayBuffer()),
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
  for (const [name, parse] of [
    ["API proxy", parseApiVerse],
    ["native direct fetch", parseNativeVerse],
  ]) {
    assert.deepEqual(parse(`أية اليوم : ”${SOURCE_VERSE_TEXT}” (${SOURCE_REFERENCE})`), {
      text: SOURCE_VERSE_TEXT,
      reference: SOURCE_REFERENCE,
    }, `${name} parser with upstream spelling`);
  }
});

test("both homepage parsers accept the updated upstream 'أية اليوم' label", () => {
  for (const [name, parse] of [
    ["API proxy", parseApiHomepage],
    ["native direct fetch", parseNativeHomepage],
  ]) {
    assert.deepEqual(parse(HOMEPAGE_PAYLOAD), {
      sourceUrl: "https://orthodoxjo.tv/",
      modifiedAt: "2026-10-21T22:20:55",
      dateLabel: "الخميس 22 تشرين الأول | 9 تشرين الأول شرقي",
      liturgicalLabel: "الخميس من الأسبوع الحادي والعشرين بعد العنصرة",
      commemorations: "تذكار القديسين اليوم، والقديسة بوبليا الأنطاكية",
      verse: { text: SOURCE_VERSE_TEXT, reference: SOURCE_REFERENCE },
      saintImageUrl: "https://orthodoxjo.tv/saints/pelagia.jpg",
      gospelUrl: "https://orthodoxjo.tv/gospel",
      calendarUrl: "https://orthodoxjo.tv/calendar",
    }, `${name} homepage parser`);
  }
});

test("both source parsers extract only the full Gospel paragraph and its heading", () => {
  for (const [name, parse] of [
    ["API proxy", parseApiGospel],
    ["native direct fetch", parseNativeGospel],
  ]) {
    assert.deepEqual(parse(DAILY_GOSPEL_HTML), {
      title: "الإنجيل لوقا 4: 1–15",
      text: DAILY_GOSPEL_TEXT,
      sourceUrl: "https://orthodoxjo.tv/%d8%b1%d8%b3%d8%a7%d9%84%d8%a9-%d9%88-%d8%a5%d9%86%d8%ac%d9%8a%d9%84-%d8%a7%d9%84%d9%8a%d9%88%d9%85/",
    }, `${name} Gospel parser`);
  }
});

test("daily Gospel API route returns the full reading contract", async () => {
  const expected = parseApiGospel(DAILY_GOSPEL_HTML);
  const { status, payload } = await requestDailyGospel(async () => expected);

  assert.equal(status, 200);
  assert.deepEqual(payload, expected);
});

for (const locale of ["en", "el"]) {
  test(`daily Gospel API passes the ${locale} locale to its service`, async () => {
    const expected = parseApiGospel(DAILY_GOSPEL_HTML);
    const { status, payload } = await requestDailyGospel(
      async (requestedLocale) => ({
        ...expected,
        title: `${requestedLocale} title`,
        text: `${requestedLocale} Gospel passage`,
      }),
      locale,
    );

    assert.equal(status, 200);
    assert.equal(payload.title, `${locale} title`);
    assert.equal(payload.text, `${locale} Gospel passage`);
    assert.equal(payload.sourceUrl, expected.sourceUrl);
  });

  test(`API daily Gospel translation localizes both title and passage to ${locale}`, async () => {
    const source = parseApiGospel(DAILY_GOSPEL_HTML);
    const translated = await translateApiGospelPayload(
      source,
      locale,
      async (text, targetLocale) => `${targetLocale} translation of ${text}`,
    );

    assert.equal(translated.title, `${locale} translation of ${source.title}`);
    assert.equal(translated.text, `${locale} translation of ${source.text}`);
    assert.equal(translated.sourceUrl, source.sourceUrl);
  });

  test(`native daily Gospel translation localizes both title and passage to ${locale}`, async () => {
    const source = parseNativeGospel(DAILY_GOSPEL_HTML);
    const translated = await translateNativeGospelPayload(
      source,
      locale,
      new AbortController().signal,
      async (text, targetLocale) => `${targetLocale} translation of ${text}`,
    );

    assert.equal(translated.title, `${locale} translation of ${source.title}`);
    assert.equal(translated.text, `${locale} translation of ${source.text}`);
    assert.equal(translated.sourceUrl, source.sourceUrl);
  });
}

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

test("daily Gospel audio route serves MP3 bytes with the audio content type", async () => {
  const expectedAudio = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x05]);
  const result = await requestDailyGospelAudio(async () => expectedAudio);

  assert.equal(result.status, 200);
  assert.equal(result.contentType, "audio/mpeg");
  assert.deepEqual(result.body, expectedAudio);
});

test("daily Gospel audio route reports synthesis failures as unavailable", async () => {
  const result = await requestDailyGospelAudio(async () => {
    throw new Error("speech provider failure");
  });

  assert.equal(result.status, 503);
  assert.match(result.contentType ?? "", /application\/json/);
  assert.deepEqual(JSON.parse(result.body.toString("utf8")), {
    error: "The daily Gospel audio is currently unavailable.",
    code: "INTERNAL_ERROR",
  });
});

test("daily Gospel narration omits standalone verse numbers but preserves references", () => {
  assert.equal(
    prepareDailyGospelSpeechText(
      "1 أما يسوع فرجع. 2 أربعين يومًا. ٣ ثم عاد. إنجيل يوحنا 14:27",
    ),
    "أما يسوع فرجع. أربعين يومًا. ثم عاد. إنجيل يوحنا 14:27",
  );
  assert.equal(
    prepareDailyGospelSpeechText("يوحنا ١٤:٢٧ يقول: سلام لكم."),
    "يوحنا ١٤:٢٧ يقول: سلام لكم.",
  );
});
