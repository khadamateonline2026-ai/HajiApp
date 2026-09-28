import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui";

export default function NotFound() {
  return (
    <AppShell title="پیدا نشد">
      <GlassCard>
        <p>این صفحه وجود ندارد.</p>
        <Link href="/" className="btn btn-primary w-full">
          برگشت به خانه
        </Link>
      </GlassCard>
    </AppShell>
  );
}
