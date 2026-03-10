import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { adminApi } from '../../services/api/admin.api';
import { translateAdminError } from '../../utils/adminErrors';

import { useAdmin } from './AdminContext';
import { BundleCoursePicker } from './components/BundleCoursePicker';
import { CourseForm } from './components/CourseForm';
import { ModuleManager } from './components/ModuleManager';

import type { CourseType } from '../../types';

export const CourseEditorPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { showToast, courses, refreshCourses } = useAdmin();
  const isEditing = !!courseId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [courseType, setCourseType] = useState<CourseType>('MODULE');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    thumbnail: '',
    type: 'MODULE' as CourseType,
    features: [''],
    heroVideoId: undefined as string | undefined,
  });

  const [bundledCourseIds, setBundledCourseIds] = useState<string[]>([]);

  // Load existing course data
  useEffect(() => {
    if (!isEditing) {return;}

    const loadCourse = async () => {
      try {
        setLoading(true);
        // Find in cached courses or fetch
        const allCourses = courses.length > 0 ? courses : (await adminApi.getCourses()).courses;
        const course = allCourses.find(c => c.id === courseId);

        if (!course) {
          showToast('Course not found', 'error');
          navigate('/admin/courses');
          return;
        }

        setFormData({
          title: course.title,
          slug: course.slug,
          description: course.description,
          price: String(course.price / 100),
          thumbnail: course.thumbnail || '',
          type: course.type as CourseType,
          features: course.features.length > 0 ? course.features : [''],
          heroVideoId: (course as any).heroVideoId || undefined,
        });
        setCourseType(course.type as CourseType);

        if (course.type === 'BUNDLE') {
          try {
            const res = await adminApi.getBundleCourses(course.id);
            setBundledCourseIds(res.courseIds);
          } catch {
            setBundledCourseIds([]);
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load course', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, isEditing, courses]);

  const handleFormChange = (data: typeof formData) => {
    setFormData(data);
    setCourseType(data.type);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.description || !formData.price || !formData.type) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (Number(formData.price) <= 0 || isNaN(Number(formData.price))) {
      showToast('Price must be a positive number', 'error');
      return;
    }
    if (formData.type === 'BUNDLE' && bundledCourseIds.length === 0) {
      showToast('Please select at least one course for this bundle', 'error');
      return;
    }

    setSaving(true);
    try {
      const courseData = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        price: Math.round(Number(formData.price) * 100),
        thumbnail: formData.thumbnail || undefined,
        type: formData.type,
        features: formData.features.filter(f => f.trim()),
        heroVideoId: formData.heroVideoId || undefined,
      };

      if (isEditing && courseId) {
        await adminApi.updateCourse(courseId, courseData);
        if (formData.type === 'BUNDLE') {
          await adminApi.setBundleCourses(courseId, bundledCourseIds);
        }
        showToast('Course updated!', 'success');
      } else {
        const res = await adminApi.createCourse(courseData);
        if (formData.type === 'BUNDLE' && res.course?.id) {
          await adminApi.setBundleCourses(res.course.id, bundledCourseIds);
        }
        showToast('Course created!', 'success');
        // Navigate to edit page for the new course (to manage modules)
        if (res.course?.id) {
          navigate(`/admin/courses/${res.course.id}`, { replace: true });
          return;
        }
      }
      refreshCourses();
    } catch (err: unknown) {
      showToast(translateAdminError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="t-text-3">Loading course...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      {/* Back link */}
      <Link to="/admin/courses" className="inline-flex items-center gap-2 text-sm t-text-2 hover:t-text transition">
        <ArrowLeft size={16} /> Back to Courses
      </Link>

      <h2 className="text-2xl font-bold t-text">
        {isEditing ? 'Edit Course' : 'Create New Course'}
      </h2>

      {/* Course form */}
      <div className="t-card t-border border rounded-xl shadow-sm p-6">
        <CourseForm
          formData={formData}
          onChange={handleFormChange}
          bundledCourseIds={bundledCourseIds}
          onBundledCourseIdsChange={setBundledCourseIds}
          courses={courses}
        />

        <div className="flex gap-3 mt-8 pt-6 border-t t-border">
          <button
            onClick={() => navigate('/admin/courses')}
            className="px-6 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2.5 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
          </button>
        </div>
      </div>

      {/* Inline Module Manager (for MODULE type courses being edited) */}
      {isEditing && courseId && courseType === 'MODULE' && (
        <div className="t-card t-border border rounded-xl shadow-sm p-6">
          <ModuleManager courseId={courseId} showToast={showToast} />
        </div>
      )}

      {/* Inline Bundle Course Manager (for BUNDLE type courses being edited) */}
      {isEditing && courseId && courseType === 'BUNDLE' && (
        <div className="t-card t-border border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold t-text mb-4">Bundle Courses</h3>
          <BundleCoursePicker
            courses={courses}
            selectedIds={bundledCourseIds}
            onChange={setBundledCourseIds}
          />
          <button
            onClick={async () => {
              try {
                await adminApi.setBundleCourses(courseId, bundledCourseIds);
                showToast('Bundle courses saved!', 'success');
                refreshCourses();
              } catch (err: any) {
                showToast(err.message || 'Failed to save bundle courses', 'error');
              }
            }}
            className="mt-4 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            Save Bundle Courses
          </button>
        </div>
      )}
    </div>
  );
};
