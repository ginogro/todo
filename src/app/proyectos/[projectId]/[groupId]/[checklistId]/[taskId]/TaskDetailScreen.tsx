"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Task } from "@prisma/client";
import {
  updateTaskFields,
  toggleFocus,
  archiveTask,
  deleteTask,
  addDependency,
  removeDependency,
} from "@/actions";
import { ActionForm, ConfirmForm } from "@/components/forms";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardHeader,
  Field,
  TextInput,
  TextArea,
  Select,
  Button,
  TaskStatusPill,
  FocusBadge,
  EmptyState,
  formatDate,
} from "@/components/ui";
import { TASK_STATUS_LABELS, TASK_CLOSED_STATUSES } from "@/domain/constants";

export type PickerTask = {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  groupId: string;
  groupName: string;
  checklistId: string;
  checklistName: string;
};

export type DepRow = {
  id: string;
  title: string;
  status: string;
  location: string;
  url: string;
};

export type HistoryRow = {
  id: string;
  eventType: string;
  previousValue: string;
  newValue: string;
  description: string;
  createdAt: string;
};

const HISTORY_LABELS: Record<string, string> = {
  creacion: "Creación",
  estado: "Estado",
  responsable: "Responsable",
  orden: "Orden",
  detalle: "Detalle",
  titulo: "Título",
  dependencia_agregada: "Dependencia agregada",
  dependencia_eliminada: "Dependencia eliminada",
  foco_agregado: "Foco",
  foco_quitado: "Foco",
  archivo: "Archivado",
};

