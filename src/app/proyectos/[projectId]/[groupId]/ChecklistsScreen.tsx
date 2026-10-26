"use client";

import Link from "next/link";
import { useState } from "react";
import type { Checklist, Task } from "@prisma/client";
import {
  createChecklist,
  updateChecklist,
  archiveChecklist,
  deleteChecklist,
  moveChecklist,
  createTask,
} from "@/actions";
import { ActionForm, ConfirmForm } from "@/components/forms";
import { TaskRows, type RowDep } from "@/components/tasks";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardHeader,
  Field,
  TextInput,
  TextArea,
  Select,
  Modal,
  EmptyState,
  Muted,
  ChecklistStatusPill,
  formatDate,
} from "@/components/ui";
import { CHECKLIST_STATUS_LABELS, TASK_STATUS_LABELS } from "@/domain/constants";

type Project = { id: string; name: string };
type Group = { id: string; name: string; description: string };
type ChecklistWithCount = Checklist & { _count: { tasks: number } };

export function ChecklistsScreen({
  project,
  group,
  checklists,
  tasksByChecklist,
  depsByTask,
}: {
  project: Project;
  group: Group;
  checklists: ChecklistWithCount[];
  tasksByChecklist: Record<string, Task[]>;
  depsByTask: Record<string, RowDep[]>;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const visible = showArchived
    ? checklists
    : checklists.filter((c) => !c.archivedAt);

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groupUrl = `/proyectos/${project.id}/${group.id}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Proyectos", href: "/proyectos" },
          { label: project.name, href: `/proyectos/${project.id}` },
          { label: group.name },
        ]}
      />
      <div className="page-header">
        <div>
          <h1 className="page-title">{group.name}</h1>
          {group.description ? <p className="page-subtitle">{group.description}</p> : null}
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" href={`${groupUrl}/editar`}>
            Editar agrupación
          </Link>
          <Modal summary="+ Nuevo checklist" title="Nuevo checklist">
            <ActionForm action={createChecklist} submitLabel="Crear checklist">
              <input type="hidden" name="groupId" value={group.id} />
              <Field label="Nombre">
                <TextInput name="name" required maxLength={120} autoFocus />
              </Field>
              <Field label="Descripción (opcional)">
                <TextArea name="description" />
              </Field>
              <Field label="Estado inicial">
                <Select name="status" defaultValue="pendiente">
                  {Object.entries(CHECKLIST_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <span className="field-hint">Puedes cambiarlo después desde Editar.</span>
              </Field>
            </ActionForm>
          </Modal>
        </div>
      </div>

      <div className="page-actions" style={{ marginBottom: 12 }}>
        <label className="muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />{" "}
          Ver archivados
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState>
          No hay checklists en esta agrupación. Crea uno, por ejemplo “Protocolo
          Gancho”.
        </EmptyState>
      ) : (
        <div className="stack">
          {visible.map((checklist, index) => {
            const isOpen = openIds.has(checklist.id);
            const tasks = tasksByChecklist[checklist.id] ?? [];
            const openTasks = isOpen
              ? tasks.filter((t) => showArchived || !t.archivedAt)
              : [];
            const pendingCount = tasks.filter(
              (t) => !t.archivedAt && t.status !== "finalizado" && t.status !== "cancelado"
            ).length;
            return (
              <Card key={checklist.id}>
                <CardHeader
                  title={
                    <>
                      <button
                        className="icon-btn"
                        type="button"
                        onClick={() => toggleOpen(checklist.id)}
                        title={isOpen ? "Ocultar tareas" : "Ver y administrar tareas"}
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>{" "}
                      <Link href={`${groupUrl}/${checklist.id}`}>
                        {checklist.name}
                      </Link>{" "}
                      <ChecklistStatusPill status={checklist.status} />{" "}
                      {checklist.archivedAt ? <Muted>(archivado)</Muted> : null}
                    </>
                  }
                  subtitle={checklist.description || undefined}
                  actions={
                    <>
                      <Link
                        className="btn btn-secondary btn-sm"
                        href={`${groupUrl}/${checklist.id}`}
                      >
                        Abrir
                      </Link>
                      <Modal summary="Editar" title={`Editar ${checklist.name}`} variant="secondary">
                        <ActionForm action={updateChecklist} submitLabel="Guardar">
                          <input type="hidden" name="id" value={checklist.id} />
                          <Field label="Nombre">
                            <TextInput name="name" defaultValue={checklist.name} required maxLength={120} />
                          </Field>
                          <Field label="Descripción">
                            <TextArea name="description" defaultValue={checklist.description} />
                          </Field>
                          <Field label="Estado">
                            <Select name="status" defaultValue={checklist.status}>
                              {Object.entries(CHECKLIST_STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </ActionForm>
                      </Modal>
                      {!checklist.archivedAt ? (
                        <>
                          <ConfirmForm action={moveChecklist} className="inline-form">
                            <input type="hidden" name="id" value={checklist.id} />
                            <input type="hidden" name="dir" value="up" />
                            <button className="icon-btn" type="submit" title="Subir" disabled={index === 0}>
                              ↑
                            </button>
                          </ConfirmForm>
                          <ConfirmForm action={moveChecklist} className="inline-form">
                            <input type="hidden" name="id" value={checklist.id} />
                            <input type="hidden" name="dir" value="down" />
                            <button
                              className="icon-btn"
                              type="submit"
                              title="Bajar"
                              disabled={index === visible.length - 1}
                            >
                              ↓
                            </button>
                          </ConfirmForm>
                        </>
                      ) : null}
                      <ConfirmForm
                        action={archiveChecklist}
                        message={checklist.archivedAt ? "¿Restaurar checklist?" : "¿Archivar checklist?"}
                      >
                        <input type="hidden" name="id" value={checklist.id} />
                        <button className="btn btn-secondary btn-sm" type="submit">
                          {checklist.archivedAt ? "Restaurar" : "Archivar"}
                        </button>
                      </ConfirmForm>
                      <ConfirmForm
                        action={deleteChecklist}
                        message={`¿Eliminar "${checklist.name}" con todas sus tareas?`}
                      >
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="id" value={checklist.id} />
                        <button className="btn btn-danger btn-sm" type="submit">
                          Eliminar
                        </button>
                      </ConfirmForm>
                    </>
                  }
                />

                {isOpen ? (
                  <div className="card-body checklist-panel">
                    <TaskRows
                      tasks={openTasks}
                      depsByTask={depsByTask}
                      taskUrlOf={(t) => `${groupUrl}/${checklist.id}/${t.id}`}
                    />
                    {openTasks.length === 0 ? (
                      <Muted>Sin tareas aún. Agrega la primera abajo.</Muted>
                    ) : null}

                    <Modal
                      summary={`+ Nueva tarea en “${checklist.name}”`}
                      title="Nueva tarea"
                      variant="secondary"
                    >
                      <ActionForm
                        action={createTask}
                        submitLabel="Crear tarea"
                        resetOnSuccess
                      >
                        <input type="hidden" name="checklistId" value={checklist.id} />
                        <input type="hidden" name="redirectTo" value={groupUrl} />
                        <Field label="Título">
                          <TextInput name="title" required maxLength={200} autoFocus />
                        </Field>
                        <Field label="Detalle (texto libre)">
                          <TextArea name="detail" />
                        </Field>
                        <Field label="Responsable (opcional)">
                          <TextInput name="responsible" maxLength={80} />
                        </Field>
                        <Field label="Estado inicial">
                          <Select name="status" defaultValue="pendiente">
                            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </ActionForm>
                    </Modal>
                  </div>
                ) : (
                  <div className="card-body">
                    <Muted>
                      {checklist._count.tasks} tarea(s) · {pendingCount} sin
                      finalizar · creada {formatDate(checklist.createdAt)} ·
                      modificada {formatDate(checklist.updatedAt)}
                    </Muted>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <Muted>
        Haz clic en ▸ para desplegar un checklist y administrar sus tareas aquí
        mismo: cambiar estado, reordenar, foco o crear nuevas. “Abrir” lleva a la
        vista completa con filtros y edición del checklist.
      </Muted>
    </>
  );
}
