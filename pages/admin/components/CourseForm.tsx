import React, { useRef } from 'react';

import { Input } from '../../../components';

import { BundleCoursePicker } from './BundleCoursePicker';

import type { AdminCourse, CourseFormData, CourseType } from '../../../types';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  const autoSlugRef = useRef<string>('');

  const handleTitleChange = (title: string) => {
    const newAutoSlug = slugify(title);
    const shouldAutoUpdate = !formData.slug || formData.slug === autoSlugRef.current;
    autoSlugRef.current = newAutoSlug;
    update({
      title,
      ...(shouldAutoUpdate ? { slug: newAutoSlug } : {}),
    });
  };

  const isSlugValid = !formData.slug || SLUG_PATTERN.test(formData.slug);

  return (
    <div className="space-y-4">
      <Input
        label="Title *"
        type="text"
        value={formData.title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Course title"
      />
      <Input
        label="Slug *"
        type="text"
        value={formData.slug}
        onChange={(e) => update({ slug: e.target.value })}
        placeholder="course-slug"
        error={!isSlugValid ? 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "my-course-1")' : undefined}
      />
      <div>
        <label htmlFor="course-description" className="block text-xs font-semibold t-text-2 mb-1.5">Description *</label>
        <textarea
          id="course-description"
          value={formData.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={4}
          className="w-full t-input-bg t-border border rounded-lg px-3.5 py-2.5 text-sm t-text placeholder:t-text-3 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition duration-150"
          placeholder="Course description"
        />
      </div>
      <Input
        label="Price (₹ in rupees) *"
        type="number"
        step="0.01"
        min="0"
        value={formData.price}
        onChange={(e) => update({ price: e.target.value })}
        placeholder="1999"
      />
      <Input
        label="Thumbnail URL"
        type="url"
        value={formData.thumbnail}
        onChange={(e) => update({ thumbnail: e.target.value })}
        placeholder="https://..."
      />
      <Input
        label="Hero Video ID"
        type="text"
        value={formData.heroVideoId || ''}
        onChange={(e) => update({ heroVideoId: e.target.value || undefined })}
        placeholder="Bunny Stream video GUID (optional)"
        hint="Used as the hero/preview video on the course page"
      />
      <div>
        <label htmlFor="course-type" className="block text-xs font-semibold t-text-2 mb-1.5">Type *</label>
        <select
          id="course-type"
          value={formData.type}
          onChange={(e) => {
            const newType = e.target.value as CourseType;
            update({ type: newType });
            if (newType !== 'BUNDLE') {onBundledCourseIdsChange([]);}
          }}
          className="w-full t-input-bg t-border border rounded-lg px-3.5 py-2.5 text-sm t-text outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition duration-150"
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
        <label className="block text-xs font-semibold t-text-2 mb-1.5">Features</label>
        {formData.features.map((feature, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={feature}
              onChange={(e) => {
                const newFeatures = [...formData.features];
                newFeatures[index] = e.target.value;
                update({ features: newFeatures });
              }}
              placeholder="Feature description"
              containerClassName="flex-1"
            />
            {formData.features.length > 1 && (
              <button
                onClick={() => update({ features: formData.features.filter((_, i) => i !== index) })}
                className="px-3 t-status-danger border hover:opacity-80 rounded-lg"
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
