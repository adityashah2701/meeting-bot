import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter } from 'lucide-react';
import Link from 'next/link';

export function MeetingsHeader() {
  return (
    <div className="flex flex-col gap-6 mb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            Meetings
          </h1>
          <p className="text-sm text-muted-foreground">
            View, search, and analyze all your transcribed conversations.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="group">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-foreground" />
            Filter
          </Button>
          <Button asChild>
            <Link href="/meetings/create">
              <Plus className="w-4 h-4 mr-2" />
              New Meeting
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search transcripts, insights, or attendees..." 
          className="pl-9 bg-background shadow-sm"
        />
      </div>
    </div>
  );
}
