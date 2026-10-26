import { notFound } from "next/navigation";
import { prisma } from "@/prisma";
import { getProject, getGroup } from "@/queries";
import { updateGroup, deleteGroup } from "@/actions";
import { ActionForm, ConfirmForm } from "@/components/forms";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardHeader,
  Field,
  TextInput,
  TextArea,
  Button,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { projectId: string; groupId: string };
}) {
  const { projectId, groupId } = params;
  const [project, group] = await Promise.all([
    getProject(projectId),
    getGroup(groupId),
  ]);
  if (!project || !group || group.projectId !== project.id) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Proyectos", href: "/proyectos" },
          { label: project.name, href: `/proyectos/${project.id}` },
          { label: group.name, href: `/proyectos/${project.id}/${group.id}` },
          { label: "Editar" },
        ]}
      />
      <div className="page-header">
        <h1 className="page-title">Editar agrupación</h1>
      </div>

      <Card>
        <CardHeader title="Datos de la agrupación" />
        <div className="card-body">
          <ActionForm action={updateGroup} submitLabel="Guardar cambios">
            <input type="hidden" name="id" value={group.id} />
            <Field label="Nombre">
              <TextInput name="name" defaultValue={group.name} required maxLength={120} />
            </Field>
            <Field label="Descripción">
              <TextArea name="description" defaultValue={group.description} />
            </Field>
          </ActionForm>
        </div>
      </Card>

      <Card>
        <CardHeader title="Zona de riesgo" subtitle="Acción irreversible" />
        <div className="card-body">
          <ConfirmForm
            action={deleteGroup}
            message={`¿Eliminar "${group.name}" con todos sus checklists y tareas?`}
          >
            <input type="hidden" name="id" value={group.id} />
            <Button variant="danger" type="submit">
              Eliminar agrupación
            </Button>
          </ConfirmForm>
        </div>
      </Card>
    </>
  );
}
