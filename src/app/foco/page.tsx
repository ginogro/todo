import Link from "next/link";
import { listGlobalTasks, getDependenciesInfo, depIsPending } from "@/queries";
import { Card, CardHeader, EmptyState, TaskStatusPill, Muted } from "@/components/ui";
import { ConfirmForm } from "@/components/forms";
import { toggleFocus, setTaskStatus } from "@/actions";
import { TASK_STATUS_LABELS, TASK_CLOSED_STATUSES } from "@/domain/constants";

export const dynamic = "force-dynamic";

export default async function FocoPage() {
  const tasks = await listGlobalTasks({ focusOnly: true });
  const { byTask } = await getDependenciesInfo(tasks.map((t) => t.id));

  if (tasks.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Mi foco</h1>
        </div>
        <Card>
          <EmptyState>
            No hay tareas en foco. Marca tareas con ☆ en cualquier checklist para
            verlas aquí.
          </EmptyState>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi foco</h1>
          <p className="page-subtitle">
            Tareas marcadas como foco, en cualquier estado.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title={`${tasks.length} tarea(s) en foco`} />
        <ul className="row-list">
          {tasks.map((task, index) => {
            const deps = byTask.get(task.id) ?? [];
            const pending = deps.filter(depIsPending);
            const { checklist } = task;
            return (
              <li key={task.id} className="row-item">
                <div className="row-order-actions">
                  <span className="order-number">{index + 1}.</span>
                </div>
                <div className="row-main">
                  <div className="row-title">
                    <Link
                      href={`/proyectos/${checklist.group.project.id}/${checklist.group.id}/${checklist.id}/${task.id}`}
                    >
                      {task.title}
                    </Link>
                  </div>
                  <div className="row-meta">
                    {checklist.group.project.name} · {checklist.group.name} /{" "}
                    {checklist.name}
                  </div>
                  {pending.length > 0 ? (
                    <div className="dep-pending">
                      ⚠ Dependencia pendiente:{" "}
                      {pending.map((d, i) => (
                        <span key={d.id}>
                          {i > 0 ? ", " : ""}“{d.dependsOn.title}”
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="row-actions">
                  <form action={setTaskStatus} className="inline-form">
                    <input type="hidden" name="id" value={task.id} />
                    <select name="status" defaultValue={task.status} className="input select input-sm">
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
                      title="Quitar del foco"
                    >
                      ★
                    </button>
                  </ConfirmForm>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      <Muted>
        Una tarea puede estar en foco independientemente de su estado. Márcala o
        desmárcala desde cualquier lista.
      </Muted>
    </>
  );
}
