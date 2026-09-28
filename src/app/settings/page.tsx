import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SettingsForm } from "@/components/SimpleForms";
import { getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <AppShell title="تنظیمات">
      <SettingsForm settings={settings} />
      <Link href="/rates" className="btn btn-ghost w-full">
        مدیریت ارز و نرخ
      </Link>
      <Link href="/backup" className="btn btn-ghost w-full">
        بکاپ و خروجی
      </Link>
    </AppShell>
  );
}
