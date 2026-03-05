import { Users, DollarSign, BookOpen, Award } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useToast } from '../../components/Toast';
import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';

import { ActivityFeed } from './components/ActivityFeed';
import { QuickActions } from './components/QuickActions';
import { SalesChart } from './components/SalesChart';
import { StatsCard } from './components/StatsCard';
import { VideoCleanup } from './components/VideoCleanup';

import type { AdminStats, SalesDataPoint, RecentActivity } from '../../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastContainer } = useToast();

  const fetchDashboard = async (days: number = 30) => {
    try {
      setLoading(true);
      const [statsRes, salesRes, activityRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSales(days),
        adminApi.getRecentActivity(10),
      ]);
      setStats(statsRes.stats);
      setSalesData(salesRes.sales);
      setRecentActivity(activityRes.activity);
    } catch (err) {
      logger.error('Failed to fetch dashboard data:', err);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handlePeriodChange = async (days: number) => {
    try {
      const salesRes = await adminApi.getSales(days);
      setSalesData(salesRes.sales);
    } catch (err) {
      logger.error('Failed to fetch sales data:', err);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer />
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Total Sales"
          value={`₹${stats ? (stats.totalRevenue / 100000).toFixed(1) : '0'}k`}
          subtitle={`${stats?.totalEnrollments || 0} enrollments`}
          icon={<DollarSign size={18} />}
          iconBg="bg-green-50 text-green-600"
          subtitleColor="text-green-600"
        />
        <StatsCard
          label="Active Learners"
          value={stats?.activeUsers || 0}
          subtitle={`of ${stats?.totalUsers || 0} total users`}
          icon={<Users size={18} />}
          iconBg="bg-blue-50 text-blue-600"
          subtitleColor="text-blue-600"
        />
        <StatsCard
          label="Total Courses"
          value={stats?.totalCourses || 0}
          subtitle={`${stats?.draftCourses || 0} Draft pending`}
          icon={<BookOpen size={18} />}
          iconBg="bg-purple-50 text-purple-600"
          subtitleColor="text-purple-600"
        />
        <StatsCard
          label="Certificates"
          value={stats?.totalCertificates || 0}
          subtitle="Issued to date"
          icon={<Award size={18} />}
          iconBg="bg-yellow-50 text-yellow-600"
          subtitleColor="text-yellow-600"
        />
      </div>

      {/* Sales Chart */}
      {!loading && <SalesChart salesData={salesData} onPeriodChange={handlePeriodChange} />}

      {/* Quick Actions */}
      <QuickActions />

      {/* Video Cleanup */}
      <VideoCleanup showToast={showToast} />

      {/* Recent Activity */}
      {!loading && recentActivity && <ActivityFeed activity={recentActivity} />}
    </div>
  );
};
