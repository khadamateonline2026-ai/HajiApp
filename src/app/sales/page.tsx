import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, GlassCard } from "@/components/ui";
import { formatAmount, formatDate, invoiceStatusLabel } from "@/lib/format";
import { listInvoices } from "@/lib/queries";
import { remaining, toNumber } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const current = range === "today" || range === "week" ? range : "all";
  const rows = await listInvoices("sale", current);

  return (
    <AppShell
      title="فروش"
      action={
        <Link href="/sales/new" className="btn btn-primary">
          + فروش
        </Link>
      }
    >
      <div className="flex gap-2">
        {[
          ["today", "امروز"],
          ["week", "هفته"],
          ["all", "همه"],
        ].map(([key, label]) => (
          <Link key={key} href={`/sales?range=${key}`} className={`chip ${current === key ? "font-bold" : ""}`}>
            {label}
          </Link>
        ))}
      </div>
      <GlassCard>
        {rows.length === 0 ? (
          <EmptyState
            title="فروشی ثبت نشده"
            text="اولین فروش امروز را با دکمه بزرگ پایین بسازید."
            actionHref="/sales/new"
            actionLabel="ثبت فروش"
          />
        ) : (
          <div className="space-y-2">
            {rows.map(({ invoice, partyName }) => {
              const rem = remaining(toNumber(invoice.totalOriginal), toNumber(invoice.paidOriginal));
              return (
                <Link key={invoice.id} href={`/sales/${invoice.id}`} className="list-row bg-white/25">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-semibold">{invoice.number}</p>
                    <p className="m-0 text-sm muted">
                      {partyName ?? "بدون نام"} · {formatDate(invoice.issueDate)} · {invoiceStatusLabel(invoice.status)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="m-0 num text-sm">{formatAmount(invoice.totalOriginal, invoice.currencyCode)}</p>
                    {rem > 0 ? <p className="m-0 text-xs" style={{ color: "var(--warning)" }}>باقی {formatAmount(rem, invoice.currencyCode)}</p> : <p className="m-0 text-xs muted">تسویه</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
