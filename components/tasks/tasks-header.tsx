import React from 'react';
import { Button } from '@/components/ui/button';

export function TasksHeader() {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
          Action Items
        </h1>
        <p className="text-lg text-muted-foreground">
          Tasks automatically extracted from all your workspaces.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="bg-card">
          My Tasks
        </Button>
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
          All Team Tasks
        </Button>
      </div>
    </header>
  );
}
