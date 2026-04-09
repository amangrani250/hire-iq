import { useCallback, useState } from 'react'

export function usePdfExport() {
  const [exporting, setExporting] = useState(false)

  const exportPdf = useCallback(async (elementId, filename = 'resume.pdf') => {
    setExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const el = document.getElementById(elementId)
      if (!el) throw new Error('Preview element not found')

      await html2pdf()
        .set({
          margin: [0, 0, 0, 0],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save()
    } finally {
      setExporting(false)
    }
  }, [])

  return { exportPdf, exporting }
}
