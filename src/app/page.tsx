import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, GlassCard, StatCard } from "@/components/ui";
import { formatAmount, formatAfn, formatDate, invoiceTypeLabel } from "@/lib/format";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboard();

  return (
    <AppShell title="خانه">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="فروش امروز" value={formatAfn(data.salesToday)} hint={`${data.salesTodayCount} فاکتور`} />
        <StatCard label="دریافت امروز" value={formatAfn(data.recvToday)} hint="پولی که امروز گرفته شد" />
      </div>

      <GlassCard>
        <p className="m-0 text-sm muted">این ماه</p>
        <div className="mt-2 flex justify-between gap-3">
          <div>
            <p className="m-0 text-xs muted">فروش</p>
            <p className="mt-1 mb-0 num">{formatAfn(data.salesMonth)}</p>
          </div>
          <div>
            <p className="m-0 text-xs muted">خرید</p>
            <p className="mt-1 mb-0 num">{formatAfn(data.purchasesMonth)}</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/sales/new" className="btn btn-primary">
          + فروش
        </Link>
        <Link href="/purchases/new" className="btn btn-ghost">
          + خرید
        </Link>
        <Link href="/treasury/new" className="btn btn-ghost">
          + پول
        </Link>
      </div>

      <GlassCard>
        <div className="mb-2 flex items-center justify-between">
          <p className="m-0 font-semibold">موجودی کم</p>
          <Link href="/warehouse" className="text-sm" style={{ color: "var(--primary)" }}>
            گدام
          </Link>
        </div>
        {data.lowStock.length === 0 ? (
          <p className="m-0 muted text-sm">همه کالاها به اندازه کافی موجود است.</p>
        ) : (
          <div className="space-y-2">
            {data.lowStock.slice(0, 4).map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="list-row bg-[var(--primary-soft)]">
                <img
                  src={p.imageUrl || "/icons/icon-512.png"}
                  alt=""
                  className="h-10 w-10 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold">{p.name}</p>
                  <p className="m-0 text-sm muted">
                    مانده: {data.stock[p.id] ?? 0} {p.unit}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">صندوق‌ها</p>
        <div className="space-y-2">
          {data.balances.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <span className="muted text-sm">{a.name}</span>
              <span className="num">{formatAmount(a.balance, a.currencyCode)}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">آخرین فاکتورها</p>
        {data.recent.length === 0 ? (
          <EmptyState title="هنوز فاکتوری نیست" text="از دکمه فروش یا خرید شروع کنید." />
        ) : (
          <div className="space-y-2">
            {data.recent.map((row) => (
              <Link
                key={row.id}
                href={row.type === "sale" ? `/sales/${row.id}` : `/purchases/${row.id}`}
                className="list-row bg-white/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold">
                    {invoiceTypeLabel(row.type)} {row.number}
                  </p>
                  <p className="m-0 text-sm muted">
                    {row.partyName ?? "بدون نام"} · {formatDate(row.issueDate)}
                  </p>
                </div>
                <span className="num text-sm">{formatAmount(row.totalOriginal, row.currencyCode)}</span>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
