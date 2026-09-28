import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return <section className={`${strong ? "glass-strong" : "glass"} p-4 ${className}`}>{children}</section>;
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-primary w-full ${className}`} {...props}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-ghost ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="flex items-center gap-2">
        {label}
        {hint ? (
          <span className="hint" title={hint}>
            i
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function EmptyState({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="empty">
      <p className="m-0 text-lg font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-2 mb-4">{text}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <GlassCard>
      <p className="m-0 text-sm muted">{label}</p>
      <p className="mt-1 mb-0 text-2xl num">{value}</p>
      {hint ? <p className="mt-1 mb-0 text-xs muted">{hint}</p> : null}
    </GlassCard>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="m-0 text-sm" style={{ color: "var(--danger)" }}>{message}</p>;
}
