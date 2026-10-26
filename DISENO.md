# Diseño — Organizador de Proyectos, Checklists y Tareas

Aplicación web **simple y operativa** para controlar el trabajo pendiente de distintos
proyectos, módulos y tareas. Sin Kanban, sin dashboards, sin gráficos, sin prioridades.

---

## 1. Arquitectura propuesta

| Capa | Elección | Motivo |
|---|---|---|
| Framework | **Next.js 14 (App Router)** + TypeScript | Rutas anidadas naturales: Proyecto → Agrupación → Checklist → Tarea. Un solo deploy. |
| UI | **React 18** con Server Components + acciones de servidor | Formularios simples sin capa de API cliente. |
| Estilos | **CSS global plano** (sin Tailwind) | Interfaz limpia, densa y sin decoración; cero dependencias. |
| Datos | **Prisma + SQLite** (`prisma/dev.db`) | Modelo relacional real (orden, dependencias, historial), sin servidor de BD. |
| Validación | **Zod** | Validar payloads de acciones de servidor. |
| Estado cliente | Solo `useState` en formularios pequeños | Nada de Redux/Zustand: la BD es la única fuente de verdad. |

Patrón: **Server Actions** (`"use server"`) + `revalidatePath`. Mutación → revalidar → render server.

---

## 2. Estructura de carpetas

```
organizador/
├── DISENO.md                      ← este documento
├── package.json / tsconfig.json / next.config.mjs
├── prisma/
│   └── schema.prisma
├── db/
│   └── dev.db                     ← SQLite (generado)
├── src/
│   ├── middleware.ts              ← redirige / → /proyectos
│   ├── prisma.ts                  ← cliente Prisma (singleton)
│   ├── actions.ts                 ← TODAS las server actions (mutaciones)
│   ├── queries.ts                 ← consultas de lectura reutilizables
│   ├── domain/
│   │   ├── constants.ts           ← estados de proyecto/checklist/tarea
│   │   ├── tasks.ts               ← reglas: finished_at, started_at, deps
│   │   ├── dependencies.ts        ← validación anti-ciclos
│   │   ├── history.ts             ← registro de historial
│   │   └── order.ts               ← reordenamiento sin duplicados
│   ├── components/
│   │   ├── ui.tsx                 ← Card, StatusPill, Field, Modal (details), etc.
│   │   ├── nav.tsx                ← menú lateral + buscador global
│   │   └── breadcrumbs.tsx
│   └── app/
│       ├── globals.css / layout.tsx
│       ├── proyectos/
│       │   ├── page.tsx           ← lista de proyectos
│       │   ├── nuevo/page.tsx
│       │   ├── [projectId]/
│       │   │   ├── page.tsx       ← agrupaciones del proyecto
│       │   │   ├── editar/page.tsx
│       │   │   └── [groupId]/
│       │   │       ├── page.tsx   ← checklists de la agrupación
│       │   │       ├── editar/page.tsx
│       │   │       └── [checklistId]/
│       │   │           ├── page.tsx  ← tareas del checklist (filtros)
│       │   │           ├── editar/page.tsx
│       │   │           └── [taskId]/page.tsx  ← detalle + dependencias + historial
│       ├── ahora/page.tsx         ← "Qué hago ahora"
│       ├── foco/page.tsx          ← "Mi foco"
│       ├── inbox/page.tsx
│       └── buscar/page.tsx
```

## 3. Modelo de datos (Prisma)

Igual al modelo sugerido, con mejoras menores:

- Estados guardados como **string** con valores controlados (`STATUS_*` en código).
- `Task.sortOrder` es **Float** → mover arriba/abajo = promedio de vecinos; nunca duplicados ni renumeraciones masivas.
- `cascade` en grupos→checklists→tareas→(dependencias, historial).
- `TaskDependency` con `@@unique([taskId, dependsOnTaskId])`.

```
Project 1─n Group 1─n Checklist 1─n Task
Task 1─n TaskDependency (taskId → dependsOnTaskId, ambos → Task)
Task 1─n TaskHistory
InboxItem (independiente)
```

