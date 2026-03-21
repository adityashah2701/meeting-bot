'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useWebRTC } from '@/hooks/use-webrtc';
import { VideoGrid } from '@/components/meeting/video-grid';
import { MeetingControls } from '@/components/meeting/meeting-controls';
import { MeetingSidebar } from '@/components/meeting/meeting-sidebar';
import { Sparkles, FileText, MessageSquare, Mic, Disc, ArrowLeft, Shield, Users, LayoutPanelLeft, Camera, VideoOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTranscription, TranscriptLine } from '@/hooks/use-transcription';

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingIdStr = Array.isArray(params.id) ? params.id[0] : params.id;
  const meetingId = meetingIdStr as Id<"meetings">;
  const [hasJoined, setHasJoined] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'transcript' | 'chat'>('insights');
  const [enableSummarization, setEnableSummarization] = useState(true);
  const [enableTranscription, setEnableTranscription] = useState(true);
  const [enableRecording, setEnableRecording] = useState(false);

  const endMeetingMutation = useMutation(api.meetings.endMeeting);

  const dbTranscripts = useQuery(api.transcripts.list, { meetingId }) || [];
  const addTranscript = useMutation(api.transcripts.add);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptLine | null>(null);

  const meeting = useQuery(api.meetings.get, { meetingId });
  const isEnded = meeting?.status === 'ended';
  
  useEffect(() => {
    if (isEnded) {
      setIsSidebarOpen(true);
      setActiveTab('insights');
    }
  }, [isEnded]);

  const handleNewTranscript = useCallback((newLine: TranscriptLine) => {
    if (newLine.isInterim) {
      setInterimTranscript(newLine);
    } else {
      setInterimTranscript(null);
      addTranscript({
        meetingId,
        speakerId: newLine.senderId,
        speakerName: newLine.sender,
        text: newLine.text,
        timestamp: newLine.timestamp,
      }).catch(console.error);
    }
  }, [meetingId, addTranscript]);

  const displayTranscript = useMemo(() => {
    const formatted = dbTranscripts.map(t => ({
      id: t._id,
      sender: t.speakerName,
      senderId: t.speakerId,
      text: t.text,
      isInterim: false,
      timestamp: t.timestamp
    }));
    return interimTranscript ? [...formatted, interimTranscript] : formatted;
  }, [dbTranscripts, interimTranscript]);

  const { isListening, error: transcriptError } = useTranscription({
    isEnabled: hasJoined && !isEnded && enableTranscription,
    onNewTranscript: handleNewTranscript,
    userName: 'You',
  });

  const {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoOff,
    startLocalStream,
    toggleAudio,
    toggleVideo,
  } = useWebRTC({ roomId: meetingId || '' });

  const handleLeave = async () => {
    try {
      if (meeting?.status !== 'ended') {
        await endMeetingMutation({ meetingId });
      }
    } catch (e) {
      console.error(e);
    } finally {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    if (hasJoined && !isEnded) {
      startLocalStream();
    }
  }, [hasJoined, startLocalStream, isEnded]);

  const toggleSidebar = (tab: 'insights' | 'transcript' | 'chat') => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setIsSidebarOpen(true);
    }
  };

  if (!hasJoined && !isEnded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-card p-10 rounded-xl shadow-lg border border-border text-center transition-all duration-300 transform">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">Join Workspace</h1>
          <p className="text-muted-foreground font-medium mb-8 opacity-80">Room: <span className="font-mono bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">{meeting?.title || meetingIdStr}</span></p>

          <div className="space-y-4 mb-8 text-left bg-muted/30 p-5 rounded-xl border border-border/50 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" /> Meeting Preferences
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1 pr-4">
                <Label htmlFor="summarization" className="text-sm font-medium">AI Summarization</Label>
                <span className="text-xs text-muted-foreground leading-snug">Generate automated meeting notes & insights</span>
              </div>
              <Switch id="summarization" checked={enableSummarization} onCheckedChange={setEnableSummarization} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1 pr-4">
                <Label htmlFor="transcription" className="text-sm font-medium">Live Transcription</Label>
                <span className="text-xs text-muted-foreground leading-snug">Real-time speech to text conversion</span>
              </div>
              <Switch id="transcription" checked={enableTranscription} onCheckedChange={setEnableTranscription} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1 pr-4">
                <Label htmlFor="recording" className="text-sm font-medium">Record Meeting</Label>
                <span className="text-xs text-muted-foreground leading-snug">Save audio and video for later review</span>
              </div>
              <Switch id="recording" checked={enableRecording} onCheckedChange={setEnableRecording} />
            </div>
          </div>

          <button
            onClick={() => setHasJoined(true)}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            Enter Meeting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5 text-zinc-300" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">
              {meeting?.title || "Meeting Room"}
              {isEnded && <span className="ml-2 text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full">Ended</span>}
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-primary" /> End-to-end Encrypted
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
        {!isEnded && (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-800">
              <Users className="w-4 h-4 text-zinc-400" />
              {remoteStreams.size + 1} Participant{remoteStreams.size !== 0 ? 's' : ''}
            </Button>
            <Button 
              variant={isSidebarOpen ? "secondary" : "outline"}
              size="icon" 
              className={`h-9 w-9 relative border-zinc-800 ${isSidebarOpen ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <LayoutPanelLeft className="w-4 h-4" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 flex min-h-0 relative px-6 pb-2 pt-2 transition-all mt-16">
        <div className={`flex-1 transition-all duration-300 h-full ${isSidebarOpen ? 'pr-4' : ''}`}>
           {isEnded ? (
             <div className="w-full h-full rounded-2xl flex items-center justify-center flex-col gap-6 bg-black/40 border border-white/5 shadow-2xl">
                <VideoOff className="w-16 h-16 text-zinc-500" />
                <h2 className="text-3xl font-bold text-zinc-200">Meeting Ended</h2>
                <p className="text-zinc-400 text-center max-w-md">
                  This meeting has concluded. Check the intelligent insights and transcripts in the sidebar.
                </p>
             </div>
           ) : (
             <VideoGrid localStream={localStream} remoteStreams={remoteStreams} />
           )}
        </div>

        {isSidebarOpen && (
          <aside className="w-80 h-full flex-none bg-zinc-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 border border-zinc-800 flex flex-col">
            <MeetingSidebar 
              meetingId={meetingId}
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              onClose={() => setIsSidebarOpen(false)} 
              transcript={displayTranscript}
              enableSummarization={enableSummarization}
            />
          </aside>
        )}
      </main>

      {!isEnded && (
      <footer className="flex-none h-24 w-full flex items-center justify-between px-6 pb-4 z-10">
        <div className="flex-1 flex items-center">
           <span className="text-sm font-medium text-zinc-400">
             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
        
        <div className="flex-[2] flex justify-center">
          <MeetingControls
            isAudioMuted={isAudioMuted}
            isVideoOff={isVideoOff}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onShareScreen={() => console.log('Share')}
            onLeaveMeeting={handleLeave}
          />
        </div>

        <div className="flex-1 flex justify-end items-center gap-3">
          <button 
            onClick={() => toggleSidebar('insights')}
            className={`p-3 rounded-full transition-colors ${isSidebarOpen && activeTab === 'insights' ? 'bg-primary/20 text-primary' : 'hover:bg-zinc-800 text-zinc-300'}`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button 
            onClick={() => toggleSidebar('transcript')}
            className={`p-3 rounded-full transition-colors ${isSidebarOpen && activeTab === 'transcript' ? 'bg-primary/20 text-primary' : 'hover:bg-zinc-800 text-zinc-300'}`}
          >
            <FileText className="w-5 h-5" />
          </button>
          <button 
            onClick={() => toggleSidebar('chat')}
            className={`p-3 rounded-full transition-colors ${isSidebarOpen && activeTab === 'chat' ? 'bg-primary/20 text-primary' : 'hover:bg-zinc-800 text-zinc-300'}`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </footer>
      )}
    </div>
  );
}
