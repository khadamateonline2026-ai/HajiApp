"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const tabs = [
  { href: "/", label: "خانه", icon: HomeIcon },
  { href: "/purchases", label: "خرید", icon: BagIcon },
  { href: "/sales", label: "فروش", icon: CartIcon },
  { href: "/treasury", label: "خزانه", icon: WalletIcon },
  { href: "/more", label: "بیشتر", icon: MoreIcon },
];

const drawerLinks = [
  { href: "/", label: "خانه" },
  { href: "/parties", label: "طرف حساب‌ها" },
  { href: "/products", label: "کالاها و مواد خام" },
  { href: "/warehouse", label: "گدام / موجودی" },
  { href: "/invoices", label: "فاکتورها" },
  { href: "/treasury", label: "دریافت‌ها و پرداخت‌ها" },
  { href: "/expenses", label: "هزینه‌ها" },
  { href: "/capital", label: "سرمایه" },
  { href: "/reports", label: "گزارش‌ها" },
  { href: "/rates", label: "ارز و نرخ" },
  { href: "/settings", label: "تنظیمات" },
  { href: "/backup", label: "بکاپ / خروجی داده" },
  { href: "/help", label: "راهنما و مشخصات محصول" },
];

export function AppShell({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar glass">
        <button className="icon-btn" type="button" aria-label="منو" onClick={() => setOpen(true)}>
          <MenuIcon />
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs muted">حساب من</p>
          <h1 className="m-0 truncate text-lg font-semibold">{title}</h1>
        </div>
        {action ?? (
          <Link href="/help" className="icon-btn" aria-label="راهنما">
            <span className="hint">i</span>
          </Link>
        )}
      </header>

      <div className="mt-4 space-y-3">{children}</div>

      <nav className="bottom-nav glass-strong">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className={active ? "active" : ""}>
              <Icon />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {open ? (
        <>
          <button className="drawer-overlay" aria-label="بستن منو" onClick={() => setOpen(false)} />
          <aside className="drawer glass-strong">
            <p className="mt-2 mb-1 text-sm muted">منوی کامل</p>
            <h2 className="mt-0 mb-4 text-xl">همه بخش‌ها</h2>
            <div className="space-y-1">
              {drawerLinks.map((link) => (
                <Link key={link.href + link.label} href={link.href} className="list-row hover:bg-[var(--primary-soft)]">
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h2l2.2 11h9.3L20 8H8" strokeLinecap="round" />
      <circle cx="10" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M16 12.5h3" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </svg>
  );
}
