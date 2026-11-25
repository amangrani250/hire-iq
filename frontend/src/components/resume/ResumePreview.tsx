import { memo, useRef, useCallback } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import type { Resume } from '../../types';

function Pf({ path, children, className }: { path: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      data-field={path}
      className={`cursor-pointer rounded-sm -mx-0.5 px-0.5 transition-colors hover:bg-amber-200/60 ${className || ''}`}
      title="Double-click to edit"
    >
      {children}
    </span>
  );
}

const Section = memo(function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5 pb-0.5 border-b border-gray-200">{title}</h2>
      {children}
    </div>
  );
});

const CorpSection = memo(function CorpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider">{title}</h2>
        <div className="flex-1 h-px bg-blue-100" />
      </div>
      {children}
    </div>
  );
});

const MinimalTemplate = memo(function MinimalTemplate({ resume }: { resume: Resume }) {
  const pi = resume.personal_info || {};
  return (
    <div className="font-sans text-gray-900 text-[11px] leading-relaxed p-8 bg-white min-h-full">
      <div className="mb-5 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5"><Pf path="personal_info.full_name">{pi.full_name || 'Your Name'}</Pf></h1>
        {pi.title && <p className="text-sm text-gray-500 mb-2"><Pf path="personal_info.title">{pi.title}</Pf></p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-[10px]">
          {pi.email && <span className="flex items-center gap-1"><Mail size={9} /><Pf path="personal_info.email">{pi.email}</Pf></span>}
          {pi.phone && <span className="flex items-center gap-1"><Phone size={9} /><Pf path="personal_info.phone">{pi.phone}</Pf></span>}
          {pi.location && <span className="flex items-center gap-1"><MapPin size={9} /><Pf path="personal_info.location">{pi.location}</Pf></span>}
          {pi.linkedin && <span className="flex items-center gap-1"><Globe size={9} /><Pf path="personal_info.linkedin">{pi.linkedin}</Pf></span>}
          {pi.website && <span className="flex items-center gap-1"><Globe size={9} /><Pf path="personal_info.website">{pi.website}</Pf></span>}
        </div>
      </div>

      {resume.summary && (
        <Section title="Summary">
          <p className="text-gray-700"><Pf path="summary">{resume.summary}</Pf></p>
        </Section>
      )}

      {resume.skills?.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.map((s, i) => (
              <Pf key={i} path={`skills[${i}]`}><span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 text-[10px]">{s}</span></Pf>
            ))}
          </div>
        </Section>
      )}

      {resume.experience?.length > 0 && (
        <Section title="Experience">
          {resume.experience.map((e, i) => (
            <div key={i} className={i > 0 ? 'mt-3' : ''}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 text-xs"><Pf path={`experience[${i}].role`}>{e.role}</Pf></p>
                  <p className="text-gray-500"><Pf path={`experience[${i}].company`}>{e.company}</Pf></p>
                </div>
                {(e.start_date || e.end_date) && (
                  <p className="text-gray-400 whitespace-nowrap ml-4">
                    <Pf path={`experience[${i}].start_date`}>{e.start_date}</Pf>{e.end_date ? ` – ` : ''}
                    {e.end_date && <Pf path={`experience[${i}].end_date`}>{e.end_date}</Pf>}
                  </p>
                )}
              </div>
              {e.description && (
                <div className="mt-1 text-gray-700 whitespace-pre-line"><Pf path={`experience[${i}].description`}>{e.description}</Pf></div>
              )}
            </div>
          ))}
        </Section>
      )}

      {resume.projects?.length > 0 && (
        <Section title="Projects">
          {resume.projects.map((p, i) => (
            <div key={i} className={i > 0 ? 'mt-2' : ''}>
              <div className="flex justify-between">
                <p className="font-semibold text-gray-900 text-xs"><Pf path={`projects[${i}].name`}>{p.name}</Pf></p>
                {p.link && <Pf path={`projects[${i}].link`}><a href={p.link} className="text-blue-500">{p.link}</a></Pf>}
              </div>
              {p.tech_stack && <p className="text-gray-400 italic"><Pf path={`projects[${i}].tech_stack`}>{p.tech_stack}</Pf></p>}
              {p.description && <p className="text-gray-700 mt-0.5"><Pf path={`projects[${i}].description`}>{p.description}</Pf></p>}
            </div>
          ))}
        </Section>
      )}

      {resume.education?.length > 0 && (
        <Section title="Education">
          {resume.education.map((e, i) => (
            <div key={i} className={i > 0 ? 'mt-2' : ''}>
              <div className="flex justify-between">
                <p className="font-semibold text-gray-900 text-xs">
                  <Pf path={`education[${i}].degree`}>{e.degree}</Pf>{e.field ? <Pf path={`education[${i}].field`}> in {e.field}</Pf> : ''}
                </p>
                {e.year && <p className="text-gray-400"><Pf path={`education[${i}].year`}>{e.year}</Pf></p>}
              </div>
              <p className="text-gray-500">
                <Pf path={`education[${i}].institution`}>{e.institution}</Pf>
                {e.gpa ? <Pf path={`education[${i}].gpa`}> • GPA: {e.gpa}</Pf> : ''}
              </p>
            </div>
          ))}
        </Section>
      )}

      {resume.certifications?.length > 0 && (
        <Section title="Certifications">
          {resume.certifications.map((c, i) => (
            <div key={i} className="flex justify-between">
              <p className="text-gray-700">
                <Pf path={`certifications[${i}].name`}>{c.name}</Pf>
                {c.issuer ? <Pf path={`certifications[${i}].issuer`}> • {c.issuer}</Pf> : ''}
              </p>
              {c.year && <p className="text-gray-400"><Pf path={`certifications[${i}].year`}>{c.year}</Pf></p>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
});

const CorporateTemplate = memo(function CorporateTemplate({ resume }: { resume: Resume }) {
  const pi = resume.personal_info || {};
  return (
    <div className="font-sans text-[11px] leading-relaxed bg-white min-h-full">
      <div className="bg-blue-700 text-white px-8 py-6">
        <h1 className="text-2xl font-bold mb-0.5"><Pf path="personal_info.full_name">{pi.full_name || 'Your Name'}</Pf></h1>
        {pi.title && <p className="text-blue-200 text-sm mb-3"><Pf path="personal_info.title">{pi.title}</Pf></p>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-blue-100 text-[10px]">
          {pi.email && <span><Pf path="personal_info.email">{pi.email}</Pf></span>}
          {pi.phone && <span><Pf path="personal_info.phone">{pi.phone}</Pf></span>}
          {pi.location && <span><Pf path="personal_info.location">{pi.location}</Pf></span>}
          {pi.linkedin && <span><Pf path="personal_info.linkedin">{pi.linkedin}</Pf></span>}
        </div>
      </div>
      <div className="p-8 space-y-4">
        {resume.summary && (
          <CorpSection title="Professional Summary">
            <p className="text-gray-700"><Pf path="summary">{resume.summary}</Pf></p>
          </CorpSection>
        )}
        {resume.skills?.length > 0 && (
          <CorpSection title="Core Competencies">
            <div className="grid grid-cols-3 gap-1">
              {resume.skills.map((s, i) => (
                <Pf key={i} path={`skills[${i}]`}><span className="flex items-center gap-1 text-gray-700">
                  <span className="w-1 h-1 bg-blue-600 rounded-full shrink-0" />{s}
                </span></Pf>
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
                    <p className="font-bold text-gray-900 text-xs"><Pf path={`experience[${i}].role`}>{e.role}</Pf></p>
                    <p className="text-blue-700 font-medium"><Pf path={`experience[${i}].company`}>{e.company}</Pf></p>
                  </div>
                  {(e.start_date || e.end_date) && (
                    <p className="text-gray-400">
                      <Pf path={`experience[${i}].start_date`}>{e.start_date}</Pf>{e.end_date ? ` – ` : ''}
                      {e.end_date && <Pf path={`experience[${i}].end_date`}>{e.end_date}</Pf>}
                    </p>
                  )}
                </div>
                {e.description && <div className="mt-1 text-gray-700 whitespace-pre-line"><Pf path={`experience[${i}].description`}>{e.description}</Pf></div>}
              </div>
            ))}
          </CorpSection>
        )}
        {resume.education?.length > 0 && (
          <CorpSection title="Education">
            {resume.education.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-1.5' : ''}>
                <div className="flex justify-between">
                  <p className="font-bold text-gray-900 text-xs">
                    <Pf path={`education[${i}].degree`}>{e.degree}</Pf>{e.field ? <Pf path={`education[${i}].field`}> in {e.field}</Pf> : ''}
                  </p>
                  {e.year && <p className="text-gray-400"><Pf path={`education[${i}].year`}>{e.year}</Pf></p>}
                </div>
                <p className="text-gray-500"><Pf path={`education[${i}].institution`}>{e.institution}</Pf></p>
              </div>
            ))}
          </CorpSection>
        )}
      </div>
    </div>
  );
});

const CreativeTemplate = memo(function CreativeTemplate({ resume }: { resume: Resume }) {
  const pi = resume.personal_info || {};
  return (
    <div className="font-sans text-[11px] leading-relaxed bg-white min-h-full flex">
      <div className="w-1/3 bg-gray-900 text-white p-6 space-y-5 shrink-0">
        <div>
          <h1 className="text-lg font-bold leading-tight"><Pf path="personal_info.full_name">{pi.full_name || 'Your Name'}</Pf></h1>
          {pi.title && <p className="text-purple-300 text-[10px] mt-0.5"><Pf path="personal_info.title">{pi.title}</Pf></p>}
        </div>
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Contact</p>
          {pi.email && <p className="text-gray-300 text-[10px] break-all"><Pf path="personal_info.email">{pi.email}</Pf></p>}
          {pi.phone && <p className="text-gray-300 text-[10px]"><Pf path="personal_info.phone">{pi.phone}</Pf></p>}
          {pi.location && <p className="text-gray-300 text-[10px]"><Pf path="personal_info.location">{pi.location}</Pf></p>}
          {pi.linkedin && <p className="text-gray-300 text-[10px] break-all"><Pf path="personal_info.linkedin">{pi.linkedin}</Pf></p>}
        </div>
        {resume.skills?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Skills</p>
            <div className="space-y-1.5">
              {resume.skills.map((s, i) => (
                <div key={i}>
                  <p className="text-gray-300 mb-0.5"><Pf path={`skills[${i}]`}>{s}</Pf></p>
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
              <p key={i} className="text-gray-300 mb-1"><Pf path={`certifications[${i}].name`}>{c.name}</Pf></p>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-6 space-y-4">
        {resume.summary && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-1.5">About Me</p>
            <p className="text-gray-700"><Pf path="summary">{resume.summary}</Pf></p>
          </div>
        )}
        {resume.experience?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-2">Experience</p>
            {resume.experience.map((e, i) => (
              <div key={i} className={`${i > 0 ? 'mt-3' : ''} pl-3 border-l-2 border-purple-200`}>
                <p className="font-bold text-gray-900 text-xs"><Pf path={`experience[${i}].role`}>{e.role}</Pf></p>
                <div className="flex justify-between">
                  <p className="text-purple-600"><Pf path={`experience[${i}].company`}>{e.company}</Pf></p>
                  {(e.start_date || e.end_date) && (
                    <p className="text-gray-400">
                      <Pf path={`experience[${i}].start_date`}>{e.start_date}</Pf>{e.end_date ? ` – ` : ''}
                      {e.end_date && <Pf path={`experience[${i}].end_date`}>{e.end_date}</Pf>}
                    </p>
                  )}
                </div>
                {e.description && <div className="mt-1 text-gray-700 whitespace-pre-line"><Pf path={`experience[${i}].description`}>{e.description}</Pf></div>}
              </div>
            ))}
          </div>
        )}
        {resume.projects?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-2">Projects</p>
            {resume.projects.map((p, i) => (
              <div key={i} className={`${i > 0 ? 'mt-2' : ''} pl-3 border-l-2 border-purple-200`}>
                <p className="font-bold text-gray-900 text-xs"><Pf path={`projects[${i}].name`}>{p.name}</Pf></p>
                {p.tech_stack && <p className="text-purple-400 italic"><Pf path={`projects[${i}].tech_stack`}>{p.tech_stack}</Pf></p>}
                {p.description && <p className="text-gray-700 mt-0.5"><Pf path={`projects[${i}].description`}>{p.description}</Pf></p>}
              </div>
            ))}
          </div>
        )}
        {resume.education?.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-purple-600 mb-2">Education</p>
            {resume.education.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-2' : ''}>
                <p className="font-bold text-gray-900 text-xs">
                  <Pf path={`education[${i}].degree`}>{e.degree}</Pf>{e.field ? <Pf path={`education[${i}].field`}> in {e.field}</Pf> : ''}
                </p>
                <div className="flex justify-between">
                  <p className="text-gray-500"><Pf path={`education[${i}].institution`}>{e.institution}</Pf></p>
                  {e.year && <p className="text-gray-400"><Pf path={`education[${i}].year`}>{e.year}</Pf></p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const ExecSection = memo(function ExecSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-[10px] font-bold text-amber-700 uppercase tracking-[0.15em]">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-300/60 to-transparent" />
      </div>
      {children}
    </div>
  );
});

const ExecutiveTemplate = memo(function ExecutiveTemplate({ resume }: { resume: Resume }) {
  const pi = resume.personal_info || {};
  return (
    <div className="font-sans text-[11px] leading-relaxed bg-white min-h-full">
      <div className="bg-slate-900 text-white px-8 pt-8 pb-6">
        <h1 className="text-2xl font-extrabold tracking-tight mb-1"><Pf path="personal_info.full_name">{pi.full_name || 'Your Name'}</Pf></h1>
        {pi.title && <p className="text-amber-300 text-sm font-medium tracking-wide mb-3"><Pf path="personal_info.title">{pi.title}</Pf></p>}
        <div className="w-12 h-0.5 bg-amber-400/60 mb-3" />
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-slate-300 text-[10px]">
          {pi.email && <span><Pf path="personal_info.email">{pi.email}</Pf></span>}
          {pi.phone && <span><Pf path="personal_info.phone">{pi.phone}</Pf></span>}
          {pi.location && <span><Pf path="personal_info.location">{pi.location}</Pf></span>}
          {pi.linkedin && <span><Pf path="personal_info.linkedin">{pi.linkedin}</Pf></span>}
          {pi.website && <span><Pf path="personal_info.website">{pi.website}</Pf></span>}
        </div>
      </div>
      <div className="px-8 py-5 space-y-4">
        {resume.summary && (
          <ExecSection title="Professional Summary">
            <p className="text-slate-700 leading-relaxed"><Pf path="summary">{resume.summary}</Pf></p>
          </ExecSection>
        )}
        {resume.skills?.length > 0 && (
          <ExecSection title="Core Competencies">
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((s, i) => (
                <Pf key={i} path={`skills[${i}]`}><span className="px-2.5 py-0.5 border border-amber-300 bg-amber-50/50 text-amber-800 rounded text-[10px] font-medium">{s}</span></Pf>
              ))}
            </div>
          </ExecSection>
        )}
        {resume.experience?.length > 0 && (
          <ExecSection title="Professional Experience">
            {resume.experience.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 text-xs"><Pf path={`experience[${i}].role`}>{e.role}</Pf></p>
                    <p className="text-slate-500 font-medium"><Pf path={`experience[${i}].company`}>{e.company}</Pf></p>
                  </div>
                  {(e.start_date || e.end_date) && (
                    <p className="text-slate-400 whitespace-nowrap ml-4">
                      <Pf path={`experience[${i}].start_date`}>{e.start_date}</Pf>{e.end_date ? ` – ` : ''}
                      {e.end_date && <Pf path={`experience[${i}].end_date`}>{e.end_date}</Pf>}
                    </p>
                  )}
                </div>
                {e.description && <div className="mt-1.5 text-slate-600 whitespace-pre-line"><Pf path={`experience[${i}].description`}>{e.description}</Pf></div>}
              </div>
            ))}
          </ExecSection>
        )}
        {resume.projects?.length > 0 && (
          <ExecSection title="Projects & Achievements">
            {resume.projects.map((p, i) => (
              <div key={i} className={i > 0 ? 'mt-2' : ''}>
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-slate-900 text-xs"><Pf path={`projects[${i}].name`}>{p.name}</Pf></p>
                  {p.link && <span className="text-amber-600 text-[10px]"><Pf path={`projects[${i}].link`}>{p.link}</Pf></span>}
                </div>
                {p.tech_stack && <p className="text-slate-400 italic text-[10px]"><Pf path={`projects[${i}].tech_stack`}>{p.tech_stack}</Pf></p>}
                {p.description && <p className="text-slate-600 mt-0.5"><Pf path={`projects[${i}].description`}>{p.description}</Pf></p>}
              </div>
            ))}
          </ExecSection>
        )}
        {resume.education?.length > 0 && (
          <ExecSection title="Education">
            {resume.education.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-1.5' : ''}>
                <div className="flex justify-between">
                  <p className="font-semibold text-slate-900 text-xs">
                    <Pf path={`education[${i}].degree`}>{e.degree}</Pf>{e.field ? <Pf path={`education[${i}].field`}> in {e.field}</Pf> : ''}
                  </p>
                  {e.year && <p className="text-slate-400"><Pf path={`education[${i}].year`}>{e.year}</Pf></p>}
                </div>
                <p className="text-slate-500"><Pf path={`education[${i}].institution`}>{e.institution}</Pf>{e.gpa ? <Pf path={`education[${i}].gpa`}> • GPA: {e.gpa}</Pf> : ''}</p>
              </div>
            ))}
          </ExecSection>
        )}
        {resume.certifications?.length > 0 && (
          <ExecSection title="Certifications">
            {resume.certifications.map((c, i) => (
              <div key={i} className="flex justify-between">
                <p className="text-slate-700"><Pf path={`certifications[${i}].name`}>{c.name}</Pf>{c.issuer ? <Pf path={`certifications[${i}].issuer`}> • {c.issuer}</Pf> : ''}</p>
                {c.year && <p className="text-slate-400"><Pf path={`certifications[${i}].year`}>{c.year}</Pf></p>}
              </div>
            ))}
          </ExecSection>
        )}
      </div>
    </div>
  );
});

const ModSection = memo(function ModSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-0.5 h-4 bg-teal-500 mt-0.5 shrink-0" />
        <h2 className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
});

const ModernTemplate = memo(function ModernTemplate({ resume }: { resume: Resume }) {
  const pi = resume.personal_info || {};
  return (
    <div className="font-sans text-[11px] leading-relaxed bg-white min-h-full">
      <div className="px-8 pt-8 pb-5 border-b-2 border-teal-500">
        <h1 className="text-2xl font-bold text-gray-900 mb-1"><Pf path="personal_info.full_name">{pi.full_name || 'Your Name'}</Pf></h1>
        {pi.title && <p className="text-teal-600 text-sm font-medium mb-2"><Pf path="personal_info.title">{pi.title}</Pf></p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-[10px]">
          {pi.email && <span><Pf path="personal_info.email">{pi.email}</Pf></span>}
          {pi.phone && <span><Pf path="personal_info.phone">{pi.phone}</Pf></span>}
          {pi.location && <span><Pf path="personal_info.location">{pi.location}</Pf></span>}
          {pi.linkedin && <span><Pf path="personal_info.linkedin">{pi.linkedin}</Pf></span>}
          {pi.website && <span><Pf path="personal_info.website">{pi.website}</Pf></span>}
        </div>
      </div>
      <div className="px-8 py-5 space-y-4">
        {resume.summary && (
          <ModSection title="Professional Summary">
            <p className="text-gray-700 leading-relaxed"><Pf path="summary">{resume.summary}</Pf></p>
          </ModSection>
        )}
        {resume.skills?.length > 0 && (
          <ModSection title="Skills & Expertise">
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((s, i) => (
                <Pf key={i} path={`skills[${i}]`}><span className="px-2.5 py-0.5 border border-teal-200 bg-teal-50 text-teal-700 rounded-full text-[10px] font-medium">{s}</span></Pf>
              ))}
            </div>
          </ModSection>
        )}
        {resume.experience?.length > 0 && (
          <ModSection title="Experience">
            {resume.experience.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-teal-100' : ''}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 text-xs"><Pf path={`experience[${i}].role`}>{e.role}</Pf></p>
                    <p className="text-teal-600 font-medium"><Pf path={`experience[${i}].company`}>{e.company}</Pf></p>
                  </div>
                  {(e.start_date || e.end_date) && (
                    <p className="text-gray-400 whitespace-nowrap ml-4">
                      <Pf path={`experience[${i}].start_date`}>{e.start_date}</Pf>{e.end_date ? ` – ` : ''}
                      {e.end_date && <Pf path={`experience[${i}].end_date`}>{e.end_date}</Pf>}
                    </p>
                  )}
                </div>
                {e.description && <div className="mt-1 text-gray-600 whitespace-pre-line"><Pf path={`experience[${i}].description`}>{e.description}</Pf></div>}
              </div>
            ))}
          </ModSection>
        )}
        {resume.projects?.length > 0 && (
          <ModSection title="Projects">
            {resume.projects.map((p, i) => (
              <div key={i} className={i > 0 ? 'mt-2' : ''}>
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-gray-900 text-xs"><Pf path={`projects[${i}].name`}>{p.name}</Pf></p>
                  {p.link && <span className="text-teal-500 text-[10px]"><Pf path={`projects[${i}].link`}>{p.link}</Pf></span>}
                </div>
                {p.tech_stack && <p className="text-teal-500 italic text-[10px]"><Pf path={`projects[${i}].tech_stack`}>{p.tech_stack}</Pf></p>}
                {p.description && <p className="text-gray-600 mt-0.5"><Pf path={`projects[${i}].description`}>{p.description}</Pf></p>}
              </div>
            ))}
          </ModSection>
        )}
        {resume.education?.length > 0 && (
          <ModSection title="Education">
            {resume.education.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-1.5' : ''}>
                <div className="flex justify-between">
                  <p className="font-semibold text-gray-900 text-xs">
                    <Pf path={`education[${i}].degree`}>{e.degree}</Pf>{e.field ? <Pf path={`education[${i}].field`}> in {e.field}</Pf> : ''}
                  </p>
                  {e.year && <p className="text-gray-400"><Pf path={`education[${i}].year`}>{e.year}</Pf></p>}
                </div>
                <p className="text-gray-500"><Pf path={`education[${i}].institution`}>{e.institution}</Pf>{e.gpa ? <Pf path={`education[${i}].gpa`}> • GPA: {e.gpa}</Pf> : ''}</p>
              </div>
            ))}
          </ModSection>
        )}
        {resume.certifications?.length > 0 && (
          <ModSection title="Certifications">
            {resume.certifications.map((c, i) => (
              <div key={i} className="flex justify-between">
                <p className="text-gray-700"><Pf path={`certifications[${i}].name`}>{c.name}</Pf>{c.issuer ? <Pf path={`certifications[${i}].issuer`}> • {c.issuer}</Pf> : ''}</p>
                {c.year && <p className="text-gray-400"><Pf path={`certifications[${i}].year`}>{c.year}</Pf></p>}
              </div>
            ))}
          </ModSection>
        )}
      </div>
    </div>
  );
});

