import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { ResumeProvider } from './contexts/ResumeContext';
import { QueryProvider } from './providers/QueryProvider';
import AppNavbar from './components/layout/AppNavbar';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/ui/ErrorBoundary';
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
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } },
};

function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="min-h-full">
      {children}
    </motion.div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
      Loading…
    </div>
  );
}

function LazyRoute({ Component }: { Component: LazyExoticComponent<ComponentType> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnimatedPage>
        <Component />
      </AnimatedPage>
    </Suspense>
  );
}

function FeatureRoute({ path, Component }: { path: string; Component: LazyExoticComponent<ComponentType> }) {
  const featureKey = path.replace(/^\//, '');
  if (!isFeatureEnabled(featureKey)) return <Navigate to="/" replace />;
  return <LazyRoute Component={Component} />;
}

export default function App() {
  const location = useLocation();
  const isInterviewRoom = location.pathname.startsWith('/interview');

  return (
    <MotionConfig reducedMotion="user">
      <QueryProvider>
        <ThemeProvider>
          <ResumeProvider>
            <div className="flex min-h-dvh flex-col bg-background">
              <a href="#main-content" className="skip-link">
                Skip to content
              </a>

              {!isInterviewRoom && <AppNavbar />}

              <main
                id="main-content"
                className={`flex-1 ${isInterviewRoom ? '' : 'pt-nav'}`}
              >
                <ErrorBoundary key={location.pathname}>
                  <AnimatePresence mode="wait" initial={false}>
                    <Routes location={location} key={location.pathname}>
                    <Route
                      path="/"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AnimatedPage>
                            <LandingPage />
                          </AnimatedPage>
                        </Suspense>
                      }
                    />
                    <Route path="/upload" element={<LazyRoute Component={UploadScreen} />} />
                    <Route path="/interview" element={<LazyRoute Component={InterviewRoom} />} />
                    <Route path="/end" element={<LazyRoute Component={EndScreen} />} />
                    <Route path="/builder" element={<FeatureRoute path="/builder" Component={BuilderPage} />} />
                    <Route path="/saved" element={<FeatureRoute path="/saved" Component={SavedPage} />} />
                    <Route
                      path="/tech-interview"
                      element={<FeatureRoute path="/tech-interview" Component={TechInterviewSetup} />}
                    />
                    <Route path="/job-prep" element={<FeatureRoute path="/job-prep" Component={JobPrepPage} />} />
                    <Route
                      path="/job-roadmap"
                      element={<FeatureRoute path="/job-roadmap" Component={JobRoadmapPage} />}
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  </AnimatePresence>
                </ErrorBoundary>
              </main>

              {!isInterviewRoom && <Footer />}
            </div>

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
            />
          </ResumeProvider>
        </ThemeProvider>
      </QueryProvider>
    </MotionConfig>
  );
}
