"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/prisma";
import { recordHistory } from "@/domain/history";
import { orderBetween } from "@/domain/order";
import { computeTaskTimestamps } from "@/domain/tasks";
import { buildProjectDepGraph, createsCycle } from "@/domain/dependencies";
import { TASK_STATUS_LABELS } from "@/domain/constants";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const str = () => z.coerce.string().trim();
const optStr = () => z.coerce.string().trim().optional().default("");

function revalidateAll() {
  revalidatePath("/", "layout");
}

function fail(_prev: any, formData: FormData): { error: string } {
  return { error: String(formData.get("__error") ?? "Error") };
}

async function getTaskProjectId(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { checklist: { select: { group: { select: { projectId: true } } } } },
  });
  return task?.checklist.group.projectId ?? null;
}

/** Actualiza una tarea registrando los cambios en el historial. */
async function updateTaskWithHistory(
  taskId: string,
  current: {
    title: string;
    detail: string;
    status: string;
    responsible: string;
    sortOrder: number;
    isFocus: boolean;
    startedAt: Date | null;
    finishedAt: Date | null;
  },
  data: { title?: string; detail?: string; status?: string; responsible?: string },
  options: { sortOrder?: number; isFocus?: boolean } = {}
) {
  const now = new Date();
  const nextStatus = data.status ?? current.status;

  const historyEntries: Parameters<typeof recordHistory>[0][] = [];

  if (data.title !== undefined && data.title !== current.title) {
    historyEntries.push({
      taskId,
      eventType: "titulo",
      previousValue: current.title,
      newValue: data.title,
    });
  }
  if (data.detail !== undefined && data.detail !== current.detail) {
    historyEntries.push({
      taskId,
      eventType: "detalle",
      previousValue: current.detail,
      newValue: data.detail,
    });
  }
  if (nextStatus !== current.status) {
    historyEntries.push({
      taskId,
      eventType: "estado",
      previousValue: TASK_STATUS_LABELS[current.status] ?? current.status,
      newValue: TASK_STATUS_LABELS[nextStatus] ?? nextStatus,
    });
  }
  if (data.responsible !== undefined && data.responsible !== current.responsible) {
    historyEntries.push({
      taskId,
      eventType: "responsable",
      previousValue: current.responsible,
      newValue: data.responsible,
      description:
        data.responsible === ""
          ? "Responsable quitado"
          : `Responsable asignado: ${data.responsible}`,
    });
  }
  if (options.isFocus !== undefined && options.isFocus !== current.isFocus) {
    historyEntries.push({
      taskId,
      eventType: options.isFocus ? "foco_agregado" : "foco_quitado",
      description: options.isFocus ? "Marcada como foco" : "Quitada del foco",
    });
  }
  if (options.sortOrder !== undefined && options.sortOrder !== current.sortOrder) {
    historyEntries.push({
      taskId,
      eventType: "orden",
      previousValue: String(current.sortOrder),
      newValue: String(options.sortOrder),
      description: "Cambio de orden",
    });
  }

  const timestamps =
    nextStatus !== current.status
      ? computeTaskTimestamps(current, nextStatus, now)
      : { startedAt: current.startedAt, finishedAt: current.finishedAt };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.detail !== undefined ? { detail: data.detail } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.responsible !== undefined ? { responsible: data.responsible } : {}),
      ...(options.sortOrder !== undefined ? { sortOrder: options.sortOrder } : {}),
      ...(options.isFocus !== undefined ? { isFocus: options.isFocus } : {}),
      startedAt: timestamps.startedAt,
      finishedAt: timestamps.finishedAt,
      updatedAt: now,
    },
  });

  for (const entry of historyEntries) {
    await recordHistory(entry);
  }
}

/* ------------------------------------------------------------------ */
/* Proyectos                                                           */
/* ------------------------------------------------------------------ */

const projectSchema = z.object({
  name: str().min(1, "El nombre es obligatorio").max(120),
  description: optStr(),
});

export async function createProject(_prev: any, formData: FormData) {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const project = await prisma.project.create({ data: parsed.data });
  revalidateAll();
  redirect(`/proyectos/${project.id}`);
}

export async function updateProject(_prev: any, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!id) return { error: "Proyecto no encontrado" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.project.update({ where: { id }, data: { ...parsed.data, status } });
  revalidateAll();
  redirect(`/proyectos/${id}`);
}

