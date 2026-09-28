import { Router, type IRouter } from "express";
import healthRouter from "./health";
import prayerCommunityRouter from "./prayer-community";
import contentRouter from "./content";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(prayerCommunityRouter);
router.use(contentRouter);
router.use(adminRouter);

export default router;