## 4. Endpoints / páginas (App Router)

| Ruta | Método | Acción |
|---|---|---|
| `/proyectos` | GET | Lista de proyectos con contadores y última actividad |
| `/proyectos/nuevo` | GET/POST | Crear proyecto |
| `/proyectos/[id]` | GET | Agrupaciones; crear/editar/archivar/reordenar |
| `/proyectos/[id]/editar` | GET/POST | Editar proyecto, cambiar estado |
| `/proyectos/[id]/[grupoId]` | GET | Checklists; CRUD + reordenar |
| `/proyectos/[id]/[grupoId]/[checklistId]` | GET | Tareas: filtros, acciones rápidas, crear |
| `/proyectos/[id]/[grupoId]/[checklistId]/[tareaId]` | GET | Detalle, edición, dependencias, historial |
| `/ahora` | GET | Qué hago ahora (en desarrollo / siguientes / espera / bloqueadas / revisión) |
| `/foco` | GET | Mi foco |
| `/inbox` | GET | Ideas; convertir en tarea |
| `/buscar?q=` | GET | Búsqueda global |

**Server actions** (`src/actions.ts`): `createProject, updateProject, archiveProject, restoreProject, deleteProject, createGroup, updateGroup, archiveGroup, deleteGroup, moveGroup, createChecklist, updateChecklist, archiveChecklist, deleteChecklist, moveChecklist, createTask, updateTaskFields, setTaskStatus, moveTask, toggleFocus, addDependency, removeDependency, createInboxItem, updateInboxItem, deleteInboxItem, convertInboxItem`.

## 5. Flujo de navegación

Menú lateral fijo: **Proyectos · Qué hago ahora · Mi foco · Inbox** + buscador global.

```
Proyectos ──click──▶ Proyecto (agrupaciones) ──▶ Agrupación (checklists) ──▶ Checklist (tareas) ──▶ Tarea
```

Breadcrumbs en todas las páginas anidadas. El buscador lleva directo al elemento.

## 6. Reglas de negocio implementadas

- **Estados de tarea**: Pendiente, En desarrollo, Delegado, En espera, Bloqueado, En revisión, Finalizado, Cancelado.
- `Finalizado` → guarda `finishedAt`; salir de Finalizado → limpia `finishedAt`.
- `En desarrollo` → si `startedAt` vacío, lo registra (no se sobreescribe).
- **Orden flotante**: mover arriba = `(prev + actual) / 2`, abajo = `(actual + next) / 2`. Nunca duplicados.
- **Dependencias**: no self-dependency, no duplicadas, **sin ciclos** (DFS bidireccional sobre el grafo del proyecto).
- Dependencia con destino no Finalizado/Cancelado → badge "⚠ Dependencia pendiente" (solo aviso, nunca cambia el estado automáticamente).
- **Historial automático**: creación, estado, responsable, orden, detalle, dependencias ±, foco ±.
- **Archivado lógico** (`archivedAt`) en las 4 entidades; lo archivado sale de listas y contadores (visualizable con toggle en proyectos).

## 7. Plan de implementación por etapas

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Setup + Prisma + dominio (estados, orden, deps, historial) | ✅ |
| 2 | Proyectos: lista + CRUD + archivar | ✅ |
| 3 | Agrupaciones y checklists: CRUD + reordenar | ✅ |
| 4 | Tareas: CRUD, estados, orden, foco, filtros, acciones rápidas | ✅ |
| 5 | Dependencias con anti-ciclos + aviso de pendientes | ✅ |
| 6 | Historial automático | ✅ |
| 7 | Qué hago ahora + Mi foco | ✅ |
| 8 | Inbox + convertir en tarea | ✅ |
| 9 | Búsqueda global | ✅ |
| 10 | Responsive + pulido | ✅ |

## 8. Fuera de alcance (explícito)

Kanban, dashboards, gráficos, prioridades, etiquetas, subtareas, hitos, integraciones, adjuntos, editor enriquecido, Markdown, notificaciones, comentarios, métricas, estimaciones, calendario, Gantt. Nada de esto fue implementado.
