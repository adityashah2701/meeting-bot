import React from 'react';
import { Calendar, Clock, MoreVertical, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const data = [
  { title: "Product Strategy Sync", host: "Sarah Miller", date: "Oct 24, 2023", duration: "45 min", status: "Analyzed" },
  { title: "Q4 Budget Planning", host: "David Chen", date: "Oct 23, 2023", duration: "1h 12min", status: "Analyzed" },
  { title: "Design Review: MeetMind v2", host: "Alex Johnson", date: "Oct 22, 2023", duration: "28 min", status: "Processing" },
  { title: "Bi-weekly Engineering Standup", host: "Marcus Wu", date: "Oct 21, 2023", duration: "15 min", status: "Transcribed" },
  { title: "Client Discovery: Acme Corp", host: "Sarah Miller", date: "Oct 20, 2023", duration: "55 min", status: "Analyzed" },
  { title: "Marketing Campaign Kickoff", host: "Emily Davis", date: "Oct 19, 2023", duration: "30 min", status: "Analyzed" },
];

export function MeetingsTable() {
  return (
    <div className="border bg-card">
      <Table className='rounded-none'>
        <TableHeader>
          <TableRow>
            <TableHead className="w-5/12 uppercase text-xs tracking-wider">Meeting Details</TableHead>
            <TableHead className="uppercase text-xs tracking-wider">Date</TableHead>
            <TableHead className="uppercase text-xs tracking-wider">Duration</TableHead>
            <TableHead className="uppercase text-xs tracking-wider">Status</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((meeting, i) => (
            <TableRow key={i} className="group cursor-pointer">
              <TableCell>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border shadow-sm">
                    <Video className="w-5 h-5 text-primary/80" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{meeting.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Host: {meeting.host}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {meeting.date}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {meeting.duration}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={
                  meeting.status === 'Analyzed' ? 'default' :
                  meeting.status === 'Processing' ? 'secondary' :
                  'outline'
                }>
                  {meeting.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
