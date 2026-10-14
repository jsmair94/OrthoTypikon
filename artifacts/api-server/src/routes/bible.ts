import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Router, type IRouter } from "express";

const router: IRouter = Router();
const matthewChapterCount = 28;
const signedUrlLifetimeSeconds = 60 * 60;
let cachedMatthewPrefix: { bucket: string; prefix: string; expiresAt: number } | null = null;

function getS3Config() {
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

async function findMatthewPrefix(client: S3Client, bucket: string): Promise<string | null> {
  if (process.env.BIBLE_MATTHEW_PREFIX) {
    return `${process.env.BIBLE_MATTHEW_PREFIX.replace(/^\/+|\/+$/g, "")}/`;
  }
  if (cachedMatthewPrefix?.bucket === bucket && cachedMatthewPrefix.expiresAt > Date.now()) {
    return cachedMatthewPrefix.prefix;
  }

  const candidates = new Map<string, Set<string>>();
  let continuationToken: string | undefined;

  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }));

    for (const item of page.Contents ?? []) {
      if (!item.Key) continue;
      const match = item.Key.match(/(?:^|\/)(?:متى|Matthew)\/(\d+)\.(txt|mp3)$/i);
      if (!match) continue;
      const suffix = `${match[1]}.${match[2].toLowerCase()}`;
      const prefix = item.Key.slice(0, -suffix.length);
      const assets = candidates.get(prefix) ?? new Set<string>();
      assets.add(suffix);
      candidates.set(prefix, assets);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  const complete = [...candidates.entries()]
    .filter(([, assets]) => Array.from({ length: matthewChapterCount }, (_, i) =>
      assets.has(`${i + 1}.txt`) && assets.has(`${i + 1}.mp3`),
    ).every(Boolean))
    .map(([prefix]) => prefix);

  if (complete.length === 1) {
    cachedMatthewPrefix = { bucket, prefix: complete[0], expiresAt: Date.now() + 5 * 60_000 };
    return complete[0];
  }
  if (complete.length > 1) {
    throw new Error("More than one complete Matthew folder was found. Set BIBLE_MATTHEW_PREFIX.");
  }

  const partial = [...candidates.entries()].sort((a, b) => b[1].size - a[1].size);
  if (!partial.length) return null;
  cachedMatthewPrefix = { bucket, prefix: partial[0][0], expiresAt: Date.now() + 5 * 60_000 };
  return partial[0][0];
}

router.get("/bible/matthew/:chapter", async (req, res): Promise<void> => {
  const rawChapter = Array.isArray(req.params.chapter) ? req.params.chapter[0] : req.params.chapter;
  const chapter = Number(rawChapter);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > matthewChapterCount) {
    res.status(400).json({ error: "Chapter must be a number from 1 to 28." });
    return;
  }

  const config = getS3Config();
  if (!config) {
    res.status(503).json({ error: "Bible storage is not connected to the API service yet." });
    return;
  }

  try {
    const prefix = await findMatthewPrefix(config.client, config.bucket);
    if (!prefix) {
      res.status(404).json({ error: "Matthew chapter files were not found in the connected bucket." });
      return;
    }

    const textKey = `${prefix}${chapter}.txt`;
    const audioKey = `${prefix}${chapter}.mp3`;
    await config.client.send(new HeadObjectCommand({
      Bucket: config.bucket,
      Key: audioKey,
    }));
    const object = await config.client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: textKey,
    }));
    const text = await object.Body?.transformToString("utf-8");
    if (text === undefined) {
      res.status(404).json({ error: `Text for Matthew chapter ${chapter} was not found.` });
      return;
    }

    const audioUrl = await getSignedUrl(
      config.client,
      new GetObjectCommand({ Bucket: config.bucket, Key: audioKey }),
      { expiresIn: signedUrlLifetimeSeconds },
    );

    res.json({
      book: "matthew",
      chapter,
      text,
      audioUrl,
      audioUrlExpiresIn: signedUrlLifetimeSeconds,
    });
  } catch (error) {
    const code = (error as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") {
      res.status(404).json({ error: `Text or audio for Matthew chapter ${chapter} was not found.` });
      return;
    }
    req.log.error({ errorCode: code ?? "unknown" }, "Could not load a Matthew chapter from Bible storage");
    res.status(502).json({ error: "Could not load this chapter from Bible storage." });
  }
});

export default router;
