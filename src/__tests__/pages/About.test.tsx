import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { About } from '../../../pages/About';

describe('About', () => {
  it('renders page heading', () => {
    render(<MemoryRouter><About /></MemoryRouter>);
    expect(screen.getByText('About Eyebuckz')).toBeInTheDocument();
  });

  it('renders mission description', () => {
    render(<MemoryRouter><About /></MemoryRouter>);
    expect(screen.getByText(/filmmaker-built learning platform/i)).toBeInTheDocument();
  });
});
