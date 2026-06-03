import { ChevronDown, ChevronUp, Layers, BookOpen, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

import { Button, Input } from '../../components';
import { Thumbnail } from '../../components/Thumbnail';
import { CourseType } from '../../types';

import type { Course } from '../../types';

const BundleIncludedCourses: React.FC<{ courses: NonNullable<Course['bundledCourses']> }> = ({ courses }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-4 t-card t-border border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition text-sm"
        aria-expanded={expanded}
        aria-label="Toggle bundled courses list"
      >
        <span className="flex items-center gap-2 font-medium t-text">
          <Layers size={14} className="text-brand-400" />
          Includes {courses.length} course{courses.length !== 1 ? 's' : ''}
        </span>
        {expanded ? <ChevronUp size={16} className="t-text-3" /> : <ChevronDown size={16} className="t-text-3" />}
      </button>
      {expanded && (
        <ul className="px-3 pb-3 space-y-1.5">
          {courses.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-xs t-text-2">
              <BookOpen size={12} className="text-brand-500 flex-shrink-0" />
              <span className="truncate">{c.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface Props {
  course: Course;
  couponInput: string;
  onCouponInputChange: (v: string) => void;
  couponApplied: boolean;
  couponLoading: boolean;
  couponError: string;
  couponDiscount: number;
  discountedPrice: number;
  onApplyCoupon: () => void;
}

export const CheckoutSummary: React.FC<Props> = ({
  course,
  couponInput,
  onCouponInputChange,
  couponApplied,
  couponLoading,
  couponError,
  couponDiscount,
  discountedPrice,
  onApplyCoupon,
}) => (
  <div className="p-8 t-card flex flex-col justify-between relative overflow-hidden">
    <div className="relative z-10">
      <h2 className="text-2xl font-bold mb-6 t-text">Order Summary</h2>
      <div className="flex gap-4 mb-6">
        <Thumbnail src={course.thumbnail} alt={course.title} className="w-24 h-16 object-cover rounded-lg t-border border shrink-0" />
        <div>
          <h3 className="font-bold t-text leading-tight">{course.title}</h3>
          <p className="text-sm t-text-2 mt-1">{course.type === CourseType.BUNDLE ? `Bundle • ${course.bundledCourses?.length || 0} Courses` : course.type}</p>
        </div>
      </div>
      {course.type === CourseType.BUNDLE && course.bundledCourses && course.bundledCourses.length > 0 && (
        <BundleIncludedCourses courses={course.bundledCourses} />
      )}
      <div className="mb-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={couponInput}
            onChange={(e) => onCouponInputChange(e.target.value.toUpperCase())}
            placeholder="Coupon code"
            disabled={couponApplied}
            error={couponError}
            containerClassName="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            loading={couponLoading}
            disabled={!couponInput.trim() || couponApplied}
            onClick={onApplyCoupon}
          >
            {couponApplied ? '✓' : 'Apply'}
          </Button>
        </div>
        {couponApplied && <p className="text-xs mt-1" style={{ color: 'var(--status-success-text)' }}>{couponDiscount}% discount applied!</p>}
      </div>

      <div className="border-t t-border pt-4 space-y-2">
        {couponDiscount > 0 && (
          <>
            <div className="flex justify-between t-text-2 text-sm">
              <span>Subtotal</span>
              <span>₹{(course.price / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--status-success-text)' }}>
              <span>Discount ({couponDiscount}%)</span>
              <span>-₹{((course.price - discountedPrice) / 100).toLocaleString()}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-xl font-bold t-text pt-2">
          <span>Total Due</span>
          <span>₹{(discountedPrice / 100).toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div className="relative z-10 flex items-center gap-2 t-text-2 text-sm mt-8 t-card p-3 rounded-lg t-border border">
      <ShieldCheck size={16} style={{ color: 'var(--status-success-text)' }} />
      <span>SSL Secure Payment • 256-bit Encryption</span>
    </div>
  </div>
);
