import Link from "next/link";
import { searchAll } from "@/queries";
import { Card, CardHeader, EmptyState, Muted, ProjectStatusPill, TaskStatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const results = await searchAll(q);
  const total =
    results.projects.length +
    results.groups.length +
    results.checklists.length +
    results.tasks.length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Búsqueda</h1>
          <p className="page-subtitle">
            {q ? (
              <>
                Resultados para “{q}” — {total} coincidencia(s)
              </>
            ) : (
              "Escribe algo en el buscador del menú lateral."
            )}
          </p>
        </div>
      </div>

      {!q ? null : total === 0 ? (
        <Card>
          <EmptyState>Sin resultados.</EmptyState>
        </Card>
      ) : (
        <>
          {results.projects.length > 0 ? (
            <Card>
              <CardHeader title="Proyectos" />
              <ul className="row-list">
                {results.projects.map((p) => (
                  <li key={p.id} className="row-item">
                    <div className="row-main">
                      <div className="row-title">
                        <Link href={`/proyectos/${p.id}`}>{p.name}</Link>{" "}
                        <ProjectStatusPill status={p.status} />
                      </div>
                      {p.description ? (
                        <div className="row-meta">{p.description}</div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {results.groups.length > 0 ? (
            <Card>
              <CardHeader title="Agrupaciones" />
              <ul className="row-list">
                {results.groups.map((g) => (
                  <li key={g.id} className="row-item">
                    <div className="row-main">
                      <div className="row-title">
                        <Link href={`/proyectos/${g.project.id}/${g.id}`}>
                          {g.name}
                        </Link>
                      </div>
                      <div className="row-meta">
                        {g.project.name}
                        {g.description ? ` · ${g.description}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {results.checklists.length > 0 ? (
            <Card>
              <CardHeader title="Checklists" />
              <ul className="row-list">
                {results.checklists.map((c) => (
                  <li key={c.id} className="row-item">
                    <div className="row-main">
                      <div className="row-title">
                        <Link
                          href={`/proyectos/${c.group.project.id}/${c.group.id}/${c.id}`}
                        >
                          {c.name}
                        </Link>
                      </div>
                      <div className="row-meta">
                        {c.group.project.name} · {c.group.name}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {results.tasks.length > 0 ? (
            <Card>
              <CardHeader title="Tareas" />
              <ul className="row-list">
                {results.tasks.map((t) => (
                  <li key={t.id} className="row-item">
                    <div className="row-main">
                      <div className="row-title">
                        <Link
                          href={`/proyectos/${t.checklist.group.project.id}/${t.checklist.group.id}/${t.checklist.id}/${t.id}`}
                        >
                          {t.title}
                        </Link>{" "}
                        <TaskStatusPill status={t.status} />
                      </div>
                      <div className="row-meta">
                        {t.checklist.group.project.name} ·{" "}
                        {t.checklist.group.name} / {t.checklist.name}
                      </div>
                      {t.detail ? (
                        <div className="row-meta">{t.detail}</div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Muted>La búsqueda considera proyectos, agrupaciones, checklists y tareas.</Muted>
        </>
      )}
    </>
  );
}
