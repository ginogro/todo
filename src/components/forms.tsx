"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./ui";

export type ActionState = { error?: string; ok?: boolean };
export type StateAction = (
  prev: ActionState,
  formData: FormData
) => Promise<ActionState>;
export type SimpleAction = (formData: FormData) => void | Promise<void>;

/**
 * Formulario conectado a una server action con manejo de errores.
 * Compatible con React 18: llama a la action desde onSubmit en lugar de
 * depender de useActionState/useFormStatus (React 19).
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Guardar",
  variant = "primary",
  resetOnSuccess = false,
}: {
  action: StateAction;
  children?: ReactNode;
  submitLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  resetOnSuccess?: boolean;
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    try {
      const result = await action({}, fd);
      setState(result ?? {});
      if (result?.ok && resetOnSuccess) form.reset();
    } catch (error) {
      // redirect() de Next lanza un error controlado con digest NEXT_REDIRECT:
      // hay que re-lanzarlo para que la navegación ocurra.
      const digest = (error as { digest?: string } | null)?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
      console.error(error);
      setState({ error: "Ocurrió un error inesperado." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      {state?.error ? <p className="error-text">{state.error}</p> : null}
      {state?.ok ? <p className="save-ok">Guardado ✓</p> : null}
      {children}
      <div>
        <Button type="submit" variant={variant} disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * Formulario simple (con confirmación opcional) que invoca la server action
 * manualmente. Compatible con React 18, donde <form action={fn}> no está
 * soportado en componentes cliente.
 */
export function ConfirmForm({
  action,
  message,
  children,
  className,
}: {
  action: SimpleAction;
  message?: string;
  children: ReactNode;
  className?: string;
}) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (message && !window.confirm(message)) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await action(fd);
  }
  return (
    <form className={className} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
