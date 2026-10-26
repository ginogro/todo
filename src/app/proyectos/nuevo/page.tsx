import { prisma } from "@/prisma";
import { createProject } from "@/actions";
import { ActionForm } from "@/components/forms";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardHeader, Field, TextInput, TextArea } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function Page() {
  prisma; // asegura import temprano del cliente
  return (
    <>
      <Breadcrumbs items={[{ label: "Proyectos", href: "/proyectos" }, { label: "Nuevo proyecto" }]} />
      <div className="page-header">
        <h1 className="page-title">Nuevo proyecto</h1>
      </div>
      <Card>
        <CardHeader title="Datos del proyecto" />
        <div className="card-body">
          <ActionForm action={createProject} submitLabel="Crear proyecto">
            <Field label="Nombre">
              <TextInput name="name" required maxLength={120} autoFocus />
            </Field>
            <Field label="Descripción (opcional)">
              <TextArea name="description" maxLength={2000} />
            </Field>
          </ActionForm>
        </div>
      </Card>
    </>
  );
}
