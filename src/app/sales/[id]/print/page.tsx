import { notFound } from "next/navigation";
import { PrintInvoice } from "@/components/PrintInvoice";
import { getInvoice, getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PrintSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, settings] = await Promise.all([getInvoice(Number(id)), getSettings()]);
  if (!data || data.invoice.type !== "sale") notFound();
  return <PrintInvoice data={data} settings={settings} />;
}
