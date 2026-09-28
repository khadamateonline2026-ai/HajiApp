"use client";

import { formatAmount, formatAfn, formatDate, invoiceTypeLabel } from "@/lib/format";
import { remaining, toNumber } from "@/lib/money";

type Data = Awaited<ReturnType<typeof import("@/lib/queries").getInvoice>>;
type Settings = Awaited<ReturnType<typeof import("@/lib/queries").getSettings>>;

export function PrintInvoice({
  data,
  settings,
}: {
  data: NonNullable<Data>;
  settings: Settings;
}) {
  const { invoice, items, party } = data;
  const rem = remaining(toNumber(invoice.totalOriginal), toNumber(invoice.paidOriginal));
  const thermal = settings.paperSize === "thermal";

  return (
    <div className={`mx-auto bg-white p-5 text-black ${thermal ? "max-w-[80mm]" : "max-w-[720px]"}`}>
      <div className="no-print mb-4 flex gap-2">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          چاپ / ذخیره PDF
        </button>
        <a href={invoice.type === "sale" ? `/sales/${invoice.id}` : `/purchases/${invoice.id}`} className="btn btn-ghost">
          بازگشت
        </a>
      </div>
      <header className="border-b pb-3 text-center">
        {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="mx-auto mb-2 h-14" /> : null}
        <h1 className="m-0 text-2xl">{settings.shopName}</h1>
        <p className="m-0 text-sm">
          {settings.shopPhone} {settings.shopAddress}
        </p>
        <p className="mt-2 mb-0 font-bold">
          فاکتور {invoiceTypeLabel(invoice.type)} · {invoice.number}
        </p>
      </header>
      <section className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="m-0">طرف حساب: {party?.name ?? "—"}</p>
          <p className="m-0">تماس: {party?.phone ?? "—"}</p>
        </div>
        <div>
          <p className="m-0">تاریخ: {formatDate(invoice.issueDate)}</p>
          <p className="m-0">ارز: {invoice.currencyCode}</p>
        </div>
      </section>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-right">کالا</th>
            <th className="py-2 text-right">تعداد</th>
            <th className="py-2 text-right">قیمت</th>
            <th className="py-2 text-right">جمع</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.item.id} className="border-b border-black/10">
              <td className="py-2">{row.productName}</td>
              <td className="py-2">
                {row.item.quantity} {row.unit}
              </td>
              <td className="py-2">{formatAmount(row.item.unitPrice, invoice.currencyCode)}</td>
              <td className="py-2">{formatAmount(row.item.lineTotal, invoice.currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="mt-4 text-sm">
        <p className="m-0">جمع جزء: {formatAmount(invoice.subtotalOriginal, invoice.currencyCode)}</p>
        <p className="m-0">تخفیف: {formatAmount(invoice.discountAmount, invoice.currencyCode)}</p>
        <p className="m-0">مالیات: {formatAmount(invoice.taxAmount, invoice.currencyCode)}</p>
        <p className="m-0">کرایه: {formatAmount(invoice.shippingAmount, invoice.currencyCode)}</p>
        <p className="mt-2 mb-0 text-lg font-bold">
          قابل پرداخت: {formatAmount(invoice.totalOriginal, invoice.currencyCode)}
        </p>
        {invoice.currencyCode !== "AFN" ? <p className="m-0">معادل: {formatAfn(invoice.totalAfn)}</p> : null}
        <p className="m-0">پرداخت‌شده: {formatAmount(invoice.paidOriginal, invoice.currencyCode)}</p>
        <p className="m-0">باقی‌مانده: {formatAmount(rem, invoice.currencyCode)}</p>
      </section>
      {invoice.note ? <p className="mt-3 text-sm">یادداشت: {invoice.note}</p> : null}
      <section className="mt-10 grid grid-cols-2 gap-6 text-center text-sm">
        <div>
          <p>امضای فروشنده</p>
          <div className="mt-8 border-t border-black/30" />
        </div>
        <div>
          <p>امضای مشتری</p>
          <div className="mt-8 border-t border-black/30" />
        </div>
      </section>
    </div>
  );
}
