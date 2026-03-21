"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Calendar, ArrowLeft, UploadCloud, Copy, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateMeetingPage() {
  const [method, setMethod] = useState<'instant' | 'schedule' | 'upload'>('instant');
  const router = useRouter();
  
  // Schedule state
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduledLink, setScheduledLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleStartInstant = () => {
    // Generate a quick random ID for the meeting room
    const roomId = Math.random().toString(36).substring(2, 10);
    router.push(`/meeting/${roomId}`);
  };

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate a link for the future
    const roomId = Math.random().toString(36).substring(2, 10);
    const link = `${window.location.origin}/meeting/${roomId}`;
    setScheduledLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scheduledLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      
      <div className="mb-8">
        <Link href="/meetings" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
          Create a New Meeting
        </h1>
        <p className="text-lg text-muted-foreground">
          Start a live workspace or schedule one for later.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 md:p-10 shadow-sm">
        
        {/* Method Selection Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <button 
            type="button"
            onClick={() => setMethod('instant')}
            className={`flex-1 flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
              method === 'instant' ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-card hover:bg-muted/50 border-border text-muted-foreground'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${method === 'instant' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Video className="w-5 h-5" />
            </div>
            <span className={`font-semibold ${method === 'instant' ? 'text-primary' : 'text-foreground'}`}>Instant Meeting</span>
            <span className="text-xs mt-1 text-center">Start a call right now</span>
          </button>

          <button 
            type="button"
            onClick={() => setMethod('schedule')}
            className={`flex-1 flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
              method === 'schedule' ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-card hover:bg-muted/50 border-border text-muted-foreground'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${method === 'schedule' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <span className={`font-semibold ${method === 'schedule' ? 'text-primary' : 'text-foreground'}`}>Schedule</span>
            <span className="text-xs mt-1 text-center">Plan for a future date</span>
          </button>

          <button 
            type="button"
            onClick={() => setMethod('upload')}
            className={`flex-1 flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
              method === 'upload' ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-card hover:bg-muted/50 border-border text-muted-foreground'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${method === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <UploadCloud className="w-5 h-5" />
            </div>
            <span className={`font-semibold ${method === 'upload' ? 'text-primary' : 'text-foreground'}`}>Upload File</span>
            <span className="text-xs mt-1 text-center">MP4, MP3, WAV</span>
          </button>
        </div>

        {/* Dynamic Form Content */}
        {method === 'instant' && (
          <div className="space-y-6 animate-in fade-in duration-300 flex flex-col items-center py-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg animate-pulse text-primary-foreground">
                <Video className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground">Ready to Jump In?</h3>
            <p className="text-center text-muted-foreground max-w-sm">
              Start an instant WebRTC meeting. You can invite others once you are inside the room.
            </p>
            <Button onClick={handleStartInstant} className="h-12 px-8 font-bold text-base shadow-sm rounded-full mt-4">
              Start Meeting Now
            </Button>
          </div>
        )}

        {method === 'schedule' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {!scheduledLink ? (
              <form onSubmit={handleSchedule} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input 
                    id="title" 
                    value={scheduleTitle}
                    onChange={e => setScheduleTitle(e.target.value)}
                    placeholder="e.g. Weekly Sync" 
                    className="bg-secondary border-transparent focus-visible:ring-primary/20 h-12"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input 
                      id="date" 
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="bg-secondary border-transparent focus-visible:ring-primary/20 h-12 block w-full"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input 
                      id="time" 
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="bg-secondary border-transparent focus-visible:ring-primary/20 h-12 block w-full"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 font-bold text-base shadow-sm mt-4">
                  Generate Meeting Link
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Meeting Scheduled!</h3>
                <p className="text-center text-muted-foreground">
                  Share this link with your participants.
                </p>
                <div className="flex items-center w-full max-w-md mt-4 gap-2">
                  <Input readOnly value={scheduledLink} className="bg-secondary border-transparent h-12" />
                  <Button onClick={copyToClipboard} variant="outline" className="h-12 px-4 shadow-sm">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setScheduledLink('')} className="mt-4">
                  Schedule Another
                </Button>
              </div>
            )}
          </div>
        )}

        {method === 'upload' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center mb-4 border shadow-sm">
                <UploadCloud className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Supports MP4, MP3, WAV, M4A up to 2GB.
              </p>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
