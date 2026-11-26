import { useEffect, useRef } from 'react';
import { Check, Image as ImageIcon, Sparkles } from 'lucide-react';
import { BACKGROUNDS } from '../lib/backgrounds';
import type { VirtualBackgroundId } from '../types';

interface BackgroundPickerProps {
  open: boolean;
  value: VirtualBackgroundId;
  effectsReady: boolean;
  effectsError: boolean;
  onChange: (value: VirtualBackgroundId) => void;
  onClose: () => void;
}

export default function BackgroundPicker({
  open,
  value,
  effectsReady,
  effectsError,
  onChange,
  onClose,
}: BackgroundPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bg-picker" ref={panelRef} role="dialog" aria-label="Virtual background">
      <div className="bg-picker-head">
        <div>
          <p className="bg-picker-title">
            <ImageIcon size={14} /> Virtual background
          </p>
          <p className="bg-picker-sub">Camera effects are recorded into the interview video.</p>
        </div>
        <span className={`bg-picker-model ${effectsReady ? 'is-ready' : effectsError ? 'is-error' : ''}`}>
          <Sparkles size={11} />
          {effectsReady ? 'Ready' : effectsError ? 'Unavailable' : 'Loading'}
        </span>
      </div>

      <div className="bg-picker-grid">
        {BACKGROUNDS.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              className={`bg-option ${active ? 'bg-option--active' : ''}`}
              onClick={() => {
                onChange(option.id);
                onClose();
              }}
              aria-pressed={active}
            >
              <span className={`bg-option-preview bg-option-preview--${option.id}`}>
                {option.image && <img src={option.image} alt="" loading="lazy" />}
                {active && (
                  <span className="bg-option-check">
                    <Check size={13} />
                  </span>
                )}
              </span>
              <span className="bg-option-label">{option.label}</span>
            </button>
          );
        })}
      </div>

      <p className="bg-picker-note">
        Wear headphones for the cleanest recording. Backgrounds run locally in your browser.
      </p>
    </div>
  );
}
