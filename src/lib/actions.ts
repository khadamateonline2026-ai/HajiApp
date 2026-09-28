"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  equityTransactions,
  exchangeRates,
  expenses,
  invoiceItems,
  invoices,
  parties,
  payments,
  products,
  settings,
  warehouses,
} from "@/db/schema";
import { applyInbound, applyOutbound } from "./inventory";
import { amountToAfn, moneyStr, remaining, roundMoney, toNumber } from "./money";
import { nextInvoiceNumber } from "./queries";

export type ActionResult = { ok: true; id?: number; number?: string } | { ok: false; error: string };

function revalidateAll() {
  revalidatePath("/", "layout");
}

function n(form: FormData, key: string): number {
  return toNumber(String(form.get(key) ?? ""));
}

function s(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function optionalId(form: FormData, key: string): number | null {
  const v = s(form, key);
  if (!v) return null;
  const id = Number(v);
  return Number.isFinite(id) ? id : null;
}

export async function saveInvoice(form: FormData): Promise<ActionResult> {
  try {
    const type = s(form, "type") === "purchase" ? "purchase" : "sale";
    const status = s(form, "status") === "draft" ? "draft" : "posted";
    const partyId = optionalId(form, "partyId");
    const warehouseId = optionalId(form, "warehouseId");
    const currencyCode = s(form, "currencyCode") || "AFN";
    const rate = n(form, "exchangeRateToAfn") || 1;
    const issueDate = s(form, "issueDate");
    const discountAmount = n(form, "discountAmount");
    const taxAmount = n(form, "taxAmount");
    const shippingAmount = n(form, "shippingAmount");
    const paidNow = n(form, "paidNow");
    const accountId = optionalId(form, "accountId");
    const note = s(form, "note") || null;
    const itemsJson = s(form, "items");
    const items = JSON.parse(itemsJson || "[]") as {
      productId: number;
      quantity: number;
      unitPrice: number;
    }[];
    if (!items.length) return { ok: false, error: "حداقل یک کالا اضافه کنید." };
    if (!warehouseId) return { ok: false, error: "گدام را انتخاب کنید." };
    if (!issueDate) return { ok: false, error: "تاریخ را وارد کنید." };

    const subtotal = roundMoney(
      items.reduce((sum, i) => sum + toNumber(i.quantity) * toNumber(i.unitPrice), 0),
      4,
    );
    const total = roundMoney(subtotal - discountAmount + taxAmount + shippingAmount, 4);
    if (total < 0) return { ok: false, error: "جمع فاکتور درست نیست." };
    const totalAfn = amountToAfn(total, rate);
    const paid = Math.min(paidNow, total);

    const id = await db.transaction(async (tx) => {
      const number = await nextInvoiceNumber(type);
      const [inv] = await tx
        .insert(invoices)
        .values({
          number,
          type,
          status,
          partyId,
          warehouseId,
          currencyCode,
          exchangeRateToAfn: moneyStr(rate, 6),
          issueDate,
          discountAmount: moneyStr(discountAmount),
          taxAmount: moneyStr(taxAmount),
          shippingAmount: moneyStr(shippingAmount),
          subtotalOriginal: moneyStr(subtotal),
          totalOriginal: moneyStr(total),
          totalAfn: moneyStr(totalAfn, 2),
          paidOriginal: moneyStr(status === "posted" ? paid : 0),
          note,
        })
        .returning();

      for (const line of items) {
        const qty = toNumber(line.quantity);
        const price = toNumber(line.unitPrice);
        if (qty <= 0) throw new Error("تعداد کالا باید بیشتر از صفر باشد.");
        const lineTotal = roundMoney(qty * price, 4);
        const unitCostAfn = currencyCode === "AFN" ? price : amountToAfn(price, rate);
        const [item] = await tx
          .insert(invoiceItems)
          .values({
            invoiceId: inv.id,
            productId: line.productId,
            quantity: moneyStr(qty),
            unitPrice: moneyStr(price),
            lineTotal: moneyStr(lineTotal),
            unitCostAfn: moneyStr(type === "purchase" ? unitCostAfn : 0),
            lineCostAfn: moneyStr(type === "purchase" ? amountToAfn(lineTotal, rate) : 0),
          })
          .returning();

        if (status === "posted") {
          if (type === "purchase") {
            await applyInbound(tx, {
              productId: line.productId,
              warehouseId,
              quantity: qty,
              unitCostAfn,
              occurredOn: issueDate,
              invoiceId: inv.id,
              invoiceItemId: item.id,
            });
          } else {
            const cost = await applyOutbound(tx, {
              productId: line.productId,
              warehouseId,
              quantity: qty,
              occurredOn: issueDate,
              invoiceId: inv.id,
              invoiceItemId: item.id,
            });
            await tx
              .update(invoiceItems)
              .set({
                unitCostAfn: moneyStr(cost.unitCostAfn),
                lineCostAfn: moneyStr(cost.lineCostAfn),
              })
              .where(eq(invoiceItems.id, item.id));
          }
        }
      }

      if (status === "posted" && paid > 0) {
        if (!accountId) throw new Error("برای ثبت پرداخت، حساب پول را انتخاب کنید.");
        await tx.insert(payments).values({
          type: type === "sale" ? "receive" : "pay",
          accountId,
          partyId,
          invoiceId: inv.id,
          currencyCode,
          amountOriginal: moneyStr(paid),
          exchangeRateToAfn: moneyStr(rate, 6),
          amountAfn: moneyStr(amountToAfn(paid, rate), 2),
          paidAt: issueDate,
          note: "پرداخت همراه فاکتور",
        });
      }
      return inv.id;
    });

    revalidateAll();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت فاکتور انجام نشد." };
  }
}

export async function cancelInvoice(id: number): Promise<ActionResult> {
  try {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) return { ok: false, error: "فاکتور پیدا نشد." };
    if (inv.status === "cancelled") return { ok: false, error: "این فاکتور قبلاً لغو شده." };
    await db.update(invoices).set({ status: "cancelled" }).where(eq(invoices.id, id));
    revalidateAll();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "لغو انجام نشد." };
  }
}

