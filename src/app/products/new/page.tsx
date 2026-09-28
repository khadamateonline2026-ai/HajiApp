import { AppShell } from "@/components/AppShell";
import { ProductForm } from "@/components/SimpleForms";

export default function NewProductPage() {
  return (
    <AppShell title="کالای جدید">
      <ProductForm />
    </AppShell>
  );
}
