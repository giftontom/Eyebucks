import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, BookOpen, Plus, Search, MoreVertical, Award, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useToast } from '../components/Toast';
import { VideoUploader } from '../components/VideoUploader';
import type { AdminStats, SalesDataPoint, RecentActivity, AdminUser, AdminCourse, AdminCertificate, Module } from '../types';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'users' | 'certificates'>('dashboard');
  const [showManualEnrollModal, setShowManualEnrollModal] = useState(false);
  const [selectedUserForEnroll, setSelectedUserForEnroll] = useState<AdminUser | null>(null);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState<string>('');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    thumbnail: '',
    type: 'MODULE' as 'MODULE' | 'BUNDLE',
    features: ['']
  });

  // Module management state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [selectedCourseForModules, setSelectedCourseForModules] = useState<AdminCourse | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [videoUploadMode, setVideoUploadMode] = useState<'url' | 'upload'>('url');
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    duration: '',
    videoUrl: '',
    videoId: '',
    isFreePreview: false
  });

  // Certificate manual issue state
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedUserForCert, setSelectedUserForCert] = useState<string>('');
  const [selectedCourseForCert, setSelectedCourseForCert] = useState<string>('');

  // Certificate revoke state
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [certificateToRevoke, setCertificateToRevoke] = useState<{id: string; studentName: string; courseTitle: string} | null>(null);

  // Loading states
  const [operationLoading, setOperationLoading] = useState(false);

  // Data state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce user search to avoid API call on every keystroke
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(userSearch);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [userSearch]);

  // Fetch dashboard stats and sales data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (activeTab !== 'dashboard' || !user) return;

      try {
        setLoading(true);
        const [statsRes, salesRes, activityRes] = await Promise.all([
          apiClient.getAdminStats(),
          apiClient.getAdminSales(30),
          apiClient.getAdminRecentActivity(10)
        ]);

        setStats(statsRes.stats);
        setSalesData(salesRes.sales);
        setRecentActivity(activityRes.activity);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeTab, user]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (activeTab !== 'users' || !user) return;

      try {
        setLoading(true);
        const response = await apiClient.getAdminUsers({
          search: debouncedSearch,
          limit: 50
        });
        setUsers(response.users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [activeTab, user, debouncedSearch]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (activeTab !== 'courses' || !user) return;

      try {
        setLoading(true);
        const response = await apiClient.getAdminCourses();
        setCourses(response.courses);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [activeTab, user]);

  // Fetch certificates
  useEffect(() => {
    const fetchCertificates = async () => {
      if (activeTab !== 'certificates' || !user) return;

      try {
        setLoading(true);
        const response = await apiClient.getAdminCertificates({ limit: 50 });
        setCertificates(response.certificates);
      } catch (error) {
        console.error('Failed to fetch certificates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [activeTab, user]);

  if (user?.role !== 'ADMIN') {
    return (
        <div className="flex items-center justify-center h-screen bg-white">
            <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200">
                <h1 className="text-2xl font-bold mb-4 text-red-500">Access Denied</h1>
                <p className="text-slate-500 mb-4">You do not have permission to view this area.</p>
                <Link to="/" className="text-brand-600 hover:underline">Return Home</Link>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
            <p className="text-slate-500 text-sm">Platform Management</p>
        </div>
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
            {(['dashboard', 'courses', 'users', 'certificates'] as const).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition whitespace-nowrap ${
                        activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            {loading && !stats ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-slate-400">Loading dashboard...</div>
                </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Sales</span>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                        ₹{stats ? (stats.totalRevenue / 1000).toFixed(1) : '0'}k
                    </p>
                    <p className="text-xs text-green-600 mt-2">{stats?.totalEnrollments || 0} enrollments</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Learners</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats?.activeUsers || 0}</p>
                    <p className="text-xs text-blue-600 mt-2">of {stats?.totalUsers || 0} total users</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Courses</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><BookOpen size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats?.totalCourses || 0}</p>
                    <p className="text-xs text-purple-600 mt-2">{stats?.draftCourses || 0} Draft pending</p>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Certificates</span>
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Award size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{stats?.totalCertificates || 0}</p>
                    <p className="text-xs text-yellow-600 mt-2">Issued to date</p>
                </div>
            </div>
            )}

            {/* Sales Chart */}
            {!loading && salesData.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
                <h3 className="text-lg font-bold mb-6 text-slate-900">Sales Performance (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#0f172a' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            )}

            {/* Recent Activity */}
            {!loading && recentActivity && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-slate-900">Recent Activity</h3>
                <div className="space-y-3">
                    {recentActivity.recentEnrollments && recentActivity.recentEnrollments.length > 0 && (
                        <>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Enrollments</p>
                            {recentActivity.recentEnrollments.slice(0, 5).map((enrollment: any) => (
                                <div key={enrollment.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                                            {enrollment.userName?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{enrollment.userName}</p>
                                            <p className="text-xs text-slate-500">{enrollment.courseTitle}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {new Date(enrollment.enrolledAt).toLocaleDateString('en-IN')}
                                    </span>
                                </div>
                            ))}
                        </>
                    )}

                    {recentActivity.recentCertificates && recentActivity.recentCertificates.length > 0 && (
                        <>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6">Recent Certificates</p>
                            {recentActivity.recentCertificates.slice(0, 5).map((cert: any) => (
                                <div key={cert.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold">
                                            🏆
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{cert.studentName}</p>
                                            <p className="text-xs text-slate-500">{cert.courseTitle}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {new Date(cert.issueDate).toLocaleDateString('en-IN')}
                                    </span>
                                </div>
                            ))}
                        </>
                    )}

                    {(!recentActivity.recentEnrollments || recentActivity.recentEnrollments.length === 0) &&
                     (!recentActivity.recentCertificates || recentActivity.recentCertificates.length === 0) && (
                        <p className="text-slate-400 text-center py-8">No recent activity</p>
                    )}
                </div>
            </div>
            )}
        </div>
      )}

      {activeTab === 'courses' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">Course Manager</h3>
                  <button
                    onClick={() => {
                      setEditingCourseId(null);
                      setCourseFormData({
                        title: '',
                        slug: '',
                        description: '',
                        price: '',
                        thumbnail: '',
                        type: 'MODULE',
                        features: ['']
                      });
                      setShowCourseModal(true);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
                  >
                      <Plus size={16} /> New Course
                  </button>
              </div>
              {loading ? (
                  <div className="flex items-center justify-center py-20">
                      <div className="text-slate-400">Loading courses...</div>
                  </div>
              ) : courses.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                      <div className="text-slate-400">No courses found</div>
                  </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="p-4 pl-6">Course Title</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Enrolled</th>
                            <th className="p-4 text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                        {courses.map(course => (
                             <tr key={course.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 pl-6 font-medium text-slate-900">{course.title}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        course.status === 'PUBLISHED'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {course.status}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-700">₹{(course.price / 100).toLocaleString()}</td>
                                <td className="p-4 text-slate-500">{course.enrollmentCount || 0}</td>
                                <td className="p-4 text-right pr-6">
                                    <button
                                        disabled={operationLoading}
                                        onClick={async () => {
                                            const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
                                            const action = newStatus === 'PUBLISHED' ? 'publish' : 'unpublish';

                                            if (!confirm(`Are you sure you want to ${action} "${course.title}"?`)) return;

                                            setOperationLoading(true);
                                            try {
                                                await apiClient.publishAdminCourse(course.id, newStatus);
                                                showToast(`Course ${action}ed successfully!`, 'success');
                                                // Refresh courses list
                                                const coursesRes = await apiClient.getAdminCourses();
                                                setCourses(coursesRes.courses);
                                            } catch (error: any) {
                                                showToast(error.message || `Failed to ${action} course`, 'error');
                                            } finally {
                                                setOperationLoading(false);
                                            }
                                        }}
                                        className={`font-medium mr-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            course.status === 'PUBLISHED'
                                            ? 'text-yellow-600 hover:text-yellow-700'
                                            : 'text-green-600 hover:text-green-700'
                                        }`}
                                    >
                                        {operationLoading ? '...' : (course.status === 'PUBLISHED' ? 'Unpublish' : 'Publish')}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setSelectedCourseForModules(course);
                                            // Fetch modules for this course
                                            try {
                                                const response = await apiClient.getCourseModules(course.id);
                                                setModules(response.modules || []);
                                            } catch (error) {
                                                console.error('Failed to fetch modules:', error);
                                                setModules([]);
                                            }
                                        }}
                                        className="text-purple-600 hover:text-purple-700 font-medium mr-3"
                                    >
                                        Modules
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingCourseId(course.id);
                                            setCourseFormData({
                                                title: course.title,
                                                slug: course.slug,
                                                description: course.description,
                                                price: String(course.price / 100),
                                                thumbnail: course.thumbnail || '',
                                                type: course.type,
                                                features: course.features.length > 0 ? course.features : ['']
                                            });
                                            setShowCourseModal(true);
                                        }}
                                        className="text-brand-600 hover:text-brand-700 font-medium mr-3"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCourseToDelete({ id: course.id, title: course.title });
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
              )}
          </div>
      )}

      {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">User Manager</h3>
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-slate-900 focus:ring-1 focus:ring-brand-500 outline-none text-sm w-64"
                       />
                  </div>
              </div>
              {loading ? (
                  <div className="flex items-center justify-center py-20">
                      <div className="text-slate-400">Loading users...</div>
                  </div>
              ) : users.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                      <div className="text-slate-400">No users found</div>
                  </div>
              ) : (
               <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="p-4 pl-6">User Identity</th>
                            <th className="p-4">Phone (E.164)</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Enrollments</th>
                            <th className="p-4 text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                        {users.map(userItem => (
                        <tr key={userItem.id} className="hover:bg-slate-50 transition">
                            <td className="p-4 pl-6">
                                <div className="flex items-center gap-3">
                                    {userItem.avatar ? (
                                        <img src={userItem.avatar} alt={userItem.name} className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {userItem.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium text-slate-900">{userItem.name}</div>
                                        <div className="text-slate-500 text-xs">{userItem.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                {userItem.phoneVerified ? (
                                    <span className="text-slate-700">{userItem.phoneE164}</span>
                                ) : (
                                    <span className="text-slate-400 italic">Not Verified</span>
                                )}
                            </td>
                            <td className="p-4">
                                <select
                                    value={userItem.role}
                                    disabled={operationLoading}
                                    onChange={async (e) => {
                                        const newRole = e.target.value as 'USER' | 'ADMIN';
                                        setOperationLoading(true);
                                        try {
                                            await apiClient.updateAdminUser(userItem.id, { role: newRole });
                                            showToast(`Role updated to ${newRole}`, 'success');
                                            // Refresh users list
                                            const response = await apiClient.getAdminUsers({
                                                search: userSearch,
                                                limit: 50
                                            });
                                            setUsers(response.users);
                                        } catch (error: any) {
                                            showToast(error.message || 'Failed to update role', 'error');
                                        } finally {
                                            setOperationLoading(false);
                                        }
                                    }}
                                    className={`px-2 py-1 rounded text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        userItem.role === 'ADMIN'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </td>
                            <td className="p-4">
                                <button
                                    disabled={operationLoading}
                                    onClick={async () => {
                                        const newStatus = !userItem.isActive;
                                        setOperationLoading(true);
                                        try {
                                            await apiClient.updateAdminUser(userItem.id, { isActive: newStatus });
                                            showToast(`User ${newStatus ? 'activated' : 'deactivated'}`, 'success');
                                            // Refresh users list
                                            const response = await apiClient.getAdminUsers({
                                                search: userSearch,
                                                limit: 50
                                            });
                                            setUsers(response.users);
                                        } catch (error: any) {
                                            showToast(error.message || 'Failed to update status', 'error');
                                        } finally {
                                            setOperationLoading(false);
                                        }
                                    }}
                                    className={`px-2 py-1 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed ${
                                        userItem.isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                >
                                    {operationLoading ? '...' : (userItem.isActive ? 'Active' : 'Inactive')}
                                </button>
                            </td>
                            <td className="p-4 text-slate-500">{userItem.enrollmentCount || 0}</td>
                            <td className="p-4 text-right pr-6">
                                <button
                                    onClick={() => {
                                        setSelectedUserForEnroll(userItem);
                                        setShowManualEnrollModal(true);
                                    }}
                                    className="text-brand-600 hover:underline text-xs"
                                >
                                    Manual Enroll
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
               </div>
               )}
          </div>
      )}

      {activeTab === 'certificates' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">Certificate Manager</h3>
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
                  >
                      <FileText size={16} /> Issue Manually
                  </button>
              </div>
              {loading ? (
                  <div className="flex items-center justify-center py-20">
                      <div className="text-slate-400">Loading certificates...</div>
                  </div>
              ) : certificates.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                      <div className="text-slate-400">No certificates found</div>
                  </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="p-4 pl-6">Certificate Number</th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Course</th>
                            <th className="p-4">Issue Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                        {certificates.map(cert => (
                            <tr key={cert.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 pl-6 font-mono text-slate-400 text-xs">{cert.certificateNumber}</td>
                                <td className="p-4 font-medium text-slate-900">{cert.studentName}</td>
                                <td className="p-4 text-slate-600">{cert.courseTitle}</td>
                                <td className="p-4 text-slate-500">
                                    {new Date(cert.issueDate).toLocaleDateString('en-IN')}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        cert.status === 'ACTIVE'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                        {cert.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right pr-6">
                                    {cert.status === 'ACTIVE' ? (
                                        <button
                                            onClick={() => {
                                                setCertificateToRevoke({
                                                    id: cert.id,
                                                    studentName: cert.studentName,
                                                    courseTitle: cert.courseTitle
                                                });
                                                setShowRevokeModal(true);
                                            }}
                                            className="text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Revoke
                                        </button>
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">Revoked</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
              )}
          </div>
      )}

      {/* Manual Enroll Modal */}
      {showManualEnrollModal && selectedUserForEnroll && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-lg font-bold mb-4 text-slate-900">
                    Enroll {selectedUserForEnroll.name}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-500 mb-2">Select Course</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            value={selectedCourseForEnroll}
                            onChange={(e) => setSelectedCourseForEnroll(e.target.value)}
                        >
                            <option value="">-- Select a course --</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.title} (₹{(c.price / 100).toLocaleString()})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => {
                                setShowManualEnrollModal(false);
                                setSelectedCourseForEnroll('');
                            }}
                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (!selectedCourseForEnroll) {
                                    showToast('Please select a course', 'error');
                                    return;
                                }
                                try {
                                    const response = await apiClient.manualEnrollUser(
                                        selectedUserForEnroll.id,
                                        selectedCourseForEnroll
                                    );
                                    showToast(response.message || 'Enrollment successful!', 'success');
                                    setShowManualEnrollModal(false);
                                    setSelectedCourseForEnroll('');
                                    // Refresh users list
                                    if (activeTab === 'users') {
                                        const usersRes = await apiClient.getAdminUsers({
                                            search: userSearch,
                                            limit: 50
                                        });
                                        setUsers(usersRes.users);
                                    }
                                } catch (error: any) {
                                    showToast(error.message || 'Failed to enroll user', 'error');
                                }
                            }}
                            disabled={!selectedCourseForEnroll}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Enroll
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Course Create/Edit Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 shadow-2xl my-8">
                <h3 className="text-lg font-bold mb-4 text-slate-900">
                    {editingCourseId ? 'Edit Course' : 'Create New Course'}
                </h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                        <input
                            type="text"
                            value={courseFormData.title}
                            onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Course title"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Slug *</label>
                        <input
                            type="text"
                            value={courseFormData.slug}
                            onChange={(e) => setCourseFormData({ ...courseFormData, slug: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="course-slug"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                        <textarea
                            value={courseFormData.description}
                            onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                            rows={4}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Course description"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Price (₹) *</label>
                        <input
                            type="number"
                            value={courseFormData.price}
                            onChange={(e) => setCourseFormData({ ...courseFormData, price: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="1999"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Thumbnail URL</label>
                        <input
                            type="url"
                            value={courseFormData.thumbnail}
                            onChange={(e) => setCourseFormData({ ...courseFormData, thumbnail: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="https://..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                        <select
                            value={courseFormData.type}
                            onChange={(e) => setCourseFormData({ ...courseFormData, type: e.target.value as 'MODULE' | 'BUNDLE' })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="MODULE">Module</option>
                            <option value="BUNDLE">Bundle</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Features</label>
                        {courseFormData.features.map((feature, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={feature}
                                    onChange={(e) => {
                                        const newFeatures = [...courseFormData.features];
                                        newFeatures[index] = e.target.value;
                                        setCourseFormData({ ...courseFormData, features: newFeatures });
                                    }}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="Feature description"
                                />
                                {courseFormData.features.length > 1 && (
                                    <button
                                        onClick={() => {
                                            const newFeatures = courseFormData.features.filter((_, i) => i !== index);
                                            setCourseFormData({ ...courseFormData, features: newFeatures });
                                        }}
                                        className="px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => setCourseFormData({ ...courseFormData, features: [...courseFormData.features, ''] })}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                            + Add Feature
                        </button>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => {
                            setShowCourseModal(false);
                            setEditingCourseId(null);
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            if (!courseFormData.title || !courseFormData.slug || !courseFormData.description || !courseFormData.price || !courseFormData.type) {
                                showToast('Please fill in all required fields', 'error');
                                return;
                            }
                            try {
                                if (editingCourseId) {
                                    // Update existing course
                                    const response = await apiClient.updateAdminCourse(editingCourseId, {
                                        title: courseFormData.title,
                                        slug: courseFormData.slug,
                                        description: courseFormData.description,
                                        price: Number(courseFormData.price),
                                        thumbnail: courseFormData.thumbnail || undefined,
                                        type: courseFormData.type,
                                        features: courseFormData.features.filter(f => f.trim())
                                    });
                                    showToast(response.message || 'Course updated successfully!', 'success');
                                } else {
                                    // Create new course
                                    const response = await apiClient.createAdminCourse({
                                        title: courseFormData.title,
                                        slug: courseFormData.slug,
                                        description: courseFormData.description,
                                        price: Number(courseFormData.price),
                                        thumbnail: courseFormData.thumbnail || undefined,
                                        type: courseFormData.type,
                                        features: courseFormData.features.filter(f => f.trim())
                                    });
                                    showToast(response.message || 'Course created successfully!', 'success');
                                }
                                setShowCourseModal(false);
                                setEditingCourseId(null);
                                // Refresh courses list
                                if (activeTab === 'courses') {
                                    const coursesRes = await apiClient.getAdminCourses();
                                    setCourses(coursesRes.courses);
                                }
                            } catch (error: any) {
                                showToast(error.message || `Failed to ${editingCourseId ? 'update' : 'create'} course`, 'error');
                            }
                        }}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition"
                    >
                        {editingCourseId ? 'Update Course' : 'Create Course'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && courseToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-lg font-bold mb-4 text-slate-900">Delete Course</h3>
                <p className="text-slate-600 mb-2">
                    Are you sure you want to delete <span className="font-bold text-slate-900">"{courseToDelete.title}"</span>?
                </p>
                <p className="text-sm text-red-600 mb-6">
                    ⚠️ This will permanently delete all associated modules, enrollments, and progress data. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setShowDeleteConfirm(false);
                            setCourseToDelete(null);
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const response = await apiClient.deleteAdminCourse(courseToDelete.id);
                                showToast(response.message || 'Course deleted successfully!', 'success');
                                setShowDeleteConfirm(false);
                                setCourseToDelete(null);
                                // Refresh courses list
                                if (activeTab === 'courses') {
                                    const coursesRes = await apiClient.getAdminCourses();
                                    setCourses(coursesRes.courses);
                                }
                            } catch (error: any) {
                                showToast(error.message || 'Failed to delete course', 'error');
                            }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition"
                    >
                        Delete Course
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Module Management Modal */}
      {selectedCourseForModules && !showModuleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl p-6 shadow-2xl my-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Module Manager</h3>
                        <p className="text-sm text-slate-500">{selectedCourseForModules.title}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setEditingModuleId(null);
                                setModuleFormData({
                                    title: '',
                                    duration: '',
                                    videoUrl: '',
                                    videoId: '',
                                    isFreePreview: false
                                });
                                setShowModuleModal(true);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
                        >
                            <Plus size={16} /> New Module
                        </button>
                        <button
                            onClick={() => {
                                setSelectedCourseForModules(null);
                                setModules([]);
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-900 px-4 py-2 rounded-lg font-medium text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {modules.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-slate-400">
                        No modules found. Click "New Module" to add one.
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {modules.map((module, index) => (
                            <div key={module.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                                            <h4 className="font-bold text-slate-900">{module.title}</h4>
                                            {module.isFreePreview && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                                                    FREE PREVIEW
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <div>⏱️ Duration: <span className="font-medium">{module.duration}</span></div>
                                            <div className="flex items-center gap-2">
                                                🎥 Video:
                                                <a
                                                    href={module.videoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-brand-600 hover:underline text-xs truncate max-w-md"
                                                >
                                                    {module.videoUrl}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 ml-4">
                                        <button
                                            onClick={async () => {
                                                if (index === 0) return;
                                                const newOrder = [...modules];
                                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                try {
                                                    await apiClient.reorderModules(
                                                        selectedCourseForModules.id,
                                                        newOrder.map(m => m.id)
                                                    );
                                                    setModules(newOrder);
                                                    showToast('Module moved up', 'success');
                                                } catch (error: any) {
                                                    showToast(error.message || 'Failed to reorder', 'error');
                                                }
                                            }}
                                            disabled={index === 0}
                                            className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (index === modules.length - 1) return;
                                                const newOrder = [...modules];
                                                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                                try {
                                                    await apiClient.reorderModules(
                                                        selectedCourseForModules.id,
                                                        newOrder.map(m => m.id)
                                                    );
                                                    setModules(newOrder);
                                                    showToast('Module moved down', 'success');
                                                } catch (error: any) {
                                                    showToast(error.message || 'Failed to reorder', 'error');
                                                }
                                            }}
                                            disabled={index === modules.length - 1}
                                            className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-300">
                                    <button
                                        onClick={() => {
                                            setEditingModuleId(module.id);
                                            setModuleFormData({
                                                title: module.title,
                                                duration: module.duration,
                                                videoUrl: module.videoUrl,
                                                videoId: '',
                                                isFreePreview: module.isFreePreview
                                            });
                                            setShowModuleModal(true);
                                        }}
                                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm(`Delete module "${module.title}"?`)) return;
                                            try {
                                                await apiClient.deleteModule(selectedCourseForModules.id, module.id);
                                                // Refresh modules
                                                const response = await apiClient.getCourseModules(selectedCourseForModules.id);
                                                setModules(response.modules || []);
                                                showToast('Module deleted successfully!', 'success');
                                            } catch (error: any) {
                                                showToast(error.message || 'Failed to delete module', 'error');
                                            }
                                        }}
                                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Module Create/Edit Modal */}
      {showModuleModal && selectedCourseForModules && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-2xl">
                <h3 className="text-lg font-bold mb-4 text-slate-900">
                    {editingModuleId ? 'Edit Module' : 'Create New Module'}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Module Title *</label>
                        <input
                            type="text"
                            value={moduleFormData.title}
                            onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Introduction to React"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Duration (MM:SS) *</label>
                        <input
                            type="text"
                            value={moduleFormData.duration}
                            onChange={(e) => setModuleFormData({ ...moduleFormData, duration: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="15:30"
                        />
                    </div>
                    {/* Video Source Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Video Source *</label>
                        <div className="flex gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setVideoUploadMode('url')}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                                    videoUploadMode === 'url'
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Enter URL
                            </button>
                            <button
                                type="button"
                                onClick={() => setVideoUploadMode('upload')}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                                    videoUploadMode === 'upload'
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Upload Video
                            </button>
                        </div>

                        {/* Conditional rendering based on mode */}
                        {videoUploadMode === 'url' ? (
                            <div>
                                <input
                                    type="url"
                                    value={moduleFormData.videoUrl}
                                    onChange={(e) => setModuleFormData({ ...moduleFormData, videoUrl: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="https://youtube.com/watch?v=..."
                                />
                            </div>
                        ) : (
                            <VideoUploader
                                initialVideoUrl={moduleFormData.videoUrl}
                                onUploadComplete={(videoData) => {
                                    // Convert duration from seconds to MM:SS
                                    const minutes = Math.floor(videoData.duration / 60);
                                    const seconds = Math.floor(videoData.duration % 60);
                                    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                                    setModuleFormData({
                                        ...moduleFormData,
                                        videoUrl: videoData.secureUrl,
                                        videoId: videoData.publicId,
                                        duration: durationStr
                                    });
                                }}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isFreePreview"
                            checked={moduleFormData.isFreePreview}
                            onChange={(e) => setModuleFormData({ ...moduleFormData, isFreePreview: e.target.checked })}
                            className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                        />
                        <label htmlFor="isFreePreview" className="text-sm text-slate-700">
                            Free Preview (Allow non-enrolled users to watch)
                        </label>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => {
                            setShowModuleModal(false);
                            setEditingModuleId(null);
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            if (!moduleFormData.title || !moduleFormData.duration || !moduleFormData.videoUrl) {
                                showToast('Please fill in all required fields', 'error');
                                return;
                            }
                            // Validate duration format (MM:SS)
                            if (!/^\d{1,2}:\d{2}$/.test(moduleFormData.duration)) {
                                showToast('Duration must be in MM:SS format (e.g., 15:30)', 'error');
                                return;
                            }
                            try {
                                if (editingModuleId) {
                                    await apiClient.updateModule(
                                        selectedCourseForModules.id,
                                        editingModuleId,
                                        moduleFormData
                                    );
                                    showToast('Module updated successfully!', 'success');
                                } else {
                                    await apiClient.createModule(
                                        selectedCourseForModules.id,
                                        moduleFormData
                                    );
                                    showToast('Module created successfully!', 'success');
                                }
                                setShowModuleModal(false);
                                setEditingModuleId(null);
                                // Refresh modules
                                const response = await apiClient.getCourseModules(selectedCourseForModules.id);
                                setModules(response.modules || []);
                            } catch (error: any) {
                                showToast(error.message || `Failed to ${editingModuleId ? 'update' : 'create'} module`, 'error');
                            }
                        }}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition"
                    >
                        {editingModuleId ? 'Update Module' : 'Create Module'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Certificate Manual Issue Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-lg font-bold mb-4 text-slate-900">
                    Issue Certificate Manually
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select User *</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            value={selectedUserForCert}
                            onChange={(e) => setSelectedUserForCert(e.target.value)}
                        >
                            <option value="">-- Select a user --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            💡 Switch to Users tab to see all users if list is empty
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Course *</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            value={selectedCourseForCert}
                            onChange={(e) => setSelectedCourseForCert(e.target.value)}
                        >
                            <option value="">-- Select a course --</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            💡 Switch to Courses tab to see all courses if list is empty
                        </p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                        ⚠️ This will issue a certificate without verifying course completion. Use responsibly.
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => {
                            setShowCertificateModal(false);
                            setSelectedUserForCert('');
                            setSelectedCourseForCert('');
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            if (!selectedUserForCert || !selectedCourseForCert) {
                                showToast('Please select both user and course', 'error');
                                return;
                            }
                            try {
                                const response = await apiClient.issueAdminCertificate({
                                    userId: selectedUserForCert,
                                    courseId: selectedCourseForCert
                                });
                                showToast(response.message || 'Certificate issued successfully!', 'success');
                                setShowCertificateModal(false);
                                setSelectedUserForCert('');
                                setSelectedCourseForCert('');
                                // Refresh certificates list
                                if (activeTab === 'certificates') {
                                    const certsRes = await apiClient.getAdminCertificates({ limit: 50 });
                                    setCertificates(certsRes.certificates);
                                }
                            } catch (error: any) {
                                showToast(error.message || 'Failed to issue certificate', 'error');
                            }
                        }}
                        disabled={!selectedUserForCert || !selectedCourseForCert}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Issue Certificate
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Certificate Revoke Modal */}
      {showRevokeModal && certificateToRevoke && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-lg font-bold mb-4 text-slate-900">
                    Revoke Certificate
                </h3>
                <p className="text-slate-600 mb-4">
                    Revoking certificate for <span className="font-bold text-slate-900">{certificateToRevoke.studentName}</span> - <span className="font-medium text-slate-700">{certificateToRevoke.courseTitle}</span>
                </p>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Revocation</label>
                    <textarea
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="Explain why this certificate is being revoked..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 mb-4">
                    ⚠️ This action cannot be undone. The certificate will be permanently revoked.
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setShowRevokeModal(false);
                            setCertificateToRevoke(null);
                            setRevokeReason('');
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const response = await apiClient.revokeAdminCertificate(
                                    certificateToRevoke.id,
                                    revokeReason
                                );
                                showToast(response.message || 'Certificate revoked successfully!', 'success');
                                setShowRevokeModal(false);
                                setCertificateToRevoke(null);
                                setRevokeReason('');
                                // Refresh certificates list
                                if (activeTab === 'certificates') {
                                    const certsRes = await apiClient.getAdminCertificates({ limit: 50 });
                                    setCertificates(certsRes.certificates);
                                }
                            } catch (error: any) {
                                showToast(error.message || 'Failed to revoke certificate', 'error');
                            }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition"
                    >
                        Revoke Certificate
                    </button>
                </div>
            </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};