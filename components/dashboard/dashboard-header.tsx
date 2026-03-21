import React from 'react';

export function DashboardHeader() {
  return (
    <header>
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
        Welcome back, Alex!
      </h1>
      <p className="text-lg text-muted-foreground">
        Your editorial intelligence has processed 12 new meetings since yesterday. Here&apos;s your summary.
      </p>
    </header>
  );
}
