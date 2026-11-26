import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Code, Cpu, ArrowRight, X, AlertCircle, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE, POPULAR_LANGUAGES } from '../utils';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const COMPLEXITY_LEVELS = ['low', 'medium', 'high'] as const;
type Complexity = (typeof COMPLEXITY_LEVELS)[number];

export default function TechInterviewSetup() {
  useDocumentMeta('Tech Interview Setup', 'Configure your technical interview parameters');
  const navigate = useNavigate();
  const [languages, setLanguages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [complexity, setComplexity] = useState<Complexity>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const commitInput = (value = inputValue) => {
    const newLang = value.trim();
    if (newLang && !languages.includes(newLang)) {
      setLanguages((prev) => [...prev, newLang]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitInput();
    }
    if (error) setError('');
  };

  const handleBlur = () => {
    if (inputValue.trim()) commitInput();
  };

  const togglePopular = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((item) => item !== lang) : [...prev, lang]
    );
    if (error) setError('');
  };

  const removeLanguage = (langToRemove: string) => {
    setLanguages((prev) => prev.filter((lang) => lang !== langToRemove));
  };

  const startInterview = async () => {
    const finalLanguages = [...languages];
    const typedLang = inputValue.trim();
    if (typedLang && !finalLanguages.includes(typedLang)) {
      finalLanguages.push(typedLang);
      setLanguages(finalLanguages);
      setInputValue('');
    }

    if (finalLanguages.length === 0) {
      setError('Please add at least one programming language.');
      return;
    }

    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch(`${API_BASE}/api/setup-tech-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languages: finalLanguages, complexity }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('We could not set up the interview. Please try again.');
      const data = await res.json();
      navigate('/interview', {
        state: { sessionId: data.session_id, candidate: data.candidate },
      });
    } catch (err) {
      const message =
        (err as Error).name === 'AbortError'
          ? 'Setup took too long. Check your connection and try again.'
          : (err as Error).message || 'We could not set up the interview. Please try again.';
      setError(message);
      toast.error(message);
      setLoading(false);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return (
    <div className="container-page py-10 lg:py-14">
      <PageHeader
        eyebrow="Technical round"
        title="Configure your technical interview."
        description="Pick the languages you want to be tested on and how deep the interviewer should probe."
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 max-w-2xl"
      >
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Terminal size={20} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">Interview parameters</h2>
              <p className="text-[13px] text-muted-foreground">You can adjust these before starting.</p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mt-6 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/10 p-4 text-danger"
            >
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}

          <div className="mt-8 space-y-8">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Code size={16} /> Programming languages
              </label>

              <div className="mb-3 flex flex-wrap gap-2">
                {[...POPULAR_LANGUAGES].map((lang) => {
                  const selected = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => togglePopular(lang)}
                      aria-pressed={selected}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-subtle text-muted-foreground hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {lang}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  placeholder="Or type a custom language and press Enter…"
                  aria-label="Add a programming language"
                  className="input-field flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => commitInput()}
                  aria-label="Add language"
                >
                  <Plus size={18} />
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={lang}
                    className="flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    {lang}
                    <button
                      type="button"
                      onClick={() => removeLanguage(lang)}
                      aria-label={`Remove ${lang}`}
                      className="ml-1 transition-colors hover:text-danger focus-visible:outline-none"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
                {languages.length === 0 && (
                  <span className="mt-1 inline-block text-sm italic text-muted-foreground">
                    No languages selected yet — click a chip above or type your own.
                  </span>
                )}
              </div>
            </div>

            <div>
              <span id="complexity-label" className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Cpu size={16} /> Complexity level
              </span>
              <div role="radiogroup" aria-labelledby="complexity-label" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {COMPLEXITY_LEVELS.map((level) => {
                  const selected = complexity === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setComplexity(level)}
                      className={`rounded-xl border p-4 text-center transition-all ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-subtle'
                      }`}
                    >
                      <span className="block text-sm font-semibold capitalize">{level}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-6">
              <Button onClick={startInterview} disabled={loading} size="lg" className="w-full px-8 sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Setting up the interview…
                  </>
                ) : (
                  <>
                    Start technical interview
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
