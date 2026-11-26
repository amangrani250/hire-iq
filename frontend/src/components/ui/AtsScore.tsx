import { useResumeMeta } from '../../contexts/ResumeContext';

function toneFor(score: number) {
  if (score >= 80) return { color: 'var(--color-success)', label: 'Excellent' };
  if (score >= 60) return { color: 'var(--color-warning)', label: 'Good' };
  return { color: 'var(--color-danger)', label: 'Needs work' };
}

export default function AtsScore() {
  const { atsScore, suggestions } = useResumeMeta();

  if (!atsScore) return null;

  const tone = toneFor(atsScore);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dash = (atsScore / 100) * circumference;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="section-label mb-0">ATS readiness</p>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: tone.color }}>
          {tone.label}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              strokeWidth="4"
              stroke={tone.color}
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums"
            style={{ color: tone.color }}
          >
            {atsScore}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {suggestions?.length > 0 ? (
            <ul className="space-y-1">
              {suggestions.slice(0, 2).map((suggestion, index) => (
                <li
                  key={index}
                  className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground"
                >
                  — {suggestion}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Scores update when you generate or improve a section.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