const ProfSection = memo(function ProfSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 pl-2.5 border-l-[3px] border-indigo-500">{title}</h2>
      {children}
    </div>
  );
});

const ProfessionalTemplate = memo(function ProfessionalTemplate({ resume }: { resume: Resume }) {
  const pi = resume.personal_info || {};
  return (
    <div className="font-sans text-[11px] leading-relaxed bg-white min-h-full">
      <div className="px-8 pt-8 pb-5 border-b border-indigo-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-0.5"><Pf path="personal_info.full_name">{pi.full_name || 'Your Name'}</Pf></h1>
        {pi.title && <p className="text-indigo-600 text-sm mb-2"><Pf path="personal_info.title">{pi.title}</Pf></p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-[10px]">
          {pi.email && <span><Pf path="personal_info.email">{pi.email}</Pf></span>}
          {pi.phone && <span><Pf path="personal_info.phone">{pi.phone}</Pf></span>}
          {pi.location && <span><Pf path="personal_info.location">{pi.location}</Pf></span>}
          {pi.linkedin && <span><Pf path="personal_info.linkedin">{pi.linkedin}</Pf></span>}
          {pi.website && <span><Pf path="personal_info.website">{pi.website}</Pf></span>}
        </div>
      </div>
      <div className="px-8 py-5 space-y-4">
        {resume.summary && (
          <ProfSection title="Professional Summary">
            <p className="text-gray-700 leading-relaxed"><Pf path="summary">{resume.summary}</Pf></p>
          </ProfSection>
        )}
        {resume.skills?.length > 0 && (
          <ProfSection title="Skills">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {resume.skills.map((s, i) => (
                <Pf key={i} path={`skills[${i}]`}><span className="text-gray-700 text-[10px]">{s}{i < resume.skills.length - 1 ? <span className="text-indigo-300 ml-3">|</span> : null}</span></Pf>
              ))}
            </div>
          </ProfSection>
        )}
        {resume.experience?.length > 0 && (
          <ProfSection title="Experience">
            {resume.experience.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 text-xs"><Pf path={`experience[${i}].role`}>{e.role}</Pf></p>
                    <p className="text-indigo-600 font-medium"><Pf path={`experience[${i}].company`}>{e.company}</Pf></p>
                  </div>
                  {(e.start_date || e.end_date) && (
                    <p className="text-gray-400 whitespace-nowrap ml-4">
                      <Pf path={`experience[${i}].start_date`}>{e.start_date}</Pf>{e.end_date ? ` – ` : ''}
                      {e.end_date && <Pf path={`experience[${i}].end_date`}>{e.end_date}</Pf>}
                    </p>
                  )}
                </div>
                {e.description && <div className="mt-1 text-gray-600 whitespace-pre-line"><Pf path={`experience[${i}].description`}>{e.description}</Pf></div>}
              </div>
            ))}
          </ProfSection>
        )}
        {resume.projects?.length > 0 && (
          <ProfSection title="Projects">
            {resume.projects.map((p, i) => (
              <div key={i} className={i > 0 ? 'mt-2' : ''}>
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-gray-900 text-xs"><Pf path={`projects[${i}].name`}>{p.name}</Pf></p>
                  {p.link && <span className="text-indigo-400 text-[10px]"><Pf path={`projects[${i}].link`}>{p.link}</Pf></span>}
                </div>
                {p.tech_stack && <p className="text-gray-400 italic text-[10px]"><Pf path={`projects[${i}].tech_stack`}>{p.tech_stack}</Pf></p>}
                {p.description && <p className="text-gray-600 mt-0.5"><Pf path={`projects[${i}].description`}>{p.description}</Pf></p>}
              </div>
            ))}
          </ProfSection>
        )}
        {resume.education?.length > 0 && (
          <ProfSection title="Education">
            {resume.education.map((e, i) => (
              <div key={i} className={i > 0 ? 'mt-1.5' : ''}>
                <div className="flex justify-between">
                  <p className="font-semibold text-gray-900 text-xs">
                    <Pf path={`education[${i}].degree`}>{e.degree}</Pf>{e.field ? <Pf path={`education[${i}].field`}> in {e.field}</Pf> : ''}
                  </p>
                  {e.year && <p className="text-gray-400"><Pf path={`education[${i}].year`}>{e.year}</Pf></p>}
                </div>
                <p className="text-gray-500"><Pf path={`education[${i}].institution`}>{e.institution}</Pf>{e.gpa ? <Pf path={`education[${i}].gpa`}> • GPA: {e.gpa}</Pf> : ''}</p>
              </div>
            ))}
          </ProfSection>
        )}
        {resume.certifications?.length > 0 && (
          <ProfSection title="Certifications">
            {resume.certifications.map((c, i) => (
              <div key={i} className="flex justify-between">
                <p className="text-gray-700"><Pf path={`certifications[${i}].name`}>{c.name}</Pf>{c.issuer ? <Pf path={`certifications[${i}].issuer`}> • {c.issuer}</Pf> : ''}</p>
                {c.year && <p className="text-gray-400"><Pf path={`certifications[${i}].year`}>{c.year}</Pf></p>}
              </div>
            ))}
          </ProfSection>
        )}
      </div>
    </div>
  );
});

