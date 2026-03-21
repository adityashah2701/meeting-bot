"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingBlock } from "@/components/shared/loading-block";
import { taskService } from "@/features/tasks/services/task-service";

export function TasksPage() {
  const { organization } = useOrganization();
  const createTask = useMutation(taskService.createTask);
  const tasks = useQuery(
    taskService.listTasks,
    organization?.id ? { orgId: organization.id } : "skip",
  );
  const [title, setTitle] = useState("");

  if (tasks === undefined) {
    return <LoadingBlock className="h-72 w-full" />;
  }

  const handleCreateTask = async () => {
    if (!organization || !title.trim()) {
      return;
    }

    try {
      await createTask({ orgId: organization.id, title: title.trim() });
      setTitle("");
      toast.success("Task created");
    } catch {
      toast.error("Unable to create task");
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-border bg-card p-6">
        <h1 className="text-3xl font-semibold text-foreground">Tasks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Capture action items directly in the workspace and keep follow-ups visible.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Create task</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Follow up with the design team"
          />
          <Button onClick={handleCreateTask}>
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Open work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <EmptyState
              title="No open tasks"
              description="Tasks will appear here as your team captures follow-ups."
            />
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="border border-border px-4 py-3">
                <p className="font-medium text-foreground">{task.title}</p>
                <p className="mt-1 text-xs uppercase text-muted-foreground">{task.status}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
