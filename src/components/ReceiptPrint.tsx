"use client";

import { formatAmount, formatAfn, formatDate } from "@/lib/format";

const typeLabel: Record<string, string> = {
  receive: "رسید دریافت",
  pay: "رسید پرداخت",
  other_receive: "رسید دریافت متفرقه",
  other_pay: "رسید پرداخت متفرقه",
  transfer: "رسید انتقال",
};

export function ReceiptPrint({
  row,
  settings,
}: {
  row: NonNullable<Awaited<ReturnType<typeof import("@/lib/queries").getPayment>>>;
  settings: Awaited<ReturnType<typeof import("@/lib/queries").getSettings>>;
}) {
  const p = row.payment;
  return (
    <div className="mx-auto max-w-[420px] bg-white p-5 text-black">
      <div className="no-print mb-4 flex gap-2">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          چاپ / PDF
        </button>
        <a href="/treasury" className="btn btn-ghost">
          بازگشت
        </a>
      </div>
      <h1 className="m-0 text-center text-xl">{settings.shopName}</h1>
      <p className="mt-1 mb-4 text-center text-sm">{typeLabel[p.type] ?? "رسید"}</p>
      <p>تاریخ: {formatDate(p.paidAt)}</p>
      <p>طرف حساب: {row.partyName ?? "—"}</p>
      <p>حساب: {row.accountName}</p>
      <p className="text-lg font-bold">مبلغ: {formatAmount(p.amountOriginal, p.currencyCode)}</p>
      {p.currencyCode !== "AFN" ? <p>معادل: {formatAfn(p.amountAfn)} (نرخ {p.exchangeRateToAfn})</p> : null}
      {p.note ? <p>یادداشت: {p.note}</p> : null}
      <div className="mt-12 border-t border-black/30 pt-2 text-center text-sm">امضا</div>
    </div>
  );
}
