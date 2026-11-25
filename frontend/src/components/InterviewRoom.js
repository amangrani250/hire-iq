import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import VideoTile from './VideoTile';
import TranscriptPanel from './TranscriptPanel';
import ControlBar from './ControlBar';
import { useInterviewSocket } from '../hooks/useInterviewSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { LogoMark } from './layout/Logo';
import Spinner from './ui/Spinner';
import usePageTitle from '../hooks/usePageTitle';

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://hire-iq-backend-eight.vercel.app';
};
const API_BASE = getApiBase();

/**
 * InterviewRoom — video tiles, live transcript, and call controls.
 * Reads sessionId and candidate from route state.
 */
export default function InterviewRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, candidate } = location.state || {};

  if (!sessionId) return <Navigate to="/" replace />;

  return <InterviewRoomInner sessionId={sessionId} candidate={candidate} navigate={navigate} />;
}

function InterviewRoomInner({ sessionId, candidate, navigate }) {
  usePageTitle('Interview room');
  const [messages, setMessages] = useState([]);
  const messagesRef = React.useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const onInterviewEnd = useCallback(() => {
    navigate('/end', {
      state: { candidateName: candidate?.name, transcript: messagesRef.current },
    });
  }, [navigate, candidate]);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);

  const onTranscript = useCallback((speaker, text) => {
    setMessages((prev) => [...prev, { speaker, text, ts: Date.now() }]);
    setTypingIndicator(false);
  }, []);

  const { wsReady, interviewerSpeaking, isThinking, sendCandidateMessage, endInterview } =
    useInterviewSocket({ sessionId, onTranscript, onInterviewEnded: onInterviewEnd });

  useEffect(() => {
    if (interviewerSpeaking) setTypingIndicator(false);
  }, [interviewerSpeaking]);

  const handleAudioResult = useCallback(
    async (blob) => {
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
    },
    [micOn, sendCandidateMessage]
  );

  const { recording, startRecording, stopRecording, release } = useAudioRecorder({
    onResult: handleAudioResult,
    silenceMs: 1200,
  });

  useEffect(() => {
    if (!interviewerSpeaking && !isThinking && wsReady && micOn && !recording && !isTranscribing) {
      const timer = setTimeout(() => startRecording(), 150);
      return () => clearTimeout(timer);
    }
    if ((interviewerSpeaking || isThinking) && recording) {
      stopRecording();
    }
    return undefined;
  }, [interviewerSpeaking, isThinking, wsReady, micOn, recording, isTranscribing]); // eslint-disable-line

  useEffect(() => {
    setCandidateSpeaking(recording);
  }, [recording]);

  const handleEndCall = () => {
    stopRecording();
    try { release(); } catch (e) {}
    try { stopAllMediaTracks(); } catch (e) {}
    endInterview();
    onInterviewEnd();
  };

  const handleToggleMic = () => {
    setMicOn((value) => !value);
    if (recording) stopRecording();
  };

  const handleToggleCam = () => {
    setCamOn((value) => {
      const next = !value;
      if (!next) {
        try { stopAllMediaTracks(); } catch (e) {}
      }
      return next;
    });
  };

  useEffect(() => {
    const handleUnload = () => {
      try { stopRecording(); } catch (e) {}
      try { release(); } catch (e) {}
      try { stopAllMediaTracks(); } catch (e) {}
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      try { stopRecording(); } catch (e) {}
      try { release(); } catch (e) {}
      try { stopAllMediaTracks(); } catch (e) {}
    };
  }, []); // eslint-disable-line

  const stopAllMediaTracks = () => {
    try {
      document.querySelectorAll('video').forEach((video) => {
        const stream = video.srcObject;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => {
            try { track.stop(); } catch (e) {}
          });
        }
        try { video.srcObject = null; } catch (e) {}
      });
    } catch (e) {
      /* ignore */
    }
  };

  const candidateName = candidate?.name || 'You';
  const interviewerName = 'Aira';

  return (
    <div className="room-root">
      <header className="room-header">
        <div className="flex items-center gap-3">
          <div className="room-logo-row">
            <LogoMark className="h-6 w-6 rounded-[7px]" />
            <span className="room-logo-name">HireIQ</span>
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground sm:inline">
            Interview room
          </span>
        </div>

        <div className="room-header-center">
          <span className="room-label">Technical interview</span>
          {candidate?.role && <span className="room-role-chip">{candidate.role}</span>}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: wsReady ? 'var(--color-success)' : 'var(--color-warning)' }}
            />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
              {wsReady ? 'Connected' : 'Connecting'}
            </span>
          </span>
          <div className="room-timer">
            <LiveTimer />
          </div>
        </div>
      </header>

      <div className="room-main">
        <div className="room-video-area">
          <VideoTile
            role="interviewer"
            name={interviewerName}
            speaking={interviewerSpeaking}
            large
            avatarChar="A"
            accentColor="hsl(var(--primary))"
          />

          <div className="room-small-tiles">
            <VideoTile
              role="candidate"
              name={candidateName}
              camOn={camOn}
              speaking={candidateSpeaking}
              muted={!micOn}
              avatarChar={candidateName[0]}
              accentColor="hsl(var(--success))"
            />
          </div>

          <div className="room-status-overlay">
            {isTranscribing && (
              <div className="room-status-pill">
                <Spinner size={12} label="Transcribing" />
                Transcribing…
              </div>
            )}
            {typingIndicator && <TypingDots />}
            {recording && micOn && (
              <div className="room-status-pill room-status-pill--recording">
                <span className="room-rec-dot" />
                Listening…
              </div>
            )}
          </div>
        </div>

        <TranscriptPanel messages={messages} visible={transcriptOpen} />
      </div>

      <ControlBar
        micOn={micOn}
        toggleMic={handleToggleMic}
        camOn={camOn}
        toggleCam={handleToggleCam}
        transcriptOpen={transcriptOpen}
        toggleTranscript={() => setTranscriptOpen((value) => !value)}
        onEndCall={handleEndCall}
        recording={recording}
        candidateSpeaking={candidateSpeaking}
        wsReady={wsReady}
      />
    </div>
  );
}

function LiveTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return <span>{minutes}:{secs}</span>;
}

function TypingDots() {
  return (
    <div className="typing-dots">
      <span className="typing-dots__label">Aira is thinking</span>
      <span className="typing-dots__group" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="typing-dots__dot"
            style={{ animationDelay: `${index * 0.2}s` }}
          />
        ))}
      </span>
    </div>
  );
}
