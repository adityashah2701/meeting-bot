import React from 'react';
import { InsightsHeader } from '@/components/insights/insights-header';
import { InsightsStats } from '@/components/insights/insights-stats';
import { InsightsCharts } from '@/components/insights/insights-charts';

export default function InsightsPage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <InsightsHeader />
      <InsightsStats />
      <InsightsCharts />
    </div>
  );
}
