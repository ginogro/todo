/**
 * Reglas de estados de tarea (sección 19 del diseño):
 * - Pasar a "finalizado"  → guardar finishedAt.
 * - Salir de "finalizado" → limpiar finishedAt.
 * - Pasar a "en_desarrollo" con startedAt vacío → registrar fecha/hora.
 *   (Si ya había startedAt, se conserva el original.)
 */
export function computeTaskTimestamps(
  current: { status: string; startedAt: Date | null; finishedAt: Date | null },
  nextStatus: string,
  now: Date
): { startedAt: Date | null; finishedAt: Date | null } {
  const result = {
    startedAt: current.startedAt,
    finishedAt: current.finishedAt,
  };

  if (nextStatus === "finalizado" && current.status !== "finalizado") {
    result.finishedAt = now;
  } else if (current.status === "finalizado" && nextStatus !== "finalizado") {
    result.finishedAt = null;
  }

  if (nextStatus === "en_desarrollo" && result.startedAt === null) {
    result.startedAt = now;
  }

  return result;
}
