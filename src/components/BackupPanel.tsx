"use client";

import { useState } from "react";
import { ErrorText, GlassCard, PrimaryButton } from "./ui";

export function BackupPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setError(null);
    setMessage(null);
    const text = await file.text();
    const res = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    });
    const json = (await res.json()) as { ok?: boolean; error?: string; imported?: number };
    if (!res.ok || !json.ok) {
      setError(json.error || "ورود داده انجام نشد.");
      return;
    }
    setMessage(`وارد شد: ${json.imported ?? 0} کالا/طرف حساب`);
  }

  return (
    <GlassCard>
      <p className="mt-0 font-semibold">ورود داده</p>
      <p className="muted text-sm">فقط کالاها و طرف حساب‌های جدید از فایل JSON اضافه می‌شوند. فاکتورهای قبلی دست نمی‌خورند.</p>
      <label className="btn btn-ghost w-full">
        انتخاب فایل JSON
        <input type="file" accept="application/json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </label>
      <ErrorText message={error} />
      {message ? <p className="mb-0 text-sm">{message}</p> : null}
      <PrimaryButton type="button" className="mt-3" onClick={() => window.location.reload()}>
        تازه‌سازی صفحه
      </PrimaryButton>
    </GlassCard>
  );
}
