import React from 'react';
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff } from 'lucide-react';

/**
 * ControlBar — bottom bar with mic, cam, transcript, and end-call controls.
 * On mobile the "End Interview" label is hidden (icon-only) to save space.
 *
 * @param {{
 *   micOn: boolean, toggleMic: () => void,
 *   camOn: boolean, toggleCam: () => void,
 *   transcriptOpen: boolean, toggleTranscript: () => void,
 *   onEndCall: () => void,
 *   recording: boolean,
 *   candidateSpeaking: boolean,
 *   wsReady: boolean,
 * }} props
 */
export default function ControlBar({
  micOn, toggleMic,
  camOn, toggleCam,
  transcriptOpen, toggleTranscript,
  onEndCall,
  recording,
  wsReady,
}) {
  return (
    <div className="ctrl-bar">
      {/* Status pill */}
      <div className="ctrl-status">
        <div
          className="ctrl-dot"
          style={{
            background: wsReady ? 'var(--green)' : 'var(--amber)',
            boxShadow: wsReady ? '0 0 8px var(--green)' : '0 0 8px var(--amber)',
          }}
        />
        <span className="ctrl-status-text">
          {wsReady ? 'Live' : 'Connecting…'}
        </span>
      </div>

      {/* Controls group */}
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

      {/* End call */}
      <button className="ctrl-end-btn" onClick={onEndCall} aria-label="End Interview">
        <PhoneOff size={20} />
        <span className="ctrl-end-label">End Interview</span>
      </button>
    </div>
  );
}

/** Individual control button. */
function CtrlBtn({ icon, label, active, activeColor, onClick, badge }) {
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

/** Pulsing red dot shown on the mic button when recording. */
function RecordingDot() {
  return <div className="ctrl-rec-dot" />;
}
