/**
 * Digital Assets API — downloadable products (LUTs, presets, SFX, templates, PDFs)
 * sold one-time in INR. Mirrors `courses.api.ts` but lighter (no modules/lessons).
 * See ADR-008 (docs/adr/008-digital-assets-feature.md).
 *
 * SECURITY: the private `storage_path` column is NEVER selected by storefront/admin
 * reads here — only the `asset-download-url` Edge Function (service_role) resolves it,
 * and only after an entitlement check. `getDownloadUrl()` is the sole client path to a
 * (short-lived, signed) download link.
 */
import { logger } from '../../utils/logger';
import { escapeOrFilter } from '../../utils/supabaseUtils';
import { supabase } from '../supabase';

import type { DigitalAsset, AdminDigitalAsset, AssetPurchaseWithAsset, AssetFileType, AssetLicense, CourseStatus } from '../../types';
import type {
  DigitalAssetRow,
  DigitalAssetInsert,
  DigitalAssetUpdate,
  AssetPurchaseRow,
} from '../../types/supabase';

// Column list that deliberately OMITS `storage_path` (private) — used for every
// client-facing read. `deleted_at` is included only in the admin list variant.
const STOREFRONT_COLUMNS =
  'id, slug, title, description, price, compare_price, file_type, license, file_size, file_ext, thumbnail, preview_url, version, status, download_count, created_at, updated_at';
// The admin list additionally reads `external_url` so the editor can show and
// change an existing link. It stays OUT of STOREFRONT_COLUMNS: it is a bearer
// URL to the paid file (migration 048). `storage_path` is never selected at
// all — only the entitlement-gated Edge Function resolves that.
const ADMIN_COLUMNS = `${STOREFRONT_COLUMNS}, deleted_at, external_url`;

/** Row shape returned by the safe column lists (no private/internal columns). */
type StorefrontAssetRow = Omit<DigitalAssetRow, 'storage_path' | 'deleted_at' | 'external_url'>;
/** Admin column list keeps `deleted_at` + `external_url` (still no storage_path). */
type AdminAssetRow = Omit<DigitalAssetRow, 'storage_path'>;

