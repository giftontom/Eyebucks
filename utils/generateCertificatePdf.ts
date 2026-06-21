import { jsPDF } from 'jspdf';

import type { Certificate } from '../types';

const BRAND_RED: [number, number, number] = [180, 30, 35];
const GOLD: [number, number, number] = [180, 142, 60];
const INK: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [120, 120, 120];

const PAGE_W = 297;
const PAGE_H = 210;

interface ImageTransform {
  /** Invert RGB channels (legacy option, retained for compatibility). */
  invert?: boolean;
  /** Map a near-white background to transparent with a feathered edge. */
  knockoutWhite?: boolean;
  /** Clip to a centered circle so square/rounded-rect corners drop out. */
  circleCrop?: boolean;
  /** Pre-screen blend against this RGB color so dark bg becomes invisible on that color. */
  screenColor?: [number, number, number];
}

async function loadImageAsDataUrl(
  src: string,
  transform: ImageTransform = {},
): Promise<string> {
  const { invert = false, knockoutWhite = false, circleCrop = false, screenColor } =
    transform;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {return reject(new Error('Canvas 2D context unavailable'));}
      ctx.drawImage(img, 0, 0);

      if (invert || knockoutWhite || screenColor) {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        // Feather thresholds for white knockout: pixels at/below LO stay fully
        // opaque (ink), at/above HI go fully transparent (paper), linear between.
        const LO = 200;
        const HI = 248;
        const [sr = 0, sg = 0, sb = 0] = screenColor ?? [];
        for (let i = 0; i < px.length; i += 4) {
          if (screenColor) {
            // Screen blend: result = 1 - (1 - A) * (1 - B)
            px[i] = Math.round((1 - (1 - px[i] / 255) * (1 - sr / 255)) * 255);
            px[i + 1] = Math.round((1 - (1 - px[i + 1] / 255) * (1 - sg / 255)) * 255);
            px[i + 2] = Math.round((1 - (1 - px[i + 2] / 255) * (1 - sb / 255)) * 255);
          }
          if (invert) {
            px[i] = 255 - px[i];
            px[i + 1] = 255 - px[i + 1];
            px[i + 2] = 255 - px[i + 2];
          }
          if (knockoutWhite) {
            const minC = Math.min(px[i], px[i + 1], px[i + 2]);
            if (minC >= HI) {
              px[i + 3] = 0;
            } else if (minC > LO) {
              px[i + 3] = Math.round((255 * (HI - minC)) / (HI - LO));
            }
          }
        }
        ctx.putImageData(data, 0, 0);
      }

      if (circleCrop) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(
          canvas.width / 2,
          canvas.height / 2,
          Math.min(canvas.width, canvas.height) / 2,
          0,
          Math.PI * 2,
        );
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

interface BrandAssets {
  icon: string;
  signature: string | null;
}

let cachedAssets: BrandAssets | null = null;

async function getBrandAssets(): Promise<BrandAssets> {
  if (cachedAssets) {return cachedAssets;}
  const [icon, signature] = await Promise.all([
    // Pre-baked transparent white "b" mark — no screen blend, so the seal red stays accurate.
    loadImageAsDataUrl('/logo_mark_white.png'),
    // Signature PNG now ships with a transparent background; knockoutWhite kept as a safety net.
    loadImageAsDataUrl('/signature-eyebuckz.png?v=2', { knockoutWhite: true }).catch(
      () => null,
    ),
  ]);
  cachedAssets = { icon, signature };
  return cachedAssets;
}

function drawOuterRedFrame(doc: jsPDF) {
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(0.6);
  doc.rect(6, 6, PAGE_W - 12, PAGE_H - 12);
}

function drawLBracketCorner(
  doc: jsPDF,
  x: number,
  y: number,
  dirX: 1 | -1,
  dirY: 1 | -1,
) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  const armLen = 22;
  doc.line(x, y, x + armLen * dirX, y);
  doc.line(x, y, x, y + armLen * dirY);

  doc.setLineWidth(0.3);
  const inset = 3;
  doc.line(
    x + inset * dirX,
    y + inset * dirY,
    x + (armLen - 4) * dirX,
    y + inset * dirY,
  );
  doc.line(
    x + inset * dirX,
    y + inset * dirY,
    x + inset * dirX,
    y + (armLen - 4) * dirY,
  );

  doc.setFillColor(...BRAND_RED);
  doc.circle(x + inset * dirX, y + inset * dirY, 0.9, 'F');
}

function drawDiamond(doc: jsPDF, cx: number, cy: number, size: number) {
  doc.setFillColor(...GOLD);
  doc.lines(
    [
      [size, size],
      [-size, size],
      [-size, -size],
      [size, -size],
    ],
    cx,
    cy - size,
    [1, 1],
    'F',
    true,
  );
}

function drawRuleWithDiamond(doc: jsPDF, y: number, halfRuleLen: number) {
  const cx = PAGE_W / 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(cx - halfRuleLen, y, cx - 4, y);
  doc.line(cx + 4, y, cx + halfRuleLen, y);
  drawDiamond(doc, cx, y, 1.4);
}

function drawRichRuleOrnament(doc: jsPDF, y: number, halfRuleLen: number) {
  const cx = PAGE_W / 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  // Long outer rules with gap for ornament
  doc.line(cx - halfRuleLen, y, cx - 10, y);
  doc.line(cx + 10, y, cx + halfRuleLen, y);
  // Inner short flanking dashes
  doc.setLineWidth(0.4);
  doc.line(cx - 7, y, cx - 4, y);
  doc.line(cx + 4, y, cx + 7, y);
  // Central diamond
  drawDiamond(doc, cx, y, 1.6);
}

