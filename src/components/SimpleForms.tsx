"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adjustStock,
  saveAccount,
  saveEquity,
  saveExpense,
  saveParty,
  savePayment,
  saveProduct,
  saveRate,
  saveSettings,
  saveWarehouse,
  type ActionResult,
} from "@/lib/actions";
import { CURRENCY_LABELS } from "@/lib/money";
import { todayIso } from "@/lib/format";
import { ErrorText, Field, GlassCard, PrimaryButton } from "./ui";

function useSubmit(action: (form: FormData) => Promise<ActionResult>, redirectTo?: string) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function onSubmit(form: FormData) {
    setPending(true);
    setError(null);
    const result = await action(form);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (redirectTo) router.push(redirectTo.replace(":id", String(result.id ?? "")));
    else router.refresh();
  }
  return { error, pending, onSubmit };
}

export function PaymentForm({
  accounts,
  parties,
  rates,
  defaultType = "receive",
}: {
  accounts: { id: number; name: string; currencyCode: string }[];
  parties: { id: number; name: string; type: string }[];
  rates: Record<string, number>;
  defaultType?: string;
}) {
  const { error, pending, onSubmit } = useSubmit(savePayment, "/treasury");
  const [type, setType] = useState(defaultType);
  const [currency, setCurrency] = useState(accounts[0]?.currencyCode ?? "AFN");
  const [rate, setRate] = useState(String(rates[accounts[0]?.currencyCode ?? "AFN"] ?? 1));
  const filtered = accounts.filter((a) => a.currencyCode === currency);

  return (
    <form
      className="space-y-3"
      action={(form) => {
        form.set("exchangeRateToAfn", rate);
        void onSubmit(form);
      }}
    >
      <GlassCard>
        <Field label="نوع کار">
          <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="receive">پول گرفتم (دریافت)</option>
            <option value="pay">پول دادم (پرداخت)</option>
            <option value="other_receive">دریافت متفرقه</option>
            <option value="other_pay">پرداخت متفرقه</option>
            <option value="transfer">انتقال بین صندوق‌ها</option>
          </select>
        </Field>
        <div className="mt-3">
          <Field label="طرف حساب (اختیاری)">
            <select name="partyId" defaultValue="">
              <option value="">بدون طرف حساب</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </GlassCard>
      <GlassCard>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ارز">
            <select
              name="currencyCode"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setRate(String(rates[e.target.value] ?? 1));
              }}
            >
              {Object.keys(CURRENCY_LABELS).map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نرخ به افغانی" hint="مثال: ۱ دالر = ۷۰ افغانی">
            <input name="rateView" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="مبلغ">
            <input name="amountOriginal" inputMode="decimal" required placeholder="مثلاً ۵۰۰" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={type === "transfer" ? "از حساب" : "حساب پول"}>
            <select name="accountId" defaultValue={filtered[0]?.id}>
              {filtered.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {type === "transfer" ? (
          <div className="mt-3 space-y-3">
            <Field label="به حساب">
              <select name="counterAccountId">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="مبلغ واریزی به حساب مقصد">
              <input name="counterAmountOriginal" inputMode="decimal" placeholder="اگر تبدیل ارز است" />
            </Field>
            <input type="hidden" name="counterCurrencyCode" value={currency} />
          </div>
        ) : null}
        <div className="mt-3">
          <Field label="تاریخ">
            <input type="date" name="paidAt" defaultValue={todayIso()} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="یادداشت">
            <input name="note" placeholder="اختیاری" />
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "در حال ثبت..." : "ثبت پول"}</PrimaryButton>
    </form>
  );
}

export function PartyForm({
  initial,
}: {
  initial?: { id: number; name: string; type: string; phone: string | null; address: string | null; note: string | null };
}) {
  const { error, pending, onSubmit } = useSubmit(saveParty, "/parties/:id");
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <GlassCard>
        <Field label="نام">
          <input name="name" required defaultValue={initial?.name} placeholder="مثلاً احمد کریمی" />
        </Field>
        <div className="mt-3">
          <Field label="نوع">
            <select name="type" defaultValue={initial?.type ?? "customer"}>
              <option value="customer">مشتری</option>
              <option value="supplier">تأمین‌کننده</option>
              <option value="both">هر دو</option>
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="شماره تماس">
            <input name="phone" defaultValue={initial?.phone ?? ""} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="آدرس">
            <input name="address" defaultValue={initial?.address ?? ""} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="یادداشت">
            <input name="note" defaultValue={initial?.note ?? ""} />
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ذخیره طرف حساب"}</PrimaryButton>
    </form>
  );
}

