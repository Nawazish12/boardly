import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { connectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

async function start() {
  try {
    await connectDatabase();
    await connectRedis();

    const { generalLimiter } = await import("./middleware/rateLimiter.js");
    const { default: apiRoutes } = await import("./routes/index.js");

    const app = express();
    // Request path in staging/prod is CloudFront -> ALB -> Express.
    // Trust two proxy hops so req.ip resolves to the actual client IP.
    // If this is lower, req.ip may resolve to CloudFront edges and rotate,
    // causing auth rate-limits to trigger later than configured.
    app.set("trust proxy", 2);

    // TEMP (trust-proxy verification): log resolved client IP for proxied requests.
    app.use((req, _res, next) => {
      if (req.headers["x-forwarded-for"]) {
        console.log(`[ipcheck] ${req.method} ${req.path} ip=${req.ip} xff=${req.headers["x-forwarded-for"]}`);
      }
      next();
    });

    app.use(helmet());
    app.use(cors({ origin: true }));
    app.use(express.json({ limit: "10kb" }));
    app.use(generalLimiter);

    app.get("/health", (_req, res) => {
      res.json({ ok: true, service: "backend", env: env.nodeEnv });
    });

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get("/api-docs.json", (_req, res) => {
      res.json(swaggerSpec);
    });

    app.use("/api", apiRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    app.listen(env.port, "0.0.0.0", () => {
      console.log(`Backend listening on http://0.0.0.0:${env.port}`);
      console.log(`Swagger docs: http://localhost:${env.port}/api-docs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
