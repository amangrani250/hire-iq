import { useState, useRef } from 'react';
import { Download, Copy, Save, Upload, Printer, Eye, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ResumeForm from '../components/resume/ResumeForm';
import ResumePreview from '../components/resume/ResumePreview';
import TemplateSelector from '../components/ui/TemplateSelector';
import AtsScore from '../components/ui/AtsScore';
import { useResumeActions, useResumeDocument } from '../contexts/ResumeContext';
import { usePdfExport } from '../hooks/usePdfExport';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useAnalyzeResume } from '../services';
import type { ProfileData } from '../types';
import type { Resume } from '../types';

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function EditorPreviewToggle({ mobileView, setMobileView }: { mobileView: 'editor' | 'preview'; setMobileView: (v: 'editor' | 'preview') => void }) {
  return (
    <div className="flex items-center rounded-xl bg-muted p-1 shrink-0">
      <button onClick={() => setMobileView('editor')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mobileView === 'editor' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
        <Edit3 size={12} /> Editor
      </button>
      <button onClick={() => setMobileView('preview')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mobileView === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
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
  const resume = useResumeDocument();
  const { setResume, setAts, saveResume } = useResumeActions();
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
    <div className="min-h-screen bg-transparent">
      <div className="builder-toolbar no-print">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="h-12 flex items-center justify-between gap-3">
            <input type="text" value={jobRole} onChange={(e) => setJobRole(e.target.value)}
              placeholder="Target job role" className="input-field w-full min-w-0 max-w-[200px] sm:max-w-xs h-9 py-1.5 text-sm" />

            <div className="flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()}
                disabled={analyzeMutation.isPending}
                className="btn btn-secondary btn-sm shrink-0"
                title="Import existing resume from PDF">
                <Upload size={13} /> <span className="hidden sm:inline">{analyzeMutation.isPending ? 'Importing...' : 'Import'}</span>
              </button>

              <button onClick={handlePrint} className="btn btn-secondary btn-sm shrink-0 hidden sm:inline-flex" title="Print resume">
                <Printer size={13} /> Print
              </button>

              <button onClick={() => exportPdf('resume-preview', `${resume.personal_info?.full_name || 'resume'}.pdf`)}
                disabled={exporting} className="btn btn-primary btn-sm shrink-0">
                <Download size={13} /> {exporting ? 'Exporting...' : 'PDF'}
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept=".pdf,.txt"
              onChange={handleFileImport} className="hidden" />
          </div>

          <div className="lg:hidden flex items-center gap-2 pb-2.5">
            <EditorPreviewToggle mobileView={mobileView} setMobileView={setMobileView} />
            <button onClick={handleCopy} className="btn btn-secondary btn-sm flex-1 justify-center">
              <Copy size={12} /> Copy
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-secondary btn-sm flex-1 justify-center">
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
                className="w-full lg:w-[42%] xl:w-[38%] shrink-0 space-y-4 no-print"
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
                <div className="sticky top-[calc(var(--nav-height)+16px)] md:top-[calc(var(--nav-height)+24px)] lg:top-[calc(var(--nav-height)+16px)]">
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