function drawSeal(doc: jsPDF, cx: number, cy: number, iconDataUrl: string) {
  // Gold outer ring
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.circle(cx, cy, 13);

  // Red fill circle
  doc.setFillColor(...BRAND_RED);
  doc.circle(cx, cy, 11, 'F');

  // Brand "b" mark — transparent white PNG centred on the red disc (matches on-screen seal)
  doc.addImage(iconDataUrl, 'PNG', cx - 6.75, cy - 6.75, 13.5, 13.5);
}

function drawSubtitleWithRules(doc: jsPDF, y: number) {
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_RED);
  const text = 'OF COMPLETION';
  const textWidth = doc.getTextWidth(text) + 14;
  const halfText = textWidth / 2;
  const cx = PAGE_W / 2;
  const ruleStart = 65;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(ruleStart, y, cx - halfText, y);
  doc.line(cx + halfText, y, PAGE_W - ruleStart, y);

  doc.text(text, cx, y + 1.5, { align: 'center', charSpace: 2.5 });
}

function drawFooterColumn(
  doc: jsPDF,
  cx: number,
  baselineY: number,
  topText: string,
  caption: string,
  subCaption?: string,
) {
  doc.setTextColor(...BRAND_RED);
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(topText, cx, baselineY, { align: 'center', charSpace: 1.5 });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(cx - 28, baselineY + 2, cx + 28, baselineY + 2);

  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.text(caption, cx, baselineY + 7, { align: 'center', charSpace: 1.5 });

  if (subCaption) {
    doc.setFont('times', 'normal');
    doc.setFontSize(7);
    doc.text(subCaption, cx, baselineY + 11, { align: 'center', charSpace: 1.2 });
  }
}

function formatDateCaps(d: Date): string {
  return d
    .toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();
}

export async function buildCertificatePdf(cert: Certificate): Promise<jsPDF> {
  const { icon, signature } = await getBrandAssets();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFillColor(250, 245, 237);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  drawOuterRedFrame(doc);

  drawLBracketCorner(doc, 12, 12, 1, 1);
  drawLBracketCorner(doc, PAGE_W - 12, 12, -1, 1);
  drawLBracketCorner(doc, 12, PAGE_H - 12, 1, -1);
  drawLBracketCorner(doc, PAGE_W - 12, PAGE_H - 12, -1, -1);

  doc.setTextColor(...INK);
  doc.setFont('times', 'normal');
  doc.setFontSize(48);
  doc.text('CERTIFICATE', PAGE_W / 2, 44, { align: 'center', charSpace: 6 });

  drawSubtitleWithRules(doc, 55);
  drawDiamond(doc, PAGE_W / 2, 61, 1.2);

  doc.setTextColor(...MUTED);
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text('THIS IS TO CERTIFY THAT', PAGE_W / 2, 75, {
    align: 'center',
    charSpace: 3,
  });

  doc.setTextColor(...BRAND_RED);
  doc.setFont('times', 'bold');
  doc.setFontSize(40);
  doc.text(cert.studentName || 'Student', PAGE_W / 2, 95, { align: 'center' });

  drawRuleWithDiamond(doc, 104, 95);

  doc.setTextColor(...MUTED);
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text('HAS SUCCESSFULLY COMPLETED THE COURSE', PAGE_W / 2, 115, {
    align: 'center',
    charSpace: 2.5,
  });

  doc.setTextColor(...INK);
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  const courseTitle = cert.courseTitle || 'Course';
  const titleLines = doc.splitTextToSize(courseTitle, PAGE_W - 100);
  doc.text(titleLines, PAGE_W / 2, 129, { align: 'center' });

  drawRichRuleOrnament(doc, 139, 38);

  const sealCx = PAGE_W / 2;
  const sealCy = 162;
  drawSeal(doc, sealCx, sealCy, icon);

  const leftCx = 60;
  const rightCx = PAGE_W - 60;
  const footerBaseline = 162;

  if (signature) {
    const sigW = 36;
    const sigH = 14;
    doc.addImage(
      signature,
      'PNG',
      leftCx - sigW / 2,
      footerBaseline - sigH + 1,
      sigW,
      sigH,
    );
  } else {
    doc.setTextColor(...INK);
    doc.setFont('times', 'italic');
    doc.setFontSize(18);
    doc.text('EyeBuckz', leftCx, footerBaseline, { align: 'center' });
  }
  drawFooterColumn(doc, leftCx, footerBaseline, '', 'EYEBUCKZ', 'ISSUED BY');

  drawFooterColumn(
    doc,
    rightCx,
    footerBaseline,
    formatDateCaps(cert.issueDate),
    'DATE OF ISSUE',
  );

  doc.setTextColor(...BRAND_RED);
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('CERTIFICATE NO.', PAGE_W / 2, PAGE_H - 19, {
    align: 'center',
    charSpace: 2,
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(cert.certificateNumber, PAGE_W / 2, PAGE_H - 14, {
    align: 'center',
    charSpace: 1,
  });

  return doc;
}

export async function downloadCertificatePdf(cert: Certificate): Promise<void> {
  const doc = await buildCertificatePdf(cert);
  const safeName = (cert.studentName || 'student').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const safeCourse = (cert.courseTitle || 'course').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  doc.save(`eyebuckz_certificate_${safeName}_${safeCourse}.pdf`);
}

export async function certificatePdfBlobUrl(cert: Certificate): Promise<string> {
  const doc = await buildCertificatePdf(cert);
  return doc.output('bloburl').toString();
}
