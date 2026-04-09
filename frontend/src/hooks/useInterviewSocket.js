import { useRef, useState, useCallback, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://hire-iq-backend-eight.vercel.app';
};
const API_BASE = getApiBase();
const WS_BASE  = API_BASE.replace(/^http/, 'ws');

export function useInterviewSocket({ sessionId, onTranscript, onInterviewEnded }) {
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [useRestFallback, setUseRestFallback] = useState(false);

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const intentionallyClosed = useRef(false);

  const onTranscriptRef = useRef(onTranscript);
  const onInterviewEndedRef = useRef(onInterviewEnded);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterviewEndedRef.current = onInterviewEnded; }, [onInterviewEnded]);

  const playNext = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      setInterviewerSpeaking(false);
      return;
    }
    isPlayingRef.current = true;
    setInterviewerSpeaking(true);

    const blob = audioQueueRef.current.shift();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };
    audio.play().catch(() => {
      currentAudioRef.current = null;
      playNext();
    });
  }, []);

  const enqueueAudio = useCallback((base64mp3) => {
    if (!base64mp3) return;
    try {
      const binaryStr = atob(base64mp3);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      audioQueueRef.current.push(blob);
      if (!isPlayingRef.current) playNext();
    } catch (err) {
      console.error('Audio error:', err);
    }
  }, [playNext]);

  const stopAllAudio = useCallback(() => {
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    isPlayingRef.current = false;
    setInterviewerSpeaking(false);
  }, []);

  /* ── WebSocket ── */
  const socketUrl = (sessionId && !useRestFallback) ? `${WS_BASE}/ws/interview/${sessionId}` : null;
  const { sendJsonMessage, readyState } = useWebSocket(socketUrl, {
    share: false,
    shouldReconnect: () => !intentionallyClosed.current && !useRestFallback,
    reconnectAttempts: 3,
    onMessage: (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'transcript') onTranscriptRef.current?.(msg.speaker, msg.text);
        else if (msg.type === 'audio') { setIsThinking(false); enqueueAudio(msg.data); }
        else if (msg.type === 'interviewer_done') setIsThinking(false);
        else if (msg.type === 'interview_ended') { setIsThinking(false); stopAllAudio(); onInterviewEndedRef.current?.(); }
      } catch (err) {}
    },
    onError: () => {
      console.warn("WebSocket error, falling back to REST...");
      setUseRestFallback(true);
    },
    onClose: () => { if (!intentionallyClosed.current) stopAllAudio(); }
  });

  const wsReady = readyState === ReadyState.OPEN;

  /* ── REST Handlers ── */
  const handleRestResponse = useCallback(async (text = null) => {
    setIsThinking(true);
    try {
      const res = await fetch(`${API_BASE}/api/interview/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, text })
      });
      const data = await res.json();
      if (data.text) {
        onTranscriptRef.current?.(data.speaker, data.text);
        enqueueAudio(data.audio);
      }
    } catch (err) {
      console.error("REST Interview Error:", err);
    } finally {
      setIsThinking(false);
    }
  }, [sessionId, enqueueAudio]);

  /* Start interview if using REST */
  useEffect(() => {
    if (useRestFallback && sessionId) {
      handleRestResponse();
    }
  }, [useRestFallback, sessionId]); // eslint-disable-line

  const sendCandidateMessage = useCallback((text) => {
    if (wsReady) {
      sendJsonMessage({ type: 'candidate_message', text });
      setIsThinking(true);
    } else {
      handleRestResponse(text);
    }
  }, [wsReady, sendJsonMessage, handleRestResponse]);

  const endInterview = useCallback(async () => {
    intentionallyClosed.current = true;
    stopAllAudio();
    if (wsReady) {
      sendJsonMessage({ type: 'end_interview' });
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/interview/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });
        const data = await res.json();
        if (data.text) {
          onTranscriptRef.current?.('interviewer', data.text);
          enqueueAudio(data.audio);
        }
      } catch (err) {}
      onInterviewEndedRef.current?.();
    }
  }, [wsReady, sendJsonMessage, sessionId, enqueueAudio]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  return { 
    wsReady: wsReady || useRestFallback, 
    interviewerSpeaking, 
    isThinking, 
    sendCandidateMessage, 
    endInterview 
  };
}

