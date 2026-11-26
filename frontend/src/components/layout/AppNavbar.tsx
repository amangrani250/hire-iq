import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme } from '../../contexts/ThemeContext';
import { getEnabledFeatures } from '../../config/features';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import Button from '../ui/Button';
import type { ThemeMode } from '../../types';

interface NavLinkItem {
  to: string;
  label: string;
}

interface NavGroup {
  label: string;
  to?: string;
  items?: NavLinkItem[];
  match?: string[];
}

const enabledPaths = new Set(getEnabledFeatures().map((feature) => feature.path));

const PRACTICE_ITEMS: NavLinkItem[] = [
  { to: '/upload', label: 'Resume interview' },
  { to: '/tech-interview', label: 'Technical round' },
  { to: '/job-prep', label: 'Job prep' },
].filter((item) => item.to === '/upload' || enabledPaths.has(item.to));

const RESUME_ITEMS: NavLinkItem[] = [
  { to: '/builder', label: 'Resume builder' },
  { to: '/saved', label: 'Saved resumes' },
].filter((item) => enabledPaths.has(item.to));

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Practice',
    items: PRACTICE_ITEMS,
    match: ['/upload', '/tech-interview', '/job-prep', '/job-roadmap'],
  },
  {
    label: 'Resume',
    items: RESUME_ITEMS,
    match: ['/builder', '/saved'],
  },
  ...(enabledPaths.has('/coding-lab')
    ? [{ label: 'Code Lab', to: '/coding-lab' }]
    : []),
].filter((group) => (group.items?.length ?? 0) > 0 || group.to);

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function groupIsActive(group: NavGroup, pathname: string): boolean {
  if (group.to) return pathname === group.to;
  if (group.match?.includes(pathname)) return true;
  return group.items?.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ?? false;
}

function deviceSupportsHover(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
}

export default function AppNavbar() {
  const { pathname } = useLocation();
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const lastPointerTypeRef = useRef<string>('mouse');

  useEffect(() => {
    setOpen(false);
    setOpenDesktopMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const activeGroup = NAV_GROUPS.find((group) => group.items && groupIsActive(group, pathname));
    setOpenMobileGroup(activeGroup?.label ?? null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, pathname]);

  useEffect(() => {
    if (!openDesktopMenu) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!desktopNavRef.current?.contains(event.target as Node)) {
        setOpenDesktopMenu(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenDesktopMenu(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openDesktopMenu]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-nav border-b border-border/70 bg-background/75 backdrop-blur-2xl no-print">
      <div className="container-page flex h-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5 xl:gap-7">
          <Logo />
          <nav ref={desktopNavRef} className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {NAV_GROUPS.map((group) => {
              if (group.to) {
                return (
                  <NavLink
                    key={group.label}
                    to={group.to}
                    className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
                  >
                    {group.label}
                  </NavLink>
                );
              }

              const isActive = groupIsActive(group, pathname);
              const isOpen = openDesktopMenu === group.label;
              const panelId = `nav-panel-${group.label.toLowerCase().replace(/\s+/g, '-')}`;

              return (
                <div
                  key={group.label}
                  className="relative"
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setOpenDesktopMenu(group.label);
                  }}
                  onPointerDown={(event) => {
                    lastPointerTypeRef.current = event.pointerType;
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') {
                      setOpenDesktopMenu((current) => (current === group.label ? null : current));
                    }
                  }}
                >
                  <button
                    type="button"
                    className={cn('nav-link', isActive && 'nav-link-active')}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => {
                      if (lastPointerTypeRef.current === 'mouse' && deviceSupportsHover()) {
                        // Hover already opens the menu; a click should keep it
                        // open instead of immediately closing it again.
                        setOpenDesktopMenu(group.label);
                      } else {
                        setOpenDesktopMenu(isOpen ? null : group.label);
                      }
                    }}
                  >
                    {group.label}
                    <ChevronDown
                      size={12}
                      className={cn('transition-transform', isOpen && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full z-50 pt-2">
                      <div id={panelId} className="menu w-56" role="menu" aria-label={group.label}>
                        {group.items?.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            role="menuitem"
                            onClick={() => setOpenDesktopMenu(null)}
                            className={({ isActive: itemActive }) =>
                              cn('menu-item', itemActive && 'menu-item-active')
                            }
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
            {NAV_GROUPS.map((group) => {
              if (group.to) {
                return (
                  <NavLink
                    key={group.label}
                    to={group.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )
                    }
                  >
                    {group.label}
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </NavLink>
                );
              }

              const isActive = groupIsActive(group, pathname);
              const isExpanded = openMobileGroup === group.label;
              const panelId = `mobile-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`;

              return (
                <div key={group.label}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => setOpenMobileGroup(isExpanded ? null : group.label)}
                  >
                    {group.label}
                    <ChevronDown
                      size={15}
                      className={cn('transition-transform', isExpanded && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>

                  {isExpanded && (
                    <div id={panelId} className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                      {group.items?.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive: itemActive }) =>
                            cn(
                              'flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                              itemActive
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )
                          }
                        >
                          {item.label}
                          <ArrowRight size={13} className="text-muted-foreground" />
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
