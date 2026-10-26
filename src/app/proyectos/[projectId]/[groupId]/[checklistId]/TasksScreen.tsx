"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Task } from "@prisma/client";
import { createTask } from "@/actions";
import { ActionForm } from "@/components/forms";
import { TaskRows, type RowDep } from "@/components/tasks";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  Field,
  TextInput,
  TextArea,
  Select,
  Modal,
  EmptyState,
  Muted,
  TaskStatusPill,
} from "@/components/ui";
import { TASK_STATUS_LABELS, TASK_CLOSED_STATUSES } from "@/domain/constants";

type Project = { id: string; name: string };
type Group = { id: string; name: string };
type Checklist = { id: string; name: string; description: string; status: string };

export function TasksScreen({
  project,
  group,
  checklist,
  tasks,
  depsByTask,
}: {
  project: Project;
  group: Group;
  checklist: Checklist;
  tasks: Task[];
  depsByTask: Record<string, RowDep[]>;
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [focusOnly, setFocusOnly] = useState(false);
  const [pendingDepsOnly, setPendingDepsOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const responsibles = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.responsible && !t.archivedAt) set.add(t.responsible);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (!showArchived && t.archivedAt) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (responsibleFilter && t.responsible !== responsibleFilter) return false;
      if (focusOnly && !t.isFocus) return false;
      if (pendingDepsOnly) {
        const deps = depsByTask[t.id] ?? [];
        const hasPending = deps.some(
          (d) => !TASK_CLOSED_STATUSES.includes(d.status)
        );
        if (!hasPending) return false;
      }
      return true;
    });
  }, [tasks, depsByTask, statusFilter, responsibleFilter, focusOnly, pendingDepsOnly, showArchived]);

  const checklistUrl = `/proyectos/${project.id}/${group.id}/${checklist.id}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Proyectos", href: "/proyectos" },
          { label: project.name, href: `/proyectos/${project.id}` },
          { label: group.name, href: `/proyectos/${project.id}/${group.id}` },
          { label: checklist.name },
        ]}
      />
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {checklist.name} <TaskStatusPill status={checklist.status} />
          </h1>
          {checklist.description ? (
            <p className="page-subtitle">{checklist.description}</p>
          ) : null}
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" href={`${checklistUrl}/editar`}>
            Editar checklist
          </Link>
          <Modal summary="+ Nueva tarea" title="Nueva tarea">
            <ActionForm action={createTask} submitLabel="Crear tarea">
              <input type="hidden" name="checklistId" value={checklist.id} />
              <input type="hidden" name="redirectTo" value={checklistUrl} />
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
      </div>

      {/* Filtros simples */}
      <Card className="filters-card">
        <div className="card-body filters-row">
          <label>
            <Muted>Estado</Muted>{" "}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <Muted>Responsable</Muted>{" "}
            <Select
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {responsibles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </label>
          <label className="muted">
            <input
              type="checkbox"
              checked={focusOnly}
              onChange={(e) => setFocusOnly(e.target.checked)}
            />{" "}
            Solo en foco
          </label>
          <label className="muted">
            <input
              type="checkbox"
              checked={pendingDepsOnly}
              onChange={(e) => setPendingDepsOnly(e.target.checked)}
            />{" "}
            Solo con dependencias pendientes
          </label>
          <label className="muted">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{" "}
            Ver archivadas
          </label>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState>
          No hay tareas que coincidan con los filtros. Crea la primera con
          “Nueva tarea”.
        </EmptyState>
      ) : (
        <Card>
          <TaskRows
            tasks={visible}
            depsByTask={depsByTask}
            taskUrlOf={(t) => `${checklistUrl}/${t.id}`}
          />
        </Card>
      )}
      <Muted>
        El orden dentro de esta lista define la prioridad de ejecución (arriba =
        antes). Usa ↑ / ↓ para reordenar.
      </Muted>
    </>
  );
}
