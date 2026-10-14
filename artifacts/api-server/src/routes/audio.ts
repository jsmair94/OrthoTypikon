import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Router, type IRouter } from "express";
import { Readable } from "node:stream";

const AUDIO_KEY = "الرئيسية/استمع.mp3";

type AudioStorageConfig = {
  bucket: string;
  client: S3Client;
};

function getStorageConfig(): AudioStorageConfig | null {
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

function isMissingObject(error: unknown): boolean {
  return error instanceof Error && ["NoSuchKey", "NotFound"].includes(error.name);
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return undefined;
  const metadata = (error as { $metadata?: { httpStatusCode?: unknown } }).$metadata;
  return typeof metadata?.httpStatusCode === "number" ? metadata.httpStatusCode : undefined;
}

const router: IRouter = Router();

router.head("/audio/morning-hymn", async (_req, res) => {
  const storage = getStorageConfig();
  if (!storage) return res.status(503).end();

  try {
    const result = await storage.client.send(
      new HeadObjectCommand({ Bucket: storage.bucket, Key: AUDIO_KEY }),
    );
    res.set({
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "audio/mpeg",
      ...(result.ContentLength === undefined
        ? {}
        : { "Content-Length": String(result.ContentLength) }),
    });
    return res.status(200).end();
  } catch (error) {
    return res.status(isMissingObject(error) ? 404 : 502).end();
  }
});

router.get("/audio/morning-hymn", async (req, res) => {
  const storage = getStorageConfig();
  if (!storage) return res.status(503).json({ error: "Audio storage unavailable" });

  try {
    const result = await storage.client.send(
      new GetObjectCommand({
        Bucket: storage.bucket,
        Key: AUDIO_KEY,
        ...(req.header("range") ? { Range: req.header("range") } : {}),
      }),
    );
    if (!result.Body) return res.status(404).end();

    res.status(result.ContentRange ? 206 : 200);
    res.set({
      "Accept-Ranges": result.AcceptRanges ?? "bytes",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "audio/mpeg",
      ...(result.ContentLength === undefined
        ? {}
        : { "Content-Length": String(result.ContentLength) }),
      ...(result.ContentRange ? { "Content-Range": result.ContentRange } : {}),
    });

    const stream = result.Body as Readable;
    stream.on("error", () => {
      if (!res.destroyed) res.destroy();
    });
    stream.pipe(res);
    return;
  } catch (error) {
    if (isMissingObject(error)) return res.status(404).end();
    if (getHttpStatus(error) === 416) {
      res.set("Accept-Ranges", "bytes");
      return res.status(416).end();
    }
    return res.status(502).json({ error: "Could not load audio from storage" });
  }
});

export default router;
