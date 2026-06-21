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
