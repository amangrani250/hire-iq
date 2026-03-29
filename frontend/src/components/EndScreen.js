import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, RotateCcw, Sparkles, Download, ThumbsUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

/**
 * End Screen — displayed after the interview concludes.
 * Reads candidateName and transcript from route state.
 */
export default function EndScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { candidateName, transcript } = location.state || {};
  
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  const pdfRef = useRef(null);

  useEffect(() => {
    if (transcript && transcript.length > 0) {
      setLoadingFeedback(true);
      fetch(`${API_BASE}/api/interview-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
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
  }, [transcript]);

  const handleRestart = () => navigate('/upload');
  
  const handleExportPDF = () => {
    if (!pdfRef.current) return;
    const opt = {
      margin:       15,
      filename:     `Interview_Transcript_${candidateName || 'Candidate'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(pdfRef.current).save();
  };

  return (
    <div className="end-root">
      {/* Hidden printable content for PDF export */}
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

            <div className="pdf-transcript">
              <h3>Transcript</h3>
              {(transcript || []).map((msg, i) => (
                <div key={i} className="pdf-transcript-row">
                  <strong>{msg.speaker === 'interviewer' ? 'AI Interviewer' : (candidateName || 'You')}:</strong>
                  <p style={{ margin: '4px 0 0 10px' }}>{msg.text}</p>
                </div>
              ))}
              {(!transcript || transcript.length === 0) && (
                <p>No conversation recorded.</p>
              )}
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
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CheckCircle size={48} color="var(--green)" />
          </motion.div>
        </motion.div>

        <motion.h2 className="end-heading" variants={fadeUp} custom={1}>
          Interview Complete!
        </motion.h2>

        <motion.p className="end-sub" variants={fadeUp} custom={2}>
          Great job, <strong>{candidateName || 'Candidate'}</strong>!
          Your AI interview session has ended.
        </motion.p>
        
        <AnimatePresence mode="wait">
        {loadingFeedback ? (
          <motion.div 
            key="loading" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="end-feedback-loading"
          >
            <Sparkles size={16} className="spin" />
            Generating AI Feedback...
          </motion.div>
        ) : feedback ? (
          <motion.div 
            key="feedback" 
            className="end-feedback-box" 
            variants={fadeUp} 
            custom={3}
          >
            <div className="feedback-section feedback-good">
               <div className="feedback-header"><ThumbsUp size={16}/> Strengths</div>
               <p>{feedback.good_points}</p>
            </div>
            <div className="feedback-section feedback-bad">
               <div className="feedback-header"><AlertTriangle size={16}/> Weaknesses</div>
               <p>{feedback.bad_points}</p>
            </div>
            <div className="feedback-section feedback-improve">
               <div className="feedback-header"><ArrowUpRight size={16}/> Improvements</div>
               <p>{feedback.improvements}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div className="end-tips" variants={fadeUp} custom={3}>
            <h3 className="end-tips-title">
              <Sparkles size={14} style={{ display: 'inline', marginRight: 6 }} />
              What's next?
            </h3>
            <ul className="end-list">
              <li>Review the transcript to see how you answered</li>
              <li>Note any follow-up questions you struggled with</li>
              <li>Practice again with a different resume or role</li>
            </ul>
          </motion.div>
        )}
        </AnimatePresence>

        <motion.div className="end-action-row" variants={fadeUp} custom={4}>
          <motion.button
            className="end-btn"
            onClick={handleRestart}
            whileHover={{ scale: 1.03, background: 'var(--bg-hover)' }}
            whileTap={{ scale: 0.97 }}
          >
            <RotateCcw size={16} />
            Start New Interview
          </motion.button>
          
          <motion.button
            className="end-btn end-btn--primary"
            onClick={handleExportPDF}
            whileHover={{ scale: transcript && transcript.length > 0 ? 1.03 : 1 }}
            whileTap={{ scale: transcript && transcript.length > 0 ? 0.97 : 1 }}
            disabled={!transcript || transcript.length === 0}
          >
            <Download size={16} />
            Export to PDF
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
