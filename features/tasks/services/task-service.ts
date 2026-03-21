import { api } from "@/convex/_generated/api";

export const taskService = {
  listTasks: api.tasks.list,
  createTask: api.tasks.create,
};
