import { AppShell } from "@/components/AppShell";
import { EmptyState, GlassCard } from "@/components/ui";
import { ExpenseForm } from "@/components/SimpleForms";
import { formatAmount, formatDate } from "@/lib/format";
import { getAccounts, getLatestRates, listExpenses } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [rows, accounts, rates] = await Promise.all([listExpenses(), getAccounts(), getLatestRates()]);
  return (
    <AppShell title="هزینه‌ها">
      <ExpenseForm accounts={accounts} rates={rates} />
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">لیست هزینه‌ها</p>
        {rows.length === 0 ? (
          <EmptyState title="هزینه‌ای نیست" text="کرایه، برق یا معاش را اینجا بنویسید." />
        ) : (
          rows.map(({ expense, accountName }) => (
            <div key={expense.id} className="mb-2 flex justify-between">
              <div>
                <p className="m-0">{expense.category}</p>
                <p className="m-0 text-sm muted">
                  {accountName} · {formatDate(expense.spentOn)}
                </p>
              </div>
              <span className="num">{formatAmount(expense.amountOriginal, expense.currencyCode)}</span>
            </div>
          ))
        )}
      </GlassCard>
    </AppShell>
  );
}
