import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ResumeProvider } from './context/ResumeContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LandingPage from './components/LandingPage';
import UploadScreen from './components/UploadScreen';
import InterviewRoom from './components/InterviewRoom';
import EndScreen from './components/EndScreen';
import BuilderPage from './pages/BuilderPage';
import SavedPage from './pages/SavedPage';
import TechInterviewSetup from './pages/TechInterviewSetup';
import { cn } from './lib/cn';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function PageTransition({ children }) {
  const reduceMotion = useReducedMotion();

  const variants = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        },
        exit: { opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } },
      };

  return (
    <motion.div variants={variants} initial="initial" animate="animate" exit="exit" className="min-h-full">
      {children}
    </motion.div>
  );
}

function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 3200,
        style: {
          background: 'hsl(var(--popover))',
          color: 'hsl(var(--popover-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          boxShadow: 'var(--shadow-popover)',
        },
        success: {
          iconTheme: { primary: 'hsl(var(--success))', secondary: 'hsl(var(--popover))' },
        },
        error: {
          iconTheme: { primary: 'hsl(var(--danger))', secondary: 'hsl(var(--popover))' },
        },
      }}
      key={theme}
    />
  );
}

/**
 * App — global shell, route transitions, and product flow:
 * / → /upload → /interview → /end
 * /tech-interview → /interview
 * /builder → /saved
 */
export default function App() {
  const location = useLocation();
  const isInterviewRoom = location.pathname.startsWith('/interview');

  return (
    <ThemeProvider>
      <ResumeProvider>
        <ScrollToTop />
        <div className="flex min-h-dvh flex-col bg-background">
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>

          {!isInterviewRoom && <Navbar />}

          <main
            id="main-content"
            className={cn('flex-1', !isInterviewRoom && 'pt-nav')}
          >
            <AnimatePresence mode="wait" initial={false}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
                <Route path="/upload" element={<PageTransition><UploadScreen /></PageTransition>} />
                <Route path="/interview" element={<PageTransition><InterviewRoom /></PageTransition>} />
                <Route path="/end" element={<PageTransition><EndScreen /></PageTransition>} />
                <Route path="/builder" element={<PageTransition><BuilderPage /></PageTransition>} />
                <Route path="/saved" element={<PageTransition><SavedPage /></PageTransition>} />
                <Route path="/tech-interview" element={<PageTransition><TechInterviewSetup /></PageTransition>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </main>

          {!isInterviewRoom && <Footer />}
        </div>
        <AppToaster />
      </ResumeProvider>
    </ThemeProvider>
  );
}
