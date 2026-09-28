import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  currencies,
  equityTransactions,
  exchangeRates,
  expenses,
  inventoryMovements,
  invoiceItems,
  invoices,
  parties,
  payments,
  products,
  settings,
  warehouses,
} from "@/db/schema";
import { monthStartIso, todayIso } from "./format";
import { amountToAfn, remaining, toNumber } from "./money";
import { ensureSeeded } from "./seed";

export const DEFAULT_SETTINGS = {
  id: 1,
  shopName: "فروشگاه من",
  shopPhone: null as string | null,
  shopAddress: null as string | null,
  logoUrl: null as string | null,
  primaryColor: "#147A6A",
  themeMode: "light",
  fontFamily: "vazirmatn",
  fontSize: "normal",
  costingMethod: "weighted_average",
  paperSize: "a4",
};

export async function getSettings() {
  await ensureSeeded();
  const rows = await db.select().from(settings).limit(1);
  return rows[0] ?? DEFAULT_SETTINGS;
}

export async function getCurrencies() {
  await ensureSeeded();
  return db
    .select()
    .from(currencies)
    .where(eq(currencies.isActive, true))
    .orderBy(asc(currencies.sortOrder));
}

export async function getLatestRates(): Promise<Record<string, number>> {
  await ensureSeeded();
  const rows = await db
    .select()
    .from(exchangeRates)
    .orderBy(desc(exchangeRates.effectiveAt), desc(exchangeRates.id));
  const map: Record<string, number> = { AFN: 1 };
  for (const row of rows) {
    if (map[row.currencyCode] === undefined) {
      map[row.currencyCode] = toNumber(row.rateToAfn);
    }
  }
  return map;
}

export async function getRateHistory(currencyCode?: string) {
  await ensureSeeded();
  const q = db.select().from(exchangeRates).orderBy(desc(exchangeRates.effectiveAt));
  const rows = currencyCode
    ? await db
        .select()
        .from(exchangeRates)
        .where(eq(exchangeRates.currencyCode, currencyCode))
        .orderBy(desc(exchangeRates.effectiveAt))
    : await q;
  return rows;
}

export async function getAccounts() {
  await ensureSeeded();
  return db.select().from(accounts).where(eq(accounts.isActive, true)).orderBy(asc(accounts.id));
}

export async function getWarehouses() {
  await ensureSeeded();
  return db.select().from(warehouses).orderBy(desc(warehouses.isDefault), asc(warehouses.id));
}

export async function getParties(type?: string) {
  await ensureSeeded();
  if (type === "customer") {
    return db
      .select()
      .from(parties)
      .where(or(eq(parties.type, "customer"), eq(parties.type, "both")))
      .orderBy(asc(parties.name));
  }
  if (type === "supplier") {
    return db
      .select()
      .from(parties)
      .where(or(eq(parties.type, "supplier"), eq(parties.type, "both")))
      .orderBy(asc(parties.name));
  }
  return db.select().from(parties).orderBy(asc(parties.name));
}

export async function getProducts() {
  await ensureSeeded();
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));
}

export async function getProductStockMap(): Promise<Record<number, number>> {
  const rows = await db
    .select({
      productId: inventoryMovements.productId,
      qty: sql<string>`coalesce(sum(case when ${inventoryMovements.type} in ('in','adjust_in') then ${inventoryMovements.quantity} when ${inventoryMovements.type} in ('out','adjust_out') then -${inventoryMovements.quantity} else 0 end), 0)`,
    })
    .from(inventoryMovements)
    .groupBy(inventoryMovements.productId);
  const map: Record<number, number> = {};
  for (const row of rows) map[row.productId] = toNumber(row.qty);
  return map;
}

export async function getAccountBalances() {
  const accs = await getAccounts();
  const rates = await getLatestRates();
  const payRows = await db.select().from(payments);
  const expRows = await db.select().from(expenses);
  const eqRows = await db.select().from(equityTransactions);

  return accs.map((acc) => {
    let bal = toNumber(acc.openingBalance);
    for (const p of payRows) {
      if (p.accountId === acc.id) {
        if (p.type === "receive" || p.type === "other_receive") bal += toNumber(p.amountOriginal);
        if (p.type === "pay" || p.type === "other_pay" || p.type === "transfer") {
          bal -= toNumber(p.amountOriginal);
        }
      }
      if (p.type === "transfer" && p.counterAccountId === acc.id) {
        bal += toNumber(p.counterAmountOriginal);
      }
    }
    for (const e of expRows) {
      if (e.accountId === acc.id) bal -= toNumber(e.amountOriginal);
    }
    for (const e of eqRows) {
      if (e.accountId !== acc.id) continue;
      if (e.type === "contribution") bal += toNumber(e.amountOriginal);
      if (e.type === "draw") bal -= toNumber(e.amountOriginal);
    }
    const rate = rates[acc.currencyCode] ?? 1;
    return {
      ...acc,
      balance: bal,
      balanceAfn: amountToAfn(bal, rate),
    };
  });
}

