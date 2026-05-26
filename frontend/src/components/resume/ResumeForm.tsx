import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useResume } from '../../contexts/ResumeContext';
import { useGenerateResume, useImproveSection } from '../../services/query-api';
import { required, email, url, phone } from '../../utils/form-helpers';
import VoiceButton from '../ui/VoiceButton';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import toast from 'react-hot-toast';
import type { PersonalInfo, Resume } from '../../types';

const sectionEase = [0.25, 0.1, 0.25, 1] as const;

const SECTION_MAP: Record<string, string> = {
  personal_info: 'Personal Info',
  summary: 'Professional Summary',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  certifications: 'Certifications',
};

function dataField(path: string) {
  return path.replace(/[^a-zA-Z0-9\[\]._-]/g, '');
}

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: sectionEase }}
        >
          <ChevronDown size={16} className="text-gray-400" />
        </motion.div>
      </button>
      <motion.div
        animate={{ height: open ? height : 0 }}
        transition={{ duration: 0.3, ease: sectionEase }}
        style={{ overflow: 'hidden' }}
      >
        <div ref={contentRef} className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function ImprovableTextarea({
  label, value, onChange, sectionName, jobRole, rows = 3, placeholder,
  error, data_field,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  sectionName: string;
  jobRole: string;
  rows?: number;
  placeholder?: string;
  error?: string;
  data_field?: string;
}) {
  const improveMutation = useImproveSection();

  const handleImprove = async () => {
    if (!value.trim()) return toast.error('Add some content first');
    improveMutation.mutate(
      { section: sectionName, content: value, jobRole },
      {
        onSuccess: (result) => {
          onChange(result.data.improved_content);
          toast.success('Section improved!');
        },
        onError: () => toast.error('Improvement failed. Check your API key.'),
      }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <button
          type="button"
          onClick={handleImprove}
          disabled={improveMutation.isPending}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors"
        >
          <Wand2 size={12} />
          {improveMutation.isPending ? 'Improving...' : 'AI Improve'}
        </button>
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-field={data_field ? dataField(data_field) : undefined}
        className={`input-field resize-none ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function ResumeForm({ jobRole, focusField }: { jobRole: string; focusField?: string | null }) {
  const { resume, updateField, updatePersonal, setGenerating, setResume, setAts } = useResume();
  const generateMutation = useGenerateResume();

  const [rawInput, setRawInput] = useState('');

  const { isListening, supported, start, stop } = useSpeechToText(
    useCallback((text: string) => {
      setRawInput((prev) => (prev ? `${prev} ${text}` : text));
    }, []),
  );
  const toggle = isListening ? stop : start;

  const pi = resume.personal_info || {};

  useEffect(() => {
    if (!focusField) return;
    const fieldPath = dataField(focusField);
    const sectionKey = focusField.split(/[\[.]/)[0];
    const sectionTitle = SECTION_MAP[sectionKey];
    if (!sectionKey || !sectionTitle) return;

    const cards = document.querySelectorAll('.card');
    for (const card of cards) {
      const btn = card.querySelector('button');
      const titleEl = btn?.querySelector('span');
      if (titleEl?.textContent?.trim() === sectionTitle) {
        const content = card.querySelector('[style*="overflow: hidden"]');
        const isCollapsed = content && (content as HTMLElement).style.height === '0px';
        if (isCollapsed) btn?.click();
        break;
      }
    }

    const tryFocus = () => {
      const el = document.querySelector(`[data-field="${fieldPath}"]`);
      if (el instanceof HTMLElement) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-brand-500');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-brand-500');
        }, 2000);
        return true;
      }
      return false;
    };

    setTimeout(tryFocus, 400);
  }, [focusField]);

  const form = useForm({
    defaultValues: resume as Resume,
    validators: {
      onChange: ({ value }) => {
        const errors: Record<string, string> = {};
        if (value.personal_info?.full_name && !value.personal_info.full_name.trim()) {
          errors.full_name = 'Required';
        }
        if (value.personal_info?.email && email()(value.personal_info.email)) {
          errors.email = 'Invalid email';
        }
        return Object.keys(errors).length ? errors : undefined;
      },
    },
    onSubmit: async () => {},
  });

  const setPI = (key: string, val: string) => updatePersonal({ [key]: val });

  const castArr = (field: keyof Resume): Record<string, string>[] =>
    resume[field] as unknown as Record<string, string>[];

  const addItem = (field: keyof Resume, empty: Record<string, string>) => {
    const arr = [...(castArr(field) || []), empty];
    updateField(field, arr);
  };
  const removeItem = (field: keyof Resume, i: number) => {
    const arr = castArr(field).filter((_, idx) => idx !== i);
    updateField(field, arr);
  };
  const updateItem = (field: keyof Resume, i: number, key: string, val: string) => {
    const arr = [...castArr(field)];
    arr[i] = { ...arr[i], [key]: val };
    updateField(field, arr);
  };

  const handleGenerate = async () => {
    if (!rawInput.trim()) return toast.error('Please describe yourself or your experience');
    setGenerating(true);
    generateMutation.mutate(
      { rawInput, jobRole },
      {
        onSuccess: (result) => {
          setResume(result.data.resume_data);
          setAts(result.data.ats_score, result.data.suggestions);
          toast.success('Resume generated!');
        },
        onError: (e) => toast.error((e as Error).message || 'Generation failed'),
        onSettled: () => setGenerating(false),
      }
    );
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-3">
      <div className="card p-4">
        <p className="section-label">AI Generate</p>
        <div className="flex gap-2 mb-2">
          <textarea
            rows={4}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Describe your background, skills, and experience in plain text or speak using the mic…"
            className="input-field resize-none flex-1"
          />
          <VoiceButton listening={isListening} supported={supported} onToggle={toggle} className="self-start mt-0.5" />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="btn-primary w-full justify-center text-sm"
        >
          <Wand2 size={16} />
          {generateMutation.isPending ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>

      <Section title="Personal Info" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['Full Name', 'full_name', required()],
            ['Job Title', 'title'],
            ['Email', 'email', email()],
            ['Phone', 'phone', phone()],
            ['Location', 'location'],
            ['LinkedIn', 'linkedin', url()],
            ['Website', 'website', url()],
          ] as const).map(([label, key, validator]) => (
            <div key={key} className={key === 'full_name' || key === 'title' ? 'col-span-2' : ''}>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
              <form.Field
                name={`personal_info.${key}` as never}
                validators={validator ? { onBlur: ({ value }) => (value as string) ? validator(value as string) : undefined } : undefined}
              >
                {(field) => {
                  const val = (pi as unknown as Record<string, string>)[key] || '';
                  const err = field.state.meta.errors?.[0];
                  return (
                    <>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          field.handleChange(e.target.value as never);
                          setPI(key, e.target.value);
                        }}
                        onBlur={field.handleBlur}
                        data-field={dataField(`personal_info.${key}`)}
                        className={`input-field ${err ? 'border-red-400 focus:ring-red-400' : ''}`}
                        placeholder={label}
                      />
                      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
                    </>
                  );
                }}
              </form.Field>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Professional Summary">
        <form.Field name="summary">
          {(field) => (
            <ImprovableTextarea
              data_field="summary"
              label="Summary"
              value={resume.summary || ''}
              onChange={(v) => {
                field.handleChange(v as never);
                updateField('summary', v);
              }}
              sectionName="summary"
              jobRole={jobRole}
              rows={4}
              placeholder="A compelling professional summary that highlights your expertise…"
              error={field.state.meta.errors?.[0]}
            />
          )}
        </form.Field>
      </Section>

      <Section title="Skills">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Skills (comma-separated)</label>
          <form.Field name="skills">
            {(field) => (
              <textarea
                rows={3}
                value={(resume.skills || []).join(', ')}
                onChange={(e) => {
                  const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  field.handleChange(arr as never);
                  updateField('skills', arr);
                }}
                data-field={dataField('skills')}
                className="input-field resize-none"
                placeholder="React, Node.js, Python, SQL, Docker…"
              />
            )}
          </form.Field>
        </div>
      </Section>

      <Section title="Experience">
        {(resume.experience || []).map((exp, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('experience', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              {([['Company', 'company'], ['Role', 'role'], ['Start', 'start_date'], ['End', 'end_date']] as const).map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <form.Field name={`experience[${i}].${key}` as never}>
                    {(field) => (
                      <input
                        type="text"
                        value={(exp as unknown as Record<string, string>)[key] || ''}
                        onChange={(e) => {
                          field.handleChange(e.target.value as never);
                          updateItem('experience', i, key, e.target.value);
                        }}
                        data-field={dataField(`experience[${i}].${key}`)}
                        className="input-field"
                        placeholder={label}
                      />
                    )}
                  </form.Field>
                </div>
              ))}
            </div>
            <form.Field name={`experience[${i}].description` as never}>
              {(field) => (
                <ImprovableTextarea
                  label="Description"
                  value={exp.description || ''}
                  onChange={(v) => {
                    field.handleChange(v as never);
                    updateItem('experience', i, 'description', v);
                  }}
                  sectionName="experience"
                  jobRole={jobRole}
                  rows={3}
                  placeholder="• Led team of 5 engineers to deliver…&#10;• Improved performance by 40%…"
                  data_field={`experience[${i}].description`}
                />
              )}
            </form.Field>
          </div>
        ))}
        <button type="button" onClick={() => addItem('experience', { company: '', role: '', start_date: '', end_date: '', description: '' })}
          className="btn-secondary w-full justify-center text-sm py-2">
          <Plus size={14} /> Add Experience
        </button>
      </Section>

      <Section title="Projects">
        {(resume.projects || []).map((proj, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('projects', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            {([['Name', 'name'], ['Tech Stack', 'tech_stack'], ['Link', 'link']] as const).map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                <form.Field name={`projects[${i}].${key}` as never}>
                    {(field) => (
                      <input
                        type="text"
                        value={(proj as unknown as Record<string, string>)[key] || ''}
                        onChange={(e) => {
                          field.handleChange(e.target.value as never);
                          updateItem('projects', i, key, e.target.value);
                        }}
                        data-field={dataField(`projects[${i}].${key}`)}
                        className="input-field"
                        placeholder={label}
                      />
                    )}
                  </form.Field>
                </div>
              ))}
              <form.Field name={`projects[${i}].description` as never}>
                {(field) => (
                  <ImprovableTextarea
                    label="Description"
                    value={proj.description || ''}
                    onChange={(v) => {
                      field.handleChange(v as never);
                      updateItem('projects', i, 'description', v);
                    }}
                    sectionName="project"
                    jobRole={jobRole}
                    rows={2}
                    placeholder="Built a full-stack app that…"
                    data_field={`projects[${i}].description`}
                  />
              )}
            </form.Field>
          </div>
        ))}
        <button type="button" onClick={() => addItem('projects', { name: '', description: '', tech_stack: '', link: '' })}
          className="btn-secondary w-full justify-center text-sm py-2">
          <Plus size={14} /> Add Project
        </button>
      </Section>

      <Section title="Education">
        {(resume.education || []).map((edu, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('education', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              {([['Institution', 'institution'], ['Degree', 'degree'], ['Field', 'field'], ['Year', 'year'], ['GPA', 'gpa']] as const).map(([label, key]) => (
                <div key={key} className={key === 'institution' ? 'col-span-2' : ''}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <form.Field name={`education[${i}].${key}` as never}>
                    {(field) => (
                      <input
                        type="text"
                        value={(edu as unknown as Record<string, string>)[key] || ''}
                        onChange={(e) => {
                          field.handleChange(e.target.value as never);
                          updateItem('education', i, key, e.target.value);
                        }}
                        data-field={dataField(`education[${i}].${key}`)}
                        className="input-field"
                        placeholder={label}
                      />
                    )}
                  </form.Field>
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

      <Section title="Certifications">
        {(resume.certifications || []).map((cert, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 relative">
            <button type="button" onClick={() => removeItem('certifications', i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-3 gap-2">
              {([['Name', 'name'], ['Issuer', 'issuer'], ['Year', 'year']] as const).map(([label, key]) => (
                <div key={key} className={key === 'name' ? 'col-span-3' : ''}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <form.Field name={`certifications[${i}].${key}` as never}>
                    {(field) => (
                      <input
                        type="text"
                        value={(cert as unknown as Record<string, string>)[key] || ''}
                        onChange={(e) => {
                          field.handleChange(e.target.value as never);
                          updateItem('certifications', i, key, e.target.value);
                        }}
                        data-field={dataField(`certifications[${i}].${key}`)}
                        className="input-field"
                        placeholder={label}
                      />
                    )}
                  </form.Field>
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
    </form>
  );
}
