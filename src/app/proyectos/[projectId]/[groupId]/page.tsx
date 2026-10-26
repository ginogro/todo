import { notFound } from "next/navigation";
import type { Task } from "@prisma/client";
import {
  getProject,
  getGroup,
  listChecklists,
  listTasks,
  getDependenciesInfo,
} from "@/queries";
import type { RowDep } from "@/components/tasks";
import { ChecklistsScreen } from "./ChecklistsScreen";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { projectId: string; groupId: string };
}) {
  const { projectId, groupId } = params;
  const [project, group] = await Promise.all([
    getProject(projectId),
    getGroup(groupId),
  ]);
  if (!project || !group || group.projectId !== project.id) notFound();

  const checklists = await listChecklists(groupId, true);

  // Tareas de todos los checklists (incluidas archivadas; el cliente filtra).
  const taskLists = await Promise.all(
    checklists.map((c) => listTasks(c.id, true))
  );

  const tasksByChecklist: Record<string, Task[]> = {};
  const allTasks: Task[] = [];
  for (const tasks of taskLists) {
    for (const t of tasks) allTasks.push(t);
  }
  for (let i = 0; i < checklists.length; i++) {
    tasksByChecklist[checklists[i].id] = taskLists[i];
  }

  const { byTask } = await getDependenciesInfo(allTasks.map((t) => t.id));

  const depsByTask: Record<string, RowDep[]> = {};
  for (const t of allTasks) {
    const deps = byTask.get(t.id) ?? [];
    depsByTask[t.id] = deps.map((d) => ({
      id: d.id,
      title: d.dependsOn.title,
      status: d.dependsOn.status,
      location: `${d.dependsOn.checklist.group.project.name} / ${d.dependsOn.checklist.group.name} / ${d.dependsOn.checklist.name}`,
    }));
  }

  return (
    <ChecklistsScreen
      project={{ id: project.id, name: project.name }}
      group={{ id: group.id, name: group.name, description: group.description }}
      checklists={checklists}
      tasksByChecklist={tasksByChecklist}
      depsByTask={depsByTask}
    />
  );
}