export async function savePayment(form: FormData): Promise<ActionResult> {
  try {
    const type = s(form, "type") || "receive";
    const accountId = optionalId(form, "accountId");
    const partyId = optionalId(form, "partyId");
    const invoiceId = optionalId(form, "invoiceId");
    const currencyCode = s(form, "currencyCode") || "AFN";
    const rate = n(form, "exchangeRateToAfn") || 1;
    const amount = n(form, "amountOriginal");
    const paidAt = s(form, "paidAt");
    const note = s(form, "note") || null;
    const counterAccountId = optionalId(form, "counterAccountId");
    const counterAmount = n(form, "counterAmountOriginal");
    if (!accountId) return { ok: false, error: "حساب پول را انتخاب کنید." };
    if (amount <= 0) return { ok: false, error: "مبلغ باید بیشتر از صفر باشد." };
    if (!paidAt) return { ok: false, error: "تاریخ را وارد کنید." };
    if (type === "transfer" && !counterAccountId) {
      return { ok: false, error: "حساب مقصد را انتخاب کنید." };
    }

    const [row] = await db
      .insert(payments)
      .values({
        type,
        accountId,
        partyId,
        invoiceId,
        currencyCode,
        amountOriginal: moneyStr(amount),
        exchangeRateToAfn: moneyStr(rate, 6),
        amountAfn: moneyStr(amountToAfn(amount, rate), 2),
        counterAccountId,
        counterAmountOriginal: type === "transfer" ? moneyStr(counterAmount || amount) : null,
        counterCurrencyCode: type === "transfer" ? s(form, "counterCurrencyCode") || null : null,
        paidAt,
        note,
      })
      .returning();

    if (invoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      if (inv) {
        const nextPaid = Math.min(toNumber(inv.totalOriginal), toNumber(inv.paidOriginal) + amount);
        await db
          .update(invoices)
          .set({ paidOriginal: moneyStr(nextPaid) })
          .where(eq(invoices.id, invoiceId));
      }
    }

    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت پول انجام نشد." };
  }
}

