import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Search, ArrowRight, Sparkles, Code, Database,
  Globe, Shield, BarChart3, Cpu, Layers, Smartphone, Cloud,
  Brain, ChevronRight, Clock
} from 'lucide-react';

const JOB_CATEGORIES = [
  {
    category: 'Software Engineering',
    icon: <Code size={20} />,
    color: '#4f8ef7',
    jobs: [
      'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'React Developer', 'Node.js Developer', 'Java Developer',
      'Python Developer', 'Go Developer', 'Rust Developer',
    ],
  },
  {
    category: 'Mobile Development',
    icon: <Smartphone size={20} />,
    color: '#a855f7',
    jobs: [
      'Android Developer', 'iOS Developer', 'React Native Developer',
      'Flutter Developer',
    ],
  },
  {
    category: 'Data & AI',
    icon: <Brain size={20} />,
    color: '#10b981',
    jobs: [
      'Data Scientist', 'Machine Learning Engineer', 'Data Engineer',
      'AI Engineer', 'Data Analyst', 'NLP Engineer',
    ],
  },
  {
    category: 'Cloud & DevOps',
    icon: <Cloud size={20} />,
    color: '#f59e0b',
    jobs: [
      'DevOps Engineer', 'Cloud Engineer (AWS)', 'Cloud Engineer (GCP)',
      'Cloud Engineer (Azure)', 'Site Reliability Engineer', 'Platform Engineer',
    ],
  },
  {
    category: 'Database',
    icon: <Database size={20} />,
    color: '#ef4444',
    jobs: ['Database Administrator', 'Database Developer', 'MongoDB Developer', 'PostgreSQL Engineer'],
  },
  {
    category: 'Security',
    icon: <Shield size={20} />,
    color: '#8b5cf6',
    jobs: ['Security Engineer', 'Penetration Tester', 'Security Analyst', 'Application Security Engineer'],
  },
  {
    category: 'Product & Design',
    icon: <Layers size={20} />,
    color: '#ec4899',
    jobs: ['Product Manager', 'UI/UX Designer', 'UX Researcher', 'Technical Product Manager'],
  },
  {
    category: 'Analytics & Business',
    icon: <BarChart3 size={20} />,
    color: '#14b8a6',
    jobs: ['Business Analyst', 'Data Analyst', 'Growth Analyst', 'Marketing Analyst'],
  },
];

const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher / Entry Level', desc: '0–2 years, fundamentals focus', icon: '🌱' },
  { value: 'mid', label: 'Mid Level', desc: '2–5 years, practical depth', icon: '🚀' },
  { value: 'senior', label: 'Senior Level', desc: '5+ years, architecture & leadership', icon: '⚡' },
];

const DURATIONS = [
  { value: 7, label: '7 Days', desc: 'Quick sprint', icon: <Clock size={16} /> },
  { value: 14, label: '14 Days', desc: 'Solid preparation', icon: <Clock size={16} /> },
  { value: 30, label: '30 Days', desc: 'Deep mastery', icon: <Clock size={16} /> },
];

export default function JobPrepPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [customJob, setCustomJob] = useState('');
  const [experience, setExperience] = useState('mid');
  const [duration, setDuration] = useState(14);
  const [step, setStep] = useState(1); // 1: select job, 2: configure

  const filteredCategories = JOB_CATEGORIES.map(cat => ({
    ...cat,
    jobs: cat.jobs.filter(j =>
      search.trim() === '' || j.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.jobs.length > 0);

  const finalJob = customJob.trim() || selectedJob;
  const canProceed = finalJob !== '';

  const handleStart = () => {
    navigate('/job-roadmap', {
      state: { jobTitle: finalJob, experienceLevel: experience, durationDays: duration },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Briefcase size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">Job Interview Prep</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI-powered study roadmap → interview</p>
            </div>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${step === 1 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-gray-400'}`}>
              <span className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">1</span>
              Select Role
            </div>
            <ChevronRight size={14} className="text-gray-300" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${step === 2 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-gray-400'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-brand-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>2</span>
              Configure
            </div>
            <ChevronRight size={14} className="text-gray-300" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-400">
              <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-[10px]">3</span>
              Roadmap
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              {/* Hero text */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full text-sm font-medium mb-4 border border-brand-100 dark:border-brand-800/40"
                >
                  <Sparkles size={14} />
                  AI-Powered Interview Coaching
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Which role are you targeting?
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Select a job or type your own. We'll build you a day-by-day study plan and AI interview.
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search job titles…"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm"
                />
              </div>

              {/* Custom job input */}
              <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Or type a custom role
                </label>
                <input
                  type="text"
                  value={customJob}
                  onChange={e => { setCustomJob(e.target.value); setSelectedJob(''); }}
                  placeholder="e.g. Blockchain Developer, Embedded Systems Engineer…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
              </div>

              {/* Job category grid */}
              <div className="space-y-6">
                {filteredCategories.map(cat => (
                  <div key={cat.category}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg" style={{ background: `${cat.color}20`, color: cat.color }}>
                        {cat.icon}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat.category}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cat.jobs.map(job => (
                        <button
                          key={job}
                          onClick={() => { setSelectedJob(job); setCustomJob(''); }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                            selectedJob === job
                              ? 'border-brand-500 text-white shadow-md'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400'
                          }`}
                          style={selectedJob === job ? { background: cat.color, borderColor: cat.color } : {}}
                        >
                          {job}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Next button */}
              <div className="mt-8 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={!canProceed}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
                >
                  Continue with "{finalJob || '…'}"
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-sm font-semibold mb-4 border border-green-100 dark:border-green-800/30">
                  <Briefcase size={14} />
                  {finalJob}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Configure your prep plan</h2>
                <p className="text-gray-500 dark:text-gray-400">Tell us your level and how many days you have to prepare.</p>
              </div>

              <div className="grid gap-6 max-w-2xl mx-auto">
                {/* Experience level */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Your Experience Level</h3>
                  <div className="space-y-3">
                    {EXPERIENCE_LEVELS.map(lvl => (
                      <button
                        key={lvl.value}
                        onClick={() => setExperience(lvl.value)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                          experience === lvl.value
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-2xl">{lvl.icon}</span>
                        <div className="flex-1">
                          <div className={`font-semibold text-sm ${experience === lvl.value ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {lvl.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lvl.desc}</div>
                        </div>
                        {experience === lvl.value && (
                          <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Preparation Duration</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {DURATIONS.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setDuration(d.value)}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all ${
                          duration === d.value
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300'
                        }`}
                      >
                        <Clock size={18} />
                        <span className="font-bold text-base">{d.label}</span>
                        <span className="text-xs opacity-70">{d.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary & Generate */}
                <div className="bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <Sparkles size={20} className="mt-0.5 opacity-80" />
                    <div>
                      <div className="font-bold text-base">Ready to generate your roadmap!</div>
                      <div className="text-sm opacity-75 mt-1">
                        AI will create a {duration}-day personalized plan for <strong>{finalJob}</strong> at {EXPERIENCE_LEVELS.find(l => l.value === experience)?.label} level.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-all"
                    >
                      ← Change Role
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleStart}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-brand-700 text-sm font-bold transition-all hover:bg-gray-50 shadow-lg"
                    >
                      Generate My Roadmap
                      <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
