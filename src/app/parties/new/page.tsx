import { AppShell } from "@/components/AppShell";
import { PartyForm } from "@/components/SimpleForms";

export default function NewPartyPage() {
  return (
    <AppShell title="طرف حساب جدید">
      <PartyForm />
    </AppShell>
  );
}
