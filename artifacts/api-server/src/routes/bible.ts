import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Router, type IRouter } from "express";
import { alignBibleWebVttToChapterText, parseBibleWebVtt } from "../lib/bible-vtt";
import {
  createApproximateMatthewChapterTimings,
  createMatthewChapterOneTimings,
} from "../lib/matthew-chapter-one-timings";

const signedUrlLifetimeSeconds = 60 * 60;

const assetCacheLifetimeMs = 5 * 60_000;
function getS3Config(): BibleStorageConfig | null {
  const bucket = process.env.AWS_S3_BUCKET_NAME ?? process.env.BUCKET;
  const endpoint =
    process.env.AWS_ENDPOINT_URL ??
    process.env.AWS_ENDPOINT ??
    process.env.AWS_S3_ENDPOINT ??
    process.env.ENDPOINT;
  const region = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? process.env.REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? process.env.SECRET_ACCESS_KEY;

  if (!bucket || !endpoint || !region || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

async function listAllBibleObjects(
  client: S3Client,
  bucket: string,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of page.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

function normalizeFolderName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .trim()
    .toLocaleLowerCase();
}

type BibleStorageConfig = {
  bucket: string;
  client: S3Client;
};

type BibleBook = keyof typeof bibleBooks;

type BibleChapterAssets = { textKey: string; audioKey?: string; timingKey?: string };
type BibleChapterFileSet = Partial<BibleChapterAssets>;
type BibleChapterReadinessIssue =
  | {
      book: BibleBook;
      chapter: number;
      missing: ("text" | "audio")[];
    }
  | {
      book: BibleBook;
      chapter: number;
      problem:
        | "ambiguous"
        | "empty_text"
        | "unusable_text"
        | "unreadable_text"
        | "unreadable_audio";
    };
type BibleChapterReadinessReport = {
  checkedChapters: number;
  issues: BibleChapterReadinessIssue[];
};
type BibleReadinessDependencies = {
  getStorageConfig?: () => BibleStorageConfig | null;
  matthewPrefix?: string;
};

const bibleAudioValidationRangeBytes = 64 * 1024;
const maxMpegFrameBytes = 4096;
const chapterTextPlaceholderPatterns = [
  /^(?:placeholder|todo|tbd|sample(?:\s+text)?|test(?:\s+text)?|chapter\s+text|text\s+goes\s+here|lorem\s+ipsum|coming\s+soon|not\s+available)$/iu,
  /^(?:n\s*\/\s*a|n\s+a|none|null|undefined)$/iu,
];
const mpegBitratesKbps: Record<number, number[]> = {
  1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  2: [
    0,
    32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384,
  ],
  3: [
    0,
    32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
  ],
};

function hasUsableBibleChapterText(text: string): boolean {
  const normalized = text.normalize("NFKC").trim();
  if (!normalized) return false;

  const withoutCommonVerseMarkers = normalized
    .replace(/[\p{N}\p{P}\p{S}\p{Z}\p{M}]+/gu, " ")
    .trim();
  if (!withoutCommonVerseMarkers) return false;

  const placeholderCandidate = normalized
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (
    chapterTextPlaceholderPatterns.some((pattern) =>
      pattern.test(placeholderCandidate),
    )
  ) {
    return false;
  }

  // Count Unicode letter runs, not punctuation-delimited verses: valid Bible
  // files vary in numbering, punctuation, and line wrapping across languages.
  const words = withoutCommonVerseMarkers.match(/\p{L}[\p{L}\p{M}]*/gu) ?? [];
  return words.length >= 2;
}
const mpeg2BitratesKbps: Record<number, number[]> = {
  1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};

function parseContentRange(
  contentRange: string | undefined,
): { start: number; end: number; total: number } | undefined {
  const match = contentRange?.match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
  if (!match) return undefined;
  const [, start, end, total] = match;
  return {
    start: Number(start),
    end: Number(end),
    total: Number(total),
  };
}

async function readBoundedBody(
  body: {
    transformToByteArray?: () => Promise<Uint8Array>;
    [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
  } | undefined,
  maxBytes: number,
): Promise<Uint8Array | undefined> {
  if (!body) return undefined;

  if (body[Symbol.asyncIterator]) {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      if (size + chunk.byteLength > maxBytes) return undefined;
      chunks.push(chunk);
      size += chunk.byteLength;
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  const bytes = await body.transformToByteArray?.();
  return bytes && bytes.byteLength <= maxBytes ? bytes : undefined;
}

function getMpegFrameLength(bytes: Uint8Array, offset: number): number | undefined {
  if (offset + 4 > bytes.length) return undefined;
  const header =
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3];
  if ((header >>> 21) !== 0b11111111111) return undefined;

  const version = (header >>> 19) & 0b11;
  const layer = (header >>> 17) & 0b11;
  const bitrateIndex = (header >>> 12) & 0b1111;
  const sampleRateIndex = (header >>> 10) & 0b11;
  if (
    version === 0b01 ||
    layer === 0 ||
    bitrateIndex === 0 ||
    bitrateIndex === 0b1111 ||
    sampleRateIndex === 0b11
  ) {
    return undefined;
  }

  const layerNumber = 4 - layer;
  const bitrateTable = version === 0b11 ? mpegBitratesKbps : mpeg2BitratesKbps;
  const bitrate = bitrateTable[layerNumber]?.[bitrateIndex];
  const baseSampleRate = [44100, 48000, 32000][sampleRateIndex];
  const sampleRate =
    version === 0b11
      ? baseSampleRate
      : version === 0b10
        ? baseSampleRate / 2
        : baseSampleRate / 4;
  if (!bitrate || !sampleRate) return undefined;

  const padding = (header >>> 9) & 1;
  const bitrateBits = bitrate * 1000;
  const length =
    layerNumber === 1
      ? (Math.floor((12 * bitrateBits) / sampleRate) + padding) * 4
      : (Math.floor(
          ((layerNumber === 3 && version !== 0b11 ? 72 : 144) *
            bitrateBits) /
            sampleRate,
        ) +
          padding);
  return length >= 4 && length <= maxMpegFrameBytes ? length : undefined;
}

function audioDataStart(bytes: Uint8Array): number | undefined {
  if (bytes.length < 3 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return 0;
  }
  if (bytes.length < 10 || bytes.slice(6, 10).some((byte) => byte & 0x80)) {
    return undefined;
  }
  const tagSize =
    (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
  const hasFooter = (bytes[5] & 0x10) !== 0;
  const start = 10 + tagSize + (hasFooter ? 10 : 0);
  return start < bytes.length ? start : undefined;
}

function audioDataEnd(bytes: Uint8Array): number {
  const hasId3v1 =
    bytes.length >= 128 &&
    bytes[bytes.length - 128] === 0x54 &&
    bytes[bytes.length - 127] === 0x41 &&
    bytes[bytes.length - 126] === 0x47;
  return hasId3v1 ? bytes.length - 128 : bytes.length;
}

function hasValidMpegPrefix(bytes: Uint8Array, completeObject: boolean): boolean {
  const start = audioDataStart(bytes);
  const end = audioDataEnd(bytes);
  if (start === undefined || start >= end) return false;

  let offset = start;
  let frameCount = 0;
  while (offset < end) {
    const frameLength = getMpegFrameLength(bytes, offset);
    if (!frameLength || offset + frameLength > end) {
      return !completeObject && frameCount >= 3;
    }
    offset += frameLength;
    frameCount += 1;
    if (!completeObject && frameCount >= 3) return true;
  }
  return frameCount >= 3 && offset === end;
}

function hasValidMpegTail(bytes: Uint8Array): boolean {
  const end = audioDataEnd(bytes);
  if (end < 12) return false;

  const findPreviousFrame = (frameEnd: number): number | undefined => {
    const firstCandidate = Math.max(0, frameEnd - maxMpegFrameBytes);
    for (let start = frameEnd - 4; start >= firstCandidate; start -= 1) {
      const frameLength = getMpegFrameLength(bytes, start);
      if (frameLength && start + frameLength === frameEnd) return start;
    }
    return undefined;
  };

  const lastFrameStart = findPreviousFrame(end);
  if (lastFrameStart === undefined) return false;
  const previousFrameStart = findPreviousFrame(lastFrameStart);
  if (previousFrameStart === undefined) return false;
  return findPreviousFrame(previousFrameStart) !== undefined;
}

async function hasUsableMp3(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  const prefixObject = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=0-${bibleAudioValidationRangeBytes - 1}`,
    }),
  );
  const prefix = await readBoundedBody(
    prefixObject.Body,
    bibleAudioValidationRangeBytes,
  );
  const prefixRange = parseContentRange(prefixObject.ContentRange);
  if (
    !prefix ||
    !prefixRange ||
    prefixRange.start !== 0 ||
    prefixRange.end - prefixRange.start + 1 !== prefix.byteLength ||
    prefixRange.total <= prefixRange.end
  ) {
    return false;
  }

  if (prefixRange.total === prefix.byteLength) {
    return hasValidMpegPrefix(prefix, true);
  }
  if (!hasValidMpegPrefix(prefix, false)) return false;

  const suffixObject = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=-${bibleAudioValidationRangeBytes}`,
    }),
  );
  const suffix = await readBoundedBody(
    suffixObject.Body,
    bibleAudioValidationRangeBytes,
  );
  const suffixRange = parseContentRange(suffixObject.ContentRange);
  return Boolean(
    suffix &&
      suffixRange &&
      suffixRange.end === prefixRange.total - 1 &&
      suffixRange.start === prefixRange.total - suffix.byteLength &&
      suffixRange.end - suffixRange.start + 1 === suffix.byteLength &&
      hasValidMpegTail(suffix),
  );
}

type BibleRouterDependencies = {
  getStorageConfig?: () => BibleStorageConfig | null;
  signAudioUrl?: typeof getSignedUrl;
};

const bibleBooks = {
  genesis: { aliases: ["التكوين", "Genesis"], chapterCount: 50 },
  exodus: { aliases: ["الخروج", "Exodus"], chapterCount: 40 },
  leviticus: { aliases: ["اللاويين", "Leviticus"], chapterCount: 27 },
  numbers: { aliases: ["العدد", "Numbers"], chapterCount: 36 },
  deuteronomy: { aliases: ["التثنية", "Deuteronomy"], chapterCount: 34 },
  joshua: { aliases: ["يشوع", "Joshua"], chapterCount: 24 },
  judges: { aliases: ["القضاة", "Judges"], chapterCount: 21 },
  ruth: { aliases: ["راعوث", "Ruth"], chapterCount: 4 },
  "1-samuel": { aliases: ["صموئيل الأول", "1 Samuel", "First Samuel"], chapterCount: 31 },
  "2-samuel": { aliases: ["صموئيل الثاني", "2 Samuel", "Second Samuel"], chapterCount: 24 },
  "1-kings": { aliases: ["الملوك الأول", "1 Kings", "First Kings"], chapterCount: 22 },
  "2-kings": { aliases: ["الملوك الثاني", "2 Kings", "Second Kings"], chapterCount: 25 },
  "1-chronicles": { aliases: ["أخبار الأيام الأول", "1 Chronicles", "First Chronicles"], chapterCount: 29 },
  "2-chronicles": { aliases: ["أخبار الأيام الثاني", "2 Chronicles", "Second Chronicles"], chapterCount: 36 },
  ezra: { aliases: ["عزرا", "Ezra"], chapterCount: 10 },
  nehemiah: { aliases: ["نحميا", "Nehemiah"], chapterCount: 13 },
  esther: { aliases: ["أستير", "Esther"], chapterCount: 10 },
  job: { aliases: ["أيوب", "Job"], chapterCount: 42 },
  psalms: { aliases: ["المزامير", "Psalms", "Psalm"], chapterCount: 150 },
  proverbs: { aliases: ["الأمثال", "Proverbs"], chapterCount: 31 },
  ecclesiastes: { aliases: ["الجامعة", "Ecclesiastes"], chapterCount: 12 },
  "song-of-solomon": { aliases: ["نشيد الأنشاد", "نشيد الانشاد", "Song of Solomon", "Song of Songs"], chapterCount: 8 },
  isaiah: { aliases: ["إشعياء", "اشعياء", "Isaiah"], chapterCount: 66 },
  jeremiah: { aliases: ["إرميا", "ارميا", "Jeremiah"], chapterCount: 52 },
  lamentations: { aliases: ["مراثي إرميا", "مراثي ارميا", "Lamentations"], chapterCount: 5 },
  ezekiel: { aliases: ["حزقيال", "Ezekiel"], chapterCount: 48 },
  daniel: { aliases: ["دانيال", "Daniel"], chapterCount: 12 },
  hosea: { aliases: ["هوشع", "Hosea"], chapterCount: 14 },
  joel: { aliases: ["يوئيل", "Joel"], chapterCount: 3 },
  amos: { aliases: ["عاموس", "Amos"], chapterCount: 9 },
  obadiah: { aliases: ["عوبديا", "Obadiah"], chapterCount: 1 },
  jonah: { aliases: ["يونان", "Jonah"], chapterCount: 4 },
  micah: { aliases: ["ميخا", "Micah"], chapterCount: 7 },
  nahum: { aliases: ["ناحوم", "Nahum"], chapterCount: 3 },
  habakkuk: { aliases: ["حبقوق", "Habakkuk"], chapterCount: 3 },
  zephaniah: { aliases: ["صفنيا", "Zephaniah"], chapterCount: 3 },
  haggai: { aliases: ["حجي", "Haggai"], chapterCount: 2 },
  zechariah: { aliases: ["زكريا", "Zechariah"], chapterCount: 14 },
  malachi: { aliases: ["ملاخي", "Malachi"], chapterCount: 4 },
  matthew: { aliases: ["متى", "Matthew"], chapterCount: 28 },
  mark: { aliases: ["مرقس", "Mark"], chapterCount: 16 },
  luke: { aliases: ["لوقا", "Luke"], chapterCount: 24 },
  john: { aliases: ["يوحنا", "John"], chapterCount: 21 },
  acts: { aliases: ["أعمال الرسل", "Acts"], chapterCount: 28 },
  romans: { aliases: ["رومية", "Romans"], chapterCount: 16 },
  "1-corinthians": { aliases: ["كورنثوس الأولى", "1 Corinthians"], chapterCount: 16 },
  "2-corinthians": { aliases: ["كورنثوس الثانية", "2 Corinthians"], chapterCount: 13 },
  galatians: { aliases: ["غلاطية", "Galatians"], chapterCount: 6 },
  ephesians: { aliases: ["أفسس", "Ephesians"], chapterCount: 6 },
  philippians: { aliases: ["فيلبي", "Philippians"], chapterCount: 4 },
  colossians: { aliases: ["كولوسي", "Colossians"], chapterCount: 4 },
  "1-thessalonians": { aliases: ["تسالونيكي الأولى", "1 Thessalonians"], chapterCount: 5 },
  "2-thessalonians": { aliases: ["تسالونيكي الثانية", "2 Thessalonians"], chapterCount: 3 },
  "1-timothy": { aliases: ["تيموثاوس الأولى", "1 Timothy"], chapterCount: 6 },
  "2-timothy": { aliases: ["تيموثاوس الثانية", "2 Timothy"], chapterCount: 4 },
  titus: { aliases: ["تيطس", "Titus"], chapterCount: 3 },
  philemon: { aliases: ["فليمون", "Philemon"], chapterCount: 1 },
  hebrews: { aliases: ["العبرانيين", "Hebrews"], chapterCount: 13 },
  james: { aliases: ["يعقوب", "James"], chapterCount: 5 },
  "1-peter": { aliases: ["بطرس الأولى", "1 Peter"], chapterCount: 5 },
  "2-peter": { aliases: ["بطرس الثانية", "2 Peter"], chapterCount: 3 },
  "1-john": { aliases: ["يوحنا الأولى", "1 John"], chapterCount: 5 },
  "2-john": { aliases: ["يوحنا الثانية", "2 John"], chapterCount: 1 },
  "3-john": { aliases: ["يوحنا الثالثة", "3 John"], chapterCount: 1 },
  jude: { aliases: ["يهوذا", "Jude"], chapterCount: 1 },
  revelation: { aliases: ["رؤيا يوحنا", "Revelation"], chapterCount: 22 },
} as const;

const aliasToBook = new Map<string, BibleBook>(
  Object.entries(bibleBooks).flatMap(([book, value]) =>
    value.aliases.map((alias) => [normalizeFolderName(alias), book as BibleBook]),
  ),
);

type CachedObjects = {
  bucket: string;
  keys: string[];
  expiresAt: number;
};

export function findBibleChapterAssets(
  keys: string[],
  book: BibleBook,
  chapter: number,
  forcedPrefix?: string,
): BibleChapterAssets | null {
  const chapterFiles = findBibleChapterFiles(keys, book, chapter, forcedPrefix);
  const matches = [...chapterFiles.values()].filter(
    (assets): assets is BibleChapterAssets => Boolean(assets.textKey),
  );
  if (matches.length > 1) {
    throw new Error(`More than one folder contains ${book} chapter ${chapter}`);
  }
  return matches[0] ?? null;
}

function findBibleChapterFiles(
  keys: string[],
  book: BibleBook,
  chapter: number,
  forcedPrefix?: string,
): Map<string, BibleChapterFileSet> {
  const chapterFiles = new Map<string, BibleChapterFileSet>();
  const normalizedForcedPrefix = forcedPrefix
    ? `${forcedPrefix.replace(/^\/+|\/+$/g, "")}/`
    : null;

  for (const key of keys) {
    const segments = key.split("/");
    const filename = segments.at(-1);
    const folder = segments.at(-2);
    const match = filename?.match(/^(\d+)\.(txt|mp3|vtt)$/i);
    if (
      !filename ||
      !folder ||
      !match ||
      Number(match[1]) !== chapter ||
      aliasToBook.get(normalizeFolderName(folder)) !== book ||
      (normalizedForcedPrefix && !key.startsWith(normalizedForcedPrefix))
    ) {
      continue;
    }

    const directory = key.slice(0, key.length - filename.length);
    const assets = chapterFiles.get(directory) ?? {};
    const extension = match[2].toLowerCase();
    if (extension === "txt") {
      if (assets.textKey) throw new Error(`Duplicate Bible text files found in ${directory}`);
      assets.textKey = key;
    } else if (extension === "mp3") {
      if (assets.audioKey) throw new Error(`Duplicate Bible audio files found in ${directory}`);
      assets.audioKey = key;
    } else {
      if (assets.timingKey) throw new Error(`Duplicate Bible timing files found in ${directory}`);
      assets.timingKey = key;
    }
    chapterFiles.set(directory, assets);
  }

  return chapterFiles;
}

export function scanBibleChapterReadiness(
  keys: string[],
  matthewPrefix?: string,
): BibleChapterReadinessReport {
  const issues: BibleChapterReadinessIssue[] = [];
  let checkedChapters = 0;

  for (const [book, info] of Object.entries(bibleBooks) as [
    BibleBook,
    (typeof bibleBooks)[BibleBook],
  ][]) {
    for (let chapter = 1; chapter <= info.chapterCount; chapter += 1) {
      checkedChapters += 1;
      try {
        const candidates = findBibleChapterFiles(
          keys,
          book,
          chapter,
          book === "matthew" ? matthewPrefix : undefined,
        );
        const textCandidates = [...candidates.values()].filter((assets) =>
          Boolean(assets.textKey),
        );
        if (textCandidates.length > 1) {
          issues.push({ book, chapter, problem: "ambiguous" });
          continue;
        }

        const matchingAssets =
          textCandidates[0] ??
          (candidates.size === 1 ? [...candidates.values()][0] : undefined);
        const missing: ("text" | "audio")[] = [];
        if (!matchingAssets?.textKey) missing.push("text");
        if (!matchingAssets?.audioKey) missing.push("audio");
        if (missing.length > 0) issues.push({ book, chapter, missing });
      } catch {
        issues.push({ book, chapter, problem: "ambiguous" });
      }
    }
  }

  return { checkedChapters, issues };
}

export async function runBibleStorageReadinessCheck({
  getStorageConfig = getS3Config,
  matthewPrefix = process.env.BIBLE_MATTHEW_PREFIX,
}: BibleReadinessDependencies = {}): Promise<BibleChapterReadinessReport> {
  const config = getStorageConfig();
  if (!config) throw new Error("Bible storage is not configured.");

  const keys = await listAllBibleObjects(config.client, config.bucket);
  const report = scanBibleChapterReadiness(keys, matthewPrefix);

  for (const [book, info] of Object.entries(bibleBooks) as [
    BibleBook,
    (typeof bibleBooks)[BibleBook],
  ][]) {
    for (let chapter = 1; chapter <= info.chapterCount; chapter += 1) {
      let candidates: Map<string, BibleChapterFileSet>;
      try {
        candidates = findBibleChapterFiles(
          keys,
          book,
          chapter,
          book === "matthew" ? matthewPrefix : undefined,
        );
      } catch {
        continue;
      }

      const textCandidates = [...candidates.values()].filter((assets) =>
        Boolean(assets.textKey),
      );
      if (textCandidates.length > 1) continue;
      const assets =
        textCandidates[0] ??
        (candidates.size === 1 ? [...candidates.values()][0] : undefined);
      if (!assets) continue;

      const checks: Promise<void>[] = [];
      if (assets.textKey) {
        checks.push(
          (async () => {
            try {
              const object = await config.client.send(
                new GetObjectCommand({ Bucket: config.bucket, Key: assets.textKey }),
              );
              const text = await object.Body?.transformToString("utf-8");
              if (text === undefined) {
                report.issues.push({ book, chapter, problem: "unreadable_text" });
              } else if (text.trim().length === 0) {
                report.issues.push({ book, chapter, problem: "empty_text" });
              } else if (!hasUsableBibleChapterText(text)) {
                report.issues.push({ book, chapter, problem: "unusable_text" });
              }
            } catch {
              report.issues.push({ book, chapter, problem: "unreadable_text" });
            }
          })(),
        );
      }
      const audioKey = assets.audioKey;
      if (audioKey) {
        checks.push(
          (async () => {
            try {
              if (
                !(await hasUsableMp3(
                  config.client,
                  config.bucket,
                  audioKey,
                ))
              ) {
                report.issues.push({ book, chapter, problem: "unreadable_audio" });
              }
            } catch {
              report.issues.push({ book, chapter, problem: "unreadable_audio" });
            }
          })(),
        );
      }
      await Promise.all(checks);
    }
  }

  return report;
}

export function createBibleRouter({
  getStorageConfig = getS3Config,
  signAudioUrl = getSignedUrl,
}: BibleRouterDependencies = {}): IRouter {
  const router: IRouter = Router();
  let cachedObjects: CachedObjects | null = null;

  async function listBibleObjects(client: S3Client, bucket: string): Promise<string[]> {
    if (cachedObjects?.bucket === bucket && cachedObjects.expiresAt > Date.now()) {
      return cachedObjects.keys;
    }

    const keys = await listAllBibleObjects(client, bucket);
    cachedObjects = { bucket, keys, expiresAt: Date.now() + assetCacheLifetimeMs };
    return keys;
  }

  router.get("/bible/:book/:chapter", async (req, res): Promise<void> => {
    const rawBook = Array.isArray(req.params.book) ? req.params.book[0] : req.params.book;
    const normalizedBook = rawBook?.toLowerCase();
    if (!normalizedBook || !Object.hasOwn(bibleBooks, normalizedBook)) {
      res.status(400).json({ error: "Choose a supported Bible book." });
      return;
    }
    const book = normalizedBook as BibleBook;
    const bookInfo = bibleBooks[book];

    const rawChapter = Array.isArray(req.params.chapter) ? req.params.chapter[0] : req.params.chapter;
    const chapter = Number(rawChapter);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > bookInfo.chapterCount) {
      res.status(400).json({
        error: `Chapter must be a number from 1 to ${bookInfo.chapterCount}.`,
      });
      return;
    }

    const config = getStorageConfig();
    if (!config) {
      res.status(503).json({ error: "Bible storage is not connected to the API service yet." });
      return;
    }

    try {
      const forcedPrefix =
        book === "matthew" ? process.env.BIBLE_MATTHEW_PREFIX : undefined;
      const keys = await listBibleObjects(config.client, config.bucket);
      const assets = findBibleChapterAssets(keys, book, chapter, forcedPrefix);
      if (!assets) {
        res.status(404).json({
          error: `Text for ${book} chapter ${chapter} was not found.`,
        });
        return;
      }

      const object = await config.client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: assets.textKey }),
      );
      const text = await object.Body?.transformToString("utf-8");
      if (text === undefined) {
        res.status(404).json({ error: `Text for ${book} chapter ${chapter} was not found.` });
        return;
      }

      let verses: ReturnType<typeof parseBibleWebVtt> | undefined;
      if (assets.audioKey && assets.timingKey) {
        try {
          const timingObject = await config.client.send(
            new GetObjectCommand({ Bucket: config.bucket, Key: assets.timingKey }),
          );
          const timingText = await timingObject.Body?.transformToString("utf-8");
          if (timingText) {
            const parsedVerses = parseBibleWebVtt(timingText);
            verses = alignBibleWebVttToChapterText(text, parsedVerses) ?? undefined;
          }
        } catch (error) {
          const timingError = error as {
            name?: string;
            $metadata?: { httpStatusCode?: number };
          };
          if (
            timingError.name !== "NoSuchKey" &&
            timingError.name !== "NotFound" &&
            timingError.$metadata?.httpStatusCode !== 404
          ) {
            throw error;
          }
        }
      }
      if (!verses && assets.audioKey && book === "matthew") {
        verses =
          (chapter === 1
            ? createMatthewChapterOneTimings(text)
            : createApproximateMatthewChapterTimings(chapter, text)) ?? undefined;
      }

      const audioUrl = assets.audioKey
        ? await signAudioUrl(
            config.client,
            new GetObjectCommand({ Bucket: config.bucket, Key: assets.audioKey }),
            { expiresIn: signedUrlLifetimeSeconds },
          )
        : null;

      res.json({
        book,
        chapter,
        text,
        ...(verses ? { verses } : {}),
        audioUrl,
        audioUrlExpiresIn: signedUrlLifetimeSeconds,
      });
    } catch (error) {
      const code = (error as { name?: string }).name;
      if (code === "NoSuchKey" || code === "NotFound") {
        res.status(404).json({
          error: `Text for ${book} chapter ${chapter} was not found.`,
        });
        return;
      }
      req.log.error(
        { errorCode: code ?? "unknown" },
        `Could not load ${book} chapter ${chapter} from Bible storage`,
      );
      res.status(502).json({ error: "Could not load this chapter from Bible storage." });
    }
  });

  // Keep the original route available to existing clients while they update.
  return router;
}

export default createBibleRouter();
