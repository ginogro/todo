import { notFound } from "next/navigation";
import {
  getTaskFull,
  listProjectTasksForPicker,
} from "@/queries";
import { TaskDetailScreen, type PickerTask, type DepRow } from "./TaskDetailScreen";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: {
    projectId: string;
    groupId: string;
    checklistId: string;
    taskId: string;
  };
}) {
  const { taskId } = params;
  const task = await getTaskFull(taskId);
  if (
    !task ||
    task.checklistId !== params.checklistId ||
    task.checklist.groupId !== params.groupId ||
    task.checklist.group.projectId !== params.projectId
  ) {
    notFound();
  }

  const pickerRaw = await listProjectTasksForPicker(task.checklist.group.projectId);
  const pickerTasks: PickerTask[] = pickerRaw.map((t) => ({
    taskId: t.id,
    title: t.title,
    projectId: t.checklist.group.project.id,
    projectName: t.checklist.group.project.name,
    groupId: t.checklist.group.id,
    groupName: t.checklist.group.name,
    checklistId: t.checklist.id,
    checklistName: t.checklist.name,
  }));

  const locOf = (c: {
    name: string;
    group: { name: string; project: { name: string } };
  }) => `${c.group.project.name} / ${c.group.name} / ${c.name}`;

  const urlOf = (c: {
    id: string;
    group: { id: string; project: { id: string } };
  }) => `/proyectos/${c.group.project.id}/${c.group.id}/${c.id}`;

  const depsOut: DepRow[] = task.dependenciesOut.map((d) => ({
    id: d.id,
    title: d.dependsOn.title,
    status: d.dependsOn.status,
    location: locOf(d.dependsOn.checklist),
    url: `${urlOf(d.dependsOn.checklist)}/${d.dependsOn.id}`,
  }));

  const depsIn: DepRow[] = task.dependenciesIn.map((d) => ({
    id: d.id,
    title: d.task.title,
    status: d.task.status,
    location: locOf(d.task.checklist),
    url: `${urlOf(d.task.checklist)}/${d.task.id}`,
  }));

  const history = task.history.map((h) => ({
    id: h.id,
    eventType: h.eventType,
    previousValue: h.previousValue,
    newValue: h.newValue,
    description: h.description,
    createdAt: h.createdAt.toISOString(),
  }));

  return (
    <TaskDetailScreen
      task={task}
      project={{
        id: task.checklist.group.project.id,
        name: task.checklist.group.project.name,
      }}
      group={{ id: task.checklist.group.id, name: task.checklist.group.name }}
      checklist={{ id: task.checklist.id, name: task.checklist.name }}
      pickerTasks={pickerTasks}
      depsOut={depsOut}
      depsIn={depsIn}
      history={history}
    />
  );
}
