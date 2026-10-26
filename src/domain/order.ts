/**
 * Orden flotante: para mover una tarea entre dos vecinas se asigna el
 * promedio de sus `sortOrder`. Así nunca hay duplicados ni hace falta
 * renumerar la lista completa.
 */

export function orderBetween(prev: number | null, next: number | null): number {
  if (prev !== null && next !== null) return (prev + next) / 2;
  if (prev !== null) return prev + 100;
  if (next !== null) return next - 100;
  return 100;
}
