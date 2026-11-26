import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FaceLandmarker as FaceLandmarkerInstance,
  ImageSegmenter as ImageSegmenterInstance,
  ObjectDetector as ObjectDetectorInstance,
} from '@mediapipe/tasks-vision';
import { getBackground } from '../lib/backgrounds';
import { clearRecording, recordingExtension, saveRecording, type RecordingBundle } from '../lib/recording-store';
import type {
  AttentionState,
  AttentionStats,
  FocusStatus,
  ProctorFlag,
  ProctorFlagType,
  VirtualBackgroundId,
} from '../types';

const OUT_W = 1280;
const OUT_H = 720;

const STATUS: Record<FocusStatus, AttentionState> = {
  initializing: { status: 'initializing', label: 'Starting camera', tone: 'neutral' },
  focused: { status: 'focused', label: 'Focused', tone: 'good' },
  looking_away: { status: 'looking_away', label: 'Looking away', tone: 'warn' },
  off_center: { status: 'off_center', label: 'Off centre', tone: 'warn' },
  absent: { status: 'absent', label: 'Not detected', tone: 'bad' },
  multiple_faces: { status: 'multiple_faces', label: 'Multiple faces', tone: 'bad' },
  phone: { status: 'phone', label: 'Phone detected', tone: 'bad' },
  too_close: { status: 'too_close', label: 'Move back', tone: 'warn' },
  too_far: { status: 'too_far', label: 'Move closer', tone: 'warn' },
  camera_off: { status: 'camera_off', label: 'Camera off', tone: 'neutral' },
  unavailable: { status: 'unavailable', label: 'Proctoring unavailable', tone: 'neutral' },
};

const FLAG_LABEL: Record<ProctorFlagType, string> = {
  absent: 'Candidate left the frame',
  looking_away: 'Looking away from the screen',
  off_center: 'Moved off centre',
  multiple_faces: 'Another person in frame',
  phone: 'Phone detected',
  too_close: 'Too close to the camera',
  too_far: 'Too far from the camera',
  camera_off: 'Camera turned off',
};

const FLAG_SEVERITY: Record<ProctorFlagType, 'warning' | 'critical'> = {
  absent: 'critical',
  looking_away: 'warning',
  off_center: 'warning',
  multiple_faces: 'critical',
  phone: 'critical',
  too_close: 'warning',
  too_far: 'warning',
  camera_off: 'warning',
};

const FLAG_STATUSES = new Set<FocusStatus>([
  'absent',
  'looking_away',
  'off_center',
  'multiple_faces',
  'phone',
  'too_close',
  'too_far',
  'camera_off',
]);

const THRESHOLDS: Record<FocusStatus, number> = {
  initializing: 0,
  focused: 700,
  looking_away: 1100,
  off_center: 1400,
  absent: 1300,
  multiple_faces: 700,
  phone: 500,
  too_close: 1300,
  too_far: 1300,
  camera_off: 900,
  unavailable: 0,
};

const EMPTY_STATS: AttentionStats = {
  focusScore: 100,
  focusedMs: 0,
  awayMs: 0,
  absentMs: 0,
  totalMs: 0,
};

const MP4_MIME = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
const MIME_CANDIDATES = [
  // Prefer WebM: Chrome's MediaRecorder MP4 path can emit audio-only files for canvas streams.
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  MP4_MIME,
  'video/mp4',
];

const STUDIO_IMAGE_IDS: VirtualBackgroundId[] = ['office', 'lounge', 'study'];

interface UseInterviewMediaOptions {
  camOn: boolean;
  micOn: boolean;
  background: VirtualBackgroundId;
  candidateName: string;
  sessionId?: string;
  onProctorFlag?: (flag: ProctorFlag) => void;
}

interface UseInterviewMediaReturn {
  stream: MediaStream | null;
  previewStream: MediaStream | null;
  videoReady: boolean;
  cameraError: boolean;
  effectsReady: boolean;
  effectsError: boolean;
  attention: AttentionState;
  flags: ProctorFlag[];
  stats: AttentionStats;
  recordingState: 'idle' | 'recording' | 'stopped' | 'unsupported';
  recordingMimeType: string;
  attachTtsAudio: (audio: HTMLAudioElement) => void;
  stopRecording: () => Promise<RecordingBundle | null>;
}