export async function saveParty(form: FormData): Promise<ActionResult> {
  try {
    const name = s(form, "name");
    if (!name) return { ok: false, error: "نام طرف حساب لازم است." };
    const id = optionalId(form, "id");
    const values = {
      name,
      type: s(form, "type") || "customer",
      phone: s(form, "phone") || null,
      address: s(form, "address") || null,
      note: s(form, "note") || null,
    };
    if (id) {
      await db.update(parties).set(values).where(eq(parties.id, id));
      revalidateAll();
      return { ok: true, id };
    }
    const [row] = await db.insert(parties).values(values).returning();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت طرف حساب انجام نشد." };
  }
}

export async function saveProduct(form: FormData): Promise<ActionResult> {
  try {
    const name = s(form, "name");
    if (!name) return { ok: false, error: "نام کالا لازم است." };
    const id = optionalId(form, "id");
    const values = {
      name,
      sku: s(form, "sku") || null,
      category: s(form, "category") || null,
      unit: s(form, "unit") || "عدد",
      minStock: moneyStr(n(form, "minStock")),
      defaultPurchasePrice: s(form, "defaultPurchasePrice") ? moneyStr(n(form, "defaultPurchasePrice")) : null,
      defaultSalePrice: s(form, "defaultSalePrice") ? moneyStr(n(form, "defaultSalePrice")) : null,
      defaultCurrency: s(form, "defaultCurrency") || "AFN",
      imageUrl: s(form, "imageUrl") || null,
    };
    if (id) {
      await db.update(products).set(values).where(eq(products.id, id));
      revalidateAll();
      return { ok: true, id };
    }
    const [row] = await db.insert(products).values(values).returning();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت کالا انجام نشد." };
  }
}

export async function adjustStock(form: FormData): Promise<ActionResult> {
  try {
    const productId = optionalId(form, "productId");
    const warehouseId = optionalId(form, "warehouseId");
    const quantity = n(form, "quantity");
    const direction = s(form, "direction") === "out" ? "out" : "in";
    const occurredOn = s(form, "occurredOn");
    const note = s(form, "note") || "تعدیل موجودی";
    const unitCostAfn = n(form, "unitCostAfn");
    if (!productId || !warehouseId) return { ok: false, error: "کالا و گدام لازم است." };
    if (quantity <= 0) return { ok: false, error: "تعداد باید بیشتر از صفر باشد." };
    await db.transaction(async (tx) => {
      if (direction === "in") {
        await applyInbound(tx, {
          productId,
          warehouseId,
          quantity,
          unitCostAfn,
          occurredOn,
          note,
          type: "adjust_in",
        });
      } else {
        await applyOutbound(tx, {
          productId,
          warehouseId,
          quantity,
          occurredOn,
          note,
          type: "adjust_out",
        });
      }
    });
    revalidateAll();
    return { ok: true, id: productId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "تعدیل موجودی انجام نشد." };
  }
}

export async function saveExpense(form: FormData): Promise<ActionResult> {
  try {
    const category = s(form, "category") || "متفرقه";
    const accountId = optionalId(form, "accountId");
    const amount = n(form, "amountOriginal");
    const rate = n(form, "exchangeRateToAfn") || 1;
    const currencyCode = s(form, "currencyCode") || "AFN";
    const spentOn = s(form, "spentOn");
    if (!accountId) return { ok: false, error: "حساب پول را انتخاب کنید." };
    if (amount <= 0) return { ok: false, error: "مبلغ هزینه باید بیشتر از صفر باشد." };
    const [row] = await db
      .insert(expenses)
      .values({
        category,
        accountId,
        partyId: optionalId(form, "partyId"),
        currencyCode,
        amountOriginal: moneyStr(amount),
        exchangeRateToAfn: moneyStr(rate, 6),
        amountAfn: moneyStr(amountToAfn(amount, rate), 2),
        spentOn,
        note: s(form, "note") || null,
      })
      .returning();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت هزینه انجام نشد." };
  }
}