export async function getDashboard() {
  await ensureSeeded();
  const today = todayIso();
  const monthStart = monthStartIso();
  const [salesToday] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.totalAfn}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(and(eq(invoices.type, "sale"), eq(invoices.status, "posted"), eq(invoices.issueDate, today)));

  const [recvToday] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amountAfn}), 0)` })
    .from(payments)
    .where(and(inArray(payments.type, ["receive", "other_receive"]), eq(payments.paidAt, today)));

  const [salesMonth] = await db
    .select({ total: sql<string>`coalesce(sum(${invoices.totalAfn}), 0)` })
    .from(invoices)
    .where(
      and(eq(invoices.type, "sale"), eq(invoices.status, "posted"), gte(invoices.issueDate, monthStart)),
    );

  const [purchasesMonth] = await db
    .select({ total: sql<string>`coalesce(sum(${invoices.totalAfn}), 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.type, "purchase"),
        eq(invoices.status, "posted"),
        gte(invoices.issueDate, monthStart),
      ),
    );

  const stock = await getProductStockMap();
  const productRows = await getProducts();
  const lowStock = productRows.filter((p) => (stock[p.id] ?? 0) <= toNumber(p.minStock));

  const recent = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      type: invoices.type,
      totalOriginal: invoices.totalOriginal,
      currencyCode: invoices.currencyCode,
      issueDate: invoices.issueDate,
      partyName: parties.name,
      status: invoices.status,
    })
    .from(invoices)
    .leftJoin(parties, eq(invoices.partyId, parties.id))
    .orderBy(desc(invoices.createdAt))
    .limit(6);

  const balances = await getAccountBalances();

  return {
    salesToday: toNumber(salesToday?.total),
    salesTodayCount: salesToday?.count ?? 0,
    recvToday: toNumber(recvToday?.total),
    salesMonth: toNumber(salesMonth?.total),
    purchasesMonth: toNumber(purchasesMonth?.total),
    lowStock,
    stock,
    recent,
    balances,
  };
}

export async function listInvoices(type: "sale" | "purchase", range: "today" | "week" | "all" = "all") {
  await ensureSeeded();
  const today = new Date();
  let from: string | undefined;
  if (range === "today") from = todayIso();
  if (range === "week") {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    from = d.toISOString().slice(0, 10);
  }
  const rows = from
    ? await db
        .select({
          invoice: invoices,
          partyName: parties.name,
        })
        .from(invoices)
        .leftJoin(parties, eq(invoices.partyId, parties.id))
        .where(and(eq(invoices.type, type), gte(invoices.issueDate, from)))
        .orderBy(desc(invoices.issueDate), desc(invoices.id))
    : await db
        .select({
          invoice: invoices,
          partyName: parties.name,
        })
        .from(invoices)
        .leftJoin(parties, eq(invoices.partyId, parties.id))
        .where(eq(invoices.type, type))
        .orderBy(desc(invoices.issueDate), desc(invoices.id));
  return rows;
}

export async function getInvoice(id: number) {
  await ensureSeeded();
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!invoice) return null;
  const items = await db
    .select({
      item: invoiceItems,
      productName: products.name,
      unit: products.unit,
      imageUrl: products.imageUrl,
    })
    .from(invoiceItems)
    .leftJoin(products, eq(invoiceItems.productId, products.id))
    .where(eq(invoiceItems.invoiceId, id));
  const party = invoice.partyId
    ? (await db.select().from(parties).where(eq(parties.id, invoice.partyId)).limit(1))[0]
    : null;
  const warehouse = invoice.warehouseId
    ? (await db.select().from(warehouses).where(eq(warehouses.id, invoice.warehouseId)).limit(1))[0]
    : null;
  const relatedPayments = await db.select().from(payments).where(eq(payments.invoiceId, id));
  return { invoice, items, party, warehouse, payments: relatedPayments };
}

