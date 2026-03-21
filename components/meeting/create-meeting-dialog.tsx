'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Calendar } from 'lucide-react';

export function CreateMeetingDialog() {
  const router = useRouter();
  const { organization } = useOrganization();
  const createMeeting = useMutation(api.meetings.create);

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'instant' | 'schedule'>('instant');

  // Form state
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    
    setIsLoading(true);
    try {
      let timestamp: number | undefined;
      if (mode === 'schedule' && dateStr && timeStr) {
        timestamp = new Date(`${dateStr}T${timeStr}`).getTime();
      }

      const meetingId = await createMeeting({
        orgId: organization.id,
        title,
        purpose,
        description,
        isScheduled: mode === 'schedule',
        scheduledFor: timestamp,
      });

      setOpen(false);
      setTitle('');
      setPurpose('');
      setDescription('');
      
      if (mode === 'instant') {
        router.push(`/meeting/${meetingId}`);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create meeting.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-medium shadow-sm hover:shadow-md transition-all">
          <Plus className="w-4 h-4" /> New Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
          <DialogDescription>
            Start an instant room or schedule one for later. Instant meetings notify your team immediately.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="instant">Instant</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <form id="meeting-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly Sync" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input id="purpose" required value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Planning Q3 Roadmap" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (Optional)</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any agendas or links?" className="resize-none" />
            </div>

            {mode === 'schedule' && (
              <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-muted/20 border rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" required value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" required value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
                </div>
              </div>
            )}
          </form>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="meeting-form" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'schedule' ? 'Schedule' : 'Start Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
