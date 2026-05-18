import { useRef, useState, useEffect, useCallback } from 'react';

interface MediaDeviceOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

interface MediaDeviceReturn {
  stream: MediaStream | null;
  error: string | null;
  active: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

export function useMediaDevice(options: MediaDeviceOptions = { video: true, audio: true }): MediaDeviceReturn {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setActive(false);
    setError(null);
  }, []);

  const start = useCallback(async () => {
    try {
      stop();
      const mediaStream = await navigator.mediaDevices.getUserMedia(options);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setActive(true);
      setError(null);
    } catch (err) {
      const msg = err instanceof DOMException
        ? err.name === 'NotAllowedError'
          ? 'Camera/mic access denied'
          : err.name === 'NotFoundError'
            ? 'No camera/mic found'
            : err.message
        : 'Failed to access media device';
      setError(msg);
      setActive(false);
    }
  }, [options, stop]);

  const toggleVideo = useCallback(() => {
    if (!streamRef.current) return;
    const tracks = streamRef.current.getVideoTracks();
    tracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
  }, []);

  const toggleAudio = useCallback(() => {
    if (!streamRef.current) return;
    const tracks = streamRef.current.getAudioTracks();
    tracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { stream, error, active, start, stop, toggleVideo, toggleAudio };
}
