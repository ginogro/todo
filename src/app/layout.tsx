import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SideNav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Organizador de proyectos",
  description:
    "Organización simple de proyectos, módulos, checklists y tareas pendientes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <SideNav />
          <main className="main-content">{children}</main>
        </div>
        <footer className="app-footer">
          <Link href="/proyectos">Organizador</Link> · organización simple de
          trabajo pendiente
        </footer>
      </body>
    </html>
  );
}
