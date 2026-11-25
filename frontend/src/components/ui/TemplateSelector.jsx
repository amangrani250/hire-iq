import { useResume } from '../../context/ResumeContext';
import { cn } from '../../lib/cn';

const TEMPLATES = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean, quiet, scannable' },
  { id: 'corporate', label: 'Corporate', desc: 'Formal, structured' },
  { id: 'creative', label: 'Creative', desc: 'Sidebar-led, expressive' },
];

function Thumbnail({ id }) {
  return (
    <div className="relative h-11 overflow-hidden rounded-md border border-[#e6e4dd] bg-white p-1.5">
      {id === 'minimal' && (
        <div className="space-y-1">
          <div className="h-1.5 w-8 rounded-full bg-[#1c2924]" />
          <div className="h-1 w-5 rounded-full bg-[#b9c3bd]" />
          <div className="pt-1">
            <div className="h-0.5 w-full rounded-full bg-[#e6e4dd]" />
            <div className="mt-0.5 h-0.5 w-4/5 rounded-full bg-[#e6e4dd]" />
          </div>
          <div className="h-1 w-6 rounded-full bg-[#1c2924]" />
          <div className="h-0.5 w-full rounded-full bg-[#e6e4dd]" />
        </div>
      )}
      {id === 'corporate' && (
        <div className="space-y-1">
          <div className="-mx-1.5 -mt-1.5 h-4 bg-[#135a4b]" />
          <div className="h-0.5 w-full rounded-full bg-[#ccd6d1]" />
          <div className="h-0.5 w-4/5 rounded-full bg-[#ccd6d1]" />
          <div className="h-1 w-6 rounded-full bg-[#135a4b]" />
          <div className="h-0.5 w-full rounded-full bg-[#e6e4dd]" />
        </div>
      )}
      {id === 'creative' && (
        <div className="flex h-full gap-1.5">
          <div className="-my-1.5 -ml-1.5 w-1/3 bg-[#1c2924]" />
          <div className="flex-1 space-y-1 py-0.5">
            <div className="h-1 w-7 rounded-full bg-[#1c2924]" />
            <div className="h-0.5 w-5 rounded-full bg-[#8fae9f]" />
            <div className="h-0.5 w-8 rounded-full bg-[#8fae9f]" />
            <div className="h-0.5 w-6 rounded-full bg-[#e6e4dd]" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplateSelector() {
  const { template, setTemplate } = useResume();

  return (
    <div>
      <p className="section-label">Template</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Resume template">
        {TEMPLATES.map((item) => {
          const selected = template === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTemplate(item.id)}
              className={cn(
                'rounded-lg border p-2 text-left transition-all',
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
              )}
            >
              <Thumbnail id={item.id} />
              <p className="mt-2 text-[11.5px] font-medium text-foreground">{item.label}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">{item.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
