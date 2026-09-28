import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// اول .env.local خوانده می‌شود و بعد .env — همان اولویت Next.js
// (dotenv به‌صورت پیش‌فرض مقادیر موجود را بازنویسی نمی‌کند).
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL پیدا نشد. رشتهٔ اتصال Postgres را در فایل .env.local بگذارید یا همراه دستور بدهید:\n" +
      '  DATABASE_URL="postgresql://..." npm run db:push',
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  verbose: true,
});
