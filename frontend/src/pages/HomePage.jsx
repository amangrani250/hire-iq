import { Link } from 'react-router-dom'
import { Wand2, Mic, FileDown, Zap, ShieldCheck, Layout } from 'lucide-react'

const features = [
  { icon: Wand2, title: 'AI-Powered Generation', desc: 'Describe yourself in plain text or voice — AI structures your perfect resume instantly.' },
  { icon: Mic, title: 'Voice Input', desc: 'Speak naturally using your microphone. Your words become a polished, professional resume.' },
  { icon: Layout, title: '3 Premium Templates', desc: 'Minimal, Corporate, and Creative designs. Switch live and see the change instantly.' },
  { icon: ShieldCheck, title: 'ATS Optimized', desc: 'Score your resume for ATS compatibility and get smart keyword suggestions.' },
  { icon: Zap, title: 'Real-time Preview', desc: 'Watch your resume update as you type with a beautiful side-by-side editor.' },
  { icon: FileDown, title: 'Export as PDF', desc: 'Download a pixel-perfect PDF resume ready to send to employers.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-24 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 text-brand-600 dark:text-brand-400 text-xs font-medium mb-8 animate-fade-in">
          <Zap size={12} /> AI-Powered · ATS-Friendly · Free to Try
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6 animate-slide-up">
          Build Your Resume<br />
          <span className="text-brand-600">in Minutes</span>
        </h1>

        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up">
          Describe your background in plain text or speak using your mic.
          Our AI generates a professional, ATS-ready resume instantly.
        </p>

        <div className="flex items-center justify-center gap-4 animate-slide-up">
          <Link to="/builder" className="btn-primary text-base px-8 py-3">
            <Wand2 size={18} /> Start Building Free
          </Link>
          <Link to="/saved" className="btn-secondary text-base px-8 py-3">
            View Saved
          </Link>
        </div>

        {/* Preview mockup */}
        <div className="mt-20 relative mx-auto max-w-3xl">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-gray-400">ResumeAI — Builder</span>
            </div>
            <div className="grid grid-cols-2 h-64">
              <div className="border-r border-gray-100 dark:border-gray-800 p-4 space-y-3">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-3/4" />
                <div className="h-2 bg-gray-50 dark:bg-gray-700 rounded w-full" />
                <div className="h-2 bg-gray-50 dark:bg-gray-700 rounded w-5/6" />
                <div className="h-2 bg-gray-50 dark:bg-gray-700 rounded w-full" />
                <div className="h-8 bg-brand-600 rounded-xl mt-4 flex items-center justify-center">
                  <div className="w-24 h-2 bg-white/40 rounded" />
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-900 dark:bg-gray-100 rounded w-1/2" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-4/5" />
                <div className="flex gap-1 mt-3 flex-wrap">
                  {[40, 56, 44, 52].map((w, i) => (
                    <div key={i} className="h-4 bg-gray-100 dark:bg-gray-800 rounded" style={{ width: w }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">Everything you need</h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-14 max-w-xl mx-auto">
            A complete toolkit for building professional resumes, powered by AI.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:shadow-md transition-shadow duration-200">
                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to land your dream job?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Create a professional resume in under 5 minutes.</p>
        <Link to="/builder" className="btn-primary text-base px-8 py-3">
          <Wand2 size={18} /> Build My Resume Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8 text-center">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} ResumeAI. Built with React 18 + FastAPI.
        </p>
      </footer>
    </div>
  )
}
