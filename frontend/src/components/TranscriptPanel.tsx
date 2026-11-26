import { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Bot, User, RotateCcw, ArrowRight, Send } from 'lucide-react';
import type { Message } from '../types';

interface TranscriptPanelProps {
  messages: Message[];
  visible: boolean;
  interimText?: string;
  canRequestRepeat?: boolean;
  canRequestNext?: boolean;
  onRepeat?: () => void;
  onNext?: () => void;
  onSendText?: (text: string) => void;
}

const VERDICT_LABEL: Record<string, string> = {
  correct: 'Correct',
  partially_correct: 'Partly correct',
  incorrect: 'Needs correction',
  vague: 'Too vague',
  off_topic: 'Off topic',
  dont_know: 'Answer taught',
  skipped: 'Skipped',
};

function verdictTone(verdict: string): string {
  if (verdict === 'correct') return 'good';
  if (verdict === 'partially_correct') return 'warn';
  if (verdict === 'vague' || verdict === 'off_topic') return 'warn';
  if (verdict === 'incorrect') return 'bad';
  return 'neutral';
}

const TranscriptPanel = memo(function TranscriptPanel({
  messages, visible, interimText,
  canRequestRepeat, canRequestNext, onRepeat, onNext, onSendText,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [draft, setDraft] = useState('');

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

  const submitDraft = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !onSendText) return;
    onSendText(text);
    setDraft('');
  };

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
                  style={{ background: 'hsl(var(--primary) / 0.14)', color: 'hsl(var(--primary))' }}
                >
                  <Bot size={14} />
                </div>
              ) : (
                <div
                  className="transcript-avatar"
                  style={{ background: 'hsl(var(--success) / 0.14)', color: 'hsl(var(--success))' }}
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
              {m.meta?.verdict && (
                <div className={`transcript-eval transcript-eval--${verdictTone(m.meta.verdict)}`}>
                  <span>{VERDICT_LABEL[m.meta.verdict] ?? 'Evaluated'}</span>
                  {typeof m.meta.score === 'number' && (
                    <span className="transcript-eval-score">{m.meta.score}/10</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {interimText && (
          <div className="transcript-msg transcript-msg--user">
            <div className="transcript-avatar-wrap">
              <div className="transcript-avatar" style={{ background: 'hsl(var(--success) / 0.14)', color: 'hsl(var(--success))' }}>
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

      {onSendText && (
        <form className="transcript-compose" onSubmit={submitDraft}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type an answer instead…"
            aria-label="Type your answer"
            autoComplete="off"
          />
          <button type="submit" disabled={!draft.trim()} aria-label="Send answer">
            <Send size={14} />
          </button>
        </form>
      )}

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
