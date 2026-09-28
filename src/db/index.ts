import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: Database;
};

/**
 * ساخت اتصال دیتابیس به‌صورت lazy (تنبل).
 *
 * مهم: این تابع فقط زمانی اجرا می‌شود که واقعاً یک کوئری زده شود (یعنی در زمان
 * اجرای درخواست/runtime)، نه در زمان import ماژول. پیش‌تر این کد در سطح ماژول
 * `throw new Error("DATABASE_URL is required")` داشت و چون Next.js در مرحلهٔ
 * «Collecting page data» هنگام build همهٔ ماژول‌ها را import می‌کند، بیلد ورسل
 * بدون وجود متغیر محیطی شکست می‌خورد.
 */
function createDatabase(): Database {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required — در ورسل (Settings → Environment Variables) رشتهٔ اتصال Postgres را تنظیم کنید.",
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    // در محیط‌های serverless (مثل ورسل) هر نمونهٔ تابع یک Pool مستقل می‌سازد؛
    // سقف ۱ اتصال از خطای «too many connections» جلوگیری می‌کند.
    max: 1,
  });

  globalForDb.__arenaNextJsPostgresqlPool = pool;
  return drizzle(pool, { schema });
}

export function getDb(): Database {
  if (!globalForDb.__arenaNextJsPostgresqlDb) {
    globalForDb.__arenaNextJsPostgresqlDb = createDatabase();
  }
  return globalForDb.__arenaNextJsPostgresqlDb;
}

/**
 * همان `db` قبلی برای تمام کدهای برنامه؛ فقط اتصال تا اولین کوئری به تعویق
 * می‌افتد و بین درخواست‌ها در همین پروسه کش می‌شود.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const real = getDb();
    const value = Reflect.get(real, property) as unknown;
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, property) {
    return Reflect.has(getDb(), property);
  },
});

export { schema };
