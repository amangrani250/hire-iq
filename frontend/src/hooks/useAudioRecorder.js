import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useAudioRecorder — Production-grade voice activity detection + recording.
 *
 * Noise rejection strategy (multi-layer):
 * 1. getUserMedia with echoCancellation + noiseSuppression + autoGainControl
 * 2. Web Audio API: high-pass filter (removes low-frequency rumble like AC/fans)
 *    + dynamics compressor (evens out speech vs. loud spikes)
 * 3. VAD uses SPEECH-BAND energy (300–3400 Hz) not wideband — avoids env noise
 * 4. Dual-threshold: require SPEECH_THRESHOLD to START, drop at SILENCE_THRESHOLD
 * 5. Minimum speech duration gate: ignore clips < 600ms (keyboard clicks, coughs)
 * 6. Minimum blob size: 4KB to skip near-empty recordings
 *
 * @param {{ onResult: (blob: Blob) => void, silenceMs?: number }} opts
 */
export function useAudioRecorder({ onResult, silenceMs = 1500 }) {
  const [recording, setRecording] = useState(false);

  const persistentStreamRef = useRef(null);
  const mediaRef            = useRef(null);
  const chunksRef           = useRef([]);
  const analyserRef         = useRef(null);
  const ctxRef              = useRef(null);
  const highpassRef         = useRef(null);
  const compressorRef       = useRef(null);
  const rafRef              = useRef(null);
  const recordingRef        = useRef(false);
  const speechStartRef      = useRef(null);  // when speech actually started
  const onResultRef         = useRef(onResult);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  /**
   * Acquire mic stream once with maximum browser-level noise suppression.
   * Reuses the stream across recording cycles to avoid getUserMedia overhead.
   */
  const ensureStream = useCallback(async () => {
    if (persistentStreamRef.current) {
      const tracks = persistentStreamRef.current.getAudioTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        return persistentStreamRef.current;
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,        // Remove AI voice echo from speaker
        noiseSuppression: true,        // Browser-level noise gate
        autoGainControl: true,         // Normalize mic volume
        channelCount: 1,               // Mono — halves processing load
        sampleRate: 16000,             // Whisper-optimal sample rate
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

      // ── Build audio processing chain ──────────────────────────────────────
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000,
        });
      }
      if (ctxRef.current.state === 'suspended') {
        await ctxRef.current.resume();
      }
      const ctx = ctxRef.current;

      const source = ctx.createMediaStreamSource(stream);

      // 1. High-pass filter: cut everything below 100Hz (AC hum, fan rumble, rumble)
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 100;
      highpass.Q.value = 0.7;
      highpassRef.current = highpass;

      // 2. Low-pass filter: cut everything above 8kHz (radio interference, hiss)
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 8000;
      lowpass.Q.value = 0.7;

      // 3. Dynamics compressor: normalize speech vs sudden loud sounds
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(12, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressorRef.current = compressor;

      // 4. Analyser for VAD
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      // Chain: source → highpass → lowpass → compressor → analyser
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(analyser);
      // NOTE: Do NOT connect analyser to destination — no echo back to speaker

      // ── MediaRecorder on the RAW stream (pre-filter) ──────────────────────
      // We filter for VAD only; MediaRecorder captures the clean getUserMedia stream
      chunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

        // Gate 1: minimum size (4KB) — rejects button clicks, brief noise bursts
        if (blob.size < 4096) return;

        // Gate 2: minimum speech duration (600ms) — rejects coughs, keyboard clicks
        const speechDuration = speechStartRef.current
          ? Date.now() - speechStartRef.current
          : 0;
        if (speechDuration < 600) return;

        onResultRef.current(blob);
      };

      mr.start(200);
      recordingRef.current = true;
      setRecording(true);

      // ── VAD loop — speech-band frequency analysis ─────────────────────────
      //
      // Instead of wideband average energy (which is polluted by fan/AC noise),
      // we look at the SPEECH FREQUENCY BAND: 300Hz – 3400Hz.
      // FFT bins at 16000Hz sample rate with fftSize=1024:
      //   bin width = 16000 / 1024 ≈ 15.6 Hz per bin
      //   bin 300Hz ≈ bin index 19
      //   bin 3400Hz ≈ bin index 218
      //
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const binHz = (ctx.sampleRate || 16000) / analyser.fftSize;
      const SPEECH_LOW_BIN  = Math.floor(300  / binHz);  // ~300 Hz
      const SPEECH_HIGH_BIN = Math.floor(3400 / binHz);  // ~3400 Hz

      // Dual threshold: need high energy to START, lower energy maintains state
      const SPEECH_START_THRESHOLD  = 22;  // energy to trigger speech onset
      const SPEECH_HOLD_THRESHOLD   = 10;  // energy to keep recording (hysteresis)

      let lastSoundTime = Date.now();
      let speechDetected = false;

      const tick = () => {
        if (!recordingRef.current) return;

        analyser.getByteFrequencyData(buf);

        // Sum energy ONLY in the speech frequency band
        let sum = 0;
        let count = 0;
        for (let i = SPEECH_LOW_BIN; i <= SPEECH_HIGH_BIN && i < buf.length; i++) {
          sum += buf[i];
          count++;
        }
        const speechEnergy = count > 0 ? sum / count : 0;

        if (!speechDetected) {
          // Need higher threshold to START (avoids triggering on brief noise)
          if (speechEnergy > SPEECH_START_THRESHOLD) {
            speechDetected = true;
            speechStartRef.current = speechStartRef.current || Date.now();
            lastSoundTime = Date.now();
          }
        } else {
          // Holding: lower threshold to continue (natural speech has pauses)
          if (speechEnergy > SPEECH_HOLD_THRESHOLD) {
            lastSoundTime = Date.now();
          }
        }

        if (speechDetected && Date.now() - lastSoundTime > silenceMs) {
          stopRecording();
          return;
        }

        // Safety timeout: if no speech detected within 10s of starting, stop
        if (!speechDetected && speechStartRef.current === null) {
          speechStartRef.current = null; // keep waiting
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
      try { stopRecording(); } catch (e) { /* ignore */ }
      if (persistentStreamRef.current) {
        persistentStreamRef.current.getTracks().forEach((t) => t.stop());
        persistentStreamRef.current = null;
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, [stopRecording]);

  /** release — aggressive cleanup when navigating away. */
  const release = useCallback(() => {
    try { stopRecording(); } catch (e) { /* ignore */ }
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
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}
