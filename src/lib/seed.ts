import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  currencies,
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
import { amountToAfn, moneyStr } from "./money";

let seeding: Promise<void> | null = null;

export async function ensureSeeded() {
  if (!seeding) {
    seeding = seedIfNeeded().finally(() => {
      seeding = null;
    });
  }
  await seeding;
}

async function seedIfNeeded() {
  const [row] = await db.select({ n: count() }).from(products);
  if ((row?.n ?? 0) > 0) return;
  await seedDemo();
}

function isoFromToday(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function seedDemo() {
  await db
    .insert(currencies)
    .values([
      { code: "AFN", nameFa: "افغانی", symbol: "؋", isActive: true, sortOrder: 1 },
      { code: "USD", nameFa: "دالر امریکایی", symbol: "$", isActive: true, sortOrder: 2 },
      { code: "EUR", nameFa: "یورو", symbol: "€", isActive: true, sortOrder: 3 },
      { code: "PKR", nameFa: "کلدار پاکستانی", symbol: "Rs", isActive: true, sortOrder: 4 },
    ])
    .onConflictDoNothing();

  const now = new Date();
  await db.insert(exchangeRates).values([
    { currencyCode: "AFN", rateToAfn: "1", effectiveAt: now, note: "ارز پایه" },
    { currencyCode: "USD", rateToAfn: "70", effectiveAt: now, note: "نرخ نمونه" },
    { currencyCode: "EUR", rateToAfn: "76", effectiveAt: now, note: "نرخ نمونه" },
    { currencyCode: "PKR", rateToAfn: "0.25", effectiveAt: now, note: "نرخ نمونه" },
  ]);

  await db
    .insert(settings)
    .values({
      id: 1,
      shopName: "فروشگاه امید",
      shopPhone: "0700123456",
      shopAddress: "کابل، چهاراهی صدارت",
      primaryColor: "#147A6A",
      themeMode: "light",
      fontFamily: "vazirmatn",
      fontSize: "normal",
      costingMethod: "weighted_average",
      paperSize: "a4",
    })
    .onConflictDoNothing();

  const [wh] = await db
    .insert(warehouses)
    .values({ name: "گدام اصلی", address: "کابل", isDefault: true })
    .returning();

  const [cashAfn, cashUsd] = await db
    .insert(accounts)
    .values([
      { name: "صندوق افغانی", type: "cash", currencyCode: "AFN", openingBalance: "0" },
      { name: "صندوق دالر", type: "cash", currencyCode: "USD", openingBalance: "0" },
      { name: "بانک افغانی", type: "bank", currencyCode: "AFN", openingBalance: "0" },
    ])
    .returning();

  const [customer, supplier] = await db
    .insert(parties)
    .values([
      { name: "احمد کریمی", type: "customer", phone: "0780001111", address: "کابل" },
      { name: "شرکت نور", type: "supplier", phone: "0790002222", address: "کابل" },
      { name: "فاطمه رضایی", type: "customer", phone: "0770003333" },
      { name: "عمده‌فروشی کابل", type: "both", phone: "0700004444" },
    ])
    .returning();

  const [rice, oil, flour, tea, sugar] = await db
    .insert(products)
    .values([
      {
        name: "برنج باسمتی",
        sku: "RICE-01",
        category: "خوراکه",
        unit: "کیلو",
        minStock: "20",
        defaultPurchasePrice: "80",
        defaultSalePrice: "100",
        defaultCurrency: "AFN",
        imageUrl: "/images/products/rice.jpg",
      },
      {
        name: "روغن مایع",
        sku: "OIL-01",
        category: "خوراکه",
        unit: "لیتـر",
        minStock: "10",
        defaultPurchasePrice: "120",
        defaultSalePrice: "150",
        defaultCurrency: "AFN",
        imageUrl: "/images/products/oil.jpg",
      },
      {
        name: "آرد گندم",
        sku: "FLR-01",
        category: "خوراکه",
        unit: "کیلو",
        minStock: "30",
        defaultPurchasePrice: "28",
        defaultSalePrice: "36",
        defaultCurrency: "AFN",
        imageUrl: "/images/products/flour.jpg",
      },
      {
        name: "چای سبز",
        sku: "TEA-01",
        category: "نوشیدنی",
        unit: "بسته",
        minStock: "8",
        defaultPurchasePrice: "90",
        defaultSalePrice: "120",
        defaultCurrency: "AFN",
        imageUrl: "/images/products/tea.jpg",
      },
      {
        name: "شکر سفید",
        sku: "SGR-01",
        category: "خوراکه",
        unit: "کیلو",
        minStock: "15",
        defaultPurchasePrice: "45",
        defaultSalePrice: "55",
        defaultCurrency: "AFN",
        imageUrl: "/images/products/sugar.jpg",
      },
    ])
    .returning();

  await db.transaction(async (tx) => {
    await tx.insert(equityTransactions).values([
      {
        type: "contribution",
        accountId: cashAfn.id,
        currencyCode: "AFN",
        amountOriginal: "50000",
        exchangeRateToAfn: "1",
        amountAfn: "50000",
        occurredOn: isoFromToday(12),
        note: "سرمایه اولیه صاحب فروشگاه",
      },
      {
        type: "contribution",
        accountId: cashUsd.id,
        currencyCode: "USD",
        amountOriginal: "200",
        exchangeRateToAfn: "70",
        amountAfn: "14000",
        occurredOn: isoFromToday(12),
        note: "آوردی دالری",
      },
    ]);

    const [purchase] = await tx
      .insert(invoices)
      .values({
        number: "PUR-1001",
        type: "purchase",
        status: "posted",
        partyId: supplier.id,
        warehouseId: wh.id,
        currencyCode: "AFN",
        exchangeRateToAfn: "1",
        issueDate: isoFromToday(10),
        discountAmount: "0",
        taxAmount: "0",
        shippingAmount: "200",
        subtotalOriginal: "18250",
        totalOriginal: "18450",
        totalAfn: "18450",
        paidOriginal: "10000",
        note: "خرید اول دوره",
      })
      .returning();

    const purchaseLines = [
      { product: rice, qty: 100, price: 80 },
      { product: oil, qty: 40, price: 120 },
      { product: flour, qty: 50, price: 28 },
      { product: tea, qty: 25, price: 90 },
      { product: sugar, qty: 40, price: 45 },
    ];

    for (const line of purchaseLines) {
      const lineTotal = line.qty * line.price;
      const [item] = await tx
        .insert(invoiceItems)
        .values({
          invoiceId: purchase.id,
          productId: line.product.id,
          description: line.product.name,
          quantity: moneyStr(line.qty),
          unitPrice: moneyStr(line.price),
          lineTotal: moneyStr(lineTotal),
          unitCostAfn: moneyStr(line.price),
          lineCostAfn: moneyStr(lineTotal),
        })
        .returning();
      await applyInbound(tx, {
        productId: line.product.id,
        warehouseId: wh.id,
        quantity: line.qty,
        unitCostAfn: line.price,
        occurredOn: isoFromToday(10),
        invoiceId: purchase.id,
        invoiceItemId: item.id,
      });
    }

    await tx.insert(payments).values({
      type: "pay",
      accountId: cashAfn.id,
      partyId: supplier.id,
      invoiceId: purchase.id,
      currencyCode: "AFN",
      amountOriginal: "10000",
      exchangeRateToAfn: "1",
      amountAfn: "10000",
      paidAt: isoFromToday(10),
      note: "پرداخت قسمتی خرید",
    });

    const [sale] = await tx
      .insert(invoices)
      .values({
        number: "SAL-1001",
        type: "sale",
        status: "posted",
        partyId: customer.id,
        warehouseId: wh.id,
        currencyCode: "AFN",
        exchangeRateToAfn: "1",
        issueDate: isoFromToday(0),
        discountAmount: "50",
        taxAmount: "0",
        shippingAmount: "0",
        subtotalOriginal: "1550",
        totalOriginal: "1500",
        totalAfn: "1500",
        paidOriginal: "1000",
        note: "فروش امروز",
      })
      .returning();

    const saleLines = [
      { product: rice, qty: 10, price: 100 },
      { product: oil, qty: 2, price: 150 },
      { product: tea, qty: 1, price: 120 },
    ];
    for (const line of saleLines) {
      const lineTotal = line.qty * line.price;
      const [item] = await tx
        .insert(invoiceItems)
        .values({
          invoiceId: sale.id,
          productId: line.product.id,
          description: line.product.name,
          quantity: moneyStr(line.qty),
          unitPrice: moneyStr(line.price),
          lineTotal: moneyStr(lineTotal),
          unitCostAfn: "0",
          lineCostAfn: "0",
        })
        .returning();
      const cost = await applyOutbound(tx, {
        productId: line.product.id,
        warehouseId: wh.id,
        quantity: line.qty,
        occurredOn: isoFromToday(0),
        invoiceId: sale.id,
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

    await tx.insert(payments).values({
      type: "receive",
      accountId: cashAfn.id,
      partyId: customer.id,
      invoiceId: sale.id,
      currencyCode: "AFN",
      amountOriginal: "1000",
      exchangeRateToAfn: "1",
      amountAfn: "1000",
      paidAt: isoFromToday(0),
      note: "دریافت قسمتی",
    });

    const [usdSale] = await tx
      .insert(invoices)
      .values({
        number: "SAL-1002",
        type: "sale",
        status: "posted",
        partyId: customer.id,
        warehouseId: wh.id,
        currencyCode: "USD",
        exchangeRateToAfn: "70",
        issueDate: isoFromToday(1),
        discountAmount: "0",
        taxAmount: "0",
        shippingAmount: "0",
        subtotalOriginal: "20",
        totalOriginal: "20",
        totalAfn: moneyStr(amountToAfn(20, 70)),
        paidOriginal: "20",
        note: "فروش دالری",
      })
      .returning();

    const [usdItem] = await tx
      .insert(invoiceItems)
      .values({
        invoiceId: usdSale.id,
        productId: sugar.id,
        description: sugar.name,
        quantity: "10",
        unitPrice: "2",
        lineTotal: "20",
        unitCostAfn: "0",
        lineCostAfn: "0",
      })
      .returning();
    const sugarCost = await applyOutbound(tx, {
      productId: sugar.id,
      warehouseId: wh.id,
      quantity: 10,
      occurredOn: isoFromToday(1),
      invoiceId: usdSale.id,
      invoiceItemId: usdItem.id,
    });
    await tx
      .update(invoiceItems)
      .set({
        unitCostAfn: moneyStr(sugarCost.unitCostAfn),
        lineCostAfn: moneyStr(sugarCost.lineCostAfn),
      })
      .where(eq(invoiceItems.id, usdItem.id));

    await tx.insert(payments).values({
      type: "receive",
      accountId: cashUsd.id,
      partyId: customer.id,
      invoiceId: usdSale.id,
      currencyCode: "USD",
      amountOriginal: "20",
      exchangeRateToAfn: "70",
      amountAfn: moneyStr(amountToAfn(20, 70)),
      paidAt: isoFromToday(1),
      note: "دریافت دالری",
    });

    await tx.insert(expenses).values({
      category: "کرایه دکان",
      accountId: cashAfn.id,
      currencyCode: "AFN",
      amountOriginal: "3000",
      exchangeRateToAfn: "1",
      amountAfn: "3000",
      spentOn: isoFromToday(3),
      note: "کرایه ماه جاری",
    });
  });
}
