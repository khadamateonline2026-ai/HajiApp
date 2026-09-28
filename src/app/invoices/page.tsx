import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";
import { formatAmount, formatDate, invoiceStatusLabel, invoiceTypeLabel } from "@/lib/format";
import { listInvoices } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [sales, purchases] = await Promise.all([listInvoices("sale"), listInvoices("purchase")]);
  const rows = [...sales, ...purchases].sort((a, b) => (a.invoice.issueDate < b.invoice.issueDate ? 1 : -1));
  return (
    <AppShell title="فاکتورها">
      <div className="grid grid-cols-2 gap-2">
        <Link href="/sales/new" className="btn btn-primary">
          فروش
        </Link>
        <Link href="/purchases/new" className="btn btn-ghost">
          خرید
        </Link>
      </div>
      <GlassCard>
        {rows.map(({ invoice, partyName }) => (
          <Link
            key={invoice.id}
            href={invoice.type === "sale" ? `/sales/${invoice.id}` : `/purchases/${invoice.id}`}
            className="mb-2 flex justify-between gap-3"
          >
            <div>
              <p className="m-0 font-semibold">
                {invoiceTypeLabel(invoice.type)} {invoice.number}
              </p>
              <p className="m-0 text-sm muted">
                {partyName ?? "—"} · {formatDate(invoice.issueDate)} · {invoiceStatusLabel(invoice.status)}
              </p>
            </div>
            <span className="num text-sm">{formatAmount(invoice.totalOriginal, invoice.currencyCode)}</span>
          </Link>
        ))}
      </GlassCard>
    </AppShell>
  );
}
