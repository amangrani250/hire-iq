import { useNavigate } from 'react-router-dom'
import { FileText, Trash2, ExternalLink, PlusCircle } from 'lucide-react'
import { useResume } from '../context/ResumeContext'
import toast from 'react-hot-toast'

export default function SavedPage() {
  const { savedResumes, loadResume, deleteResume } = useResume()
  const navigate = useNavigate()

  const handleLoad = (saved) => {
    loadResume(saved)
    toast.success('Resume loaded!')
    navigate('/builder')
  }

  const handleDelete = (id) => {
    if (confirm('Delete this resume?')) {
      deleteResume(id)
      toast.success('Deleted')
    }
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-16 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Resumes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Stored locally in your browser</p>
        </div>
        <button onClick={() => navigate('/builder')} className="btn-primary text-sm">
          <PlusCircle size={16} /> New Resume
        </button>
      </div>

      {savedResumes.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No saved resumes yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Build and save your first resume to see it here.</p>
          <button onClick={() => navigate('/builder')} className="btn-primary text-sm mx-auto">
            Start Building
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {savedResumes.map(saved => (
            <div key={saved.id} className="card p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{saved.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {saved.template} template · {new Date(saved.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleLoad(saved)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <ExternalLink size={12} /> Load
                </button>
                <button
                  onClick={() => handleDelete(saved.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
