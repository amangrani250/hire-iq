import { useState, useRef, useCallback } from 'react'

export function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  const recRef = useRef(null)

  const start = useCallback(() => {
    if (!supported) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    let finalTranscript = ''

    rec.onstart = () => setListening(true)

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      onResult(finalTranscript + interim, false)
    }

    rec.onend = () => {
      setListening(false)
      if (finalTranscript) onResult(finalTranscript.trim(), true)
    }

    rec.onerror = () => setListening(false)

    recRef.current = rec
    rec.start()
  }, [supported, onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, supported, start, stop, toggle: listening ? stop : start }
}
