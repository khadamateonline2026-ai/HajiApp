import { AppShell } from "@/components/AppShell";
import { AccountForm } from "@/components/SimpleForms";

export default function NewAccountPage() {
  return (
    <AppShell title="حساب پول جدید">
      <p className="m-0 muted text-sm">هر ارز یک صندوق جدا داشته باشد؛ مثلاً صندوق افغانی و صندوق دالر.</p>
      <AccountForm />
    </AppShell>
  );
}
