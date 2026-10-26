"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/proyectos", label: "Proyectos" },
  { href: "/ahora", label: "Qué hago ahora" },
  { href: "/foco", label: "Mi foco" },
  { href: "/inbox", label: "Inbox" },
];

export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query) router.push(`/buscar?q=${encodeURIComponent(query)}`);
  }

  return (
    <aside className="sidenav">
      <div className="sidenav-brand">
        <Link href="/proyectos">Organizador</Link>
      </div>

      <form className="sidenav-search" onSubmit={submitSearch} role="search">
        <input
          className="input input-sm"
          type="search"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Búsqueda global"
        />
      </form>

      <nav className="sidenav-links">
        {LINKS.map((link) => {
          const active =
            link.href === "/proyectos"
              ? pathname === "/proyectos" || pathname.startsWith("/proyectos/")
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidenav-link ${active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
