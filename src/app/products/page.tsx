import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, GlassCard } from "@/components/ui";
import { getProductStockMap, getProducts } from "@/lib/queries";
import { formatAmount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, stock] = await Promise.all([getProducts(), getProductStockMap()]);
  return (
    <AppShell
      title="کالاها"
      action={
        <Link href="/products/new" className="btn btn-primary">
          + کالا
        </Link>
      }
    >
      <GlassCard>
        {products.length === 0 ? (
          <EmptyState title="کالایی نیست" text="نام، واحد و یک عکس ساده کافی است." actionHref="/products/new" actionLabel="کالای جدید" />
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="list-row bg-white/25">
                <img src={p.imageUrl || "/icons/icon-512.png"} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold">{p.name}</p>
                  <p className="m-0 text-sm muted">
                    موجودی {stock[p.id] ?? 0} {p.unit}
                    {p.defaultSalePrice ? ` · فروش ${formatAmount(p.defaultSalePrice, p.defaultCurrency)}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
