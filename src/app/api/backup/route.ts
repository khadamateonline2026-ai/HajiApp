import { NextResponse } from "next/server";
import { db } from "@/db";
import { parties, products } from "@/db/schema";
import { exportAll } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const data = await exportAll();
  const { searchParams } = new URL(request.url);
  if (searchParams.get("format") === "csv") {
    const header = "name,sku,category,unit,minStock,defaultPurchasePrice,defaultSalePrice";
    const lines = (data.products as { name: string; sku: string | null; category: string | null; unit: string; minStock: string; defaultPurchasePrice: string | null; defaultSalePrice: string | null }[]).map(
      (p) =>
        [p.name, p.sku ?? "", p.category ?? "", p.unit, p.minStock, p.defaultPurchasePrice ?? "", p.defaultSalePrice ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
    );
    return new NextResponse([header, ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=products.csv",
      },
    });
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": "attachment; filename=hesab-man-backup.json",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      products?: { name: string; unit?: string; sku?: string; category?: string }[];
      parties?: { name: string; type?: string; phone?: string }[];
    };
    let imported = 0;
    if (Array.isArray(body.products)) {
      for (const p of body.products) {
        if (!p?.name) continue;
        await db.insert(products).values({
          name: p.name,
          unit: p.unit || "عدد",
          sku: p.sku ?? null,
          category: p.category ?? null,
        });
        imported += 1;
      }
    }
    if (Array.isArray(body.parties)) {
      for (const p of body.parties) {
        if (!p?.name) continue;
        await db.insert(parties).values({
          name: p.name,
          type: p.type || "customer",
          phone: p.phone ?? null,
        });
        imported += 1;
      }
    }
    return NextResponse.json({ ok: true, imported });
  } catch {
    return NextResponse.json({ ok: false, error: "فایل درست خوانده نشد." }, { status: 400 });
  }
}
