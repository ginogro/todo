import Link from "next/link";
import { listGlobalTasks } from "@/queries";
import { Card, CardHeader, EmptyState, TaskStatusPill, Muted } from "@/components/ui";
import { TASK_STATUS_LABELS } from "@/domain/constants";

export const dynamic = "force-dynamic";

function TaskLine({
  task,
}: {
  task: Awaited<ReturnType<typeof listGlobalTasks>>[number];
}) {
  const { checklist } = task;
  return (
    <li className="row-item">
      <div className="row-main">
        <div className="row-title">
          <Link
            href={`/proyectos/${checklist.group.project.id}/${checklist.group.id}/${checklist.id}/${task.id}`}
          >
            {task.title}
          </Link>{" "}
          {task.isFocus ? <span className="focus-badge focus-on">★</span> : null}
        </div>
        <div className="row-meta">
          {checklist.group.project.name} · {checklist.group.name} /{" "}
          {checklist.name} · <TaskStatusPill status={task.status} />
          {task.responsible ? <> · {task.responsible}</> : null}
        </div>
      </div>
    </li>
  );
}

export default async function AhoraPage() {
  const tasks = await listGlobalTasks({});

  const byStatus = (status: string) => tasks.filter((t) => t.status === status);
  const enDesarrollo = byStatus("en_desarrollo");
  const siguientes = byStatus("pendiente");
  const enEspera = byStatus("en_espera");
  const bloqueadas = byStatus("bloqueado");
  const enRevision = byStatus("en_revision");

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Qué hago ahora</h1>
          <p className="page-subtitle">
            Vista operacional del trabajo actual, sin estadísticas.
          </p>
        </div>
      </div>

      <section className="section-block">
        <h2 className="group-label">En desarrollo</h2>
        <Card>
          {enDesarrollo.length === 0 ? (
            <EmptyState>Nada en desarrollo en este momento.</EmptyState>
          ) : (
            <ul className="row-list">
              {enDesarrollo.map((task) => (
                <TaskLine key={task.id} task={task} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="section-block">
        <h2 className="group-label">Siguientes (pendientes, por orden)</h2>
        <Card>
          {siguientes.length === 0 ? (
            <EmptyState>No hay tareas pendientes.</EmptyState>
          ) : (
            <ul className="row-list">
              {siguientes.slice(0, 20).map((task) => (
                <TaskLine key={task.id} task={task} />
              ))}
            </ul>
          )}
        </Card>
        {siguientes.length > 20 ? (
          <Muted>Mostrando 20 de {siguientes.length} tareas pendientes.</Muted>
        ) : null}
      </section>

      <section className="section-block">
        <h2 className="group-label">En espera</h2>
        <Card>
          {enEspera.length === 0 ? (
            <EmptyState>Nada en espera.</EmptyState>
          ) : (
            <ul className="row-list">
              {enEspera.map((task) => (
                <TaskLine key={task.id} task={task} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="section-block">
        <h2 className="group-label">Bloqueadas</h2>
        <Card>
          {bloqueadas.length === 0 ? (
            <EmptyState>Nada bloqueado.</EmptyState>
          ) : (
            <ul className="row-list">
              {bloqueadas.map((task) => (
                <TaskLine key={task.id} task={task} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="section-block">
        <h2 className="group-label">En revisión</h2>
        <Card>
          {enRevision.length === 0 ? (
            <EmptyState>Nada en revisión.</EmptyState>
          ) : (
            <ul className="row-list">
              {enRevision.map((task) => (
                <TaskLine key={task.id} task={task} />
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
