import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';

/**
 * TranscriptPanel — shows the live conversation transcript.
 * On mobile it appears below the video area; on desktop it docks to the right.
 *
 * @param {{ messages: Array<{speaker: string, text: string}>, visible: boolean }} props
 */
export default function TranscriptPanel({ messages, visible }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!visible) return null;

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <span className="transcript-title">Live Transcript</span>
        <span className="transcript-count">{messages.length} messages</span>
      </div>

      <div className="transcript-scroll">
        {messages.length === 0 && (
          <p className="transcript-empty">
            Transcript will appear here as the interview progresses…
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`transcript-msg ${m.speaker !== 'interviewer' ? 'transcript-msg--user' : ''}`}
          >
            <div className="transcript-avatar-wrap">
              {m.speaker === 'interviewer' ? (
                <div
                  className="transcript-avatar"
                  style={{ background: 'rgba(79,142,247,0.18)', color: 'var(--accent)' }}
                >
                  <Bot size={14} />
                </div>
              ) : (
                <div
                  className="transcript-avatar"
                  style={{ background: 'rgba(48,217,134,0.15)', color: 'var(--green)' }}
                >
                  <User size={14} />
                </div>
              )}
            </div>
            <div className="transcript-bubble">
              <span className="transcript-speaker">
                {m.speaker === 'interviewer' ? 'Alex (AI)' : 'You'}
              </span>
              <p className="transcript-text">{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
