import { Share2, Check } from 'lucide-react';
import React, { useState } from 'react';

import { logger } from '../utils/logger';

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
  size?: number;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  title,
  text,
  url,
  className = '',
  size = 20,
}) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // User cancelled or API unsupported — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      logger.warn('[ShareButton] Clipboard write failed:', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label={copied ? 'Link copied!' : 'Share course'}
      className={`flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 outline-none ${className}`}
    >
      {copied ? (
        <Check size={size} style={{ color: 'var(--status-success-text)' }} />
      ) : (
        <Share2 size={size} />
      )}
      {copied ? (
        <span className="text-xs font-medium" style={{ color: 'var(--status-success-text)' }}>Copied!</span>
      ) : (
        <span className="text-xs font-medium">Share</span>
      )}
    </button>
  );
};
