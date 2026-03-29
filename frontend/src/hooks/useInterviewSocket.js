import { useRef, useState, useCallback, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_BASE  = API_BASE.replace(/^http/, 'ws');

/** Max reconnect attempts before giving up. */
const MAX_RECONNECT = 3;
const RECONNECT_DELAY_MS = 1500;

/**
 * useInterviewSocket — manages the WebSocket connection to the interview backend.
 *
 * Features:
 * - Auto-reconnect with exponential backoff (up to MAX_RECONNECT attempts)
 * - Sequential audio queue with proper cleanup
 * - Heartbeat ping to keep connection alive
 *
 * @param {{
 *   sessionId: string,
 *   onTranscript: (speaker: string, text: string) => void,
 *   onInterviewEnded: () => void,
 * }} opts
 */
export function useInterviewSocket({ sessionId, onTranscript, onInterviewEnded }) {
  const wsRef          = useRef(null);
  const audioQueueRef  = useRef([]);
  const playingRef     = useRef(false);
  const currentAudioRef = useRef(null);
  const reconnectCount = useRef(0);
  const heartbeatRef   = useRef(null);

  const [wsReady, setWsReady] = useState(false);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);

  // Keep callbacks in refs to avoid re-creating the WS effect
  const onTranscriptRef = useRef(onTranscript);
  const onInterviewEndedRef = useRef(onInterviewEnded);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterviewEndedRef.current = onInterviewEnded; }, [onInterviewEnded]);

  /** Play queued audio blobs sequentially. */
  const playNext = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      playingRef.current = false;
      currentAudioRef.current = null;
      setInterviewerSpeaking(false);
      return;
    }
    playingRef.current = true;
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
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };
    audio.play().catch(() => {
      currentAudioRef.current = null;
      playNext();
    });
  }, []);

  /** Enqueue base64 MP3 for sequential playback. */
  const enqueueAudio = useCallback((base64mp3) => {
    try {
      const binaryStr = atob(base64mp3);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      audioQueueRef.current.push(blob);
      if (!playingRef.current) playNext();
    } catch (err) {
      console.error('Audio decode error:', err);
    }
  }, [playNext]);

  /** Stop all currently playing and queued audio. */
  const stopAllAudio = useCallback(() => {
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    playingRef.current = false;
    setInterviewerSpeaking(false);
  }, []);

  /** Start heartbeat ping to keep WS alive. */
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000); // Every 25s
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── WebSocket lifecycle ──
  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      const ws = new WebSocket(`${WS_BASE}/ws/interview/${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        reconnectCount.current = 0;
        setWsReady(true);
        startHeartbeat();
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setWsReady(false);
        stopHeartbeat();

        // Auto-reconnect if unexpected disconnect
        if (reconnectCount.current < MAX_RECONNECT) {
          reconnectCount.current += 1;
          const delay = RECONNECT_DELAY_MS * reconnectCount.current;
          console.log(`WS reconnecting in ${delay}ms (attempt ${reconnectCount.current})`);
          setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.error('WS error:', err);
      };

      ws.onmessage = (evt) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(evt.data);
          switch (msg.type) {
            case 'transcript':
              onTranscriptRef.current?.(msg.speaker, msg.text);
              break;
            case 'audio':
              enqueueAudio(msg.data);
              break;
            case 'interviewer_done':
              break;
            case 'interview_ended':
              stopAllAudio();
              onInterviewEndedRef.current?.();
              break;
            case 'pong':
              break; // heartbeat response
            case 'error':
              console.error('Server error:', msg.message);
              break;
            default:
              break;
          }
        } catch (parseErr) {
          console.error('WS message parse error:', parseErr);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      stopHeartbeat();
      stopAllAudio();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, enqueueAudio, startHeartbeat, stopHeartbeat, stopAllAudio]);

  const sendCandidateMessage = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'candidate_message', text }));
    }
  }, []);

  const endInterview = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Stop reconnect attempts when ending intentionally
      reconnectCount.current = MAX_RECONNECT;
      wsRef.current.send(JSON.stringify({ type: 'end_interview' }));
    }
  }, []);

  return { wsReady, interviewerSpeaking, sendCandidateMessage, endInterview };
}
