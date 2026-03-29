import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, RotateCcw, Sparkles } from 'lucide-react';

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
 * Reads candidateName from route state.
 */
export default function EndScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { candidateName } = location.state || {};

  const handleRestart = () => navigate('/upload');

  return (
    <div className="end-root">
      <motion.div
        className="end-card"
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
          The interviewer's feedback has been shared in the transcript.
        </motion.p>

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

        <motion.button
          className="end-btn"
          variants={fadeUp}
          custom={4}
          onClick={handleRestart}
          whileHover={{ scale: 1.03, background: 'var(--bg-hover)' }}
          whileTap={{ scale: 0.97 }}
        >
          <RotateCcw size={16} />
          Start New Interview
        </motion.button>
      </motion.div>
    </div>
  );
}
