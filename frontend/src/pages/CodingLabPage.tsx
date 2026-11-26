import { lazy, Suspense, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Code2,
  Copy,
  Cpu,
  FileCode,
  Lightbulb,
  ListChecks,
  MessageSquare,
  PanelLeft,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  XCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Badge, { type BadgeTone } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Tabs from '../components/ui/Tabs';
import MetricCard from '../components/ui/MetricCard';
import AiraAvatar from '../components/ui/AiraAvatar';
import CodeBlock from '../components/ui/CodeBlock';
import ElapsedClock from '../components/ui/ElapsedClock';
import { useTheme } from '../contexts/ThemeContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { cn } from '../lib/cn';
import { reviewCodingSolution, runCodingSolution } from '../services/coding-api';
import { useCodingCatalog } from '../services/query-api';
import type {
  CodingChallenge,
  CodingCatalog,
  CodingDifficulty,
  CodingLanguage,
  CodingReview,
  CodingRunMode,
  CodingRunResult,
  CodingTestResult,
  CodingWarmup,
} from '../types';

const DIFFICULTIES: Array<{ value: CodingDifficulty; label: string; description: string }> = [
  { value: 'easy', label: 'Easy', description: 'Warm-up' },
  { value: 'medium', label: 'Medium', description: 'Product level' },
  { value: 'hard', label: 'Hard', description: 'Senior depth' },
];

const LANGUAGE_MARKS: Record<string, string> = {
  python: 'Py',
  javascript: 'JS',
  typescript: 'TS',
  java: 'Jv',
};

const LANGUAGE_ACCENTS: Record<string, string> = {
  python: 'from-[#2f7d64] to-[#1b4d3e]',
  javascript: 'from-[#b28a2e] to-[#6e5416]',
  typescript: 'from-[#2f6f9e] to-[#1b3f5c]',
  java: 'from-[#a35a3d] to-[#5d2f1e]',
};

type WorkspaceTab = 'tests' | 'output' | 'review';
type BriefTab = 'warmup' | 'problem' | 'hints';

const ease = [0.22, 1, 0.36, 1] as const;

function languageMark(language: CodingLanguage): string {
  return LANGUAGE_MARKS[language.id] ?? language.label.slice(0, 2);
}

const CodeEditor = lazy(() => import('../components/coding/CodeEditor'));

function testTone(test: CodingTestResult): BadgeTone {
  if (test.passed) return 'success';
  if (test.status === 'timeout' || test.status === 'runtime_error') return 'warning';
  return 'danger';
}

function verdictTone(verdict: CodingReview['verdict']): BadgeTone {
  if (verdict === 'correct') return 'success';
  if (verdict === 'almost') return 'warning';
  if (verdict === 'incorrect') return 'danger';
  return 'neutral';
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function SelectionScreen({
  catalog,
  language,
  difficulty,
  challenge,
  onLanguage,
  onDifficulty,
  onChallenge,
  onStart,
}: {
  catalog: CodingCatalog;
  language: CodingLanguage | undefined;
  difficulty: CodingDifficulty;
  challenge: CodingChallenge | undefined;
  onLanguage: (id: string) => void;
  onDifficulty: (value: CodingDifficulty) => void;
  onChallenge: (id: string) => void;
  onStart: () => void;
}) {
  const challenges = catalog.challenges.filter((item) => item.difficulty === difficulty);

  return (
    <div className="container-page py-10 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 lg:p-10"
      >
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
          <div>
            <p className="eyebrow eyebrow-dot">Integrated coding lab</p>
            <h1 className="mt-4 max-w-2xl text-[clamp(2.2rem,4.4vw,3.8rem)] font-semibold tracking-[-0.045em] text-foreground">
              Write it. Run it. Defend it.
            </h1>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
              Pick a language and a challenge. Aira starts with the questions an interviewer actually asks,
              then hands you an editor, a real judge, and a senior-level review of how you solved it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="primary"><ShieldCheck size={11} /> Real local judge</Badge>
              <Badge><Cpu size={11} /> {catalog.languages.filter((item) => item.available).length} runtimes detected</Badge>
              <Badge><Sparkles size={11} /> Aira code review</Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Challenges" value={catalog.challenges.length} hint="curated" />
            <MetricCard
              label="Runtimes"
              value={catalog.languages.filter((item) => item.available).length}
              hint="detected"
            />
            <MetricCard label="Session" value="~15m" hint="per challenge" />
          </div>
        </div>
      </motion.div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="section-label mb-2">01 / Language</p>
                <h2 className="text-[18px] font-semibold text-foreground">Choose your weapon</h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                Detected on this machine
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {catalog.languages.map((item) => {
                const selected = item.id === language?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.available}
                    onClick={() => onLanguage(item.id)}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-subtle',
                      !item.available && 'cursor-not-allowed opacity-40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-mono text-[10px] font-semibold text-white',
                        LANGUAGE_ACCENTS[item.id] ?? 'from-[#2f7d64] to-[#1b4d3e]'
                      )}
                    >
                      {languageMark(item)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                        {item.label}
                        {selected && <Check size={12} className="text-primary" />}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                        {item.available ? `v${item.version || 'local'}` : 'not installed'}
                      </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground/50" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <p className="section-label mb-2">02 / Difficulty</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DIFFICULTIES.map((item) => {
                const selected = item.value === difficulty;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onDifficulty(item.value)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-subtle'
                    )}
                  >
                    <span className="flex items-center justify-between text-[12.5px] font-semibold text-foreground">
                      {item.label}
                      {selected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={10} />
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.description}</span>
                  </button>
                );
              })}
            </div>

            <p className="section-label mb-2 mt-6">03 / Challenge</p>
            <div className="space-y-2">
              {challenges.map((item) => {
                const selected = item.id === challenge?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChallenge(item.id)}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-subtle'
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-[13.5px] font-semibold text-foreground">{item.title}</span>
                        <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
                          {item.summary}
                        </span>
                      </span>
                      <Badge tone={item.difficulty === 'easy' ? 'success' : item.difficulty === 'medium' ? 'warning' : 'danger'}>
                        {item.difficulty}
                      </Badge>
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Timer size={11} /> {item.estimated_minutes} min</span>
                      <span className="inline-flex items-center gap-1"><Code2 size={11} /> {item.expected_complexity}</span>
                      <span className="inline-flex items-center gap-1"><ListChecks size={11} /> {item.sample_tests.length} sample tests</span>
                    </span>
                  </button>
                );
              })}
              {challenges.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-subtle p-6 text-center text-[12.5px] text-muted-foreground">
                  No challenge on this level yet. Pick another difficulty.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border bg-subtle/60 p-4">
              <AiraAvatar online />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">Aira</p>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  Senior interviewer · coding
                </p>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> ready
              </span>
            </div>
            <div className="space-y-4 p-4">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                “We’ll start with how you reason about requirements and edge cases. Then you’ll
                implement <strong className="text-foreground">{challenge?.title ?? 'a challenge'}</strong>.
                I’ll run the hidden tests and review the solution like a real senior engineer.”
              </p>
              <div className="rounded-lg border border-border bg-subtle p-3">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  Warm-up questions
                </p>
                <ul className="mt-2 space-y-2">
                  {catalog.warmups.slice(0, 3).map((warmup) => (
                    <li key={warmup.id} className="flex gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {warmup.question.replace('{language}', language?.label ?? 'your stack')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <p className="section-label mb-3">In the room</p>
            <ol className="space-y-3">
              {[
                ['Warm-up', 'Answer the interviewer’s requirements and edge-case questions.'],
                ['Implement', 'Code in a real editor with syntax highlighting and autosave.'],
                ['Judge', 'Run samples, then submit against the hidden suite.'],
                ['Review', 'Get Aira’s notes on correctness, complexity, and next steps.'],
              ].map(([title, copy], index) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-subtle font-mono text-[9px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-[12px] font-medium text-foreground">{title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">{copy}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <Button onClick={onStart} disabled={!language?.available || !challenge} size="lg" className="w-full">
            <Play size={16} />
            Open the coding room
          </Button>
          {!language?.available && (
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-warning">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Select an available runtime to start.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function CodingLabPage() {
  useDocumentMeta('Coding Lab', 'Language-aware coding interview with a real judge and AI review');
  const { theme } = useTheme();
  const {
    data: catalog = null,
    isLoading: loading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useCodingCatalog();
  const loadError = catalogError instanceof Error ? catalogError.message : '';
  const [languageId, setLanguageId] = useState('python');
  const [difficulty, setDifficulty] = useState<CodingDifficulty>('easy');
  const [challengeId, setChallengeId] = useState('pair-sum');
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [results, setResults] = useState<CodingRunResult | null>(null);
  const [judgeError, setJudgeError] = useState('');
  const [runningMode, setRunningMode] = useState<CodingRunMode | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tests');
  const [briefTab, setBriefTab] = useState<BriefTab>('warmup');
  const [showBrief, setShowBrief] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [review, setReview] = useState<CodingReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [resultsStale, setResultsStale] = useState(false);
  const runInFlightRef = useRef(false);
  const reviewInFlightRef = useRef(false);

  const language = useMemo(
    () => catalog?.languages.find((item) => item.id === languageId) ?? catalog?.languages.find((item) => item.available),
    [catalog, languageId]
  );
  const challenge = useMemo(
    () => catalog?.challenges.find((item) => item.id === challengeId),
    [catalog, challengeId]
  );

  useEffect(() => {
    if (!catalog) return;
    const available = catalog.languages.filter((item) => item.available);
    if (available.length && !available.some((item) => item.id === languageId)) {
      setLanguageId(available[0].id);
    }
    if (!catalog.challenges.some((item) => item.id === challengeId)) {
      setChallengeId(catalog.challenges[0]?.id ?? '');
    }
  }, [catalog, languageId, challengeId]);

  useEffect(() => {
    if (!catalog) return;
    const forLevel = catalog.challenges.filter((item) => item.difficulty === difficulty);
    if (forLevel.length && !forLevel.some((item) => item.id === challengeId)) {
      setChallengeId(forLevel[0].id);
    }
  }, [catalog, difficulty, challengeId]);



  useEffect(() => {
    if (!started || !challenge || !language) return;
    const draftKey = `hireiq:coding:draft:${challenge.id}:${language.id}`;
    const warmKey = `hireiq:coding:warmup:${challenge.id}:${language.id}`;
    let draft = challenge.starters[language.id] ?? '';
    try {
      draft = localStorage.getItem(draftKey) ?? draft;
    } catch {
      /* storage can be unavailable */
    }
    setCode(draft);
    setResults(null);
    setReview(null);
    setJudgeError('');
    setReviewError('');
    setResultsStale(false);
    setActiveTab('tests');
    setBriefTab('warmup');
    setHintsRevealed(0);
    try {
      const stored = localStorage.getItem(warmKey);
      setAnswers(stored ? (JSON.parse(stored) as Record<string, string>) : {});
    } catch {
      setAnswers({});
    }
  }, [started, challenge?.id, language?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setResultsStale(Boolean(results));
    setReview(null);
    setReviewError('');
    if (challenge && language) {
      try {
        localStorage.setItem(`hireiq:coding:draft:${challenge.id}:${language.id}`, value);
      } catch {
        /* storage can be unavailable or full */
      }
    }
  }, [challenge, language, results]);

  const handleAnswer = (warmupId: string, value: string) => {
    setAnswers((previous) => {
      const next = { ...previous, [warmupId]: value };
      if (challenge && language) {
        try {
          localStorage.setItem(`hireiq:coding:warmup:${challenge.id}:${language.id}`, JSON.stringify(next));
        } catch {
          /* storage can be unavailable or full */
        }
      }
      return next;
    });
  };

  const execute = useCallback(
    async (mode: CodingRunMode) => {
      if (!challenge || !language || runInFlightRef.current) return;
      runInFlightRef.current = true;
      setRunningMode(mode);
      setJudgeError('');
      setResultsStale(false);
      setActiveTab('tests');
      try {
        const result = await runCodingSolution({
          language: language.id,
          challenge_id: challenge.id,
          code,
          mode,
        });
        setResults(result);
        if (result.status === 'passed') {
          toast.success(mode === 'submit' ? 'All hidden tests passed' : 'Sample tests passed');
        } else if (result.status === 'compile_error') {
          toast.error('Compilation failed — check the output tab');
          setActiveTab('output');
        } else {
          setActiveTab('tests');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The judge could not run your code.';
        setJudgeError(message);
        // Keep any previous results visible but clearly mark them as not from this run.
        setResultsStale(true);
        toast.error(message);
      } finally {
        runInFlightRef.current = false;
        setRunningMode(null);
      }
    },
    [challenge, language, code]
  );
  const handleShortcut = useEffectEvent((mode: CodingRunMode) => {
    void execute(mode);
  });

  useEffect(() => {
    if (!started) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleShortcut(event.shiftKey ? 'submit' : 'run');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started]);

  const handleReview = async () => {
    if (!challenge || !language || reviewInFlightRef.current) return;
    reviewInFlightRef.current = true;
    setReviewing(true);
    setReviewError('');
    setActiveTab('review');
    try {
      const response = await reviewCodingSolution({
        language: language.id,
        challenge_id: challenge.id,
        code,
        results: resultsStale ? null : results,
        warmup_answers: (catalog?.warmups ?? []).map((warmup) => ({
          question_id: warmup.id,
          question: warmup.question.replace('{language}', language.label),
          answer: answers[warmup.id] ?? '',
        })),
      });
      setReview(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Aira could not review this solution.';
      setReviewError(message);
      toast.error(message);
    } finally {
      reviewInFlightRef.current = false;
      setReviewing(false);
    }
  };

  const start = () => {
    if (!challenge || !language?.available) return;
    setStartedAt(Date.now());
    setStarted(true);
    setShowBrief(false);
  };

  const resetCode = () => {
    if (!challenge || !language) return;
    const starter = challenge.starters[language.id] ?? '';
    handleCodeChange(starter);
    setResults(null);
    toast.success('Starter restored');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner size={18} className="text-primary" /> Loading runtimes…
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg rounded-xl border border-danger/25 bg-danger/5 p-6 text-center">
          <AlertTriangle size={22} className="mx-auto text-danger" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">Coding lab unavailable</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {loadError || 'Could not load the coding lab.'}
          </p>
          <Button onClick={() => void refetchCatalog()} className="mt-5" size="sm">Try again</Button>
        </div>
      </div>
    );
  }

  if (!started || !challenge || !language) {
    return (
      <SelectionScreen
        catalog={catalog}
        language={language}
        difficulty={difficulty}
        challenge={challenge}
        onLanguage={setLanguageId}
        onDifficulty={setDifficulty}
        onChallenge={setChallengeId}
        onStart={start}
      />
    );
  }

  const passed = results?.passed ?? 0;
  const total = results?.total ?? challenge.sample_tests.length;
  const allVisiblePassed = results?.status === 'passed';
  const warmups = catalog.warmups;

  return (
    <div className="min-h-[calc(100dvh-var(--nav-height))]">
      <div className="sticky top-nav z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStarted(false)}
              aria-label="Change setup"
              className="shrink-0"
            >
              <ArrowLeft size={15} />
            </Button>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[13.5px] font-semibold text-foreground">{challenge.title}</h1>
                <Badge tone={challenge.difficulty === 'easy' ? 'success' : challenge.difficulty === 'medium' ? 'warning' : 'danger'}>
                  {challenge.difficulty}
                </Badge>
              </div>
              <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                {language.label} · {challenge.expected_complexity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground sm:flex">
              <Clock size={12} /> <ElapsedClock startedAt={startedAt} />
            </span>
            <Button variant="ghost" size="sm" className="xl:hidden" onClick={() => setShowBrief((value) => !value)}>
              <PanelLeft size={14} /> Brief
            </Button>
            <Button variant="ghost" size="sm" onClick={resetCode} aria-label="Reset code" title="Reset code">
              <RotateCcw size={14} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void execute('run')}
              disabled={Boolean(runningMode)}
            >
              {runningMode === 'run' ? <Spinner size={13} /> : <Play size={13} />}
              Run
            </Button>
            <Button size="sm" onClick={() => void execute('submit')} disabled={Boolean(runningMode)}>
              {runningMode === 'submit' ? <Spinner size={13} /> : <CheckCircle2 size={13} />}
              Submit
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={cn('min-w-0 space-y-3', showBrief ? 'block' : 'hidden xl:block')}>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-subtle/60 p-3.5">
              <AiraAvatar online />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-foreground">Aira</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  Live interviewer
                </p>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> online
              </span>
            </div>

            <Tabs
              items={[
                { value: 'warmup', label: 'Warm-up', icon: MessageSquare },
                { value: 'problem', label: 'Problem', icon: BookOpen },
                { value: 'hints', label: 'Hints', icon: Lightbulb },
              ]}
              value={briefTab}
              onChange={setBriefTab}
              ariaLabel="Interview brief"
              className="border-b border-border p-2 [&>button]:flex-1 [&>button]:justify-center"
            />

            <div className="max-h-[52vh] overflow-y-auto p-3.5 xl:max-h-[calc(100dvh-14rem)]">
              {briefTab === 'warmup' && (
                <div className="space-y-4">
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    “Before we touch the editor: how do you make sure you’re solving the right problem?”
                  </p>
                  {warmups.map((warmup) => (
                    <WarmupField
                      key={warmup.id}
                      warmup={warmup}
                      languageLabel={language.label}
                      value={answers[warmup.id] ?? ''}
                      onChange={(value) => handleAnswer(warmup.id, value)}
                    />
                  ))}
                  <div className="rounded-lg border border-border bg-subtle p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                      <Sparkles size={12} className="text-primary" /> After you submit
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Ask Aira for a review. She’ll look at your code, test results, complexity, and warm-up answers.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2.5 w-full"
                      onClick={() => void handleReview()}
                      disabled={reviewing}
                    >
                      {reviewing ? <Spinner size={12} /> : <Sparkles size={12} />}
                      Review with Aira
                    </Button>
                  </div>
                </div>
              )}

              {briefTab === 'problem' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">The brief</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{challenge.prompt}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">Constraints</p>
                    <ul className="mt-2 space-y-1.5">
                      {challenge.constraints.map((constraint) => (
                        <li key={constraint} className="flex gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          {constraint}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">Examples</p>
                    {challenge.examples.map((example, index) => (
                      <div key={index} className="rounded-lg border border-border bg-subtle p-2.5">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <CodeBlock title="Input">{example.input}</CodeBlock>
                          <CodeBlock title="Output">{example.output}</CodeBlock>
                        </div>
                        {example.explanation && (
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{example.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border bg-subtle p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Target complexity</p>
                    <p className="mt-1 font-mono text-[11.5px] text-foreground">{challenge.expected_complexity}</p>
                  </div>
                </div>
              )}

              {briefTab === 'hints' && (
                <div className="space-y-3">
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Try it without hints first. Reveal one nudge at a time.
                  </p>
                  {challenge.hints.slice(0, hintsRevealed).map((hint, index) => (
                    <div key={hint} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-primary">Hint {index + 1}</p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-foreground">{hint}</p>
                    </div>
                  ))}
                  {hintsRevealed < challenge.hints.length ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setHintsRevealed((value) => value + 1)}
                    >
                      <Lightbulb size={12} /> Reveal hint {hintsRevealed + 1}
                    </Button>
                  ) : (
                    <p className="text-center text-[11px] text-muted-foreground">All hints revealed.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Tests"
              value={results ? `${passed}/${total}` : `—/${challenge.sample_tests.length}`}
              hint={results ? (results.mode === 'submit' ? 'hidden suite' : 'samples') : 'not run'}
            />
            <MetricCard
              label="Runtime"
              value={results ? `${results.duration_ms} ms` : '—'}
              hint={results?.status ?? 'judge ready'}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-subtle text-muted-foreground">
                  <FileCode size={13} />
                </span>
                <div>
                  <p className="font-mono text-[11px] text-foreground">
                    solution.{language.extension}
                  </p>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    {language.label} · {language.version}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(code);
                    toast.success('Code copied');
                  }}
                >
                  <Copy size={12} /> Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBrief(false)}
                  className="xl:hidden"
                >
                  <PanelLeft size={12} /> Hide brief
                </Button>
              </div>
            </div>

            <div className="bg-card">
              <Suspense
                fallback={
                  <div className="flex h-[clamp(340px,50vh,580px)] items-center justify-center gap-2 text-[12px] text-muted-foreground">
                    <Spinner size={15} className="text-primary" /> Preparing editor…
                  </div>
                }
              >
                <CodeEditor
                  value={code}
                  languageId={language.id}
                  dark={theme === 'dark'}
                  onChange={handleCodeChange}
                />
              </Suspense>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CircleDot size={10} className="text-primary" /> Draft autosaved locally
              </span>
              <span className="hidden sm:inline">Ctrl/⌘ + Enter to run · Shift adds hidden tests</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2 py-1.5">
              <Tabs
                items={[
                  {
                    value: 'tests',
                    label: 'Test results',
                    icon: ListChecks,
                    badge: results ? (
                      <span
                        className={cn(
                          'ml-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px]',
                          results.status === 'passed' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        )}
                      >
                        {passed}/{total}
                      </span>
                    ) : undefined,
                  },
                  { value: 'output', label: 'Output', icon: Terminal },
                  { value: 'review', label: 'Aira review', icon: Sparkles },
                ]}
                value={activeTab}
                onChange={setActiveTab}
                ariaLabel="Run results and review"
                variant="muted"
              />
              {activeTab === 'review' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleReview()}
                  disabled={reviewing}
                >
                  {reviewing ? <Spinner size={12} /> : <Sparkles size={12} />}
                  Review
                </Button>
              )}
            </div>

            <div className="max-h-[360px] min-h-[220px] overflow-y-auto p-3.5">
              {judgeError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/5 p-3 text-[12px] text-danger">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {judgeError}
                </div>
              )}

              {activeTab === 'tests' && (
                <>
                  {!results && !runningMode && (
                    <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                      <Terminal size={24} className="text-muted-foreground/50" />
                      <p className="mt-3 text-[12.5px] font-medium text-foreground">No runs yet</p>
                      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
                        Run the sample tests first. Submit when you are ready for the hidden suite.
                      </p>
                      <Button size="sm" className="mt-4" onClick={() => void execute('run')}>
                        <Play size={12} /> Run sample tests
                      </Button>
                    </div>
                  )}

                  {runningMode && (
                    <div className="flex min-h-[180px] items-center justify-center gap-2 text-[12px] text-muted-foreground">
                      <Spinner size={16} className="text-primary" />
                      {runningMode === 'submit' ? 'Running hidden tests…' : 'Running sample tests…'}
                    </div>
                  )}

                  {results && (
                    <div className="space-y-2.5">
                      <div className={cn(
                        'flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3',
                        results.status === 'passed' ? 'border-success/25 bg-success/5' : 'border-danger/25 bg-danger/5'
                      )}>
                        <p className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                          {results.status === 'passed' ? <CheckCircle2 size={15} className="text-success" /> : <XCircle size={15} className="text-danger" />}
                          {results.status === 'passed' ? 'All tests passed' : results.status === 'compile_error' ? 'Compilation failed' : `${passed} of ${total} tests passed`}
                        </p>
                        <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                          {resultsStale && <Badge tone="warning">edited since run</Badge>}
                          {results.duration_ms} ms · {results.mode === 'submit' ? 'hidden suite' : 'samples'}
                        </span>
                      </div>

                      {results.compile_output && (
                        <div className="rounded-lg border border-warning/25 bg-warning/5 p-3">
                          <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-warning">Compiler output</p>
                          <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-foreground">{results.compile_output}</pre>
                        </div>
                      )}

                      {results.tests.map((test) => (
                        <details
                          key={test.name}
                          open={!test.passed}
                          className="rounded-lg border border-border bg-card"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5">
                            <span className="flex min-w-0 items-center gap-2">
                              {test.passed ? <CheckCircle2 size={14} className="shrink-0 text-success" /> : <XCircle size={14} className="shrink-0 text-danger" />}
                              <span className="truncate text-[12px] font-medium text-foreground">{test.name}</span>
                              {test.hidden && <Badge tone="neutral" className="text-[9px]">hidden</Badge>}
                              <Badge tone={testTone(test)} className="text-[9px]">{test.status.replace('_', ' ')}</Badge>
                            </span>
                            <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground">{test.duration_ms} ms</span>
                          </summary>
                          <div className="grid gap-2.5 border-t border-border p-3 sm:grid-cols-2">
                            <CodeBlock title="Input">{test.input}</CodeBlock>
                            <CodeBlock title="Expected">{test.expected}</CodeBlock>
                            <CodeBlock title="Actual">{test.actual}</CodeBlock>
                            {test.stderr && <CodeBlock title="stderr">{test.stderr}</CodeBlock>}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'output' && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">Program output</p>
                    <Badge tone={results?.status === 'passed' ? 'success' : 'neutral'}>
                      {results?.status ?? 'not run'}
                    </Badge>
                  </div>
                  <pre className="mt-2 min-h-[170px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-[#0a0f0d] p-3 font-mono text-[12px] leading-relaxed text-[#d7e4de]">
                    {results?.compile_output
                      || results?.tests.map((test) => `[${test.name}] ${test.actual || test.stderr || '(no output)'}`).join('\n')
                      || 'Run your code to see program output.'}
                  </pre>
                </div>
              )}

              {activeTab === 'review' && (
                <div>
                  {reviewing && (
                    <div className="flex min-h-[180px] items-center justify-center gap-2 text-[12px] text-muted-foreground">
                      <Spinner size={16} className="text-primary" /> Aira is reviewing your solution…
                    </div>
                  )}

                  {!reviewing && reviewError && (
                    <div className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/5 p-3 text-[12px] text-danger">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {reviewError}
                    </div>
                  )}

                  {!reviewing && !review && !reviewError && (
                    <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                      <Sparkles size={24} className="text-primary/60" />
                      <p className="mt-3 text-[12.5px] font-medium text-foreground">A senior-level code review</p>
                      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
                        Aira reviews correctness, edge cases, complexity, and the way you explained your reasoning.
                      </p>
                      <Button size="sm" className="mt-4" onClick={() => void handleReview()}>
                        <Sparkles size={12} /> Review my solution
                      </Button>
                    </div>
                  )}

                  {!reviewing && review && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={verdictTone(review.verdict)}>{review.verdict.replace('_', ' ')}</Badge>
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          {challenge.expected_complexity}
                        </span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-foreground">{review.summary}</p>
                      <div className="rounded-lg border border-border bg-subtle p-3">
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">Complexity</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-foreground">{review.complexity}</p>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <ReviewList title="What worked" tone="success" items={asList(review.strengths)} />
                        <ReviewList title="What to fix" tone="danger" items={asList(review.issues)} />
                      </div>
                      <ReviewList title="Next steps" tone="primary" items={asList(review.next_steps)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.08em]">
              <Zap size={11} className="text-primary" /> {allVisiblePassed ? 'Sample suite green' : 'Judge ready'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Timer size={11} /> <ElapsedClock startedAt={startedAt} /> elapsed · drafts stay on this device
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarmupField({
  warmup,
  languageLabel,
  value,
  onChange,
}: {
  warmup: CodingWarmup;
  languageLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-primary">{warmup.category}</span>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
          {value.trim() ? 'saved' : 'optional'}
        </span>
      </span>
      <span className="mt-1 block text-[11.5px] leading-relaxed text-foreground">
        {warmup.question.replace('{language}', languageLabel)}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder="Think out loud…"
        className="input-field mt-2 resize-none py-2 text-[12px]"
      />
    </label>
  );
}

function ReviewList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'success' | 'danger' | 'primary';
}) {
  const border = tone === 'success' ? 'border-t-success' : tone === 'danger' ? 'border-t-danger' : 'border-t-primary';
  if (!items.length) return null;
  return (
    <div className={cn('rounded-lg border border-border border-t-2 bg-subtle p-3', border)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[11.5px] leading-relaxed text-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
