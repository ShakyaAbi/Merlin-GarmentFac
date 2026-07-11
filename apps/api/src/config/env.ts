import dotenv from "dotenv";

dotenv.config();

const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  corsOrigins: (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  rateLimitEnabled: (process.env.RATE_LIMIT_ENABLED ?? "true") === "true",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
  authDisabled: (process.env.AUTH_DISABLED ?? "false") === "true",
  mlServiceUrl: process.env.ML_SERVICE_URL ?? "",
  mlServiceTimeoutMs: parseInt(
    process.env.ML_SERVICE_TIMEOUT_MS ?? "5000",
    10,
  ),
  mlServiceApiKey: process.env.ML_SERVICE_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleAuthRedirectUri:
    process.env.GOOGLE_AUTH_REDIRECT_URI ??
    "http://localhost:4000/api/v1/auth/google/callback",
  anomalyBackfillBatchSize: parseInt(
    process.env.ANOMALY_BACKFILL_BATCH_SIZE ?? "100",
    10,
  ),
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "noreply@merlin.local",
  },
  // Reminder scheduler configuration
  reminderSchedulerEnabled: (process.env.REMINDER_SCHEDULER_ENABLED ?? "true") === "true",
  // Cron expression for the reminder job (default: daily at 08:00)
  reminderCron: process.env.REMINDER_CRON ?? "0 8 * * *",
  // When true, email sending is a dry-run (logged only)
  emailDryRun: (process.env.EMAIL_DRY_RUN ?? "false") === "true",
};

export const adminSeed = {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
};
