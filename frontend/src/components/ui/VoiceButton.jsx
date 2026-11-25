import { Mic, MicOff } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function VoiceButton({ listening, supported, onToggle, className = '' }) {
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={listening ? 'Stop recording' : 'Start voice input'}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      aria-pressed={listening}
      className={cn(
        'btn btn-icon relative h-10 w-10 shrink-0 rounded-lg',
        listening ? 'btn-danger' : 'btn-secondary',
        className
      )}
    >
      {listening ? <MicOff size={17} /> : <Mic size={17} />}
      {listening && (
        <span className="absolute inset-0 rounded-lg border-2 border-danger motion-safe:animate-pulse-soft" />
      )}
    </button>
  );
}
