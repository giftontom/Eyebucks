import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { Privacy } from '../../../pages/Privacy';

describe('Privacy', () => {
  it('renders page heading and last updated date', () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText(/march 14, 2026/i)).toBeInTheDocument();
  });
});
