import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// ImageUpload appears in typed sub-forms for sections with `image` fields
// (e.g. instructors). Stub it so the test environment doesn't need File/URL APIs.
vi.mock('../../../../components', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../components')>();
  return {
    ...orig,
    ImageUpload: ({ label }: { label?: string }) =>
      React.createElement('div', { 'data-testid': 'image-upload-stub' }, label ?? 'Image'),
  };
});

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

  // An empty CMS used to render a single "No content found" line, which hid the
  // fact that the site was still rendering built-in copy for every section and
  // gave the admin nowhere to start. Every known section is now listed instead.
  it('lists every known section even when no rows exist at all', async () => {
    mockAdminApi.getSiteContent.mockResolvedValue({ items: [] });
    render(<ContentPage />);
    await waitFor(() => expect(screen.getByText('Site Content Manager')).toBeInTheDocument());
    expect(screen.queryByText(/no content found/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/using built-in text/i).length).toBeGreaterThan(5);
  });

  it('offers an add-content shortcut on a section that has no rows', async () => {
    mockAdminApi.getSiteContent.mockResolvedValue({ items: [] });
    render(<ContentPage />);
    await waitFor(() => expect(screen.getByText('Site Content Manager')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /add content/i }).length).toBeGreaterThan(0);
  });

  it('orders sections down the page, hero before pricing', async () => {
    mockAdminApi.getSiteContent.mockResolvedValue({ items: [] });
    render(<ContentPage />);
    await waitFor(() => expect(screen.getByText('Site Content Manager')).toBeInTheDocument());
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Hero')).toBeLessThan(text.indexOf('Pricing'));
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
    // Don't fill title — click Create. The FAQ schema relabels title/body to
    // Question/Answer, so the validation message uses those labels.
    fireEvent.click(screen.getByRole('button', { name: /create$/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Question and Answer required', 'error'));
  });

  it('calls createSiteContent and shows success toast on valid create', async () => {
    render(<ContentPage />);
    await waitFor(() => screen.getByText('What is this?'));
    fireEvent.click(screen.getByRole('button', { name: /new content/i }));

    // FAQ schema placeholders (sectionSchemas.ts)
    fireEvent.change(screen.getByPlaceholderText(/what gear/i), { target: { value: 'New FAQ' } });
    fireEvent.change(screen.getByPlaceholderText(/just a phone/i), { target: { value: 'Some answer' } });
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
    // The list groups sections (Landing copy → Social proof → FAQ), so rows are
    // no longer in fixture order — target the FAQ row by its content.
    const faqRow = screen.getByText('What is this?').closest('.justify-between') as HTMLElement;
    fireEvent.click(within(faqRow).getByRole('button', { name: /edit/i }));
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
    // Target the FAQ row by content (rows are grouped, not in fixture order).
    const faqRow = screen.getByText('What is this?').closest('.justify-between') as HTMLElement;
    fireEvent.click(within(faqRow).getByRole('button', { name: /delete/i }));
    // ConfirmDialog is now open — click the confirm button inside it
    const allDeleteBtns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(allDeleteBtns[allDeleteBtns.length - 1]);
    await waitFor(() => expect(mockAdminApi.deleteSiteContent).toHaveBeenCalledWith('faq1'));
    expect(mockShowToast).toHaveBeenCalledWith('Content deleted', 'success');
  });

  // ─── Schema-aware create dropdown (new sections from migration 033) ───────────

  describe('section schema registry — CREATE dropdown', () => {
    // Helper: open the create modal and return the section <select> element.
    const openCreateModal = async () => {
      render(<ContentPage />);
      await waitFor(() => screen.getByText('What is this?'));
      fireEvent.click(screen.getByRole('button', { name: /new content/i }));
      await waitFor(() => screen.getByRole('dialog', { name: /new content/i }));
      // The modal renders a <select> for section choice.
      return screen.getByRole('combobox');
    };

    it('exposes "value_cards" as a selectable option in the create dropdown', async () => {
      await openCreateModal();
      const options = Array.from(
        (screen.getByRole('combobox') as HTMLSelectElement).options,
      ).map((o) => o.value);
      expect(options).toContain('value_cards');
    });

    it('exposes "instructors" as a selectable option in the create dropdown', async () => {
      await openCreateModal();
      const options = Array.from(
        (screen.getByRole('combobox') as HTMLSelectElement).options,
      ).map((o) => o.value);
      expect(options).toContain('instructors');
    });

    it('exposes "creators" as a selectable option in the create dropdown', async () => {
      await openCreateModal();
      const options = Array.from(
        (screen.getByRole('combobox') as HTMLSelectElement).options,
      ).map((o) => o.value);
      expect(options).toContain('creators');
    });

    it('does NOT expose "showcase" (deprecated) in the create dropdown', async () => {
      await openCreateModal();
      const options = Array.from(
        (screen.getByRole('combobox') as HTMLSelectElement).options,
      ).map((o) => o.value);
      expect(options).not.toContain('showcase');
    });

    it('includes copy singletons like "hero" in the create dropdown', async () => {
      await openCreateModal();
      const options = Array.from(
        (screen.getByRole('combobox') as HTMLSelectElement).options,
      ).map((o) => o.value);
      expect(options).toContain('hero');
    });

    it('includes "value_props_copy" in the create dropdown', async () => {
      await openCreateModal();
      const options = Array.from(
        (screen.getByRole('combobox') as HTMLSelectElement).options,
      ).map((o) => o.value);
      expect(options).toContain('value_props_copy');
    });
  });

  // ─── value_cards typed sub-form serializes metadata correctly ────────────────

  describe('value_cards typed sub-form → metadata serialization', () => {
    /**
     * Regression guard: selecting 'value_cards' and filling the sub-form must
     * serialize { icon: <selected>, bullets: [...] } into the metadata argument
     * passed to adminApi.createSiteContent.
     */
    it('passes metadata.icon and metadata.bullets to createSiteContent', async () => {
      render(<ContentPage />);
      await waitFor(() => screen.getByText('What is this?'));
      fireEvent.click(screen.getByRole('button', { name: /new content/i }));
      await waitFor(() => screen.getByRole('dialog', { name: /new content/i }));

      // Switch section to value_cards
      const sectionSelect = screen.getByRole('combobox');
      fireEvent.change(sectionSelect, { target: { value: 'value_cards' } });

      // Fill core title (schema titleLabel = 'Card title'; placeholder = 'Practical Learning')
      const titleInput = screen.getByPlaceholderText(/Practical Learning/i);
      fireEvent.change(titleInput, { target: { value: 'My Value Card' } });

      // Fill core body (schema bodyLabel = 'Description'; placeholder = 'Hands-on projects')
      const bodyInput = screen.getByPlaceholderText(/Hands-on projects/i);
      fireEvent.change(bodyInput, { target: { value: 'Card body text' } });

      // The 'bullets' string-array field: find its textarea by the label text.
      // The label "Bullets (one per line)" is rendered as a <label> sibling — we
      // use the label element text to locate the following textarea.
      const bulletsLabel = screen.getByText('Bullets (one per line)');
      // The textarea is the next sibling element of the label's parent container.
      // Easier: query all textareas and pick the one that is NOT the body textarea
      // (body has a placeholder, bullets does not).
      const allTextareas = screen.getAllByRole('textbox');
      const bulletsTextarea = allTextareas.find(
        (el) => el.tagName === 'TEXTAREA' && !el.getAttribute('placeholder'),
      ) as HTMLTextAreaElement | undefined;
      expect(bulletsLabel).toBeInTheDocument(); // guard
      expect(bulletsTextarea).toBeDefined();
      fireEvent.change(bulletsTextarea!, { target: { value: 'First bullet\nSecond bullet' } });

      fireEvent.click(screen.getByRole('button', { name: /create$/i }));

      await waitFor(() =>
        expect(mockAdminApi.createSiteContent).toHaveBeenCalledWith(
          expect.objectContaining({
            section: 'value_cards',
            title: 'My Value Card',
            body: 'Card body text',
            metadata: expect.objectContaining({
              icon: expect.any(String),         // 'book' default or user-selected
              bullets: expect.arrayContaining(['First bullet', 'Second bullet']),
            }),
          }),
        ),
      );
    });

    it('bullets array strips empty lines', async () => {
      render(<ContentPage />);
      await waitFor(() => screen.getByText('What is this?'));
      fireEvent.click(screen.getByRole('button', { name: /new content/i }));
      await waitFor(() => screen.getByRole('dialog', { name: /new content/i }));

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'value_cards' } });

      fireEvent.change(screen.getByPlaceholderText(/Practical Learning/i), {
        target: { value: 'Card Title' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Hands-on projects/i), {
        target: { value: 'Card body' },
      });

      // The bullets textarea has no placeholder; pick it from all textareas.
      const allTextareas = screen.getAllByRole('textbox');
      const bulletsTextarea = allTextareas.find(
        (el) => el.tagName === 'TEXTAREA' && !el.getAttribute('placeholder'),
      ) as HTMLTextAreaElement | undefined;
      expect(bulletsTextarea).toBeDefined();
      fireEvent.change(bulletsTextarea!, { target: { value: 'Bullet A\n\nBullet B\n' } });

      fireEvent.click(screen.getByRole('button', { name: /create$/i }));

      await waitFor(() =>
        expect(mockAdminApi.createSiteContent).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              // blank lines must be filtered out
              bullets: ['Bullet A', 'Bullet B'],
            }),
          }),
        ),
      );
    });
  });

  // ─── schema validation: FAQ uses schema-aware label names ────────────────────

  describe('schema-aware validation messages', () => {
    it('shows "Question and Answer required" toast for FAQ when nothing filled', async () => {
      // FAQ is the default section; its schema titleLabel = 'Question', bodyLabel = 'Answer'.
      render(<ContentPage />);
      await waitFor(() => screen.getByText('What is this?'));
      fireEvent.click(screen.getByRole('button', { name: /new content/i }));
      await waitFor(() => screen.getByRole('dialog', { name: /new content/i }));
      // Click Create without filling anything
      fireEvent.click(screen.getByRole('button', { name: /create$/i }));
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Question and Answer required', 'error'),
      );
    });

    it('shows only the missing label when just the title is empty', async () => {
      render(<ContentPage />);
      await waitFor(() => screen.getByText('What is this?'));
      fireEvent.click(screen.getByRole('button', { name: /new content/i }));
      await waitFor(() => screen.getByRole('dialog', { name: /new content/i }));

      // Fill the body (Answer), leave Question (title) empty
      const bodyInputs = screen.getAllByRole('textbox');
      // body is second textarea; find it by its placeholder
      const bodyField = bodyInputs.find((el) =>
        el.getAttribute('placeholder')?.toLowerCase().includes('just a phone'),
      );
      if (bodyField) {
        fireEvent.change(bodyField, { target: { value: 'Some answer text' } });
      }

      fireEvent.click(screen.getByRole('button', { name: /create$/i }));
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Question required', 'error'),
      );
    });
  });
});
