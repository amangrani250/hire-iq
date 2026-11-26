import { useState, type ReactNode } from 'react';
import { Image as ImageIcon, Mic, MicOff, MessageSquare, PhoneOff, Video, VideoOff } from 'lucide-react';
import { cn } from '../lib/cn';
import BackgroundPicker from './BackgroundPicker';
import type { VirtualBackgroundId } from '../types';

export interface ControlBarProps {
  micOn: boolean;
  toggleMic: () => void;
  camOn: boolean;
  toggleCam: () => void;
  transcriptOpen: boolean;
  toggleTranscript: () => void;
  onEndCall: () => void;
  recording: boolean;
  wsReady: boolean;
  background: VirtualBackgroundId;
  onBackgroundChange: (value: VirtualBackgroundId) => void;
  effectsReady: boolean;
  effectsError: boolean;
}

interface CtrlBtnProps {
  icon: ReactNode;
  label: string;
  tone?: 'primary' | 'danger' | null;
  onClick: () => void;
  badge?: ReactNode;
}

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
  background,
  onBackgroundChange,
  effectsReady,
  effectsError,
}: ControlBarProps) {
  const [backgroundOpen, setBackgroundOpen] = useState(false);

  return (
    <div className="ctrl-bar">
      <div className="ctrl-status">
        <span
          className="ctrl-dot"
          style={{ background: wsReady ? 'var(--color-success)' : 'var(--color-warning)' }}
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
        <div className="relative">
          <CtrlBtn
            icon={<ImageIcon size={19} />}
            label="Background"
            tone={background !== 'none' ? 'primary' : null}
            onClick={() => setBackgroundOpen((open) => !open)}
          />
          <BackgroundPicker
            open={backgroundOpen}
            value={background}
            effectsReady={effectsReady}
            effectsError={effectsError}
            onChange={onBackgroundChange}
            onClose={() => setBackgroundOpen(false)}
          />
        </div>
      </div>

      <button type="button" className="ctrl-end-btn" onClick={onEndCall} aria-label="End interview">
        <PhoneOff size={18} />
        <span className="ctrl-end-label">End interview</span>
      </button>
    </div>
  );
}

function CtrlBtn({ icon, label, tone, onClick, badge }: CtrlBtnProps) {
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
      aria-label={label}
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
