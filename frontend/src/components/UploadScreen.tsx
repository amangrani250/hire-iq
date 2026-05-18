import { useState, useEffect, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Loader, ArrowRight, Zap, User, Briefcase,
  Code, Clock, GraduationCap, Star, ChevronRight, AlertCircle,
  CheckCircle, Wrench, BookOpen, BarChart3, Sparkles, Target,
  Eye, FileCheck, TrendingUp, MessageSquare, X,
} from 'lucide-react';
import { API_BASE, getAtsColor } from '../utils';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import type { AnalysisResult, ProfileData, AtsAnalysis } from '../types';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease },
  }),
};

function AtsScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getAtsColor(score);

  return (
    <div className="ats-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay: 0.3, ease }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <motion.span className="ats-ring-score" style={{ color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        {score}
      </motion.span>
    </div>
  );
}

function AtsBar({ label, score, feedback, icon, delay = 0 }: { label: string; score: number; feedback: string; icon: React.ReactNode; delay?: number }) {
  const color = getAtsColor(score);
  return (
    <motion.div className="ats-bar-item" variants={fadeUp} custom={delay}>
      <div className="ats-bar-header">
        <span className="ats-bar-icon">{icon}</span>
        <span className="ats-bar-label">{label}</span>
        <span className="ats-bar-score" style={{ color }}>{score}</span>
      </div>
      <div className="ats-bar-track">
        <motion.div className="ats-bar-fill" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, delay: 0.4 + delay * 0.1, ease }} />
      </div>
      <p className="ats-bar-feedback">{feedback}</p>
    </motion.div>
  );
}

function SkillTag({ name, color }: { name: string; color: string }) {
  return (
    <motion.span className="skill-tag" style={{ borderColor: `${color}40`, background: `${color}10`, color }}
      whileHover={{ scale: 1.06, y: -2 }}>
      {name}
    </motion.span>
  );
}