export async function archiveProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return;
  if (project.archivedAt) {
    await prisma.project.update({ where: { id }, data: { archivedAt: null, status: "activo" } });
  } else {
    await prisma.project.update({ where: { id }, data: { archivedAt: new Date(), status: "archivado" } });
  }
  revalidateAll();
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.project.delete({ where: { id } });
  revalidateAll();
  redirect("/proyectos");
}

/* ------------------------------------------------------------------ */
/* Agrupaciones                                                        */
/* ------------------------------------------------------------------ */

const groupSchema = z.object({
  name: str().min(1, "El nombre es obligatorio").max(120),
  description: optStr(),
});

export async function createGroup(_prev: any, formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!projectId) return { error: "Proyecto no encontrado" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const last = await prisma.group.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const group = await prisma.group.create({
    data: { ...parsed.data, projectId, sortOrder: (last?.sortOrder ?? 0) + 100 },
  });
  revalidateAll();
  redirect(`/proyectos/${projectId}/${group.id}`);
}

export async function updateGroup(_prev: any, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!id) return { error: "Agrupación no encontrada" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const group = await prisma.group.update({ where: { id }, data: parsed.data });
  revalidateAll();
  redirect(`/proyectos/${group.projectId}/${group.id}`);
}

export async function archiveGroup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return;
  await prisma.group.update({
    where: { id },
    data: { archivedAt: group.archivedAt ? null : new Date() },
  });
  revalidateAll();
}

export async function deleteGroup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return;
  await prisma.group.delete({ where: { id } });
  revalidateAll();
  redirect(`/proyectos/${group.projectId}`);
}

