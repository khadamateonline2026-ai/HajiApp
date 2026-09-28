"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelInvoice } from "@/lib/actions";
import { ErrorText } from "./ui";

export function InvoiceActions({
  id,
  type,
  status,
}: {
  id: number;
  type: "sale" | "purchase";
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const printHref = type === "sale" ? `/sales/${id}/print` : `/purchases/${id}/print`;

  async function onCancel() {
    if (!confirm("این فاکتور لغو شود؟")) return;
    const result = await cancelInvoice(id);
    if (!result.ok) setError(result.error);
    else router.refresh();
  }

  async function share() {
    const url = window.location.origin + printHref;
    if (navigator.share) {
      await navigator.share({ title: "فاکتور", url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
      alert("لینک فاکتور کپی شد.");
    }
  }

  return (
    <div className="space-y-2 no-print">
      <div className="grid grid-cols-3 gap-2">
        <a href={printHref} className="btn btn-primary">
          چاپ
        </a>
        <a href={printHref} className="btn btn-ghost">
          PDF
        </a>
        <button type="button" className="btn btn-ghost" onClick={() => void share()}>
          اشتراک
        </button>
      </div>
      {status !== "cancelled" ? (
        <button type="button" className="btn btn-danger w-full" onClick={() => void onCancel()}>
          لغو فاکتور
        </button>
      ) : null}
      <ErrorText message={error} />
    </div>
  );
}
