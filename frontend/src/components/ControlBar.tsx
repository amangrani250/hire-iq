import React from 'react';
import { Mic, MicOff, MessageSquare, PhoneOff, Video, VideoOff } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * ControlBar — bottom bar with mic, cam, transcript, and end-call controls.
 */
export default function ControlBar({
  micOn,
  toggleMic,
  camOn,
  toggleCam,
  transcriptOpen,
  toggleTranscript,
  onEndCall,
  recording,
  wsReady,
}) {
  return (
    <div className="ctrl-bar">
      <div className="ctrl-status">
        <span
          className="ctrl-dot"
          style={{
            background: wsReady ? 'var(--color-success)' : 'var(--color-warning)',
          }}
        />
        <span className="ctrl-status-text">{wsReady ? 'Live' : 'Connecting'}</span>
      </div>

      <div className="ctrl-group">
        <CtrlBtn
          icon={micOn ? <Mic size={19} /> : <MicOff size={19} />}
          label={micOn ? 'Mute' : 'Unmute'}
          tone={!micOn ? 'danger' : null}
          onClick={toggleMic}
          badge={recording ? <RecordingDot /> : null}
        />
        <CtrlBtn
          icon={camOn ? <Video size={19} /> : <VideoOff size={19} />}
          label={camOn ? 'Stop video' : 'Start video'}
          tone={!camOn ? 'danger' : null}
          onClick={toggleCam}
        />
        <CtrlBtn
          icon={<MessageSquare size={19} />}
          label="Transcript"
          tone={transcriptOpen ? 'primary' : null}
          onClick={toggleTranscript}
        />
      </div>

      <button type="button" className="ctrl-end-btn" onClick={onEndCall} aria-label="End interview">
        <PhoneOff size={18} />
        <span className="ctrl-end-label">End interview</span>
      </button>
    </div>
  );
}

function CtrlBtn({ icon, label, tone, onClick, badge }) {
  return (
    <button
      type="button"
      className={cn(
        'ctrl-btn',
        tone === 'primary' && 'ctrl-btn--active-primary',
        tone === 'danger' && 'ctrl-btn--active-danger'
      )}
      onClick={onClick}
      title={label}
      aria-pressed={tone ? true : undefined}
    >
      <span className="relative">
        {icon}
        {badge}
      </span>
      <span className="ctrl-btn-label">{label}</span>
    </button>
  );
}

function RecordingDot() {
  return <span className="ctrl-rec-dot" />;
}
