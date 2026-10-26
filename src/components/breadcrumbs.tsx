import Link from "next/link";
import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Ruta">
      {items.map((item, i) => (
        <span key={i} className="crumb-item">
          {item.href ? (
            <Link href={item.href} className="crumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="crumb-current">{item.label}</span>
          )}
          {i < items.length - 1 ? <span className="crumb-sep"> › </span> : null}
        </span>
      ))}
    </nav>
  );
}
