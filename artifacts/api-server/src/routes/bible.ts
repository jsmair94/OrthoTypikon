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

type BibleRouterDependencies = {
  getStorageConfig?: () => BibleStorageConfig | null;
  signAudioUrl?: typeof getSignedUrl;
};

const bibleBooks = {
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
  const chapterFiles = new Map<string, Partial<BibleChapterAssets>>();
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

  const matches = [...chapterFiles.values()].filter(
    (assets): assets is BibleChapterAssets => Boolean(assets.textKey),
  );
  if (matches.length > 1) {
    throw new Error(`More than one folder contains ${book} chapter ${chapter}`);
  }
  return matches[0] ?? null;
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
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);

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
