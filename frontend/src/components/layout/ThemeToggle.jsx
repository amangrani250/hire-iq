import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function ThemeToggle({ className }) {
  const { mode, setMode, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const ActiveIcon = theme === 'dark' ? Moon : Sun;

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        type="button"
        className="btn btn-ghost btn-sm h-9 gap-1 rounded-md px-2.5"
        aria-label={`Theme: ${theme}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ActiveIcon size={15} />
        <ChevronDown size={12} className="text-muted-foreground/70" />
      </button>

      {open && (
        <div className="menu absolute right-0 top-full z-50 mt-2 w-40" role="menu" aria-label="Colour theme">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={mode === value}
              className={cn('menu-item', mode === value && 'menu-item-active')}
              onClick={() => {
                setMode(value);
                setOpen(false);
              }}
            >
              <Icon size={14} />
              <span className="flex-1">{label}</span>
              {mode === value && <Check size={13} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
