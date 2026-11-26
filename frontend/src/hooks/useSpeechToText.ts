import { useEffect, useRef, useCallback, useState, useEffectEvent } from 'react';
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
  const lastFinalRef = useRef('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reads the latest callback/gate without re-subscribing the effect.
  const onFinal = useEffectEvent((text: string) => {
    if (gateRef?.current) return;
    onFinalTranscript(text);
  });

  useEffect(() => {
    if (finalTranscript && finalTranscript !== lastFinalRef.current) {
      lastFinalRef.current = finalTranscript;
      onFinal(finalTranscript);
      resetTranscript();
    }
  }, [finalTranscript, resetTranscript]);

  useEffect(() => {
    if (!interimTranscript) return;

    setIsSpeaking(true);
    if (speechEndTimer.current) clearTimeout(speechEndTimer.current);
    speechEndTimer.current = setTimeout(() => setIsSpeaking(false), SPEECH_END_TIMEOUT);
  }, [interimTranscript]);

  useEffect(() => {
    if (!listening) setIsSpeaking(false);
  }, [listening]);

  useEffect(() => () => {
    if (speechEndTimer.current) clearTimeout(speechEndTimer.current);
  }, []);

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
    setIsSpeaking(false);
  }, [resetTranscript]);

  const release = useCallback(() => {
    SpeechRecognition.abortListening();
    resetTranscript();
    setIsSpeaking(false);
    if (speechEndTimer.current) clearTimeout(speechEndTimer.current);
  }, [resetTranscript]);

  return {
    isListening: listening,
    isSpeaking,
    interimTranscript,
    supported: browserSupportsSpeechRecognition && isMicrophoneAvailable,
    start,
    stop,
    abort,
    release,
  };
}
