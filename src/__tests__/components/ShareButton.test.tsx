import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../utils/logger', () => ({
  logger: { warn: vi.fn() },
}));

import { ShareButton } from '../../../components/ShareButton';

describe('ShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no Web Share API, clipboard available
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true });
  });

  it('renders share button with label', () => {
    render(<ShareButton title="My Course" />);
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByLabelText('Share course')).toBeInTheDocument();
  });

  it('copies to clipboard when Web Share API is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<ShareButton title="Test" url="https://example.com" />);
    await userEvent.click(screen.getByLabelText('Share course'));

    expect(writeText).toHaveBeenCalledWith('https://example.com');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('uses Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });

    render(<ShareButton title="Course" text="Check this out" url="https://example.com" />);
    await userEvent.click(screen.getByLabelText('Share course'));

    expect(share).toHaveBeenCalledWith({
      title: 'Course',
      text: 'Check this out',
      url: 'https://example.com',
    });
  });
});
