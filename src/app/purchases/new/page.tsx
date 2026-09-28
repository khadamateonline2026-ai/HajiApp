import { AppShell } from "@/components/AppShell";
import { InvoiceForm } from "@/components/InvoiceForm";
import { getAccounts, getLatestRates, getParties, getProducts, getWarehouses } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [products, parties, accounts, warehouses, rates] = await Promise.all([
    getProducts(),
    getParties("supplier"),
    getAccounts(),
    getWarehouses(),
    getLatestRates(),
  ]);

  return (
    <AppShell title="خرید جدید">
      <p className="m-0 muted text-sm">جنسی که به گدام می‌آید را همین‌جا ثبت کنید.</p>
      <InvoiceForm
        type="purchase"
        products={products}
        parties={parties}
        accounts={accounts}
        warehouses={warehouses}
        rates={rates}
      />
    </AppShell>
  );
}