export default function UploadScreen() {
  useDocumentMeta('Upload Resume', 'Upload your resume for AI-powered analysis and interview preparation');
  const fileInputId = useId();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    const isValid = f.type === 'application/pdf' || f.name.endsWith('.txt');
    if (!isValid) {
      setError('Please upload a PDF or TXT file.');
      return;
    }
    setFile(f);
    setError('');
    setAnalysis(null);
    await handleAnalyze(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  async function handleAnalyze(fileObj: File) {
    const targetFile = fileObj || file;
    if (!targetFile) return;
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', targetFile);
      const res = await fetch(`${API_BASE}/api/analyze-resume`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setAnalysis(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const handleStartInterview = () => {
    if (!analysis || !analysis.session_id) {
      setError('Analysis incomplete or session failed. Please refresh the page and upload your resume again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/interview', { state: { sessionId: analysis.session_id, candidate: analysis.candidate } });
  };

  useEffect(() => {
    if (analysis && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [analysis]);

  const dropzoneClasses = [
    'upload-dropzone',
    dragging && 'upload-dropzone--dragging',
    file && 'upload-dropzone--has-file',
  ].filter(Boolean).join(' ');

  const profile = analysis?.profile;
  const ats = analysis?.ats;
  const skills = profile?.skills || { languages: [], frameworks: [], tools: [], other: [] };
  const experience = profile?.experience || [];
  const education = profile?.education || [];

  const atsIcons: Record<string, React.ReactNode> = {
    keyword_optimization: <Target size={14} />,
    formatting: <FileCheck size={14} />,
    section_completeness: <BookOpen size={14} />,
    impact_metrics: <TrendingUp size={14} />,
    readability: <Eye size={14} />,
  };

  const atsLabels: Record<string, string> = {
    keyword_optimization: 'Keywords',
    formatting: 'Formatting',
    section_completeness: 'Sections',
    impact_metrics: 'Impact Metrics',
    readability: 'Readability',
  };

  return (
    <div className="upload-root-v2">
      <div className="upload-grid" aria-hidden="true" />

      <motion.div className="upload-card" initial="hidden" animate="visible" variants={stagger}>
        <motion.div className="upload-logo-row" variants={fadeUp} custom={0}>
          <div className="upload-logo-icon"><Zap size={18} color="#fff" /></div>
          <span className="upload-logo-text">HireIQ</span>
        </motion.div>

        <motion.h1 className="upload-heading" variants={fadeUp} custom={1}>Your AI Interview<br />starts here</motion.h1>
        <motion.p className="upload-sub" variants={fadeUp} custom={2}>
          Upload your resume and we'll analyze it \u2014 extract your profile, skills, experience, and provide an ATS compatibility score.
        </motion.p>

        <motion.div
          className={dropzoneClasses} variants={fadeUp} custom={3}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)} onDrop={handleDrop}
          onClick={() => document.getElementById(fileInputId)?.click()}
          role="button" tabIndex={0} aria-label="Upload resume file"
          whileHover={{ borderColor: 'rgba(79,142,247,0.5)', background: 'rgba(79,142,247,0.04)' }}
        >
          <input id={fileInputId} type="file" accept=".pdf,.txt" hidden onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <>
              <FileText size={32} color="var(--accent)" />
              <p className="upload-file-name">{file.name}</p>
              <p className="upload-file-size">{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <Upload size={32} color="var(--text-3)" />
              <p className="upload-drop-text">Drop your resume here</p>
              <p className="upload-drop-sub">PDF or TXT \u2022 Click or drag</p>
            </>
          )}
        </motion.div>

        {error && (
          <motion.p className="upload-error" role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <AlertCircle size={14} />{error}
          </motion.p>
        )}

        {loading && (
          <motion.div className="upload-btn" style={{ cursor: 'default', opacity: 0.8 }} variants={fadeUp} custom={4}>
            <Loader size={18} className="spin" /> Analyzing resume automatically\u2026
          </motion.div>
        )}

        <motion.p className="upload-hint" variants={fadeUp} custom={5}>
          Powered by Groq LLaMA-3 \u00B7 Whisper \u00B7 edge-tts
        </motion.p>
      </motion.div>

      <AnimatePresence>
        {analysis && (
          <motion.div className="analysis-root" ref={resultsRef}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease }}>
            
            <motion.section className="analysis-profile" initial="hidden" animate="visible" variants={stagger}>
              <motion.div className="analysis-avatar" variants={scaleIn}><User size={28} /></motion.div>
              <motion.div className="analysis-profile-info" variants={fadeUp} custom={1}>
                <h2 className="analysis-name">{profile?.name || 'Candidate'}</h2>
                <p className="analysis-role"><Briefcase size={14} />{profile?.role || 'Professional'}</p>
                {profile?.total_years && (
                  <p className="analysis-years"><Clock size={14} />{profile.total_years} years of experience</p>
                )}
              </motion.div>
              <motion.button className="analysis-start-btn" variants={scaleIn} custom={2}
                onClick={handleStartInterview}
                whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(79,142,247,0.35)' }} whileTap={{ scale: 0.97 }}>
                <><ArrowRight size={16} /> Start Interview</>
              </motion.button>
            </motion.section>

            {profile?.summary && (
              <motion.section className="analysis-section" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.h3 className="analysis-section-title" variants={fadeUp}><MessageSquare size={16} /> Professional Summary</motion.h3>
                <motion.p className="analysis-summary-text" variants={fadeUp} custom={1}>{profile.summary}</motion.p>
              </motion.section>
            )}

            {experience.length > 0 && (
              <motion.section className="analysis-section" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.h3 className="analysis-section-title" variants={fadeUp}><Briefcase size={16} /> Experience Timeline</motion.h3>
                <div className="timeline">
                  {experience.map((exp, i) => (
                    <motion.div key={i} className="timeline-item" variants={fadeUp} custom={i + 1}>
                      <div className="timeline-dot-line">
                        <div className="timeline-dot" />
                        {i < experience.length - 1 && <div className="timeline-line" />}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header"><h4 className="timeline-role">{exp.role}</h4><span className="timeline-duration">{exp.duration}</span></div>
                        <p className="timeline-company">{exp.company}</p>
                        {exp.description && <p className="timeline-desc">{exp.description}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            <motion.section className="analysis-section" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.h3 className="analysis-section-title" variants={fadeUp}><Code size={16} /> Technical Skills</motion.h3>
              <div className="skills-grid">
                {skills.languages?.length > 0 && (
                  <motion.div className="skills-category" variants={fadeUp} custom={1}>
                    <h4 className="skills-cat-title"><Code size={13} /> Languages</h4>
                    <div className="skills-tags">{skills.languages.map((s, i) => <SkillTag key={i} name={s} color="var(--accent)" />)}</div>
                  </motion.div>
                )}
                {skills.frameworks?.length > 0 && (
                  <motion.div className="skills-category" variants={fadeUp} custom={2}>
                    <h4 className="skills-cat-title"><BookOpen size={13} /> Frameworks</h4>
                    <div className="skills-tags">{skills.frameworks.map((s, i) => <SkillTag key={i} name={s} color="var(--green)" />)}</div>
                  </motion.div>
                )}
                {skills.tools?.length > 0 && (
                  <motion.div className="skills-category" variants={fadeUp} custom={3}>
                    <h4 className="skills-cat-title"><Wrench size={13} /> Tools & Platforms</h4>
                    <div className="skills-tags">{skills.tools.map((s, i) => <SkillTag key={i} name={s} color="var(--amber)" />)}</div>
                  </motion.div>
                )}
                {skills.other?.length > 0 && (
                  <motion.div className="skills-category" variants={fadeUp} custom={4}>
                    <h4 className="skills-cat-title"><Star size={13} /> Other</h4>
                    <div className="skills-tags">{skills.other.map((s, i) => <SkillTag key={i} name={s} color="var(--accent-2)" />)}</div>
                  </motion.div>
                )}
              </div>
            </motion.section>

            {education.length > 0 && (
              <motion.section className="analysis-section" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.h3 className="analysis-section-title" variants={fadeUp}><GraduationCap size={16} /> Education</motion.h3>
                <div className="education-list">
                  {education.map((edu, i) => (
                    <motion.div key={i} className="education-item" variants={fadeUp} custom={i + 1}>
                      <GraduationCap size={18} className="education-icon" />
                      <div><h4 className="education-degree">{edu.degree}</h4><p className="education-inst">{edu.institution}</p>{edu.year && <p className="education-year">{edu.year}</p>}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {ats && (
              <motion.section className="analysis-section analysis-ats" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.h3 className="analysis-section-title" variants={fadeUp}><BarChart3 size={16} /> ATS Compatibility Score</motion.h3>
                <div className="ats-main">
                  <motion.div className="ats-score-col" variants={scaleIn}>
                    <AtsScoreRing score={ats.overall_score || 0} />
                    <p className="ats-score-label">{ats.overall_score >= 80 ? 'Excellent' : ats.overall_score >= 60 ? 'Good' : 'Needs Improvement'}</p>
                  </motion.div>
                  <div className="ats-bars-col">
                    {ats.breakdown && Object.entries(ats.breakdown).map(([key, val], i) => (
                      <AtsBar key={key} label={atsLabels[key] || key} score={val.score} feedback={val.feedback}
                        icon={atsIcons[key] || <Star size={14} />} delay={i} />
                    ))}
                  </div>
                </div>
                {ats.top_suggestions?.length > 0 && (
                  <motion.div className="ats-suggestions" variants={fadeUp} custom={6}>
                    <h4 className="ats-suggestions-title"><Sparkles size={14} /> Top Suggestions</h4>
                    <ul className="ats-suggestions-list">
                      {ats.top_suggestions.map((s, i) => (
                        <li key={i}><CheckCircle size={13} /><span>{s}</span></li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </motion.section>
            )}

            <motion.div className="analysis-bottom-cta" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
              <p className="analysis-bottom-text">Ready to put your skills to the test?</p>
              <motion.button className="analysis-start-btn analysis-start-btn--lg" onClick={handleStartInterview}
                whileHover={{ scale: 1.03, boxShadow: '0 8px 40px rgba(79,142,247,0.4)' }} whileTap={{ scale: 0.97 }}>
                <><Zap size={18} /> Start AI Interview Now</>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
