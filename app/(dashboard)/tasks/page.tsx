import React from 'react';
import { TasksHeader } from '@/components/tasks/tasks-header';
import { TasksList } from '@/components/tasks/tasks-list';

export default function TasksPage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      <TasksHeader />
      <TasksList />
    </div>
  );
}
