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
      <label className="block text-sm font-medium text-slate-700 mb-2">Bundled Courses</label>
      <p className="text-xs text-slate-500 mb-2">Select the module courses included in this bundle.</p>
      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2">
        {moduleCourses.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No module courses available</p>
        ) : (
          moduleCourses.map(c => (
            <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 cursor-pointer">
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
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-800">{c.title}</span>
              <span className="text-xs text-slate-400 ml-auto">{c._count?.modules || 0} modules</span>
            </label>
          ))
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">{selectedIds.length} course{selectedIds.length !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  );
};
