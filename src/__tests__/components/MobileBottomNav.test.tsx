import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Test' } }),
}));

import { MobileBottomNav } from '../../../components/MobileBottomNav';

describe('MobileBottomNav', () => {
  const renderNav = (path = '/') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <MobileBottomNav />
      </MemoryRouter>
    );

  it('renders 5 tab buttons', () => {
    renderNav();
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Courses')).toBeInTheDocument();
    expect(screen.getByLabelText('My Learning')).toBeInTheDocument();
    expect(screen.getByLabelText('Alerts')).toBeInTheDocument();
    expect(screen.getByLabelText('Profile')).toBeInTheDocument();
  });

  it('navigates to dashboard on My Learning click', async () => {
    renderNav();
    await userEvent.click(screen.getByLabelText('My Learning'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to profile on Profile click', async () => {
    renderNav();
    await userEvent.click(screen.getByLabelText('Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('hides on learn pages', () => {
    renderNav('/learn/course-1');
    expect(screen.queryByLabelText('Home')).not.toBeInTheDocument();
  });
});
