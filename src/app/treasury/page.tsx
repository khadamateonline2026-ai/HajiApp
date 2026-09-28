import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, GlassCard } from "@/components/ui";
import { formatAmount, formatAfn, formatDate } from "@/lib/format";
import { getAccountBalances, listPayments } from "@/lib/queries";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  receive: "دریافت",
  pay: "پرداخت",
  other_receive: "دریافت متفرقه",
  other_pay: "پرداخت متفرقه",
  transfer: "انتقال",
};

export default async function TreasuryPage() {
  const [balances, rows] = await Promise.all([getAccountBalances(), listPayments()]);

  return (
    <AppShell
      title="خزانه"
      action={
        <Link href="/treasury/new" className="btn btn-primary">
          + پول
        </Link>
      }
    >
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">مانده حساب‌ها</p>
        <div className="space-y-2">
          {balances.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <div>
                <p className="m-0">{a.name}</p>
                <p className="m-0 text-xs muted">{a.type === "bank" ? "بانک" : "صندوق"}</p>
              </div>
              <div className="text-left">
                <p className="m-0 num">{formatAmount(a.balance, a.currencyCode)}</p>
                {a.currencyCode !== "AFN" ? <p className="m-0 text-xs muted">{formatAfn(a.balanceAfn)}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/treasury/new?type=receive" className="btn btn-primary">
          دریافت
        </Link>
        <Link href="/treasury/new?type=pay" className="btn btn-ghost">
          پرداخت
        </Link>
      </div>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">گردش پول</p>
        {rows.length === 0 ? (
          <EmptyState title="هنوز پولی ثبت نشده" text="دریافت از مشتری یا پرداخت به فروشنده را اینجا بنویسید." />
        ) : (
          <div className="space-y-2">
            {rows.map(({ payment, accountName, partyName }) => (
              <Link key={payment.id} href={`/treasury/${payment.id}/print`} className="list-row bg-white/25">
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold">{typeLabel[payment.type] ?? payment.type}</p>
                  <p className="m-0 text-sm muted">
                    {partyName ?? accountName} · {formatDate(payment.paidAt)}
                  </p>
                </div>
                <span className="num text-sm">{formatAmount(payment.amountOriginal, payment.currencyCode)}</span>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
      <Link href="/treasury/accounts" className="btn btn-ghost w-full">
        حساب جدید صندوق/بانک
      </Link>
    </AppShell>
  );
}
