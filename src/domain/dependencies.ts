import { prisma } from "@/prisma";

/**
 * Grafo de dependencias de un proyecto.
 * `out[t]`  : tareas de las que t depende.
 * `in[t]`   : tareas que dependen de t.
 * Ambos direcciones son necesarias para detectar ciclos: un ciclo puede
 * recorrer dependencias "depende de" y "bloquea a" en cualquier orden.
 */
export type DepGraph = { out: Map<string, Set<string>>; in: Map<string, Set<string>> };

export async function buildProjectDepGraph(projectId: string): Promise<DepGraph> {
  const tasks = await prisma.task.findMany({
    where: { checklist: { group: { projectId } } },
    select: { id: true },
  });
  const ids = new Set(tasks.map((t) => t.id));
  const deps = await prisma.taskDependency.findMany({
    where: { taskId: { in: [...ids] }, dependsOnTaskId: { in: [...ids] } },
    select: { taskId: true, dependsOnTaskId: true },
  });

  const out = new Map<string, Set<string>>();
  const inn = new Map<string, Set<string>>();
  for (const id of ids) {
    out.set(id, new Set());
    inn.set(id, new Set());
  }
  for (const d of deps) {
    out.get(d.taskId)!.add(d.dependsOnTaskId);
    inn.get(d.dependsOnTaskId)!.add(d.taskId);
  }
  return { out, in: inn };
}

function reachable(start: string, edges: Map<string, Set<string>>): Set<string> {
  const seen = new Set<string>();
  const stack = [...(edges.get(start) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of edges.get(cur) ?? []) if (!seen.has(nxt)) stack.push(nxt);
  }
  return seen;
}

/**
 * ¿Queda ciclado el grafo si se agrega taskId → dependsOnTaskId?
 * Regla: A depende de B  ⟺  arista A→B.
 * Ciclo si B ya alcanza a A por las aristas "depende de".
 */
export function createsCycle(
  graph: DepGraph,
  taskId: string,
  dependsOnTaskId: string
): boolean {
  if (taskId === dependsOnTaskId) return true;
  return reachable(dependsOnTaskId, graph.out).has(taskId);
}

/**
 * ¿Queda ciclado si se elimina la arista taskId → dependsOnTaskId?
 * (El grafo actual se asume acíclico; quitar una arista nunca crea ciclos,
 * se mantiene por simetría/robustez.)
 */
export function createsCycleOnDelete(
  graph: DepGraph,
  _taskId: string,
  _dependsOnTaskId: string
): boolean {
  return false;
}
