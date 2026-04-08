import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useAudioRecorder — Production-grade voice activity detection + recording.
 *
 * Key optimizations over naive approach:
 * 1. Maintains a PERSISTENT mic stream — no getUserMedia on every recording cycle
 * 2. Faster VAD with configurable threshold and shorter silence window
 * 3. Uses refs for onResult to avoid re-creating startRecording on every render
 * 4. Proper cleanup of all resources on unmount
 *
 * @param {{ onResult: (blob: Blob) => void, silenceMs?: number }} opts
 */
export function useAudioRecorder({ onResult, silenceMs = 1200 }) {
  const [recording, setRecording] = useState(false);

  // Persistent refs — survive across recording cycles
  const persistentStreamRef = useRef(null);
  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const analyserRef = useRef(null);
  const ctxRef      = useRef(null);
  const rafRef      = useRef(null);
  const recordingRef = useRef(false);  // track state synchronously
  const onResultRef = useRef(onResult);

  // Keep onResult ref fresh without triggering re-creation of callbacks
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  /** Acquire mic stream once and reuse it across recording cycles. */
  const ensureStream = useCallback(async () => {
    if (persistentStreamRef.current) {
      // Check if tracks are still alive
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
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;
    try {
      const stream = await ensureStream();

      // Create or reuse AudioContext for VAD
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctxRef.current.state === 'suspended') {
        await ctxRef.current.resume();
      }
      const ctx = ctxRef.current;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      chunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });
      mediaRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          // Only send if there's meaningful audio (> 1KB to skip near-empty blobs)
          if (blob.size > 1024) {
            onResultRef.current(blob);
          }
        }
      };

      mr.start(150); // Collect data every 150ms for lower latency
      recordingRef.current = true;
      setRecording(true);

      // ── VAD loop — uses RMS energy detection ──
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const THRESHOLD = 12; // Slightly above typical background noise
      let lastSoundTime = Date.now();

      const tick = () => {
        if (!recordingRef.current) return;

        analyser.getByteFrequencyData(buf);
        // Calculate RMS-like energy (faster than reduce for frequent calls)
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length;

        if (avg > THRESHOLD) lastSoundTime = Date.now();

        if (Date.now() - lastSoundTime > silenceMs) {
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

  // Release all resources on unmount
  useEffect(() => {
    return () => {
      // Ensure all resources are cleaned up
      try {
        stopRecording();
      } catch (e) {
        // ignore
      }
      if (persistentStreamRef.current) {
        persistentStreamRef.current.getTracks().forEach((t) => t.stop());
        persistentStreamRef.current = null;
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, [stopRecording]);

  /**
   * release — aggressive release of all audio resources (Mic + AudioContext).
   * Useful when navigating away or closing the app to ensure mic is freed.
   */
  const release = useCallback(() => {
    try {
      stopRecording();
    } catch (e) {
      // ignore
    }
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

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}
