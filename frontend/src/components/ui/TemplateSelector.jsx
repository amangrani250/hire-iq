import { useResume } from '../../context/ResumeContext'

const TEMPLATES = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean & simple' },
  { id: 'corporate', label: 'Corporate', desc: 'Classic & formal' },
  { id: 'creative', label: 'Creative', desc: 'Bold & modern' },
]

export default function TemplateSelector() {
  const { template, setTemplate } = useResume()

  return (
    <div>
      <p className="section-label">Template</p>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id)}
            className={`p-3 rounded-xl border text-left transition-all duration-150 ${
              template === t.id
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className={`w-full h-8 rounded mb-2 flex flex-col justify-center gap-1 px-1 overflow-hidden ${
              t.id === 'minimal' ? 'bg-gray-100 dark:bg-gray-800' :
              t.id === 'corporate' ? 'bg-blue-50 dark:bg-blue-950' :
              'bg-purple-50 dark:bg-purple-950'
            }`}>
              <div className={`h-1 rounded-full w-3/4 ${t.id === 'creative' ? 'bg-purple-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <div className={`h-0.5 rounded-full w-1/2 ${t.id === 'creative' ? 'bg-purple-300' : 'bg-gray-200 dark:bg-gray-700'}`} />
            </div>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{t.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
