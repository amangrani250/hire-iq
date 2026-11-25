import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  Code2,
  Cpu,
  Mic,
  Plus,
  Terminal,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Label } from '../components/ui/Field';
import Spinner from '../components/ui/Spinner';
import usePageTitle from '../hooks/usePageTitle';

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://hire-iq-backend-eight.vercel.app';
};
const API_BASE = getApiBase();

const SUGGESTIONS = ['JavaScript', 'TypeScript', 'Python', 'React', 'Java', 'Go', 'SQL'];

const LEVELS = [
  {
    value: 'low',
    title: 'Screening',
    description: 'Fundamentals, definitions, and a steady warm-up.',
  },
  {
    value: 'medium',
    title: 'Product level',
    description: 'Tradeoffs, debugging, and real implementation detail.',
  },
  {
    value: 'high',
    title: 'Staff depth',
    description: 'Architecture, failure modes, and hard follow-ups.',
  },
];

export default function TechInterviewSetup() {
  usePageTitle('Technical round');
  const navigate = useNavigate();
  const [languages, setLanguages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [complexity, setComplexity] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addLanguage = (value) => {
    const cleaned = value.trim().replace(/,$/, '');
    if (!cleaned) return;
    setLanguages((prev) => {
      if (prev.some((language) => language.toLowerCase() === cleaned.toLowerCase())) return prev;
      return [...prev, cleaned];
    });
    setInputValue('');
    setError('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addLanguage(inputValue);
    }
    if (event.key === 'Backspace' && !inputValue && languages.length > 0) {
      setLanguages((prev) => prev.slice(0, -1));
    }
  };

  const removeLanguage = (language) => {
    setLanguages((prev) => prev.filter((item) => item !== language));
  };

  const startInterview = async () => {
    if (languages.length === 0) {
      setError('Add at least one programming language to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/setup-tech-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languages, complexity }),
      });

      if (!res.ok) throw new Error('Could not set up the interview. Please try again.');

      const data = await res.json();
      navigate('/interview', {
        state: { sessionId: data.session_id, candidate: data.candidate },
      });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-10 lg:py-14">
      <PageHeader
        eyebrow="Technical round"
        title="Configure the screen."
        description="Pick the languages you want to be pushed on and how deep the questions should go. Aira handles the rest in the room."
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Terminal size={15} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">Round settings</h2>
              <p className="text-[12px] text-muted-foreground">Applied when the room opens</p>
            </div>
          </div>

          {error && (
            <div
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-3 text-[12.5px] font-medium text-danger"
              role="alert"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-7 space-y-8">
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <Label htmlFor="language-input" className="mb-0">
                  <span className="inline-flex items-center gap-1.5">
                    <Code2 size={14} className="text-muted-foreground" />
                    Programming languages
                  </span>
                </Label>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {languages.length} added
                </span>
              </div>

              <Input
                id="language-input"
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a language and press Enter"
                autoComplete="off"
              />

              <div className="mt-3 flex flex-wrap gap-1.5">
                {languages.map((language) => (
                  <motion.span
                    key={language}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="badge badge-primary gap-1 py-1 pl-2.5 pr-1 text-[12px]"
                  >
                    {language}
                    <button
                      type="button"
                      onClick={() => removeLanguage(language)}
                      className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-primary/15"
                      aria-label={`Remove ${language}`}
                    >
                      <X size={11} />
                    </button>
                  </motion.span>
                ))}
                {languages.length === 0 && (
                  <span className="text-[12px] italic text-muted-foreground">
                    No languages added yet.
                  </span>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/80">
                  Quick add
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.filter(
                    (suggestion) =>
                      !languages.some(
                        (language) => language.toLowerCase() === suggestion.toLowerCase()
                      )
                  ).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addLanguage(suggestion)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                    >
                      <Plus size={10} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <Cpu size={14} className="text-muted-foreground" />
                  Complexity level
                </span>
              </Label>

              <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Complexity level">
                {LEVELS.map((level) => {
                  const selected = complexity === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setComplexity(level.value)}
                      className={`relative rounded-lg border p-3.5 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/50'
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold capitalize text-foreground">
                          {level.title}
                        </span>
                        {selected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check size={10} />
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground">
                        {level.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                8 questions · ~12 min · voice
              </p>
              <Button onClick={startInterview} disabled={loading} size="md">
                {loading ? (
                  <>
                    <Spinner size={14} label="Setting up interview" />
                    Opening the room…
                  </>
                ) : (
                  <>
                    Start technical interview
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <p className="section-label mb-4">What the round covers</p>
            <ul className="space-y-4">
              {[
                {
                  icon: Code2,
                  title: 'Your stack, specifically',
                  copy: 'Questions are grounded in the languages you list — not a generic quiz.',
                },
                {
                  icon: Mic,
                  title: 'Spoken, one question at a time',
                  copy: 'Aira waits for you to finish, follows up, and keeps the pace human.',
                },
                {
                  icon: BarChart3,
                  title: 'A transcript to review',
                  copy: 'Every answer is captured so the feedback can point at specifics.',
                },
              ].map(({ icon: Icon, title, copy }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-subtle text-muted-foreground">
                    <Icon size={14} />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-foreground">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="rounded-xl border border-border bg-subtle p-5">
            <p className="text-[13px] font-medium text-foreground">Want resume-aware questions?</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Upload a resume instead and the round adapts to your actual experience.
            </p>
            <Link
              to="/upload"
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
            >
              Switch to a resume interview <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
