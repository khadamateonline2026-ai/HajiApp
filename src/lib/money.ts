export const BASE_CURRENCY = "AFN";

export const CURRENCY_LABELS: Record<string, string> = {
  AFN: "افغانی",
  USD: "دالر",
  EUR: "یورو",
  PKR: "کلدار",
};

export function roundMoney(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export function roundQty(value: number): number {
  return roundMoney(value, 4);
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function moneyStr(value: number, digits = 4): string {
  return roundMoney(value, digits).toFixed(digits);
}

export function amountToAfn(amountOriginal: number, rateToAfn: number): number {
  return roundMoney(amountOriginal * rateToAfn, 2);
}

export function remaining(total: number, paid: number): number {
  return roundMoney(Math.max(0, total - paid), 4);
}
