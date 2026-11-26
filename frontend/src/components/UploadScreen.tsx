// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckCircle,
  Clock,
  Code,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  Lock,
  MessageSquare,
  MousePointerClick,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Upload,
  User,
  Wand2,
  Wrench,
} from 'lucide-react';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import usePageTitle from '../hooks/usePageTitle';
import { API_BASE } from '../utils/constants';

/* Resume upload rules — keep these in sync with the backend. */
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'docx'];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

/**
 * Validates extension, size, and file signature.
 * Returns an error message, or an empty string when the file is acceptable.
 */
async function validateResumeFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'doc') {
    return 'Older .doc files are not supported. Save the file as .docx and try again.';
  }

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Only PDF and Word (.docx) files are accepted.';
  }

  if (file.size === 0) {
    return 'That file is empty. Please choose another.';
  }

  if (file.size > MAX_RESUME_BYTES) {
    return 'That file is too large. Maximum size is 5 MB.';
  }

  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isPdf = PDF_MAGIC.every((byte, index) => header[index] === byte);
  const isZip = header[0] === 0x50 && header[1] === 0x4b; // DOCX is a ZIP container

  if (extension === 'pdf' && !isPdf) {
    return 'That does not look like a valid PDF file.';
  }

  if (extension === 'docx' && !isZip) {
    return 'That does not look like a valid Word document.';
  }

  return '';
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const NEXT_STEPS = [
  {
    icon: FileText,
    title: 'Read the resume',
    copy: 'Your role, skills, and experience are extracted into a working profile.',
  },
  {
    icon: Wand2,
    title: 'Shape the questions',
    copy: 'Aira builds a round around your background — not a generic question bank.',
  },
  {
    icon: MessageSquare,
    title: 'Rehearse out loud',
    copy: 'Speak naturally in the room, then review the transcript and feedback.',
  },
];

