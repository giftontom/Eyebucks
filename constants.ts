import { SalesDataPoint } from './types/index';

type MockCertificate = {
  id: string;
  courseTitle: string;
  studentName: string;
  issueDate: string;
  downloadUrl: string;
};

export const MOCK_SALES_DATA: SalesDataPoint[] = [
  { date: 'Mon', amount: 12000 },
  { date: 'Tue', amount: 18500 },
  { date: 'Wed', amount: 15000 },
  { date: 'Thu', amount: 24000 },
  { date: 'Fri', amount: 32000 },
  { date: 'Sat', amount: 45000 },
  { date: 'Sun', amount: 38000 },
];

export const MOCK_CERTIFICATES: MockCertificate[] = [
  { id: 'cert_1', courseTitle: 'Complete Content Creation Masterclass', studentName: 'Demo User', issueDate: '2024-02-15', downloadUrl: '#' },
  { id: 'cert_2', courseTitle: 'Creator Editing Workflow', studentName: 'Jane Doe', issueDate: '2024-02-10', downloadUrl: '#' },
];