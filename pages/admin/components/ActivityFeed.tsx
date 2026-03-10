import React from 'react';

import type { RecentActivity } from '../../../types';

interface ActivityFeedProps {
  activity: RecentActivity;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activity }) => {
  const hasEnrollments = activity.recentEnrollments && activity.recentEnrollments.length > 0;
  const hasCertificates = activity.recentCertificates && activity.recentCertificates.length > 0;

  if (!hasEnrollments && !hasCertificates) {
    return (
      <div className="t-card t-border border p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold mb-4 t-text">Recent Activity</h3>
        <p className="t-text-3 text-center py-8">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="t-card t-border border p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-bold mb-4 t-text">Recent Activity</h3>
      <div className="space-y-3">
        {hasEnrollments && (
          <>
            <p className="text-xs font-bold t-text-2 uppercase tracking-wider">Recent Enrollments</p>
            {activity.recentEnrollments.slice(0, 5).map((enrollment: any) => (
              <div key={enrollment.id} className="flex items-center justify-between py-2 border-b t-divide last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full t-status-success flex items-center justify-center text-xs font-bold">
                    {enrollment.userName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium t-text">{enrollment.userName}</p>
                    <p className="text-xs t-text-2">{enrollment.courseTitle}</p>
                  </div>
                </div>
                <span className="text-xs t-text-3">
                  {new Date(enrollment.enrolledAt).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </>
        )}

        {hasCertificates && (
          <>
            <p className="text-xs font-bold t-text-2 uppercase tracking-wider mt-6">Recent Certificates</p>
            {activity.recentCertificates.slice(0, 5).map((cert: any) => (
              <div key={cert.id} className="flex items-center justify-between py-2 border-b t-divide last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full t-status-warning flex items-center justify-center text-xs font-bold">
                    <span role="img" aria-label="trophy">🏆</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium t-text">{cert.studentName}</p>
                    <p className="text-xs t-text-2">{cert.courseTitle}</p>
                  </div>
                </div>
                <span className="text-xs t-text-3">
                  {new Date(cert.issueDate).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
