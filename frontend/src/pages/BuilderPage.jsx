import { useState } from 'react';
import { Copy, Download, Edit3, Eye, RotateCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import ResumeForm from '../components/resume/ResumeForm';
import ResumePreview from '../components/resume/ResumePreview';
import TemplateSelector from '../components/ui/TemplateSelector';
import AtsScore from '../components/ui/AtsScore';
import { useResume } from '../context/ResumeContext';
import { usePdfExport } from '../hooks/usePdfExport';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import { Input } from '../components/ui/Field';
import usePageTitle from '../hooks/usePageTitle';

export default function BuilderPage() {
  usePageTitle('Resume studio');
  const { resume, reset, saveResume } = useResume();
  const { exportPdf, exporting } = usePdfExport();
  const [jobRole, setJobRole] = useState('');
  const [mobileView, setMobileView] = useState('editor');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    const name = resume.personal_info?.full_name
      ? `${resume.personal_info.full_name}'s resume`
      : `Resume ${new Date().toLocaleDateString()}`;
    saveResume(name);
    toast.success('Saved on this device');
    setTimeout(() => setSaving(false), 600);
  };

  const handleCopy = () => {
    const pi = resume.personal_info || {};
    const text = [
      pi.full_name,
      pi.title,
      pi.email,
      pi.phone,
      pi.location,
      '',
      resume.summary && `SUMMARY\n${resume.summary}`,
      resume.skills?.length && `SKILLS\n${resume.skills.join(', ')}`,
      resume.experience?.length &&
        `EXPERIENCE\n${resume.experience
          .map(
            (item) =>
              `${item.role} at ${item.company} (${item.start_date}–${item.end_date})\n${item.description}`
          )
          .join('\n\n')}`,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="min-h-[calc(100dvh-var(--nav-height))] bg-background">
      <div className="container-page pb-4 pt-8">
        <PageHeader
          eyebrow="Resume studio"
          title="Build a resume that survives the filter."
          description="Edit on the left, watch the page update on the right. The ATS check updates as you work, and the PDF export keeps the layout intact."
        />
      </div>

      <div className="builder-toolbar">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <Input
            type="text"
            value={jobRole}
            onChange={(event) => setJobRole(event.target.value)}
            placeholder="Target role (optional)"
            aria-label="Target job role"
            className="h-8 max-w-[220px] py-1.5 text-[13px]"
          />

          <div className="flex items-center gap-2">
            <SegmentedControl
              className="sm:hidden"
              label="Editor or preview"
              value={mobileView}
              onChange={setMobileView}
              options={[
                { value: 'editor', label: 'Editor', icon: Edit3 },
                { value: 'preview', label: 'Preview', icon: Eye },
              ]}
            />

            <div className="hidden items-center gap-1.5 sm:flex">
              <Button onClick={handleCopy} variant="ghost" size="sm">
                <Copy size={13} />
                <span className="hidden lg:inline">Copy</span>
              </Button>
              <Button onClick={handleSave} disabled={saving} variant="ghost" size="sm">
                <Save size={13} />
                <span className="hidden lg:inline">{saving ? 'Saved' : 'Save'}</span>
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm('Reset all resume content?')) reset();
                }}
                variant="ghost"
                size="sm"
                aria-label="Reset resume"
              >
                <RotateCcw size={13} />
              </Button>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            </div>

            <Button
              onClick={() =>
                exportPdf('resume-preview', `${resume.personal_info?.full_name || 'resume'}.pdf`)
              }
              disabled={exporting}
              size="sm"
            >
              <Download size={13} />
              {exporting ? 'Exporting…' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container-page py-6">
        <div className="flex gap-6">
          <div
            className={`w-full shrink-0 space-y-4 lg:w-5/12 xl:w-4/12 ${
              mobileView === 'preview' ? 'hidden sm:block' : ''
            }`}
          >
            <div className="card p-4">
              <TemplateSelector />
            </div>
            <AtsScore />

            <div className="flex gap-2 sm:hidden">
              <Button onClick={handleCopy} variant="secondary" size="sm" className="flex-1">
                <Copy size={14} /> Copy
              </Button>
              <Button onClick={handleSave} variant="secondary" size="sm" className="flex-1">
                <Save size={14} /> Save
              </Button>
            </div>

            <ResumeForm jobRole={jobRole} />
          </div>

          <div className={`min-w-0 flex-1 ${mobileView === 'editor' ? 'hidden sm:block' : ''}`}>
            <div className="sticky top-[calc(var(--nav-height)+4.5rem)]">
              <div className="max-h-[calc(100dvh-var(--nav-height)-6rem)] overflow-auto pb-6 pr-1">
                <ResumePreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
