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
      .order('order_index', { ascending: true });

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
      .order('order_index', { ascending: true })
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
