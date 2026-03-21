import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function InsightsCharts() {
  const chartBars = [40, 60, 45, 80, 50, 95, 75];
  const topics = [
    { label: "Product Roadmap", percent: 85, color: "bg-primary" },
    { label: "Budget Allocation", percent: 60, color: "bg-primary/80" },
    { label: "Design System", percent: 45, color: "bg-primary/60" },
    { label: "Hiring & Resourcing", percent: 30, color: "bg-primary/40" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="bg-card shadow-sm border-border min-h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl">Meeting Volume</CardTitle>
          <CardDescription>Number of meetings recorded per week</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-end">
          <div className="flex-1 flex items-end justify-between gap-2 mt-8 py-4 px-2 border-b border-border">
            {chartBars.map((height, i) => (
              <div 
                key={i} 
                className="w-full bg-secondary hover:bg-primary/20 transition-colors rounded-t-sm relative group" 
                style={{ height: `${height}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-md border border-border z-10">
                  {height}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-medium pt-3 px-2">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card shadow-sm border-border min-h-[400px]">
        <CardHeader>
          <CardTitle className="text-xl">Topic Analysis</CardTitle>
          <CardDescription>Most frequently discussed themes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 mt-4">
            {topics.map((topic, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-foreground">{topic.label}</span>
                  <span className="text-muted-foreground">{topic.percent}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full ${topic.color} rounded-full`} style={{ width: `${topic.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
