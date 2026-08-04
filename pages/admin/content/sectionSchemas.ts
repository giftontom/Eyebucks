/**
 * SECTION_SCHEMAS — the single source of truth for the CMS Content editor.
 *
 * The admin ContentPage dropdown, its typed per-section sub-forms, and the
 * list grouping all derive from this registry, so they cannot drift. The DB
 * `site_content_section_check` constraint (migration 033) must allow every
 * `section` key listed here — keep the two in lockstep.
 *
 * Each section serializes its typed fields into the row's `metadata` JSON; the
 * data model and siteContent API are unchanged. An "Advanced (JSON)" escape
 * hatch in the editor still allows raw metadata editing and round-trips any
 * unknown/legacy keys.
 *
 * NOTE: `settings` is intentionally absent — those rows are owned by
 * SettingsPage (matched by title=key); exposing them here would let the two
 * surfaces fight over the same rows.
 */
import type { ImageFolder } from '../../../services/api/siteImages.api';

export type FieldType =
  | 'text'
  | 'url'
  | 'number'
  | 'boolean'
  | 'select'
  | 'string-array'
  | 'image'
  | 'color';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  /** metadata key this field reads/writes, e.g. "role". */
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[]; // for type 'select'
  default?: unknown;
  folder?: ImageFolder; // for type 'image'
  aspect?: string; // preview aspect for type 'image'
}

export type SectionGroup = 'Landing copy' | 'Social proof' | 'FAQ' | 'Banner' | 'Showcase';

export interface SectionSchema {
  section: string;
  label: string;
  group: SectionGroup;
  titleLabel: string;
  titlePlaceholder?: string;
  bodyLabel: string;
  bodyPlaceholder?: string;
  bodyMultiline?: boolean;
  /** Typed metadata fields rendered as a sub-form. */
  fields: FieldDef[];
  /** Hidden from the "create" dropdown (still editable if rows already exist). */
  deprecated?: boolean;
  /** Whether the core `title`/`body` columns are used by this section (default true). */
  coreTitle?: boolean;
  coreBody?: boolean;
  /** "Copy singleton" — only the first (lowest order_index) row is read by the storefront. */
  singleton?: boolean;
}

const ICON_OPTIONS_VALUE: FieldOption[] = [
  { value: 'book', label: 'Book' },
  { value: 'award', label: 'Award' },
  { value: 'video', label: 'Video' },
  { value: 'palette', label: 'Palette' },
  { value: 'layers', label: 'Layers' },
  { value: 'users', label: 'Users' },
];

const ICON_OPTIONS_CREATORS: FieldOption[] = [
  { value: 'dollar', label: 'Dollar' },
  { value: 'trending', label: 'Trending' },
  { value: 'file', label: 'File' },
  { value: 'zap', label: 'Zap' },
  { value: 'camera', label: 'Camera' },
  { value: 'instagram', label: 'Instagram' },
];

