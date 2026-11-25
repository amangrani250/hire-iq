import { memo, useEffect, useRef, useCallback } from 'react';
import { Bot, User, RotateCcw, ArrowRight } from 'lucide-react';
import type { Message } from '../types';

interface TranscriptPanelProps {
  messages: Message[];
  visible: boolean;
  interimText?: string;
  canRequestRepeat?: boolean;
  canRequestNext?: boolean;
  onRepeat?: () => void;
  onNext?: () => void;
}

const TranscriptPanel = memo(function TranscriptPanel({
  messages, visible, interimText,
  canRequestRepeat, canRequestNext, onRepeat, onNext,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 60;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkAtBottom, { passive: true });
    return () => el.removeEventListener('scroll', checkAtBottom);
  }, [checkAtBottom]);

  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages, interimText]);

  if (!visible) return null;

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <span className="transcript-title">Live Transcript</span>
        <span className="transcript-count">{messages.length} messages</span>
      </div>

      <div className="transcript-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="transcript-empty">
            Transcript will appear here as the interview progresses...
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
                {m.speaker === 'interviewer' ? 'Aira (AI)' : 'You'}
              </span>
              <p className="transcript-text">{m.text}</p>
            </div>
          </div>
        ))}

        {interimText && (
          <div className="transcript-msg transcript-msg--user">
            <div className="transcript-avatar-wrap">
              <div className="transcript-avatar" style={{ background: 'rgba(48,217,134,0.15)', color: 'var(--green)' }}>
                <User size={14} />
              </div>
            </div>
            <div className="transcript-bubble">
              <span className="transcript-speaker">You</span>
              <p className="transcript-text transcript-text--interim">{interimText}</p>
            </div>
          </div>
        )}
      </div>

      {(canRequestRepeat || canRequestNext) && (
        <div className="transcript-actions">
          {canRequestRepeat && onRepeat && (
            <button type="button" onClick={onRepeat} className="transcript-action-btn" title="Repeat question">
              <RotateCcw size={14} />
              <span>Repeat</span>
            </button>
          )}
          {canRequestNext && onNext && (
            <button type="button" onClick={onNext} className="transcript-action-btn transcript-action-btn--primary" title="Next question">
              <ArrowRight size={14} />
              <span>Next</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default TranscriptPanel;
