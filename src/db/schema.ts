import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const currencies = pgTable("currencies", {
  code: varchar("code", { length: 8 }).primaryKey(),
  nameFa: text("name_fa").notNull(),
  symbol: text("symbol").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: serial("id").primaryKey(),
    currencyCode: varchar("currency_code", { length: 8 })
      .notNull()
      .references(() => currencies.code),
    rateToAfn: numeric("rate_to_afn", { precision: 18, scale: 6 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("exchange_rates_currency_time_idx").on(t.currencyCode, t.effectiveAt),
  ],
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull().default("فروشگاه من"),
  shopPhone: text("shop_phone"),
  shopAddress: text("shop_address"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#147A6A"),
  themeMode: text("theme_mode").notNull().default("light"),
  fontFamily: text("font_family").notNull().default("vazirmatn"),
  fontSize: text("font_size").notNull().default("normal"),
  costingMethod: text("costing_method").notNull().default("weighted_average"),
  paperSize: text("paper_size").notNull().default("a4"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  currencyCode: varchar("currency_code", { length: 8 })
    .notNull()
    .references(() => currencies.code),
  openingBalance: numeric("opening_balance", { precision: 18, scale: 4 })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parties = pgTable(
  "parties",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    phone: text("phone"),
    address: text("address"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("parties_name_idx").on(t.name), index("parties_type_idx").on(t.type)],
);

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sku: text("sku"),
    category: text("category"),
    unit: text("unit").notNull().default("عدد"),
    minStock: numeric("min_stock", { precision: 18, scale: 4 }).notNull().default("0"),
    defaultPurchasePrice: numeric("default_purchase_price", { precision: 18, scale: 4 }),
    defaultSalePrice: numeric("default_sale_price", { precision: 18, scale: 4 }),
    defaultCurrency: varchar("default_currency", { length: 8 })
      .notNull()
      .default("AFN")
      .references(() => currencies.code),
    avgCostAfn: numeric("avg_cost_afn", { precision: 18, scale: 4 }).notNull().default("0"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("products_name_idx").on(t.name), index("products_category_idx").on(t.category)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("draft"),
    partyId: integer("party_id").references(() => parties.id),
    warehouseId: integer("warehouse_id").references(() => warehouses.id),
    currencyCode: varchar("currency_code", { length: 8 })
      .notNull()
      .references(() => currencies.code),
    exchangeRateToAfn: numeric("exchange_rate_to_afn", { precision: 18, scale: 6 }).notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    discountAmount: numeric("discount_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    shippingAmount: numeric("shipping_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    subtotalOriginal: numeric("subtotal_original", { precision: 18, scale: 4 }).notNull().default("0"),
    totalOriginal: numeric("total_original", { precision: 18, scale: 4 }).notNull().default("0"),
    totalAfn: numeric("total_afn", { precision: 18, scale: 4 }).notNull().default("0"),
    paidOriginal: numeric("paid_original", { precision: 18, scale: 4 }).notNull().default("0"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("invoices_number_uidx").on(t.number),
    index("invoices_type_status_idx").on(t.type, t.status),
    index("invoices_party_idx").on(t.partyId),
    index("invoices_date_idx").on(t.issueDate),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    description: text("description"),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 18, scale: 4 }).notNull(),
    lineTotal: numeric("line_total", { precision: 18, scale: 4 }).notNull(),
    unitCostAfn: numeric("unit_cost_afn", { precision: 18, scale: 4 }).notNull().default("0"),
    lineCostAfn: numeric("line_cost_afn", { precision: 18, scale: 4 }).notNull().default("0"),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    partyId: integer("party_id").references(() => parties.id),
    invoiceId: integer("invoice_id").references(() => invoices.id),
    currencyCode: varchar("currency_code", { length: 8 })
      .notNull()
      .references(() => currencies.code),
    amountOriginal: numeric("amount_original", { precision: 18, scale: 4 }).notNull(),
    exchangeRateToAfn: numeric("exchange_rate_to_afn", { precision: 18, scale: 6 }).notNull(),
    amountAfn: numeric("amount_afn", { precision: 18, scale: 4 }).notNull(),
    counterAccountId: integer("counter_account_id").references(() => accounts.id),
    counterAmountOriginal: numeric("counter_amount_original", { precision: 18, scale: 4 }),
    counterCurrencyCode: varchar("counter_currency_code", { length: 8 }),
    paidAt: date("paid_at").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("payments_account_idx").on(t.accountId),
    index("payments_party_idx").on(t.partyId),
    index("payments_date_idx").on(t.paidAt),
    index("payments_type_idx").on(t.type),
  ],
);

export const paymentAllocations = pgTable("payment_allocations", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id),
  amountOriginal: numeric("amount_original", { precision: 18, scale: 4 }).notNull(),
  amountAfn: numeric("amount_afn", { precision: 18, scale: 4 }).notNull(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    partyId: integer("party_id").references(() => parties.id),
    currencyCode: varchar("currency_code", { length: 8 })
      .notNull()
      .references(() => currencies.code),
    amountOriginal: numeric("amount_original", { precision: 18, scale: 4 }).notNull(),
    exchangeRateToAfn: numeric("exchange_rate_to_afn", { precision: 18, scale: 6 }).notNull(),
    amountAfn: numeric("amount_afn", { precision: 18, scale: 4 }).notNull(),
    spentOn: date("spent_on").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("expenses_date_idx").on(t.spentOn), index("expenses_category_idx").on(t.category)],
);

export const equityTransactions = pgTable("equity_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  currencyCode: varchar("currency_code", { length: 8 })
    .notNull()
    .references(() => currencies.code),
  amountOriginal: numeric("amount_original", { precision: 18, scale: 4 }).notNull(),
  exchangeRateToAfn: numeric("exchange_rate_to_afn", { precision: 18, scale: 6 }).notNull(),
  amountAfn: numeric("amount_afn", { precision: 18, scale: 4 }).notNull(),
  occurredOn: date("occurred_on").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    type: text("type").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    unitCostAfn: numeric("unit_cost_afn", { precision: 18, scale: 4 }).notNull().default("0"),
    totalCostAfn: numeric("total_cost_afn", { precision: 18, scale: 4 }).notNull().default("0"),
    invoiceId: integer("invoice_id").references(() => invoices.id),
    invoiceItemId: integer("invoice_item_id").references(() => invoiceItems.id),
    occurredOn: date("occurred_on").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("inv_move_product_wh_idx").on(t.productId, t.warehouseId),
    index("inv_move_date_idx").on(t.occurredOn),
  ],
);

export const inventoryLots = pgTable(
  "inventory_lots",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    qtyRemaining: numeric("qty_remaining", { precision: 18, scale: 4 }).notNull(),
    unitCostAfn: numeric("unit_cost_afn", { precision: 18, scale: 4 }).notNull(),
    sourceMovementId: integer("source_movement_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("inv_lots_product_wh_idx").on(t.productId, t.warehouseId)],
);

export const currenciesRelations = relations(currencies, ({ many }) => ({
  rates: many(exchangeRates),
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  currency: one(currencies, { fields: [accounts.currencyCode], references: [currencies.code] }),
  payments: many(payments),
}));

export const partiesRelations = relations(parties, ({ many }) => ({
  invoices: many(invoices),
  payments: many(payments),
}));

export const productsRelations = relations(products, ({ many }) => ({
  items: many(invoiceItems),
  movements: many(inventoryMovements),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  party: one(parties, { fields: [invoices.partyId], references: [parties.id] }),
  warehouse: one(warehouses, { fields: [invoices.warehouseId], references: [warehouses.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  account: one(accounts, { fields: [payments.accountId], references: [accounts.id] }),
  party: one(parties, { fields: [payments.partyId], references: [parties.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  allocations: many(paymentAllocations),
}));
