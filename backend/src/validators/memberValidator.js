import { body } from "express-validator";

export const inviteValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("role")
    .optional()
    .isIn(["admin", "member"])
    .withMessage("role must be 'admin' or 'member'"),
];

export const roleValidation = [
  body("role").isIn(["admin", "member"]).withMessage("role must be 'admin' or 'member'"),
];

export const acceptInviteValidation = [
  body("token").notEmpty().withMessage("Invite token is required"),
];
