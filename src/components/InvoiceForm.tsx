"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveInvoice } from "@/lib/actions";
import { amountToAfn, CURRENCY_LABELS, roundMoney } from "@/lib/money";
import { formatAmount, todayIso } from "@/lib/format";
import { ErrorText, Field, GlassCard, PrimaryButton } from "./ui";

type Product = {
  id: number;
  name: string;
  unit: string;
  defaultSalePrice: string | null;
  defaultPurchasePrice: string | null;
  imageUrl: string | null;
};
type Party = { id: number; name: string };
type Account = { id: number; name: string; currencyCode: string };
type Warehouse = { id: number; name: string; isDefault: boolean };

export function InvoiceForm({
  type,
  products,
  parties,
  accounts,
  warehouses,
  rates,
}: {
  type: "sale" | "purchase";
  products: Product[];
  parties: Party[];
  accounts: Account[];
  warehouses: Warehouse[];
  rates: Record<string, number>;
}) {
  const router = useRouter();
  const [partyId, setPartyId] = useState(parties[0]?.id ? String(parties[0].id) : "");
  const [warehouseId, setWarehouseId] = useState(
    String(warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? ""),
  );
  const [currencyCode, setCurrencyCode] = useState("AFN");
  const [rate, setRate] = useState(String(rates.AFN ?? 1));
  const [issueDate, setIssueDate] = useState(todayIso());
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState<{ productId: number; name: string; unit: string; quantity: number; unitPrice: number }[]>([]);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [shipping, setShipping] = useState("0");
  const [paidNow, setPaidNow] = useState("0");
  const [accountId, setAccountId] = useState(accounts[0]?.id ? String(accounts[0].id) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const selectedProduct = products.find((p) => String(p.id) === productId);

  function addItem() {
    if (!selectedProduct) {
      setError("کالا را انتخاب کنید.");
      return;
    }
    const quantity = Number(qty);
    const unitPrice = Number(price);
    if (!(quantity > 0) || !(unitPrice >= 0)) {
      setError("تعداد و قیمت را درست بنویسید.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        unit: selectedProduct.unit,
        quantity,
        unitPrice,
      },
    ]);
    setProductId("");
    setQty("1");
    setPrice("");
    setError(null);
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = roundMoney(subtotal - Number(discount || 0) + Number(tax || 0) + Number(shipping || 0), 2);
  const rateN = Number(rate || 1);
  const totalAfn = amountToAfn(total, rateN);

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => a.currencyCode === currencyCode),
    [accounts, currencyCode],
  );

  async function onSubmit(status: "posted" | "draft") {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("type", type);
    form.set("status", status);
    form.set("partyId", partyId);
    form.set("warehouseId", warehouseId);
    form.set("currencyCode", currencyCode);
    form.set("exchangeRateToAfn", rate);
    form.set("issueDate", issueDate);
    form.set("discountAmount", discount);
    form.set("taxAmount", tax);
    form.set("shippingAmount", shipping);
    form.set("paidNow", paidNow);
    form.set("accountId", accountId);
    form.set("note", note);
    form.set(
      "items",
      JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }))),
    );
    const result = await saveInvoice(form);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(type === "sale" ? `/sales/${result.id}` : `/purchases/${result.id}`);
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit("posted");
      }}
    >
      <GlassCard>
        <Field label={type === "sale" ? "مشتری" : "تأمین‌کننده"} hint="کسی که از او می‌خرید یا به او می‌فروشید">
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">بدون نام</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="تاریخ">
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="گدام">
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </GlassCard>

      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">{type === "sale" ? "کدام کالا فروخته شد؟" : "کدام کالا خریدید؟"}</p>
        <Field label="کالا">
          <select
            value={productId}
            onChange={(e) => {
              const p = products.find((x) => String(x.id) === e.target.value);
              setProductId(e.target.value);
              const def = type === "sale" ? p?.defaultSalePrice : p?.defaultPurchasePrice;
              if (def) setPrice(String(Number(def)));
            }}
          >
            <option value="">انتخاب کالا</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label={`تعداد ${selectedProduct ? `(${selectedProduct.unit})` : ""}`}>
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="قیمت واحد">
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </div>
        <button type="button" className="btn btn-ghost mt-3 w-full" onClick={addItem}>
          افزودن به فاکتور
        </button>
        <div className="mt-3 space-y-2">
          {items.length === 0 ? <p className="muted m-0 text-sm">هنوز کالایی اضافه نشده.</p> : null}
          {items.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="list-row bg-[var(--primary-soft)]">
              <div className="min-w-0 flex-1">
                <p className="m-0 font-semibold">{item.name}</p>
                <p className="m-0 text-sm muted">
                  {item.quantity} {item.unit} × {formatAmount(item.unitPrice, currencyCode)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ارز" hint="پولی که مشتری/فروشنده با آن حساب می‌کند">
            <select
              value={currencyCode}
              onChange={(e) => {
                const code = e.target.value;
                setCurrencyCode(code);
                setRate(String(rates[code] ?? 1));
                const acc = accounts.find((a) => a.currencyCode === code);
                if (acc) setAccountId(String(acc.id));
              }}
            >
              {Object.keys(CURRENCY_LABELS).map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABELS[code]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نرخ به افغانی" hint="یک واحد این ارز چند افغانی است؟ مثال: ۱ دالر = ۷۰ افغانی">
            <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} disabled={currencyCode === "AFN"} />
          </Field>
        </div>
        <button type="button" className="btn btn-ghost mt-3" onClick={() => setShowMore((v) => !v)}>
          {showMore ? "بستن تخفیف و مالیات" : "تخفیف / مالیات / کرایه"}
        </button>
        {showMore ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Field label="تخفیف">
              <input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <Field label="مالیات">
              <input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} />
            </Field>
            <Field label="کرایه">
              <input inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} />
            </Field>
          </div>
        ) : null}
        <div className="mt-4">
          <p className="m-0 text-sm muted">جمع فاکتور</p>
          <p className="mt-1 mb-0 text-2xl num">{formatAmount(total, currencyCode)}</p>
          {currencyCode !== "AFN" ? <p className="m-0 text-sm muted">معادل {formatAmount(totalAfn, "AFN")}</p> : null}
        </div>
      </GlassCard>

      <GlassCard>
        <Field label={type === "sale" ? "چقدر همین حالا گرفتید؟" : "چقدر همین حالا پرداختید؟"} hint="اگر بعداً پول می‌دهید، صفر بگذارید">
          <input inputMode="decimal" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} />
        </Field>
        <div className="mt-3">
          <Field label="از کدام صندوق/بانک؟">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {filteredAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="یادداشت (اختیاری)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً نسیه تا جمعه" />
          </Field>
        </div>
      </GlassCard>

      <ErrorText message={error} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "در حال ثبت..." : type === "sale" ? "ثبت فروش" : "ثبت خرید"}
      </PrimaryButton>
      <button type="button" className="btn btn-ghost w-full" disabled={pending} onClick={() => void onSubmit("draft")}>
        ذخیره پیش‌نویس
      </button>
    </form>
  );
}