function scoreTone(score) {
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function AtsScoreRing({ score, size = 128 }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone = scoreTone(score);

  return (
    <div className="ats-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="6"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <span className="ats-ring-score" style={{ color: tone }}>
        {score}
      </span>
    </div>
  );
}

function AtsBar({ label, score, feedback, icon }) {
  const tone = scoreTone(score);
  return (
    <div className="ats-bar-item">
      <div className="ats-bar-header">
        <span className="ats-bar-icon">{icon}</span>
        <span className="ats-bar-label">{label}</span>
        <span className="ats-bar-score" style={{ color: tone }}>
          {score}
        </span>
      </div>
      <div className="ats-bar-track">
        <motion.div
          className="ats-bar-fill"
          style={{ background: tone }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="ats-bar-feedback">{feedback}</p>
    </div>
  );
}

export default function UploadScreen() {
  const navigate = useNavigate();
  usePageTitle('Resume analysis');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const resultsRef = useRef(null);
  const analysisAbortRef = useRef(null);

  const handleFile = async (nextFile) => {
    if (!nextFile) return;

    const validationError = await validateResumeFile(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(nextFile);
    setError('');
    setAnalysis(null);
    await handleAnalyze(nextFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const handleAnalyze = useCallback(async (fileObj) => {
    const targetFile = fileObj || file;
    if (!targetFile) return;

    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 90000);

    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', targetFile);
      const res = await fetch(`${API_BASE}/api/analyze-resume`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      if (!controller.signal.aborted) setAnalysis(data);
    } catch (err) {
      if (controller.signal.aborted && analysisAbortRef.current !== controller) return;
      setError(
        err.name === 'AbortError'
          ? 'Analysis took too long. Please try again.'
          : err.message === 'Failed to fetch'
            ? 'We could not reach the analysis service. Check your connection and try again.'
            : err.message
      );
    } finally {
      window.clearTimeout(timeout);
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
        setLoading(false);
      }
    }
  }, [file]);

  useEffect(() => () => analysisAbortRef.current?.abort(), []);

  const handleStartInterview = () => {
    if (!analysis || !analysis.session_id) {
      setError('Analysis is incomplete. Please upload your resume again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/interview', {
      state: { sessionId: analysis.session_id, candidate: analysis.candidate },
    });
  };

  useEffect(() => {
    if (analysis && resultsRef.current) {
      const timer = setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [analysis]);

  const dropzoneClasses = [
    'upload-dropzone',
    dragging && 'upload-dropzone--dragging',
    file && 'upload-dropzone--has-file',
  ]
    .filter(Boolean)
    .join(' ');

  const profile = analysis?.profile;
  const ats = analysis?.ats;
  const skills = profile?.skills || {};
  const experience = profile?.experience || [];
  const education = profile?.education || [];

  const atsIcons = {
    keyword_optimization: <Target size={13} />,
    formatting: <FileCheck size={13} />,
    section_completeness: <BookOpen size={13} />,
    impact_metrics: <TrendingUp size={13} />,
    readability: <Eye size={13} />,
  };

  const atsLabels = {
    keyword_optimization: 'Keywords',
    formatting: 'Formatting',
    section_completeness: 'Sections',
    impact_metrics: 'Impact metrics',
    readability: 'Readability',
  };

  const skillGroups = [
    { key: 'languages', title: 'Languages', icon: Code, values: skills.languages },
    { key: 'frameworks', title: 'Frameworks', icon: BookOpen, values: skills.frameworks },
    { key: 'tools', title: 'Tools & platforms', icon: Wrench, values: skills.tools },
    { key: 'other', title: 'Other', icon: Star, values: skills.other },
  ].filter((group) => group.values?.length > 0);

  return (
    <div className="container-page py-10 lg:py-14">
      <PageHeader
        eyebrow="New mock interview"
        title="Start with the resume you actually have."
        description="Upload a PDF or Word document. HireIQ reads it once to build a profile, score its ATS readiness, and shape the interview that follows."
        actions={
          <Button as={Link} to="/builder" variant="secondary" size="sm">
            <FileText size={14} />
            Build in the studio
          </Button>
        }
      />

      <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-label mb-2">01 / Upload</p>
              <h2 className="text-[18px] font-semibold text-foreground">Drop in your resume</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                PDF or Word (.docx), up to 5 MB. Analysis starts automatically.
              </p>
            </div>
            <Badge>PDF · DOCX</Badge>
          </div>

          <motion.div
            className={`${dropzoneClasses} mt-6`}
            onClick={() => document.getElementById('file-input').click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                document.getElementById('file-input').click();
              }
            }}
            aria-label="Upload resume file"
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                event.target.value = '';
                handleFile(selectedFile);
              }}
            />
            {file ? (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={20} />
                </span>
                <p className="upload-file-name">{file.name}</p>
                <p className="upload-file-size">{(file.size / 1024).toFixed(1)} KB · replace file</p>
              </>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                  <Upload size={19} />
                </span>
                <p className="upload-drop-text">Drop your resume here</p>
                <p className="upload-drop-sub">or click to browse — PDF or Word (.docx)</p>
              </>
            )}
          </motion.div>

          {error && (
            <p className="upload-error mt-3" role="alert">
              <AlertCircle size={14} />
              {error}
            </p>
          )}

          {loading && (
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-border bg-subtle px-3.5 py-3 text-[13px] text-muted-foreground">
              <Spinner size={15} className="text-primary" />
              Reading your resume, extracting skills, and scoring ATS readiness…
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/80">
              Private practice session
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <p className="section-label mb-4">What happens next</p>
            <ol className="space-y-4">
              {NEXT_STEPS.map(({ icon: Icon, title, copy }, index) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground">
                    <Icon size={14} />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">
                      <span className="mr-1.5 font-mono text-[10px] text-muted-foreground/70">
                        0{index + 1}
                      </span>
                      {title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="rounded-xl border border-border bg-subtle p-5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <MousePointerClick size={14} className="text-muted-foreground" />
              Prefer a technical-only screen?
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Skip the resume and choose your languages and complexity instead.
            </p>
            <Link
              to="/tech-interview"
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
            >
              Configure a technical round <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Analysis ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {analysis && (
          <motion.section
            ref={resultsRef}
            className="mt-14 scroll-mt-24"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="eyebrow eyebrow-dot">Analysis complete</p>
                <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-foreground">
                  Meet the candidate
                </h2>
              </div>
              <Button onClick={handleStartInterview}>
                Start interview
                <ArrowRight size={15} />
              </Button>
            </div>

            <motion.div
              className="mt-6 grid gap-4 lg:grid-cols-2"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div className="analysis-profile lg:col-span-2" variants={fadeUp}>
                <div className="analysis-avatar">
                  <User size={26} />
                </div>
                <div className="analysis-profile-info">
                  <h2 className="analysis-name">{profile?.name || 'Candidate'}</h2>
                  <p className="analysis-role">
                    <Briefcase size={13} />
                    {profile?.role || 'Professional'}
                  </p>
                  {profile?.total_years && (
                    <p className="analysis-years">
                      <Clock size={13} />
                      {profile.total_years} years of experience
                    </p>
                  )}
                </div>
                {ats && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-subtle px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      ATS
                    </span>
                    <span className="text-[18px] font-semibold" style={{ color: scoreTone(ats.overall_score || 0) }}>
                      {ats.overall_score || 0}
                    </span>
                  </div>
                )}
              </motion.div>

              {profile?.summary && (
                <motion.div className="analysis-section" variants={fadeUp}>
                  <h3 className="analysis-section-title">
                    <MessageSquare size={14} />
                    Professional summary
                  </h3>
                  <p className="analysis-summary-text">{profile.summary}</p>
                </motion.div>
              )}

              {skillGroups.length > 0 && (
                <motion.div className="analysis-section" variants={fadeUp}>
                  <h3 className="analysis-section-title">
                    <Code size={14} />
                    Technical skills
                  </h3>
                  <div className="space-y-4">
                    {skillGroups.map(({ key, title, icon: Icon, values }) => (
                      <div key={key}>
                        <h4 className="skills-cat-title">
                          <Icon size={12} /> {title}
                        </h4>
                        <div className="skills-tags">
                          {values.map((skill) => (
                            <span key={skill} className="skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {experience.length > 0 && (
                <motion.div
                  className={`analysis-section ${skillGroups.length === 0 ? 'lg:col-span-2' : ''}`}
                  variants={fadeUp}
                >
                  <h3 className="analysis-section-title">
                    <Briefcase size={14} />
                    Experience timeline
                  </h3>
                  <div className="timeline">
                    {experience.map((exp, index) => (
                      <div key={`${exp.role}-${index}`} className="timeline-item">
                        <div className="timeline-dot-line">
                          <span className="timeline-dot" />
                          {index < experience.length - 1 && <span className="timeline-line" />}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <h4 className="timeline-role">{exp.role}</h4>
                            {exp.duration && <span className="timeline-duration">{exp.duration}</span>}
                          </div>
                          <p className="timeline-company">{exp.company}</p>
                          {exp.description && <p className="timeline-desc">{exp.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {education.length > 0 && (
                <motion.div className="analysis-section" variants={fadeUp}>
                  <h3 className="analysis-section-title">
                    <GraduationCap size={14} />
                    Education
                  </h3>
                  <div className="education-list">
                    {education.map((edu, index) => (
                      <div key={`${edu.degree}-${index}`} className="education-item">
                        <GraduationCap size={17} className="education-icon" />
                        <div>
                          <h4 className="education-degree">{edu.degree}</h4>
                          <p className="education-inst">{edu.institution}</p>
                          {edu.year && <p className="education-year">{edu.year}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {ats && (
                <motion.div className="analysis-section analysis-ats lg:col-span-2" variants={fadeUp}>
                  <h3 className="analysis-section-title">
                    <BarChart3 size={14} />
                    ATS compatibility
                  </h3>
                  <div className="ats-main">
                    <div className="ats-score-col">
                      <AtsScoreRing score={ats.overall_score || 0} />
                      <p className="ats-score-label">
                        {(ats.overall_score || 0) >= 80
                          ? 'Excellent'
                          : (ats.overall_score || 0) >= 60
                            ? 'Good'
                            : 'Needs work'}
                      </p>
                    </div>
                    <div className="ats-bars-col">
                      {ats.breakdown &&
                        Object.entries(ats.breakdown).map(([key, value]) => (
                          <AtsBar
                            key={key}
                            label={atsLabels[key] || key}
                            score={value.score}
                            feedback={value.feedback}
                            icon={atsIcons[key] || <Star size={13} />}
                          />
                        ))}
                    </div>
                  </div>

                  {ats.top_suggestions?.length > 0 && (
                    <div className="ats-suggestions">
                      <h4 className="ats-suggestions-title">
                        <Sparkles size={13} /> Top suggestions
                      </h4>
                      <ul className="ats-suggestions-list">
                        {ats.top_suggestions.map((suggestion) => (
                          <li key={suggestion}>
                            <CheckCircle size={12} />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}

              <motion.div className="analysis-bottom-cta lg:col-span-2" variants={fadeUp}>
                <p className="analysis-bottom-text">Ready to put the profile to work?</p>
                <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  The room opens with a short welcome, then Aira starts with your background.
                  Answer out loud — the silence detection handles the rest.
                </p>
                <Button onClick={handleStartInterview} size="lg">
                  Start AI interview
                  <ArrowRight size={16} />
                </Button>
              </motion.div>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
