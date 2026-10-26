"use client";

import { useState } from "react";
import type { Project } from "@prisma/client";
import type { ProjectCounters } from "@/queries";
import { archiveProject } from "@/actions";
import { ConfirmForm } from "@/components/forms";
import {
  Card,
  ProjectStatusPill,
  EmptyState,
  Muted,
  formatDate,
} from "@/components/ui";
import Link from "next/link";

export function ProjectsScreen({
  initialProjects,
}: {
  initialProjects: (Project & { counters: ProjectCounters })[];
}) {
  const [showArchived, setShowArchived] = useState(false);
  const visible = showArchived
    ? initialProjects
    : initialProjects.filter((p) => !p.archivedAt);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proyectos</h1>
        </div>
        <div className="page-actions">
          <label className="muted">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{" "}
            Ver archivados
          </label>
          <Link className="btn btn-primary" href="/proyectos/nuevo">
            + Nuevo proyecto
          </Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState>
          No hay proyectos todavía. Crea el primero con “Nuevo proyecto”.
        </EmptyState>
      ) : (
        <div className="stack">
          {visible.map((project) => (
            <Card key={project.id}>
              <div className="card-header">
                <div className="card-header-text">
                  <h2 className="card-title">
                    <Link href={`/proyectos/${project.id}`}>{project.name}</Link>{" "}
                    <ProjectStatusPill status={project.status} />
                  </h2>
                  {project.description ? (
                    <div className="card-subtitle">{project.description}</div>
                  ) : null}
                </div>
                <div className="card-actions">
                  <Link
                    className="btn btn-secondary btn-sm"
                    href={`/proyectos/${project.id}/editar`}
                  >
                    Editar
                  </Link>
                  <ConfirmForm
                    action={archiveProject}
                    message={
                      project.archivedAt
                        ? `¿Restaurar el proyecto "${project.name}"?`
                        : `¿Archivar el proyecto "${project.name}"?`
                    }
                  >
                    <input type="hidden" name="id" value={project.id} />
                    <button className="btn btn-secondary btn-sm" type="submit">
                      {project.archivedAt ? "Restaurar" : "Archivar"}
                    </button>
                  </ConfirmForm>
                </div>
              </div>
              <div className="card-body">
                <div className="counter-row">
                  <span>
                    Pendientes: <b>{project.counters.pending}</b>
                  </span>
                  <span>
                    En desarrollo: <b>{project.counters.inProgress}</b>
                  </span>
                  <span>
                    En espera: <b>{project.counters.waiting}</b>
                  </span>
                  <span>
                    Finalizadas: <b>{project.counters.finished}</b>
                  </span>
                  <span>
                    Última actividad: <b>{formatDate(project.counters.lastActivity)}</b>
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Muted>
        Al archivar un proyecto no se borra nada; márcalo “Ver archivados” para
        verlo y restaurarlo.
      </Muted>
    </>
  );
}
