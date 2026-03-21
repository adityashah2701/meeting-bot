'use client';

import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { TranscriptLine } from '@/hooks/use-transcription';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface MeetingSidebarProps {
  meetingId: Id<"meetings">;
  activeTab: 'insights' | 'transcript' | 'chat';
  setActiveTab: (tab: 'insights' | 'transcript' | 'chat') => void;
  onClose: () => void;
  transcript?: TranscriptLine[];
  enableSummarization?: boolean;
}

export const MeetingSidebar: React.FC<MeetingSidebarProps> = ({ meetingId, activeTab, onClose, transcript = [], enableSummarization = true }) => {
  const [localSummary, setLocalSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSummary = useMutation(api.meetings.saveSummary);
  const dbSummary = useQuery(api.meetings.getSummary, { meetingId });
  const displaySummary = dbSummary?.content || localSummary;

  const generateSummary = async () => {
    if (transcript.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to summarize');
      
      setLocalSummary(data.summary);
      await saveSummary({ meetingId, summary: data.summary }).catch(console.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="font-semibold text-sm tracking-wide capitalize">{activeTab}</h3>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 text-sm text-zinc-300">
        {activeTab === 'insights' && (
          <div className="space-y-4 flex flex-col h-full">
            <h4 className="font-medium text-white mb-2">AI Summary & Insights</h4>
            {!enableSummarization && (
              <p className="text-zinc-500 italic text-center mt-4">AI Summarization is disabled.</p>
            )}
            {enableSummarization && (
              <div className="flex flex-col gap-4 flex-1 pb-4">
                {transcript.length === 0 ? (
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex flex-col gap-3">
                    <p className="opacity-90 leading-relaxed text-primary-foreground/60 text-xs">
                      Start speaking to accumulate a transcript.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={generateSummary}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGenerating ? 'Analyzing...' : 'Generate AI Summary'}
                  </button>
                )}
                
                {error && <p className="text-red-400 text-xs text-center shrink-0">{error}</p>}

                {displaySummary && (
                  <div className="p-4 text-xs rounded-xl border border-zinc-800 bg-zinc-950/50 flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">
                      {displaySummary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'transcript' && (
          <div className="space-y-4 flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
            <h4 className="font-medium text-white mb-2 shrink-0">Real-time Transcript</h4>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-4">
              {transcript.length === 0 ? (
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50">
                  <p className="italic text-zinc-500 text-center text-xs">Waiting for speech...</p>
                </div>
              ) : (
                transcript.map((line) => (
                  <div key={line.id} className={`flex flex-col ${line.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-zinc-500 mb-1 px-1">{line.sender}</span>
                    <div className={`px-3 py-2 rounded-2xl max-w-[85%] ${line.sender === 'You' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'} ${line.isInterim ? 'opacity-70 italic' : ''}`}>
                      <p className="text-xs leading-relaxed">{line.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="space-y-4 flex flex-col items-center justify-center h-full opacity-50">
            <p className="text-center text-zinc-500">No messages have been sent yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
