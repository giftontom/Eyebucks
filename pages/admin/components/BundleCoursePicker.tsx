import React from 'react';

import type { AdminCourse } from '../../../types';

interface BundleCoursePickerProps {
  courses: AdminCourse[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const BundleCoursePicker: React.FC<BundleCoursePickerProps> = ({
  courses,
  selectedIds,
  onChange,
}) => {
  const moduleCourses = courses.filter(c => c.type === 'MODULE' && !c.deletedAt);

  return (
    <div>
      <label className="block text-sm font-medium t-text-2 mb-2">Bundled Courses</label>
      <p className="text-xs t-text-2 mb-2">Select the module courses included in this bundle.</p>
      <div className="max-h-48 overflow-y-auto t-border border rounded-lg t-input-bg p-2">
        {moduleCourses.length === 0 ? (
          <p className="text-sm t-text-3 text-center py-4">No module courses available</p>
        ) : (
          moduleCourses.map(c => (
            <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--surface-hover)] cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedIds, c.id]);
                  } else {
                    onChange(selectedIds.filter(id => id !== c.id));
                  }
                }}
                className="rounded t-border text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm t-text">{c.title}</span>
              <span className="text-xs t-text-3 ml-auto">{c._count?.modules || 0} modules</span>
            </label>
          ))
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs t-text-2 mt-1">{selectedIds.length} course{selectedIds.length !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  );
};
