import { useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export interface UseSpeechToTextReturn {
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  supported: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  release: () => void;
}

const SPEECH_END_TIMEOUT = 1200;

export function useSpeechToText(
  onFinalTranscript: (text: string) => void,
  gateRef?: { current: boolean },
): UseSpeechToTextReturn {
  const {
    interimTranscript,
    finalTranscript,
    listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    resetTranscript,
  } = useSpeechRecognition();

  const speechEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRecentSpeech = useRef(false);
  const lastFinalRef = useRef('');
  const onFinalRef = useRef(onFinalTranscript);
  const gateRefInner = useRef(gateRef);

  useEffect(() => { onFinalRef.current = onFinalTranscript; }, [onFinalTranscript]);
  useEffect(() => { gateRefInner.current = gateRef; }, [gateRef]);

  useEffect(() => {
    if (finalTranscript && finalTranscript !== lastFinalRef.current) {
      lastFinalRef.current = finalTranscript;
      if (gateRefInner.current?.current) return;
      hasRecentSpeech.current = true;
      onFinalRef.current(finalTranscript);
      resetTranscript();
    }
  }, [finalTranscript, resetTranscript]);

  useEffect(() => {
    if (interimTranscript) {
      hasRecentSpeech.current = true;
      if (speechEndTimer.current) clearTimeout(speechEndTimer.current);
      speechEndTimer.current = setTimeout(() => {
        hasRecentSpeech.current = false;
      }, SPEECH_END_TIMEOUT);
    }
  }, [interimTranscript]);

  useEffect(() => {
    if (!listening) {
      hasRecentSpeech.current = false;
    }
  }, [listening]);

  const start = useCallback(() => {
    if (!browserSupportsSpeechRecognition) return;
    resetTranscript();
    SpeechRecognition.startListening({
      continuous: true,
      interimResults: true,
      language: 'en-US',
    });
  }, [browserSupportsSpeechRecognition, resetTranscript]);

  const stop = useCallback(() => {
    SpeechRecognition.stopListening();
  }, []);

  const abort = useCallback(() => {
    SpeechRecognition.abortListening();
    resetTranscript();
    hasRecentSpeech.current = false;
  }, [resetTranscript]);

  const release = useCallback(() => {
    SpeechRecognition.abortListening();
    resetTranscript();
    if (speechEndTimer.current) clearTimeout(speechEndTimer.current);
  }, [resetTranscript]);

  return {
    isListening: listening,
    isSpeaking: hasRecentSpeech.current || !!interimTranscript,
    interimTranscript,
    supported: browserSupportsSpeechRecognition && isMicrophoneAvailable,
    start,
    stop,
    abort,
    release,
  };
}
