import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const isProd = process.env.NODE_ENV === "production";

  // 1. Startup Production Secrets Validation
  if (isProd) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      logger.error(
        "FATAL STARTUP BLOCKED: JWT_SECRET must be set and at least 32 characters in production.",
      );
      process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
      logger.error("FATAL STARTUP BLOCKED: DATABASE_URL must be configured.");
      process.exit(1);
    }
  }

  // 2. Safe Trust Proxy Configuration
  // In production, do not trust arbitrary public proxies unless explicitly configured via TRUST_PROXY
  let trustProxy: boolean | string | string[] = true;
  if (process.env.TRUST_PROXY) {
    const rawTrust = process.env.TRUST_PROXY.trim();
    if (rawTrust === "false") {
      trustProxy = false;
    } else if (rawTrust === "true") {
      trustProxy = true;
    } else if (rawTrust.includes(",")) {
      trustProxy = rawTrust.split(",").map((s) => s.trim());
    } else {
      trustProxy = rawTrust;
    }
  } else if (isProd) {
    // In production without explicit TRUST_PROXY, default to loopback to prevent header spoofing
    trustProxy = "127.0.0.1";
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy,
      bodyLimit: 25 * 1024 * 1024, // 25 MB max payload
    }),
  );

  // Register multipart support for bill uploads (15MB limit)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await app.register(require("@fastify/multipart"), {
    limits: {
      fileSize: 15 * 1024 * 1024,
    },
  });

  // 3. Graceful Shutdown Hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix("api/v1");
  const allowedOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;
  if (isProd && !allowedOrigins) {
    logger.warn(
      "CORS_ORIGIN / FRONTEND_URL not set in production. Restricting cross-origin access.",
    );
  }

  app.enableCors({
    origin: allowedOrigins
      ? allowedOrigins.split(",").map((s) => s.trim())
      : isProd
        ? false
        : true,
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, "0.0.0.0");
  logger.log(`Billing API Gateway running on: http://localhost:${port}/api/v1`);
}

bootstrap();
