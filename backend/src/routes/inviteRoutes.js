import { Router } from "express";
import * as memberController from "../controllers/memberController.js";
import { authenticate } from "../middleware/authenticate.js";
import { acceptInviteValidation } from "../validators/memberValidator.js";
import { validateRequest } from "../validators/authValidator.js";

const router = Router();

/**
 * @swagger
 * /invites/accept:
 *   post:
 *     summary: Accept an invite (the logged-in user's email must match the invite)
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Invite accepted, membership created }
 *       400: { description: Invalid/expired invite }
 *       403: { description: Invite was sent to a different email }
 */
router.post(
  "/accept",
  authenticate,
  acceptInviteValidation,
  validateRequest,
  memberController.acceptInvite
);

export default router;
