'use client';

import React from 'react';
import { X, Loader2 } from 'lucide-react';

interface MeetingSidebarProps {
  activeTab: 'insights' | 'transcript' | 'chat';
  setActiveTab: (tab: 'insights' | 'transcript' | 'chat') => void;
  onClose: () => void;
}

export const MeetingSidebar: React.FC<MeetingSidebarProps> = ({ activeTab, onClose }) => {
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
          <div className="space-y-4">
            <h4 className="font-medium text-white mb-2">Live Action Items</h4>
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="font-medium text-primary">AI is listening...</span>
              </div>
              <p className="opacity-90 leading-relaxed text-primary-foreground/80 text-xs">
                Sensing the conversation for actionable insights, follow-ups, and core decisions.
              </p>
            </div>
          </div>
        )}
        {activeTab === 'transcript' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white mb-2">Real-time Transcript</h4>
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50">
              <p className="italic text-zinc-500">Waiting for speech...</p>
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
