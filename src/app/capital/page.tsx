import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";
import { CapitalForm } from "@/components/SimpleForms";
import { formatAmount, formatAfn, formatDate } from "@/lib/format";
import { getAccounts, getLatestRates, listEquity } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CapitalPage() {
  const [rows, accounts, rates] = await Promise.all([listEquity(), getAccounts(), getLatestRates()]);
  const contrib = rows.filter((r) => r.row.type === "contribution");
  const draws = rows.filter((r) => r.row.type === "draw");
  return (
    <AppShell title="سرمایه">
      <p className="m-0 muted text-sm">
        آوردی یعنی پولی که خودتان داخل دکان می‌گذارید. برداشت یعنی پولی که برای خرج شخصی برمی‌دارید.
      </p>
      <CapitalForm accounts={accounts} rates={rates} />
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">آوردی‌ها</p>
        {contrib.map(({ row, accountName }) => (
          <div key={row.id} className="mb-2 flex justify-between">
            <span>
              {formatDate(row.occurredOn)} · {accountName}
            </span>
            <span className="num">{formatAmount(row.amountOriginal, row.currencyCode)}</span>
          </div>
        ))}
        {contrib.length === 0 ? <p className="m-0 muted text-sm">آوردی ثبت نشده.</p> : null}
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">برداشت‌ها</p>
        {draws.map(({ row, accountName }) => (
          <div key={row.id} className="mb-2 flex justify-between">
            <span>
              {formatDate(row.occurredOn)} · {accountName}
            </span>
            <span className="num">{formatAmount(row.amountOriginal, row.currencyCode)}</span>
          </div>
        ))}
        {draws.length === 0 ? <p className="m-0 muted text-sm">برداشتی نیست.</p> : null}
      </GlassCard>
      <GlassCard>
        <p className="m-0 muted text-sm">جمع آوردی به افغانی</p>
        <p className="mt-1 mb-0 num">
          {formatAfn(contrib.reduce((s, r) => s + Number(r.row.amountAfn), 0))}
        </p>
      </GlassCard>
    </AppShell>
  );
}
