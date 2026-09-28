import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";

const links = [
  { href: "/parties", title: "طرف حساب‌ها", text: "مشتری و تأمین‌کننده" },
  { href: "/products", title: "کالاها", text: "مواد خام و جنس دکان" },
  { href: "/warehouse", title: "گدام", text: "موجودی و کمبود" },
  { href: "/invoices", title: "فاکتورها", text: "همه خرید و فروش" },
  { href: "/expenses", title: "هزینه‌ها", text: "کرایه، برق، معاش" },
  { href: "/capital", title: "سرمایه", text: "آوردی و برداشت صاحب" },
  { href: "/reports", title: "گزارش‌ها", text: "سود، طلب، بدهی" },
  { href: "/rates", title: "ارز و نرخ", text: "دالر، یورو، کلدار" },
  { href: "/settings", title: "تنظیمات", text: "رنگ، فونت، چاپ" },
  { href: "/backup", title: "بکاپ", text: "خروجی و ورود داده" },
  { href: "/help", title: "راهنما", text: "آموزش ساده برنامه" },
];

export default function MorePage() {
  return (
    <AppShell title="بیشتر">
      <GlassCard>
        <div className="space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="list-row hover:bg-[var(--primary-soft)]">
              <div>
                <p className="m-0 font-semibold">{l.title}</p>
                <p className="m-0 text-sm muted">{l.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
