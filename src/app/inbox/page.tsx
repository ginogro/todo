import { prisma } from "@/prisma";
import { listInboxItems } from "@/queries";
import { InboxScreen, type PickerOption } from "./InboxScreen";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const items = await listInboxItems();

  const rows = await prisma.checklist.findMany({
    where: {
      archivedAt: null,
      group: { archivedAt: null, project: { archivedAt: null } },
    },
    orderBy: [{ group: { project: { createdAt: "asc" } } }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      group: {
        select: {
          id: true,
          name: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  const tree: PickerOption[] = rows.map((c) => ({
    projectId: c.group.project.id,
    projectName: c.group.project.name,
    groupId: c.group.id,
    groupName: c.group.name,
    checklistId: c.id,
    checklistName: c.name,
  }));

  return <InboxScreen items={items} tree={tree} />;
}
