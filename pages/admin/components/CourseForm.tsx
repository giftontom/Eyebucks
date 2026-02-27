import React from 'react';
import { BundleCoursePicker } from './BundleCoursePicker';
import type { AdminCourse, CourseType } from '../../../types';

interface CourseFormData {
  title: string;
  slug: string;
  description: string;
  price: string;
  thumbnail: string;
  type: CourseType;
  features: string[];
}

interface CourseFormProps {
  formData: CourseFormData;
  onChange: (data: CourseFormData) => void;
  bundledCourseIds: string[];
  onBundledCourseIdsChange: (ids: string[]) => void;
  courses: AdminCourse[]; // For bundle picker
}

export const CourseForm: React.FC<CourseFormProps> = ({
  formData,
  onChange,
  bundledCourseIds,
  onBundledCourseIdsChange,
  courses,
}) => {
  const update = (partial: Partial<CourseFormData>) => onChange({ ...formData, ...partial });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Course title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Slug *</label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => update({ slug: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="course-slug"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={4}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Course description"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Price (₹ in rupees) *</label>
        <input
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => update({ price: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="1999"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Thumbnail URL</label>
        <input
          type="url"
          value={formData.thumbnail}
          onChange={(e) => update({ thumbnail: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
        <select
          value={formData.type}
          onChange={(e) => {
            const newType = e.target.value as CourseType;
            update({ type: newType });
            if (newType !== 'BUNDLE') onBundledCourseIdsChange([]);
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="MODULE">Module</option>
          <option value="BUNDLE">Bundle</option>
        </select>
      </div>

      {formData.type === 'BUNDLE' && (
        <BundleCoursePicker
          courses={courses}
          selectedIds={bundledCourseIds}
          onChange={onBundledCourseIdsChange}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Features</label>
        {formData.features.map((feature, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={feature}
              onChange={(e) => {
                const newFeatures = [...formData.features];
                newFeatures[index] = e.target.value;
                update({ features: newFeatures });
              }}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Feature description"
            />
            {formData.features.length > 1 && (
              <button
                onClick={() => update({ features: formData.features.filter((_, i) => i !== index) })}
                className="px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
              >
                x
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => update({ features: [...formData.features, ''] })}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          + Add Feature
        </button>
      </div>
    </div>
  );
};
