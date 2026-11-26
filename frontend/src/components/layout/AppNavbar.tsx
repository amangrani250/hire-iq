import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme } from '../../contexts/ThemeContext';
import { getEnabledFeatures } from '../../config/features';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import Button from '../ui/Button';
import type { ThemeMode } from '../../types';

const NAV_LABELS: Record<string, string> = {
  '/tech-interview': 'Technical',
  '/builder': 'Resume',
  '/saved': 'Saved',
  '/job-prep': 'Job prep',
  '/job-roadmap': 'Roadmap',
};

const LINKS = [
  { to: '/upload', label: 'Practice' },
  ...getEnabledFeatures().map((feature) => ({
    to: feature.path,
    label: NAV_LABELS[feature.path] ?? feature.label,
  })),
];

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function AppNavbar() {
  const { pathname } = useLocation();
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-nav border-b border-border/70 bg-background/75 backdrop-blur-2xl no-print">
      <div className="container-page flex h-full items-center justify-between gap-4">
        <div className="flex items-center gap-7">
          <Logo />
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button as={Link} to="/upload" size="sm" className="hidden md:inline-flex">
            Start a session
            <ArrowRight size={14} />
          </Button>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm lg:hidden"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-navigation"
          className="max-h-[calc(100dvh-var(--nav-height))] overflow-y-auto border-t border-border bg-popover px-4 pb-4 pt-3 shadow-lg lg:hidden"
        >
          <nav className="flex flex-col gap-0.5" aria-label="Mobile">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                {link.label}
                <ArrowRight size={14} className="text-muted-foreground" />
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Appearance</span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground/70">
                {mode}
              </span>
            </div>
            <div className="segmented w-full" role="group" aria-label="Colour theme">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={cn('segmented-item flex-1', mode === value && 'segmented-item-active')}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/upload"
            className="btn btn-primary mt-3 w-full"
            onClick={() => setOpen(false)}
          >
            Start a session
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </header>
  );
}
