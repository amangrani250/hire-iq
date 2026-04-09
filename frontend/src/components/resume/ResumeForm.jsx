import { useState, useCallback } from 'react'
import { Plus, Trash2, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { useResume } from '../../context/ResumeContext'
import { improveSection } from '../../services/api'
import VoiceButton from '../ui/VoiceButton'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import toast from 'react-hot-toast'

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">{children}</div>}
    </div>
  )
}

function ImprovableTextarea({ label, value, onChange, sectionName, jobRole, rows = 3, placeholder }) {
  const [improving, setImproving] = useState(false)

  const handleImprove = async () => {
    if (!value.trim()) return toast.error('Add some content first')
    setImproving(true)
    try {
      const { data } = await improveSection(sectionName, value, jobRole)
      onChange(data.improved_content)
      toast.success('Section improved!')
    } catch {
      toast.error('Improvement failed. Check your API key.')
    } finally {
      setImproving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <button
          type="button"
          onClick={handleImprove}
          disabled={improving}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
        >
          <Wand2 size={12} />
          {improving ? 'Improving…' : 'AI Improve'}
        </button>
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field resize-none"
      />
    </div>
  )
}

export default function ResumeForm({ jobRole }) {
  const { resume, updateField, updatePersonal, setGenerating, setResume, setAts, isGenerating } = useResume()

  const [rawInput, setRawInput] = useState('')

  const handleVoiceResult = useCallback((text) => setRawInput(text), [])
  const { listening, supported, toggle } = useVoiceInput(handleVoiceResult)

  // Personal info
  const pi = resume.personal_info || {}
  const setPI = (key, val) => updatePersonal({ [key]: val })

  // List helpers
  const addItem = (field, empty) => updateField(field, [...(resume[field] || []), empty])
  const removeItem = (field, i) => updateField(field, resume[field].filter((_, idx) => idx !== i))
  const updateItem = (field, i, key, val) => {
    const arr = [...resume[field]]
    arr[i] = { ...arr[i], [key]: val }
    updateField(field, arr)
  }

  const handleGenerate = async () => {
    if (!rawInput.trim()) return toast.error('Please describe yourself or your experience')
    setGenerating(true)
    try {
      const { generateResume } = await import('../../services/api')
      const { data } = await generateResume(rawInput, jobRole)
      setResume(data.resume_data)
      setAts(data.ats_score, data.suggestions)
      toast.success('Resume generated!')
    } catch (e) {
      toast.error(e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* AI Input */}
      <div className="card p-4">
        <p className="section-label">AI Generate</p>
        <div className="flex gap-2 mb-2">
          <textarea
            rows={4}
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="Describe your background, skills, and experience in plain text or speak using the mic…"
            className="input-field resize-none flex-1"
          />
          <VoiceButton listening={listening} supported={supported} onToggle={toggle} className="self-start mt-0.5" />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-primary w-full justify-center text-sm"
        >
          <Wand2 size={16} />
          {isGenerating ? 'Generating…' : 'Generate with AI'}
        </button>
      </div>

      {/* Personal Info */}
      <Section title="Personal Info" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Full Name', 'full_name'], ['Job Title', 'title'],
            ['Email', 'email'], ['Phone', 'phone'],
            ['Location', 'location'], ['LinkedIn', 'linkedin'],
            ['Website', 'website'],
          ].map(([label, key]) => (
            <div key={key} className={key === 'full_name' || key === 'title' ? 'col-span-2' : ''}>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
              <input
                type="text"
                value={pi[key] || ''}
                onChange={e => setPI(key, e.target.value)}
                className="input-field"
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Summary */}
      <Section title="Professional Summary">
        <ImprovableTextarea
          label="Summary"
          value={resume.summary || ''}
          onChange={v => updateField('summary', v)}
          sectionName="summary"
          jobRole={jobRole}
          rows={4}
          placeholder="A compelling professional summary that highlights your expertise…"
        />
      </Section>

      {/* Skills */}
      <Section title="Skills">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Skills (comma-separated)</label>
          <textarea
            rows={3}
            value={(resume.skills || []).join(', ')}
            onChange={e => updateField('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="input-field resize-none"
            placeholder="React, Node.js, Python, SQL, Docker…"
          />
        </div>
      </Section>

      {/* Experience */}
      <Section title="Experience">
        {(resume.experience || []).map((exp, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('experience', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              {[['Company', 'company'], ['Role', 'role'], ['Start', 'start_date'], ['End', 'end_date']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <input type="text" value={exp[key] || ''} onChange={e => updateItem('experience', i, key, e.target.value)}
                    className="input-field" placeholder={label} />
                </div>
              ))}
            </div>
            <ImprovableTextarea
              label="Description"
              value={exp.description || ''}
              onChange={v => updateItem('experience', i, 'description', v)}
              sectionName="experience"
              jobRole={jobRole}
              rows={3}
              placeholder="• Led team of 5 engineers to deliver…&#10;• Improved performance by 40%…"
            />
          </div>
        ))}
        <button type="button" onClick={() => addItem('experience', { company: '', role: '', start_date: '', end_date: '', description: '' })}
          className="btn-secondary w-full justify-center text-sm py-2">
          <Plus size={14} /> Add Experience
        </button>
      </Section>

      {/* Projects */}
      <Section title="Projects">
        {(resume.projects || []).map((proj, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('projects', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            {[['Name', 'name'], ['Tech Stack', 'tech_stack'], ['Link', 'link']].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                <input type="text" value={proj[key] || ''} onChange={e => updateItem('projects', i, key, e.target.value)}
                  className="input-field" placeholder={label} />
              </div>
            ))}
            <ImprovableTextarea
              label="Description"
              value={proj.description || ''}
              onChange={v => updateItem('projects', i, 'description', v)}
              sectionName="project"
              jobRole={jobRole}
              rows={2}
              placeholder="Built a full-stack app that…"
            />
          </div>
        ))}
        <button type="button" onClick={() => addItem('projects', { name: '', description: '', tech_stack: '', link: '' })}
          className="btn-secondary w-full justify-center text-sm py-2">
          <Plus size={14} /> Add Project
        </button>
      </Section>

      {/* Education */}
      <Section title="Education">
        {(resume.education || []).map((edu, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('education', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              {[['Institution', 'institution'], ['Degree', 'degree'], ['Field', 'field'], ['Year', 'year'], ['GPA', 'gpa']].map(([label, key]) => (
                <div key={key} className={key === 'institution' ? 'col-span-2' : ''}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <input type="text" value={edu[key] || ''} onChange={e => updateItem('education', i, key, e.target.value)}
                    className="input-field" placeholder={label} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addItem('education', { institution: '', degree: '', field: '', year: '', gpa: '' })}
          className="btn-secondary w-full justify-center text-sm py-2">
          <Plus size={14} /> Add Education
        </button>
      </Section>

      {/* Certifications */}
      <Section title="Certifications">
        {(resume.certifications || []).map((cert, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('certifications', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-3 gap-2">
              {[['Name', 'name'], ['Issuer', 'issuer'], ['Year', 'year']].map(([label, key]) => (
                <div key={key} className={key === 'name' ? 'col-span-3' : ''}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <input type="text" value={cert[key] || ''} onChange={e => updateItem('certifications', i, key, e.target.value)}
                    className="input-field" placeholder={label} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addItem('certifications', { name: '', issuer: '', year: '' })}
          className="btn-secondary w-full justify-center text-sm py-2">
          <Plus size={14} /> Add Certification
        </button>
      </Section>
    </div>
  )
}
