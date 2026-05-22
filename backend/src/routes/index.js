import { Router } from "express";
import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import inviteRoutes from "./inviteRoutes.js";
import organizationRoutes from "./organizationRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/orgs", organizationRoutes);
router.use("/invites", inviteRoutes);

export default router;
