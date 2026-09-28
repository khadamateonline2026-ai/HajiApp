import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AdjustStockForm, ProductForm } from "@/components/SimpleForms";
import { GlassCard } from "@/components/ui";
import { formatAfn, formatDate } from "@/lib/format";
import { getProductDetail, getWarehouses } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, warehouses] = await Promise.all([getProductDetail(Number(id)), getWarehouses()]);
  if (!data) notFound();
  const { product, kardex, onHand } = data;

  return (
    <AppShell title={product.name}>
      <GlassCard>
        <div className="flex gap-3">
          <img src={product.imageUrl || "/icons/icon-512.png"} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          <div>
            <p className="m-0 text-sm muted">{product.category} · {product.unit}</p>
            <p className="mt-1 mb-0 text-2xl num">
              {onHand} {product.unit}
            </p>
            <p className="m-0 text-sm muted">میانگین بها: {formatAfn(product.avgCostAfn)}</p>
          </div>
        </div>
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">کارتکس کالا</p>
        {kardex.length === 0 ? (
          <p className="m-0 muted text-sm">هنوز ورود و خروجی ثبت نشده.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {kardex.slice(0, 12).map((row) => (
              <div key={row.movement.id} className="flex justify-between gap-2">
                <span>
                  {formatDate(row.movement.occurredOn)} · {row.movement.type === "in" || row.movement.type === "adjust_in" ? "ورود" : "خروج"} {row.movement.quantity}
                </span>
                <span className="num">مانده {row.balance}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
      <AdjustStockForm productId={product.id} warehouses={warehouses} avgCost={product.avgCostAfn} />
      <ProductForm initial={product} />
    </AppShell>
  );
}
