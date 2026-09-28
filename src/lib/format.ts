import { CURRENCY_LABELS, toNumber } from "./money";

const fa = "fa-AF";

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(fa, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 2) : 0,
  }).format(value);
}

export function formatAmount(value: string | number | null | undefined, currency = "AFN"): string {
  const n = toNumber(value);
  const digits = currency === "AFN" || currency === "PKR" ? 0 : 2;
  const label = CURRENCY_LABELS[currency] ?? currency;
  return `${formatNumber(n, digits)} ${label}`;
}

export function formatAfn(value: string | number | null | undefined): string {
  return formatAmount(value, "AFN");
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(fa, { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthStartIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function invoiceStatusLabel(status: string): string {
  if (status === "posted") return "قطعی";
  if (status === "cancelled") return "لغو شده";
  return "پیش‌نویس";
}

export function invoiceTypeLabel(type: string): string {
  return type === "purchase" ? "خرید" : "فروش";
}
