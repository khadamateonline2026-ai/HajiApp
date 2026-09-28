import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";
import { PartyForm } from "@/components/SimpleForms";
import { formatAmount, formatDate } from "@/lib/format";
import { getPartyDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPartyDetail(Number(id));
  if (!data) notFound();

  return (
    <AppShell title={data.party.name}>
      <GlassCard>
        <p className="mt-0 mb-2 font-semibold">مانده به تفکیک ارز</p>
        {Object.keys(data.byCurrency).length === 0 ? (
          <p className="m-0 muted text-sm">هنوز حسابی ندارد.</p>
        ) : (
          Object.entries(data.byCurrency).map(([code, b]) => {
            const customerRemain = b.sales - b.received;
            const supplierRemain = b.purchases - b.paid;
            return (
              <div key={code} className="mb-2">
                <p className="m-0 font-semibold">{code}</p>
                <p className="m-0 text-sm">طلب از او: {formatAmount(Math.max(0, customerRemain), code)}</p>
                <p className="m-0 text-sm">بدهی به او: {formatAmount(Math.max(0, supplierRemain), code)}</p>
              </div>
            );
          })
        )}
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">فاکتورها</p>
        {data.invoices.slice(0, 8).map((inv) => (
          <Link
            key={inv.id}
            href={inv.type === "sale" ? `/sales/${inv.id}` : `/purchases/${inv.id}`}
            className="mb-2 flex justify-between"
          >
            <span>
              {inv.number} · {formatDate(inv.issueDate)}
            </span>
            <span className="num">{formatAmount(inv.totalOriginal, inv.currencyCode)}</span>
          </Link>
        ))}
      </GlassCard>
      <PartyForm initial={data.party} />
    </AppShell>
  );
}
