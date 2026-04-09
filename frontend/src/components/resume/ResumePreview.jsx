import { useResume } from '../../context/ResumeContext'
import { Mail, Phone, MapPin, Globe, Linkedin } from 'lucide-react'

function MinimalTemplate({ resume }) {
  const pi = resume.personal_info || {}
  return (
    <div className="font-sans text-gray-900 text-[11px] leading-relaxed p-8 bg-white min-h-full">
      {/* Header */}
      <div className="mb-5 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5">{pi.full_name || 'Your Name'}</h1>
        {pi.title && <p className="text-sm text-gray-500 mb-2">{pi.title}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-[10px]">
          {pi.email && <span className="flex items-center gap-1"><Mail size={9} />{pi.email}</span>}
          {pi.phone && <span className="flex items-center gap-1"><Phone size={9} />{pi.phone}</span>}
          {pi.location && <span className="flex items-center gap-1"><MapPin size={9} />{pi.location}</span>}
          {pi.linkedin && <span className="flex items-center gap-1"><Linkedin size={9} />{pi.linkedin}</span>}
          {pi.website && <span className="flex items-center gap-1"><Globe size={9} />{pi.website}</span>}
        </div>
      </div>

      {/* Summary */}
      {resume.summary && (
        <Section title="Summary">
          <p className="text-gray-700">{resume.summary}</p>
        </Section>
      )}

      {/* Skills */}
      {resume.skills?.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.map((s, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 text-[10px]">{s}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {resume.experience?.length > 0 && (
        <Section title="Experience">
          {resume.experience.map((e, i) => (
            <div key={i} className={i > 0 ? 'mt-3' : ''}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 text-xs">{e.role}</p>
                  <p className="text-gray-500">{e.company}</p>
                </div>
                {(e.start_date || e.end_date) && (
                  <p className="text-gray-400 whitespace-nowrap ml-4">{e.start_date}{e.end_date ? ` – ${e.end_date}` : ''}</p>
                )}
              </div>
              {e.description && (
                <div className="mt-1 text-gray-700 whitespace-pre-line">{e.description}</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Projects */}
      {resume.projects?.length > 0 && (
        <Section title="Projects">
          {resume.projects.map((p, i) => (
            <div key={i} className={i > 0 ? 'mt-2' : ''}>
              <div className="flex justify-between">
                <p className="font-semibold text-gray-900 text-xs">{p.name}</p>
                {p.link && <a href={p.link} className="text-blue-500">{p.link}</a>}
              </div>
              {p.tech_stack && <p className="text-gray-400 italic">{p.tech_stack}</p>}
              {p.description && <p className="text-gray-700 mt-0.5">{p.description}</p>}
            </div>
          ))}
        </Section>
      )}

      {/* Education */}
      {resume.education?.length > 0 && (
        <Section title="Education">
          {resume.education.map((e, i) => (
            <div key={i} className={i > 0 ? 'mt-2' : ''}>
              <div className="flex justify-between">
                <p className="font-semibold text-gray-900 text-xs">{e.degree}{e.field ? ` in ${e.field}` : ''}</p>
                {e.year && <p className="text-gray-400">{e.year}</p>}
              </div>
              <p className="text-gray-500">{e.institution}{e.gpa ? ` • GPA: ${e.gpa}` : ''}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Certifications */}
      {resume.certifications?.length > 0 && (
        <Section title="Certifications">
          {resume.certifications.map((c, i) => (
            <div key={i} className="flex justify-between">
              <p className="text-gray-700">{c.name}{c.issuer ? ` — ${c.issuer}` : ''}</p>
              {c.year && <p className="text-gray-400">{c.year}</p>}
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

function CorporateTemplate({ resume }) {
  const pi = resume.personal_info || {}
  return (
    <div className="font-sans text-[11px] leading-relaxed bg-white min-h-full">
      {/* Blue header */}
      <div className="bg-blue-700 text-white px-8 py-6">
        <h1 className="text-2xl font-bold mb-0.5">{pi.full_name || 'Your Name'}</h1>
        {pi.title && <p className="text-blue-200 text-sm mb-3">{pi.title}</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-blue-100 text-[10px]">
          {pi.email && <span>{pi.email}</span>}
          {pi.phone && <span>{pi.phone}</span>}
          {pi.location && <span>{pi.location}</span>}
          {pi.linkedin && <span>{pi.linkedin}</span>}
        </div>
      </div>
      <div className="p-8 space-y-4">
        {resume.summary && (
          <CorpSection title="Professional Summary">
            <p className="text-gray-700">{resume.summary}</p>
          </CorpSection>
        )}
        {resume.skills?.length > 0 && (
          <CorpSection title="Core Competencies">
            <div className="grid grid-cols-3 gap-1">
              {resume.skills.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-gray-700">
                  <span className="w-1 h-1 bg-blue-600 rounded-full shrink-0" />{s}
                </span>
              ))}
            </div>
          </CorpSection>
        )}
        {resume.experience?.length > 0 && (
          <CorpSection title="Professional Experience">
            {resume.experience.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-3' : ''}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-xs">{e.role}</p>
                    <p className="text-blue-700 font-medium">{e.company}</p>
                  </div>
                  {(e.start_date || e.end_date) && (
                    <p className="text-gray-400">{e.start_date}{e.end_date ? ` – ${e.end_date}` : ''}</p>
                  )}
                </div>
                {e.description && <div className="mt-1 text-gray-700 whitespace-pre-line">{e.description}</div>}
              </div>
            ))}
          </CorpSection>
        )}
        {resume.education?.length > 0 && (
          <CorpSection title="Education">
            {resume.education.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-1.5' : ''}>
                <div className="flex justify-between">
                  <p className="font-bold text-gray-900 text-xs">{e.degree}{e.field ? ` in ${e.field}` : ''}</p>
                  {e.year && <p className="text-gray-400">{e.year}</p>}
                </div>
                <p className="text-gray-500">{e.institution}</p>
              </div>
            ))}
          </CorpSection>
        )}
      </div>
    </div>
  )
}

function CreativeTemplate({ resume }) {
  const pi = resume.personal_info || {}
  return (
    <div className="font-sans text-[11px] leading-relaxed bg-white min-h-full flex">
      {/* Sidebar */}
      <div className="w-1/3 bg-gray-900 text-white p-6 space-y-5 shrink-0">
        <div>
          <h1 className="text-lg font-bold leading-tight">{pi.full_name || 'Your Name'}</h1>
          {pi.title && <p className="text-purple-300 text-[10px] mt-0.5">{pi.title}</p>}
        </div>
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Contact</p>
          {pi.email && <p className="text-gray-300 text-[10px] break-all">{pi.email}</p>}
          {pi.phone && <p className="text-gray-300 text-[10px]">{pi.phone}</p>}
          {pi.location && <p className="text-gray-300 text-[10px]">{pi.location}</p>}
          {pi.linkedin && <p className="text-gray-300 text-[10px] break-all">{pi.linkedin}</p>}
        </div>
        {resume.skills?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Skills</p>
            <div className="space-y-1.5">
              {resume.skills.map((s, i) => (
                <div key={i}>
                  <p className="text-gray-300 mb-0.5">{s}</p>
                  <div className="h-0.5 bg-gray-700 rounded-full">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${70 + (i % 3) * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {resume.certifications?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Certifications</p>
            {resume.certifications.map((c, i) => (
              <p key={i} className="text-gray-300 mb-1">{c.name}</p>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 space-y-4">
        {resume.summary && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-1.5">About Me</p>
            <p className="text-gray-700">{resume.summary}</p>
          </div>
        )}
        {resume.experience?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-2">Experience</p>
            {resume.experience.map((e, i) => (
              <div key={i} className={`${i > 0 ? 'mt-3' : ''} pl-3 border-l-2 border-purple-200`}>
                <p className="font-bold text-gray-900 text-xs">{e.role}</p>
                <div className="flex justify-between">
                  <p className="text-purple-600">{e.company}</p>
                  {(e.start_date || e.end_date) && (
                    <p className="text-gray-400">{e.start_date}{e.end_date ? ` – ${e.end_date}` : ''}</p>
                  )}
                </div>
                {e.description && <div className="mt-1 text-gray-700 whitespace-pre-line">{e.description}</div>}
              </div>
            ))}
          </div>
        )}
        {resume.projects?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-2">Projects</p>
            {resume.projects.map((p, i) => (
              <div key={i} className={`${i > 0 ? 'mt-2' : ''} pl-3 border-l-2 border-purple-200`}>
                <p className="font-bold text-gray-900 text-xs">{p.name}</p>
                {p.tech_stack && <p className="text-purple-400 italic">{p.tech_stack}</p>}
                {p.description && <p className="text-gray-700 mt-0.5">{p.description}</p>}
              </div>
            ))}
          </div>
        )}
        {resume.education?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-2">Education</p>
            {resume.education.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-2' : ''}>
                <p className="font-bold text-gray-900 text-xs">{e.degree}{e.field ? ` in ${e.field}` : ''}</p>
                <div className="flex justify-between">
                  <p className="text-gray-500">{e.institution}</p>
                  {e.year && <p className="text-gray-400">{e.year}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5 pb-0.5 border-b border-gray-200">{title}</h2>
      {children}
    </div>
  )
}

function CorpSection({ title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider">{title}</h2>
        <div className="flex-1 h-px bg-blue-100" />
      </div>
      {children}
    </div>
  )
}

export default function ResumePreview() {
  const { resume, template } = useResume()

  return (
    <div
      id="resume-preview"
      className="w-full shadow-xl rounded-xl overflow-hidden border border-gray-200"
      style={{ minHeight: '842px' }}
    >
      {template === 'minimal' && <MinimalTemplate resume={resume} />}
      {template === 'corporate' && <CorporateTemplate resume={resume} />}
      {template === 'creative' && <CreativeTemplate resume={resume} />}
    </div>
  )
}
