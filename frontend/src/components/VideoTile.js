import React from 'react';
import Webcam from 'react-webcam';
import { MicOff, Volume2 } from 'lucide-react';

const VIDEO_CONSTRAINTS = { facingMode: 'environment' };

/**
 * VideoTile — a single participant tile in the interview room.
 * Shows either the webcam feed (candidate) or an animated avatar (interviewer).
 *
 * @param {{
 *   role: 'interviewer' | 'candidate',
 *   name: string,
 *   camOn?: boolean,
 *   speaking?: boolean,
 *   muted?: boolean,
 *   large?: boolean,
 *   avatarChar?: string,
 *   accentColor?: string,
 * }} props
 */
export default function VideoTile({
  role,
  name,
  camOn,
  speaking,
  muted,
  large,
  avatarChar,
  accentColor,
}) {
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    if (!camOn && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [camOn]);

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const color = accentColor || '#4f8ef7';
  const bg = role === 'interviewer' ? '#1a2236' : '#0f1520';

  const rootClass = `tile-root ${large ? 'tile-root--large' : 'tile-root--small'}`;

  return (
    <div className={rootClass}>
      <div className="tile-media" style={{ background: bg }}>
        {role === 'candidate' && camOn ? (
          <Webcam
            audio={false}
            videoConstraints={VIDEO_CONSTRAINTS}
            className="tile-video"
            onUserMedia={(stream) => { streamRef.current = stream; }}
          />
        ) : (
          <AvatarDisplay
            char={avatarChar || name?.[0] || 'A'}
            color={color}
            speaking={speaking}
            role={role}
          />
        )}

        {/* Speaking ring */}
        {speaking && (
          <div className="tile-speak-ring" style={{ borderColor: color }} />
        )}

        {/* Name badge */}
        <div className="tile-badge">
          {role === 'interviewer' && speaking && (
            <Volume2 size={12} color={color} />
          )}
          {muted && <MicOff size={12} color="var(--red)" />}
          <span className="tile-badge-name">{name}</span>
        </div>
      </div>
    </div>
  );
}

/** Animated avatar circle with optional voice wave bars. */
function AvatarDisplay({ char, color, speaking, role }) {
  return (
    <div className="avatar-root">
      {/* Outer glow rings when speaking */}
      {speaking && (
        <>
          <div
            className="avatar-ring"
            style={{ borderColor: color, animationDelay: '0s' }}
          />
          <div
            className="avatar-ring"
            style={{ borderColor: color, animationDelay: '0.4s' }}
          />
        </>
      )}

      {/* Circle avatar */}
      <div
        className="avatar-circle"
        style={{
          background: `linear-gradient(135deg, ${color}44, ${color}22)`,
          border: `2px solid ${speaking ? color : color + '44'}`,
          boxShadow: speaking ? `0 0 24px ${color}55` : 'none',
        }}
      >
        <span className="avatar-char">{char}</span>
      </div>

      {/* Sound wave bars when interviewer is speaking */}
      {role === 'interviewer' && speaking && (
        <div className="avatar-wave-row">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="avatar-bar"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
