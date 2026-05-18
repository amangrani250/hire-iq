import { useState, useRef, useCallback } from 'react';

interface UseVoiceInputReturn {
  listening: boolean;
  supported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

export function useVoiceInput(onResult: (text: string, isFinal: boolean) => void): UseVoiceInputReturn {
  const [listening, setListening] = useState(false);
  const [supported] = useState(
    () => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  );
  const recRef = useRef<SpeechRecognitionClass | null>(null);

  const start = useCallback(() => {
    if (!supported) return;
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let finalTranscript = '';

    rec.onstart = () => setListening(true);

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + ' ';
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      onResult(finalTranscript + interim, false);
    };

    rec.onend = () => {
      setListening(false);
      if (finalTranscript) onResult(finalTranscript.trim(), true);
    };

    rec.onerror = () => setListening(false);

    recRef.current = rec;
    rec.start();
  }, [supported, onResult]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop, toggle: listening ? stop : start };
}
