import { AppShell } from "@/components/AppShell";
import { PaymentForm } from "@/components/SimpleForms";
import { getAccounts, getLatestRates, getParties } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const [accounts, parties, rates] = await Promise.all([getAccounts(), getParties(), getLatestRates()]);
  return (
    <AppShell title="ثبت پول">
      <p className="m-0 muted text-sm">پولی که گرفتید یا دادید را با ارز همان لحظه ثبت کنید.</p>
      <PaymentForm accounts={accounts} parties={parties} rates={rates} defaultType={type ?? "receive"} />
    </AppShell>
  );
}
