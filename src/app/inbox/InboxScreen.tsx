"use client";

import { useMemo, useState } from "react";
import type { InboxItem } from "@prisma/client";
import {
  createInboxItem,
  updateInboxItem,
  deleteInboxItem,
  convertInboxItem,
} from "@/actions";
import { ActionForm, ConfirmForm } from "@/components/forms";
import { Card, CardHeader, Field, TextInput, TextArea, Select, Modal, Button, EmptyState, Muted, formatDate } from "@/components/ui";

export type PickerOption = {
  projectId: string;
  projectName: string;
  groupId: string;
  groupName: string;
  checklistId: string;
  checklistName: string;
};

export function InboxScreen({ items, tree }: { items: InboxItem[]; tree: PickerOption[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of tree) map.set(o.projectId, o.projectName);
    return [...map].map(([id, name]) => ({ id, name }));
  }, [tree]);

  const [p, setP] = useState("");
  const [g, setG] = useState("");
  const [c, setC] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of tree) {
      if (o.projectId === p) map.set(o.groupId, o.groupName);
    }
    return [...map].map(([id, name]) => ({ id, name }));
  }, [tree, p]);

  const checklists = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of tree) {
      if (o.projectId === p && o.groupId === g) map.set(o.checklistId, o.checklistName);
    }
    return [...map].map(([id, name]) => ({ id, name }));
  }, [tree, p, g]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inbox</h1>
          <p className="page-subtitle">
            Ideas y pendientes que todavía no quieres clasificar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title="Nueva idea" />
        <div className="card-body">
          <ActionForm action={createInboxItem} submitLabel="Agregar al Inbox">
            <Field label="Título">
              <TextInput name="title" required maxLength={200} autoFocus />
            </Field>
            <Field label="Detalle (opcional)">
              <TextArea name="detail" />
            </Field>
          </ActionForm>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState>
          El Inbox está vacío. Registra una idea arriba; cuando la clasifiques,
          conviértela en tarea.
        </EmptyState>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader
                title={item.title}
                subtitle={item.detail || undefined}
                actions={
                  <>
                    <Muted>{formatDate(item.createdAt)}</Muted>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditingId(editingId === item.id ? null : item.id);
                        setConvertingId(null);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setConvertingId(convertingId === item.id ? null : item.id);
                        setEditingId(null);
                        setP("");
                        setG("");
                        setC("");
                      }}
                    >
                      Convertir en tarea
                    </button>
                    <ConfirmForm
                      action={deleteInboxItem}
                      message={`¿Eliminar la idea "${item.title}"?`}
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <button className="btn btn-danger btn-sm" type="submit">
                        Eliminar
                      </button>
                    </ConfirmForm>
                  </>
                }
              />
              {editingId === item.id ? (
                <div className="card-body">
                  <ActionForm action={updateInboxItem} submitLabel="Guardar idea">
                    <input type="hidden" name="id" value={item.id} />
                    <Field label="Título">
                      <TextInput name="title" defaultValue={item.title} required maxLength={200} />
                    </Field>
                    <Field label="Detalle">
                      <TextArea name="detail" defaultValue={item.detail} />
                    </Field>
                  </ActionForm>
                </div>
              ) : null}

              {convertingId === item.id ? (
                <div className="card-body">
                  {tree.length === 0 ? (
                    <EmptyState>
                      Primero crea un proyecto con al menos una agrupación y un
                      checklist.
                    </EmptyState>
                  ) : (
                    <ActionForm
                      action={convertInboxItem}
                      submitLabel="Convertir en tarea"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <div className="task-form-grid">
                        <Field label="Proyecto">
                          <Select
                            value={p}
                            onChange={(e) => {
                              setP(e.target.value);
                              setG("");
                              setC("");
                            }}
                          >
                            <option value="">Selecciona…</option>
                            {projects.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Agrupación">
                          <Select
                            value={g}
                            onChange={(e) => {
                              setG(e.target.value);
                              setC("");
                            }}
                          >
                            <option value="">Selecciona…</option>
                            {groups.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                      <Field label="Checklist">
                        <Select
                          name="checklistId"
                          value={c}
                          onChange={(e) => setC(e.target.value)}
                          required
                        >
                          <option value="">Selecciona…</option>
                          {checklists.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Muted>
                        Al convertir, la idea se elimina del Inbox y se crea la
                        tarea al final del checklist elegido.
                      </Muted>
                    </ActionForm>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
