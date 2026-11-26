import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Code, Cpu, ArrowRight, X, AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE, POPULAR_LANGUAGES } from '../utils';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function TechInterviewSetup() {
  useDocumentMeta('Tech Interview Setup', 'Configure your technical interview parameters');
  const navigate = useNavigate();
  const [languages, setLanguages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [complexity, setComplexity] = useState<'low' | 'medium' | 'high'>('medium');
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
    if (languages.includes(lang)) {
      setLanguages((prev) => prev.filter((l) => l !== lang));
    } else {
      setLanguages((prev) => [...prev, lang]);
    }
    if (error) setError('');
  };

  const removeLanguage = (langToRemove: string) => {
    setLanguages((prev) => prev.filter((lang) => lang !== langToRemove));
  };

  const startInterview = async () => {
    let finalLanguages = [...languages];
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

    try {
      const res = await fetch(`${API_BASE}/api/setup-tech-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languages: finalLanguages, complexity }),
      });
      if (!res.ok) throw new Error('Failed to setup interview');
      const data = await res.json();
      navigate('/interview', {
        state: { sessionId: data.session_id, candidate: data.candidate },
      });
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center">
              <Terminal size={20} className="text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Technical Interview Config</h1>
              <p className="text-muted-foreground text-sm">Set up your customized technical interview parameters.</p>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-danger/10 text-danger border border-danger/20 rounded-xl flex items-center gap-2">
              <AlertCircle size={18} /><span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Code size={16} /> Programming Languages
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {[...POPULAR_LANGUAGES].map((lang) => (
                  <button key={lang} type="button" onClick={() => togglePopular(lang)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      languages.includes(lang)
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-primary'
                    }`}>
                    {languages.includes(lang) ? '✓ ' : '+ '}{lang}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input type="text" value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); if (error) setError(''); }}
                  onKeyDown={handleKeyDown} onBlur={handleBlur}
                  placeholder="Or type a custom language and press Enter…"
                  className="input-field flex-1" />
                <button type="button" onClick={() => commitInput()}
                  className="px-3.5 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-primary transition-all"
                  title="Add language">
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {languages.map((lang, i) => (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg border border-primary/15 text-sm font-medium">
                    {lang}
                    <button onClick={() => removeLanguage(lang)} className="hover:text-danger focus:outline-none transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
                {languages.length === 0 && (
                  <span className="text-sm text-muted-foreground italic mt-1 inline-block">
                    No languages selected yet — click a chip above or type below.
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Cpu size={16} /> Complexity Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <div key={level} onClick={() => setComplexity(level)}
                    className={`cursor-pointer border rounded-xl p-4 text-center transition-all ${
                      complexity === level
                        ? 'border-primary bg-accent text-accent-foreground shadow-sm'
                        : 'border-border hover:border-primary/30 text-muted-foreground hover:bg-muted'
                    }`}>
                    <span className="capitalize font-semibold text-sm block">{level}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={startInterview} disabled={loading}
                className="btn btn-primary w-full px-8 text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? (
                  <span className="animate-pulse">Setting up Interview Room...</span>
                ) : (
                  <><ArrowRight size={18} /> Start Technical Interview</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
