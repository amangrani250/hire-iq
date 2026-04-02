import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Zap, Upload, Mic, Brain, MessageSquare, Shield,
  Clock, Sparkles, ArrowRight, ChevronDown, Bot,
  FileText, Volume2, Eye, BarChart3, Globe, Star,
  CheckCircle, Play, Users, Cpu
} from 'lucide-react';

/* ── Animation helpers ──────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

/* ── Floating Orb component ─────────────────────────────────────────────────── */
function FloatingOrb({ color, size, top, left, delay = 0 }) {
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

/* ── Animated counter ───────────────────────────────────────────────────────── */
function AnimatedStat({ value, suffix = '', label }) {
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

/* ── Main Landing Page ──────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  const features = [
    {
      icon: <Brain size={24} />,
      title: 'AI-Powered Questions',
      desc: 'Groq LLaMA-3 70B generates tailored technical questions from your actual resume — no generic Q&A.',
      color: 'var(--accent)',
    },
    {
      icon: <Volume2 size={24} />,
      title: 'Realistic Voice',
      desc: 'Natural human-sounding voice via ElevenLabs, OpenAI TTS, or free edge-tts fallback.',
      color: 'var(--green)',
    },
    {
      icon: <Mic size={24} />,
      title: 'Voice Activity Detection',
      desc: 'Automatic silence detection starts and stops recording — speak naturally like a real call.',
      color: 'var(--accent-2)',
    },
    {
      icon: <MessageSquare size={24} />,
      title: 'Live Transcript',
      desc: 'Real-time captions of your entire conversation — review how you answered every question.',
      color: 'var(--amber)',
    },
    {
      icon: <Eye size={24} />,
      title: 'Zoom-Style UI',
      desc: 'Familiar video-call layout with avatar tiles, controls, and an interactive transcript panel.',
      color: '#e06cf5',
    },
    {
      icon: <Cpu size={24} />,
      title: 'Groq Whisper STT',
      desc: 'Lightning-fast speech-to-text with Groq Whisper-large-v3 for accurate real-time transcription.',
      color: '#f56c6c',
    },
  ];

  const advantages = [
    { icon: <Clock size={20} />, title: '24/7 Availability', desc: 'Practice interviews anytime — no scheduling, no waiting for a human interviewer.' },
    { icon: <Shield size={20} />, title: 'Zero Judgement', desc: 'Build confidence in a private, pressure-free environment before the real thing.' },
    { icon: <Sparkles size={20} />, title: 'Personalized to You', desc: 'Questions are extracted from YOUR resume — skills, projects, and experience.' },
    { icon: <Globe size={20} />, title: 'Completely Free', desc: 'Runs on free Groq API + free edge-tts. No subscription, no credit card required.' },
    { icon: <BarChart3 size={20} />, title: 'Instant Feedback', desc: 'AI provides closing feedback at the end of every session so you know where to improve.' },
    { icon: <Users size={20} />, title: 'Multi-Role Support', desc: 'Auto-detects your target role from your resume and tailors the interview accordingly.' },
  ];

  const steps = [
    { num: '01', icon: <Upload size={28} />, title: 'Upload Resume', desc: 'Drop your PDF or TXT resume — our backend parses it instantly using PyPDF2.' },
    { num: '02', icon: <Bot size={28} />, title: 'Meet Your Interviewer', desc: 'AI interviewer "Alex" opens with a personalized greeting based on your background.' },
    { num: '03', icon: <Mic size={28} />, title: 'Speak Naturally', desc: 'Auto voice detection captures your answers — no buttons to press. Just talk.' },
    { num: '04', icon: <Star size={28} />, title: 'Get Feedback', desc: 'Review the full transcript and receive AI feedback on your interview performance.' },
  ];

  const techStack = [
    { name: 'React 18', desc: 'Modern UI', icon: '⚛️' },
    { name: 'FastAPI', desc: 'Backend', icon: '⚡' },
    { name: 'LLaMA-3 70B', desc: 'AI Engine', icon: '🧠' },
    { name: 'Whisper v3', desc: 'Speech-to-Text', icon: '🎤' },
    { name: 'WebSocket', desc: 'Real-time', icon: '🔌' },
    { name: 'edge-tts', desc: 'Voice Output', icon: '🔊' },
  ];

  return (
    <div className="landing-root">
      {/* ── Background effects ── */}
      <div className="landing-grid" aria-hidden="true" />
      <FloatingOrb color="#4f8ef7" size={400} top="-5%" left="-10%" delay={0} />
      <FloatingOrb color="#7c6af5" size={300} top="15%" left="75%" delay={2} />
      <FloatingOrb color="#30d986" size={250} top="55%" left="-5%" delay={4} />
      <FloatingOrb color="#f5a623" size={200} top="70%" left="80%" delay={3} />

      {/* ════════════ NAVBAR ════════════ */}
      <motion.nav
        className="landing-nav"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="landing-nav-inner">
          <div className="landing-nav-logo">
            <div className="landing-nav-logo-icon">
              <Zap size={16} color="#fff" />
            </div>
            <span className="landing-nav-logo-text">HireIQ</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how-it-works" className="landing-nav-link">How it Works</a>
            <a href="#advantages" className="landing-nav-link">Why HireIQ</a>
          </div>
          <motion.button
            className="landing-nav-cta"
            onClick={() => navigate('/upload')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Start Interview
          </motion.button>
        </div>
      </motion.nav>

      {/* ════════════ HERO ════════════ */}
      <motion.section className="landing-hero" style={{ y: heroY, opacity: heroOpacity }}>
        <motion.div
          className="landing-hero-content"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div className="landing-badge" variants={fadeUp} custom={0}>
            <Sparkles size={14} />
            <span>Powered by Groq LLaMA-3 & Whisper</span>
          </motion.div>

          <motion.h1 className="landing-hero-title" variants={fadeUp} custom={1}>
            Your AI-Powered
            <br />
            <span className="landing-hero-gradient">Interview Coach</span>
          </motion.h1>

          <motion.p className="landing-hero-sub" variants={fadeUp} custom={2}>
            Upload your resume and practice with a realistic AI interviewer that asks
            tailored technical and behavioral questions — just like the real thing.
            <strong> Completely free.</strong>
          </motion.p>

          <motion.div className="landing-hero-actions" variants={fadeUp} custom={3}>
            <motion.button
              className="landing-btn-primary"
              onClick={() => navigate('/upload')}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 40px rgba(79,142,247,0.4)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Play size={18} />
              Start Free Interview
            </motion.button>
            <motion.a
              href="#how-it-works"
              className="landing-btn-ghost"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              See How it Works
              <ArrowRight size={16} />
            </motion.a>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="landing-stats-row"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <AnimatedStat value="70" suffix="B" label="LLM Parameters" />
            <div className="landing-stat-divider" />
            <AnimatedStat value="3" suffix="" label="Voice Engines" />
            <div className="landing-stat-divider" />
            <AnimatedStat value="100" suffix="%" label="Free to Use" />
          </motion.div>
        </motion.div>

        {/* Hero visual — mock interview card */}
        <motion.div
          className="landing-hero-visual"
          initial={{ opacity: 0, x: 60, rotateY: -8 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                <div className="landing-mock-avatar">
                  <span>A</span>
                  <div className="landing-mock-ring" />
                </div>
                <div className="landing-mock-wave">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="landing-mock-bar"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              </div>
              <div className="landing-mock-messages">
                <motion.div
                  className="landing-mock-msg landing-mock-msg--ai"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                >
                  <Bot size={14} />
                  <span>Tell me about your experience with React hooks…</span>
                </motion.div>
                <motion.div
                  className="landing-mock-msg landing-mock-msg--user"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                >
                  <span>I've used useState, useEffect, and custom hooks for…</span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div className="landing-scroll-hint">
          <ChevronDown size={20} />
        </div>
      </motion.section>

      {/* ════════════ FEATURES ════════════ */}
      <section className="landing-section" id="features">
        <motion.div
          className="landing-section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.span className="landing-section-tag" variants={fadeUp}>Features</motion.span>
          <motion.h2 className="landing-section-title" variants={fadeUp} custom={1}>
            Everything you need for
            <br />
            <span className="landing-hero-gradient">interview preparation</span>
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp} custom={2}>
            Built with cutting-edge AI, real-time WebSockets, and a beautiful interface
            to give you the most realistic mock interview experience.
          </motion.p>
        </motion.div>

        <motion.div
          className="landing-features-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="landing-feature-card"
              variants={scaleIn}
              custom={i}
              whileHover={{ y: -6, boxShadow: `0 12px 40px ${f.color}15` }}
            >
              <div className="landing-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="landing-section landing-section--alt" id="how-it-works">
        <motion.div
          className="landing-section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.span className="landing-section-tag" variants={fadeUp}>How it Works</motion.span>
          <motion.h2 className="landing-section-title" variants={fadeUp} custom={1}>
            From resume to feedback
            <br />
            <span className="landing-hero-gradient">in four simple steps</span>
          </motion.h2>
        </motion.div>

        <div className="landing-steps">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              className="landing-step"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={fadeUp}
              custom={i}
            >
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

      {/* ════════════ ADVANTAGES ════════════ */}
      <section className="landing-section" id="advantages">
        <motion.div
          className="landing-section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.span className="landing-section-tag" variants={fadeUp}>Advantages</motion.span>
          <motion.h2 className="landing-section-title" variants={fadeUp} custom={1}>
            Why candidates choose
            <br />
            <span className="landing-hero-gradient">HireIQ</span>
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp} custom={2}>
            Built for engineers, by engineers. Practice until you're confident — completely free, forever.
          </motion.p>
        </motion.div>

        <motion.div
          className="landing-advantages-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          {advantages.map((a, i) => (
            <motion.div
              key={i}
              className="landing-advantage-item"
              variants={fadeUp}
              custom={i}
              whileHover={{ x: 4 }}
            >
              <div className="landing-advantage-icon">{a.icon}</div>
              <div>
                <h3 className="landing-advantage-title">{a.title}</h3>
                <p className="landing-advantage-desc">{a.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════ TECH STACK ════════════ */}
      <section className="landing-section landing-section--alt">
        <motion.div
          className="landing-section-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.span className="landing-section-tag" variants={fadeUp}>Tech Stack</motion.span>
          <motion.h2 className="landing-section-title" variants={fadeUp} custom={1}>
            Built with <span className="landing-hero-gradient">modern technology</span>
          </motion.h2>
        </motion.div>

        <motion.div
          className="landing-tech-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
        >
          {techStack.map((t, i) => (
            <motion.div
              key={i}
              className="landing-tech-chip"
              variants={scaleIn}
              custom={i}
              whileHover={{ scale: 1.06, y: -4 }}
            >
              <span className="landing-tech-emoji">{t.icon}</span>
              <span className="landing-tech-name">{t.name}</span>
              <span className="landing-tech-desc">{t.desc}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="landing-cta-section">
        <motion.div
          className="landing-cta-card"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          <div className="landing-cta-glow" aria-hidden="true" />
          <motion.h2 className="landing-cta-title" variants={fadeUp}>
            Ready to ace your next interview?
          </motion.h2>
          <motion.p className="landing-cta-sub" variants={fadeUp} custom={1}>
            Upload your resume and get instant, personalized interview practice.
            No sign-up required — start right now.
          </motion.p>
          <motion.button
            className="landing-btn-primary landing-btn-primary--lg"
            variants={fadeUp}
            custom={2}
            onClick={() => navigate('/upload')}
            whileHover={{ scale: 1.04, boxShadow: '0 8px 48px rgba(79,142,247,0.45)' }}
            whileTap={{ scale: 0.97 }}
          >
            <Zap size={20} />
            Launch Interview Now
            <ArrowRight size={18} />
          </motion.button>
          <motion.p className="landing-cta-note" variants={fadeIn} custom={3}>
            <CheckCircle size={14} />
            No account needed · 100% free · Your data stays private
          </motion.p>
        </motion.div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-nav-logo-icon"><Zap size={14} color="#fff" /></div>
            <span className="landing-nav-logo-text">HireIQ</span>
          </div>
          <p className="landing-footer-copy">
            Built with React, FastAPI, Groq LLaMA-3 & Whisper.
            <br />© {new Date().getFullYear()} HireIQ. Open source & free forever.
          </p>
        </div>
      </footer>
    </div>
  );
}
