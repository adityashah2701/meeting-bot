import { TasksPage } from "@/features/tasks/components/tasks-page";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata("Tasks", "Track meeting follow-ups and action items in realtime.");

export default function TasksRoute() {
  return <TasksPage />;
}
