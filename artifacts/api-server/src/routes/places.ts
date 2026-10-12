import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  orthodoxPlaceReportsTable,
  orthodoxPlacesTable,
} from "@workspace/db";
import {
  ListNearbyOrthodoxPlacesQueryParams,
  ListNearbyOrthodoxPlacesResponse,
  ReportOrthodoxPlaceBody,
  ReportOrthodoxPlaceParams,
  ReportOrthodoxPlaceResponse,
} from "@workspace/api-zod";
import { DatabaseUnavailableError, invalidRequest, notFound } from "../lib/api-errors";
import { sortPlacesWithinRadius } from "../lib/orthodox-place-search";

const router: IRouter = Router();
const REPORT_RATE_WINDOW_MS = 60 * 60 * 1000;
const REPORT_RATE_LIMIT = 5;

type RateBucket = { count: number; resetAt: number };
const reportRateBuckets = new Map<string, RateBucket>();

function requireDatabase() {
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

function allowPlaceReport(ip: string, res: Response) {
  const now = Date.now();
  if (reportRateBuckets.size > 10_000) {
    for (const [key, bucket] of reportRateBuckets) {
      if (bucket.resetAt <= now) reportRateBuckets.delete(key);
    }
  }
  const current = reportRateBuckets.get(ip);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + REPORT_RATE_WINDOW_MS }
    : current;
  bucket.count += 1;
  reportRateBuckets.set(ip, bucket);
  if (bucket.count <= REPORT_RATE_LIMIT) return true;
  res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
  res.status(429).json({ error: "Too many place reports. Try again later." });
  return false;
}

router.get("/places/nearby", async (req, res): Promise<void> => {
  const parsed = ListNearbyOrthodoxPlacesQueryParams.safeParse(req.query);
  if (!parsed.success) throw invalidRequest();
  const { latitude, longitude, radiusKm } = parsed.data;
  const rows = await requireDatabase()
    .select()
    .from(orthodoxPlacesTable)
    .where(eq(orthodoxPlacesTable.status, "active"));
  const nearby = sortPlacesWithinRadius(
    rows,
    { latitude, longitude },
    radiusKm,
  ).map(({ id, name, category, jurisdiction, latitude: placeLatitude, longitude: placeLongitude, distanceKm, address, sourceName, sourceUrl, verificationDetails, isVerified }) => ({
    id,
    name,
    category,
    jurisdiction,
    latitude: placeLatitude,
    longitude: placeLongitude,
    distanceKm,
    address,
    sourceName,
    sourceUrl,
    verificationDetails,
    isVerified,
  }));
  res.json(ListNearbyOrthodoxPlacesResponse.parse(nearby));
});

router.post("/places/:placeId/reports", async (req, res): Promise<void> => {
  const params = ReportOrthodoxPlaceParams.safeParse(req.params);
  const body = ReportOrthodoxPlaceBody.safeParse(req.body);
  if (!params.success || !body.success) throw invalidRequest();
  const details = body.data.details.trim();
  if (details.length < 5) {
    throw invalidRequest("Please include at least five characters describing the correction.");
  }
  if (!allowPlaceReport(req.ip ?? "unknown", res)) return;

  const database = requireDatabase();
  const [place] = await database
    .select({ id: orthodoxPlacesTable.id })
    .from(orthodoxPlacesTable)
    .where(and(
      eq(orthodoxPlacesTable.id, params.data.placeId),
      eq(orthodoxPlacesTable.status, "active"),
    ))
    .limit(1);
  if (!place) throw notFound("Place listing was not found.");

  const now = new Date();
  const [report] = await database
    .insert(orthodoxPlaceReportsTable)
    .values({
      id: randomUUID(),
      placeId: place.id,
      details,
      createdAt: now,
    })
    .returning({ id: orthodoxPlaceReportsTable.id, createdAt: orthodoxPlaceReportsTable.createdAt });
  res.status(201).json(ReportOrthodoxPlaceResponse.parse(report));
});

export default router;