import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GlassCard, StatCard } from "@/components/ui";
import { formatAfn, formatAmount } from "@/lib/format";
import { getReports } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const r = await getReports();
  return (
    <AppShell title="گزارش‌ها">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="فروش این ماه" value={formatAfn(r.revenueMonth)} />
        <StatCard label="سود تخمینی" value={formatAfn(r.net)} hint="فروش منهای بهای کالا و هزینه" />
      </div>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">سود و زیان ساده</p>
        <Row label="فروش (همه)" value={formatAfn(r.revenue)} />
        <Row label="بهای کالای فروخته‌شده" value={formatAfn(r.cogs)} />
        <Row label="سود ناخالص" value={formatAfn(r.gross)} />
        <Row label="هزینه‌ها" value={formatAfn(r.expenseTotal)} />
        <Row label="سود خالص تخمینی" value={formatAfn(r.net)} />
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">طلب از مشتری‌ها</p>
        {r.customerDebts.length === 0 ? (
          <p className="m-0 muted text-sm">طلب بازی نیست.</p>
        ) : (
          r.customerDebts.map((d) => (
            <div key={d.name} className="mb-2 flex justify-between">
              <span>{d.name}</span>
              <span className="num">{formatAfn(d.remainingAfn)}</span>
            </div>
          ))
        )}
        <Link href="/parties" className="mt-2 inline-block text-sm" style={{ color: "var(--primary)" }}>
          طرف حساب‌ها
        </Link>
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">بدهی به تأمین‌کننده‌ها</p>
        {r.supplierDebts.length === 0 ? (
          <p className="m-0 muted text-sm">بدهی بازی نیست.</p>
        ) : (
          r.supplierDebts.map((d) => (
            <div key={d.name} className="mb-2 flex justify-between">
              <span>{d.name}</span>
              <span className="num">{formatAfn(d.remainingAfn)}</span>
            </div>
          ))
        )}
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">گردش خزانه</p>
        {r.balances.map((a) => (
          <div key={a.id} className="mb-2 flex justify-between">
            <span>{a.name}</span>
            <span className="num">{formatAmount(a.balance, a.currencyCode)}</span>
          </div>
        ))}
      </GlassCard>
      <GlassCard>
        <Row label="ارزش موجودی گدام" value={formatAfn(r.inventoryValue)} />
        <Row label="خرید کل" value={formatAfn(r.purchaseTotal)} />
        <Row label="آوردی صاحب" value={formatAfn(r.contrib)} />
        <Row label="برداشت صاحب" value={formatAfn(r.draws)} />
        <Row label="سرمایه تخمینی" value={formatAfn(r.equity)} />
      </GlassCard>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex justify-between gap-3">
      <span className="muted">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