export function TaskDetailScreen({
  task,
  project,
  group,
  checklist,
  pickerTasks,
  depsOut,
  depsIn,
  history,
}: {
  task: Task;
  project: { id: string; name: string };
  group: { id: string; name: string };
  checklist: { id: string; name: string };
  pickerTasks: PickerTask[];
  depsOut: DepRow[];
  depsIn: DepRow[];
  history: HistoryRow[];
}) {
  const checklistUrl = `/proyectos/${project.id}/${group.id}/${checklist.id}`;
  const taskUrl = `${checklistUrl}/${task.id}`;

  /* Selector en cascada para dependencias */
  const [selProject, setSelProject] = useState(project.id);
  const [selGroup, setSelGroup] = useState(group.id);
  const [selChecklist, setSelChecklist] = useState(checklist.id);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of pickerTasks) map.set(t.projectId, t.projectName);
    return [...map].map(([id, name]) => ({ id, name }));
  }, [pickerTasks]);

  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of pickerTasks) {
      if (t.projectId === selProject) map.set(t.groupId, t.groupName);
    }
    return [...map].map(([id, name]) => ({ id, name }));
  }, [pickerTasks, selProject]);

  const checklists = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of pickerTasks) {
      if (t.projectId === selProject && t.groupId === selGroup) {
        map.set(t.checklistId, t.checklistName);
      }
    }
    return [...map].map(([id, name]) => ({ id, name }));
  }, [pickerTasks, selProject, selGroup]);

  const candidateTasks = useMemo(
    () =>
      pickerTasks.filter(
        (t) =>
          t.projectId === selProject &&
          t.groupId === selGroup &&
          t.checklistId === selChecklist &&
          t.taskId !== task.id
      ),
    [pickerTasks, selProject, selGroup, selChecklist, task.id]
  );

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Proyectos", href: "/proyectos" },
          { label: project.name, href: `/proyectos/${project.id}` },
          { label: group.name, href: `/proyectos/${project.id}/${group.id}` },
          { label: checklist.name, href: checklistUrl },
          { label: task.title },
        ]}
      />
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {task.title} {task.isFocus ? <FocusBadge active /> : null}
          </h1>
          <p className="page-subtitle">
            Estado: <TaskStatusPill status={task.status} />
            {task.responsible ? <> · Responsable: {task.responsible}</> : null}
            {task.archivedAt ? <> · (archivada)</> : null}
          </p>
        </div>
        <div className="page-actions">
          <ConfirmForm action={toggleFocus} className="inline-form">
            <input type="hidden" name="id" value={task.id} />
            <Button variant="secondary" type="submit">
              {task.isFocus ? "★ Quitar del foco" : "☆ Marcar como foco"}
            </Button>
          </ConfirmForm>
          <ConfirmForm
            action={archiveTask}
            message={task.archivedAt ? "¿Restaurar tarea?" : "¿Archivar tarea?"}
          >
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="returnTo" value={checklistUrl} />
            <Button variant="secondary" type="submit">
              {task.archivedAt ? "Restaurar" : "Archivar"}
            </Button>
          </ConfirmForm>
          <ConfirmForm
            action={deleteTask}
            message="¿Eliminar definitivamente esta tarea y su historial?"
          >
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="returnTo" value={checklistUrl} />
            <Button variant="danger" type="submit">
              Eliminar
            </Button>
          </ConfirmForm>
        </div>
      </div>

      {/* Edición */}
      <Card>
        <CardHeader title="Detalle de la tarea" />
        <div className="card-body">
          <ActionForm action={updateTaskFields} submitLabel="Guardar cambios">
            <input type="hidden" name="id" value={task.id} />
            <Field label="Título">
              <TextInput name="title" defaultValue={task.title} required maxLength={200} />
            </Field>
            <Field label="Detalle (texto libre)">
              <TextArea name="detail" defaultValue={task.detail} />
            </Field>
            <div className="task-form-grid">
              <Field label="Estado">
                <Select name="status" defaultValue={task.status}>
                  {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Responsable">
                <TextInput name="responsible" defaultValue={task.responsible} maxLength={80} />
              </Field>
            </div>
          </ActionForm>
        </div>
      </Card>

      {/* Fechas de control */}
      <Card>
        <CardHeader title="Información" />
        <div className="card-body">
          <dl className="task-detail-grid">
            <div>
              <dt>Creada</dt>
              <dd>{formatDate(task.createdAt)}</dd>
            </div>
            <div>
              <dt>Modificada</dt>
              <dd>{formatDate(task.updatedAt)}</dd>
            </div>
            <div>
              <dt>Iniciada</dt>
              <dd>{formatDate(task.startedAt)}</dd>
            </div>
            <div>
              <dt>Finalizada</dt>
              <dd>{formatDate(task.finishedAt)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Dependencias: depende de */}
      <Card>
        <CardHeader
          title="Depende de"
          subtitle="Si una dependencia no está finalizada, se muestra como pendiente. El estado de esta tarea siempre lo controlas tú."
        />
        <div className="card-body">
          {depsOut.length === 0 ? (
            <EmptyState>Esta tarea no depende de ninguna otra.</EmptyState>
          ) : (
            <ul className="row-list">
              {depsOut.map((dep) => {
                const isPending = !TASK_CLOSED_STATUSES.includes(dep.status);
                return (
                  <li key={dep.id} className="row-item">
                    <div className="row-main">
                      <div className="row-title">
                        <Link href={dep.url}>{dep.title}</Link>{" "}
                        <TaskStatusPill status={dep.status} />
                      </div>
                      <div className="row-meta">{dep.location}</div>
                      {isPending ? (
                        <div className="dep-pending">
                          ⚠ Dependencia pendiente: “{dep.title}”
                        </div>
                      ) : (
                        <div className="dep-ok">✓ Dependencia resuelta</div>
                      )}
                    </div>
                    <div className="row-actions">
                      <ConfirmForm action={removeDependency} className="inline-form">
                        <input type="hidden" name="depId" value={dep.id} />
                        <button className="btn btn-secondary btn-sm" type="submit">
                          Quitar
                        </button>
                      </ConfirmForm>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="dep-section-title">Agregar dependencia</h3>
          {pickerTasks.length <= 1 ? (
            <EmptyState>
              No hay otras tareas en el proyecto todavía. Crea más tareas antes
              de agregar dependencias.
            </EmptyState>
          ) : (
            <ActionForm action={addDependency} submitLabel="Agregar dependencia">
              <input type="hidden" name="taskId" value={task.id} />
              <div className="task-form-grid">
                <Field label="Proyecto">
                  <Select
                    value={selProject}
                    onChange={(e) => {
                      setSelProject(e.target.value);
                      setSelGroup("");
                      setSelChecklist("");
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Agrupación">
                  <Select
                    value={selGroup}
                    onChange={(e) => {
                      setSelGroup(e.target.value);
                      setSelChecklist("");
                    }}
                  >
                    <option value="">—</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="task-form-grid">
                <Field label="Checklist">
                  <Select
                    value={selChecklist}
                    onChange={(e) => setSelChecklist(e.target.value)}
                  >
                    <option value="">—</option>
                    {checklists.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tarea de la que depende">
                  <Select name="dependsOnTaskId" required>
                    <option value="">Selecciona…</option>
                    {candidateTasks.map((t) => (
                      <option key={t.taskId} value={t.taskId}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </ActionForm>
          )}
        </div>
      </Card>

      {/* Dependencias: bloquea a */}
      <Card>
        <CardHeader title="Bloquea a" subtitle="Tareas que dependen de esta." />
        <div className="card-body">
          {depsIn.length === 0 ? (
            <EmptyState>Ninguna tarea depende de esta.</EmptyState>
          ) : (
            <ul className="row-list">
              {depsIn.map((b) => (
                <li key={b.id} className="row-item">
                  <div className="row-main">
                    <div className="row-title">
                      <Link href={b.url}>{b.title}</Link>{" "}
                      <TaskStatusPill status={b.status} />
                    </div>
                    <div className="row-meta">{b.location}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader title="Historial de cambios" />
        <div className="card-body">
          {history.length === 0 ? (
            <EmptyState>Sin registros todavía.</EmptyState>
          ) : (
            <ul className="history-list">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="history-when">{formatDate(h.createdAt)}</span>
                  <b>{HISTORY_LABELS[h.eventType] ?? h.eventType}</b>
                  {h.previousValue || h.newValue ? (
                    <>
                      : {h.previousValue ? `${h.previousValue} → ` : ""}
                      {h.newValue}
                    </>
                  ) : h.description ? (
                    <>: {h.description}</>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
