import { useResume } from '../../context/ResumeContext'

export default function AtsScore() {
  const { atsScore, suggestions } = useResume()

  const color = atsScore >= 80 ? 'text-green-600 dark:text-green-400'
    : atsScore >= 60 ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-500 dark:text-red-400'

  const ring = atsScore >= 80 ? 'stroke-green-500'
    : atsScore >= 60 ? 'stroke-yellow-500'
    : 'stroke-red-500'

  const r = 22
  const circ = 2 * Math.PI * r
  const dash = (atsScore / 100) * circ

  if (!atsScore) return null

  return (
    <div className="card p-4">
      <p className="section-label">ATS Score</p>
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 52 52" className="w-full h-full -rotate-90">
            <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100 dark:text-gray-800" />
            <circle
              cx="26" cy="26" r={r} fill="none" strokeWidth="4"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              className={ring}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-semibold ${color}`}>
            {atsScore}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${color}`}>
            {atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Good' : 'Needs Work'}
          </p>
          {suggestions?.length > 0 && (
            <ul className="mt-1 space-y-1">
              {suggestions.slice(0, 2).map((s, i) => (
                <li key={i} className="text-xs text-gray-500 dark:text-gray-400 truncate">• {s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
