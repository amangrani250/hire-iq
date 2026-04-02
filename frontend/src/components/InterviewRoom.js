import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import VideoTile from './VideoTile';
import TranscriptPanel from './TranscriptPanel';
import ControlBar from './ControlBar';
import { useInterviewSocket } from '../hooks/useInterviewSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Loader } from 'lucide-react';

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : window.location.origin;
};
const API_BASE = getApiBase();

/**
 * InterviewRoom — main interview screen with video tiles, transcript, and controls.
 * Reads sessionId and candidate from route state.
 */
export default function InterviewRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, candidate } = location.state || {};

  // Guard: redirect to upload if no session data
  if (!sessionId) {
    return <Navigate to="/" replace />;
  }

  return <InterviewRoomInner sessionId={sessionId} candidate={candidate} navigate={navigate} />;
}

/**
 * Inner component that holds all hooks (avoids conditional hook calls).
 */
function InterviewRoomInner({ sessionId, candidate, navigate }) {
  const [messages, setMessages]             = useState([]);
  const messagesRef = React.useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const onInterviewEnd = useCallback(() => {
    navigate('/end', { state: { candidateName: candidate?.name, transcript: messagesRef.current } });
  }, [navigate, candidate]);
  const [micOn, setMicOn]                   = useState(true);
  const [camOn, setCamOn]                   = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);

  /* ── Transcript handler ─────────────────────────────────────────────── */
  const onTranscript = useCallback((speaker, text) => {
    setMessages((prev) => [...prev, { speaker, text, ts: Date.now() }]);
    setTypingIndicator(false);
  }, []);

  /* ── WebSocket for interview ────────────────────────────────────────── */
  const { wsReady, interviewerSpeaking, isThinking, sendCandidateMessage, endInterview } =
    useInterviewSocket({ sessionId, onTranscript, onInterviewEnded: onInterviewEnd });

  useEffect(() => {
    if (interviewerSpeaking) setTypingIndicator(false);
  }, [interviewerSpeaking]);

  /* ── Audio recorder — fires when user finishes speaking ─────────────── */
  const handleAudioResult = useCallback(async (blob) => {
    if (!micOn) return;
    setCandidateSpeaking(false);
    setIsTranscribing(true);
    try {
      const form = new FormData();
      form.append('file', blob, 'audio.webm');
      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      const text = data.transcript?.trim();
      if (text) {
        setTypingIndicator(true);
        sendCandidateMessage(text);
      }
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [micOn, sendCandidateMessage]);

  const { recording, startRecording, stopRecording } =
    useAudioRecorder({ onResult: handleAudioResult, silenceMs: 1200 });

  /* Auto-start recording when interviewer finishes speaking */
  useEffect(() => {
    if (!interviewerSpeaking && !isThinking && wsReady && micOn && !recording && !isTranscribing) {
      const t = setTimeout(() => startRecording(), 150);
      return () => clearTimeout(t);
    }
    if ((interviewerSpeaking || isThinking) && recording) {
      stopRecording();
    }
  }, [interviewerSpeaking, isThinking, wsReady, micOn, recording, isTranscribing]); // eslint-disable-line

  useEffect(() => {
    setCandidateSpeaking(recording);
  }, [recording]);

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleEndCall = () => {
    stopRecording();
    endInterview();
    onInterviewEnd();
  };

  const handleToggleMic = () => {
    setMicOn((v) => !v);
    if (recording) stopRecording();
  };

  const handleToggleCam = () => setCamOn((v) => !v);
  const handleToggleTranscript = () => setTranscriptOpen((v) => !v);

  const candidateName = candidate?.name || 'You';
  const interviewerName = 'Alex';

  return (
    <div className="room-root">
      {/* ── Header ── */}
      <header className="room-header">
        <div className="room-logo-row">
          <div className="room-logo-dot" />
          <span className="room-logo-name">HireIQ</span>
        </div>
        <div className="room-header-center">
          <span className="room-label">Technical Interview</span>
          {candidate?.role && (
            <span className="room-role-chip">{candidate.role}</span>
          )}
        </div>
        <div className="room-timer">
          <LiveTimer />
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="room-main">
        {/* Video area */}
        <div className="room-video-area">
          {/* Interviewer — large tile */}
          <VideoTile
            role="interviewer"
            name={interviewerName}
            speaking={interviewerSpeaking}
            large
            avatarChar="A"
            accentColor="#4f8ef7"
          />

          {/* Candidate — small overlay tile */}
          <div className="room-small-tiles">
            <VideoTile
              role="candidate"
              name={candidateName}
              camOn={camOn}
              speaking={candidateSpeaking}
              muted={!micOn}
              avatarChar={candidateName[0]}
              accentColor="#30d986"
            />
          </div>

          {/* Status overlay */}
          <div className="room-status-overlay">
            {isTranscribing && (
              <div className="room-status-pill">
                <Loader size={13} className="spin" />
                Transcribing…
              </div>
            )}
            {typingIndicator && <TypingDots />}
            {recording && micOn && (
              <div className="room-status-pill" style={{ background: 'rgba(247,80,80,0.85)' }}>
                <div className="room-rec-dot" />
                Listening…
              </div>
            )}
          </div>
        </div>

        {/* Transcript panel */}
        <TranscriptPanel messages={messages} visible={transcriptOpen} />
      </div>

      {/* ── Controls ── */}
      <ControlBar
        micOn={micOn}
        toggleMic={handleToggleMic}
        camOn={camOn}
        toggleCam={handleToggleCam}
        transcriptOpen={transcriptOpen}
        toggleTranscript={handleToggleTranscript}
        onEndCall={handleEndCall}
        recording={recording}
        candidateSpeaking={candidateSpeaking}
        wsReady={wsReady}
      />
    </div>
  );
}

/* ── Live timer (counts up from 00:00) ────────────────────────────────────── */
function LiveTimer() {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return <span>{mm}:{ss}</span>;
}

/* ── Typing indicator ("Alex is typing…") ─────────────────────────────────── */
function TypingDots() {
  return (
    <div className="typing-dots">
      <span className="typing-dots__label">Alex is typing</span>
      <div className="typing-dots__group">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="typing-dots__dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
