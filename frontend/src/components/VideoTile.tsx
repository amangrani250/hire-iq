import { memo, useEffect, useRef } from 'react';
import { MicOff, Volume2 } from 'lucide-react';

const VIDEO_CONSTRAINTS: MediaTrackConstraints = { facingMode: 'user' };

export interface VideoTileProps {
  role: 'interviewer' | 'candidate';
  name: string;
  camOn?: boolean;
  speaking?: boolean;
  muted?: boolean;
  large?: boolean;
  avatarChar?: string;
  accentColor?: string;
}

interface AvatarDisplayProps {
  char: string;
  color: string;
  speaking?: boolean;
  role: 'interviewer' | 'candidate';
  name: string;
  showMeta?: boolean;
}

/**
 * VideoTile — a participant tile in the interview room.
 * Shows either the webcam feed (candidate) or an animated avatar (interviewer).
 */
function VideoTile({
  role,
  name,
  camOn,
  speaking,
  muted,
  large,
  avatarChar,
  accentColor,
}: VideoTileProps) {
  const color = accentColor || 'var(--color-primary)';
  const background =
    role === 'interviewer'
      ? 'radial-gradient(circle at 50% 22%, #17241f 0%, #0c1210 68%)'
      : '#0d1411';

  const rootClass = `tile-root ${large ? 'tile-root--large' : 'tile-root--small'} ${
    speaking ? 'tile-speaking-active' : ''
  }`;

  return (
    <div className={rootClass}>
      <div className="tile-media" style={{ background }}>
        {role === 'candidate' && camOn ? (
          <NativeWebcam videoConstraints={VIDEO_CONSTRAINTS} />
        ) : (
          <AvatarDisplay
            char={avatarChar || name?.[0] || 'A'}
            color={color}
            speaking={speaking}
            role={role}
            name={name}
            showMeta={large}
          />
        )}

        <div className="tile-badge">
          {role === 'interviewer' && speaking && <Volume2 size={11} color={color} />}
          {muted && <MicOff size={11} color="var(--color-danger)" />}
          <span className="tile-badge-name">{name}</span>
        </div>
      </div>
    </div>
  );
}

function AvatarDisplay({ char, color, speaking, role, name, showMeta }: AvatarDisplayProps) {
  return (
    <div className="avatar-root">
      <div
        className="avatar-circle"
        style={{
          borderColor: speaking ? color : 'rgba(255, 255, 255, 0.14)',
          boxShadow: speaking ? `0 0 40px -8px ${color}` : 'none',
        }}
      >
        <span className="avatar-char">{char}</span>
      </div>

      {showMeta && (
        <div className="text-center">
          <p className="text-[13px] font-medium text-white/90">{name}</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/40">
            {role === 'interviewer' ? 'AI interviewer' : 'Camera off'}
          </p>
        </div>
      )}

      {role === 'interviewer' && speaking && (
        <div className="avatar-wave-row" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => (
            <span key={index} className="avatar-bar" style={{ animationDelay: `${index * 0.12}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Webcam element that aggressively manages track destruction. */
function NativeWebcam({ videoConstraints }: { videoConstraints?: MediaTrackConstraints }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints || true,
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error('Failed to grab camera:', err);
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [videoConstraints]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="tile-video"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
}

export default memo(VideoTile);
