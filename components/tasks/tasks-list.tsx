import React from 'react';
import { Circle, Clock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const tasks = [
  { id: 1, text: "Draft technical spec for hybrid AI approach", meeting: "Product Strategy Sync", priority: "High", due: "Tomorrow" },
  { id: 2, text: "Update product roadmap timeline +1 week", meeting: "Product Strategy Sync", priority: "Medium", due: "Oct 30" },
  { id: 3, text: "Schedule review with infosec regarding local models", meeting: "Product Strategy Sync", priority: "High", due: "Nov 2" },
  { id: 4, text: "Send updated contract to Acme Corp", meeting: "Client Discovery: Acme Corp", priority: "Urgent", due: "Today" },
  { id: 5, text: "Prepare Q3 retrospective slides", meeting: "Design Review: MeetMind v2", priority: "Low", due: "Nov 5" },
  { id: 6, text: "Review candidate take-home assignments", meeting: "Bi-weekly Engineering Standup", priority: "Medium", due: "Tomorrow" },
];

export function TasksList() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-border p-4 bg-muted/30 flex items-center justify-between px-6">
        <div className="text-sm font-bold text-foreground uppercase tracking-wide">Pending ({tasks.length})</div>
      </div>
      
      <div className="divide-y divide-border">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 px-6 hover:bg-muted/50 transition-colors flex items-center justify-between group">
            <div className="flex items-start gap-4 flex-1">
              <button className="text-muted-foreground hover:text-primary transition-colors mt-0.5">
                <Circle className="w-5 h-5" />
              </button>
              <div>
                <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors cursor-pointer">
                  {task.text}
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium bg-muted px-2 py-0.5 rounded cursor-pointer hover:bg-muted/80 transition-colors text-foreground">
                    {task.meeting}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Due {task.due}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 ml-4">
              <Badge variant={
                task.priority === 'Urgent' ? 'destructive' :
                task.priority === 'High' ? 'default' :
                task.priority === 'Medium' ? 'secondary' :
                'outline'
              }>
                {task.priority}
              </Badge>
              
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
