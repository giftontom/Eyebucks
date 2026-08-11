import { BookOpen, Layers, Lock, User, Zap, Star } from 'lucide-react';
import React from 'react';

import { Button, ShareButton, TrustBadges, WishlistButton } from '../../components';
import { formatPrice } from '../../utils/format';
import { CourseType } from '../../types';

import type { Course } from '../../types';

interface CtaConfig {
  text: string;
  icon?: React.ReactElement;
  disabled: boolean;
}

interface Props {
  course: Course;
  hasAccess: boolean;
  ctaConfig: CtaConfig;
  onCta: () => void;
  /** Entitlement-based upgrade quote (module owner → bundle). */
  upgradeQuote?: { creditPaise: number; finalPrice: number } | null;
}

export const CourseDetailsSidebar: React.FC<Props> = ({ course, hasAccess, ctaConfig, onCta, upgradeQuote }) => (
  <div className="sticky top-24 t-card border t-border rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-none">
    {!hasAccess && upgradeQuote ? (
      <div className="mb-8">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-lg t-text-3 line-through">{formatPrice(course.price)}</span>
          <h3 className="text-4xl font-bold t-text">{formatPrice(upgradeQuote.finalPrice)}</h3>
        </div>
        <div className="t-status-success border rounded-lg px-3 py-2 mt-3">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Zap size={14} />
            You've already paid {formatPrice(upgradeQuote.creditPaise)} — it's credited to your upgrade.
          </p>
        </div>
      </div>
    ) : !hasAccess && (
      <>
        <h3 className="text-4xl font-bold t-text mb-2">{formatPrice(course.price)}</h3>
        <p className="t-text-2 text-sm mb-8">One-time payment. Lifetime access.</p>
      </>
    )}
    {hasAccess && (
      <div className="t-status-success border rounded-xl p-4 mb-6">
        <p className="font-bold text-sm flex items-center gap-2">
          <Zap size={16} />
          You're enrolled in this course
        </p>
      </div>
    )}

    <Button
      onClick={onCta}
      disabled={ctaConfig.disabled}
      variant="primary"
      size="lg"
      fullWidth
      rightIcon={ctaConfig.icon}
      className="mb-4 hover:-translate-y-1"
    >
      {ctaConfig.text}
    </Button>

    {!hasAccess && (
      <TrustBadges variant="grid" className="mb-2" />
    )}

    {course.type === CourseType.BUNDLE && course.bundledCourses && course.bundledCourses.length > 0 && (
      <div className="mt-6 border-t t-border pt-6">
        <h4 className="text-sm font-bold t-text mb-3 flex items-center gap-2">
          <Layers size={16} className="text-brand-600" /> Includes {course.bundledCourses.length} Courses
        </h4>
        <div className="space-y-2">
          {course.bundledCourses.map((bc) => (
            <div key={bc.id} className="flex items-center gap-2 text-sm t-text-2">
              <BookOpen size={14} className="text-brand-500 flex-shrink-0" />
              <span className="truncate">{bc.title}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="flex items-center gap-3 mt-4">
      <WishlistButton courseId={course.id} className="flex-1 t-card t-border border py-2 rounded-lg justify-center hover:border-brand-500/50 t-text-2" />
      <ShareButton
        title={course.title}
        text={`Check out ${course.title} on Eyebuckz`}
        className="flex-1 t-card t-border border py-2 rounded-lg justify-center hover:border-brand-500/50 t-text-2"
      />
    </div>

    <div className="space-y-4 mt-8 border-t t-border pt-6">
      {typeof course.rating === 'number' && course.rating > 0 && (
        <div className="flex items-center gap-3 text-sm t-text">
          <Star size={18} style={{ color: 'var(--color-rating-star)' }} fill="currentColor" />
          <span className="font-bold">{course.rating.toFixed(1)}</span>
          <span className="t-text-2">rating</span>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm t-text-2">
        <User size={18} className="text-brand-600" />
        <span>Beginner to Advanced</span>
      </div>
      <div className="flex items-center gap-3 text-sm t-text-2">
        <Zap size={18} className="text-brand-600" />
        <span>Instant Access</span>
      </div>
      <div className="flex items-center gap-3 text-sm t-text-2">
        <Lock size={18} className="text-brand-600" />
        <span>Secure Payment</span>
      </div>
    </div>
  </div>
);