export async function listPayments() {
  await ensureSeeded();
  return db
    .select({
      payment: payments,
      accountName: accounts.name,
      partyName: parties.name,
    })
    .from(payments)
    .leftJoin(accounts, eq(payments.accountId, accounts.id))
    .leftJoin(parties, eq(payments.partyId, parties.id))
    .orderBy(desc(payments.paidAt), desc(payments.id))
    .limit(80);
}

export async function getPayment(id: number) {
  const [row] = await db
    .select({
      payment: payments,
      accountName: accounts.name,
      partyName: parties.name,
    })
    .from(payments)
    .leftJoin(accounts, eq(payments.accountId, accounts.id))
    .leftJoin(parties, eq(payments.partyId, parties.id))
    .where(eq(payments.id, id))
    .limit(1);
  return row ?? null;
}

export async function getProductDetail(id: number) {
  await ensureSeeded();
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return null;
  const movements = await db
    .select({
      movement: inventoryMovements,
      warehouseName: warehouses.name,
    })
    .from(inventoryMovements)
    .leftJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .where(eq(inventoryMovements.productId, id))
    .orderBy(desc(inventoryMovements.occurredOn), desc(inventoryMovements.id));
  let running = 0;
  const kardex = [...movements].reverse().map((row) => {
    const qty = toNumber(row.movement.quantity);
    const dir = row.movement.type === "in" || row.movement.type === "adjust_in" ? 1 : -1;
    running += dir * qty;
    return { ...row, balance: running };
  });
  return { product, kardex: kardex.reverse(), onHand: running };
}

export async function getPartyDetail(id: number) {
  await ensureSeeded();
  const [party] = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
  if (!party) return null;
  const inv = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.partyId, id), eq(invoices.status, "posted")))
    .orderBy(desc(invoices.issueDate));
  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.partyId, id))
    .orderBy(desc(payments.paidAt));
  const byCurrency: Record<string, { sales: number; purchases: number; received: number; paid: number }> =
    {};
  const bump = (code: string) => {
    if (!byCurrency[code]) byCurrency[code] = { sales: 0, purchases: 0, received: 0, paid: 0 };
    return byCurrency[code];
  };
  for (const i of inv) {
    const b = bump(i.currencyCode);
    if (i.type === "sale") b.sales += toNumber(i.totalOriginal);
    else b.purchases += toNumber(i.totalOriginal);
  }
  for (const p of pays) {
    const b = bump(p.currencyCode);
    if (p.type === "receive" || p.type === "other_receive") b.received += toNumber(p.amountOriginal);
    if (p.type === "pay" || p.type === "other_pay") b.paid += toNumber(p.amountOriginal);
  }
  return { party, invoices: inv, payments: pays, byCurrency };
}

