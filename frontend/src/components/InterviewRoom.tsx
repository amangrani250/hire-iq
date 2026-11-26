import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import VideoTile from './VideoTile';
import TranscriptPanel from './TranscriptPanel';
import ControlBar from './ControlBar';
import { useInterviewSocket } from '../hooks/useInterviewSocket';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useInterval } from '../hooks/useInterval';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { stopAllMediaTracks } from '../utils';
import { InterviewProvider, useInterviewContext } from '../contexts/InterviewContext';
import { LogoMark } from './layout/Logo';
import toast from 'react-hot-toast';
import type { CandidateInfo, Message } from '../types';

interface LocationState {
  sessionId: string;
  candidate: CandidateInfo;
}

function LiveTimer() {
  const [secs, setSecs] = useState(0);
  useInterval(() => setSecs((s) => s + 1), 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <span>{mm}:{ss}</span>;
}

function TypingDots({ label = 'Aira is typing' }: { label?: string }) {
  return (
    <div className="typing-dots">
      <span className="typing-dots__label">{label}</span>
      <div className="typing-dots__group">
        {[0, 1, 2].map((i) => (
          <div key={i} className="typing-dots__dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

export default function InterviewRoom() {
  useDocumentMeta('Interview Session', 'Live AI-powered interview session');
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, candidate } = (location.state as LocationState) || {};

  if (!sessionId) {
    return <Navigate to="/" replace />;
  }

  return (
    <InterviewProvider>
      <InterviewRoomInner sessionId={sessionId} candidate={candidate} navigate={navigate} />
    </InterviewProvider>
  );
}

function InterviewRoomInner({
  sessionId, candidate, navigate,
}: {
  sessionId: string;
  candidate: CandidateInfo;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { messages, addMessage, requestRepeat, requestNext, canRequestRepeat, canRequestNext, reset } = useInterviewContext();
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const onInterviewEnd = useCallback(() => {
    navigate('/end', {
      state: { candidateName: candidate?.name, transcript: messagesRef.current, sessionId },
    });
  }, [navigate, candidate, sessionId]);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);

  const interviewerSpeakingRef = useRef(false);

  const onTranscript = useCallback((speaker: string, text: string, meta?: Message['meta']) => {
    addMessage({ speaker: speaker as 'interviewer' | 'candidate', text, ts: Date.now(), meta });
    setTypingIndicator(false);

    if (meta?.verdict) {
      const score = typeof meta.score === 'number' ? ` · ${meta.score}/10` : '';
      if (meta.verdict === 'correct') {
        toast.success(`Correct answer${score}`, { id: 'answer-eval', duration: 2200 });
      } else if (meta.verdict === 'partially_correct') {
        toast(`Partly correct${score}`, { id: 'answer-eval', icon: '⚠️', duration: 2600 });
      } else {
        toast.error(`Needs correction${score}`, { id: 'answer-eval', duration: 2800 });
      }
    }
  }, [addMessage]);

  const { wsReady, interviewerSpeaking, isThinking, questionProgress, sendCandidateMessage, endInterview } =
    useInterviewSocket({ sessionId, onTranscript, onInterviewEnded: onInterviewEnd });

  useEffect(() => {
    interviewerSpeakingRef.current = interviewerSpeaking;
    if (interviewerSpeaking) setTypingIndicator(false);
  }, [interviewerSpeaking]);

  const { isListening, isSpeaking, interimTranscript, start, stop, abort: abortSTT, release } =
    useSpeechToText((text) => {
      if (interviewerSpeakingRef.current) return;
      addMessage({ speaker: 'candidate', text, ts: Date.now() });
      setTypingIndicator(true);
      sendCandidateMessage(text);
    }, interviewerSpeakingRef);

  useEffect(() => {
    setCandidateSpeaking(isSpeaking || !!interimTranscript);
  }, [isSpeaking, interimTranscript]);

  useEffect(() => {
    if ((interviewerSpeaking || isThinking) && isListening) {
      abortSTT();
    }
  }, [interviewerSpeaking, isThinking, isListening]);

  useEffect(() => {
    if (!interviewerSpeaking && !isThinking && wsReady && micOn && !isListening) {
      const t = setTimeout(() => start(), 600);
      return () => clearTimeout(t);
    }
  }, [interviewerSpeaking, isThinking, wsReady, micOn, isListening]);

  const handleRepeat = useCallback(() => {
    const text = requestRepeat();
    if (!text) {
      toast.error('Repeat limit reached for this question');
      return;
    }
    addMessage({ speaker: 'candidate', text, ts: Date.now() });
    sendCandidateMessage(text);
  }, [requestRepeat, addMessage, sendCandidateMessage]);

  const handleNext = useCallback(() => {
    const text = requestNext();
    if (!text) {
      toast('Answer the current question first');
      return;
    }
    addMessage({ speaker: 'candidate', text, ts: Date.now() });
    sendCandidateMessage(text);
  }, [requestNext, addMessage, sendCandidateMessage]);

  const handleSendText = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    addMessage({ speaker: 'candidate', text: clean, ts: Date.now() });
    setTypingIndicator(true);
    sendCandidateMessage(clean);
  }, [addMessage, sendCandidateMessage]);

  const handleEndCall = () => {
    abortSTT();
    try { release(); } catch { /* ignore */ }
    try { stopAllMediaTracks(); } catch { /* ignore */ }
    endInterview();
    onInterviewEnd();
  };

  const handleToggleMic = () => {
    setMicOn((v) => !v);
    if (isListening) abortSTT();
  };

  const handleToggleCam = () => {
    setCamOn((v) => {
      const next = !v;
      if (!next) {
        try { stopAllMediaTracks(); } catch { /* ignore */ }
      }
      return next;
    });
  };

  useEffect(() => {
    reset();
    return () => {
      try { abortSTT(); } catch { /* ignore */ }
      try { release(); } catch { /* ignore */ }
      try { stopAllMediaTracks(); } catch { /* ignore */ }
    };
  }, []);

  const handleToggleTranscript = () => setTranscriptOpen((v) => !v);

  const candidateName = candidate?.name || 'You';
  const interviewerName = 'Aira';

  return (
    <div className="room-root">
      <header className="room-header">
        <div className="room-logo-row">
          <LogoMark className="h-6 w-6 rounded-[7px]" />
          <span className="room-logo-name">HireIQ</span>
        </div>
        <div className="room-header-center">
          <span className="room-label">Technical Interview</span>
          {candidate?.role && <span className="room-role-chip">{candidate.role}</span>}
          {questionProgress && (
            <span className="room-progress-chip">
              Question {questionProgress.current} / {questionProgress.total}
            </span>
          )}
        </div>
        <div className="room-timer"><LiveTimer /></div>
      </header>

      <div className="room-main">
        <div className="room-video-area">
          <VideoTile role="interviewer" name={interviewerName} speaking={interviewerSpeaking} large avatarChar="A" accentColor="hsl(var(--primary))" />
          <div className="room-small-tiles">
            <VideoTile role="candidate" name={candidateName} camOn={camOn} speaking={candidateSpeaking} muted={!micOn}
              avatarChar={candidateName[0]} accentColor="hsl(var(--success))" />
          </div>

          <div className="room-status-overlay">
            {(typingIndicator || isThinking || (wsReady && messages.length === 0)) && (
              <TypingDots label={messages.length === 0 ? 'Aira is preparing your interview' : 'Aira is typing'} />
            )}
            {isListening && micOn && (
              <div className="room-status-pill" style={{ background: interimTranscript ? 'rgba(247,80,80,0.7)' : 'rgba(247,80,80,0.85)' }}>
                <div className="room-rec-dot" />{interimTranscript || 'Listening...'}
              </div>
            )}
          </div>
        </div>

        <TranscriptPanel
          messages={messages}
          visible={transcriptOpen}
          interimText={interimTranscript}
          canRequestRepeat={canRequestRepeat}
          canRequestNext={canRequestNext}
          onRepeat={handleRepeat}
          onNext={handleNext}
          onSendText={handleSendText}
        />
      </div>

      <ControlBar
        micOn={micOn} toggleMic={handleToggleMic}
        camOn={camOn} toggleCam={handleToggleCam}
        transcriptOpen={transcriptOpen} toggleTranscript={handleToggleTranscript}
        onEndCall={handleEndCall}
        recording={isListening} wsReady={wsReady}
      />
    </div>
  );
}
