import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Code, Cpu, ArrowRight, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://hire-iq-backend-eight.vercel.app';
};
const API_BASE = getApiBase();

export default function TechInterviewSetup() {
  const navigate = useNavigate();
  const [languages, setLanguages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [complexity, setComplexity] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newLang = inputValue.trim();
      if (newLang && !languages.includes(newLang)) {
        setLanguages([...languages, newLang]);
      }
      setInputValue('');
    }
  };

  const removeLanguage = (langToRemove) => {
    setLanguages(languages.filter(lang => lang !== langToRemove));
  };

  const startInterview = async () => {
    if (languages.length === 0) {
      setError('Please add at least one programming language.');
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
      
      if (!res.ok) {
        throw new Error('Failed to setup interview');
      }
      
      const data = await res.json();
      navigate('/interview', {
        state: { sessionId: data.session_id, candidate: data.candidate }
      });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 px-4 pb-12">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Terminal size={20} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Technical Interview Configure</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Setup your customized technical interview parameters.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-8">
            {/* Programming Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Code size={16} /> Programming Languages
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. JavaScript, Python, React (Press Enter to add)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 transition-shadow outline-none text-sm"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {languages.map((lang, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg border border-brand-100 dark:border-brand-800/30 text-sm font-medium"
                  >
                    {lang}
                    <button
                      onClick={() => removeLanguage(lang)}
                      className="hover:text-red-500 focus:outline-none transition-colors ml-1"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
                {languages.length === 0 && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 italic mt-1 inline-block">No languages added yet.</span>
                )}
              </div>
            </div>

            {/* Complexity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Cpu size={16} /> Complexity Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['low', 'medium', 'high'].map(level => (
                  <div
                    key={level}
                    onClick={() => setComplexity(level)}
                    className={`cursor-pointer border rounded-xl p-4 text-center transition-all ${
                      complexity === level
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <span className="capitalize font-medium text-sm block">{level}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <button
                onClick={startInterview}
                disabled={loading}
                className="btn-primary w-full px-8 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="animate-pulse">Setting up Interview Room...</span>
                ) : (
                  <>
                    Start Technical Interview
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