export async function saveEquity(form: FormData): Promise<ActionResult> {
  try {
    const type = s(form, "type") === "draw" ? "draw" : "contribution";
    const accountId = optionalId(form, "accountId");
    const amount = n(form, "amountOriginal");
    const rate = n(form, "exchangeRateToAfn") || 1;
    const currencyCode = s(form, "currencyCode") || "AFN";
    const occurredOn = s(form, "occurredOn");
    if (!accountId) return { ok: false, error: "حساب پول را انتخاب کنید." };
    if (amount <= 0) return { ok: false, error: "مبلغ باید بیشتر از صفر باشد." };
    const [row] = await db
      .insert(equityTransactions)
      .values({
        type,
        accountId,
        currencyCode,
        amountOriginal: moneyStr(amount),
        exchangeRateToAfn: moneyStr(rate, 6),
        amountAfn: moneyStr(amountToAfn(amount, rate), 2),
        occurredOn,
        note: s(form, "note") || null,
      })
      .returning();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت سرمایه انجام نشد." };
  }
}

export async function saveSettings(form: FormData): Promise<ActionResult> {
  try {
    await db
      .update(settings)
      .set({
        shopName: s(form, "shopName") || "فروشگاه من",
        shopPhone: s(form, "shopPhone") || null,
        shopAddress: s(form, "shopAddress") || null,
        primaryColor: s(form, "primaryColor") || "#147A6A",
        themeMode: s(form, "themeMode") || "light",
        fontFamily: s(form, "fontFamily") || "vazirmatn",
        fontSize: s(form, "fontSize") || "normal",
        costingMethod: s(form, "costingMethod") || "weighted_average",
        paperSize: s(form, "paperSize") || "a4",
        updatedAt: new Date(),
      })
      .where(eq(settings.id, 1));
    revalidateAll();
    return { ok: true, id: 1 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ذخیره تنظیمات انجام نشد." };
  }
}

export async function saveRate(form: FormData): Promise<ActionResult> {
  try {
    const currencyCode = s(form, "currencyCode");
    const rate = n(form, "rateToAfn");
    if (!currencyCode) return { ok: false, error: "ارز را انتخاب کنید." };
    if (rate <= 0) return { ok: false, error: "نرخ باید بیشتر از صفر باشد." };
    const [row] = await db
      .insert(exchangeRates)
      .values({
        currencyCode,
        rateToAfn: moneyStr(rate, 6),
        effectiveAt: new Date(),
        note: s(form, "note") || "نرخ دستی",
      })
      .returning();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت نرخ انجام نشد." };
  }
}

export async function saveAccount(form: FormData): Promise<ActionResult> {
  try {
    const name = s(form, "name");
    if (!name) return { ok: false, error: "نام حساب لازم است." };
    const [row] = await db
      .insert(accounts)
      .values({
        name,
        type: s(form, "type") || "cash",
        currencyCode: s(form, "currencyCode") || "AFN",
        openingBalance: moneyStr(n(form, "openingBalance")),
      })
      .returning();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت حساب انجام نشد." };
  }
}

export async function saveWarehouse(form: FormData): Promise<ActionResult> {
  try {
    const name = s(form, "name");
    if (!name) return { ok: false, error: "نام گدام لازم است." };
    const [row] = await db
      .insert(warehouses)
      .values({
        name,
        address: s(form, "address") || null,
        isDefault: s(form, "isDefault") === "on",
      })
      .returning();
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "ثبت گدام انجام نشد." };
  }
}

export async function getOpenInvoicesForParty(partyId: number, type: "sale" | "purchase") {
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.partyId, partyId), eq(invoices.type, type), eq(invoices.status, "posted")));
  return rows.filter((i) => remaining(toNumber(i.totalOriginal), toNumber(i.paidOriginal)) > 0.0001);
}
