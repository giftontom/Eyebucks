/**
 * Site Content API - CRUD for dynamic CMS content (FAQs, testimonials, showcase)
 */
import { supabase } from '../supabase';

import type { SiteContentItem } from '../../types';
import type { SiteContentRow, SiteContentUpdate , Json } from '../../types/supabase';

function mapRow(row: SiteContentRow): SiteContentItem {
  return {
    id: row.id,
    section: row.section as SiteContentItem['section'],
    title: row.title,
    body: row.body,
    metadata: (row.metadata || {}) as Record<string, unknown>,
    orderIndex: row.order_index,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const siteContentApi = {
  async getBySection(section: string): Promise<SiteContentItem[]> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('section', section)
      .eq('is_active', true)
      // Deterministic tiebreakers matter more than they look. `order_index`
      // alone is not a total order: three `community_copy` rows all sat at 0,
      // so Postgres returned them in whatever order it liked and the storefront
      // — which reads items[0] for a singleton section — showed a different one
      // on different loads. An admin edit appeared to "revert" at random.
      //
      // `updated_at DESC` breaks the tie toward the row most recently edited,
      // which is what an admin expects after saving. Real lists give their rows
      // distinct order_index values, so this never reorders them; `id` last
      // makes the result total and stable.
      .order('order_index', { ascending: true })
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true });

    if (error) {throw new Error(error.message);}
    return (data || []).map(mapRow);
  },

  /**
   * Every active row, in one request.
   *
   * The storefront renders ~15 CMS-driven sections. Each one calling
   * `getBySection` meant ~15 separate round-trips that resolved at different
   * times, so the page visibly re-flowed section by section as each swapped
   * from its hardcoded fallback to the real copy. `SiteContentProvider` calls
   * this once instead and hands every section its rows from that single result.
   *
   * The public RLS policy on `site_content` is `is_active = true`, so an
   * anonymous visitor gets exactly these rows either way — filtering here just
   * keeps the admin's inactive drafts out of the storefront payload.
   */
  async getAllActive(): Promise<SiteContentItem[]> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('is_active', true)
      .order('section')
      // Deterministic tiebreakers matter more than they look. `order_index`
      // alone is not a total order: three `community_copy` rows all sat at 0,
      // so Postgres returned them in whatever order it liked and the storefront
      // — which reads items[0] for a singleton section — showed a different one
      // on different loads. An admin edit appeared to "revert" at random.
      //
      // `updated_at DESC` breaks the tie toward the row most recently edited,
      // which is what an admin expects after saving. Real lists give their rows
      // distinct order_index values, so this never reorders them; `id` last
      // makes the result total and stable.
      .order('order_index', { ascending: true })
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true })
      .limit(500);

    if (error) {throw new Error(error.message);}
    return (data || []).map(mapRow);
  },

  async getAll(params?: { page?: number; limit?: number }): Promise<{ items: SiteContentItem[]; total: number }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 100, 500);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('site_content')
      .select('*', { count: 'exact' })
      .order('section')
      // Same tiebreakers as the storefront reads with, so the admin list shows
      // rows in the order that decides which one is actually live.
      .order('order_index', { ascending: true })
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {throw new Error(error.message);}
    return {
      items: (data || []).map(mapRow),
      total: count || 0,
    };
  },

  async create(item: {
    section: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    orderIndex?: number;
    isActive?: boolean;
  }): Promise<SiteContentItem> {
    const { data, error } = await supabase
      .from('site_content')
      .insert({
        section: item.section,
        title: item.title,
        body: item.body,
        metadata: (item.metadata || {}) as Json,
        order_index: item.orderIndex ?? 0,
        is_active: item.isActive ?? true,
      })
      .select()
      .single();

    if (error) {throw new Error(error.message);}
    return mapRow(data);
  },

  async update(id: string, updates: {
    title?: string;
    body?: string;
    metadata?: Record<string, unknown>;
    orderIndex?: number;
    isActive?: boolean;
  }): Promise<SiteContentItem> {
    const update: SiteContentUpdate = {};
    if (updates.title !== undefined) {update.title = updates.title;}
    if (updates.body !== undefined) {update.body = updates.body;}
    if (updates.metadata !== undefined) {update.metadata = updates.metadata as Json;}
    if (updates.orderIndex !== undefined) {update.order_index = updates.orderIndex;}
    if (updates.isActive !== undefined) {update.is_active = updates.isActive;}

    const { data, error } = await supabase
      .from('site_content')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {throw new Error(error.message);}
    return mapRow(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('site_content')
      .delete()
      .eq('id', id);

    if (error) {throw new Error(error.message);}
  },

  async reorder(ids: string[]): Promise<void> {
    const updates = ids.map((id, index) =>
      supabase
        .from('site_content')
        .update({ order_index: index + 1 })
        .eq('id', id)
    );
    await Promise.all(updates);
  },
};
