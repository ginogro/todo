import { notFound } from "next/navigation";
import { prisma } from "@/prisma";
import { getProject } from "@/queries";
import { updateProject, deleteProject } from "@/actions";
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
import { PROJECT_STATUS_LABELS } from "@/domain/constants";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Proyectos", href: "/proyectos" },
          { label: project.name, href: `/proyectos/${project.id}` },
          { label: "Editar" },
        ]}
      />
      <div className="page-header">
        <h1 className="page-title">Editar proyecto</h1>
      </div>

      <Card>
        <CardHeader title="Datos del proyecto" />
        <div className="card-body">
          <ActionForm action={updateProject} submitLabel="Guardar cambios">
            <input type="hidden" name="id" value={project.id} />
            <Field label="Nombre">
              <TextInput name="name" defaultValue={project.name} required maxLength={120} />
            </Field>
            <Field label="Descripción">
              <TextArea name="description" defaultValue={project.description} maxLength={2000} />
            </Field>
            <Field label="Estado">
              <Select name="status" defaultValue={project.status}>
                {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
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
        <CardHeader title="Zona de riesgo" subtitle="Acciones irreversibles" />
        <div className="card-body">
          <ConfirmForm
            action={deleteProject}
            message={`¿Eliminar definitivamente "${project.name}" y todo su contenido (agrupaciones, checklists y tareas)?`}
          >
            <input type="hidden" name="id" value={project.id} />
            <Button variant="danger" type="submit">
              Eliminar proyecto
            </Button>
          </ConfirmForm>
        </div>
      </Card>
    </>
  );
}
