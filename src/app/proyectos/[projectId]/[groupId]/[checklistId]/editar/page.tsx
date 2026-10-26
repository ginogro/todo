import { notFound } from "next/navigation";
import { prisma } from "@/prisma";
import {
  getProject,
  getGroup,
  getChecklist,
} from "@/queries";
import { updateChecklist, deleteChecklist, archiveChecklist } from "@/actions";
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
} from "@/components/ui";
import { CHECKLIST_STATUS_LABELS } from "@/domain/constants";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { projectId: string; groupId: string; checklistId: string };
}) {
  const { projectId, groupId, checklistId } = params;
  const [project, group, checklist] = await Promise.all([
    getProject(projectId),
    getGroup(groupId),
    getChecklist(checklistId),
  ]);
  if (
    !project ||
    !group ||
    !checklist ||
    group.projectId !== project.id ||
    checklist.groupId !== group.id
  ) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Proyectos", href: "/proyectos" },
          { label: project.name, href: `/proyectos/${project.id}` },
          { label: group.name, href: `/proyectos/${project.id}/${group.id}` },
          {
            label: checklist.name,
            href: `/proyectos/${project.id}/${group.id}/${checklist.id}`,
          },
          { label: "Editar" },
        ]}
      />
      <div className="page-header">
        <h1 className="page-title">Editar checklist</h1>
      </div>

      <Card>
        <CardHeader title="Datos del checklist" />
        <div className="card-body">
          <ActionForm action={updateChecklist} submitLabel="Guardar cambios">
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
        </div>
      </Card>

      <Card>
        <CardHeader title="Estado del checklist" />
        <div className="card-body">
          <ConfirmForm
            action={archiveChecklist}
            message={checklist.archivedAt ? "¿Restaurar checklist?" : "¿Archivar checklist?"}
          >
            <input type="hidden" name="id" value={checklist.id} />
            <Button variant="secondary" type="submit">
              {checklist.archivedAt ? "Restaurar" : "Archivar checklist"}
            </Button>
          </ConfirmForm>
        </div>
      </Card>

      <Card>
        <CardHeader title="Zona de riesgo" subtitle="Acción irreversible" />
        <div className="card-body">
          <ConfirmForm
            action={deleteChecklist}
            message={`¿Eliminar "${checklist.name}" con todas sus tareas?`}
          >
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="id" value={checklist.id} />
            <Button variant="danger" type="submit">
              Eliminar checklist
            </Button>
          </ConfirmForm>
        </div>
      </Card>
    </>
  );
}