export function useInterviewMedia({
  camOn,
  micOn,
  background,
  candidateName,
  sessionId,
  onProctorFlag,
}: UseInterviewMediaOptions): UseInterviewMediaReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [rawStream, setRawStream] = useState<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [effectsReady, setEffectsReady] = useState(false);
  const [effectsError, setEffectsError] = useState(false);
  const [attention, setAttention] = useState<AttentionState>(STATUS.initializing);
  const [flags, setFlags] = useState<ProctorFlag[]>([]);
  const [stats, setStats] = useState<AttentionStats>(EMPTY_STATS);
  const [recordingState, setRecordingState] = useState<UseInterviewMediaReturn['recordingState']>('idle');
  const [recordingMimeType, setRecordingMimeType] = useState(MP4_MIME);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const personCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioResumeHandlerRef = useRef<(() => void) | null>(null);

  const faceLandmarkerRef = useRef<FaceLandmarkerInstance | null>(null);
  const segmenterRef = useRef<ImageSegmenterInstance | null>(null);
  const objectDetectorRef = useRef<ObjectDetectorInstance | null>(null);
  const segmenterPersonIndexRef = useRef(1);
  const backgroundImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const lastMaskAtRef = useRef(0);
  const hasMaskRef = useRef(false);
  const lastFaceAtRef = useRef(0);
  const lastObjectAtRef = useRef(0);
  const lastPhoneAtRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const frameRef = useRef(0);
  const cancelledRef = useRef(false);
  const generationRef = useRef(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recordedBundleRef = useRef<RecordingBundle | null>(null);
  const stopResolverRef = useRef<((bundle: RecordingBundle | null) => void) | null>(null);
  const saveRequestedRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const recordingInfoRef = useRef<{ durationMs: number; size: number }>({ durationMs: 0, size: 0 });

  const camOnRef = useRef(camOn);
  const micOnRef = useRef(micOn);
  const backgroundRef = useRef(background);
  const nameRef = useRef(candidateName);
  const onFlagRef = useRef(onProctorFlag);
  const sessionIdRef = useRef(sessionId || `session-${Date.now()}`);

  const stateRef = useRef<FocusStatus>('initializing');
  const pendingRef = useRef<{ status: FocusStatus; since: number }>({
    status: 'initializing',
    since: 0,
  });
  const flagsRef = useRef<ProctorFlag[]>([]);
  const activeFlagRef = useRef<ProctorFlag | null>(null);
  const activeFlagStartRef = useRef(0);
  const statsRef = useRef<AttentionStats>({ ...EMPTY_STATS });
  const lastStatsTickRef = useRef(0);
  const lastStatsPushRef = useRef(0);
  const stopFinalizedRef = useRef(false);

  useEffect(() => { camOnRef.current = camOn; }, [camOn]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { backgroundRef.current = background; }, [background]);
  useEffect(() => { nameRef.current = candidateName; }, [candidateName]);
  useEffect(() => { onFlagRef.current = onProctorFlag; }, [onProctorFlag]);
  useEffect(() => { sessionIdRef.current = sessionId || sessionIdRef.current; }, [sessionId]);

  const makeFlag = useCallback((status: FocusStatus, now: number): ProctorFlag | null => {
    if (!FLAG_STATUSES.has(status)) return null;
    const type = status as ProctorFlagType;
    return {
      id: `${type}-${now}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      label: FLAG_LABEL[type],
      startedAt: Date.now(),
      durationMs: 0,
      severity: FLAG_SEVERITY[type],
    };
  }, []);

  const finalizeActiveFlag = useCallback((now: number) => {
    const active = activeFlagRef.current;
    if (!active) return;
    const durationMs = Math.max(0, Math.round(now - activeFlagStartRef.current));
    const finalFlag: ProctorFlag = { ...active, durationMs };
    flagsRef.current = flagsRef.current.map((flag) => (flag.id === active.id ? finalFlag : flag));
    setFlags([...flagsRef.current]);
    activeFlagRef.current = null;
    if (durationMs >= 400) onFlagRef.current?.(finalFlag);
  }, []);

  const transitionTo = useCallback((status: FocusStatus, now: number) => {
    if (stateRef.current === status) return;

    finalizeActiveFlag(now);

    stateRef.current = status;
    setAttention(STATUS[status]);

    const active = makeFlag(status, now);
    if (active) {
      activeFlagRef.current = active;
      activeFlagStartRef.current = now;
      flagsRef.current = [...flagsRef.current, active];
      setFlags([...flagsRef.current]);
    }
    pendingRef.current = { status, since: now };
  }, [finalizeActiveFlag, makeFlag]);

  const tickStats = useCallback((now: number) => {
    const previous = lastStatsTickRef.current;
    if (!previous) {
      lastStatsTickRef.current = now;
      return;
    }
    const delta = Math.min(1500, Math.max(0, now - previous));
    lastStatsTickRef.current = now;
    if (delta === 0) return;
    if (stateRef.current === 'initializing' || stateRef.current === 'unavailable') return;

    const current = statsRef.current;
    current.totalMs += delta;
    if (stateRef.current === 'focused') {
      current.focusedMs += delta;
    } else if (
      stateRef.current === 'absent' ||
      stateRef.current === 'multiple_faces' ||
      stateRef.current === 'camera_off'
    ) {
      current.absentMs += delta;
    } else {
      current.awayMs += delta;
    }
    current.focusScore = current.totalMs
      ? Math.max(0, Math.min(100, Math.round((current.focusedMs / current.totalMs) * 100)))
      : 100;

    if (now - lastStatsPushRef.current > 1200) {
      lastStatsPushRef.current = now;
      setStats({ ...current });
    }
  }, []);

  const updateAttention = useCallback((raw: FocusStatus, now: number) => {
    if (raw === stateRef.current) {
      pendingRef.current = { status: raw, since: now };
      return;
    }
    if (pendingRef.current.status !== raw) {
      pendingRef.current = { status: raw, since: now };
    }
    const threshold = THRESHOLDS[raw] ?? 900;
    if (now - pendingRef.current.since < threshold) return;
    transitionTo(raw, now);
  }, [transitionTo]);

  /* --------------------------------------------------------------------- */
  /* Background images                                                     */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    for (const id of STUDIO_IMAGE_IDS) {
      const option = getBackground(id);
      if (!option.image) continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = option.image;
      backgroundImagesRef.current[id] = image;
    }
  }, []);

  /* --------------------------------------------------------------------- */
  /* MediaPipe models                                                      */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    if (!videoReady) return undefined;
    let disposed = false;
    let objectTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const {
          FaceLandmarker,
          FilesetResolver,
          ImageSegmenter,
          ObjectDetector,
        } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');

        const createFace = async (delegate: 'GPU' | 'CPU') =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate },
            runningMode: 'VIDEO',
            numFaces: 2,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: true,
          });

        const createSegmenter = async (delegate: 'GPU' | 'CPU') =>
          ImageSegmenter.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: '/models/selfie_segmenter.tflite', delegate },
            runningMode: 'VIDEO',
            outputConfidenceMasks: true,
            outputCategoryMask: false,
          });

        let face: FaceLandmarkerInstance | null = null;
        let segmenter: ImageSegmenterInstance | null = null;

        try {
          face = await createFace('GPU');
        } catch {
          face = await createFace('CPU');
        }
        try {
          segmenter = await createSegmenter('GPU');
        } catch {
          segmenter = await createSegmenter('CPU');
        }

        if (disposed) {
          face?.close();
          segmenter?.close();
          return;
        }

        faceLandmarkerRef.current = face;
        segmenterRef.current = segmenter;

        const labels = segmenter.getLabels();
        const personIndex = labels.findIndex((label) => /person|foreground|selfie/i.test(label));
        segmenterPersonIndexRef.current = personIndex >= 0 ? personIndex : 1;
        setEffectsReady(true);

        objectTimer = setTimeout(async () => {
          try {
            const detector = await ObjectDetector.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: '/models/efficientdet_lite0.tflite', delegate: 'GPU' },
              runningMode: 'VIDEO',
              scoreThreshold: 0.45,
              maxResults: 5,
            });
            if (!disposed) objectDetectorRef.current = detector;
            else detector.close();
          } catch {
            try {
              const detector = await ObjectDetector.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: '/models/efficientdet_lite0.tflite', delegate: 'CPU' },
                runningMode: 'VIDEO',
                scoreThreshold: 0.45,
                maxResults: 5,
              });
              if (!disposed) objectDetectorRef.current = detector;
              else detector.close();
            } catch (error) {
              console.warn('Phone detection model unavailable.', error);
            }
          }
        }, 1600);
      } catch (error) {
        console.error('MediaPipe effects failed to load.', error);
        if (!disposed) {
          setEffectsError(true);
          setAttention(STATUS.unavailable);
          stateRef.current = 'unavailable';
        }
      }
    };

    load();

    return () => {
      disposed = true;
      if (objectTimer) clearTimeout(objectTimer);
      faceLandmarkerRef.current?.close();
      segmenterRef.current?.close();
      objectDetectorRef.current?.close();
      faceLandmarkerRef.current = null;
      segmenterRef.current = null;
      objectDetectorRef.current = null;
    };
  }, [videoReady]);

  /* --------------------------------------------------------------------- */
  /* Audio graph: mic + Aira TTS -> recording destination                  */
  /* --------------------------------------------------------------------- */
  const attachTtsAudio = useCallback((audio: HTMLAudioElement) => {
    const ctx = audioContextRef.current;
    const destination = audioDestinationRef.current;
    if (!ctx) return;
    try {
      const source = ctx.createMediaElementSource(audio);
      source.connect(ctx.destination);
      if (destination) source.connect(destination);
      if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    } catch (error) {
      console.warn('Could not route TTS audio into the recording.', error);
    }
  }, []);

  /* --------------------------------------------------------------------- */
  /* Camera + canvas + recorder                                            */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    const generation = ++generationRef.current;
    cancelledRef.current = false;
    const isCurrent = () => generationRef.current === generation && !cancelledRef.current;
    void clearRecording();

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.style.position = 'fixed';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    canvasRef.current = canvas;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = 256;
    maskCanvas.height = 256;
    maskCanvasRef.current = maskCanvas;

    const personCanvas = document.createElement('canvas');
    personCanvas.width = OUT_W;
    personCanvas.height = OUT_H;
    personCanvasRef.current = personCanvas;

    const ctx = canvas.getContext('2d', { alpha: false });
    const canvasStream = canvas.captureStream(30);
    canvasStreamRef.current = canvasStream;
    setStream(canvasStream);

    const drawPlaceholder = (message: string) => {
      if (!ctx) return;
      const gradient = ctx.createLinearGradient(0, 0, OUT_W, OUT_H);
      gradient.addColorStop(0, '#070c18');
      gradient.addColorStop(0.6, '#101a33');
      gradient.addColorStop(1, '#070c18');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, OUT_W, OUT_H);

      const glow = ctx.createRadialGradient(OUT_W * 0.5, OUT_H * 0.42, 0, OUT_W * 0.5, OUT_H * 0.42, 320);
      glow.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
      glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, OUT_W, OUT_H);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(OUT_W / 2, OUT_H / 2 - 40, 74, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#eef2ff';
      ctx.font = '600 46px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((nameRef.current || 'Candidate').charAt(0).toUpperCase(), OUT_W / 2, OUT_H / 2 - 38);

      ctx.fillStyle = 'rgba(238,242,255,0.82)';
      ctx.font = '500 20px Inter, system-ui, sans-serif';
      ctx.fillText(nameRef.current || 'Candidate', OUT_W / 2, OUT_H / 2 + 64);
      ctx.fillStyle = 'rgba(238,242,255,0.45)';
      ctx.font = '400 15px Inter, system-ui, sans-serif';
      ctx.fillText(message, OUT_W / 2, OUT_H / 2 + 92);
    };

    drawPlaceholder('Camera off');

    const fitCover = (source: HTMLVideoElement | HTMLImageElement) => {
      const sw = 'videoWidth' in source ? source.videoWidth : source.naturalWidth;
      const sh = 'videoHeight' in source ? source.videoHeight : source.naturalHeight;
      if (!sw || !sh) return { x: 0, y: 0, w: OUT_W, h: OUT_H, sw, sh };
      const scale = Math.max(OUT_W / sw, OUT_H / sh);
      const w = sw * scale;
      const h = sh * scale;
      return { x: (OUT_W - w) / 2, y: (OUT_H - h) / 2, w, h, sw, sh };
    };

    const drawVideoCover = (target: CanvasRenderingContext2D, scale = 1) => {
      const { x, y, w, h, sw, sh } = fitCover(video);
      if (!sw || !sh) return;
      const dw = w * scale;
      const dh = h * scale;
      target.drawImage(video, x - (dw - w) / 2, y - (dh - h) / 2, dw, dh);
    };

    const drawImageCover = (target: CanvasRenderingContext2D, image: HTMLImageElement) => {
      const { x, y, w, h, sw, sh } = fitCover(image);
      if (!sw || !sh) return false;
      target.drawImage(image, x, y, w, h);
      return true;
    };

    const drawStudio = (target: CanvasRenderingContext2D) => {
      const gradient = target.createLinearGradient(0, 0, OUT_W, OUT_H);
      gradient.addColorStop(0, '#080d1f');
      gradient.addColorStop(0.45, '#1b1a4a');
      gradient.addColorStop(0.72, '#2b1a5e');
      gradient.addColorStop(1, '#0a1022');
      target.fillStyle = gradient;
      target.fillRect(0, 0, OUT_W, OUT_H);

      const glow = target.createRadialGradient(OUT_W * 0.32, OUT_H * 0.18, 0, OUT_W * 0.32, OUT_H * 0.18, OUT_W * 0.55);
      glow.addColorStop(0, 'rgba(99,102,241,0.42)');
      glow.addColorStop(1, 'rgba(99,102,241,0)');
      target.fillStyle = glow;
      target.fillRect(0, 0, OUT_W, OUT_H);

      const glow2 = target.createRadialGradient(OUT_W * 0.82, OUT_H * 0.78, 0, OUT_W * 0.82, OUT_H * 0.78, OUT_W * 0.45);
      glow2.addColorStop(0, 'rgba(139,92,246,0.35)');
      glow2.addColorStop(1, 'rgba(139,92,246,0)');
      target.fillStyle = glow2;
      target.fillRect(0, 0, OUT_W, OUT_H);
    };

    const drawPerson = () => {
      const person = personCanvasRef.current;
      const mask = maskCanvasRef.current;
      if (!person || !mask || !totalPersonMaskReady()) return;
      const pctx = person.getContext('2d');
      if (!pctx) return;
      pctx.clearRect(0, 0, OUT_W, OUT_H);
      drawVideoCover(pctx);
      pctx.globalCompositeOperation = 'destination-in';
      pctx.drawImage(mask, 0, 0, OUT_W, OUT_H);
      pctx.globalCompositeOperation = 'source-over';
      ctx?.drawImage(person, 0, 0);
    };

    const totalPersonMaskReady = () => hasMaskRef.current && !!maskCanvasRef.current;

    const applySegmentation = (result: ReturnType<ImageSegmenterInstance['segmentForVideo']>) => {
      const segmenter = segmenterRef.current;
      const maskCanvasElement = maskCanvasRef.current;
      if (!segmenter || !maskCanvasElement) return;
      const maskCtx = maskCanvasElement.getContext('2d');
      if (!maskCtx) return;

      let values: Float32Array | Uint8Array | null = null;
      let width = 0;
      let height = 0;
      let maxValue = 1;

      const confidenceMasks = result.confidenceMasks;
      if (confidenceMasks && confidenceMasks.length > 0) {
        const index = Math.min(segmenterPersonIndexRef.current, confidenceMasks.length - 1);
        const confidence = confidenceMasks[index];
        width = confidence.width;
        height = confidence.height;
        values = confidence.getAsFloat32Array();
      } else if (result.categoryMask) {
        width = result.categoryMask.width;
        height = result.categoryMask.height;
        values = result.categoryMask.getAsUint8Array();
        maxValue = 1;
      }

      if (!values || !width || !height) return;
      if (maskCanvasElement.width !== width || maskCanvasElement.height !== height) {
        maskCanvasElement.width = width;
        maskCanvasElement.height = height;
      }

      const imageData = maskCtx.createImageData(width, height);
      const data = imageData.data;
      const personIndex = segmenterPersonIndexRef.current;
      for (let i = 0; i < values.length; i += 1) {
        const raw = values[i];
        const alpha =
          result.categoryMask && !result.confidenceMasks
            ? raw === personIndex
              ? 255
              : 0
            : Math.max(0, Math.min(maxValue, raw)) * 255;
        const offset = i * 4;
        data[offset] = 255;
        data[offset + 1] = 255;
        data[offset + 2] = 255;
        data[offset + 3] = alpha;
      }
      maskCtx.putImageData(imageData, 0, 0);
      hasMaskRef.current = true;
    };

    const selectMime = () => MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

    const startRecorder = () => {
      if (recorderRef.current) return;
      if (typeof MediaRecorder === 'undefined') {
        setRecordingState('unsupported');
        return;
      }
      const mimeType = selectMime();
      if (!mimeType) {
        setRecordingState('unsupported');
        return;
      }
      const audioTracks = audioDestinationRef.current?.stream.getAudioTracks() ?? [];
      const videoTracks = canvasStream.getVideoTracks().filter((track) => track.readyState === 'live');
      if (!videoTracks.length) {
        console.warn('Recording unavailable: no live canvas video track.');
        setRecordingState('unsupported');
        return;
      }
      const combined = new MediaStream([...videoTracks, ...audioTracks]);
      try {
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(combined, {
            mimeType,
            videoBitsPerSecond: 2_200_000,
            audioBitsPerSecond: 96_000,
          });
        } catch {
          // Some browsers reject a codec string when the stream has no audio.
          recorder = new MediaRecorder(combined);
        }
        recorderChunksRef.current = [];
        recordingStartedAtRef.current = Date.now();
        setRecordingMimeType(recorder.mimeType || mimeType);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recorderChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const durationMs = Math.max(0, Date.now() - recordingStartedAtRef.current);
          const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || mimeType });
          const extension = recordingExtension(recorder.mimeType || mimeType);
          const finalStats = { ...statsRef.current };
          finalStats.focusScore = finalStats.totalMs
            ? Math.max(0, Math.min(100, Math.round((finalStats.focusedMs / finalStats.totalMs) * 100)))
            : 100;
          const finalFlags = flagsRef.current.map((flag) => ({ ...flag }));
          if (!blob.size) {
            console.warn('Recording stopped without any data.');
            setRecordingState('unsupported');
            stopResolverRef.current?.(null);
            stopResolverRef.current = null;
            return;
          }
          const bundle: RecordingBundle = {
            blob,
            mimeType: recorder.mimeType || mimeType,
            extension,
            durationMs,
            size: blob.size,
            createdAt: Date.now(),
            sessionId: sessionIdRef.current,
            flags: finalFlags,
            stats: finalStats,
          };
          recordedBundleRef.current = bundle;
          recordingInfoRef.current = { durationMs, size: blob.size };
          setRecordingState('stopped');
          setStats(finalStats);

          if (!saveRequestedRef.current) {
            // The effect was torn down (for example by React StrictMode) before
            // the interview ended. Do not overwrite the previous good recording.
            stopResolverRef.current?.(bundle);
            stopResolverRef.current = null;
            return;
          }

          void saveRecording(bundle).finally(() => {
            stopResolverRef.current?.(bundle);
            stopResolverRef.current = null;
          });
        };

        recorder.start(1000);
        recorderRef.current = recorder;
        setRecordingState('recording');
      } catch (error) {
        console.error('Could not start the interview recording.', error);
        setRecordingState('unsupported');
      }
    };

    const loop = (now: number) => {
      if (!isCurrent()) return;
      frameRef.current = requestAnimationFrame(loop);
      if (!ctx) return;

      tickStats(now);

      const videoElement = videoRef.current;
      const hasVideo = !!videoElement && videoElement.readyState >= 2 && camOnRef.current;
      if (!hasVideo) {
        drawPlaceholder(camOnRef.current ? 'Camera starting…' : 'Camera off');
        updateAttention('camera_off', now);
        return;
      }

      const frameNow = now - lastFrameAtRef.current;
      if (frameNow < 28) return;
      lastFrameAtRef.current = now;

      let rawStatus: FocusStatus = 'focused';

      if (faceLandmarkerRef.current && now - lastFaceAtRef.current > 130) {
        lastFaceAtRef.current = now;
        try {
          const result = faceLandmarkerRef.current.detectForVideo(videoElement, now);
          const faces = result.faceLandmarks;
          if (faces.length === 0) {
            rawStatus = 'absent';
          } else if (faces.length > 1) {
            rawStatus = 'multiple_faces';
          } else if (now - lastPhoneAtRef.current < 2200) {
            rawStatus = 'phone';
          } else {
            const landmarks = faces[0] as Array<{ x: number; y: number }>;
            let minX = 1, minY = 1, maxX = 0, maxY = 0;
            for (const point of landmarks) {
              if (point.x < minX) minX = point.x;
              if (point.x > maxX) maxX = point.x;
              if (point.y < minY) minY = point.y;
              if (point.y > maxY) maxY = point.y;
            }
            const faceHeight = maxY - minY;
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const nose = landmarks[1];
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];
            const yaw =
              nose && leftCheek && rightCheek
                ? (nose.x - (leftCheek.x + rightCheek.x) / 2) /
                  Math.max(0.001, rightCheek.x - leftCheek.x)
                : 0;

            const blendshapes = result.faceBlendshapes?.[0]?.categories ?? [];
            const score = (name: string) =>
              blendshapes.find((category) => category.categoryName === name)?.score ?? 0;
            const gazeX =
              score('eyeLookInLeft') + score('eyeLookOutRight') -
              (score('eyeLookOutLeft') + score('eyeLookInRight'));
            const gazeY =
              score('eyeLookUpLeft') + score('eyeLookUpRight') -
              (score('eyeLookDownLeft') + score('eyeLookDownRight'));

            if (Math.abs(yaw) > 0.26 || Math.abs(gazeX) > 0.72 || Math.abs(gazeY) > 0.85) {
              rawStatus = 'looking_away';
            } else if (centerX < 0.25 || centerX > 0.75 || centerY < 0.15 || centerY > 0.86) {
              rawStatus = 'off_center';
            } else if (faceHeight < 0.16) {
              rawStatus = 'too_far';
            } else if (faceHeight > 0.72) {
              rawStatus = 'too_close';
            }
          }
        } catch (error) {
          // A dropped frame should not break the interview.
          console.warn('Face detection frame skipped.', error);
        }
      }

      if (objectDetectorRef.current && now - lastObjectAtRef.current > 1000) {
        lastObjectAtRef.current = now;
        try {
          const detection = objectDetectorRef.current.detectForVideo(videoElement, now);
          const phone = detection.detections.some((item) =>
            item.categories.some(
              (category) =>
                /cell phone|mobile phone|phone/i.test(category.categoryName) &&
                category.score > 0.45
            )
          );
          if (phone) lastPhoneAtRef.current = now;
        } catch {
          /* ignore a dropped object-detection frame */
        }
      }

      if (faceLandmarkerRef.current) updateAttention(rawStatus, now);
      const backgroundId = backgroundRef.current;
      const segmenter = segmenterRef.current;

      if (segmenter && backgroundId !== 'none' && now - lastMaskAtRef.current > 72) {
        lastMaskAtRef.current = now;
        try {
          const result = segmenter.segmentForVideo(videoElement, now);
          applySegmentation(result);
          result.close();
        } catch (error) {
          console.warn('Background segmentation frame skipped.', error);
        }
      }

      if (backgroundId === 'none' || !hasMaskRef.current || now - lastMaskAtRef.current > 1200) {
        drawVideoCover(ctx);
      } else {
        if (backgroundId === 'blur') {
          ctx.save();
          ctx.filter = 'blur(18px) brightness(0.82) saturate(1.05)';
          drawVideoCover(ctx, 1.12);
          ctx.restore();
        } else if (backgroundId === 'studio') {
          drawStudio(ctx);
        } else {
          const image = backgroundImagesRef.current[backgroundId];
          if (!image || !image.complete || !image.naturalWidth) {
            drawStudio(ctx);
          } else {
            drawImageCover(ctx, image);
          }
        }
        drawPerson();
      }
    };

    const init = async () => {
      try {
        let media: MediaStream | null = null;
        try {
          media = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: 'user',
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch {
          try {
            media = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
                facingMode: 'user',
              },
              audio: false,
            });
          } catch {
            try {
              media = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              });
            } catch {
              media = null;
            }
          }
        }

        if (!isCurrent()) {
          media?.getTracks().forEach((track) => track.stop());
          return;
        }

        if (media) {
          rawStreamRef.current = media;
          const videoTracks = media.getVideoTracks();
          if (videoTracks.length) {
            video.srcObject = media;
            await video.play().catch(() => undefined);
            setRawStream(media);
            setVideoReady(true);
            setCameraError(false);
          } else {
            setVideoReady(false);
            setCameraError(true);
          }

          if (media.getAudioTracks().length) {
            const AudioContextCtor =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AudioContextCtor) {
              const audioContext = new AudioContextCtor();
              audioContextRef.current = audioContext;
              audioContext.resume().catch(() => undefined);
              const destination = audioContext.createMediaStreamDestination();
              audioDestinationRef.current = destination;
              const micSource = audioContext.createMediaStreamSource(media);
              const gain = audioContext.createGain();
              gain.gain.value = 1;
              micSource.connect(gain);
              gain.connect(destination);

              const resume = () => {
                if (audioContext.state === 'suspended') {
                  audioContext.resume().catch(() => undefined);
                }
              };
              audioResumeHandlerRef.current = resume;
              if (audioContext.state === 'suspended') {
                document.addEventListener('pointerdown', resume, { once: true });
              }
            }
          }
        } else {
          setVideoReady(false);
          setCameraError(true);
        }

        if (!isCurrent()) return;
        startRecorder();
        frameRef.current = requestAnimationFrame(loop);
      } catch (error) {
        console.error('Camera initialisation failed.', error);
        if (!isCurrent()) return;
        setCameraError(true);
        setVideoReady(false);
        startRecorder();
        frameRef.current = requestAnimationFrame(loop);
      }
    };

    void init();

    return () => {
      cancelledRef.current = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (audioResumeHandlerRef.current) {
        document.removeEventListener('pointerdown', audioResumeHandlerRef.current);
      }
      finalizeActiveFlag(performance.now());
      saveRequestedRef.current = false;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop(); } catch { /* ignore */ }
      }
      rawStreamRef.current?.getTracks().forEach((track) => {
        try { track.stop(); } catch { /* ignore */ }
      });
      rawStreamRef.current = null;
      canvasStreamRef.current?.getTracks().forEach((track) => {
        try { track.stop(); } catch { /* ignore */ }
      });
      canvasStreamRef.current = null;
      recorderRef.current = null;
      if (video.srcObject) video.srcObject = null;
      video.remove();
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
      audioDestinationRef.current = null;
    };
  }, [finalizeActiveFlag, tickStats, updateAttention]);

  useEffect(() => {
    const videoTracks = rawStreamRef.current?.getVideoTracks() ?? [];
    videoTracks.forEach((track) => { track.enabled = camOn; });
    if (!camOn) {
      transitionTo('camera_off', performance.now());
    } else {
      pendingRef.current = { status: 'focused', since: performance.now() };
    }
  }, [camOn, transitionTo]);

  useEffect(() => {
    const audioTracks = rawStreamRef.current?.getAudioTracks() ?? [];
    audioTracks.forEach((track) => { track.enabled = micOn; });
  }, [micOn]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (stateRef.current === 'camera_off' && camOnRef.current) {
        pendingRef.current = { status: 'focused', since: performance.now() };
      }
    }, 1500);
    return () => window.clearInterval(interval);
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingBundle | null> => {
    if (stopFinalizedRef.current && recordedBundleRef.current) return recordedBundleRef.current;
    saveRequestedRef.current = true;
    finalizeActiveFlag(performance.now());
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      stopFinalizedRef.current = true;
      return recordedBundleRef.current;
    }
    return new Promise<RecordingBundle | null>((resolve) => {
      stopResolverRef.current = resolve;
      try {
        recorder.stop();
      } catch {
        stopFinalizedRef.current = true;
        resolve(recordedBundleRef.current);
      }
    });
  }, [finalizeActiveFlag]);

  useEffect(() => {
    const processedLive = !!stream?.getVideoTracks().some((track) => track.readyState === 'live');
    const rawLive = !!rawStream?.getVideoTracks().some((track) => track.readyState === 'live');

    // Show the real camera immediately. Switch to the processed canvas once
    // effects are ready so the selected background is visible in the preview.
    if (rawLive && (background === 'none' || !effectsReady || !processedLive)) {
      setPreviewStream(rawStream);
    } else if (processedLive) {
      setPreviewStream(stream);
    } else {
      setPreviewStream(rawLive ? rawStream : stream);
    }
  }, [stream, rawStream, effectsReady, background]);

  return {
    stream,
    previewStream,
    videoReady,
    cameraError,
    effectsReady,
    effectsError,
    attention,
    flags,
    stats,
    recordingState,
    recordingMimeType,
    attachTtsAudio,
    stopRecording,
  };
}
