import { useState, useRef, useEffect } from 'react';
import { Download, Copy, Save, Upload, Printer, Eye, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ResumeForm from '../components/resume/ResumeForm';
import ResumePreview from '../components/resume/ResumePreview';
import TemplateSelector from '../components/ui/TemplateSelector';
import AtsScore from '../components/ui/AtsScore';
import { useResume } from '../contexts/ResumeContext';
import { usePdfExport } from '../hooks/usePdfExport';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useAnalyzeResume } from '../services';
import type { ProfileData } from '../types';
import type { Resume } from '../types';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      variants={fadeUpVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function EditorPreviewToggle({ mobileView, setMobileView }: { mobileView: 'editor' | 'preview'; setMobileView: (v: 'editor' | 'preview') => void }) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 shrink-0">
      <button onClick={() => setMobileView('editor')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mobileView === 'editor' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
        <Edit3 size={12} /> Editor
      </button>
      <button onClick={() => setMobileView('preview')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mobileView === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
        <Eye size={12} /> Preview
      </button>
    </div>
  );
}

function mapProfileToResume(profile: ProfileData): Partial<Resume> {
  const allSkills = [
    ...(profile.skills?.languages || []),
    ...(profile.skills?.frameworks || []),
    ...(profile.skills?.tools || []),
    ...(profile.skills?.other || []),
  ].filter(Boolean);

  const website = profile.github || '';

  return {
    personal_info: {
      full_name: profile.name || '',
      title: profile.role || '',
      email: profile.email || '',
      phone: profile.phone || '',
      location: profile.location || '',
      linkedin: profile.linkedin || '',
      website,
    },
    summary: profile.summary || '',
    skills: allSkills,
    experience: (profile.experience || []).map((exp) => {
      const parts = (exp.duration || '').split(' - ').map((s) => s.trim());
      return {
        company: exp.company || '',
        role: exp.role || '',
        start_date: parts[0] || '',
        end_date: parts[1] || '',
        description: exp.description || '',
      };
    }),
    education: (profile.education || []).map((edu) => ({
      degree: edu.degree || '',
      field: '',
      institution: edu.institution || '',
      year: edu.year || '',
      gpa: '',
    })),
    projects: [],
    certifications: (profile.certifications || []).map((cert) => ({
      name: cert.name || '',
      issuer: cert.issuer || '',
      year: cert.year || '',
    })),
  };
}

export default function BuilderPage() {
  useDocumentMeta('Resume Builder', 'Build and export professional resumes with AI');
  const isMobile = useIsMobile();
  const { resume, setResume, setAts, saveResume } = useResume();
  const { exportPdf, exporting } = usePdfExport();
  const analyzeMutation = useAnalyzeResume();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jobRole, setJobRole] = useState('');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [saving, setSaving] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);

  const handleSave = () => {
    setSaving(true);
    const name = resume.personal_info?.full_name
      ? `${resume.personal_info.full_name}'s Resume`
      : `Resume ${new Date().toLocaleDateString()}`;
    saveResume(name);
    toast.success('Saved locally!');
    setTimeout(() => setSaving(false), 600);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await analyzeMutation.mutateAsync(file);
      const mapped = mapProfileToResume(data.profile);
      setResume({ ...resume, ...mapped } as Resume);
      setAts(data.ats.overall_score, data.ats.top_suggestions);
      toast.success('Resume imported successfully!');
    } catch {
      toast.error('Failed to import resume');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePrint = () => {
    const previewEl = document.getElementById('resume-preview');
    if (!previewEl) return;
    const html = previewEl.innerHTML;
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML).join('');
    const w = window.open('', '', 'width=800,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Print Resume</title>${styleTags}</head><body style="background:#fff;margin:0;padding:0;color:#000;font-family:ui-sans-serif,system-ui,sans-serif"><div style="padding:40px">${html}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const handleCopy = () => {
    const pi = resume.personal_info || {};
    const text = [
      pi.full_name, pi.title, pi.email, pi.phone, pi.location, '',
      resume.summary && `SUMMARY\n${resume.summary}`,
      resume.skills?.length && `SKILLS\n${resume.skills.join(', ')}`,
      resume.experience?.length && `EXPERIENCE\n${resume.experience.map((e) =>
        `${e.role} at ${e.company} (${e.start_date} – ${e.end_date})\n${e.description}`
      ).join('\n\n')}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen pt-[72px] bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-[72px] z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800 no-print">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="h-12 flex items-center justify-between gap-3">
            <input type="text" value={jobRole} onChange={(e) => setJobRole(e.target.value)}
              placeholder="Target job role" className="input-field max-w-[180px] sm:max-w-xs py-1.5 text-sm h-8 flex-1 sm:flex-1" />

            <button onClick={() => fileInputRef.current?.click()}
              disabled={analyzeMutation.isPending}
              className="btn-secondary text-xs py-1.5 px-2.5 shrink-0"
              title="Import existing resume from PDF">
              <Upload size={13} /> {analyzeMutation.isPending ? 'Importing...' : 'Import'}
            </button>

            <button onClick={handlePrint} className="btn-secondary text-xs py-1.5 px-2.5 shrink-0" title="Print resume">
              <Printer size={13} /> Print
            </button>

            <button onClick={() => exportPdf('resume-preview', `${resume.personal_info?.full_name || 'resume'}.pdf`)}
              disabled={exporting} className="btn-primary text-xs py-1.5 px-3 sm:px-4 shrink-0">
              <Download size={13} /> {exporting ? 'Exporting...' : 'PDF'}
            </button>

            <input ref={fileInputRef} type="file" accept=".pdf,.txt"
              onChange={handleFileImport} className="hidden" />
          </div>

          <div className="lg:hidden flex items-center gap-2 pb-2.5">
            <EditorPreviewToggle mobileView={mobileView} setMobileView={setMobileView} />
            <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-2.5 flex-1 justify-center">
              <Copy size={12} /> Copy
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5 px-2.5 flex-1 justify-center">
              <Save size={12} /> {saving ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {(!isMobile || mobileView === 'editor') && (
              <motion.div
                key="editor"
                layout
                initial={isMobile ? { x: -30, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full md:w-1/2 lg:w-5/12 xl:w-4/12 shrink-0 space-y-4 no-print"
              >
                <FadeUp delay={0.05}><div className="card p-4"><TemplateSelector /></div></FadeUp>
                <FadeUp delay={0.1}><AtsScore /></FadeUp>
                <FadeUp delay={0.15}><ResumeForm jobRole={jobRole} focusField={focusField} /></FadeUp>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout" initial={false}>
            {(!isMobile || mobileView === 'preview') && (
              <motion.div
                key="preview"
                layout
                initial={isMobile ? { x: 30, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 30, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex-1 min-w-0"
              >
                <div className="sticky top-[120px] md:top-[165px] lg:top-[120px]">
                  <div className="overflow-auto max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-15rem)] lg:max-h-[calc(100vh-8rem)]"><ResumePreview onFieldDoubleClick={setFocusField} /></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
