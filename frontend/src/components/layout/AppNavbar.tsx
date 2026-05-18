import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Zap, Sun, Moon, Menu, X, Play } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getEnabledFeatures } from '../../config/features';
import { motion, AnimatePresence } from 'framer-motion';

export default function AppNavbar() {
  const { dark, toggle } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLanding = pathname === '/';

  const navLinks = useMemo(() => {
    return getEnabledFeatures().map((f) => ({ to: f.path, label: f.label }));
  }, []);

  const anchorLinks = isLanding
    ? [
        { href: '#features', label: 'Features' },
        { href: '#advantages', label: 'Why HireIQ' },
      ]
    : [];

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <motion.nav
        className="landing-nav"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="landing-nav-inner">
          <Link to="/" className="landing-nav-logo" onClick={closeMenu}>
            <div className="landing-nav-logo-icon"><Zap size={16} color="#fff" /></div>
            <span className="landing-nav-logo-text">HireIQ</span>
          </Link>

          <div className="landing-nav-links">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`landing-nav-link ${pathname === l.to ? 'landing-nav-link--active' : ''}`}
                onClick={closeMenu}
              >
                {l.label}
              </Link>
            ))}
            {anchorLinks.map((a) => (
              <a key={a.href} href={a.href} className="landing-nav-link">{a.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <motion.button
              className="landing-nav-cta"
              onClick={() => navigate('/upload')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Start Interview
            </motion.button>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggle}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden fixed inset-x-0 top-[52px] z-[998] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    pathname === l.to
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              {anchorLinks.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                >
                  {a.label}
                </a>
              ))}

              <hr className="my-3 border-gray-100 dark:border-gray-800" />

              <button
                onClick={() => { navigate('/upload'); closeMenu(); }}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all"
              >
                <Play size={16} /> Start Interview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
