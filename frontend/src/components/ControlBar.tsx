import { memo } from 'react';
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff } from 'lucide-react';

interface ControlBarProps {
  micOn: boolean;
  toggleMic: () => void;
  camOn: boolean;
  toggleCam: () => void;
  transcriptOpen: boolean;
  toggleTranscript: () => void;
  onEndCall: () => void;
  recording: boolean;
  wsReady: boolean;
}

function CtrlBtn({
  icon, label, active, activeColor, onClick, badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
  badge?: React.ReactNode;
}) {
  const style = {
    background: active ? `${activeColor}22` : 'var(--bg-elevated)',
    border: `1px solid ${active ? activeColor + '55' : 'var(--border)'}`,
    color: active ? activeColor : 'var(--text-1)',
  };

  return (
    <button className="ctrl-btn" style={style} onClick={onClick} title={label}>
      <div style={{ position: 'relative' }}>
        {icon}
        {badge}
      </div>
      <span className="ctrl-btn-label">{label}</span>
    </button>
  );
}

function RecordingDot() {
  return <div className="ctrl-rec-dot" />;
}

const ControlBar = memo(function ControlBar({
  micOn, toggleMic, camOn, toggleCam,
  transcriptOpen, toggleTranscript, onEndCall,
  recording, wsReady,
}: ControlBarProps) {
  return (
    <div className="ctrl-bar">
      <div className="ctrl-status">
        <div
          className="ctrl-dot"
          style={{
            background: wsReady ? 'var(--green)' : 'var(--amber)',
            boxShadow: wsReady ? '0 0 8px var(--green)' : '0 0 8px var(--amber)',
          }}
        />
        <span className="ctrl-status-text">
          {wsReady ? 'Live' : 'Connecting\u2026'}
        </span>
      </div>

      <div className="ctrl-group">
        <CtrlBtn
          icon={micOn ? <Mic size={20} /> : <MicOff size={20} />}
          label={micOn ? 'Mute' : 'Unmute'}
          active={!micOn}
          activeColor="var(--red)"
          onClick={toggleMic}
          badge={recording ? <RecordingDot /> : null}
        />
        <CtrlBtn
          icon={camOn ? <Video size={20} /> : <VideoOff size={20} />}
          label={camOn ? 'Stop Video' : 'Start Video'}
          active={!camOn}
          activeColor="var(--red)"
          onClick={toggleCam}
        />
        <CtrlBtn
          icon={<MessageSquare size={20} />}
          label="Transcript"
          active={transcriptOpen}
          activeColor="var(--accent)"
          onClick={toggleTranscript}
        />
      </div>

      <button className="ctrl-end-btn" onClick={onEndCall} aria-label="End Interview">
        <PhoneOff size={20} />
        <span className="ctrl-end-label">End Interview</span>
      </button>
    </div>
  );
});

export default ControlBar;
