import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, type ReactNode, type LazyExoticComponent, type ComponentType } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ResumeProvider } from './contexts/ResumeContext';
import { QueryProvider } from './providers/QueryProvider';
import AppNavbar from './components/layout/AppNavbar';
import { isFeatureEnabled } from './config/features';

const LandingPage = lazy(() => import('./components/LandingPage'));
const UploadScreen = lazy(() => import('./components/UploadScreen'));
const InterviewRoom = lazy(() => import('./components/InterviewRoom'));
const EndScreen = lazy(() => import('./components/EndScreen'));
const BuilderPage = lazy(() => import('./pages/BuilderPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const TechInterviewSetup = lazy(() => import('./pages/TechInterviewSetup'));
const JobPrepPage = lazy(() => import('./pages/JobPrepPage'));
const JobRoadmapPage = lazy(() => import('./pages/JobRoadmapPage'));

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

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      Loading...
    </div>
  );
}

function LazyRoute({ Component }: { Component: LazyExoticComponent<ComponentType> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnimatedPage><Component /></AnimatedPage>
    </Suspense>
  );
}

function FeatureRoute({ path, Component }: { path: string; Component: LazyExoticComponent<ComponentType> }) {
  const featureKey = path.replace(/^\//, '');
  if (!isFeatureEnabled(featureKey)) {
    return <Navigate to="/" replace />;
  }
  return <LazyRoute Component={Component} />;
}

export default function App() {
  const location = useLocation();

  return (
    <QueryProvider>
      <ThemeProvider>
        <ResumeProvider>
          <AppNavbar />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Suspense fallback={<PageSkeleton />}><LandingPage /></Suspense>} />
            <Route path="/upload" element={<LazyRoute Component={UploadScreen} />} />
            <Route path="/interview" element={<LazyRoute Component={InterviewRoom} />} />
            <Route path="/end" element={<LazyRoute Component={EndScreen} />} />
            <Route path="/builder" element={<FeatureRoute path="/builder" Component={BuilderPage} />} />
            <Route path="/saved" element={<FeatureRoute path="/saved" Component={SavedPage} />} />
            <Route path="/tech-interview" element={<FeatureRoute path="/tech-interview" Component={TechInterviewSetup} />} />
            <Route path="/job-prep" element={<FeatureRoute path="/job-prep" Component={JobPrepPage} />} />
            <Route path="/job-roadmap" element={<FeatureRoute path="/job-roadmap" Component={JobRoadmapPage} />} />
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
    </QueryProvider>
  );
}