export async function getReports() {
  await ensureSeeded();
  const monthStart = monthStartIso();
  const postedSales = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.type, "sale"), eq(invoices.status, "posted")));
  const postedPurchases = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.type, "purchase"), eq(invoices.status, "posted")));
  const saleItems = await db
    .select({
      lineCostAfn: invoiceItems.lineCostAfn,
      invoiceId: invoiceItems.invoiceId,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(eq(invoices.type, "sale"), eq(invoices.status, "posted")));

  const revenue = postedSales.reduce((s, i) => s + toNumber(i.totalAfn), 0);
  const revenueMonth = postedSales
    .filter((i) => i.issueDate >= monthStart)
    .reduce((s, i) => s + toNumber(i.totalAfn), 0);
  const cogs = saleItems.reduce((s, i) => s + toNumber(i.lineCostAfn), 0);
  const purchaseTotal = postedPurchases.reduce((s, i) => s + toNumber(i.totalAfn), 0);
  const expRows = await db.select().from(expenses);
  const expenseTotal = expRows.reduce((s, e) => s + toNumber(e.amountAfn), 0);
  const equity = await db.select().from(equityTransactions);
  const contrib = equity.filter((e) => e.type === "contribution").reduce((s, e) => s + toNumber(e.amountAfn), 0);
  const draws = equity.filter((e) => e.type === "draw").reduce((s, e) => s + toNumber(e.amountAfn), 0);

  const customerInvoices = postedSales.filter((i) => i.partyId);
  const supplierInvoices = postedPurchases.filter((i) => i.partyId);
  const partyRows = await db.select().from(parties);
  const partyMap = Object.fromEntries(partyRows.map((p) => [p.id, p]));

  const customerDebts = Object.values(
    customerInvoices.reduce<Record<number, { name: string; remainingAfn: number }>>((acc, inv) => {
      const pid = inv.partyId!;
      const rem = remaining(toNumber(inv.totalOriginal), toNumber(inv.paidOriginal));
      const rate = toNumber(inv.exchangeRateToAfn);
      if (!acc[pid]) acc[pid] = { name: partyMap[pid]?.name ?? "—", remainingAfn: 0 };
      acc[pid].remainingAfn += amountToAfn(rem, rate);
      return acc;
    }, {}),
  )
    .filter((x) => x.remainingAfn > 0.5)
    .sort((a, b) => b.remainingAfn - a.remainingAfn);

  const supplierDebts = Object.values(
    supplierInvoices.reduce<Record<number, { name: string; remainingAfn: number }>>((acc, inv) => {
      const pid = inv.partyId!;
      const rem = remaining(toNumber(inv.totalOriginal), toNumber(inv.paidOriginal));
      const rate = toNumber(inv.exchangeRateToAfn);
      if (!acc[pid]) acc[pid] = { name: partyMap[pid]?.name ?? "—", remainingAfn: 0 };
      acc[pid].remainingAfn += amountToAfn(rem, rate);
      return acc;
    }, {}),
  )
    .filter((x) => x.remainingAfn > 0.5)
    .sort((a, b) => b.remainingAfn - a.remainingAfn);

  const stock = await getProductStockMap();
  const productRows = await getProducts();
  const inventoryValue = productRows.reduce((s, p) => s + (stock[p.id] ?? 0) * toNumber(p.avgCostAfn), 0);
  const lowStock = productRows.filter((p) => (stock[p.id] ?? 0) <= toNumber(p.minStock));
  const balances = await getAccountBalances();
  const gross = revenue - cogs;
  const net = gross - expenseTotal;

  return {
    revenue,
    revenueMonth,
    cogs,
    purchaseTotal,
    expenseTotal,
    contrib,
    draws,
    gross,
    net,
    customerDebts,
    supplierDebts,
    inventoryValue,
    lowStock,
    stock,
    balances,
    equity: contrib - draws + net,
  };
}

export async function listExpenses() {
  await ensureSeeded();
  return db
    .select({
      expense: expenses,
      accountName: accounts.name,
    })
    .from(expenses)
    .leftJoin(accounts, eq(expenses.accountId, accounts.id))
    .orderBy(desc(expenses.spentOn), desc(expenses.id));
}

export async function listEquity() {
  await ensureSeeded();
  return db
    .select({
      row: equityTransactions,
      accountName: accounts.name,
    })
    .from(equityTransactions)
    .leftJoin(accounts, eq(equityTransactions.accountId, accounts.id))
    .orderBy(desc(equityTransactions.occurredOn), desc(equityTransactions.id));
}

export async function nextInvoiceNumber(type: "sale" | "purchase") {
  const prefix = type === "sale" ? "SAL" : "PUR";
  const rows = await db
    .select({ number: invoices.number })
    .from(invoices)
    .where(eq(invoices.type, type));
  let max = 1000;
  for (const r of rows) {
    const n = Number(String(r.number).split("-").pop());
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${max + 1}`;
}

export async function exportAll() {
  await ensureSeeded();
  const [
    currencyRows,
    rateRows,
    settingRows,
    accountRows,
    partyRows,
    warehouseRows,
    productRows,
    invoiceRows,
    itemRows,
    paymentRows,
    expenseRows,
    equityRows,
    movementRows,
  ] = await Promise.all([
    db.select().from(currencies),
    db.select().from(exchangeRates),
    db.select().from(settings),
    db.select().from(accounts),
    db.select().from(parties),
    db.select().from(warehouses),
    db.select().from(products),
    db.select().from(invoices),
    db.select().from(invoiceItems),
    db.select().from(payments),
    db.select().from(expenses),
    db.select().from(equityTransactions),
    db.select().from(inventoryMovements),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    currencies: currencyRows,
    exchangeRates: rateRows,
    settings: settingRows,
    accounts: accountRows,
    parties: partyRows,
    warehouses: warehouseRows,
    products: productRows,
    invoices: invoiceRows,
    invoiceItems: itemRows,
    payments: paymentRows,
    expenses: expenseRows,
    equityTransactions: equityRows,
    inventoryMovements: movementRows,
  };
}

