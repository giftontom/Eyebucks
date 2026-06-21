import { Download, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { drawCertificateToCanvas, loadCertImage } from '../utils/drawCertificate';
import { downloadCertificatePdf } from '../utils/generateCertificatePdf';

import { Button } from './Button';

import type { Certificate } from '../types';

export interface CertificateViewProps {
  certificate: Certificate;
  onClose: () => void;
}

const CREAM = '#faf5ed';

export const CertificateView: React.FC<CertificateViewProps> = ({ certificate, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {onClose();}
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Paint the certificate onto a canvas. Because it is drawn pixels (not DOM text), the
  // on-screen certificate cannot be altered via DevTools. The PDF download is unchanged.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try { await document.fonts.ready; } catch { /* fonts optional */ }
      const [signature, logo] = await Promise.all([
        loadCertImage('/signature-eyebuckz.png?v=2'),
        loadCertImage('/logo_mark_white.png'),
      ]);
      if (cancelled || !canvasRef.current) {return;}
      drawCertificateToCanvas(canvasRef.current, certificate, { signature, logo });
    })();
    return () => { cancelled = true; };
  }, [certificate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCertificatePdf(certificate);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate preview"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 cursor-default"
        onClick={onClose}
        aria-label="Close certificate preview"
      />
      <div
        className="relative w-full max-w-4xl md:max-w-5xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: CREAM }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-2 rounded-full bg-white/95 hover:bg-white text-gray-900 shadow-lg transition-all active:scale-95"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="relative aspect-[297/210] w-full overflow-hidden" style={{ background: CREAM }}>
          <canvas
            ref={canvasRef}
            width={1485}
            height={1050}
            role="img"
            aria-label={`Certificate of completion for ${certificate.studentName} — ${certificate.courseTitle}`}
            className="block w-full h-full select-none"
          />
        </div>

        {/* Actions — attached footer on the cream mat, separated by a hairline gold rule */}
        <div
          className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-4 sm:px-6 py-4"
          style={{ borderTop: '1px solid rgba(180, 142, 60, 0.25)' }}
        >
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            loading={downloading}
            leftIcon={<Download size={16} />}
            className="w-full sm:w-auto"
          >
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
};
