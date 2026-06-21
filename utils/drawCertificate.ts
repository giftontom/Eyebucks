import type { Certificate } from '../types';

/**
 * Renders the completion certificate onto a 2D canvas. This is the on-screen preview:
 * drawing to a canvas (rather than live DOM) means the certificate has NO editable text
 * nodes, so it cannot be altered via DevTools. Pixel-for-pixel mirror of the previous
 * cqw HTML layout. The downloadable PDF (utils/generateCertificatePdf.ts) is the separate,
 * authoritative artifact and must be kept visually in sync with this.
 */

const RED = '#b41e23';
const GOLD = '#b48e3c';
const INK = '#282828';
const MUTED = '#787878';
const CREAM = '#faf5ed';

// Fixed high-res drawing buffer (aspect 297/210). Displayed scaled to the container.
const W = 1485;
const H = 1050;
const SERIF = 'Georgia, "Times New Roman", serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const X = (p: number): number => (p / 100) * W;
const Y = (p: number): number => (p / 100) * H;
const F = (cqw: number): number => (cqw / 100) * W; // cqw == % of width

export interface CertAssets {
  signature: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

export function loadCertImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const formatDateCaps = (d: Date): string =>
  d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();

interface TextOpts {
  weight?: string;
  family?: string;
  ls?: number; // letter-spacing in em
  baseline?: CanvasTextBaseline;
}

function setFont(ctx: CanvasRenderingContext2D, size: number, o: TextOpts): void {
  ctx.font = `${o.weight ?? '400'} ${size}px ${o.family ?? SERIF}`;
  ctx.letterSpacing = `${(o.ls ?? 0) * size}px`;
}

function centerText(ctx: CanvasRenderingContext2D, s: string, cx: number, y: number, size: number, color: string, o: TextOpts): void {
  setFont(ctx, size, o);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = o.baseline ?? 'top';
  ctx.fillText(s, cx, y);
  ctx.letterSpacing = '0px';
}

function widthOf(ctx: CanvasRenderingContext2D, s: string, size: number, o: TextOpts): number {
  setFont(ctx, size, o);
  const w = ctx.measureText(s).width;
  ctx.letterSpacing = '0px';
  return w;
}

function goldLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, lw = 1.5): void {
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

function bracket(ctx: CanvasRenderingContext2D, ox: number, oy: number, dx: number, dy: number): void {
  const bw = X(8);
  const bh = Y(11);
  ctx.strokeStyle = GOLD;
  ctx.lineCap = 'butt';
  ctx.lineWidth = 2.9;
  ctx.beginPath();
  ctx.moveTo(ox, oy); ctx.lineTo(ox + dx * bw, oy);
  ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + dy * bh);
  ctx.stroke();
  const ix = ox + dx * 0.14 * bw;
  const iy = oy + dy * 0.14 * bh;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(ix, iy); ctx.lineTo(ox + dx * 0.82 * bw, iy);
  ctx.moveTo(ix, iy); ctx.lineTo(ix, oy + dy * 0.82 * bh);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(ix, iy, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCertificateToCanvas(canvas: HTMLCanvasElement, cert: Certificate, assets: CertAssets): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) { return; }
  canvas.width = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  // Background + frame
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.strokeRect(X(2), Y(2), X(96), Y(96));

  // Corner brackets
  bracket(ctx, X(3), Y(4), 1, 1);
  bracket(ctx, W - X(3), Y(4), -1, 1);
  bracket(ctx, X(3), H - Y(4), 1, -1);
  bracket(ctx, W - X(3), H - Y(4), -1, -1);

  // Title
  centerText(ctx, 'CERTIFICATE', W / 2, Y(17), F(4.6), INK, { ls: 0.15 });

  // OF COMPLETION with side rules
  {
    const fs = F(1.6);
    const tw = widthOf(ctx, 'OF COMPLETION', fs, { ls: 0.4 });
    const ry = Y(26) + fs * 0.55;
    const gap = X(2);
    const rw = X(22);
    centerText(ctx, 'OF COMPLETION', W / 2, Y(26), fs, RED, { ls: 0.4 });
    goldLine(ctx, W / 2 - tw / 2 - gap - rw, W / 2 - tw / 2 - gap, ry);
    goldLine(ctx, W / 2 + tw / 2 + gap, W / 2 + tw / 2 + gap + rw, ry);
  }
  diamond(ctx, W / 2, Y(28) + F(0.6) * 0.5, F(0.6) * 0.5, GOLD);

  centerText(ctx, 'THIS IS TO CERTIFY THAT', W / 2, Y(34), F(1.3), MUTED, { ls: 0.3 });

  // Student name — shrink to fit
  {
    const name = cert.studentName || 'Student';
    const maxW = X(78);
    let fs = F(6);
    while (fs > F(3) && widthOf(ctx, name, fs, { weight: '700', family: PLAYFAIR }) > maxW) { fs -= 2; }
    centerText(ctx, name, W / 2, Y(41) + (F(6) - fs) * 0.5, fs, RED, { weight: '700', family: PLAYFAIR });
  }

  // Gold rule + diamond
  {
    const ry = Y(52) + F(0.7) * 0.5;
    const gap = X(1.5);
    const rw = X(32);
    goldLine(ctx, W / 2 - gap - rw, W / 2 - gap, ry);
    goldLine(ctx, W / 2 + gap, W / 2 + gap + rw, ry);
    diamond(ctx, W / 2, ry, F(0.7) * 0.5, GOLD);
  }

  centerText(ctx, 'HAS SUCCESSFULLY COMPLETED THE COURSE', W / 2, Y(57), F(1.3), MUTED, { ls: 0.25 });

  // Course title — fit to one or two lines
  {
    const course = cert.courseTitle || 'Course';
    const maxW = X(68);
    let fs = F(2.8);
    const opts: TextOpts = { weight: '700' };
    if (widthOf(ctx, course, fs, opts) <= maxW) {
      centerText(ctx, course, W / 2, Y(62), fs, INK, opts);
    } else {
      // wrap into two lines (greedy), shrinking until both fit
      const words = course.split(/\s+/);
      let line1 = '';
      let line2 = '';
      const wrap = (): void => {
        line1 = ''; line2 = '';
        for (const w of words) {
          const tryL1 = line1 ? `${line1} ${w}` : w;
          if (widthOf(ctx, tryL1, fs, opts) <= maxW && !line2) { line1 = tryL1; }
          else { line2 = line2 ? `${line2} ${w}` : w; }
        }
      };
      wrap();
      while (fs > F(1.6) && (widthOf(ctx, line1, fs, opts) > maxW || widthOf(ctx, line2, fs, opts) > maxW)) {
        fs -= 2; wrap();
      }
      const lh = fs * 1.2;
      centerText(ctx, line1, W / 2, Y(62) - lh * 0.5 + fs * 0.1, fs, INK, opts);
      if (line2) { centerText(ctx, line2, W / 2, Y(62) + lh * 0.5 + fs * 0.1, fs, INK, opts); }
    }
  }

  // Rich ornament above seal
  {
    const ry = Y(69) + F(0.9) * 0.5;
    const rw = X(13);
    goldLine(ctx, W / 2 - X(0.6) - F(0.9) - rw, W / 2 - X(0.6) - F(0.9), ry);
    goldLine(ctx, W / 2 + X(0.6) + F(0.9), W / 2 + X(0.6) + F(0.9) + rw, ry);
    diamond(ctx, W / 2, ry, F(0.9) * 0.5, GOLD);
  }

  // Footer band
  const bandTop = Y(74);
  const sigCx = X(20.2);
  const dateCx = X(79.8);
  const rowH = F(5);
  const rowBottom = bandTop + rowH;
  const colW = F(22);
  const ruleY = rowBottom + F(0.4);
  const capY = ruleY + F(0.6);

  // Signature image (bottom-aligned)
  if (assets.signature) {
    const s = assets.signature;
    const maxW = colW * 0.9;
    let fh = rowH;
    let fw = fh * (s.width / s.height);
    if (fw > maxW) { fw = maxW; fh = fw * (s.height / s.width); }
    ctx.drawImage(s, sigCx - fw / 2, rowBottom - fh, fw, fh);
  }
  goldLine(ctx, sigCx - colW * 0.35, sigCx + colW * 0.35, ruleY);
  centerText(ctx, 'EYEBUCKZ', sigCx, capY, F(1.1), RED, { weight: '700', ls: 0.25 });
  centerText(ctx, 'ISSUED BY', sigCx, capY + F(1.1) + F(0.2), F(0.9), RED, { ls: 0.2 });

  // Date column
  centerText(ctx, formatDateCaps(cert.issueDate), dateCx, rowBottom - F(1.3) * 1.2, F(1.3), RED, { weight: '700', ls: 0.2 });
  goldLine(ctx, dateCx - colW * 0.35, dateCx + colW * 0.35, ruleY);
  centerText(ctx, 'DATE OF ISSUE', dateCx, capY, F(1.1), RED, { weight: '700', ls: 0.25 });

  // Seal
  {
    const sw = F(9.5);
    const cx = W / 2;
    const cy = bandTop - 0.26 * Y(17) + sw / 2;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.02 * sw;
    ctx.beginPath(); ctx.arc(cx, cy, 0.48 * sw, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(cx, cy, 0.40 * sw, 0, Math.PI * 2); ctx.fill();
    if (assets.logo) { ctx.drawImage(assets.logo, cx - 0.25 * sw, cy - 0.25 * sw, 0.5 * sw, 0.5 * sw); }
  }

  // Certificate number
  centerText(ctx, 'CERTIFICATE NO.', W / 2, H - Y(7.5), F(1), RED, { weight: '700', ls: 0.25, baseline: 'bottom' });
  centerText(ctx, cert.certificateNumber, W / 2, H - Y(4.5), F(1), RED, { ls: 0.1, baseline: 'bottom' });
}
