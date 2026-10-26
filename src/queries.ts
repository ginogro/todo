import { prisma } from "@/prisma";
import { TASK_CLOSED_STATUSES } from "@/domain/constants";

export type ProjectCounters = {
  pending: number;
  inProgress: number;
  waiting: number;
  finished: number;
  lastActivity: Date | null;
};

/* ---------- Proyectos ---------- */

export async function listProjects(includeArchived: boolean) {
  return prisma.project.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      groups: {
        where: { archivedAt: null },
        include: {
          checklists: {
            where: { archivedAt: null },
            include: { tasks: { where: { archivedAt: null } } },
          },
        },
      },
    },
  });
}

export async function getProject(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId } });
}

export async function listGroups(projectId: string, includeArchived = false) {
  return prisma.group.findMany({
    where: { projectId, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { checklists: true } },
      checklists: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { tasks: true } },
          tasks: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export async function getGroup(groupId: string) {
  return prisma.group.findUnique({ where: { id: groupId } });
}

export async function listChecklists(groupId: string, includeArchived = false) {
  return prisma.checklist.findMany({
    where: { groupId, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { tasks: true } } },
  });
}

export async function getChecklist(checklistId: string) {
  return prisma.checklist.findUnique({ where: { id: checklistId } });
}

export async function listTasks(checklistId: string, includeArchived = false) {
  return prisma.task.findMany({
    where: { checklistId, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: { sortOrder: "asc" },
  });
}

/* ---------- Dependencias ---------- */

export type DepInfo = {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOn: {
    id: string;
    title: string;
    status: string;
    checklist: {
      id: string;
      name: string;
      group: { id: string; name: string; project: { id: string; name: string } };
    };
  };
};

export async function getDependenciesInfo(taskIds: string[]) {
  if (taskIds.length === 0) return { byTask: new Map<string, DepInfo[]>() };
  const deps = await prisma.taskDependency.findMany({
    where: { taskId: { in: taskIds } },
    include: {
      dependsOn: {
        include: {
          checklist: {
            include: { group: { include: { project: { select: { id: true, name: true } } } } },
          },
        },
      },
    },
  });
  const byTask = new Map<string, DepInfo[]>();
  for (const d of deps) {
    const list = byTask.get(d.taskId) ?? [];
    list.push(d as unknown as DepInfo);
    byTask.set(d.taskId, list);
  }
  return { byTask };
}

export function depIsPending(dep: { dependsOn: { status: string } }): boolean {
  return !TASK_CLOSED_STATUSES.includes(dep.dependsOn.status);
}

export async function getTaskFull(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      checklist: { include: { group: { include: { project: true } } } },
      history: { orderBy: { createdAt: "desc" } },
      dependenciesOut: {
        include: {
          dependsOn: {
            include: {
              checklist: {
                include: { group: { include: { project: { select: { id: true, name: true } } } } },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      dependenciesIn: {
        include: {
          task: {
            include: {
              checklist: {
                include: { group: { include: { project: { select: { id: true, name: true } } } } },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return task;
}

export async function listProjectTasksForPicker(projectId: string) {
  return prisma.task.findMany({
    where: { archivedAt: null, checklist: { group: { projectId }, archivedAt: null } },
    orderBy: [{ checklist: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      checklist: {
        select: {
          id: true,
          name: true,
          group: {
            select: {
              id: true,
              name: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

/* ---------- Vistas globales: Qué hago ahora / Mi foco ---------- */

export type FlatTask = Awaited<ReturnType<typeof listGlobalTasks>>[number];

export async function listGlobalTasks(filter: {
  statuses?: string[];
  focusOnly?: boolean;
}) {
  return prisma.task.findMany({
    where: {
      archivedAt: null,
      checklist: { archivedAt: null, group: { archivedAt: null, project: { archivedAt: null } } },
      ...(filter.statuses ? { status: { in: filter.statuses } } : {}),
      ...(filter.focusOnly ? { isFocus: true } : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      checklist: {
        select: {
          id: true,
          name: true,
          group: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
        },
      },
    },
  });
}

/* ---------- Búsqueda global ---------- */

export async function searchAll(query: string) {
  const q = query.trim();
  if (!q) return { projects: [], groups: [], checklists: [], tasks: [] };
  const contains = { contains: q };

  const [projects, groups, checklists, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { archivedAt: null, OR: [{ name: contains }, { description: contains }] },
      take: 10,
    }),
    prisma.group.findMany({
      where: {
        archivedAt: null,
        project: { archivedAt: null },
        OR: [{ name: contains }, { description: contains }],
      },
      include: { project: { select: { id: true, name: true } } },
      take: 10,
    }),
    prisma.checklist.findMany({
      where: {
        archivedAt: null,
        group: { archivedAt: null, project: { archivedAt: null } },
        OR: [{ name: contains }, { description: contains }],
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        archivedAt: null,
        checklist: { archivedAt: null, group: { archivedAt: null, project: { archivedAt: null } } },
        OR: [{ title: contains }, { detail: contains }],
      },
      include: {
        checklist: {
          select: {
            id: true,
            name: true,
            group: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
          },
        },
      },
      take: 20,
    }),
  ]);

  return { projects, groups, checklists, tasks };
}

/* ---------- Inbox ---------- */

export async function listInboxItems() {
  return prisma.inboxItem.findMany({ orderBy: { createdAt: "desc" } });
}

/* ---------- Contadores de proyecto (sección 2) ---------- */

export function getProjectCounters(
  project: Awaited<ReturnType<typeof listProjects>>[number]
): ProjectCounters {
  const counters = { pending: 0, inProgress: 0, waiting: 0, finished: 0 };
  let lastActivity: Date | null = null;

  for (const g of project.groups) {
    for (const c of g.checklists) {
      for (const t of c.tasks) {
        if (t.status === "pendiente") counters.pending++;
        else if (t.status === "en_desarrollo") counters.inProgress++;
        else if (t.status === "en_espera") counters.waiting++;
        else if (t.status === "finalizado") counters.finished++;
        if (!lastActivity || t.updatedAt > lastActivity) lastActivity = t.updatedAt;
      }
      if (!lastActivity || c.updatedAt > lastActivity) lastActivity = c.updatedAt;
    }
    if (!lastActivity || g.updatedAt > lastActivity) lastActivity = g.updatedAt;
  }
  if (!lastActivity || project.updatedAt > lastActivity) lastActivity = project.updatedAt;

  return { ...counters, lastActivity };
}
