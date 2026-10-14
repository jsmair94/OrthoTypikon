import { Router, type IRouter } from "express";
import healthRouter from "./health";
import prayerCommunityRouter from "./prayer-community";
import contentRouter from "./content";
import adminRouter from "./admin";
import placesRouter from "./places";
import bibleRouter from "./bible";

const router: IRouter = Router();

router.use(healthRouter);
router.use(prayerCommunityRouter);
router.use(contentRouter);
router.use(placesRouter);
router.use(bibleRouter);
router.use(adminRouter);

export default router;
