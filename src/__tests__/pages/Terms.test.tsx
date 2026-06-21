import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { Terms } from '../../../pages/Terms';

describe('Terms', () => {
  it('renders page heading and last updated date', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText(/march 14, 2026/i)).toBeInTheDocument();
  });
});
