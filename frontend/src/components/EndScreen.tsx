import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Download,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Video,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { API_BASE } from '../utils';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { getRecording, type RecordingBundle } from '../lib/recording-store';
import type { AttentionStats, Feedback, Message, ProctorFlag } from '../types';

interface LocationState {
  candidateName: string;
  transcript: Message[];
  sessionId?: string;
  proctorFlags?: ProctorFlag[];
  attentionStats?: AttentionStats;
}

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function flagSummary(flags: ProctorFlag[]): Array<{ label: string; count: number; durationMs: number }> {
  const map = new Map<string, { label: string; count: number; durationMs: number }>();
  for (const flag of flags) {
    const current = map.get(flag.type) ?? { label: flag.label, count: 0, durationMs: 0 };
    current.count += 1;
    current.durationMs += flag.durationMs;
    map.set(flag.type, current);
  }
  return [...map.values()].sort((a, b) => b.durationMs - a.durationMs);
}

export default function EndScreen() {
  useDocumentMeta('Interview Complete', 'Review your AI interview feedback and transcript');
  const location = useLocation();
  const navigate = useNavigate();
  const {
    candidateName,
    transcript,
    sessionId,
    proctorFlags: stateFlags,
    attentionStats: stateStats,
  } = (location.state as LocationState) || {};

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [recording, setRecording] = useState<RecordingBundle | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [loadingRecording, setLoadingRecording] = useState(true);

  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getRecording()
      .then((value) => {
        if (active) setRecording(value);
      })
      .finally(() => {
        if (active) setLoadingRecording(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!recording) {
      setRecordingUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(recording.blob);
    setRecordingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recording]);

  const proctorFlags = useMemo(
    () => stateFlags ?? recording?.flags ?? [],
    [stateFlags, recording]
  );
  const attentionStats = stateStats ?? recording?.stats;
  const groupedFlags = flagSummary(proctorFlags);
  const focusScore =
    attentionStats && attentionStats.totalMs > 0 ? attentionStats.focusScore : undefined;

  useEffect(() => {
    if (transcript && transcript.length > 0) {
      setLoadingFeedback(true);
      fetch(`${API_BASE}/api/interview-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          session_id: sessionId,
          proctor_events: proctorFlags,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setFeedback(data);
          setLoadingFeedback(false);
        })
        .catch((err) => {
          console.error('Feedback error:', err);
          setLoadingFeedback(false);
        });
    }
  }, [transcript, sessionId, proctorFlags]);

  const handleRestart = () => navigate('/upload');

  const handleExportPDF = () => {
    if (!pdfRef.current) return;
    const opt = {
      margin: 15,
      filename: `Interview_Report_${candidateName || 'Candidate'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    };
    html2pdf().set(opt).from(pdfRef.current).save();
  };

  const downloadName = `HireIQ_Interview_${(candidateName || 'Candidate').replace(/[^a-z0-9_-]+/gi, '_')}_${new Date()
    .toISOString()
    .slice(0, 10)}.${recording?.extension ?? 'mp4'}`;

  return (
    <div className="end-root">
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px' }}>
        <div ref={pdfRef} className="pdf-container">
          <h2>Interview Details - {candidateName || 'Candidate'}</h2>
          <hr />
          {feedback && (
            <div className="pdf-feedback">
              <h3>Interview Feedback</h3>
              <p><strong>Good Points:</strong> {feedback.good_points}</p>
              <p><strong>Areas Configured as Weaknesses:</strong> {feedback.bad_points}</p>
              <p><strong>Areas of Improvement:</strong> {feedback.improvements}</p>
            </div>
          )}
          <div className="pdf-feedback">
            <h3>Attention Report</h3>
            <p><strong>Focus score:</strong> {focusScore !== undefined ? `${focusScore}%` : 'Not available'}</p>
            <p><strong>Flags:</strong> {proctorFlags.length}</p>
            {groupedFlags.length > 0 && (
              <ul>
                {groupedFlags.map((item) => (
                  <li key={item.label}>
                    {item.label}: {item.count} time{item.count === 1 ? '' : 's'}, {formatDuration(item.durationMs)} total
                  </li>
                ))}
              </ul>
            )}
            {groupedFlags.length === 0 && focusScore !== undefined && (
              <p>No attention flags were detected.</p>
            )}
            {focusScore === undefined && <p>Proctoring was unavailable for this session.</p>}
          </div>
          <div className="pdf-transcript">
            <h3>Transcript</h3>
            {(transcript || []).map((msg, i) => (
              <div key={i} className="pdf-transcript-row">
                <strong>{msg.speaker === 'interviewer' ? 'AI Interviewer' : (candidateName || 'You')}:</strong>
                <p style={{ margin: '4px 0 0 10px' }}>{msg.text}</p>
              </div>
            ))}
            {(!transcript || transcript.length === 0) && <p>No conversation recorded.</p>}
          </div>
        </div>
      </div>

      <motion.div
        className={`end-card ${transcript ? 'end-card--wide' : ''}`}
        initial="hidden" animate="visible" variants={stagger}
      >
        <motion.div className="end-icon-wrap" variants={fadeUp} custom={0}>
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <CheckCircle size={48} color="var(--color-success)" />
          </motion.div>
        </motion.div>

        <motion.h2 className="end-heading" variants={fadeUp} custom={1}>Interview Complete!</motion.h2>

        <motion.p className="end-sub" variants={fadeUp} custom={2}>
          Great job, <strong>{candidateName || 'Candidate'}</strong>! Your AI interview session has ended.
        </motion.p>

        <AnimatePresence mode="wait">
          {loadingFeedback ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="end-feedback-loading">
              <Sparkles size={16} className="spin" /> Generating AI Feedback...
            </motion.div>
          ) : feedback ? (
            <motion.div key="feedback" className="end-feedback-box" variants={fadeUp} custom={3}>
              <div className="feedback-section feedback-good">
                <div className="feedback-header"><ThumbsUp size={16} /> Strengths</div>
                <p>{feedback.good_points}</p>
              </div>
              <div className="feedback-section feedback-bad">
                <div className="feedback-header"><AlertTriangle size={16} /> Weaknesses</div>
                <p>{feedback.bad_points}</p>
              </div>
              <div className="feedback-section feedback-improve">
                <div className="feedback-header"><ArrowUpRight size={16} /> Improvements</div>
                <p>{feedback.improvements}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div className="end-tips" variants={fadeUp} custom={3}>
              <h3 className="end-tips-title"><Sparkles size={14} style={{ display: 'inline', marginRight: 6 }} />What's next?</h3>
              <ul className="end-list">
                <li>Review the transcript to see how you answered</li>
                <li>Note any follow-up questions you struggled with</li>
                <li>Practice again with a different resume or role</li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="end-assets" variants={fadeUp} custom={4}>
          <div className="end-asset-card">
            <div className="end-asset-head">
              <span className="end-asset-icon"><Video size={16} /></span>
              <div>
                <p className="end-asset-title">Interview recording</p>
                <p className="end-asset-meta">
                  {loadingRecording
                    ? 'Preparing your video…'
                    : recording
                      ? `${recording.extension.toUpperCase()} · ${formatDuration(recording.durationMs)} · ${formatSize(recording.size)}`
                      : 'Recording unavailable'}
                </p>
              </div>
              <Clock size={14} className="end-asset-clock" />
            </div>
            {recordingUrl && recording ? (
              <a className="end-btn end-btn--primary end-asset-action" href={recordingUrl} download={downloadName}>
                <Download size={16} /> Download recording ({recording.extension.toUpperCase()})
              </a>
            ) : (
              <button type="button" className="end-btn end-asset-action" disabled>
                {loadingRecording ? 'Preparing recording…' : 'No recording available'}
              </button>
            )}
            <p className="end-asset-note">Recorded locally with audio. Nothing is uploaded.</p>
          </div>

          <div className="end-asset-card">
            <div className="end-asset-head">
              <span className={`end-asset-icon ${proctorFlags.length ? 'is-warn' : 'is-good'}`}>
                {proctorFlags.length ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
              </span>
              <div>
                <p className="end-asset-title">Attention report</p>
                <p className="end-asset-meta">
                  {focusScore !== undefined ? `${focusScore}% focused` : 'Proctoring unavailable'}
                  {proctorFlags.length > 0 ? ` · ${proctorFlags.length} flag${proctorFlags.length === 1 ? '' : 's'}` : ''}
                </p>
              </div>
            </div>
            {groupedFlags.length > 0 ? (
              <ul className="end-flag-list">
                {groupedFlags.slice(0, 4).map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <span>{item.count}× · {formatDuration(item.durationMs)}</span>
                  </li>
                ))}
              </ul>
            ) : focusScore !== undefined ? (
              <p className="end-asset-ok">No attention flags. The candidate stayed focused.</p>
            ) : (
              <p className="end-asset-note">Proctoring was unavailable for this session.</p>
            )}
          </div>
        </motion.div>

        <motion.div className="end-action-row" variants={fadeUp} custom={5}>
          <motion.button className="end-btn" onClick={handleRestart}
            whileHover={{ scale: 1.03, background: 'var(--bg-hover)' }} whileTap={{ scale: 0.97 }}>
            <RotateCcw size={16} /> Start New Interview
          </motion.button>
          <motion.button className="end-btn end-btn--primary" onClick={handleExportPDF}
            whileHover={{ scale: transcript && transcript.length > 0 ? 1.03 : 1 }}
            whileTap={{ scale: transcript && transcript.length > 0 ? 0.97 : 1 }}
            disabled={!transcript || transcript.length === 0}>
            <Download size={16} /> Export report (PDF)
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
