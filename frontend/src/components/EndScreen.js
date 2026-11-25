import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle,
  ChevronDown,
  Download,
  MessageSquare,
  RotateCcw,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import usePageTitle from '../hooks/usePageTitle';

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://hire-iq-backend-eight.vercel.app';
};
const API_BASE = getApiBase();

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

export default function EndScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { candidateName, transcript } = location.state || {};

  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const pdfRef = useRef(null);
  usePageTitle('Session complete');

  const exchangeCount = useMemo(() => transcript?.length || 0, [transcript]);
  const hasState = Boolean(location.state);

  useEffect(() => {
    if (!transcript || transcript.length === 0) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    setLoadingFeedback(true);
    setFeedbackError('');

    fetch(`${API_BASE}/api/interview-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Feedback could not be generated.');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setFeedback(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const raw = err?.message || '';
        setFeedbackError(
          err?.name === 'AbortError'
            ? 'Feedback took too long to generate. Your transcript is still available below.'
            : raw.toLowerCase().includes('fetch') || raw.toLowerCase().includes('network')
              ? 'The feedback service could not be reached. Your transcript is still available below.'
              : raw || 'Feedback could not be generated for this session.'
        );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setLoadingFeedback(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [transcript]);

  const handleExportPDF = () => {
    if (!pdfRef.current) return;
    const options = {
      margin: 15,
      filename: `Interview_Transcript_${candidateName || 'Candidate'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(options).from(pdfRef.current).save();
  };

  if (!hasState) return <Navigate to="/" replace />;

  return (
    <div className="end-root">
      {/* Hidden printable report */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px' }}>
        <div ref={pdfRef} className="pdf-container">
          <h2>Interview details — {candidateName || 'Candidate'}</h2>
          <hr />

          {feedback && (
            <div className="pdf-feedback">
              <h3>Interview feedback</h3>
              <p><strong>Strengths:</strong> {feedback.good_points}</p>
              <p><strong>Weaknesses:</strong> {feedback.bad_points}</p>
              <p><strong>Areas to improve:</strong> {feedback.improvements}</p>
            </div>
          )}

          <div className="pdf-transcript">
            <h3>Transcript</h3>
            {(transcript || []).map((message, index) => (
              <div key={index} className="pdf-transcript-row">
                <strong>
                  {message.speaker === 'interviewer' ? 'Aira (AI)' : candidateName || 'You'}:
                </strong>
                <p style={{ margin: '4px 0 0 10px' }}>{message.text}</p>
              </div>
            ))}
            {(!transcript || transcript.length === 0) && <p>No conversation recorded.</p>}
          </div>
        </div>
      </div>

      <motion.div
        className={`end-card ${transcript ? 'end-card--wide' : ''}`}
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div className="end-icon-wrap" variants={fadeUp} custom={0}>
          <CheckCircle size={30} className="text-success" />
        </motion.div>

        <motion.div variants={fadeUp} custom={1} className="flex flex-col items-center gap-2.5">
          <p className="eyebrow eyebrow-dot justify-center">Session complete</p>
          <h1 className="end-heading">That&apos;s a wrap, {candidateName || 'Candidate'}.</h1>
          <p className="end-sub">
            The room is closed. Your transcript and a structured review are below — revisit the
            answers that felt uncertain, then run it again.
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={2}
          className="grid w-full grid-cols-3 divide-x divide-border rounded-xl border border-border bg-subtle"
        >
          {[
            [String(exchangeCount), 'exchanges logged'],
            [loadingFeedback ? '—' : feedback ? 'Ready' : 'n/a', 'feedback report'],
            ['Local', 'storage'],
          ].map(([value, label]) => (
            <div key={label} className="px-3 py-3.5 text-center">
              <p className="font-display text-[16px] font-semibold text-foreground">{value}</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {loadingFeedback ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="end-feedback-loading"
            >
              <Spinner size={16} className="text-primary" />
              Reviewing the transcript…
            </motion.div>
          ) : feedback ? (
            <motion.div
              key="feedback"
              className="end-feedback-box"
              variants={fadeUp}
              custom={3}
            >
              <div className="feedback-section feedback-good">
                <div className="feedback-header"><ThumbsUp size={15} /> Strengths</div>
                <p>{feedback.good_points}</p>
              </div>
              <div className="feedback-section feedback-bad">
                <div className="feedback-header"><AlertTriangle size={15} /> Weaknesses</div>
                <p>{feedback.bad_points}</p>
              </div>
              <div className="feedback-section feedback-improve">
                <div className="feedback-header"><ArrowUpRight size={15} /> Improve next</div>
                <p>{feedback.improvements}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div className="end-tips" variants={fadeUp} custom={3}>
              <h2 className="end-tips-title">
                <Sparkles size={12} style={{ display: 'inline', marginRight: 6 }} />
                {feedbackError ? 'Feedback unavailable' : "What's next"}
              </h2>
              {feedbackError ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">{feedbackError}</p>
              ) : (
                <ul className="end-list">
                  <li>Review the transcript to see how you answered</li>
                  <li>Note any follow-up questions you struggled with</li>
                  <li>Practice again with a different resume or role</li>
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {exchangeCount > 0 && (
          <motion.div variants={fadeUp} custom={4} className="w-full">
            <button
              type="button"
              onClick={() => setShowTranscript((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
              aria-expanded={showTranscript}
            >
              <span className="inline-flex items-center gap-2">
                <MessageSquare size={14} className="text-muted-foreground" />
                Review full transcript
                <span className="badge text-[10.5px]">{exchangeCount}</span>
              </span>
              <ChevronDown
                size={15}
                className={`text-muted-foreground transition-transform ${showTranscript ? 'rotate-180' : ''}`}
              />
            </button>

            {showTranscript && (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-border bg-subtle p-3">
                <div className="space-y-3">
                  {(transcript || []).map((message, index) => {
                    const isInterviewer = message.speaker === 'interviewer';
                    return (
                      <div key={index} className="flex gap-2.5">
                        <span className="w-16 shrink-0 pt-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted-foreground">
                          {isInterviewer ? 'Aira' : 'You'}
                        </span>
                        <p className="text-[12.5px] leading-relaxed text-foreground">{message.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        <motion.div className="end-action-row" variants={fadeUp} custom={5}>
          <Button onClick={() => navigate('/upload')} size="md">
            <RotateCcw size={15} />
            Start a new interview
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="md"
            disabled={exchangeCount === 0}
          >
            <Download size={15} />
            Export report
          </Button>
          <Button as={Link} to="/" variant="ghost" size="md">
            <ArrowLeft size={15} />
            Back home
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
