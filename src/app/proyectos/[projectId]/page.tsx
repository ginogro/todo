import { notFound } from "next/navigation";
import type { RowDep } from "@/components/tasks";
import { getDependenciesInfo, getProject, listGroups } from "@/queries";
import { GroupsScreen } from "./GroupsScreen";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const groups = await listGroups(projectId, true);
  const tasks = groups.flatMap((group) =>
    group.checklists.flatMap((checklist) => checklist.tasks)
  );
  const { byTask } = await getDependenciesInfo(tasks.map((task) => task.id));
  const depsByTask: Record<string, RowDep[]> = {};

  for (const task of tasks) {
    const deps = byTask.get(task.id) ?? [];
    depsByTask[task.id] = deps.map((dependency) => ({
      id: dependency.id,
      title: dependency.dependsOn.title,
      status: dependency.dependsOn.status,
      location: `${dependency.dependsOn.checklist.group.project.name} / ${dependency.dependsOn.checklist.group.name} / ${dependency.dependsOn.checklist.name}`,
    }));
  }

  return (
    <GroupsScreen
      project={project}
      groups={groups}
      depsByTask={depsByTask}
    />
  );
}
