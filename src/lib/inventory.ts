import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryLots,
  inventoryMovements,
  products,
  settings,
} from "@/db/schema";
import { moneyStr, roundMoney, roundQty, toNumber } from "./money";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getOnHand(
  tx: Tx,
  productId: number,
  warehouseId?: number,
): Promise<number> {
  const rows = warehouseId
    ? await tx
        .select({
          qty: sql<string>`coalesce(sum(case when ${inventoryMovements.type} in ('in','adjust_in') then ${inventoryMovements.quantity} when ${inventoryMovements.type} in ('out','adjust_out') then -${inventoryMovements.quantity} else 0 end), 0)`,
        })
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.productId, productId),
            eq(inventoryMovements.warehouseId, warehouseId),
          ),
        )
    : await tx
        .select({
          qty: sql<string>`coalesce(sum(case when ${inventoryMovements.type} in ('in','adjust_in') then ${inventoryMovements.quantity} when ${inventoryMovements.type} in ('out','adjust_out') then -${inventoryMovements.quantity} else 0 end), 0)`,
        })
        .from(inventoryMovements)
        .where(eq(inventoryMovements.productId, productId));
  return toNumber(rows[0]?.qty);
}

export async function getCostingMethod(tx: Tx): Promise<"weighted_average" | "fifo"> {
  const rows = await tx.select().from(settings).limit(1);
  return rows[0]?.costingMethod === "fifo" ? "fifo" : "weighted_average";
}

export async function applyInbound(
  tx: Tx,
  input: {
    productId: number;
    warehouseId: number;
    quantity: number;
    unitCostAfn: number;
    occurredOn: string;
    invoiceId?: number;
    invoiceItemId?: number;
    note?: string;
    type?: "in" | "adjust_in";
  },
) {
  const qty = roundQty(input.quantity);
  const unitCost = roundMoney(input.unitCostAfn, 4);
  const [movement] = await tx
    .insert(inventoryMovements)
    .values({
      productId: input.productId,
      warehouseId: input.warehouseId,
      type: input.type ?? "in",
      quantity: moneyStr(qty),
      unitCostAfn: moneyStr(unitCost),
      totalCostAfn: moneyStr(roundMoney(qty * unitCost, 2)),
      invoiceId: input.invoiceId,
      invoiceItemId: input.invoiceItemId,
      occurredOn: input.occurredOn,
      note: input.note,
    })
    .returning();

  await tx.insert(inventoryLots).values({
    productId: input.productId,
    warehouseId: input.warehouseId,
    qtyRemaining: moneyStr(qty),
    unitCostAfn: moneyStr(unitCost),
    sourceMovementId: movement.id,
  });

  const onHandBefore = (await getOnHand(tx, input.productId)) - qty;
  const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).limit(1);
  const oldAvg = toNumber(product?.avgCostAfn);
  const newAvg =
    onHandBefore <= 0
      ? unitCost
      : roundMoney((onHandBefore * oldAvg + qty * unitCost) / (onHandBefore + qty), 4);
  await tx.update(products).set({ avgCostAfn: moneyStr(newAvg) }).where(eq(products.id, input.productId));

  return { movement, unitCostAfn: newAvg };
}

export async function applyOutbound(
  tx: Tx,
  input: {
    productId: number;
    warehouseId: number;
    quantity: number;
    occurredOn: string;
    invoiceId?: number;
    invoiceItemId?: number;
    note?: string;
    type?: "out" | "adjust_out";
  },
): Promise<{ unitCostAfn: number; lineCostAfn: number }> {
  const qty = roundQty(input.quantity);
  const onHand = await getOnHand(tx, input.productId, input.warehouseId);
  if (onHand + 1e-9 < qty) {
    throw new Error("موجودی این کالا کافی نیست.");
  }

  const method = await getCostingMethod(tx);
  const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).limit(1);
  let unitCost = toNumber(product?.avgCostAfn);
  let lineCost = roundMoney(unitCost * qty, 2);

  if (method === "fifo") {
    const lots = await tx
      .select()
      .from(inventoryLots)
      .where(
        and(
          eq(inventoryLots.productId, input.productId),
          eq(inventoryLots.warehouseId, input.warehouseId),
        ),
      )
      .orderBy(asc(inventoryLots.createdAt), asc(inventoryLots.id));

    let left = qty;
    let costSum = 0;
    for (const lot of lots) {
      const remain = toNumber(lot.qtyRemaining);
      if (remain <= 0 || left <= 0) continue;
      const take = Math.min(remain, left);
      costSum += take * toNumber(lot.unitCostAfn);
      await tx
        .update(inventoryLots)
        .set({ qtyRemaining: moneyStr(roundQty(remain - take)) })
        .where(eq(inventoryLots.id, lot.id));
      left = roundQty(left - take);
    }
    if (left > 1e-8) throw new Error("موجودی لایه‌های کالا کافی نیست.");
    lineCost = roundMoney(costSum, 2);
    unitCost = qty > 0 ? roundMoney(lineCost / qty, 4) : 0;
  } else {
    const lots = await tx
      .select()
      .from(inventoryLots)
      .where(
        and(
          eq(inventoryLots.productId, input.productId),
          eq(inventoryLots.warehouseId, input.warehouseId),
        ),
      )
      .orderBy(asc(inventoryLots.createdAt), asc(inventoryLots.id));
    let left = qty;
    for (const lot of lots) {
      const remain = toNumber(lot.qtyRemaining);
      if (remain <= 0 || left <= 0) continue;
      const take = Math.min(remain, left);
      await tx
        .update(inventoryLots)
        .set({ qtyRemaining: moneyStr(roundQty(remain - take)) })
        .where(eq(inventoryLots.id, lot.id));
      left = roundQty(left - take);
    }
  }

  await tx.insert(inventoryMovements).values({
    productId: input.productId,
    warehouseId: input.warehouseId,
    type: input.type ?? "out",
    quantity: moneyStr(qty),
    unitCostAfn: moneyStr(unitCost),
    totalCostAfn: moneyStr(lineCost),
    invoiceId: input.invoiceId,
    invoiceItemId: input.invoiceItemId,
    occurredOn: input.occurredOn,
    note: input.note,
  });

  return { unitCostAfn: unitCost, lineCostAfn: lineCost };
}
