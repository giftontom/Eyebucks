import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { Contact } from '../../../pages/Contact';

describe('Contact', () => {
  it('renders page heading', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('shows email support link', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('support@eyebuckz.com')).toBeInTheDocument();
  });

  it('shows FAQ section', () => {
    render(<MemoryRouter><Contact /></MemoryRouter>);
    expect(screen.getByText('Frequently Asked')).toBeInTheDocument();
  });
});
