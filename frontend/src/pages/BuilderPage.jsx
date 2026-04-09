import { useState } from 'react'
import { Download, Copy, Save, RotateCcw, Eye, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'
import ResumeForm from '../components/resume/ResumeForm'
import ResumePreview from '../components/resume/ResumePreview'
import TemplateSelector from '../components/ui/TemplateSelector'
import AtsScore from '../components/ui/AtsScore'
import { useResume } from '../context/ResumeContext'
import { usePdfExport } from '../hooks/usePdfExport'

export default function BuilderPage() {
  const { resume, reset, saveResume } = useResume()
  const { exportPdf, exporting } = usePdfExport()
  const [jobRole, setJobRole] = useState('')
  const [mobileView, setMobileView] = useState('editor') // 'editor' | 'preview'
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    const name = resume.personal_info?.full_name
      ? `${resume.personal_info.full_name}'s Resume`
      : `Resume ${new Date().toLocaleDateString()}`
    saveResume(name)
    toast.success('Saved locally!')
    setTimeout(() => setSaving(false), 600)
  }

  const handleCopy = () => {
    const pi = resume.personal_info || {}
    const text = [
      pi.full_name, pi.title, pi.email, pi.phone, pi.location, '',
      resume.summary && `SUMMARY\n${resume.summary}`,
      resume.skills?.length && `SKILLS\n${resume.skills.join(', ')}`,
      resume.experience?.length && `EXPERIENCE\n${resume.experience.map(e =>
        `${e.role} at ${e.company} (${e.start_date}–${e.end_date})\n${e.description}`
      ).join('\n\n')}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="min-h-screen pt-16 bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="sticky top-16 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center justify-between gap-3">
          {/* Job role */}
          <input
            type="text"
            value={jobRole}
            onChange={e => setJobRole(e.target.value)}
            placeholder="Target job role (optional)"
            className="input-field max-w-xs py-1.5 text-sm h-8"
          />

          {/* Mobile toggle */}
          <div className="flex sm:hidden items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={() => setMobileView('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${mobileView === 'editor' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              <Edit3 size={12} /> Editor
            </button>
            <button onClick={() => setMobileView('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${mobileView === 'preview' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              <Eye size={12} /> Preview
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="btn-secondary text-xs py-1.5 px-3 hidden sm:flex">
              <Copy size={13} /> Copy
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5 px-3 hidden sm:flex">
              <Save size={13} /> {saving ? 'Saved!' : 'Save'}
            </button>
            <button onClick={() => { if (confirm('Reset all content?')) reset() }}
              className="btn-secondary text-xs py-1.5 px-3 hidden sm:flex">
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => exportPdf('resume-preview', `${resume.personal_info?.full_name || 'resume'}.pdf`)}
              disabled={exporting}
              className="btn-primary text-xs py-1.5 px-4"
            >
              <Download size={13} /> {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left: Editor */}
          <div className={`w-full lg:w-5/12 xl:w-4/12 shrink-0 space-y-4 ${mobileView === 'preview' ? 'hidden sm:block' : ''}`}>
            <div className="card p-4">
              <TemplateSelector />
            </div>
            <AtsScore />
            {/* Mobile save/copy */}
            <div className="flex sm:hidden gap-2">
              <button onClick={handleCopy} className="btn-secondary flex-1 justify-center text-sm py-2"><Copy size={14} /> Copy</button>
              <button onClick={handleSave} className="btn-secondary flex-1 justify-center text-sm py-2"><Save size={14} /> Save</button>
            </div>
            <ResumeForm jobRole={jobRole} />
          </div>

          {/* Right: Preview */}
          <div className={`flex-1 min-w-0 ${mobileView === 'editor' ? 'hidden sm:block' : ''}`}>
            <div className="sticky top-28">
              <div className="overflow-auto max-h-[calc(100vh-8rem)]">
                <ResumePreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
