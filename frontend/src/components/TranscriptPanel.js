import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';

/**
 * TranscriptPanel — live conversation transcript.
 * Docks to the right on desktop and below the video on mobile.
 */
export default function TranscriptPanel({ messages, visible }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!visible) return null;

  return (
    <aside className="transcript-panel" aria-label="Live transcript">
      <div className="transcript-header">
        <span className="transcript-title">Live transcript</span>
        <span className="transcript-count">{messages.length} lines</span>
      </div>

      <div className="transcript-scroll">
        {messages.length === 0 && (
          <p className="transcript-empty">
            The conversation will appear here as soon as Aira starts.
          </p>
        )}

        {messages.map((message, index) => {
          const isInterviewer = message.speaker === 'interviewer';
          return (
            <div
              key={`${message.ts || index}-${index}`}
              className={`transcript-msg ${isInterviewer ? '' : 'transcript-msg--user'}`}
            >
              <span className={`transcript-avatar ${isInterviewer ? 'transcript-avatar--ai' : ''}`}>
                {isInterviewer ? <Bot size={13} /> : <User size={13} />}
              </span>
              <div className="transcript-bubble">
                <span className="transcript-speaker">{isInterviewer ? 'Aira' : 'You'}</span>
                <p className="transcript-text">{message.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </aside>
  );
}
