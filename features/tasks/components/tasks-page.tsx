"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { KanbanSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingBlock } from "@/components/shared/loading-block";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { taskService } from "@/features/tasks/services/task-service";

const UNASSIGNED_VALUE = "__unassigned__";

export function TasksPage() {
  const { organization } = useOrganization();
  const createTask = useMutation(taskService.createTask);
  const updateTask = useMutation(taskService.updateTask);
  const openTasks = useQuery(
    taskService.listTasks,
    organization?.id ? { orgId: organization.id, status: "open" } : "skip",
  );
  const inProgressTasks = useQuery(
    taskService.listTasks,
    organization?.id ? { orgId: organization.id, status: "in_progress" } : "skip",
  );
  const doneTasks = useQuery(
    taskService.listTasks,
    organization?.id ? { orgId: organization.id, status: "done" } : "skip",
  );
  const members = useQuery(
    taskService.listOrgMembers,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const [title, setTitle] = useState("");
  const [assigneeTokenIdentifier, setAssigneeTokenIdentifier] = useState(UNASSIGNED_VALUE);

  if (
    openTasks === undefined
    || inProgressTasks === undefined
    || doneTasks === undefined
    || members === undefined
  ) {
    return <LoadingBlock className="h-72 w-full" />;
  }

  const tasks = [...openTasks, ...inProgressTasks, ...doneTasks];

  const handleCreateTask = async () => {
    if (!organization || !title.trim()) {
      return;
    }

    try {
      await createTask({
        orgId: organization.id,
        title: title.trim(),
        assigneeTokenIdentifier:
          assigneeTokenIdentifier === UNASSIGNED_VALUE
            ? undefined
            : assigneeTokenIdentifier,
      });
      setTitle("");
      setAssigneeTokenIdentifier(UNASSIGNED_VALUE);
      toast.success("Task created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create task",
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-linear-to-br from-card via-card to-muted/30 p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-sky-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <KanbanSquare className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Workflow board
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Tasks Board
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Track AI-created and manual follow-ups in a Kanban board, assign ownership, and move work from open to done.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <KanbanSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {tasks.length}
                </p>
                <p className="text-[11px] text-muted-foreground">Total tasks</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Create task</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Follow up with the design team"
          />
          <Select
            value={assigneeTokenIdentifier}
            onValueChange={setAssigneeTokenIdentifier}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Assign member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
              {members.map((member) => (
                <SelectItem
                  key={member.tokenIdentifier}
                  value={member.tokenIdentifier}
                >
                  {member.email && member.email !== member.name
                    ? `${member.name} · ${member.email}`
                    : member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreateTask}>
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Kanban board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Tasks will appear here as your team captures follow-ups."
            />
          ) : (
            <TaskBoard
              tasks={tasks}
              members={members}
              emptyTitle="No tasks yet"
              emptyDescription="Tasks will appear here as your team captures follow-ups."
              onUpdateTask={updateTask}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
