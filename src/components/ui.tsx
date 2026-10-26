import Link from "next/link";
import {
  PROJECT_STATUS_LABELS,
  CHECKLIST_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "@/domain/constants";
import type { ReactNode } from "react";

/* ---------- Tarjeta / panel ---------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="card-header">
      <div className="card-header-text">
        <h2 className="card-title">{title}</h2>
        {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="card-actions">{actions}</div> : null}
    </div>
  );
}

/* ---------- Estados ---------- */

export function ProjectStatusPill({ status }: { status: string }) {
  return (
    <span className={`pill pill-project status-${status}`}>
      {PROJECT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ChecklistStatusPill({ status }: { status: string }) {
  return (
    <span className={`pill pill-checklist status-${status}`}>
      {CHECKLIST_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TaskStatusPill({ status }: { status: string }) {
  return (
    <span className={`pill pill-task status-${status}`}>
      {TASK_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function FocusBadge({ active }: { active: boolean }) {
  return (
    <span className={`focus-badge ${active ? "focus-on" : "focus-off"}`}>
      {active ? "★ En foco" : "Foco"}
    </span>
  );
}

/* ---------- Texto ---------- */

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="error-text">{children}</p>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="muted">{children}</span>;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/* ---------- Formularios ---------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" rows={4} {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input select" {...props} />;
}

export function Button({
  children,
  variant = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <Link className={`btn btn-${variant}`} href={href}>
      {children}
    </Link>
  );
}

/* ---------- Modal (componente cliente controlado, ver modal.tsx) ---------- */

export { Modal } from "./modal";

/** Formulario mínimo dentro de un Modal (para editar/crear entidades). */
export function InlineForm({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <form action={action} className="stack">
      {children}
    </form>
  );
}
