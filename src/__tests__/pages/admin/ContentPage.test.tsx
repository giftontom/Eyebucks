import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi, mockShowToast } = vi.hoisted(() => ({
  mockAdminApi: {
    getSiteContent: vi.fn(),
    createSiteContent: vi.fn(),
    updateSiteContent: vi.fn(),
    deleteSiteContent: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../../../pages/admin/components/AdminModal', () => ({
  AdminModal: ({ open, children, title }: any) =>
    open ? React.createElement('div', { role: 'dialog', 'aria-label': title }, children) : null,
}));

vi.mock('../../../../pages/admin/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, confirmLabel = 'Confirm' }: any) =>
    open
      ? React.createElement('div', { role: 'dialog', 'aria-label': title },
          React.createElement('button', { onClick: onConfirm }, confirmLabel)
        )
      : null,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ContentPage } from '../../../../pages/admin/ContentPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockFaqItem = {
  id: 'faq1',
  section: 'faq',
  title: 'What is this?',
  body: 'This is an LMS.',
  metadata: {},
  orderIndex: 0,
  isActive: true,
};

const mockTestimonialItem = {
  id: 'test1',
  section: 'testimonial',
  title: 'Great product!',
  body: 'Really loved the courses.',
  metadata: {},
  orderIndex: 0,
  isActive: true,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getSiteContent.mockResolvedValue({ items: [mockFaqItem, mockTestimonialItem] });
  mockAdminApi.createSiteContent.mockResolvedValue({ success: true });
  mockAdminApi.updateSiteContent.mockResolvedValue({ success: true });
  mockAdminApi.deleteSiteContent.mockResolvedValue({ success: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ContentPage', () => {
  it('renders content items after loading', async () => {
    render(<ContentPage />);
    await waitFor(() => expect(screen.getByText('What is this?')).toBeInTheDocument());
    expect(screen.getByText('Great product!')).toBeInTheDocument();
    expect(screen.getByText('This is an LMS.')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<ContentPage />);
    expect(mockAdminApi.getSiteContent).toHaveBeenCalled();
  });

  it('shows "No content found" when list is empty', async () => {
    mockAdminApi.getSiteContent.mockResolvedValue({ items: [] });
    render(<ContentPage />);
    await waitFor(() => expect(screen.getByText(/no content found/i)).toBeInTheDocument());
  });

  it('shows "Site Content Manager" heading', async () => {
    render(<ContentPage />);
    await waitFor(() => expect(screen.getByText('Site Content Manager')).toBeInTheDocument());
  });

  it('opens create modal when New Content button clicked', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    fireEvent.click(screen.getByRole('button', { name: /new content/i }));
    expect(screen.getByRole('dialog', { name: /new content/i })).toBeInTheDocument();
  });

  it('shows error toast when title is missing on save', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    fireEvent.click(screen.getByRole('button', { name: /new content/i }));
    // Don't fill title — click Create
    fireEvent.click(screen.getByRole('button', { name: /create$/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Title and body are required', 'error'));
  });

  it('calls createSiteContent and shows success toast on valid create', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    fireEvent.click(screen.getByRole('button', { name: /new content/i }));

    fireEvent.change(screen.getByPlaceholderText(/title \/ question/i), { target: { value: 'New FAQ' } });
    fireEvent.change(screen.getByPlaceholderText(/answer \/ description/i), { target: { value: 'Some answer' } });
    fireEvent.click(screen.getByRole('button', { name: /create$/i }));

    await waitFor(() => expect(mockAdminApi.createSiteContent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New FAQ', body: 'Some answer' })
    ));
    expect(mockShowToast).toHaveBeenCalledWith('Content created!', 'success');
  });

  it('opens edit modal when Edit button clicked', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    expect(screen.getByRole('dialog', { name: /edit content/i })).toBeInTheDocument();
  });

  it('calls updateSiteContent on edit save', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    fireEvent.click(screen.getByRole('button', { name: /update$/i }));
    await waitFor(() => expect(mockAdminApi.updateSiteContent).toHaveBeenCalledWith(
      'faq1',
      expect.objectContaining({ title: 'What is this?' })
    ));
    expect(mockShowToast).toHaveBeenCalledWith('Content updated!', 'success');
  });

  it('opens delete confirm dialog when Delete button clicked', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtns[0]);
    expect(screen.getByRole('dialog', { name: /delete content/i })).toBeInTheDocument();
  });

  it('calls deleteSiteContent and shows success toast on confirm', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtns[0]);
    // ConfirmDialog is now open — click the confirm button inside it
    const allDeleteBtns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(allDeleteBtns[allDeleteBtns.length - 1]);
    await waitFor(() => expect(mockAdminApi.deleteSiteContent).toHaveBeenCalledWith('faq1'));
    expect(mockShowToast).toHaveBeenCalledWith('Content deleted', 'success');
  });
});
