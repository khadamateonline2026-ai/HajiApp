import { notFound } from "next/navigation";
import { getPayment, getSettings } from "@/lib/queries";
import { ReceiptPrint } from "@/components/ReceiptPrint";

export const dynamic = "force-dynamic";

export default async function PrintReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row, settings] = await Promise.all([getPayment(Number(id)), getSettings()]);
  if (!row) notFound();
  return <ReceiptPrint row={row} settings={settings} />;
}
