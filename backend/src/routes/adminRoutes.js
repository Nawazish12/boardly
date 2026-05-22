import { Router } from "express";
import { body, param } from "express-validator";
import * as adminController from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePlatformRole } from "../middleware/requirePlatformRole.js";
import { validateRequest } from "../validators/authValidator.js";

const router = Router();

router.use(authenticate, requirePlatformRole("super_admin"));

const statusValidation = [
  body("status")
    .isIn(["active", "suspended"])
    .withMessage("status must be 'active' or 'suspended'"),
];

/**
 * @swagger
 * /admin/metrics:
 *   get:
 *     summary: Platform-wide metrics (super admin only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Metrics }
 *       403: { description: Insufficient permissions }
 */
router.get("/metrics", adminController.getMetrics);

/**
 * @swagger
 * /admin/organizations:
 *   get:
 *     summary: List organizations (paginated, searchable) — super admin only
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, suspended] } }
 *     responses:
 *       200: { description: Paginated organizations }
 */
router.get("/organizations", adminController.listOrganizations);

/**
 * @swagger
 * /admin/organizations/{orgId}/status:
 *   patch:
 *     summary: Suspend or reactivate an organization — super admin only
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: orgId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties: { status: { type: string, enum: [active, suspended] } }
 *     responses:
 *       200: { description: Updated organization }
 *       404: { description: Organization not found }
 */
router.patch(
  "/organizations/:orgId/status",
  param("orgId").isMongoId().withMessage("Invalid organization id"),
  statusValidation,
  validateRequest,
  adminController.updateOrganizationStatus
);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List users (paginated, searchable) — super admin only
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, suspended] } }
 *       - { in: query, name: role, schema: { type: string, enum: [user, super_admin] } }
 *     responses:
 *       200: { description: Paginated users }
 */
router.get("/users", adminController.listUsers);

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   patch:
 *     summary: Suspend or reactivate a user — super admin only
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties: { status: { type: string, enum: [active, suspended] } }
 *     responses:
 *       200: { description: Updated user }
 *       400: { description: Cannot change your own status }
 *       404: { description: User not found }
 */
router.patch(
  "/users/:userId/status",
  param("userId").isMongoId().withMessage("Invalid user id"),
  statusValidation,
  validateRequest,
  adminController.updateUserStatus
);

export default router;
