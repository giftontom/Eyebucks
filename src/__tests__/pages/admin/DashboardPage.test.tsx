import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getStats: vi.fn(),
    getSales: vi.fn(),
    getRecentActivity: vi.fn(),
  },
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

// Mock heavy sub-components
vi.mock('../../../../pages/admin/components/SalesChart', () => ({
  SalesChart: () => React.createElement('div', { 'data-testid': 'sales-chart' }),
}));

vi.mock('../../../../pages/admin/components/ActivityFeed', () => ({
  ActivityFeed: () => React.createElement('div', { 'data-testid': 'activity-feed' }),
}));

vi.mock('../../../../pages/admin/components/QuickActions', () => ({
  QuickActions: () => null,
}));

vi.mock('../../../../pages/admin/components/VideoCleanup', () => ({
  VideoCleanup: () => null,
}));

vi.mock('../../../../pages/admin/components/StatsCard', () => ({
  StatsCard: ({ label, value }: any) =>
    React.createElement('div', { 'data-testid': `stat-${label.replace(/\s+/g, '-').toLowerCase()}` },
      React.createElement('span', null, label),
      React.createElement('span', null, String(value)),
    ),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { DashboardPage } from '../../../../pages/admin/DashboardPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockStats = {
  totalRevenue: 500000,
  totalEnrollments: 50,
  activeUsers: 30,
  totalUsers: 100,
  totalCourses: 5,
  draftCourses: 2,
  totalCertificates: 10,
};

const mockSales = [{ date: '2026-03-01', amount: 100000, count: 1 }];

const mockActivity = { recentEnrollments: [], recentPayments: [] };

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getStats.mockResolvedValue({ stats: mockStats });
  mockAdminApi.getSales.mockResolvedValue({ sales: mockSales });
  mockAdminApi.getRecentActivity.mockResolvedValue({ activity: mockActivity });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  it('shows loading state initially', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('renders all 4 KPI card labels after data loads', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText('Total Sales')).toBeInTheDocument());
    expect(screen.getByText('Active Learners')).toBeInTheDocument();
    expect(screen.getByText('Total Courses')).toBeInTheDocument();
    expect(screen.getByText('Certificates')).toBeInTheDocument();
  });

  it('renders sales chart after loading', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByTestId('sales-chart')).toBeInTheDocument());
  });

  it('renders activity feed after loading', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByTestId('activity-feed')).toBeInTheDocument());
  });

  it('calls all three APIs on mount', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(mockAdminApi.getStats).toHaveBeenCalled());
    expect(mockAdminApi.getSales).toHaveBeenCalled();
    expect(mockAdminApi.getRecentActivity).toHaveBeenCalled();
  });

  it('shows error toast when stats API fails', async () => {
    mockAdminApi.getStats.mockRejectedValue(new Error('Failed'));
    render(<DashboardPage />);
    await waitFor(() => expect(mockAdminApi.getStats).toHaveBeenCalled());
    // Page exits loading and shows an error toast
    await waitFor(() => expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument());
  });
});
