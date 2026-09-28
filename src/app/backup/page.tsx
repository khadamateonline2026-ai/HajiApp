import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";
import { BackupPanel } from "@/components/BackupPanel";

export default function BackupPage() {
  return (
    <AppShell title="بکاپ">
      <GlassCard>
        <p className="mt-0 font-semibold">خروجی داده</p>
        <p className="muted text-sm">
          یک فایل JSON از همه حساب‌ها، کالاها و فاکتورها ساخته می‌شود. این فایل را در جای امن نگه دارید.
        </p>
        <a href="/api/backup" className="btn btn-primary w-full">
          دانلود بکاپ JSON
        </a>
        <a href="/api/backup?format=csv" className="btn btn-ghost mt-2 w-full">
          خروجی CSV کالاها
        </a>
      </GlassCard>
      <BackupPanel />
    </AppShell>
  );
}
