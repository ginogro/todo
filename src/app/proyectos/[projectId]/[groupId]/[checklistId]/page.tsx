import { notFound } from "next/navigation";
import {
  getProject,
  getGroup,
  getChecklist,
  listTasks,
  getDependenciesInfo,
} from "@/queries";
import { TasksScreen } from "./TasksScreen";
import type { RowDep } from "@/components/tasks";
import { TASK_CLOSED_STATUSES } from "@/domain/constants";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { projectId: string; groupId: string; checklistId: string };
}) {
  const { projectId, groupId, checklistId } = params;
  const [project, group, checklist] = await Promise.all([
    getProject(projectId),
    getGroup(groupId),
    getChecklist(checklistId),
  ]);
  if (
    !project ||
    !group ||
    !checklist ||
    group.projectId !== project.id ||
    checklist.groupId !== group.id
  ) {
    notFound();
  }

  const tasks = await listTasks(checklistId, true);
  const { byTask } = await getDependenciesInfo(tasks.map((t) => t.id));

  const depsByTask: Record<string, RowDep[]> = {};
  for (const t of tasks) {
    const deps = byTask.get(t.id) ?? [];
    depsByTask[t.id] = deps.map((d) => ({
      id: d.id,
      title: d.dependsOn.title,
      status: d.dependsOn.status,
      location: `${d.dependsOn.checklist.group.project.name} / ${d.dependsOn.checklist.group.name} / ${d.dependsOn.checklist.name}`,
    }));
  }

  // Aviso global del checklist: tareas con dependencias pendientes
  const withPending = tasks.filter((t) =>
    (depsByTask[t.id] ?? []).some(
      (d) => !TASK_CLOSED_STATUSES.includes(d.status)
    )
  ).length;

  return (
    <TasksScreen
      project={{ id: project.id, name: project.name }}
      group={{ id: group.id, name: group.name }}
      checklist={{
        id: checklist.id,
        name: checklist.name,
        description: checklist.description,
        status: checklist.status,
      }}
      tasks={tasks}
      depsByTask={depsByTask}
    />
  );
}
