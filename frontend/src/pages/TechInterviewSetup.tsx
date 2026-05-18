import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Code, Cpu, ArrowRight, X, AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE, POPULAR_LANGUAGES } from '../utils';

export default function TechInterviewSetup() {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 px-4 pb-12">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Terminal size={20} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Technical Interview Config</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Setup your customized technical interview parameters.</p>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} /><span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Code size={16} /> Programming Languages
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                {[...POPULAR_LANGUAGES].map((lang) => (
                  <button key={lang} type="button" onClick={() => togglePopular(lang)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      languages.includes(lang)
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400'
                    }`}>
                    {languages.includes(lang) ? '\u2713 ' : '+ '}{lang}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input type="text" value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); if (error) setError(''); }}
                  onKeyDown={handleKeyDown} onBlur={handleBlur}
                  placeholder="Or type a custom language and press Enter\u2026"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 transition-shadow outline-none text-sm" />
                <button type="button" onClick={() => commitInput()}
                  className="px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 transition-all"
                  title="Add language">
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {languages.map((lang, i) => (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg border border-brand-100 dark:border-brand-800/30 text-sm font-medium">
                    {lang}
                    <button onClick={() => removeLanguage(lang)} className="hover:text-red-500 focus:outline-none transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
                {languages.length === 0 && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 italic mt-1 inline-block">
                    No languages selected yet \u2014 click a chip above or type below.
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Cpu size={16} /> Complexity Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <div key={level} onClick={() => setComplexity(level)}
                    className={`cursor-pointer border rounded-xl p-4 text-center transition-all ${
                      complexity === level
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}>
                    <span className="capitalize font-medium text-sm block">{level}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={startInterview} disabled={loading}
                className="btn-primary w-full px-8 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
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
