import { prisma } from "@/prisma";

export async function recordHistory(input: {
  taskId: string;
  eventType: string;
  previousValue?: string;
  newValue?: string;
  description?: string;
}) {
  await prisma.taskHistory.create({
    data: {
      taskId: input.taskId,
      eventType: input.eventType,
      previousValue: input.previousValue ?? "",
      newValue: input.newValue ?? "",
      description: input.description ?? "",
    },
  });
}
