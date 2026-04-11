import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2,
  BookOpen, Code, RefreshCw, Zap, ArrowRight, Trophy,
  Target, Clock, Sparkles, Lock, AlertCircle, RotateCcw,
  Play, Star, Brain, Map, ListChecks
} from 'lucide-react';
import toast from 'react-hot-toast';

const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://hire-iq-backend-eight.vercel.app';
};
const API_BASE = getApiBase();

const STORAGE_KEY = 'hire_iq_roadmap_progress';

const TASK_TYPE_META = {
  learn: { icon: <BookOpen size={14} />, color: '#4f8ef7', bg: '#4f8ef710', label: 'Learn' },
  practice: { icon: <Code size={14} />, color: '#10b981', bg: '#10b98110', label: 'Practice' },
  revise: { icon: <RefreshCw size={14} />, color: '#f59e0b', bg: '#f59e0b10', label: 'Revise' },
  mock: { icon: <Zap size={14} />, color: '#a855f7', bg: '#a855f710', label: 'Mock' },
};

function loadProgress(jobTitle, experienceLevel, durationDays) {
  try {
    const key = `${STORAGE_KEY}_${jobTitle}_${experienceLevel}_${durationDays}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveProgress(jobTitle, experienceLevel, durationDays, data) {
  try {
    const key = `${STORAGE_KEY}_${jobTitle}_${experienceLevel}_${durationDays}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export default function JobRoadmapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobTitle, experienceLevel, durationDays } = location.state || {};

  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedTasks, setCompletedTasks] = useState({});  // { "d1t1": true }
  const [expandedDay, setExpandedDay] = useState(1);
  const [startingInterview, setStartingInterview] = useState(false);

  // Redirect if no state
  useEffect(() => {
    if (!jobTitle) {
      navigate('/job-prep');
    }
  }, [jobTitle, navigate]);

  const generateRoadmap = useCallback(async (forceRefresh = false) => {
    if (!jobTitle) return;

    // Try loading from cache first
    if (!forceRefresh) {
      const cached = loadProgress(jobTitle, experienceLevel, durationDays);
      if (cached?.roadmap) {
        setRoadmap(cached.roadmap);
        setCompletedTasks(cached.completedTasks || {});
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError('');
    setRoadmap(null);

    try {
      const res = await fetch(`${API_BASE}/api/job-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle,
          experience_level: experienceLevel,
          duration_days: durationDays,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate roadmap');
      const data = await res.json();
      setRoadmap(data);
      const fresh = { roadmap: data, completedTasks: {} };
      saveProgress(jobTitle, experienceLevel, durationDays, fresh);
      setCompletedTasks({});
      toast.success('Roadmap generated! Let\'s get started 🚀');
    } catch (err) {
      setError(err.message || 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  }, [jobTitle, experienceLevel, durationDays]);

  useEffect(() => {
    generateRoadmap(false);
  }, [generateRoadmap]);

  // Persist progress on every change
  useEffect(() => {
    if (roadmap) {
      saveProgress(jobTitle, experienceLevel, durationDays, { roadmap, completedTasks });
    }
  }, [completedTasks, roadmap, jobTitle, experienceLevel, durationDays]);

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const totalTasks = roadmap?.days?.reduce((acc, d) => acc + d.tasks.length, 0) || 0;
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const allDone = progressPct === 100;

  const isDayComplete = (day) =>
    day.tasks.every(t => completedTasks[t.id]);

  const isDayUnlocked = (dayIndex) => {
    if (dayIndex === 0) return true;
    return isDayComplete(roadmap.days[dayIndex - 1]);
  };

  /**
   * Build a precise, structured summary of what the candidate studied.
   * Uses: key_topics from roadmap + day themes + task titles for learn/practice tasks only.
   * This is passed verbatim to the AI so it knows what to ask about.
   */
  const getTopicsStudied = () => {
    if (!roadmap) return { keyTopics: [], dayThemes: [], specificTopics: [] };

    const keyTopics = roadmap.key_topics || [];
    const dayThemes = [];
    const specificTopics = new Set();

    roadmap.days.forEach(day => {
      if (isDayComplete(day)) {
        dayThemes.push(day.theme);
        day.tasks.forEach(t => {
          // Only add actual learning/practice task titles (not generic admin tasks)
          if (['learn', 'practice', 'revise', 'mock'].includes(t.type)) {
            specificTopics.add(t.title);
          }
        });
      }
    });

    return {
      keyTopics,
      dayThemes,
      specificTopics: [...specificTopics],
    };
  };

  const startInterview = async () => {
    setStartingInterview(true);
    try {
      const { keyTopics, dayThemes, specificTopics } = getTopicsStudied();

      // Build a flat de-duplicated list combining all sources, preferring key_topics
      const allTopics = [
        ...keyTopics,
        ...dayThemes,
        ...specificTopics,
      ].filter(Boolean);
      const uniqueTopics = [...new Set(allTopics)];

      const res = await fetch(`${API_BASE}/api/job-interview-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle,
          experience_level: experienceLevel,
          // Send both structured AND flat list
          topics_studied: uniqueTopics.length > 0 ? uniqueTopics : keyTopics.length > 0 ? keyTopics : [jobTitle],
          studied_day_themes: dayThemes,
          studied_specific_topics: specificTopics,
        }),
      });

      if (!res.ok) throw new Error('Failed to start interview');
      const data = await res.json();
      navigate('/interview', {
        state: { sessionId: data.session_id, candidate: data.candidate },
      });
    } catch (err) {
      toast.error('Failed to start interview. Please try again.');
      setStartingInterview(false);
    }
  };

  if (!jobTitle) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-xl">
            <Brain size={36} className="text-white" />
          </div>
          <div className="absolute -right-1 -top-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Loader2 size={14} className="text-white animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Building your roadmap…
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
            AI is crafting a personalized {durationDays}-day preparation plan for{' '}
            <strong>{jobTitle}</strong>. This takes a few seconds.
          </p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Failed to generate roadmap</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/job-prep')} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            ← Choose Another Role
          </button>
          <button onClick={() => generateRoadmap(true)} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 flex items-center gap-2">
            <RotateCcw size={15} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-brand-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Map size={16} className="opacity-75" />
                <span className="text-xs font-semibold uppercase tracking-widest opacity-75">Interview Roadmap</span>
              </div>
              <h1 className="text-2xl font-bold">{roadmap?.job_title || jobTitle}</h1>
              <p className="text-sm opacity-75 mt-0.5 capitalize">{experienceLevel} level · {durationDays} days</p>
            </div>
            {/* Progress ring */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke="white" strokeWidth="3"
                      strokeDasharray={`${progressPct * 0.942} 94.2`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{progressPct}%</span>
                  </div>
                </div>
                <div className="text-xs opacity-75 mt-1">{completedCount}/{totalTasks} tasks</div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => generateRoadmap(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-all"
                >
                  <RotateCcw size={13} /> Regenerate
                </button>
                <button
                  onClick={() => navigate('/job-prep')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-all"
                >
                  ← Change Role
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-4">
        {/* Strategy card */}
        {roadmap?.strategy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Strategy to Crack This Interview</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{roadmap.strategy}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Key topics */}
        {roadmap?.key_topics?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Key Topics to Master</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {roadmap.key_topics.map((t, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-medium border border-brand-100 dark:border-brand-800/30"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Day-by-day task list */}
        <div className="space-y-3">
          {roadmap?.days?.map((day, dayIndex) => {
            const unlocked = isDayUnlocked(dayIndex);
            const dayComplete = isDayComplete(day);
            const isExpanded = expandedDay === day.day;
            const dayCompletedCount = day.tasks.filter(t => completedTasks[t.id]).length;

            return (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.04 }}
                className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm transition-all ${
                  dayComplete
                    ? 'border-green-200 dark:border-green-800/40'
                    : !unlocked
                    ? 'border-gray-100 dark:border-gray-800 opacity-60'
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                {/* Day header */}
                <button
                  onClick={() => unlocked && setExpandedDay(isExpanded ? null : day.day)}
                  disabled={!unlocked}
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  {/* Day number / status */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    dayComplete
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : !unlocked
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'bg-brand-50 dark:bg-brand-900/20'
                  }`}>
                    {dayComplete ? (
                      <CheckCircle2 size={20} className="text-green-500" />
                    ) : !unlocked ? (
                      <Lock size={16} className="text-gray-400" />
                    ) : (
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{day.day}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${dayComplete ? 'text-green-500' : !unlocked ? 'text-gray-400' : 'text-brand-500'}`}>
                        Day {day.day}
                      </span>
                      {!unlocked && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Complete Day {day.day - 1} to unlock</span>}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{day.theme}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {dayCompletedCount}/{day.tasks.length} tasks
                      </span>
                      {/* Task type mini chips */}
                      <div className="flex gap-1">
                        {[...new Set(day.tasks.map(t => t.type))].map(type => {
                          const meta = TASK_TYPE_META[type] || TASK_TYPE_META.learn;
                          return (
                            <span key={type} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar mini */}
                  <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${dayComplete ? 'bg-green-500' : 'bg-brand-500'}`}
                        style={{ width: `${(dayCompletedCount / day.tasks.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{Math.round((dayCompletedCount / day.tasks.length) * 100)}%</span>
                  </div>
                  {unlocked && (
                    <div className="text-gray-400 flex-shrink-0">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  )}
                </button>

                {/* Tasks list */}
                <AnimatePresence>
                  {isExpanded && unlocked && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                        {day.tasks.map((task) => {
                          const done = !!completedTasks[task.id];
                          const meta = TASK_TYPE_META[task.type] || TASK_TYPE_META.learn;
                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`flex gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                                done
                                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
                                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-gray-600'
                              }`}
                              onClick={() => toggleTask(task.id)}
                            >
                              {/* Checkbox */}
                              <div className="flex-shrink-0 mt-0.5">
                                {done ? (
                                  <CheckCircle2 size={20} className="text-green-500" />
                                ) : (
                                  <Circle size={20} className="text-gray-300 dark:text-gray-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`font-semibold text-sm ${done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                    {task.title}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ background: meta.bg, color: meta.color }}>
                                    {meta.icon}
                                    {meta.label}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <Clock size={11} /> {task.duration_mins} min
                                  </span>
                                </div>
                                <p className={`text-xs leading-relaxed ${done ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {task.description}
                                </p>
                                {task.resources?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {task.resources.map((r, ri) => (
                                      <span key={ri} className="text-[11px] px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400">
                                        💡 {r}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Completion / Interview CTA ─── */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative overflow-hidden bg-gradient-to-br from-green-500 via-teal-500 to-brand-600 rounded-2xl p-6 text-white shadow-2xl"
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Trophy size={28} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">🎉 Roadmap Complete!</div>
                    <div className="text-sm opacity-80">All {totalTasks} tasks done. You're interview-ready!</div>
                  </div>
                </div>
                <p className="text-sm opacity-80 mb-5 leading-relaxed">
                  You've completed your entire {durationDays}-day preparation plan for <strong>{jobTitle}</strong>.
                  Your AI interview is ready — Aira will ask questions <em>only</em> based on what you studied.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startInterview}
                  disabled={startingInterview}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-white text-green-700 font-bold text-base shadow-xl hover:bg-green-50 transition-all disabled:opacity-70"
                >
                  {startingInterview ? (
                    <><Loader2 size={20} className="animate-spin" /> Starting Interview…</>
                  ) : (
                    <><Play size={20} /> Start AI Interview Now <ArrowRight size={18} /></>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partial progress interview CTA */}
        {!allDone && completedCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-brand-100 dark:border-brand-800/30 p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-brand-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  Want to practice with what you've learned so far?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  You've completed {completedCount} tasks. You can take a partial interview based on what you've studied. Finishing all tasks unlocks the full interview.
                </p>
                <button
                  onClick={startInterview}
                  disabled={startingInterview}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all disabled:opacity-60"
                >
                  {startingInterview ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Practice Interview ({completedCount} topics)
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom quick-access stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <ListChecks size={18} />, label: 'Tasks Done', value: `${completedCount}/${totalTasks}`, color: '#4f8ef7' },
            { icon: <Clock size={18} />, label: 'Days Left', value: `${(roadmap?.days || []).filter((_, i) => !isDayComplete(roadmap.days[i])).length}/${durationDays}`, color: '#f59e0b' },
            { icon: <Target size={18} />, label: 'Progress', value: `${progressPct}%`, color: '#10b981' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm">
              <div className="flex justify-center mb-1.5" style={{ color: stat.color }}>{stat.icon}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
