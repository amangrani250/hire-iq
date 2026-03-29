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

/**
 * Modernized socket implementation leveraging:
 * 1. Standard HTML5 Audio for maximum cross-browser runtime compatibility.
 * 2. react-use-websocket for native declarative reconnect logic and strict heartbeat timings.
 */
export function useInterviewSocket({ sessionId, onTranscript, onInterviewEnded }) {
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  /* ── React Refs for Audio Queue ── */
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
    audio.onerror = () => {
      console.error('HTML5 Audio play error');
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };
    audio.play().catch((err) => {
      console.error('Autoplay prevented:', err);
      currentAudioRef.current = null;
      playNext();
    });
  }, []);

  const enqueueAudio = useCallback((base64mp3) => {
    try {
      const binaryStr = atob(base64mp3);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      audioQueueRef.current.push(blob);
      if (!isPlayingRef.current) {
        playNext();
      }
    } catch (err) {
      console.error('Audio format error:', err);
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

  /* ── React-use-websocket Integration ── */
  const socketUrl = sessionId ? `${WS_BASE}/ws/interview/${sessionId}` : null;
  
  const { sendJsonMessage, readyState } = useWebSocket(socketUrl, {
    share: false,
    shouldReconnect: () => !intentionallyClosed.current,
    reconnectAttempts: 5,
    reconnectInterval: 1500,
    heartbeat: {
      message: JSON.stringify({ type: 'ping' }),
      interval: 25000,
    },
    onMessage: (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'transcript':
            onTranscriptRef.current?.(msg.speaker, msg.text);
            break;
          case 'audio':
            setIsThinking(false);
            enqueueAudio(msg.data);
            break;
          case 'interviewer_done':
            setIsThinking(false);
            break;
          case 'interview_ended':
            setIsThinking(false);
            stopAllAudio();
            onInterviewEndedRef.current?.();
            break;
          case 'error':
            setIsThinking(false);
            console.error('WebSocket Application error:', msg.message);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse WS payload:', err);
      }
    },
    onClose: () => {
      // Gracefully silence hardware if conn drops unpredictably
      if (!intentionallyClosed.current) stopAllAudio();
    }
  });

  const sendCandidateMessage = useCallback((text) => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({ type: 'candidate_message', text });
      setIsThinking(true);
    }
  }, [readyState, sendJsonMessage]);

  const endInterview = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      intentionallyClosed.current = true;
      sendJsonMessage({ type: 'end_interview' });
    }
  }, [readyState, sendJsonMessage]);

  const wsReady = readyState === ReadyState.OPEN;

  return { wsReady, interviewerSpeaking, isThinking, sendCandidateMessage, endInterview };
}
