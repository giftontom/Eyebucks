import { User, Mail, Phone, Award, CreditCard, Download, Check, Edit2, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Badge, statusToVariant, Button, Input, Card } from '../components';
import { useAuth } from '../context/AuthContext';
import { certificatesApi } from '../services/api/certificates.api';
import { paymentsApi } from '../services/api/payments.api';

import type { Payment } from '../services/api/payments.api';
import type { Certificate } from '../types';

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

  const [certsError, setCertsError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const loadCerts = () => {
    setCertsError(null);
    setIsLoadingCerts(true);
    certificatesApi.getUserCertificates()
      .then(setCertificates)
      .catch((err) => setCertsError(err.message || 'Failed to load certificates'))
      .finally(() => setIsLoadingCerts(false));
  };

  const loadPayments = () => {
    setPaymentsError(null);
    setIsLoadingPayments(true);
    paymentsApi.getUserPayments()
      .then(res => setPayments(res.payments))
      .catch((err) => setPaymentsError(err.message || 'Failed to load payments'))
      .finally(() => setIsLoadingPayments(false));
  };

  useEffect(() => {
    loadCerts();
    loadPayments();
  }, []);

  useEffect(() => {
    setNameInput(user?.name || '');
  }, [user?.name]);

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
      setNameInput(user?.name || '');
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
    // Escape user-controlled values before injecting into innerHTML to prevent XSS
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const receiptHtml = `
      <!DOCTYPE html>
      <html><head><title>Receipt - ${esc(payment.receiptNumber || payment.id)}</title>
      <style>body{font-family:system-ui;max-width:600px;margin:40px auto;padding:20px}h1{color:#1a1a1a}table{width:100%;border-collapse:collapse;margin:20px 0}td{padding:8px 0;border-bottom:1px solid #eee}.total{font-size:1.2em;font-weight:bold}.brand{color:#dc2626}</style>
      </head><body>
      <h1>Payment Receipt</h1>
      <p class="brand"><strong>Eyebuckz Academy</strong></p>
      <hr/>
      <table>
        <tr><td><strong>Receipt #</strong></td><td>${esc(payment.receiptNumber || '—')}</td></tr>
        <tr><td><strong>Date</strong></td><td>${new Date(payment.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
        <tr><td><strong>Student</strong></td><td>${esc(user?.name || '—')}</td></tr>
        <tr><td><strong>Email</strong></td><td>${esc(user?.email || '—')}</td></tr>
        <tr><td><strong>Course</strong></td><td>${esc(payment.courseTitle || '—')}</td></tr>
        <tr><td><strong>Payment ID</strong></td><td style="font-size:0.85em">${esc(payment.razorpayPaymentId || '—')}</td></tr>
        <tr><td><strong>Order ID</strong></td><td style="font-size:0.85em">${esc(payment.razorpayOrderId || '—')}</td></tr>
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
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm t-text-2 hover:t-text transition mb-6 group">
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold t-text mb-8">My Profile</h1>

      {/* Profile Card */}
      <Card variant="default" radius="2xl" padding="lg" className="mb-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-3xl font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 space-y-4">
            {/* Name */}
            <div className="flex items-center gap-3">
              <User size={18} className="t-text-3 shrink-0" />
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    size="sm"
                    autoFocus
                  />
                  <Button variant="primary" size="sm" loading={nameSaving} onClick={handleSaveName}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setIsEditingName(false); setNameInput(user?.name || ''); }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold t-text">{user?.name}</span>
                  <button onClick={() => setIsEditingName(true)} className="t-text-3 hover:text-brand-400 transition" aria-label="Edit name">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <Mail size={18} className="t-text-3 shrink-0" />
              <div>
                <span className="t-text-2">{user?.email}</span>
                <p className="text-xs t-text-3 mt-0.5">Your email is managed by Google and cannot be changed here.</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <Phone size={18} className="t-text-3 shrink-0" />
              {user?.phone_e164 ? (
                <span className="t-text-2">{user.phone_e164}</span>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(''); }}
                      placeholder="+15550000000"
                      size="sm"
                      className="w-44"
                      error={phoneError}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      loading={phoneSaving}
                      disabled={!phoneInput}
                      onClick={handleSavePhone}
                    >
                      {phoneSaved ? <Check size={16} /> : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Certificates */}
      <Card variant="default" radius="2xl" padding="lg" className="mb-8">
        <h2 className="text-xl font-bold t-text mb-6 flex items-center gap-2">
          <Award size={22} style={{ color: 'var(--status-warning-text)' }} /> My Certificates
        </h2>
        {isLoadingCerts ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin t-text-3" size={32} /></div>
        ) : certsError ? (
          <div className="text-center py-8">
            <p className="text-sm mb-2" style={{ color: 'var(--status-danger-text)' }}>{certsError}</p>
            <button onClick={loadCerts} className="t-link hover:t-link-hover text-sm font-medium">Try again</button>
          </div>
        ) : certificates.length === 0 ? (
          <p className="t-text-3 text-center py-8">No certificates earned yet. Complete a course to earn one!</p>
        ) : (
          <div className="space-y-4">
            {certificates.map(cert => (
              <div key={cert.id} className="flex items-center justify-between p-4 t-card rounded-xl t-border border">
                <div>
                  <p className="font-semibold t-text">{cert.courseTitle}</p>
                  <p className="text-sm t-text-3">
                    Issued {new Date(cert.issueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {' · '}<span className="font-mono text-xs">{cert.certificateNumber}</span>
                  </p>
                </div>
                {cert.downloadUrl && (
                  <a href={cert.downloadUrl} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 font-medium text-sm flex items-center gap-1">
                    <Download size={14} /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment History */}
      <Card variant="default" radius="2xl" padding="lg">
        <h2 className="text-xl font-bold t-text mb-6 flex items-center gap-2">
          <CreditCard size={22} style={{ color: 'var(--status-info-text)' }} /> Payment History
        </h2>
        {isLoadingPayments ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin t-text-3" size={32} /></div>
        ) : paymentsError ? (
          <div className="text-center py-8">
            <p className="text-sm mb-2" style={{ color: 'var(--status-danger-text)' }}>{paymentsError}</p>
            <button onClick={loadPayments} className="t-link hover:t-link-hover text-sm font-medium">Try again</button>
          </div>
        ) : payments.length === 0 ? (
          <p className="t-text-3 text-center py-8">No transactions yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="t-text-3 text-xs uppercase tracking-wider border-b t-border">
                  <tr>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Course</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="py-3 t-text-2">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 font-medium t-text">{p.courseTitle || '—'}</td>
                      <td className="py-3 t-text-2">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                      <td className="py-3">
                        <Badge variant={statusToVariant(p.status)}>{p.status}</Badge>
                      </td>
                      <td className="py-3">
                        {p.status === 'captured' && (
                          <button onClick={() => handleDownloadReceipt(p)} className="text-brand-400 hover:text-brand-300 text-xs font-medium flex items-center gap-1">
                            <Download size={12} /> Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-3">
              {payments.map(p => (
                <div key={p.id} className="t-card t-border border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium t-text text-sm">{p.courseTitle || '—'}</p>
                    <Badge variant={statusToVariant(p.status)}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs t-text-2">
                    <span>{new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
                    <span className="font-bold t-text">₹{(p.amount / 100).toLocaleString('en-IN')}</span>
                  </div>
                  {p.status === 'captured' && (
                    <button onClick={() => handleDownloadReceipt(p)} className="mt-3 text-brand-400 hover:text-brand-300 text-xs font-medium flex items-center gap-1">
                      <Download size={12} /> Download Receipt
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
