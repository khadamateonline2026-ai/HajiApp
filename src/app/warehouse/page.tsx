import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";
import { WarehouseForm } from "@/components/SimpleForms";
import { formatAfn } from "@/lib/format";
import { getProductStockMap, getProducts, getWarehouses } from "@/lib/queries";
import { toNumber } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const [products, stock, warehouses] = await Promise.all([
    getProducts(),
    getProductStockMap(),
    getWarehouses(),
  ]);
  const value = products.reduce((s, p) => s + (stock[p.id] ?? 0) * toNumber(p.avgCostAfn), 0);
  const low = products.filter((p) => (stock[p.id] ?? 0) <= toNumber(p.minStock));

  return (
    <AppShell title="گدام">
      <GlassCard>
        <p className="m-0 text-sm muted">ارزش موجودی (به بهای تمام‌شده)</p>
        <p className="mt-1 mb-0 text-2xl num">{formatAfn(value)}</p>
        <p className="mb-0 mt-2 text-sm">{warehouses.map((w) => w.name).join("، ")}</p>
      </GlassCard>
      {low.length > 0 ? (
        <GlassCard>
          <p className="mt-0 mb-3 font-semibold">هشدار کمبود</p>
          {low.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`} className="mb-2 flex justify-between">
              <span>{p.name}</span>
              <span className="num">
                {stock[p.id] ?? 0} {p.unit}
              </span>
            </Link>
          ))}
        </GlassCard>
      ) : null}
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">موجودی لحظه‌ای</p>
        {products.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <img src={p.imageUrl || "/icons/icon-512.png"} alt="" className="h-8 w-8 rounded-lg object-cover" />
              {p.name}
            </span>
            <span className="num">
              {stock[p.id] ?? 0} {p.unit}
            </span>
          </Link>
        ))}
      </GlassCard>
      <WarehouseForm />
    </AppShell>
  );
}