/** Mueve una agrupación arriba/abajo con orden flotante. */
export async function moveGroup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return;

  const siblings = await prisma.group.findMany({
    where: { projectId: group.projectId, archivedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return;

  const newOrder =
    dir === "up"
      ? orderBetween(swapIdx - 1 >= 0 ? siblings[swapIdx - 1].sortOrder : null, siblings[swapIdx].sortOrder)
      : orderBetween(siblings[swapIdx].sortOrder, swapIdx + 1 < siblings.length ? siblings[swapIdx + 1].sortOrder : null);

  await prisma.group.update({ where: { id }, data: { sortOrder: newOrder } });
  revalidateAll();
}

/* ------------------------------------------------------------------ */
/* Checklists                                                          */
/* ------------------------------------------------------------------ */

const checklistSchema = z.object({
  name: str().min(1, "El nombre es obligatorio").max(120),
  description: optStr(),
  status: z
    .enum(["pendiente", "en_desarrollo", "en_espera", "finalizado"])
    .optional()
    .default("pendiente"),
});

export async function createChecklist(_prev: any, formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const parsed = checklistSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status") ?? undefined,
  });
  if (!groupId) return { error: "Agrupación no encontrada" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const last = await prisma.checklist.findFirst({
    where: { groupId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const checklist = await prisma.checklist.create({
    data: { ...parsed.data, groupId, sortOrder: (last?.sortOrder ?? 0) + 100 },
  });
  revalidateAll();
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { projectId: true } });
  redirect(`/proyectos/${group?.projectId}/${groupId}/${checklist.id}`);
}

export async function updateChecklist(_prev: any, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = checklistSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status") ?? undefined,
  });
  if (!id) return { error: "Checklist no encontrado" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const checklist = await prisma.checklist.update({ where: { id }, data: parsed.data });
  const group = await prisma.group.findUnique({
    where: { id: checklist.groupId },
    select: { projectId: true },
  });
  revalidateAll();
  redirect(`/proyectos/${group?.projectId}/${checklist.groupId}/${checklist.id}`);
}

export async function archiveChecklist(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const checklist = await prisma.checklist.findUnique({ where: { id } });
  if (!checklist) return;
  await prisma.checklist.update({
    where: { id },
    data: { archivedAt: checklist.archivedAt ? null : new Date() },
  });
  revalidateAll();
}

export async function deleteChecklist(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const checklist = await prisma.checklist.findUnique({ where: { id } });
  if (!checklist) return;
  await prisma.checklist.delete({ where: { id } });
  revalidateAll();
  redirect(`/proyectos/${formData.get("projectId")}/${checklist.groupId}`);
}

export async function moveChecklist(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const checklist = await prisma.checklist.findUnique({ where: { id } });
  if (!checklist) return;

  const siblings = await prisma.checklist.findMany({
    where: { groupId: checklist.groupId, archivedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return;

  const newOrder =
    dir === "up"
      ? orderBetween(swapIdx - 1 >= 0 ? siblings[swapIdx - 1].sortOrder : null, siblings[swapIdx].sortOrder)
      : orderBetween(siblings[swapIdx].sortOrder, swapIdx + 1 < siblings.length ? siblings[swapIdx + 1].sortOrder : null);

  await prisma.checklist.update({ where: { id }, data: { sortOrder: newOrder } });
  revalidateAll();
}

/* ------------------------------------------------------------------ */
/* Tareas                                                              */
/* ------------------------------------------------------------------ */

const taskSchema = z.object({
  title: str().min(1, "El título es obligatorio").max(200),
  detail: optStr(),
  responsible: optStr(),
  status: z
    .enum([
      "pendiente",
      "en_desarrollo",
      "delegado",
      "en_espera",
      "bloqueado",
      "en_revision",
      "finalizado",
      "cancelado",
    ])
    .optional(),
});

export async function createTask(_prev: any, formData: FormData) {
  const checklistId = String(formData.get("checklistId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    detail: formData.get("detail"),
    responsible: formData.get("responsible"),
    status: formData.get("status") || undefined,
  });
  if (!checklistId) return { error: "Checklist no encontrado" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const last = await prisma.task.findFirst({
    where: { checklistId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? 0) + 100;

  const status = parsed.data.status ?? "pendiente";
  const now = new Date();
  const task = await prisma.task.create({
    data: {
      ...parsed.data,
      status,
      checklistId,
      sortOrder,
      startedAt: status === "en_desarrollo" ? now : null,
      finishedAt: status === "finalizado" ? now : null,
    },
  });
  await recordHistory({ taskId: task.id, eventType: "creacion", description: "Tarea creada" });
  revalidateAll();
  if (redirectTo) {
    redirect(redirectTo);
  } else {
    redirect(
      `/proyectos/${formData.get("projectId")}/${formData.get("groupId")}/${checklistId}/${task.id}`
    );
  }
}

export async function updateTaskFields(_prev: any, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Tarea no encontrada" };
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    detail: formData.get("detail"),
    responsible: formData.get("responsible"),
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const current = await prisma.task.findUnique({ where: { id } });
  if (!current) return { error: "Tarea no encontrada" };

  await updateTaskWithHistory(
    id,
    current,
    {
      title: parsed.data.title,
      detail: parsed.data.detail,
      responsible: parsed.data.responsible,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    formData.get("applySortOrder") === "1" ? { sortOrder: current.sortOrder } : {}
  );
  revalidateAll();
  return { ok: true as const };
}

/** Cambio rápido de estado desde la lista. */
export async function setTaskStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;
  const current = await prisma.task.findUnique({ where: { id } });
  if (!current || current.status === status) return;

  await updateTaskWithHistory(id, current, { status });
  revalidateAll();
}

/** Mueve una tarea arriba/abajo dentro de su checklist (orden flotante). */
export async function moveTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;

  const siblings = await prisma.task.findMany({
    where: { checklistId: task.checklistId, archivedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return;

  const newOrder =
    dir === "up"
      ? orderBetween(swapIdx - 1 >= 0 ? siblings[swapIdx - 1].sortOrder : null, siblings[swapIdx].sortOrder)
      : orderBetween(siblings[swapIdx].sortOrder, swapIdx + 1 < siblings.length ? siblings[swapIdx + 1].sortOrder : null);

  await updateTaskWithHistory(
    id,
    task,
    {},
    { sortOrder: newOrder }
  );
  revalidateAll();
}

/** Marca / desmarca el foco. */
export async function toggleFocus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const current = await prisma.task.findUnique({ where: { id } });
  if (!current) return;
  await updateTaskWithHistory(id, current, {}, { isFocus: !current.isFocus });
  revalidateAll();
}

/** Archiva / restaura una tarea. */
export async function archiveTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");
  if (!id) return;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;
  await prisma.task.update({
    where: { id },
    data: { archivedAt: task.archivedAt ? null : new Date() },
  });
  await recordHistory({
    taskId: id,
    eventType: "archivo",
    description: task.archivedAt ? "Tarea restaurada" : "Tarea archivada",
  });
  revalidateAll();
  if (returnTo && task.archivedAt !== null) redirect(returnTo);
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  revalidateAll();
  if (returnTo) redirect(returnTo);
}

/* ------------------------------------------------------------------ */
/* Dependencias                                                        */
/* ------------------------------------------------------------------ */

export async function addDependency(_prev: any, formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const dependsOnTaskId = String(formData.get("dependsOnTaskId") ?? "");
  if (!taskId || !dependsOnTaskId) return { error: "Faltan datos" };

  const [task, dependsOn] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId } }),
    prisma.task.findUnique({ where: { id: dependsOnTaskId } }),
  ]);
  if (!task || !dependsOn) return { error: "Tarea no encontrada" };

  const projectId = await getTaskProjectId(taskId);
  if (!projectId) return { error: "Tarea no encontrada" };

  if (taskId === dependsOnTaskId) {
    return { error: "Una tarea no puede depender de sí misma." };
  }

  const existing = await prisma.taskDependency.findFirst({
    where: { taskId, dependsOnTaskId },
  });
  if (existing) {
    return { error: "Esa dependencia ya existe." };
  }

  const graph = await buildProjectDepGraph(projectId);
  if (createsCycle(graph, taskId, dependsOnTaskId)) {
    return { error: "No se puede agregar: generaría una dependencia circular." };
  }

  await prisma.taskDependency.create({ data: { taskId, dependsOnTaskId } });
  await recordHistory({
    taskId,
    eventType: "dependencia_agregada",
    newValue: dependsOn.title,
    description: `Dependencia agregada: ${dependsOn.title}`,
  });
  revalidateAll();
  return { ok: true as const };
}

export async function removeDependency(formData: FormData) {
  const depId = String(formData.get("depId") ?? "");
  if (!depId) return;
  const dep = await prisma.taskDependency.findUnique({
    where: { id: depId },
    include: { dependsOn: { select: { title: true } } },
  });
  if (!dep) return;
  await prisma.taskDependency.delete({ where: { id: depId } });
  await recordHistory({
    taskId: dep.taskId,
    eventType: "dependencia_eliminada",
    previousValue: dep.dependsOn.title,
    description: `Dependencia eliminada: ${dep.dependsOn.title}`,
  });
  revalidateAll();
}

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

const inboxSchema = z.object({
  title: str().min(1, "El título es obligatorio").max(200),
  detail: optStr(),
});

export async function createInboxItem(_prev: any, formData: FormData) {
  const parsed = inboxSchema.safeParse({
    title: formData.get("title"),
    detail: formData.get("detail"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.inboxItem.create({ data: parsed.data });
  revalidateAll();
  return { ok: true as const };
}

export async function updateInboxItem(_prev: any, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Idea no encontrada" };
  const parsed = inboxSchema.safeParse({
    title: formData.get("title"),
    detail: formData.get("detail"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.inboxItem.update({ where: { id }, data: parsed.data });
  revalidateAll();
  return { ok: true as const };
}

export async function deleteInboxItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.inboxItem.delete({ where: { id } });
  revalidateAll();
}

/**
 * Convierte una idea en tarea. Crea la tarea y elimina la idea del Inbox
 * (una vez convertida desaparece del Inbox).
 */
export async function convertInboxItem(_prev: any, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const checklistId = String(formData.get("checklistId") ?? "");
  if (!id || !checklistId) return { error: "Selecciona proyecto, agrupación y checklist." };

  const idea = await prisma.inboxItem.findUnique({ where: { id } });
  if (!idea) return { error: "Idea no encontrada" };

  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: { id: true, groupId: true, group: { select: { projectId: true } } },
  });
  if (!checklist) return { error: "Checklist no encontrado" };

  const last = await prisma.task.findFirst({
    where: { checklistId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      title: idea.title,
      detail: idea.detail,
      checklistId,
      sortOrder: (last?.sortOrder ?? 0) + 100,
    },
  });
  await recordHistory({
    taskId: task.id,
    eventType: "creacion",
    description: "Tarea creada desde el Inbox",
  });
  await prisma.inboxItem.delete({ where: { id } });

  revalidateAll();
  redirect(
    `/proyectos/${checklist.group.projectId}/${checklist.groupId}/${checklistId}/${task.id}`
  );
}
