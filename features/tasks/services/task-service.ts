import { api } from "@/convex/_generated/api";

export const taskService = {
  listTasks: api.tasks.index.list,
  createTask: api.tasks.index.create,
};
