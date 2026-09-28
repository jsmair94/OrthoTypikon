import { Router, type IRouter } from "express";
import {
  GetSynaxarionHomepageQueryParams,
  GetSynaxarionHomepageResponse,
} from "@workspace/api-zod";
import { invalidRequest } from "../lib/api-errors";
import { getSynaxarionHomepage } from "../services/synaxarion";

export function createSynaxarionHomepageRouter(
  homepageService: typeof getSynaxarionHomepage = getSynaxarionHomepage,
): IRouter {
  const router: IRouter = Router();

  router.get("/synaxarion/homepage", async (req, res): Promise<void> => {
    const parsed = GetSynaxarionHomepageQueryParams.safeParse(req.query);
    if (!parsed.success) throw invalidRequest();
    const content = await homepageService(parsed.data.locale ?? "ar");
    res.json(GetSynaxarionHomepageResponse.parse(content));
  });

  return router;
}