const ResumePreview = memo(function ResumePreview({ onFieldDoubleClick }: { onFieldDoubleClick?: (path: string) => void }) {
  const { resume, template } = useResume();
  const lastTapRef = useRef<{ field: string; time: number } | null>(null);

  const triggerField = useCallback((field: string) => {
    onFieldDoubleClick?.(field);
  }, [onFieldDoubleClick]);

  const handleDblClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const field = target.closest('[data-field]')?.getAttribute('data-field');
    if (field) triggerField(field);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const field = target.closest('[data-field]')?.getAttribute('data-field');
    if (!field) return;
    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.field === field && now - lastTapRef.current.time < 300) {
      e.preventDefault();
      triggerField(field);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { field, time: now };
    }
  }, [triggerField]);

  return (
    <div
      id="resume-preview"
      className="w-full shadow-xl rounded-xl overflow-hidden border border-gray-200"
      style={{ minHeight: '842px', touchAction: 'manipulation' }}
      onDoubleClick={handleDblClick}
      onTouchStart={handleTouchStart}
    >
      {template === 'minimal' && <MinimalTemplate resume={resume} />}
      {template === 'corporate' && <CorporateTemplate resume={resume} />}
      {template === 'creative' && <CreativeTemplate resume={resume} />}
      {template === 'executive' && <ExecutiveTemplate resume={resume} />}
      {template === 'modern' && <ModernTemplate resume={resume} />}
      {template === 'professional' && <ProfessionalTemplate resume={resume} />}
    </div>
  );
});

export default ResumePreview;
