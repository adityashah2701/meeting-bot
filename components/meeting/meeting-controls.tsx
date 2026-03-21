'use client';

import React from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MoreVertical } from 'lucide-react';

interface MeetingControlsProps {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onShareScreen: () => void;
  onLeaveMeeting: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isAudioMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,
  onShareScreen,
  onLeaveMeeting,
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggleAudio}
        className={`flex items-center justify-center rounded-full h-12 w-12 transition-all shadow-md ${
          isAudioMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
        }`}
      >
        {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      
      <button
        onClick={onToggleVideo}
        className={`flex items-center justify-center rounded-full h-12 w-12 transition-all shadow-md ${
          isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
        }`}
      >
        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </button>

      <button
        onClick={onShareScreen}
        className="flex items-center justify-center rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all shadow-md"
      >
        <MonitorUp className="h-5 w-5" />
      </button>

      <button
        className="flex items-center justify-center rounded-full h-12 w-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all shadow-md"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      <button
        onClick={onLeaveMeeting}
        className="flex items-center justify-center rounded-full h-12 px-6 bg-red-500 text-white hover:bg-red-600 transition-all font-medium ml-2 shadow-md hover:-translate-y-0.5"
      >
        <PhoneOff className="h-5 w-5 mr-2" />
        End
      </button>
    </div>
  );
};
