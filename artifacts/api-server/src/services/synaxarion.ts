const ORTHODOX_JORDAN_HOME = "https://orthodoxjo.tv/";
const ORTHODOX_JORDAN_HOME_API =
  "https://orthodoxjo.tv/wp-json/wp/v2/pages/32376?_fields=content,link,modified";
const TRANSLATION_API = "https://translate.googleapis.com/translate_a/single";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_TRANSLATION_TTL_MS = 60 * 1000;

type WordPressHomepage = {
  content?: { rendered?: string };
  link?: string;
  modified?: string;
};

export type SynaxarionHomepagePayload = {
  sourceUrl: string;
  modifiedAt: string | null;
  dateLabel: string;
  liturgicalLabel: string;
  commemorations: string;
  verse: {
    text: string;
    reference: string | null;
  };
  saintImageUrl: string;
  gospelUrl: string | null;
  calendarUrl: string | null;
};

let cachedSourcePayload: {
  expiresAt: number;
  payload: SynaxarionHomepagePayload;
} | null = null;
const translatedPayloadCache = new Map<
  string,
  { expiresAt: number; payload: SynaxarionHomepagePayload }
>();

const decodeHtml = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

function stripHtml(value: string) {
  return decodeHtml(value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function absoluteUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value, ORTHODOX_JORDAN_HOME).toString();
  } catch {
    return null;
  }
}

export function parseVerse(value: string) {
  const cleaned = value.replace(/^آية اليوم\s*[:：]?\s*/i, "").trim();
  const citationMatch = cleaned.match(/\s*[（(]([^()（）]+)[）)]\s*$/);
  const verseText = citationMatch
    ? cleaned.slice(0, citationMatch.index).trim()
    : cleaned;
  return {
    text: verseText.replace(/^[«“”"‘’]+|[»“”"‘’]+$/g, "").trim(),
    reference: citationMatch?.[1].trim() ?? null,
  };
}

function parseHomepage(payload: WordPressHomepage): SynaxarionHomepagePayload {
  const html = payload.content?.rendered ?? "";
  const sectionStart = html.indexOf('data-id="a7bc24a"');
  const sectionEnd = html.indexOf('data-id="b13ce22"', sectionStart);
  const section =
    sectionStart >= 0
      ? html.slice(sectionStart, sectionEnd > sectionStart ? sectionEnd : undefined)
      : html;

  const paragraphs = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
  const verseIndex = paragraphs.findIndex((paragraph) =>
    /^آية اليوم\s*[:：]?/i.test(paragraph),
  );
  const verseParagraph = verseIndex >= 0 ? paragraphs[verseIndex] : "";
  const contentParagraphs = paragraphs.slice(
    1,
    verseIndex >= 0 ? verseIndex : paragraphs.length,
  );
  const currentLayoutLines = contentParagraphs.flatMap((paragraph) =>
    paragraph.split("\n").map((line) => line.trim()).filter(Boolean),
  );
  const hasSeparateCommemorations = paragraphs.length >= 4 && verseIndex >= 3;
  const liturgicalLabel = hasSeparateCommemorations
    ? paragraphs[1]
    : currentLayoutLines[0] ?? "";
  const commemorations = hasSeparateCommemorations
    ? paragraphs.slice(2, verseIndex).join(" ")
    : currentLayoutLines.slice(1).join(" ");
  const imageUrls = [...section.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)]
    .map((match) => absoluteUrl(decodeHtml(match[1])))
    .filter((value): value is string => Boolean(value));
  const linkedUrls = [
    ...section.matchAll(
      /<a\b[^>]*\bhref="([^"]+)"[^>]*>[\s\S]*?<img\b/gi,
    ),
  ]
    .map((match) => absoluteUrl(decodeHtml(match[1])))
    .filter((value): value is string => Boolean(value));

  if (!paragraphs[0] || !liturgicalLabel || !verseParagraph || !imageUrls[0]) {
    throw new Error("Orthodox Jordan homepage Synaxarion card was not found.");
  }

  return {
    sourceUrl: absoluteUrl(payload.link) ?? ORTHODOX_JORDAN_HOME,
    modifiedAt: payload.modified ?? null,
    dateLabel: paragraphs[0].replace(/\s*\n\s*/g, " "),
    liturgicalLabel,
    commemorations,
    verse: parseVerse(verseParagraph),
    saintImageUrl: imageUrls[0],
    gospelUrl: linkedUrls[0] ?? null,
    calendarUrl: linkedUrls[1] ?? null,
  };
}

async function fetchSourcePayload() {
  if (cachedSourcePayload && cachedSourcePayload.expiresAt > Date.now()) {
    return cachedSourcePayload.payload;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(ORTHODOX_JORDAN_HOME_API, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Orthodox Jordan source returned HTTP ${response.status}.`);
    }
    const payload = parseHomepage((await response.json()) as WordPressHomepage);
    cachedSourcePayload = { expiresAt: Date.now() + CACHE_TTL_MS, payload };
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

type SynaxarionTranslationLocale = "en" | "el" | "fr";
type SynaxarionTextTranslator = (
  text: string,
  locale: SynaxarionTranslationLocale,
  signal: AbortSignal,
) => Promise<string>;

async function translateText(
  text: string,
  locale: SynaxarionTranslationLocale,
  signal: AbortSignal,
) {
  const url = new URL(TRANSLATION_API);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ar");
  url.searchParams.set("tl", locale);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Translation source returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as unknown;
  const translated = Array.isArray(data) && Array.isArray(data[0])
    ? data[0]
        .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
        .join("")
        .trim()
    : "";
  if (!translated) throw new Error("Translation source returned empty text.");
  return translated;
}

export async function translateSynaxarionPayload(
  source: SynaxarionHomepagePayload,
  locale: SynaxarionTranslationLocale,
  translator: SynaxarionTextTranslator = translateText,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const [dateLabel, liturgicalLabel, commemorations, verseText, verseReference] =
      await Promise.all([
        translator(source.dateLabel, locale, controller.signal),
        translator(source.liturgicalLabel, locale, controller.signal),
        translator(source.commemorations, locale, controller.signal),
        translator(source.verse.text, locale, controller.signal),
        source.verse.reference
          ? translator(source.verse.reference, locale, controller.signal)
          : Promise.resolve(null),
      ]);

    return {
      ...source,
      dateLabel,
      liturgicalLabel,
      commemorations,
      verse: {
        text: verseText,
        reference: verseReference,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSynaxarionHomepage(
  locale: "ar" | "en" | "el" | "fr" = "ar",
): Promise<SynaxarionHomepagePayload> {
  const source = await fetchSourcePayload();
  if (locale === "ar") return source;

  const cacheKey = `${source.modifiedAt ?? source.dateLabel}:${locale}`;
  const cachedTranslation = translatedPayloadCache.get(cacheKey);
  if (cachedTranslation && cachedTranslation.expiresAt > Date.now()) {
    return cachedTranslation.payload;
  }

  try {
    const translated = await translateSynaxarionPayload(source, locale);
    translatedPayloadCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload: translated,
    });
    return translated;
  } catch {
    translatedPayloadCache.set(cacheKey, {
      expiresAt: Date.now() + FALLBACK_TRANSLATION_TTL_MS,
      payload: source,
    });
    return source;
  }
}