import type { SynaxarionHomepagePayload } from "@workspace/api-client-react";

const WORDPRESS_PAGE_API =
  "https://orthodoxjo.tv/wp-json/wp/v2/pages/32376?_fields=content,link,modified";
const TRANSLATION_API = "https://translate.googleapis.com/translate_a/single";
const SOURCE_HOME = "https://orthodoxjo.tv/";

type SynaxarionLocale = "ar" | "en" | "el" | "fr";
type SynaxarionTranslationLocale = Exclude<SynaxarionLocale, "ar">;
type SynaxarionTextTranslator = (
  text: string,
  locale: SynaxarionTranslationLocale,
  signal: AbortSignal,
) => Promise<string>;

type WordPressHomepage = {
  content?: { rendered?: string };
  link?: string;
  modified?: string;
};

function decodeHtml(value: string) {
  return value
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
}

function stripHtml(value: string) {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|li|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function absoluteUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value, SOURCE_HOME).toString();
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
      ? html.slice(
          sectionStart,
          sectionEnd > sectionStart ? sectionEnd : undefined,
        )
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
  const layoutLines = contentParagraphs.flatMap((paragraph) =>
    paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const hasSeparateCommemorations = paragraphs.length >= 4 && verseIndex >= 3;
  const liturgicalLabel = hasSeparateCommemorations
    ? paragraphs[1]
    : layoutLines[0] ?? "";
  const commemorations = hasSeparateCommemorations
    ? paragraphs.slice(2, verseIndex).join(" ")
    : layoutLines.slice(1).join(" ");
  const imageUrls = [...section.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)]
    .map((match) => absoluteUrl(decodeHtml(match[1])))
    .filter((url): url is string => Boolean(url));
  const linkedUrls = [
    ...section.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>[\s\S]*?<img\b/gi),
  ]
    .map((match) => absoluteUrl(decodeHtml(match[1])))
    .filter((url): url is string => Boolean(url));

  if (!paragraphs[0] || !liturgicalLabel || !verseParagraph || !imageUrls[0]) {
    throw new Error("Orthodox Jordan homepage Synaxarion card was not found.");
  }

  return {
    sourceUrl: absoluteUrl(payload.link) ?? SOURCE_HOME,
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

  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Translation source returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as unknown;
  const translated =
    Array.isArray(data) && Array.isArray(data[0])
      ? data[0]
          .map((part) =>
            Array.isArray(part) && typeof part[0] === "string" ? part[0] : "",
          )
          .join("")
          .trim()
      : "";
  if (!translated) throw new Error("Translation source returned empty text.");
  return translated;
}

export async function translateSynaxarionPayload(
  source: SynaxarionHomepagePayload,
  locale: SynaxarionTranslationLocale,
  signal: AbortSignal,
  translator: SynaxarionTextTranslator = translateText,
): Promise<SynaxarionHomepagePayload> {
  const [dateLabel, liturgicalLabel, commemorations, verseText, verseReference] =
    await Promise.all([
      translator(source.dateLabel, locale, signal),
      translator(source.liturgicalLabel, locale, signal),
      translator(source.commemorations, locale, signal),
      translator(source.verse.text, locale, signal),
      source.verse.reference
        ? translator(source.verse.reference, locale, signal)
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
}

export async function fetchSynaxarionFromSource(
  locale: SynaxarionLocale,
  callerSignal: AbortSignal,
): Promise<SynaxarionHomepagePayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const abortFromCaller = () => controller.abort();
  callerSignal.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const response = await fetch(WORDPRESS_PAGE_API, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Orthodox Jordan source returned HTTP ${response.status}.`);
    }

    const source = parseHomepage((await response.json()) as WordPressHomepage);
    if (locale === "ar") return source;

    try {
      return await translateSynaxarionPayload(
        source,
        locale,
        controller.signal,
      );
    } catch (error) {
      if (callerSignal.aborted) throw error;
      return source;
    }
  } finally {
    clearTimeout(timeout);
    callerSignal.removeEventListener("abort", abortFromCaller);
  }
}