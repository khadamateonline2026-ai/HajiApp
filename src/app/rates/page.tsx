import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";
import { RateForm } from "@/components/SimpleForms";
import { formatDate } from "@/lib/format";
import { getCurrencies, getRateHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  const [currencies, history] = await Promise.all([getCurrencies(), getRateHistory()]);
  return (
    <AppShell title="ارز و نرخ">
      <p className="m-0 muted text-sm">
        ارز پایه همیشه افغانی است. برای دالر بنویسید یک دالر چند افغانی است؛ مثلاً ۷۰.
      </p>
      <RateForm currencies={currencies} />
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">تاریخچه نرخ</p>
        {history.slice(0, 20).map((r) => (
          <div key={r.id} className="mb-2 flex justify-between text-sm">
            <span>
              {r.currencyCode} · {formatDate(r.effectiveAt)}
            </span>
            <span className="num">{r.rateToAfn}</span>
          </div>
        ))}
      </GlassCard>
    </AppShell>
  );
}
