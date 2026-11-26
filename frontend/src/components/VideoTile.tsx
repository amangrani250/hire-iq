import { memo, useEffect, useRef } from 'react';
import { MicOff, Volume2 } from 'lucide-react';

export interface VideoTileProps {
  role: 'interviewer' | 'candidate';
  name: string;
  camOn?: boolean;
  speaking?: boolean;
  muted?: boolean;
  large?: boolean;
  avatarChar?: string;
  accentColor?: string;
  stream?: MediaStream | null;
  cameraReady?: boolean;
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
  stream,
  cameraReady,
}: VideoTileProps) {
  const color = accentColor || 'var(--color-primary)';
  const showCamera = role === 'candidate' && camOn && cameraReady && !!stream;
  const background =
    role === 'interviewer'
      ? 'radial-gradient(circle at 50% 20%, #1a2550 0%, #070c18 70%)'
      : '#070c18';

  const rootClass = `tile-root ${large ? 'tile-root--large' : 'tile-root--small'} ${
    speaking ? 'tile-speaking-active' : ''
  }`;

  return (
    <div className={rootClass}>
      <div className="tile-media" style={{ background }}>
        {showCamera ? (
          <ProcessedVideo stream={stream} />
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

/** The processed canvas stream (virtual background + recording feed). */
function ProcessedVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.srcObject = stream;
    video.play().catch(() => undefined);
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="tile-video"
    />
  );
}

export default memo(VideoTile);