export const SECTION_SCHEMAS: Record<string, SectionSchema> = {
  faq: {
    section: 'faq',
    label: 'FAQ',
    group: 'FAQ',
    titleLabel: 'Question',
    titlePlaceholder: 'What gear do I need to start?',
    bodyLabel: 'Answer',
    bodyPlaceholder: 'Just a phone and curiosity…',
    bodyMultiline: true,
    fields: [],
  },
  testimonial: {
    section: 'testimonial',
    label: 'Testimonial',
    group: 'Social proof',
    titleLabel: 'Student name',
    titlePlaceholder: 'Rahul M.',
    bodyLabel: 'Quote',
    bodyPlaceholder: 'Went from auto-mode to paid gigs in 4 months…',
    bodyMultiline: true,
    fields: [
      { key: 'course', label: 'Course', type: 'text', placeholder: 'Cinematography Masterclass' },
      { key: 'rating', label: 'Rating (1–5)', type: 'number', default: 5 },
      { key: 'image', label: 'Avatar', type: 'image', folder: 'testimonials', aspect: 'aspect-square' },
    ],
  },
  instructors: {
    section: 'instructors',
    label: 'Instructor',
    group: 'Social proof',
    titleLabel: 'Instructor name',
    titlePlaceholder: 'Shahul Ameen',
    bodyLabel: 'Bio',
    bodyPlaceholder: 'Specialist in DaVinci Resolve workflows…',
    bodyMultiline: true,
    fields: [
      { key: 'role', label: 'Role', type: 'text', required: true, placeholder: 'Colorist & Post-Production Lead' },
      { key: 'photo', label: 'Photo', type: 'image', folder: 'instructors', aspect: 'aspect-square' },
    ],
  },
  value_cards: {
    section: 'value_cards',
    label: 'Value Card',
    group: 'Landing copy',
    titleLabel: 'Card title',
    titlePlaceholder: 'Practical Learning',
    bodyLabel: 'Description',
    bodyPlaceholder: 'Hands-on projects with professional raw footage…',
    bodyMultiline: true,
    fields: [
      { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS_VALUE, default: 'book' },
      { key: 'bullets', label: 'Bullets (one per line)', type: 'string-array', help: 'Each line becomes a bullet point.' },
    ],
  },
  creators: {
    section: 'creators',
    label: 'Creators Academy Card',
    group: 'Landing copy',
    titleLabel: 'Card title',
    titlePlaceholder: 'Brand Deal Ready',
    bodyLabel: 'Description',
    bodyPlaceholder: 'Scripts, rate cards, and pitch decks…',
    bodyMultiline: true,
    fields: [
      { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS_CREATORS, default: 'zap' },
    ],
  },
  banner: {
    section: 'banner',
    label: 'Announcement Banner',
    group: 'Banner',
    titleLabel: 'Headline',
    titlePlaceholder: 'New cohort starting soon',
    bodyLabel: 'Sub-text',
    bodyPlaceholder: 'Enrol before Friday for early-bird pricing.',
    bodyMultiline: true,
    fields: [
      { key: 'bgColor', label: 'Background color', type: 'color' },
      { key: 'textColor', label: 'Text color', type: 'color' },
      { key: 'linkUrl', label: 'Link URL', type: 'url', placeholder: 'https://…' },
      { key: 'linkText', label: 'Link text', type: 'text', default: 'Learn more' },
      { key: 'dismissible', label: 'Dismissible', type: 'boolean', default: true },
    ],
  },
  showcase: {
    section: 'showcase',
    label: 'Showcase',
    group: 'Showcase',
    titleLabel: 'Title',
    bodyLabel: 'Description',
    bodyMultiline: true,
    deprecated: true,
    fields: [
      { key: 'image', label: 'Image', type: 'image', folder: 'showcase', aspect: 'aspect-video' },
      { key: 'type', label: 'Type', type: 'text', placeholder: 'Color Grading' },
    ],
  },

  // ---- Copy singletons (one row each; storefront reads the first row) ----
  hero: {
    section: 'hero',
    label: 'Hero',
    group: 'Landing copy',
    singleton: true,
    titleLabel: 'Headline (line 1)',
    titlePlaceholder: 'Master the Craft',
    bodyLabel: 'Subtitle',
    bodyMultiline: true,
    fields: [
      { key: 'headline2', label: 'Headline (line 2)', type: 'text', placeholder: 'of Filmmaking.' },
      { key: 'pill', label: 'Announcement pill', type: 'text' },
      { key: 'ctaPrimaryGuest', label: 'Primary CTA (logged-out)', type: 'text' },
      { key: 'ctaPrimaryUser', label: 'Primary CTA (logged-in)', type: 'text' },
      { key: 'ctaSecondary', label: 'Secondary CTA', type: 'text' },
      { key: 'statCoursesSuffix', label: 'Courses stat suffix', type: 'text', help: 'Text after the live course count, e.g. "+ Courses".' },
      { key: 'stat2', label: 'Stat 2', type: 'text' },
      { key: 'stat3', label: 'Stat 3', type: 'text' },
    ],
  },
  hero_slides: {
    section: 'hero_slides',
    label: 'Hero Slide',
    group: 'Landing copy',
    coreBody: false,
    titleLabel: 'Slide caption',
    titlePlaceholder: 'Masterclass Series',
    bodyLabel: 'Body',
    fields: [
      { key: 'image', label: 'Slide image', type: 'image', folder: 'hero', aspect: 'aspect-video' },
    ],
  },
  social_proof: {
    section: 'social_proof',
    label: 'Social Proof Ticker',
    group: 'Social proof',
    singleton: true,
    coreTitle: false,
    coreBody: false,
    titleLabel: 'Title',
    bodyLabel: 'Body',
    fields: [
      { key: 'items', label: 'Ticker items (one per line)', type: 'string-array', help: 'Each line is a ticker item, e.g. "10,000+ Students".' },
    ],
  },
  featured_copy: {
    section: 'featured_copy',
    label: 'Featured Courses Copy',
    group: 'Landing copy',
    singleton: true,
    titleLabel: 'Heading',
    bodyLabel: 'Subheading',
    bodyMultiline: true,
    fields: [
      { key: 'pill', label: 'Eyebrow / pill', type: 'text' },
      { key: 'ctaLabel', label: 'CTA label', type: 'text' },
    ],
  },
  how_it_works: {
    section: 'how_it_works',
    label: 'How It Works Copy',
    group: 'Landing copy',
    singleton: true,
    titleLabel: 'Heading',
    bodyLabel: 'Subheading',
    bodyMultiline: true,
    fields: [
      { key: 'pill', label: 'Eyebrow / pill', type: 'text' },
    ],
  },
  value_props_copy: {
    section: 'value_props_copy',
    label: 'Value Props Header',
    group: 'Landing copy',
    singleton: true,
    titleLabel: 'Heading',
    bodyLabel: 'Subheading',
    bodyMultiline: true,
    fields: [
      { key: 'pill', label: 'Eyebrow / pill', type: 'text' },
      { key: 'footerLinkLabel', label: 'Footer link label', type: 'text' },
    ],
  },
  instructors_copy: {
    section: 'instructors_copy',
    label: 'Instructors Header',
    group: 'Social proof',
    singleton: true,
    titleLabel: 'Heading',
    bodyLabel: 'Subheading',
    bodyMultiline: true,
    fields: [
      { key: 'pill', label: 'Eyebrow / pill', type: 'text' },
    ],
  },
  community_copy: {
    section: 'community_copy',
    label: 'Community Header & Discord',
    group: 'Social proof',
    singleton: true,
    titleLabel: 'Heading',
    bodyLabel: 'Subheading',
    bodyMultiline: true,
    fields: [
      { key: 'pill', label: 'Eyebrow / pill', type: 'text' },
      { key: 'verifiedLabel', label: 'Verified badge label', type: 'text' },
      { key: 'discordEyebrow', label: 'Discord eyebrow', type: 'text' },
      { key: 'discordTitle', label: 'Discord title', type: 'text' },
      { key: 'discordBody', label: 'Discord body', type: 'text' },
      { key: 'discordCtaLabel', label: 'Discord CTA label', type: 'text' },
      { key: 'discordUrl', label: 'Discord URL', type: 'url' },
      { key: 'discordFootnote', label: 'Discord footnote', type: 'text' },
    ],
  },
  creators_copy: {
    section: 'creators_copy',
    label: 'Creators Academy Header',
    group: 'Landing copy',
    singleton: true,
    titleLabel: 'Heading',
    bodyLabel: 'Subheading',
    bodyMultiline: true,
    fields: [
      { key: 'pill', label: 'Eyebrow / pill', type: 'text' },
    ],
  },
  pricing_copy: {
    section: 'pricing_copy',
    label: 'Pricing Copy',
    group: 'Landing copy',
    singleton: true,
    titleLabel: 'Heading',
    bodyLabel: 'Subheading',
    bodyMultiline: true,
    fields: [
      { key: 'pill', label: 'Eyebrow / pill', type: 'text' },
      { key: 'popularLabel', label: '"Most Popular" badge', type: 'text' },
      { key: 'paymentNote', label: 'Payment note', type: 'text' },
      { key: 'ticketLabel', label: 'Ticket label', type: 'text' },
      { key: 'trustBadges', label: 'Trust badges (one per line)', type: 'string-array' },
    ],
  },
  closing: {
    section: 'closing',
    label: 'Closing CTA & Newsletter',
    group: 'Landing copy',
    singleton: true,
    coreBody: false,
    titleLabel: 'Heading',
    bodyLabel: 'Body',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'ctaHeading', label: 'CTA heading', type: 'text' },
      { key: 'ctaBody', label: 'CTA body', type: 'text' },
      { key: 'ctaLabel', label: 'CTA label', type: 'text' },
      { key: 'guarantee1', label: 'Guarantee chip 1', type: 'text' },
      { key: 'guarantee2', label: 'Guarantee chip 2', type: 'text' },
      { key: 'emailHeading', label: 'Email heading', type: 'text' },
      { key: 'emailSubtext', label: 'Email subtext', type: 'text' },
      { key: 'emailPlaceholder', label: 'Email placeholder', type: 'text' },
      { key: 'subscribeLabel', label: 'Subscribe button', type: 'text' },
      { key: 'emailSuccessHeading', label: 'Success heading', type: 'text' },
      { key: 'emailSuccessSubtext', label: 'Success subtext', type: 'text' },
    ],
  },
};

export const GROUP_ORDER: SectionGroup[] = [
  'Landing copy',
  'Social proof',
  'FAQ',
  'Banner',
  'Showcase',
];

/** Sections offered in the "create" dropdown (deprecated ones excluded). */
export const CREATE_SECTIONS: SectionSchema[] = Object.values(SECTION_SCHEMAS).filter(
  (s) => !s.deprecated,
);

/** Seed a metadata object from a schema's field defaults. */
export function defaultMetaFor(section: string): Record<string, unknown> {
  const schema = SECTION_SCHEMAS[section];
  if (!schema) { return {}; }
  const meta: Record<string, unknown> = {};
  for (const f of schema.fields) {
    if (f.default !== undefined) { meta[f.key] = f.default; }
  }
  return meta;
}
