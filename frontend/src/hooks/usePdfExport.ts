import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

interface UsePdfExportReturn {
  exportPdf: (elementId: string, filename?: string) => Promise<void>;
  exporting: boolean;
}

export function usePdfExport(): UsePdfExportReturn {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async (elementId: string, filename: string = 'resume.pdf') => {
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = document.getElementById(elementId);
      if (!el) throw new Error('Preview element not found');

      await html2pdf()
        .set({
          margin: [0, 0, 0, 0],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save();
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('The PDF could not be generated. Please try again.');
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportPdf, exporting };
}
