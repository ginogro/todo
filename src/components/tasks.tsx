"use client";

import Link from "next/link";
import type { Task } from "@prisma/client";
import { setTaskStatus, moveTask, toggleFocus } from "@/actions";
import { ConfirmForm } from "@/components/forms";
import {
  TaskStatusPill,
  FocusBadge,
  Muted,
  formatDate,
} from "@/components/ui";
import { TASK_STATUS_LABELS, TASK_CLOSED_STATUSES } from "@/domain/constants";

export type RowDep = {
  id: string;
  title: string;
  status: string;
  location: string;
};

/**
 * Filas de tarea con acciones rápidas (estado, orden, foco, abrir).
 * Reutilizado por la pantalla de checklist y por los paneles desplegables
 * de la pantalla de agrupación.
 */
export function TaskRows({
  tasks,
  depsByTask,
  taskUrlOf,
}: {
  tasks: Task[];
  depsByTask: Record<string, RowDep[]>;
  taskUrlOf: (task: Task) => string;
}) {
  if (tasks.length === 0) {
    return <p className="empty-state">No hay tareas todavía.</p>;
  }

  return (
    <ul className="row-list">
      {tasks.map((task, index) => {
        const deps = depsByTask[task.id] ?? [];
        const pendingDeps = deps.filter(
          (d) => !TASK_CLOSED_STATUSES.includes(d.status)
        );
        const taskUrl = taskUrlOf(task);
        return (
          <li key={task.id} className="row-item">
            <div className="row-order-actions">
              {!task.archivedAt ? (
                <>
                  <ConfirmForm action={moveTask} className="inline-form">
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button
                      className="icon-btn"
                      type="submit"
                      title="Subir"
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                  </ConfirmForm>
                  <ConfirmForm action={moveTask} className="inline-form">
                    <input type="hidden" name="id" value={task.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button
                      className="icon-btn"
                      type="submit"
                      title="Bajar"
                      disabled={index === tasks.length - 1}
                    >
                      ↓
                    </button>
                  </ConfirmForm>
                </>
              ) : null}
            </div>

            <div className="row-main">
              <div className="row-title">
                <Link href={taskUrl}>
                  {index + 1}. {task.title}
                </Link>{" "}
                {task.isFocus ? <FocusBadge active /> : null}
                {task.archivedAt ? <Muted> (archivada)</Muted> : null}
              </div>
              <div className="row-meta">
                Estado: <TaskStatusPill status={task.status} />{" "}
                {task.responsible ? <>· Responsable: {task.responsible} </> : null}
                {task.finishedAt ? (
                  <>· Finalizada {formatDate(task.finishedAt)}</>
                ) : task.startedAt ? (
                  <>· Iniciada {formatDate(task.startedAt)}</>
                ) : null}
              </div>
              {pendingDeps.length > 0 ? (
                <div className="dep-pending">
                  {pendingDeps.length === 1
                    ? "Dependencia pendiente"
                    : "Dependencias pendientes"}
                  :{" "}
                  {pendingDeps.map((d, i) => (
                    <span key={d.id}>
                      {i > 0 ? ", " : ""}“{d.title}” ({d.location})
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="row-actions">
              {!task.archivedAt ? (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      void setTaskStatus(fd);
                    }}
                    className="inline-form"
                  >
                    <input type="hidden" name="id" value={task.id} />
                    <select
                      name="status"
                      defaultValue={task.status}
                      className="input select input-sm"
                    >
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button className="icon-btn" type="submit" title="Cambiar estado">
                      ✓
                    </button>
                  </form>
                  <ConfirmForm action={toggleFocus} className="inline-form">
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      className="icon-btn"
                      type="submit"
                      title={task.isFocus ? "Quitar del foco" : "Marcar como foco"}
                    >
                      {task.isFocus ? "★" : "☆"}
                    </button>
                  </ConfirmForm>
                </>
              ) : null}
              <Link className="btn btn-secondary btn-sm" href={taskUrl}>
                Abrir
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
