import { Mic, MicOff } from 'lucide-react'

export default function VoiceButton({ listening, supported, onToggle, className = '' }) {
  if (!supported) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      title={listening ? 'Stop recording' : 'Start voice input'}
      className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
        listening
          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
      } ${className}`}
    >
      {listening ? <MicOff size={18} /> : <Mic size={18} />}
      {listening && (
        <span className="absolute inset-0 rounded-xl animate-ping bg-red-400 opacity-30" />
      )}
    </button>
  )
}
