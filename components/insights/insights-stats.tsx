import React from 'react';
import { LineChart, PieChart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InsightsStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-card shadow-sm border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">Time Saved</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-foreground mb-2">
            42<span className="text-2xl text-muted-foreground ml-1 font-normal">hrs</span>
          </div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 inline-flex px-2 py-0.5 rounded-md">
            +12% from last week
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card shadow-sm border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-muted rounded-xl">
              <PieChart className="w-5 h-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">Active Members</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-foreground mb-2">18</div>
          <p className="text-xs text-muted-foreground">Out of 24 licensed seats</p>
        </CardContent>
      </Card>

      <Card className="bg-card shadow-sm border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-muted rounded-xl">
              <LineChart className="w-5 h-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">Action Items</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-foreground mb-2">156</div>
          <p className="text-xs text-muted-foreground">Across all teams this month</p>
        </CardContent>
      </Card>
    </div>
  );
}
