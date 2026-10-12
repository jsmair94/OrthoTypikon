import { Router, type IRouter } from "express";
import {
  GetSynaxarionDailyGospelResponse,
  GetSynaxarionDailyGospelQueryParams,
  GetSynaxarionHomepageQueryParams,
  GetSynaxarionHomepageResponse,
} from "@workspace/api-zod";
import { ApiProblemError, invalidRequest } from "../lib/api-errors";
import { getDailyGospelAudio } from "../services/daily-gospel-audio";
import {
  getDailyGospelReading,
  getSynaxarionHomepage,
} from "../services/synaxarion";

export function createSynaxarionHomepageRouter(
  homepageService: typeof getSynaxarionHomepage = getSynaxarionHomepage,
  dailyGospelService: typeof getDailyGospelReading = getDailyGospelReading,
  dailyGospelAudioService: typeof getDailyGospelAudio = getDailyGospelAudio,
): IRouter {
  const router: IRouter = Router();

  router.get("/synaxarion/homepage", async (req, res): Promise<void> => {
    const parsed = GetSynaxarionHomepageQueryParams.safeParse(req.query);
    if (!parsed.success) throw invalidRequest();
    const content = await homepageService(parsed.data.locale ?? "ar");
    res.json(GetSynaxarionHomepageResponse.parse(content));
  });

  router.get("/synaxarion/daily-gospel", async (req, res): Promise<void> => {
    const parsed = GetSynaxarionDailyGospelQueryParams.safeParse(req.query);
    if (!parsed.success) throw invalidRequest();
    const content = await dailyGospelService(parsed.data.locale ?? "ar");
    res.json(GetSynaxarionDailyGospelResponse.parse(content));
  });

  router.get(
    "/synaxarion/daily-gospel/audio",
    async (_req, res): Promise<void> => {
      try {
        const audio = await dailyGospelAudioService();
        if (!audio) {
          throw new ApiProblemError(
            503,
            "INTERNAL_ERROR",
            "The daily Gospel audio is currently unavailable.",
          );
        }
        res
          .status(200)
          .set("Content-Type", "audio/mpeg")
          .set("Cache-Control", "private, no-store")
          .send(audio);
      } catch (error) {
        if (error instanceof ApiProblemError) throw error;
        throw new ApiProblemError(
          503,
          "INTERNAL_ERROR",
          "The daily Gospel audio is currently unavailable.",
          { cause: error },
        );
      }
    },
  );

  return router;
}
