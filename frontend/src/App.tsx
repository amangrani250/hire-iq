import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { ResumeProvider } from './contexts/ResumeContext';
import Navbar from './components/layout/Navbar';
import LandingPage from './components/LandingPage';
import UploadScreen from './components/UploadScreen';
import InterviewRoom from './components/InterviewRoom';
import EndScreen from './components/EndScreen';
import BuilderPage from './pages/BuilderPage';
import SavedPage from './pages/SavedPage';
import TechInterviewSetup from './pages/TechInterviewSetup';
import JobPrepPage from './pages/JobPrepPage';
import JobRoadmapPage from './pages/JobRoadmapPage';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeIn' } },
};

function AnimatedPage({ children }: { children: ReactNode }) {
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

export default function App() {
  const location = useLocation();
  const showNavbar = location.pathname.startsWith('/builder')
    || location.pathname.startsWith('/saved')
    || location.pathname.startsWith('/tech-interview');

  return (
    <ThemeProvider>
      <ResumeProvider>
        {showNavbar && <Navbar />}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/upload" element={<AnimatedPage><UploadScreen /></AnimatedPage>} />
            <Route path="/interview" element={<AnimatedPage><InterviewRoom /></AnimatedPage>} />
            <Route path="/end" element={<AnimatedPage><EndScreen /></AnimatedPage>} />
            <Route path="/builder" element={<AnimatedPage><BuilderPage /></AnimatedPage>} />
            <Route path="/saved" element={<AnimatedPage><SavedPage /></AnimatedPage>} />
            <Route path="/tech-interview" element={<AnimatedPage><TechInterviewSetup /></AnimatedPage>} />
            <Route path="/job-prep" element={<AnimatedPage><JobPrepPage /></AnimatedPage>} />
            <Route path="/job-roadmap" element={<AnimatedPage><JobRoadmapPage /></AnimatedPage>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontSize: '13px',
              borderRadius: '12px',
              padding: '10px 14px',
            },
            duration: 3000,
          }}
        />
      </ResumeProvider>
    </ThemeProvider>
  );
}
