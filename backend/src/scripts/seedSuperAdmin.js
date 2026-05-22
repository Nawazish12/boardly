
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { hashPassword } from "../utils/authHelpers.js";

async function run() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!email || !password) {
    console.error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env first.");
    process.exit(1);
  }

  await mongoose.connect(env.mongodbUri);

  const existing = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (existing) {
    existing.platformRole = "super_admin";
    existing.status = "active";
    await existing.save();
    console.log(`Promoted existing user to super_admin: ${email}`);
  } else {
    await User.create({
      name,
      email: email.toLowerCase(),
      password: await hashPassword(password),
      platformRole: "super_admin",
      status: "active",
    });
    console.log(`Created super_admin: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
