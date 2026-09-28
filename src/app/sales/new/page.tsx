import { AppShell } from "@/components/AppShell";
import { InvoiceForm } from "@/components/InvoiceForm";
import { getAccounts, getLatestRates, getParties, getProducts, getWarehouses } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const [products, parties, accounts, warehouses, rates] = await Promise.all([
    getProducts(),
    getParties("customer"),
    getAccounts(),
    getWarehouses(),
    getLatestRates(),
  ]);

  return (
    <AppShell title="فروش جدید">
      <p className="m-0 muted text-sm">فقط بگویید به کی، چه چیزی، و به چه قیمتی فروختید.</p>
      <InvoiceForm
        type="sale"
        products={products}
        parties={parties}
        accounts={accounts}
        warehouses={warehouses}
        rates={rates}
      />
    </AppShell>
  );
}