function mapAsset(row: StorefrontAssetRow): DigitalAsset {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: row.price,
    comparePrice: row.compare_price,
    fileType: row.file_type,
    license: row.license,
    fileSize: row.file_size,
    fileExt: row.file_ext,
    thumbnail: row.thumbnail || '',
    previewUrl: row.preview_url,
    version: row.version,
    status: row.status,
    downloadCount: row.download_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapAdminAsset(row: AdminAssetRow): AdminDigitalAsset {
  return { ...mapAsset(row), deletedAt: row.deleted_at, externalUrl: row.external_url ?? null };
}

export type AssetSort = 'newest' | 'price-asc' | 'price-desc' | 'popular';

export interface GetAssetsOptions {
  page?: number;
  pageSize?: number;
  /** Filter by file type (LUT, PRESET, ...). Omit for all types. */
  fileType?: AssetFileType;
  /** Case-insensitive search across title + description. */
  search?: string;
  /** Maximum price in paise. 0 or omitted = no price cap. */
  maxPrice?: number;
  /** Sort order. Defaults to 'newest'. */
  sort?: AssetSort;
  /** Add the exact filtered total (`count: 'exact'`). Defaults to true. Pass false
   *  for non-paginated card lists (homepage showcase) to skip the COUNT(*). */
  withCount?: boolean;
}

export interface GetAssetsResult {
  success: boolean;
  assets: DigitalAsset[];
  total: number;
  hasMore: boolean;
}

/** Admin create/update payload (camelCase; mapped to snake_case here). */
export interface DigitalAssetInput {
  slug: string;
  title: string;
  description: string;
  price: number; // paise
  comparePrice?: number | null;
  fileType: AssetFileType;
  license?: AssetLicense;
  /** Private storage path (from admin-asset-upload). Mutually exclusive with `externalUrl`. */
  storagePath?: string | null;
  /** Externally-hosted download, e.g. a Google Drive share link. Mutually exclusive with `storagePath`. */
  externalUrl?: string | null;
  fileSize?: number | null;
  fileExt?: string | null;
  thumbnail?: string;
  previewUrl?: string | null;
  version?: string;
  status?: CourseStatus;
}

export interface AssetDownload {
  downloadUrl: string;
  expiresAt: number;
  filename: string;
}

// Collapse concurrent identical storefront calls (catalog + homepage showcase mount
// on the same tick) into one round-trip — see coursesApi for the same pattern.
const inFlightAssets = new Map<string, Promise<GetAssetsResult>>();

const SORT_COLUMNS: Record<AssetSort, { column: string; ascending: boolean }> = {
  'newest': { column: 'created_at', ascending: false },
  'price-asc': { column: 'price', ascending: true },
  'price-desc': { column: 'price', ascending: false },
  'popular': { column: 'download_count', ascending: false },
};

export const digitalAssetsApi = {
  /** Published asset count via a HEAD request (for "N+ assets" stats). */
  async getAssetCount(): Promise<number> {
    const { count, error } = await supabase
      .from('digital_assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null);
    if (error) { throw new Error(error.message); }
    return count ?? 0;
  },

  /** Fetch published assets with pagination/filter/sort. */
  getAssets(options: GetAssetsOptions = {}): Promise<GetAssetsResult> {
    const key = JSON.stringify(options);
    const pending = inFlightAssets.get(key);
    if (pending) { return pending; }
    const promise = digitalAssetsApi._getAssetsUncached(options).finally(() => {
      inFlightAssets.delete(key);
    });
    inFlightAssets.set(key, promise);
    return promise;
  },

  async _getAssetsUncached(options: GetAssetsOptions = {}): Promise<GetAssetsResult> {
    const { page = 1, pageSize = 12, fileType, search, maxPrice = 0, sort = 'newest', withCount = true } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const orderBy = SORT_COLUMNS[sort] ?? SORT_COLUMNS.newest;

    let query = supabase
      .from('digital_assets')
      .select(STOREFRONT_COLUMNS, withCount ? { count: 'exact' } : undefined)
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null);

    if (fileType) { query = query.eq('file_type', fileType); }
    if (maxPrice > 0) { query = query.lte('price', maxPrice); }
    if (search?.trim()) {
      const s = escapeOrFilter(search.trim());
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    }

    const { data, count, error } = await query
      .order(orderBy.column, { ascending: orderBy.ascending, nullsFirst: false })
      .range(from, to);

    if (error) { throw new Error(error.message); }
    const rows = (data || []) as unknown as StorefrontAssetRow[];
    const assets = rows.map(mapAsset);
    const total = withCount ? (count ?? 0) : assets.length;
    return { success: true, assets, total, hasMore: from + assets.length < total };
  },

  /** Fetch a single published asset by slug (storefront detail page). */
  async getAsset(slug: string): Promise<DigitalAsset | null> {
    const { data, error } = await supabase
      .from('digital_assets')
      .select(STOREFRONT_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null)
      .maybeSingle();
    if (error) { throw new Error(error.message); }
    if (!data) { return null; }
    return mapAsset(data as unknown as StorefrontAssetRow);
  },

  /** Fetch a single published asset by id (checkout page — we navigate with the id). */
  async getAssetById(id: string): Promise<DigitalAsset | null> {
    const { data, error } = await supabase
      .from('digital_assets')
      .select(STOREFRONT_COLUMNS)
      .eq('id', id)
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null)
      .maybeSingle();
    if (error) { throw new Error(error.message); }
    return data ? mapAsset(data as unknown as StorefrontAssetRow) : null;
  },

  /** Whether the current user has an ACTIVE purchase of this asset (drives the
   *  "Owned → Download" CTA). Admin override is handled server-side at download. */
  async checkOwnership(assetId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return false; }
    const { data, error } = await supabase
      .from('asset_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('asset_id', assetId)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    if (error) { throw new Error(error.message); }
    return !!data;
  },

  /** The current user's owned assets ("My Library"). */
  async getOwnedAssets(): Promise<AssetPurchaseWithAsset[]> {
    const { data, error } = await supabase
      .from('asset_purchases')
      .select(`*, digital_assets(${STOREFRONT_COLUMNS})`)
      .eq('status', 'ACTIVE')
      .order('purchased_at', { ascending: false });
    if (error) { throw new Error(error.message); }

    type JoinRow = AssetPurchaseRow & { digital_assets: StorefrontAssetRow | null };
    return ((data || []) as unknown as JoinRow[])
      .filter(r => r.digital_assets)
      .map(r => ({
        id: r.id,
        userId: r.user_id,
        assetId: r.asset_id,
        status: r.status,
        paymentId: r.payment_id,
        orderId: r.order_id,
        amount: r.amount ?? 0,
        downloadCount: r.download_count,
        lastDownloadedAt: r.last_downloaded_at ? new Date(r.last_downloaded_at) : null,
        purchasedAt: new Date(r.purchased_at),
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
        asset: mapAsset(r.digital_assets as StorefrontAssetRow),
      }));
  },

  /**
   * Get a short-lived signed download URL. The Edge Function verifies entitlement
   * (purchase or admin) server-side before minting the link — this is the ONLY way
   * a client obtains a usable download URL.
   */
  async getDownloadUrl(assetId: string): Promise<AssetDownload> {
    const { data, error } = await supabase.functions.invoke('asset-download-url', {
      body: { assetId },
    });
    if (error) {
      logger.error('[digitalAssets] download URL failed:', error);
      throw new Error('Could not generate download link.');
    }
    if (!data?.success || !data?.downloadUrl) {
      throw new Error(data?.error || 'Could not generate download link.');
    }
    return { downloadUrl: data.downloadUrl, expiresAt: data.expiresAt, filename: data.filename };
  },

  // ============================================
  // ADMIN (RLS enforces is_admin() on writes)
  // ============================================

  /** Admin list — includes DRAFT + soft-deleted (admin RLS sees all). */
  async getAdminAssets(): Promise<AdminDigitalAsset[]> {
    const { data, error } = await supabase
      .from('digital_assets')
      .select(ADMIN_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) { throw new Error(error.message); }
    return ((data || []) as unknown as AdminAssetRow[]).map(mapAdminAsset);
  },

  /** Admin fetch single by id (for the editor). */
  async getAdminAsset(id: string): Promise<AdminDigitalAsset | null> {
    const { data, error } = await supabase
      .from('digital_assets')
      .select(ADMIN_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) { throw new Error(error.message); }
    return data ? mapAdminAsset(data as unknown as AdminAssetRow) : null;
  },

  async createAsset(input: DigitalAssetInput): Promise<DigitalAsset> {
    const row: DigitalAssetInsert = {
      slug: input.slug,
      title: input.title,
      description: input.description,
      price: input.price,
      compare_price: input.comparePrice ?? null,
      file_type: input.fileType,
      license: input.license ?? 'PERSONAL',
      storage_path: input.storagePath ?? null,
      external_url: input.externalUrl ?? null,
      file_size: input.fileSize ?? null,
      file_ext: input.fileExt ?? null,
      thumbnail: input.thumbnail ?? '',
      preview_url: input.previewUrl ?? null,
      version: input.version ?? 'v1',
      status: input.status ?? 'DRAFT',
    };
    const { data, error } = await supabase
      .from('digital_assets')
      .insert(row)
      .select(ADMIN_COLUMNS)
      .single();
    if (error) { throw new Error(error.message); }
    return mapAsset(data as unknown as StorefrontAssetRow);
  },

  async updateAsset(id: string, patch: Partial<DigitalAssetInput>): Promise<void> {
    const row: DigitalAssetUpdate = {};
    if (patch.slug !== undefined) { row.slug = patch.slug; }
    if (patch.title !== undefined) { row.title = patch.title; }
    if (patch.description !== undefined) { row.description = patch.description; }
    if (patch.price !== undefined) { row.price = patch.price; }
    if (patch.comparePrice !== undefined) { row.compare_price = patch.comparePrice; }
    if (patch.fileType !== undefined) { row.file_type = patch.fileType; }
    if (patch.license !== undefined) { row.license = patch.license; }
    if (patch.storagePath !== undefined) { row.storage_path = patch.storagePath; }
    if (patch.externalUrl !== undefined) { row.external_url = patch.externalUrl; }
    if (patch.fileSize !== undefined) { row.file_size = patch.fileSize; }
    if (patch.fileExt !== undefined) { row.file_ext = patch.fileExt; }
    if (patch.thumbnail !== undefined) { row.thumbnail = patch.thumbnail; }
    if (patch.previewUrl !== undefined) { row.preview_url = patch.previewUrl; }
    if (patch.version !== undefined) { row.version = patch.version; }
    if (patch.status !== undefined) { row.status = patch.status; }

    const { error } = await supabase.from('digital_assets').update(row).eq('id', id);
    if (error) { throw new Error(error.message); }
  },

  /** Toggle publish/draft. */
  async publishAsset(id: string, status: CourseStatus): Promise<void> {
    const { error } = await supabase.from('digital_assets').update({ status }).eq('id', id);
    if (error) { throw new Error(error.message); }
  },

  /** Soft-delete (archive). */
  async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase
      .from('digital_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { throw new Error(error.message); }
  },

  /** Restore a soft-deleted asset. */
  async restoreAsset(id: string): Promise<void> {
    const { error } = await supabase
      .from('digital_assets')
      .update({ deleted_at: null })
      .eq('id', id);
    if (error) { throw new Error(error.message); }
  },
};
