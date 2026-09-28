import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InvoiceActions } from "@/components/InvoiceActions";
import { GlassCard } from "@/components/ui";
import { formatAmount, formatAfn, formatDate, invoiceStatusLabel } from "@/lib/format";
import { remaining, toNumber } from "@/lib/money";
import { getInvoice } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getInvoice(Number(id));
  if (!data || data.invoice.type !== "purchase") notFound();
  const { invoice, items, party } = data;
  const rem = remaining(toNumber(invoice.totalOriginal), toNumber(invoice.paidOriginal));

  return (
    <AppShell title={invoice.number}>
      <GlassCard>
        <p className="m-0 text-sm muted">
          {invoiceStatusLabel(invoice.status)} · {formatDate(invoice.issueDate)}
        </p>
        <h2 className="mt-1 mb-1">{party?.name ?? "تأمین‌کننده بدون نام"}</h2>
        <p className="m-0 text-2xl num">{formatAmount(invoice.totalOriginal, invoice.currencyCode)}</p>
        {invoice.currencyCode !== "AFN" ? (
          <p className="m-0 text-sm muted">معادل {formatAfn(invoice.totalAfn)}</p>
        ) : null}
        <p className="mb-0 mt-2 text-sm">
          پرداخت‌شده: {formatAmount(invoice.paidOriginal, invoice.currencyCode)}
          {rem > 0 ? ` · باقی: ${formatAmount(rem, invoice.currencyCode)}` : " · تسویه شد"}
        </p>
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">اقلام خرید</p>
        {items.map((row) => (
          <div key={row.item.id} className="mb-2 flex justify-between gap-3">
            <span>
              {row.productName} × {row.item.quantity} {row.unit}
            </span>
            <span className="num">{formatAmount(row.item.lineTotal, invoice.currencyCode)}</span>
          </div>
        ))}
      </GlassCard>
      <InvoiceActions id={invoice.id} type="purchase" status={invoice.status} />
      {rem > 0 ? (
        <Link href="/treasury/new" className="btn btn-ghost w-full">
          ثبت پرداخت باقی‌مانده
        </Link>
      ) : null}
    </AppShell>
  );
}
