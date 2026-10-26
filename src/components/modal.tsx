"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Modal controlado (React). Se cierra con el botón ✕, con clic en el fondo
 * oscuro o con la tecla Escape. No depende de <details>/<summary>.
 */
export function Modal({
  summary,
  title,
  children,
  variant = "primary",
}: {
  summary: string;
  title: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`btn btn-${variant}`}
        onClick={() => setOpen(true)}
      >
        {summary}
      </button>

      {open ? (
        <div
          className="modal-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div className="modal-title">{title}</div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setOpen(false)}
                title="Cerrar"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
