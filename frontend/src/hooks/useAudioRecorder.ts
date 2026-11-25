import { useRef, useState, useCallback, useEffect } from 'react';
import { getMimeType } from '../utils';

interface UseAudioRecorderOptions {
  onResult: (blob: Blob) => void;
  silenceMs?: number;
}

interface UseAudioRecorderReturn {
  recording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  release: () => void;
}

export function useAudioRecorder({
  onResult,
  silenceMs = 1500,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [recording, setRecording] = useState(false);

  const persistentStreamRef = useRef<MediaStream | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const speechStartRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (persistentStreamRef.current) {
      const tracks = persistentStreamRef.current.getAudioTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        return persistentStreamRef.current;
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000,
      },
      video: false,
    });
    persistentStreamRef.current = stream;
    return stream;
  }, []);

  const stopRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    recordingRef.current = false;
    speechStartRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;
    try {
      const stream = await ensureStream();

      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: 16000,
        });
      }
      if (ctxRef.current.state === 'suspended') {
        await ctxRef.current.resume();
      }
      const ctx = ctxRef.current;

      const source = ctx.createMediaStreamSource(stream);

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 100;
      highpass.Q.value = 0.7;
      highpassRef.current = highpass;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 8000;
      lowpass.Q.value = 0.7;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(12, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressorRef.current = compressor;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(analyser);

      chunksRef.current = [];
      const mimeType = getMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRef.current = mr;

      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

        if (blob.size < 4096) return;

        const speechDuration = speechStartRef.current
          ? Date.now() - speechStartRef.current
          : 0;
        if (speechDuration < 600) return;

        onResultRef.current(blob);
      };

      mr.start(200);
      recordingRef.current = true;
      setRecording(true);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const binHz = (ctx.sampleRate || 16000) / analyser.fftSize;
      const SPEECH_LOW_BIN = Math.floor(300 / binHz);
      const SPEECH_HIGH_BIN = Math.floor(3400 / binHz);

      const SPEECH_START_THRESHOLD = 22;
      const SPEECH_HOLD_THRESHOLD = 10;

      let lastSoundTime = Date.now();
      let speechDetected = false;

      const tick = () => {
        if (!recordingRef.current) return;

        analyser.getByteFrequencyData(buf);

        let sum = 0;
        let count = 0;
        for (let i = SPEECH_LOW_BIN; i <= SPEECH_HIGH_BIN && i < buf.length; i++) {
          sum += buf[i];
          count++;
        }
        const speechEnergy = count > 0 ? sum / count : 0;

        if (!speechDetected) {
          if (speechEnergy > SPEECH_START_THRESHOLD) {
            speechDetected = true;
            speechStartRef.current = speechStartRef.current || Date.now();
            lastSoundTime = Date.now();
          }
        } else {
          if (speechEnergy > SPEECH_HOLD_THRESHOLD) {
            lastSoundTime = Date.now();
          }
        }

        if (speechDetected && Date.now() - lastSoundTime > silenceMs) {
          stopRecording();
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error('Mic access error:', err);
      recordingRef.current = false;
      setRecording(false);
    }
  }, [ensureStream, silenceMs, stopRecording]);

  useEffect(() => {
    return () => {
      try { stopRecording(); } catch { /* ignore */ }
      if (persistentStreamRef.current) {
        persistentStreamRef.current.getTracks().forEach((t) => t.stop());
        persistentStreamRef.current = null;
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, [stopRecording]);

  const release = useCallback(() => {
    try { stopRecording(); } catch { /* ignore */ }
    if (persistentStreamRef.current) {
      persistentStreamRef.current.getTracks().forEach((t) => t.stop());
      persistentStreamRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
    }
  }, [stopRecording]);

  return { recording, startRecording, stopRecording, release };
}
