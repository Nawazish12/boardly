import { Router } from "express";
import { param } from "express-validator";
import * as orgController from "../controllers/organizationController.js";
import * as memberController from "../controllers/memberController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, resolveOrg } from "../middleware/resolveOrg.js";
import {
  createOrgValidation,
  updateOrgValidation,
} from "../validators/organizationValidator.js";
import {
  inviteValidation,
  roleValidation,
} from "../validators/memberValidator.js";
import { validateRequest } from "../validators/authValidator.js";

const router = Router();

// All organization routes require authentication.
router.use(authenticate);

/**
 * @swagger
 * /orgs:
 *   post:
 *     summary: Create an organization (creator becomes Org Admin)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 120
 *                 example: Acme Inc
 *     responses:
 *       201:
 *         description: Organization created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: List organizations the caller belongs to
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of organizations (each with the caller's role)
 *       401:
 *         description: Unauthorized
 */
router.post("/", createOrgValidation, validateRequest, orgController.createOrganization);
router.get("/", orgController.listMyOrganizations);

const orgIdParam = param("orgId").isMongoId().withMessage("Invalid organization id");

/**
 * @swagger
 * /orgs/{orgId}:
 *   get:
 *     summary: Get an organization the caller is a member of
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Not found / not a member
 *   patch:
 *     summary: Update organization settings (admin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 120
 *                 example: Renamed Org
 *     responses:
 *       200:
 *         description: Organization updated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete organization (owner only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization deleted
 *       403:
 *         description: Only the owner can delete
 *       404:
 *         description: Not found
 */
router.get(
  "/:orgId",
  orgIdParam,
  validateRequest,
  resolveOrg(),
  orgController.getOrganization
);

router.patch(
  "/:orgId",
  orgIdParam,
  updateOrgValidation,
  validateRequest,
  resolveOrg(),
  requireRole("admin"),
  orgController.updateOrganization
);

router.delete(
  "/:orgId",
  orgIdParam,
  validateRequest,
  resolveOrg(),
  requireRole("admin"),
  orgController.deleteOrganization
);

// ---- Members (org-scoped) ----
/**
 * @swagger
 * /orgs/{orgId}/members:
 *   get:
 *     summary: List members of an organization (any member)
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of members }
 */
router.get(
  "/:orgId/members",
  orgIdParam,
  validateRequest,
  resolveOrg(),
  memberController.listMembers
);

/**
 * @swagger
 * /orgs/{orgId}/members/{userId}:
 *   patch:
 *     summary: Change a member's role (admin only)
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [admin, member] }
 *     responses:
 *       200: { description: Updated member }
 *       400: { description: Last-admin guard / validation }
 *   delete:
 *     summary: Remove a member (admin only)
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Member removed }
 *       400: { description: Owner / last-admin guard }
 */
router.patch(
  "/:orgId/members/:userId",
  orgIdParam,
  param("userId").isMongoId().withMessage("Invalid user id"),
  roleValidation,
  validateRequest,
  resolveOrg(),
  requireRole("admin"),
  memberController.changeMemberRole
);

router.delete(
  "/:orgId/members/:userId",
  orgIdParam,
  param("userId").isMongoId().withMessage("Invalid user id"),
  validateRequest,
  resolveOrg(),
  requireRole("admin"),
  memberController.removeMember
);

// ---- Invites (org-scoped, admin only) ----
/**
 * @swagger
 * /orgs/{orgId}/invites:
 *   post:
 *     summary: Invite someone by email (admin only)
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [admin, member] }
 *     responses:
 *       201: { description: Invite created (link returned/logged) }
 *   get:
 *     summary: List pending invites (admin only)
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pending invites }
 */
router.post(
  "/:orgId/invites",
  orgIdParam,
  inviteValidation,
  validateRequest,
  resolveOrg(),
  requireRole("admin"),
  memberController.createInvite
);

router.get(
  "/:orgId/invites",
  orgIdParam,
  validateRequest,
  resolveOrg(),
  requireRole("admin"),
  memberController.listInvites
);

/**
 * @swagger
 * /orgs/{orgId}/invites/{inviteId}:
 *   delete:
 *     summary: Revoke a pending invite (admin only)
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Invite revoked }
 */
router.delete(
  "/:orgId/invites/:inviteId",
  orgIdParam,
  param("inviteId").isMongoId().withMessage("Invalid invite id"),
  validateRequest,
  resolveOrg(),
  requireRole("admin"),
  memberController.revokeInvite
);

export default router;
