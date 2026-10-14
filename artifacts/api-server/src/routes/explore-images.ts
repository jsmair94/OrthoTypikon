import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Router, type IRouter } from "express";

const imageKeys: Record<string, string> = {
  library: "استكشف/المكتبة.jpg",
  prayer: "استكشف/المسبحة.jpg",
  kitchen: "استكشف/المطبخ.jpg",
  learn: "استكشف/السنكسار والقاموس.jpg",
  pastoral: "استكشف/اعياد الاسماء.jpg",
  places: "استكشف/أماكن أرثوذكسية.jpg",
  prayers: "استكشف/الصلوات.jpg",
};

function getStorageConfig() {
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

const router: IRouter = Router();

router.get("/explore-images/:imageId", async (req, res) => {
  const key = imageKeys[req.params.imageId];
  if (!key) return res.status(404).json({ error: "Image not found" });

  const storage = getStorageConfig();
  if (!storage) return res.status(503).json({ error: "Image storage unavailable" });

  try {
    const result = await storage.client.send(
      new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
    if (!result.Body) return res.status(404).json({ error: "Image not found" });

    const image = await result.Body.transformToByteArray();
    res.setHeader("Content-Type", result.ContentType ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    res.setHeader("Content-Length", image.byteLength);
    return res.status(200).end(Buffer.from(image));
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") {
      return res.status(404).json({ error: "Image not found" });
    }
    return res.status(502).json({ error: "Could not load image from storage" });
  }
});

export default router;
