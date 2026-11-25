import { useState, useCallback, useId } from 'react';
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useResume } from '../../context/ResumeContext';
import { improveSection } from '../../services/api';
import VoiceButton from '../ui/VoiceButton';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import Button from '../ui/Button';
import { Input, Label, Textarea } from '../ui/Field';

function Section({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
        aria-expanded={open}
      >
        <span>
          <span className="block text-[13px] font-semibold text-foreground">{title}</span>
          {description && (
            <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{description}</span>
          )}
        </span>
        {open ? (
          <ChevronUp size={15} className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3.5">{children}</div>
      )}
    </div>
  );
}

function ImprovableTextarea({ label, value, onChange, sectionName, jobRole, rows = 3, placeholder }) {
  const [improving, setImproving] = useState(false);

  const handleImprove = async () => {
    if (!value.trim()) {
      toast.error('Add some content first');
      return;
    }
    setImproving(true);
    try {
      const { data } = await improveSection(sectionName, value, jobRole);
      onChange(data.improved_content);
      toast.success('Section improved');
    } catch {
      toast.error('Could not improve this section. Please try again.');
    } finally {
      setImproving(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="mb-0 text-[11.5px] text-muted-foreground">{label}</Label>
        <button
          type="button"
          onClick={handleImprove}
          disabled={improving}
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary transition-opacity hover:opacity-75 disabled:opacity-50"
        >
          <Wand2 size={11} />
          {improving ? 'Improving…' : 'AI improve'}
        </button>
      </div>
      <Textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="resize-none"
      />
    </div>
  );
}

function FieldGrid({ fields, value, onChange, columns = 2 }) {
  const groupId = useId();

  return (
    <div className={`grid gap-2 ${columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
      {fields.map(([label, key, span]) => (
        <div key={key} className={span ? 'col-span-2' : ''}>
          <Label
            htmlFor={`${groupId}-${key}`}
            className="mb-1 block text-[11.5px] text-muted-foreground"
          >
            {label}
          </Label>
          <Input
            id={`${groupId}-${key}`}
            type="text"
            value={value[key] || ''}
            onChange={(event) => onChange(key, event.target.value)}
            placeholder={label}
            className="py-2"
          />
        </div>
      ))}
    </div>
  );
}

export default function ResumeForm({ jobRole }) {
  const {
    resume,
    updateField,
    updatePersonal,
    setGenerating,
    setResume,
    setAts,
    isGenerating,
  } = useResume();

  const [rawInput, setRawInput] = useState('');

  const handleVoiceResult = useCallback((text) => setRawInput(text), []);
  const { listening, supported, toggle } = useVoiceInput(handleVoiceResult);

  const pi = resume.personal_info || {};
  const setPI = (key, value) => updatePersonal({ [key]: value });

  const addItem = (field, empty) => updateField(field, [...(resume[field] || []), empty]);
  const removeItem = (field, index) =>
    updateField(field, resume[field].filter((_, itemIndex) => itemIndex !== index));
  const updateItem = (field, index, key, value) => {
    const next = [...resume[field]];
    next[index] = { ...next[index], [key]: value };
    updateField(field, next);
  };

  const handleGenerate = async () => {
    if (!rawInput.trim()) {
      toast.error('Describe yourself or your experience first');
      return;
    }
    setGenerating(true);
    try {
      const { generateResume } = await import('../../services/api');
      const { data } = await generateResume(rawInput, jobRole);
      setResume(data.resume_data);
      setAts(data.ats_score, data.suggestions);
      toast.success('Resume generated');
    } catch (error) {
      toast.error(error.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <p className="section-label mb-2">AI generate</p>
        <div className="flex gap-2">
          <Textarea
            rows={4}
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder="Describe your background, skills, and experience in plain language — or speak using the mic."
            className="flex-1 resize-none"
          />
          <VoiceButton
            listening={listening}
            supported={supported}
            onToggle={toggle}
            className="mt-0.5 self-start"
          />
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating} className="mt-2 w-full" size="sm">
          <Sparkles size={14} />
          {isGenerating ? 'Generating…' : 'Generate with AI'}
        </Button>
      </div>

      <Section title="Personal info" description="Name, contact, and links" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Full name', 'full_name', true],
            ['Job title', 'title', true],
            ['Email', 'email'],
            ['Phone', 'phone'],
            ['Location', 'location'],
            ['LinkedIn', 'linkedin'],
            ['Website', 'website'],
          ].map(([label, key, span]) => (
            <div key={key} className={span ? 'col-span-2' : ''}>
              <Label htmlFor={key} className="mb-1 block text-[11.5px] text-muted-foreground">
                {label}
              </Label>
              <Input
                id={key}
                type="text"
                value={pi[key] || ''}
                onChange={(event) => setPI(key, event.target.value)}
                placeholder={label}
                className="py-2"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Professional summary" description="The two or three lines a recruiter reads first">
        <ImprovableTextarea
          label="Summary"
          value={resume.summary || ''}
          onChange={(value) => updateField('summary', value)}
          sectionName="summary"
          jobRole={jobRole}
          rows={4}
          placeholder="A concise summary that connects your experience to the role…"
        />
      </Section>

      <Section title="Skills" description="Comma-separated">
        <Textarea
          rows={3}
          value={(resume.skills || []).join(', ')}
          onChange={(event) =>
            updateField(
              'skills',
              event.target.value
                .split(',')
                .map((skill) => skill.trim())
                .filter(Boolean)
            )
          }
          className="resize-none"
          placeholder="React, Node.js, Python, SQL, Docker…"
        />
      </Section>

      <Section title="Experience" description={`${(resume.experience || []).length} entries`}>
        {(resume.experience || []).map((item, index) => (
          <div key={index} className="relative rounded-lg border border-border bg-subtle p-3">
            <button
              type="button"
              onClick={() => removeItem('experience', index)}
              className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-danger"
              aria-label="Remove experience"
            >
              <Trash2 size={13} />
            </button>
            <FieldGrid
              fields={[
                ['Company', 'company', true],
                ['Role', 'role', true],
                ['Start', 'start_date'],
                ['End', 'end_date'],
              ]}
              value={item}
              onChange={(key, value) => updateItem('experience', index, key, value)}
            />
            <div className="mt-2">
              <ImprovableTextarea
                label="Description"
                value={item.description || ''}
                onChange={(value) => updateItem('experience', index, 'description', value)}
                sectionName="experience"
                jobRole={jobRole}
                rows={3}
                placeholder={'• Led a team of 5 engineers to deliver…\n• Improved performance by 40%…'}
              />
            </div>
          </div>
        ))}
        <Button
          onClick={() => addItem('experience', { company: '', role: '', start_date: '', end_date: '', description: '' })}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus size={13} /> Add experience
        </Button>
      </Section>

      <Section title="Projects" description={`${(resume.projects || []).length} entries`}>
        {(resume.projects || []).map((item, index) => (
          <div key={index} className="relative rounded-lg border border-border bg-subtle p-3">
            <button
              type="button"
              onClick={() => removeItem('projects', index)}
              className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-danger"
              aria-label="Remove project"
            >
              <Trash2 size={13} />
            </button>
            <FieldGrid
              fields={[
                ['Name', 'name', true],
                ['Tech stack', 'tech_stack', true],
                ['Link', 'link', true],
              ]}
              value={item}
              onChange={(key, value) => updateItem('projects', index, key, value)}
            />
            <div className="mt-2">
              <ImprovableTextarea
                label="Description"
                value={item.description || ''}
                onChange={(value) => updateItem('projects', index, 'description', value)}
                sectionName="project"
                jobRole={jobRole}
                rows={2}
                placeholder="Built a full-stack app that…"
              />
            </div>
          </div>
        ))}
        <Button
          onClick={() => addItem('projects', { name: '', description: '', tech_stack: '', link: '' })}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus size={13} /> Add project
        </Button>
      </Section>

      <Section title="Education" description={`${(resume.education || []).length} entries`}>
        {(resume.education || []).map((item, index) => (
          <div key={index} className="relative rounded-lg border border-border bg-subtle p-3">
            <button
              type="button"
              onClick={() => removeItem('education', index)}
              className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-danger"
              aria-label="Remove education"
            >
              <Trash2 size={13} />
            </button>
            <FieldGrid
              fields={[
                ['Institution', 'institution', true],
                ['Degree', 'degree'],
                ['Field', 'field'],
                ['Year', 'year'],
                ['GPA', 'gpa'],
              ]}
              value={item}
              onChange={(key, value) => updateItem('education', index, key, value)}
            />
          </div>
        ))}
        <Button
          onClick={() => addItem('education', { institution: '', degree: '', field: '', year: '', gpa: '' })}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus size={13} /> Add education
        </Button>
      </Section>

      <Section title="Certifications" description={`${(resume.certifications || []).length} entries`}>
        {(resume.certifications || []).map((item, index) => (
          <div key={index} className="relative rounded-lg border border-border bg-subtle p-3">
            <button
              type="button"
              onClick={() => removeItem('certifications', index)}
              className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-danger"
              aria-label="Remove certification"
            >
              <Trash2 size={13} />
            </button>
            <FieldGrid
              fields={[
                ['Name', 'name', true],
                ['Issuer', 'issuer'],
                ['Year', 'year'],
              ]}
              value={item}
              onChange={(key, value) => updateItem('certifications', index, key, value)}
            />
          </div>
        ))}
        <Button
          onClick={() => addItem('certifications', { name: '', issuer: '', year: '' })}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Plus size={13} /> Add certification
        </Button>
      </Section>
    </div>
  );
}
