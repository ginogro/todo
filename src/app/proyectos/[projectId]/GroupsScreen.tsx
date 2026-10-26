"use client";

import Link from "next/link";
import { useState } from "react";
import type { Checklist, Group, Task } from "@prisma/client";
import { createGroup, updateGroup, archiveGroup, deleteGroup, moveGroup } from "@/actions";
import { ActionForm, ConfirmForm } from "@/components/forms";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TaskRows, type RowDep } from "@/components/tasks";
import {
  Card,
  CardHeader,
  Field,
  TextInput,
  TextArea,
  Button,
  Modal,
  EmptyState,
  Muted,
  ChecklistStatusPill,
  formatDate,
} from "@/components/ui";

type Project = { id: string; name: string; description: string };
type ChecklistWithTasks = Checklist & {
  _count: { tasks: number };
  tasks: Task[];
};
type GroupWithContents = Group & {
  _count: { checklists: number };
  checklists: ChecklistWithTasks[];
};

export function GroupsScreen({
  project,
  groups,
  depsByTask,
}: {
  project: Project;
  groups: GroupWithContents[];
  depsByTask: Record<string, RowDep[]>;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [openGroupIds, setOpenGroupIds] = useState<Set<string>>(new Set());
  const [openChecklistIds, setOpenChecklistIds] = useState<Set<string>>(new Set());
  const visible = showArchived ? groups : groups.filter((g) => !g.archivedAt);

  function toggleId(
    id: string,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>
  ) {
    setter((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <Breadcrumbs items={[{ label: "Proyectos", href: "/proyectos" }, { label: project.name }]} />
      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          {project.description ? <p className="page-subtitle">{project.description}</p> : null}
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" href={`/proyectos/${project.id}/editar`}>
            Editar proyecto
          </Link>
          <Modal summary="+ Nueva agrupación" title="Nueva agrupación">
            <ActionForm action={createGroup} submitLabel="Crear agrupación">
              <input type="hidden" name="projectId" value={project.id} />
              <Field label="Nombre">
                <TextInput name="name" required maxLength={120} autoFocus />
              </Field>
              <Field label="Descripción (opcional)">
                <TextArea name="description" />
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
          Ver archivadas
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState>
          No hay agrupaciones. Crea una como “Backend”, “App móvil”, “Base de
          datos”, etc.
        </EmptyState>
      ) : (
        <div className="stack">
          {visible.map((group, index) => {
            const isGroupOpen = openGroupIds.has(group.id);
            const visibleChecklists = showArchived
              ? group.checklists
              : group.checklists.filter((checklist) => !checklist.archivedAt);

            return (
            <Card key={group.id}>
              <CardHeader
                title={
                  <>
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => toggleId(group.id, setOpenGroupIds)}
                      title={isGroupOpen ? "Ocultar checklists" : "Ver checklists"}
                      aria-expanded={isGroupOpen}
                    >
                      {isGroupOpen ? "▾" : "▸"}
                    </button>{" "}
                    <Link href={`/proyectos/${project.id}/${group.id}`}>{group.name}</Link>{" "}
                    {group.archivedAt ? <Muted>(archivada)</Muted> : null}
                  </>
                }
                subtitle={group.description || undefined}
                actions={
                  <>
                    <Link
                      className="btn btn-secondary btn-sm"
                      href={`/proyectos/${project.id}/${group.id}`}
                    >
                      Abrir
                    </Link>
                    <Modal summary="Editar" title={`Editar ${group.name}`} variant="secondary">
                      <ActionForm action={updateGroup} submitLabel="Guardar">
                        <input type="hidden" name="id" value={group.id} />
                        <Field label="Nombre">
                          <TextInput name="name" defaultValue={group.name} required maxLength={120} />
                        </Field>
                        <Field label="Descripción">
                          <TextArea name="description" defaultValue={group.description} />
                        </Field>
                      </ActionForm>
                    </Modal>
                    {!group.archivedAt ? (
                      <>
                        <ConfirmForm action={moveGroup} className="inline-form">
                          <input type="hidden" name="id" value={group.id} />
                          <input type="hidden" name="dir" value="up" />
                          <button className="icon-btn" type="submit" title="Subir" disabled={index === 0}>
                            ↑
                          </button>
                        </ConfirmForm>
                        <ConfirmForm action={moveGroup} className="inline-form">
                          <input type="hidden" name="id" value={group.id} />
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
                      action={archiveGroup}
                      message={group.archivedAt ? "¿Restaurar agrupación?" : "¿Archivar agrupación?"}
                    >
                      <input type="hidden" name="id" value={group.id} />
                      <button className="btn btn-secondary btn-sm" type="submit">
                        {group.archivedAt ? "Restaurar" : "Archivar"}
                      </button>
                    </ConfirmForm>
                    <ConfirmForm
                      action={deleteGroup}
                      message={`¿Eliminar "${group.name}" con todos sus checklists y tareas?`}
                    >
                      <input type="hidden" name="id" value={group.id} />
                      <button className="btn btn-danger btn-sm" type="submit">
                        Eliminar
                      </button>
                    </ConfirmForm>
                  </>
                }
              />
              <div className="card-body">
                <Muted>
                  {group._count.checklists} checklist(s) · creada {formatDate(group.createdAt)}
                </Muted>
              </div>

              {isGroupOpen ? (
                <div className="group-contents">
                  {visibleChecklists.length === 0 ? (
                    <EmptyState>No hay checklists en esta agrupación.</EmptyState>
                  ) : (
                    visibleChecklists.map((checklist) => {
                      const isChecklistOpen = openChecklistIds.has(checklist.id);
                      const visibleTasks = showArchived
                        ? checklist.tasks
                        : checklist.tasks.filter((task) => !task.archivedAt);
                      const checklistUrl = `/proyectos/${project.id}/${group.id}/${checklist.id}`;

                      return (
                        <section className="nested-checklist" key={checklist.id}>
                          <div className="nested-checklist-header">
                            <div>
                              <button
                                className="icon-btn"
                                type="button"
                                onClick={() => toggleId(checklist.id, setOpenChecklistIds)}
                                title={isChecklistOpen ? "Ocultar tareas" : "Ver tareas"}
                                aria-expanded={isChecklistOpen}
                              >
                                {isChecklistOpen ? "▾" : "▸"}
                              </button>{" "}
                              <Link className="nested-checklist-title" href={checklistUrl}>
                                {checklist.name}
                              </Link>{" "}
                              <ChecklistStatusPill status={checklist.status} />{" "}
                              {checklist.archivedAt ? <Muted>(archivado)</Muted> : null}
                            </div>
                            <div className="nested-checklist-actions">
                              <Muted>{checklist._count.tasks} tarea(s)</Muted>
                              <Link className="btn btn-secondary btn-sm" href={checklistUrl}>
                                Abrir
                              </Link>
                            </div>
                          </div>
                          {checklist.description ? (
                            <p className="nested-checklist-description">
                              {checklist.description}
                            </p>
                          ) : null}
                          {isChecklistOpen ? (
                            <div className="nested-task-list">
                              <TaskRows
                                tasks={visibleTasks}
                                depsByTask={depsByTask}
                                taskUrlOf={(task) => `${checklistUrl}/${task.id}`}
                              />
                            </div>
                          ) : null}
                        </section>
                      );
                    })
                  )}
                </div>
              ) : null}
            </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