export function ProductForm({
  initial,
}: {
  initial?: {
    id: number;
    name: string;
    sku: string | null;
    category: string | null;
    unit: string;
    minStock: string;
    defaultPurchasePrice: string | null;
    defaultSalePrice: string | null;
    defaultCurrency: string;
    imageUrl: string | null;
  };
}) {
  const { error, pending, onSubmit } = useSubmit(saveProduct, "/products/:id");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageUrl(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <GlassCard>
        <Field label="نام کالا">
          <input name="name" required defaultValue={initial?.name} placeholder="مثلاً برنج باسمتی" />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="واحد">
            <select name="unit" defaultValue={initial?.unit ?? "عدد"}>
              <option>عدد</option>
              <option>کیلو</option>
              <option>لیتر</option>
              <option>متر</option>
              <option>بسته</option>
              <option>کارتن</option>
            </select>
          </Field>
          <Field label="دسته‌بندی">
            <input name="category" defaultValue={initial?.category ?? ""} placeholder="خوراکه" />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="قیمت خرید پیش‌فرض">
            <input name="defaultPurchasePrice" inputMode="decimal" defaultValue={initial?.defaultPurchasePrice ?? ""} />
          </Field>
          <Field label="قیمت فروش پیش‌فرض">
            <input name="defaultSalePrice" inputMode="decimal" defaultValue={initial?.defaultSalePrice ?? ""} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="حداقل موجودی" hint="اگر موجودی از این کمتر شود، هشدار می‌آید">
            <input name="minStock" inputMode="decimal" defaultValue={initial?.minStock ?? "0"} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="کد کالا">
            <input name="sku" defaultValue={initial?.sku ?? ""} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="عکس کالا">
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          </Field>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="mt-3 h-28 w-28 rounded-2xl object-cover" />
          ) : null}
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ذخیره کالا"}</PrimaryButton>
    </form>
  );
}

export function ExpenseForm({
  accounts,
  rates,
}: {
  accounts: { id: number; name: string; currencyCode: string }[];
  rates: Record<string, number>;
}) {
  const { error, pending, onSubmit } = useSubmit(saveExpense, "/expenses");
  const [currency, setCurrency] = useState(accounts[0]?.currencyCode ?? "AFN");
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      <GlassCard>
        <Field label="نوع هزینه">
          <select name="category" defaultValue="کرایه دکان">
            <option>کرایه دکان</option>
            <option>برق و آب</option>
            <option>معاش</option>
            <option>حمل و نقل</option>
            <option>متفرقه</option>
          </select>
        </Field>
        <div className="mt-3">
          <Field label="مبلغ">
            <input name="amountOriginal" inputMode="decimal" required />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="ارز">
            <select
              name="currencyCode"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {Object.keys(CURRENCY_LABELS).map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نرخ به افغانی">
            <input name="exchangeRateToAfn" defaultValue={rates[currency] ?? 1} inputMode="decimal" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="از کدام حساب؟">
            <select name="accountId">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="تاریخ">
            <input type="date" name="spentOn" defaultValue={todayIso()} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="یادداشت">
            <input name="note" />
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ثبت هزینه"}</PrimaryButton>
    </form>
  );
}

export function CapitalForm({
  accounts,
  rates,
}: {
  accounts: { id: number; name: string; currencyCode: string }[];
  rates: Record<string, number>;
}) {
  const { error, pending, onSubmit } = useSubmit(saveEquity, "/capital");
  const [currency, setCurrency] = useState("AFN");
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      <GlassCard>
        <Field label="نوع">
          <select name="type" defaultValue="contribution">
            <option value="contribution">پول آوردم داخل کسب‌وکار</option>
            <option value="draw">پول برداشتم برای خودم</option>
          </select>
        </Field>
        <div className="mt-3">
          <Field label="مبلغ">
            <input name="amountOriginal" inputMode="decimal" required />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="ارز">
            <select name="currencyCode" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.keys(CURRENCY_LABELS).map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نرخ به افغانی">
            <input name="exchangeRateToAfn" defaultValue={rates[currency] ?? 1} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="حساب">
            <select name="accountId">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="تاریخ">
            <input type="date" name="occurredOn" defaultValue={todayIso()} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="یادداشت">
            <input name="note" />
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ثبت سرمایه"}</PrimaryButton>
    </form>
  );
}

