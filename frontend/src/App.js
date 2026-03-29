import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './components/LandingPage';
import UploadScreen from './components/UploadScreen';
import InterviewRoom from './components/InterviewRoom';
import EndScreen from './components/EndScreen';

/* ── Page transition wrapper ─────────────────────────────────────────────── */
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeIn' } },
};

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * App — root component managing route-based navigation with Framer Motion transitions.
 * Routes: / (landing) → /upload → /interview → /end
 */
export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<AnimatedPage><UploadScreen /></AnimatedPage>} />
        <Route path="/interview" element={<AnimatedPage><InterviewRoom /></AnimatedPage>} />
        <Route path="/end" element={<AnimatedPage><EndScreen /></AnimatedPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
