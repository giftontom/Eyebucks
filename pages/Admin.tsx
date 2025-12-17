import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_SALES_DATA, MOCK_COURSES, MOCK_CERTIFICATES } from '../constants';
import { Users, DollarSign, BookOpen, Plus, Search, MoreVertical, Award, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'users' | 'certificates'>('dashboard');
  const [showManualEnrollModal, setShowManualEnrollModal] = useState(false);
  const [selectedUserForEnroll, setSelectedUserForEnroll] = useState<string | null>(null);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Sales</span>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">₹1.2L</p>
                    <p className="text-xs text-green-600 mt-2">+12% vs last week</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Learners</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">842</p>
                    <p className="text-xs text-blue-600 mt-2">Currently active</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Courses</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><BookOpen size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{MOCK_COURSES.length}</p>
                    <p className="text-xs text-purple-600 mt-2">1 Draft pending</p>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Certificates</span>
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Award size={18} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">128</p>
                    <p className="text-xs text-yellow-600 mt-2">Issued to date</p>
                </div>
            </div>

            {/* Sales Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
                <h3 className="text-lg font-bold mb-6 text-slate-900">Sales Performance</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_SALES_DATA}>
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
        </div>
      )}

      {activeTab === 'courses' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">Course Manager</h3>
                  <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm">
                      <Plus size={16} /> New Course
                  </button>
              </div>
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
                        {MOCK_COURSES.map(course => (
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
                                <td className="p-4 text-slate-700">₹{course.price.toLocaleString()}</td>
                                <td className="p-4 text-slate-500">{course.totalStudents || 0}</td>
                                <td className="p-4 text-right pr-6">
                                    <button className="text-brand-600 hover:text-brand-700 font-medium mr-3">Edit</button>
                                    <button className="text-red-600 hover:text-red-700">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
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
                        className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-slate-900 focus:ring-1 focus:ring-brand-500 outline-none text-sm w-64" 
                       />
                  </div>
              </div>
               <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="p-4 pl-6">User Identity</th>
                            <th className="p-4">Phone (E.164)</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                        <tr className="hover:bg-slate-50 transition">
                            <td className="p-4 pl-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">D</div>
                                    <div>
                                        <div className="font-medium text-slate-900">Demo User</div>
                                        <div className="text-slate-500 text-xs">demo@example.com</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-slate-400 italic">Not Verified</td>
                            <td className="p-4"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">Pending</span></td>
                            <td className="p-4 text-right pr-6">
                                <button 
                                    onClick={() => {
                                        setSelectedUserForEnroll('Demo User');
                                        setShowManualEnrollModal(true);
                                    }}
                                    className="text-brand-600 hover:underline text-xs"
                                >
                                    Manual Enroll
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
               </div>
          </div>
      )}

      {activeTab === 'certificates' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">Certificate Manager</h3>
                  <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm">
                      <FileText size={16} /> Issue Manually
                  </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="p-4 pl-6">Certificate ID</th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Course</th>
                            <th className="p-4">Issue Date</th>
                            <th className="p-4 text-right pr-6">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                        {MOCK_CERTIFICATES.map(cert => (
                            <tr key={cert.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 pl-6 font-mono text-slate-400 text-xs">{cert.id}</td>
                                <td className="p-4 font-medium text-slate-900">{cert.studentName}</td>
                                <td className="p-4 text-slate-600">{cert.courseTitle}</td>
                                <td className="p-4 text-slate-500">{cert.issueDate}</td>
                                <td className="p-4 text-right pr-6">
                                    <button className="text-brand-600 hover:text-brand-700">Download</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* Manual Enroll Modal (Mock) */}
      {showManualEnrollModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-lg font-bold mb-4 text-slate-900">Enroll {selectedUserForEnroll}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-500 mb-2">Select Course</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500">
                            {MOCK_COURSES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button 
                            onClick={() => setShowManualEnrollModal(false)}
                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button 
                             onClick={() => {
                                 alert(`Enrolled ${selectedUserForEnroll} successfully!`);
                                 setShowManualEnrollModal(false);
                             }}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition"
                        >
                            Confirm Enroll
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};