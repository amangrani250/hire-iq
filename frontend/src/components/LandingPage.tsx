import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import {
  Zap, Upload, Mic, Brain, MessageSquare, Shield,
  Clock, Sparkles, ArrowRight, ChevronDown, Bot,
  FileText, Volume2, Eye, BarChart3, Globe, Star,
  CheckCircle, Play, Users, Cpu, Layers,
} from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.6, delay: i * 0.12, ease },
  }),
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

function FloatingOrb({ color, size, top, left, delay = 0 }: { color: string; size: number; top: string; left: string; delay?: number }) {
  return (
    <div
      className="landing-orb"
      style={{
        width: size, height: size, top, left,
        background: `radial-gradient(circle, ${color}30, ${color}05)`,
        border: `1px solid ${color}15`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function AnimatedStat({ value, suffix = '', label }: { value: string; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    const duration = 2000;
    const stepTime = Math.max(Math.floor(duration / end), 20);
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div className="landing-stat" variants={fadeUp}>
      <span className="landing-stat-value">{count}{suffix}</span>
      <span className="landing-stat-label">{label}</span>
    </motion.div>
  );
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  action?: () => void;
}

interface Advantage {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface Step {
  num: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export default function LandingPage() {
  useDocumentMeta(undefined, 'AI-powered interview coach and resume builder. Practice with a realistic AI interviewer.');
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  const features: Feature[] = [
    { icon: <Layers size={24} />, title: 'AI Resume Builder', desc: 'Create, refine, and export professional resumes in minutes. Our AI helps you highlight your strengths and stand out from the competition.', color: 'var(--accent)' },
    { icon: <Cpu size={24} />, title: 'Smart Mock Interviews', desc: 'Practice with an AI interviewer that adapts to your experience level and target role. Get asked relevant questions that mirror real interviews.', color: 'var(--amber)' },
    { icon: <Brain size={24} />, title: 'Personalized Roadmaps', desc: 'Pick your dream job and receive a day-by-day preparation plan. Complete each step, then face a tailored AI interview.', color: '#10b981', action: () => navigate('/job-prep') },
    { icon: <Volume2 size={24} />, title: 'Natural Voice Conversations', desc: 'Speak naturally with automatic voice detection — no buttons to press. Our AI listens, understands, and responds in real time.', color: 'var(--accent-2)' },
    { icon: <MessageSquare size={24} />, title: 'Live Transcript & Review', desc: 'Every word is captioned in real time. Review your responses after the session to identify areas for improvement.', color: '#e06cf5' },
    { icon: <Star size={24} />, title: 'Instant Performance Feedback', desc: 'Get structured AI evaluation at the end of every session with actionable insights to help you improve faster.', color: '#f56c6c' },
  ];

  const advantages: Advantage[] = [
    { icon: <Clock size={20} />, title: 'All-in-One Platform', desc: 'From building the perfect resume to practicing interviews, everything you need is in one place.' },
    { icon: <Shield size={20} />, title: 'Practice Without Pressure', desc: 'Build confidence in a private, judgment-free environment before facing real hiring managers.' },
    { icon: <Sparkles size={20} />, title: 'Tailored to Your Goals', desc: 'Whether you are aiming for a startup or a Fortune 500 company, interviews adapt to your background.' },
    { icon: <Globe size={20} />, title: 'Completely Free', desc: 'No subscriptions, no credit cards, no hidden fees. Unlimited practice sessions, always free.' },
    { icon: <BarChart3 size={20} />, title: 'Track Your Progress', desc: 'See how you improve over time with detailed feedback on your answers, confidence, and readiness.' },
    { icon: <Users size={20} />, title: 'Any Role, Any Industry', desc: 'From software engineering to marketing, finance to design — prepare for any career path.' },
  ];

  const steps: Step[] = [
    { num: '01', icon: <FileText size={28} />, title: 'Build or Upload Your Resume', desc: 'Use our AI builder to craft a standout resume from scratch, or upload your existing one instantly.' },
    { num: '02', icon: <Mic size={28} />, title: 'Choose Your Interview Type', desc: 'Pick a comprehensive interview based on your resume, or focus on specific skills and topics.' },
    { num: '03', icon: <Play size={28} />, title: 'Practice with AI', desc: 'Have a natural conversation with your AI interviewer. Answer questions, get follow-ups, just like the real thing.' },
    { num: '04', icon: <BarChart3 size={28} />, title: 'Review & Improve', desc: 'Get instant feedback on your performance with actionable tips to boost your interview skills.' },
  ];

  return (
    <div className="landing-root">
      <div className="landing-grid" aria-hidden="true" />
      <FloatingOrb color="#4f8ef7" size={400} top="-5%" left="-10%" delay={0} />
      <FloatingOrb color="#7c6af5" size={300} top="15%" left="75%" delay={2} />
      <FloatingOrb color="#30d986" size={250} top="55%" left="-5%" delay={4} />
      <FloatingOrb color="#f5a623" size={200} top="70%" left="80%" delay={3} />

      <motion.section className="landing-hero" style={{ y: heroY, opacity: heroOpacity }}>
        <motion.div className="landing-hero-content" initial="hidden" animate="visible" variants={stagger}>
          <motion.div className="landing-badge" variants={fadeUp} custom={0}>
            <Sparkles size={14} />
            <span>AI-Powered Interview Coach</span>
          </motion.div>

          <motion.h1 className="landing-hero-title" variants={fadeUp} custom={1}>
            Your AI-Powered<br /><span className="landing-hero-gradient">Interview Coach</span>
          </motion.h1>

          <motion.p className="landing-hero-sub" variants={fadeUp} custom={2}>
            Upload your resume and prepare for your dream job with a realistic AI interviewer.
            Get personalized practice with tailored questions — just like the real thing.
            <strong> Completely free.</strong>
          </motion.p>

          <motion.div className="landing-hero-actions" variants={fadeUp} custom={3}>
            <motion.button
              className="landing-btn-primary"
              onClick={() => navigate('/upload')}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 40px rgba(79,142,247,0.4)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Play size={18} /> Start Free Interview
            </motion.button>
            <motion.a href="#how-it-works" className="landing-btn-ghost" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              See How it Works <ArrowRight size={16} />
            </motion.a>
          </motion.div>

          <motion.div className="landing-stats-row" initial="hidden" animate="visible" variants={stagger}>
            <AnimatedStat value="10" suffix="K+" label="Interviews Completed" />
            <div className="landing-stat-divider" />
            <AnimatedStat value="3" suffix="" label="Voice Options" />
            <div className="landing-stat-divider" />
            <AnimatedStat value="100" suffix="%" label="Free to Use" />
          </motion.div>
        </motion.div>

        <motion.div
          className="landing-hero-visual"
          initial={{ opacity: 0, x: 60, rotateY: -8 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease }}
        >
          <div className="landing-mock-card">
            <div className="landing-mock-header">
              <div className="landing-mock-dot" style={{ background: 'var(--red)' }} />
              <div className="landing-mock-dot" style={{ background: 'var(--amber)' }} />
              <div className="landing-mock-dot" style={{ background: 'var(--green)' }} />
              <span className="landing-mock-title">Interview Session — Live</span>
            </div>
            <div className="landing-mock-body">
              <div className="landing-mock-interviewer">
                <div className="landing-mock-avatar"><span>A</span><div className="landing-mock-ring" /></div>
                <div className="landing-mock-wave">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="landing-mock-bar" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              </div>
              <div className="landing-mock-messages">
                <motion.div className="landing-mock-msg landing-mock-msg--ai" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.5 }}>
                  <Bot size={14} /><span>Tell me about a challenging project you've worked on and how you handled it.</span>
                </motion.div>
                <motion.div className="landing-mock-msg landing-mock-msg--user" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2, duration: 0.5 }}>
                  <span>I led a team of five to deliver a key feature under a tight deadline. We prioritized tasks and communicated closely to succeed.</span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="landing-scroll-hint"><ChevronDown size={20} /></div>
      </motion.section>

      <section className="landing-section" id="features">
        <motion.div className="landing-section-header" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.span className="landing-section-tag" variants={fadeUp}>Features</motion.span>
          <motion.h2 className="landing-section-title" variants={fadeUp} custom={1}>
            Everything you need to<br /><span className="landing-hero-gradient">ace your next interview</span>
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp} custom={2}>
            From building your resume to practicing with realistic AI interviews, we give you the tools to succeed.
          </motion.p>
        </motion.div>

        <motion.div className="landing-features-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
          {features.map((f, i) => (
            <motion.div
              key={i} className="landing-feature-card" variants={scaleIn} custom={i}
              whileHover={{ y: -6, boxShadow: `0 12px 40px ${f.color}15` }}
              onClick={f.action || undefined} style={f.action ? { cursor: 'pointer' } : {}}
            >
              <div className="landing-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
              {f.action && <div className="mt-3 text-xs font-semibold" style={{ color: f.color }}>Try It →</div>}
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="landing-section landing-section--alt" id="how-it-works">
        <motion.div className="landing-section-header" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.span className="landing-section-tag" variants={fadeUp}>How it Works</motion.span>
          <motion.h2 className="landing-section-title" variants={fadeUp} custom={1}>
            From preparation to success<br /><span className="landing-hero-gradient">in four simple steps</span>
          </motion.h2>
        </motion.div>
        <div className="landing-steps">
          {steps.map((s, i) => (
            <motion.div key={i} className="landing-step" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i}>
              <div className="landing-step-num">{s.num}</div>
              <div className="landing-step-icon-wrap">
                {s.icon}
                {i < steps.length - 1 && <div className="landing-step-connector" />}
              </div>
              <h3 className="landing-step-title">{s.title}</h3>
              <p className="landing-step-desc">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="advantages">
        <motion.div className="landing-section-header" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.span className="landing-section-tag" variants={fadeUp}>Advantages</motion.span>
          <motion.h2 className="landing-section-title" variants={fadeUp} custom={1}>
            Why job seekers choose<br /><span className="landing-hero-gradient">HireIQ</span>
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp} custom={2}>
            Practice until you're interview-ready — completely free, forever.
          </motion.p>
        </motion.div>
        <motion.div className="landing-advantages-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
          {advantages.map((a, i) => (
            <motion.div key={i} className="landing-advantage-item" variants={fadeUp} custom={i} whileHover={{ x: 4 }}>
              <div className="landing-advantage-icon">{a.icon}</div>
              <div>
                <h3 className="landing-advantage-title">{a.title}</h3>
                <p className="landing-advantage-desc">{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="landing-cta-section">
        <motion.div className="landing-cta-card" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
          <div className="landing-cta-glow" aria-hidden="true" />
          <motion.h2 className="landing-cta-title" variants={fadeUp}>Ready to ace your next interview?</motion.h2>
          <motion.p className="landing-cta-sub" variants={fadeUp} custom={1}>
            Upload your resume and get instant, personalized interview practice. No sign-up required — start right now.
          </motion.p>
          <motion.button className="landing-btn-primary landing-btn-primary--lg" variants={fadeUp} custom={2}
            onClick={() => navigate('/upload')}
            whileHover={{ scale: 1.04, boxShadow: '0 8px 48px rgba(79,142,247,0.45)' }} whileTap={{ scale: 0.97 }}>
            <Zap size={20} /> Launch Interview Now <ArrowRight size={18} />
          </motion.button>
          <motion.p className="landing-cta-note" variants={fadeIn} custom={3}>
            <CheckCircle size={14} /> No account needed · 100% free · Your data stays private
          </motion.p>
        </motion.div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand"><div className="landing-nav-logo-icon"><Zap size={14} color="#fff" /></div><span className="landing-nav-logo-text">HireIQ</span></div>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} HireIQ. Your career journey starts here.</p>
        </div>
      </footer>
    </div>
  );
}
