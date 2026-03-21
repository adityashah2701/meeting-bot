import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Video, Calendar, Blocks, Settings2, Github, CheckCircle2 } from 'lucide-react';

const integrations = [
  { 
    id: "zoom", 
    name: "Zoom", 
    category: "Conferencing", 
    description: "Automatically import and transcribe cloud recordings from Zoom.",
    icon: Video,
    connected: true
  },
  { 
    id: "gmeet", 
    name: "Google Meet", 
    category: "Conferencing", 
    description: "Connect our bot to automatically join Google Meet links in your calendar.",
    icon: Video,
    connected: false
  },
  { 
    id: "gcal", 
    name: "Google Calendar", 
    category: "Scheduling", 
    description: "Sync your schedule so MeetMind AI knows when you're in a meeting.",
    icon: Calendar,
    connected: true
  },
  { 
    id: "slack", 
    name: "Slack", 
    category: "Communication", 
    description: "Push meeting summaries and action items directly to Slack channels.",
    icon: Blocks,
    connected: false
  },
  { 
    id: "salesforce", 
    name: "Salesforce", 
    category: "CRM", 
    description: "Sync meeting transcripts and insights directly to Salesforce records.",
    icon: Settings2,
    connected: false
  },
  { 
    id: "github", 
    name: "GitHub", 
    category: "Development", 
    description: "Automatically create GitHub issues from engineering action items.",
    icon: Github,
    connected: false
  }
];

export default function IntegrationsPage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto h-full flex flex-col w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
          Integrations
        </h1>
        <p className="text-lg text-muted-foreground">
          Connect MeetMind AI with your existing tools to automate your editorial pipeline.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((app) => {
          const Icon = app.icon;
          return (
            <Card key={app.id} className="flex flex-col hover:border-primary/30 transition-colors shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${app.connected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground border'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {app.connected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border">
                      Not connected
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-foreground">{app.name}</h3>
                <p className="text-sm text-foreground/80 font-medium">{app.category}</p>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {app.description}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                {app.connected ? (
                  <Button variant="outline" className="w-full">
                    Manage Setting
                  </Button>
                ) : (
                  <Button className="w-full">
                    Connect {app.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
