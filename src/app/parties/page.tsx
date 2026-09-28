import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, GlassCard } from "@/components/ui";
import { getParties } from "@/lib/queries";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  customer: "مشتری",
  supplier: "تأمین‌کننده",
  both: "هر دو",
};

export default async function PartiesPage() {
  const rows = await getParties();
  return (
    <AppShell
      title="طرف حساب‌ها"
      action={
        <Link href="/parties/new" className="btn btn-primary">
          + جدید
        </Link>
      }
    >
      <GlassCard>
        {rows.length === 0 ? (
          <EmptyState title="کسی ثبت نشده" text="مشتری یا فروشنده را با نام و شماره اضافه کنید." actionHref="/parties/new" actionLabel="طرف حساب جدید" />
        ) : (
          <div className="space-y-2">
            {rows.map((p) => (
              <Link key={p.id} href={`/parties/${p.id}`} className="list-row bg-white/25">
                <div>
                  <p className="m-0 font-semibold">{p.name}</p>
                  <p className="m-0 text-sm muted">
                    {typeLabel[p.type]} {p.phone ? `· ${p.phone}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
