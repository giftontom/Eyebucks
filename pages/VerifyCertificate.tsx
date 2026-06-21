import { CheckCircle2, Loader2, Search, ShieldX, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '../components/Button';
import { Input } from '../components/Input';

import { certificatesApi } from '../services/api/certificates.api';

import type { CertificateVerification } from '../services/api/certificates.api';

type VerifyState = 'idle' | 'loading' | 'valid' | 'revoked' | 'notfound' | 'error';

const fmtDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4 px-6 py-3">
    <dt className="text-sm t-text-3 shrink-0">{label}</dt>
    <dd className={`text-sm font-medium t-text text-right break-words ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
  </div>
);

const ResultCard: React.FC<{ result: CertificateVerification; revoked: boolean }> = ({ result, revoked }) => (
  <div className="t-card t-border border rounded-2xl overflow-hidden shadow-sm">
    <div
      className="flex items-center gap-3 px-6 py-4"
      style={{ background: revoked ? 'var(--status-danger-bg)' : 'var(--status-success-bg)' }}
    >
      {revoked
        ? <ShieldX size={26} style={{ color: 'var(--status-danger-text)' }} />
        : <CheckCircle2 size={26} style={{ color: 'var(--status-success-text)' }} />}
      <div>
        <p className="font-bold" style={{ color: revoked ? 'var(--status-danger-text)' : 'var(--status-success-text)' }}>
          {revoked ? 'Certificate Revoked' : 'Certificate Verified'}
        </p>
        <p className="text-xs t-text-2">
          {revoked
            ? 'This certificate is no longer valid.'
            : 'This is a genuine Eyebuckz certificate.'}
        </p>
      </div>
    </div>
    <dl className="divide-y t-divide">
      <Row label="Issued to" value={result.studentName} />
      <Row label="Course" value={result.courseTitle} />
      <Row label="Issue date" value={fmtDate(result.issueDate)} />
      <Row label="Certificate no." value={result.certificateNumber} mono />
      <Row label="Status" value={result.status} />
    </dl>
  </div>
);

const ErrorState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="text-center py-10">
    <div className="flex justify-center mb-4" style={{ color: 'var(--status-danger-text)' }}>
      <XCircle size={40} />
    </div>
    <h2 className="text-lg font-bold t-text mb-1">{title}</h2>
    <p className="t-text-2 text-sm max-w-sm mx-auto">{body}</p>
  </div>
);

export const VerifyCertificate: React.FC = () => {
  const { certificateNumber: paramNumber } = useParams<{ certificateNumber: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState(paramNumber ?? '');
  const [state, setState] = useState<VerifyState>('idle');
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runVerify = useCallback(async (num: string) => {
    const trimmed = num.trim();
    if (!trimmed) { return; }
    setState('loading');
    setResult(null);
    setErrorMsg('');
    try {
      const cert = await certificatesApi.verifyCertificate(trimmed);
      if (!cert) { setState('notfound'); return; }
      setResult(cert);
      setState(cert.status === 'REVOKED' ? 'revoked' : 'valid');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Verification failed. Please try again.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (paramNumber) {
      setInput(paramNumber);
      void runVerify(paramNumber);
    }
  }, [paramNumber, runVerify]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) { return; }
    navigate(`/verify/${encodeURIComponent(trimmed)}`);
    void runVerify(trimmed);
  };

  return (
    <div className="min-h-[70vh] t-bg py-12 px-4">
      <Helmet><title>Verify Certificate · Eyebuckz</title></Helmet>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold t-text mb-2">Verify a Certificate</h1>
          <p className="t-text-2 text-sm">Enter a certificate number to confirm it is authentic and was issued by Eyebuckz.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="EYEBUCKZ-XXXXXXXX-XXXXXXXXXXXX"
              aria-label="Certificate number"
              leadingIcon={<Search size={16} />}
            />
          </div>
          <Button type="submit" variant="primary" loading={state === 'loading'}>
            Verify
          </Button>
        </form>

        {state === 'loading' && (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin t-text-3" size={32} /></div>
        )}
        {(state === 'valid' || state === 'revoked') && result && (
          <ResultCard result={result} revoked={state === 'revoked'} />
        )}
        {state === 'notfound' && (
          <ErrorState
            title="No certificate found"
            body="We could not find a certificate with that number. Check for typos and try again."
          />
        )}
        {state === 'error' && <ErrorState title="Verification failed" body={errorMsg} />}
      </div>
    </div>
  );
};
