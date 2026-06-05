import { Download, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { downloadCertificatePdf } from '../utils/generateCertificatePdf';

import { Button } from './Button';

import type { Certificate } from '../types';

export interface CertificateViewProps {
  certificate: Certificate;
  onClose: () => void;
}

const formatDateCaps = (d: Date): string =>
  d
    .toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();

const BRAND_RED = '#b41e23';
const GOLD = '#b48e3c';
const INK = '#282828';
const MUTED = '#787878';
const CREAM = '#faf5ed';

export const CertificateView: React.FC<CertificateViewProps> = ({ certificate, onClose }) => {
  const [downloading, setDownloading] = useState(false);

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate preview"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 cursor-default"
        onClick={onClose}
        aria-label="Close certificate preview"
      />
      <div className="relative w-full max-w-4xl md:max-w-5xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto rounded-lg">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-2 rounded-full bg-white/95 hover:bg-white text-gray-900 shadow-lg transition-all active:scale-95"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div
          className="relative aspect-[297/210] w-full rounded-lg shadow-2xl overflow-hidden"
          style={{ background: CREAM, fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
        >
          {/* Outer red frame */}
          <div
            className="absolute pointer-events-none"
            style={{ inset: '2%', border: `1px solid ${BRAND_RED}` }}
          />

          {/* L-bracket corners */}
          <LBracket position="tl" />
          <LBracket position="tr" />
          <LBracket position="bl" />
          <LBracket position="br" />

          {/* CERTIFICATE title — y=44mm ≈ 21% */}
          <div
            className="absolute w-full text-center"
            style={{
              top: '17%',
              color: INK,
              fontSize: 'clamp(24px, 3.8vw, 46px)',
              letterSpacing: '0.15em',
              fontWeight: 400,
            }}
          >
            CERTIFICATE
          </div>

          {/* OF COMPLETION with side rules — y=55mm ≈ 26.2% */}
          <SubtitleWithRules top="26%" />

          {/* Small diamond ornament — y=61mm ≈ 29% */}
          <Diamond top="28%" size={6} />

          {/* THIS IS TO CERTIFY THAT — y=75mm ≈ 35.7% */}
          <div
            className="absolute w-full text-center"
            style={{
              top: '34%',
              color: MUTED,
              fontSize: 'clamp(9px, 1.1vw, 13px)',
              letterSpacing: '0.3em',
            }}
          >
            THIS IS TO CERTIFY THAT
          </div>

          {/* Student name — y=95mm ≈ 45.2% */}
          <div
            className="absolute w-full text-center"
            style={{
              top: '41%',
              color: BRAND_RED,
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.9vw, 60px)',
              fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif',
            }}
          >
            {certificate.studentName || 'Student'}
          </div>

          {/* Gold rule + diamond under name — y=104mm ≈ 49.5% */}
          <RuleWithDiamond top="52%" halfWidth="32%" />

          {/* HAS SUCCESSFULLY COMPLETED THE COURSE — y=115mm ≈ 54.8% */}
          <div
            className="absolute w-full text-center"
            style={{
              top: '57%',
              color: MUTED,
              fontSize: 'clamp(9px, 1.1vw, 13px)',
              letterSpacing: '0.25em',
            }}
          >
            HAS SUCCESSFULLY COMPLETED THE COURSE
          </div>

          {/* Course title — y=129mm ≈ 61.4% */}
          <div
            className="absolute w-full text-center px-[16%]"
            style={{
              top: '62%',
              color: INK,
              fontWeight: 700,
              fontSize: 'clamp(14px, 2.4vw, 28px)',
              lineHeight: 1.2,
            }}
          >
            {certificate.courseTitle || 'Course'}
          </div>

          {/* Rich ornament above seal — y=139mm ≈ 66% */}
          <RichRuleOrnament top="69%" halfWidth="13%" />

          {/* Footer band — signature | seal | date */}
          <div
            className="absolute"
            style={{ top: '74%', left: 0, right: 0, height: '17%' }}
          >
            {/* Signature column (left, cx=60mm ≈ 20.2%) */}
            <FooterColumn
              centerPct="20.2%"
              imageSrc="/signature-eyebuckz.png"
              imageFallback="EyeBuckz"
              caption="EYEBUCKZ"
              subCaption="ISSUED BY"
            />

            {/* Seal (center) */}
            <Seal centerPct="50%" topPct="-22%" />

            {/* Date column (right, cx=237mm ≈ 79.8%) */}
            <FooterColumn
              centerPct="79.8%"
              text={formatDateCaps(certificate.issueDate)}
              caption="DATE OF ISSUE"
            />
          </div>

          {/* Certificate number — bottom center */}
          <div
            className="absolute w-full text-center"
            style={{
              bottom: '7.5%',
              color: BRAND_RED,
              fontWeight: 700,
              fontSize: 'clamp(7px, 0.85vw, 10px)',
              letterSpacing: '0.25em',
            }}
          >
            CERTIFICATE NO.
          </div>
          <div
            className="absolute w-full text-center"
            style={{
              bottom: '4.5%',
              color: BRAND_RED,
              fontSize: 'clamp(7px, 0.85vw, 10px)',
              letterSpacing: '0.1em',
            }}
          >
            {certificate.certificateNumber}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
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

const LBracket: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br' }> = ({ position }) => {
  const isRight = position.includes('r');
  const isBottom = position.includes('b');
  const style: React.CSSProperties = {
    position: 'absolute',
    width: '8%',
    height: '11%',
    [isBottom ? 'bottom' : 'top']: '4%',
    [isRight ? 'right' : 'left']: '3%',
    transform: `scale(${isRight ? -1 : 1}, ${isBottom ? -1 : 1})`,
  };
  return (
    <svg viewBox="0 0 100 100" style={style} aria-hidden>
      <g stroke={GOLD} fill="none">
        <g strokeWidth="2.5">
          <line x1="0" y1="0" x2="100" y2="0" />
          <line x1="0" y1="0" x2="0" y2="100" />
        </g>
        <g strokeWidth="1.2">
          <line x1="14" y1="14" x2="82" y2="14" />
          <line x1="14" y1="14" x2="14" y2="82" />
        </g>
      </g>
      <circle cx="14" cy="14" r="3" fill={BRAND_RED} />
    </svg>
  );
};

const SubtitleWithRules: React.FC<{ top: string }> = ({ top }) => (
  <div
    className="absolute w-full flex items-center justify-center"
    style={{ top, gap: '2%' }}
  >
    <div style={{ width: '22%', height: '1px', background: GOLD, opacity: 0.7 }} />
    <div
      style={{
        color: BRAND_RED,
        fontSize: 'clamp(10px, 1.4vw, 16px)',
        letterSpacing: '0.4em',
        whiteSpace: 'nowrap',
      }}
    >
      OF COMPLETION
    </div>
    <div style={{ width: '22%', height: '1px', background: GOLD, opacity: 0.7 }} />
  </div>
);

const Diamond: React.FC<{ top: string; size: number }> = ({ top, size }) => (
  <div
    className="absolute left-1/2"
    style={{ top, transform: 'translateX(-50%)' }}
  >
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden>
      <polygon points="5,0 10,5 5,10 0,5" fill={GOLD} />
    </svg>
  </div>
);

const RuleWithDiamond: React.FC<{ top: string; halfWidth: string }> = ({ top, halfWidth }) => (
  <div
    className="absolute w-full flex items-center justify-center"
    style={{ top, gap: '1.5%' }}
  >
    <div style={{ width: halfWidth, height: '1px', background: GOLD, opacity: 0.7 }} />
    <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden>
      <polygon points="5,0 10,5 5,10 0,5" fill={GOLD} />
    </svg>
    <div style={{ width: halfWidth, height: '1px', background: GOLD, opacity: 0.7 }} />
  </div>
);

const RichRuleOrnament: React.FC<{ top: string; halfWidth: string }> = ({ top, halfWidth }) => (
  <div
    className="absolute w-full flex items-center justify-center"
    style={{ top, gap: '0.6%' }}
  >
    <div style={{ width: halfWidth, height: '1px', background: GOLD, opacity: 0.7 }} />
    <div style={{ width: '1.4%', height: '0px', borderTop: `1.5px solid ${GOLD}`, opacity: 0.85 }} />
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden style={{ margin: '0 4px' }}>
      <polygon points="5,0 10,5 5,10 0,5" fill={GOLD} />
    </svg>
    <div style={{ width: '1.4%', height: '0px', borderTop: `1.5px solid ${GOLD}`, opacity: 0.85 }} />
    <div style={{ width: halfWidth, height: '1px', background: GOLD, opacity: 0.7 }} />
  </div>
);

const Seal: React.FC<{ centerPct: string; topPct: string }> = ({ centerPct, topPct }) => (
  <div
    className="absolute"
    style={{
      left: centerPct,
      top: topPct,
      transform: 'translateX(-50%)',
      width: 'clamp(70px, 9.5vw, 120px)',
      aspectRatio: '1',
    }}
  >
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
      <defs>
        <mask id="circular-mask">
          <circle cx="50" cy="50" r="40" fill="white" />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke={GOLD} strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill={BRAND_RED} />
    </svg>
    <img
      src="/logo_new.png"
      alt=""
      aria-hidden
      className="absolute"
      style={{
        top: '20%',
        left: '20%',
        width: '60%',
        height: '60%',
        objectFit: 'cover',
        borderRadius: '50%',
      }}
    />
  </div>
);

interface FooterColumnProps {
  centerPct: string;
  text?: string;
  imageSrc?: string;
  imageFallback?: string;
  caption: string;
  subCaption?: string;
}

const FooterColumn: React.FC<FooterColumnProps> = ({
  centerPct,
  text,
  imageSrc,
  imageFallback,
  caption,
  subCaption,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const isSignature = imageSrc === '/signature-eyebuckz.png';

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: centerPct,
        top: '0%',
        transform: 'translateX(-50%)',
        width: 'clamp(110px, 18vw, 220px)',
      }}
    >
      <div
        className="flex items-end justify-center rounded-md transition-colors"
        style={{
          height: 'clamp(20px, 4vw, 50px)',
          backgroundColor: isSignature && !imgFailed ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
          padding: isSignature && !imgFailed ? '4px 6px' : '0',
        }}
      >
        {imageSrc && !imgFailed ? (
          <img
            src={imageSrc}
            alt=""
            aria-hidden
            onError={() => setImgFailed(true)}
            style={{ maxHeight: '100%', maxWidth: '90%', objectFit: 'contain' }}
          />
        ) : imageFallback ? (
          <span
            style={{
              color: INK,
              fontStyle: 'italic',
              fontSize: 'clamp(14px, 2vw, 24px)',
              fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
            }}
          >
            {imageFallback}
          </span>
        ) : (
          <span
            style={{
              color: BRAND_RED,
              fontWeight: 700,
              fontSize: 'clamp(9px, 1.2vw, 13px)',
              letterSpacing: '0.2em',
            }}
          >
            {text}
          </span>
        )}
      </div>
      <div style={{ width: '70%', height: '1px', background: GOLD, opacity: 0.7, marginTop: 4 }} />
      <div
        style={{
          color: BRAND_RED,
          fontWeight: 700,
          fontSize: 'clamp(7px, 0.95vw, 11px)',
          letterSpacing: '0.25em',
          marginTop: 6,
        }}
      >
        {caption}
      </div>
      {subCaption && (
        <div
          style={{
            color: BRAND_RED,
            fontSize: 'clamp(6px, 0.8vw, 9px)',
            letterSpacing: '0.2em',
            marginTop: 2,
          }}
        >
          {subCaption}
        </div>
      )}
    </div>
  );
};
