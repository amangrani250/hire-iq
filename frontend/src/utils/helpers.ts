import type { Message } from '../types';

export function getMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export function formatTime(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
}

export function sanitizeText(text: string, maxLen: number = 2000): string {
  return text.trim().slice(0, maxLen);
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function buildTranscriptText(messages: Message[]): string {
  return messages
    .map((m) => `${m.speaker === 'interviewer' ? 'Aira' : 'Candidate'}: ${m.text}`)
    .join('\n');
}

export function getAtsColor(score: number): string {
  if (score >= 80) return 'var(--green)';
  if (score >= 60) return 'var(--amber)';
  return 'var(--red)';
}

export function getAtsLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  return 'Needs Improvement';
}

export function getAtsTextColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

export function getAtsRingColor(score: number): string {
  if (score >= 80) return 'stroke-green-500';
  if (score >= 60) return 'stroke-yellow-500';
  return 'stroke-red-500';
}

export function stopAllMediaTracks(): void {
  try {
    const videos = document.querySelectorAll('video');
    videos.forEach((v) => {
      const s = v.srcObject;
      if (s && typeof (s as MediaStream).getTracks === 'function') {
        (s as MediaStream).getTracks().forEach((t) => {
          try { t.stop(); } catch { /* ignore */ }
        });
      }
      try { v.srcObject = null; } catch { /* ignore */ }
    });
  } catch { /* ignore */ }
}
