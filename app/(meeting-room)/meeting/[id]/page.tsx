'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/use-webrtc';
import { VideoGrid } from '@/components/meeting/video-grid';
import { MeetingControls } from '@/components/meeting/meeting-controls';
import { MeetingSidebar } from '@/components/meeting/meeting-sidebar';
import { Sparkles, FileText, MessageSquare } from 'lucide-react';

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [hasJoined, setHasJoined] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'transcript' | 'chat'>('insights');

  const {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoOff,
    startLocalStream,
    toggleAudio,
    toggleVideo,
  } = useWebRTC({ roomId: meetingId || '' });

  useEffect(() => {
    if (hasJoined) {
      startLocalStream();
    }
  }, [hasJoined, startLocalStream]);

  const toggleSidebar = (tab: 'insights' | 'transcript' | 'chat') => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setIsSidebarOpen(true);
    }
  };

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-card p-10 rounded-xl shadow-lg border border-border text-center transition-all duration-300 transform">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">Join Workspace</h1>
          <p className="text-muted-foreground font-medium mb-10 opacity-80">Room: <span className="font-mono bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">{meetingId || 'Local-Dev-01'}</span></p>
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

  // Google Meet / Zoom style full screen
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* Top Header */}
      <header className="flex-none pt-6 px-6 pb-2 flex justify-between items-center w-full z-10 transition-all">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold tracking-wide">
            {meetingId || 'Local-Dev-01'}
          </h2>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex min-h-0 relative px-6 pb-2 pt-2 transition-all">
        {/* Video Grid */}
        <div className={`flex-1 transition-all duration-300 h-full ${isSidebarOpen ? 'pr-4' : ''}`}>
           <VideoGrid localStream={localStream} remoteStreams={remoteStreams} />
        </div>

        {/* Right Sidebar (Conditional) */}
        {isSidebarOpen && (
          <aside className="w-80 h-full flex-none bg-zinc-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 border border-zinc-800">
            <MeetingSidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
          </aside>
        )}
      </main>

      {/* Bottom Controls Bar */}
      <footer className="flex-none h-24 w-full flex items-center justify-between px-6 pb-4 z-10">
        <div className="flex-1 flex items-center">
           <span className="text-sm font-medium text-zinc-400">
             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
        
        {/* Center Controls */}
        <div className="flex-[2] flex justify-center">
          <MeetingControls
            isAudioMuted={isAudioMuted}
            isVideoOff={isVideoOff}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onShareScreen={() => console.log('Share')}
            onLeaveMeeting={() => router.push('/dashboard')}
          />
        </div>

        {/* Right Controls */}
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
    </div>
  );
}
