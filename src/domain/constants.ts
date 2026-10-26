// Estados de las entidades. Se guardan como strings en la BD,
// controlados por estas constantes.

export const PROJECT_STATUSES = [
  "activo",
  "pausado",
  "finalizado",
  "archivado",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const CHECKLIST_STATUSES = [
  "pendiente",
  "en_desarrollo",
  "en_espera",
  "finalizado",
] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const TASK_STATUSES = [
  "pendiente",
  "en_desarrollo",
  "delegado",
  "en_espera",
  "bloqueado",
  "en_revision",
  "finalizado",
  "cancelado",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Etiquetas visibles en la interfaz (español).
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  pausado: "Pausado",
  finalizado: "Finalizado",
  archivado: "Archivado",
};

export const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_desarrollo: "En desarrollo",
  en_espera: "En espera",
  finalizado: "Finalizado",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_desarrollo: "En desarrollo",
  delegado: "Delegado",
  en_espera: "En espera",
  bloqueado: "Bloqueado",
  en_revision: "En revisión",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

/** Estados que se consideran "resueltos" para una dependencia. */
export const TASK_CLOSED_STATUSES: readonly string[] = [
  "finalizado",
  "cancelado",
];

export function projectStatusOptions(): { value: string; label: string }[] {
  return PROJECT_STATUSES.map((s) => ({
    value: s,
    label: PROJECT_STATUS_LABELS[s],
  }));
}

export function checklistStatusOptions(): { value: string; label: string }[] {
  return CHECKLIST_STATUSES.map((s) => ({
    value: s,
    label: CHECKLIST_STATUS_LABELS[s],
  }));
}

export function taskStatusOptions(): { value: string; label: string }[] {
  return TASK_STATUSES.map((s) => ({
    value: s,
    label: TASK_STATUS_LABELS[s],
  }));
}