export function SettingsForm({
  settings,
}: {
  settings: {
    shopName: string;
    shopPhone: string | null;
    shopAddress: string | null;
    primaryColor: string;
    themeMode: string;
    fontFamily: string;
    fontSize: string;
    costingMethod: string;
    paperSize: string;
  };
}) {
  const { error, pending, onSubmit } = useSubmit(saveSettings, "/settings");
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">مشخصات دکان</p>
        <Field label="نام فروشگاه">
          <input name="shopName" defaultValue={settings.shopName} />
        </Field>
        <div className="mt-3">
          <Field label="شماره تماس">
            <input name="shopPhone" defaultValue={settings.shopPhone ?? ""} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="آدرس">
            <input name="shopAddress" defaultValue={settings.shopAddress ?? ""} />
          </Field>
        </div>
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">ظاهر</p>
        <Field label="رنگ اصلی">
          <input name="primaryColor" type="color" defaultValue={settings.primaryColor} />
        </Field>
        <div className="mt-3">
          <Field label="حالت روشن/تاریک">
            <select name="themeMode" defaultValue={settings.themeMode}>
              <option value="light">روشن</option>
              <option value="dark">تاریک</option>
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="فونت">
            <select name="fontFamily" defaultValue={settings.fontFamily}>
              <option value="vazirmatn">وزیرمتن (پیشنهادی)</option>
              <option value="noto-sans">نوتو سنس عربی</option>
              <option value="noto-naskh">نوتو نسخ عربی</option>
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="اندازه نوشته">
            <select name="fontSize" defaultValue={settings.fontSize}>
              <option value="small">کوچک</option>
              <option value="normal">معمولی</option>
              <option value="large">بزرگ</option>
            </select>
          </Field>
        </div>
      </GlassCard>
      <GlassCard>
        <p className="mt-0 mb-3 font-semibold">حسابداری و چاپ</p>
        <Field
          label="روش قیمت تمام‌شده کالا"
          hint="میانگین: قیمت‌ها قاطی و معدل می‌شوند. FIFO: اول کالایی که زودتر آمده، زودتر می‌رود."
        >
          <select name="costingMethod" defaultValue={settings.costingMethod}>
            <option value="weighted_average">میانگین موزون (ساده‌تر)</option>
            <option value="fifo">FIFO (اولین وارده، اولین صادره)</option>
          </select>
        </Field>
        <div className="mt-3">
          <Field label="اندازه کاغذ چاپ">
            <select name="paperSize" defaultValue={settings.paperSize}>
              <option value="a4">A4</option>
              <option value="thermal">حرارتی ۸۰ میلی‌متر</option>
            </select>
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ذخیره تنظیمات"}</PrimaryButton>
    </form>
  );
}

export function RateForm({ currencies }: { currencies: { code: string; nameFa: string }[] }) {
  const { error, pending, onSubmit } = useSubmit(saveRate, "/rates");
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      <GlassCard>
        <Field label="ارز">
          <select name="currencyCode" defaultValue="USD">
            {currencies
              .filter((c) => c.code !== "AFN")
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameFa}
                </option>
              ))}
          </select>
        </Field>
        <div className="mt-3">
          <Field label="یک واحد این ارز چند افغانی است؟" hint="مثال: اگر ۱ دالر = ۷۰ افغانی، عدد ۷۰ را بنویسید">
            <input name="rateToAfn" inputMode="decimal" required placeholder="70" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="یادداشت">
            <input name="note" placeholder="نرخ بازار امروز" />
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ثبت نرخ جدید"}</PrimaryButton>
    </form>
  );
}

export function AccountForm() {
  const { error, pending, onSubmit } = useSubmit(saveAccount, "/treasury");
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      <GlassCard>
        <Field label="نام حساب">
          <input name="name" required placeholder="مثلاً بانک دالر" />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="نوع">
            <select name="type" defaultValue="cash">
              <option value="cash">صندوق نقدی</option>
              <option value="bank">بانک</option>
            </select>
          </Field>
          <Field label="ارز">
            <select name="currencyCode" defaultValue="AFN">
              {Object.keys(CURRENCY_LABELS).map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="مانده اول دوره">
            <input name="openingBalance" inputMode="decimal" defaultValue="0" />
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ساخت حساب"}</PrimaryButton>
    </form>
  );
}

export function WarehouseForm() {
  const { error, pending, onSubmit } = useSubmit(saveWarehouse, "/warehouse");
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      <GlassCard>
        <Field label="نام گدام">
          <input name="name" required placeholder="گدام دوم" />
        </Field>
        <div className="mt-3">
          <Field label="آدرس">
            <input name="address" />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" name="isDefault" />
          گدام پیش‌فرض باشد
        </label>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ثبت گدام"}</PrimaryButton>
    </form>
  );
}

export function AdjustStockForm({
  productId,
  warehouses,
  avgCost,
}: {
  productId: number;
  warehouses: { id: number; name: string }[];
  avgCost: string;
}) {
  const { error, pending, onSubmit } = useSubmit(adjustStock);
  return (
    <form className="space-y-3" action={(f) => void onSubmit(f)}>
      <input type="hidden" name="productId" value={productId} />
      <GlassCard>
        <Field label="نوع تعدیل">
          <select name="direction" defaultValue="in">
            <option value="in">ورود / زیاد شدن</option>
            <option value="out">خروج / کم شدن / ضایعات</option>
          </select>
        </Field>
        <div className="mt-3">
          <Field label="گدام">
            <select name="warehouseId">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="تعداد">
            <input name="quantity" inputMode="decimal" required />
          </Field>
          <Field label="بهای واحد (افغانی)">
            <input name="unitCostAfn" inputMode="decimal" defaultValue={avgCost} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="تاریخ">
            <input type="date" name="occurredOn" defaultValue={todayIso()} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="یادداشت">
            <input name="note" placeholder="مثلاً ضایعات یا رسید انبار" />
          </Field>
        </div>
      </GlassCard>
      <ErrorText message={error} />
      <PrimaryButton disabled={pending}>{pending ? "..." : "ثبت تعدیل"}</PrimaryButton>
    </form>
  );
}
