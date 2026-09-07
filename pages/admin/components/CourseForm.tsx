import React, { useRef, useState } from 'react';

import { ImageUpload, Input } from '../../../components';
import { VideoUploader } from '../../../components/VideoUploader';

import { BundleAssetPicker } from './BundleAssetPicker';
import { BundleCoursePicker } from './BundleCoursePicker';
import { VideoLibraryPicker } from './VideoLibraryPicker';

import type { AdminCourse, AdminDigitalAsset, CourseFormData, CourseType, CourseLanguage } from '../../../types';

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
  bundledAssetIds: string[];
  onBundledAssetIdsChange: (ids: string[]) => void;
  assets: AdminDigitalAsset[]; // For bundle asset picker
}

export const CourseForm: React.FC<CourseFormProps> = ({
  formData,
  onChange,
  bundledCourseIds,
  onBundledCourseIdsChange,
  courses,
  bundledAssetIds,
  onBundledAssetIdsChange,
  assets,
}) => {
  const update = (partial: Partial<CourseFormData>) => onChange({ ...formData, ...partial });
  const autoSlugRef = useRef<string>('');
  const [showVideoPicker, setShowVideoPicker] = useState(false);

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

  // The DB enforces compare_price > price (migration 047). Say so here rather
  // than letting the admin discover it as a constraint violation on save.
  const comparePriceError =
    formData.comparePrice && Number(formData.comparePrice) <= Number(formData.price)
      ? 'Actual price must be higher than the offer price.'
      : undefined;

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
      {/* Offer price is what the student is charged; the actual price is the
          optional struck-through "MRP" shown next to it. Same pair the digital
          asset editor already uses. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Offer price (₹ in rupees) *"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => update({ price: e.target.value })}
          placeholder="1999"
          hint="What the student actually pays at checkout."
        />
        <Input
          label="Actual price (₹ in rupees)"
          type="number"
          step="0.01"
          min="0"
          value={formData.comparePrice}
          onChange={(e) => update({ comparePrice: e.target.value })}
          placeholder="optional"
          hint="Shown struck through beside the offer price. Leave blank for no discount."
          error={comparePriceError}
        />
      </div>
      <ImageUpload
        label="Thumbnail"
        value={formData.thumbnail}
        onChange={(url) => update({ thumbnail: url })}
        folder="courses"
        aspect="aspect-video"
        allowUrlInput
      />
      <div className="space-y-2">
        <Input
          label="Hero / Trailer Video"
          type="text"
          value={formData.heroVideoId || ''}
          onChange={(e) => update({ heroVideoId: e.target.value || undefined })}
          placeholder="Bunny Stream video GUID (optional)"
          hint="Plays as the trailer on the course page. Paste a GUID, pick from the library, or upload below. Clear the field to remove."
        />
        <button
          type="button"
          onClick={() => setShowVideoPicker(true)}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Browse video library…
        </button>
        <VideoUploader
          onUploadComplete={(v) => update({ heroVideoId: v.publicId })}
          onRemove={() => update({ heroVideoId: undefined })}
        />
        <VideoLibraryPicker
          open={showVideoPicker}
          onClose={() => setShowVideoPicker(false)}
          onSelect={(v) => {
            update({ heroVideoId: v.guid });
            setShowVideoPicker(false);
          }}
        />
      </div>
      <div>
        <label htmlFor="course-type" className="block text-xs font-semibold t-text-2 mb-1.5">Type *</label>
        <select
          id="course-type"
          value={formData.type}
          onChange={(e) => {
            const newType = e.target.value as CourseType;
            update({ type: newType });
            if (newType !== 'BUNDLE') {
              onBundledCourseIdsChange([]);
              onBundledAssetIdsChange([]);
            }
          }}
          className="w-full t-input-bg t-border border rounded-lg px-3.5 py-2.5 text-sm t-text outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition duration-150"
        >
          <option value="MODULE">Module</option>
          <option value="BUNDLE">Bundle</option>
        </select>
      </div>

      <div>
        <label htmlFor="course-language" className="block text-xs font-semibold t-text-2 mb-1.5">Language *</label>
        <select
          id="course-language"
          value={formData.language}
          onChange={(e) => update({ language: e.target.value as CourseLanguage })}
          className="w-full t-input-bg t-border border rounded-lg px-3.5 py-2.5 text-sm t-text outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition duration-150"
        >
          <option value="EN">English</option>
          <option value="ML">Malayalam (മലയാളം)</option>
        </select>
        <p className="text-xs t-text-3 mt-1.5">Storefront lists this course only to visitors browsing in this language.</p>
      </div>

      {formData.type === 'BUNDLE' && (
        <>
          <BundleCoursePicker
            courses={courses}
            selectedIds={bundledCourseIds}
            onChange={onBundledCourseIdsChange}
          />
          <BundleAssetPicker
            assets={assets}
            selectedIds={bundledAssetIds}
            onChange={onBundledAssetIdsChange}
          />
        </>
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
