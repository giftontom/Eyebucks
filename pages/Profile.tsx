import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Award, CreditCard, Download, Check, Edit2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { certificatesApi } from '../services/api/certificates.api';
import { paymentsApi } from '../services/api/payments.api';
import type { Certificate } from '../types';
import type { Payment } from '../services/api/payments.api';

export const Profile: React.FC = () => {
  const { user, updatePhoneNumber, updateProfile } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  // Profile editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);

  // Phone editing
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  useEffect(() => {
    certificatesApi.getUserCertificates()
      .then(setCertificates)
      .catch(() => {})
      .finally(() => setIsLoadingCerts(false));

    paymentsApi.getUserPayments()
      .then(res => setPayments(res.payments))
      .catch(() => {})
      .finally(() => setIsLoadingPayments(false));
  }, []);

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput === user?.name) {
      setIsEditingName(false);
      return;
    }
    setNameSaving(true);
    try {
      await updateProfile({ name: nameInput.trim() });
      setIsEditingName(false);
    } catch {
      // revert
    } finally {
      setNameSaving(false);
    }
  };

  const handleSavePhone = async () => {
    setPhoneError('');
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneInput)) {
      setPhoneError('Enter a valid number (e.g., +15550000000)');
      return;
    }
    setPhoneSaving(true);
    try {
      await updatePhoneNumber(phoneInput);
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch {
      setPhoneError('Failed to save phone number');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleDownloadReceipt = (payment: Payment) => {
    const receiptHtml = `
      <!DOCTYPE html>
      <html><head><title>Receipt - ${payment.receiptNumber || payment.id}</title>
      <style>body{font-family:system-ui;max-width:600px;margin:40px auto;padding:20px}h1{color:#1a1a1a}table{width:100%;border-collapse:collapse;margin:20px 0}td{padding:8px 0;border-bottom:1px solid #eee}.total{font-size:1.2em;font-weight:bold}.brand{color:#dc2626}</style>
      </head><body>
      <h1>Payment Receipt</h1>
      <p class="brand"><strong>Eyebuckz Academy</strong></p>
      <hr/>
      <table>
        <tr><td><strong>Receipt #</strong></td><td>${payment.receiptNumber || '—'}</td></tr>
        <tr><td><strong>Date</strong></td><td>${new Date(payment.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
        <tr><td><strong>Student</strong></td><td>${user?.name || '—'}</td></tr>
        <tr><td><strong>Email</strong></td><td>${user?.email || '—'}</td></tr>
        <tr><td><strong>Course</strong></td><td>${payment.courseTitle || '—'}</td></tr>
        <tr><td><strong>Payment ID</strong></td><td style="font-size:0.85em">${payment.razorpayPaymentId || '—'}</td></tr>
        <tr><td><strong>Order ID</strong></td><td style="font-size:0.85em">${payment.razorpayOrderId || '—'}</td></tr>
        <tr><td class="total"><strong>Amount Paid</strong></td><td class="total">₹${(payment.amount / 100).toLocaleString('en-IN')}</td></tr>
      </table>
      <p style="color:#666;font-size:0.85em;margin-top:30px">Thank you for your purchase. This receipt is for your records.</p>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">My Profile</h1>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-3xl font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 space-y-4">
            {/* Name */}
            <div className="flex items-center gap-3">
              <User size={18} className="text-slate-400 shrink-0" />
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={nameSaving} className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-500 disabled:opacity-50">
                    {nameSaving ? '...' : 'Save'}
                  </button>
                  <button onClick={() => { setIsEditingName(false); setNameInput(user?.name || ''); }} className="text-sm text-slate-500 hover:text-slate-700">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{user?.name}</span>
                  <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-brand-600 transition">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-slate-400 shrink-0" />
              <span className="text-slate-600">{user?.email}</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Read-only</span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-slate-400 shrink-0" />
              {user?.phone_e164 ? (
                <span className="text-slate-600">{user.phone_e164}</span>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(''); }}
                      placeholder="+15550000000"
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    />
                    <button onClick={handleSavePhone} disabled={phoneSaving || !phoneInput} className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                      {phoneSaving ? '...' : phoneSaved ? <Check size={16} /> : 'Save'}
                    </button>
                  </div>
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Certificates */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Award size={22} className="text-yellow-500" /> My Certificates
        </h2>
        {isLoadingCerts ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : certificates.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No certificates earned yet. Complete a course to earn one!</p>
        ) : (
          <div className="space-y-4">
            {certificates.map(cert => (
              <div key={cert.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">{cert.courseTitle}</p>
                  <p className="text-sm text-slate-500">
                    Issued {new Date(cert.issueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {' · '}<span className="font-mono text-xs">{cert.certificateNumber}</span>
                  </p>
                </div>
                {cert.downloadUrl && (
                  <a href={cert.downloadUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center gap-1">
                    <Download size={14} /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <CreditCard size={22} className="text-blue-500" /> Payment History
        </h2>
        {isLoadingPayments ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : payments.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Course</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 text-slate-600">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 font-medium text-slate-900">{p.courseTitle || '—'}</td>
                    <td className="py-3 text-slate-700">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        p.status === 'captured' ? 'bg-green-100 text-green-700' :
                        p.status === 'refunded' ? 'bg-yellow-100 text-yellow-700' :
                        p.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {p.status === 'captured' && (
                        <button onClick={() => handleDownloadReceipt(p)} className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
                          <Download size={12} /> Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
