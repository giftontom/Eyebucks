import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * `external_url` and `storage_path` both point straight at a paid file.
 * `digitalAssets.api.ts` keeps them out of client reads with explicit column
 * allowlists rather than relying on RLS, which cannot hide columns.
 *
 * These assertions read the source because the constants are module-private —
 * and because the thing worth protecting is the literal SELECT text. A future
 * edit that switches a storefront query to `select('*')`, or appends the wrong
 * column to the wrong list, would leak a bearer download URL to anonymous
 * visitors, and nothing else in the suite would notice.
 */
const SOURCE = readFileSync(
  resolve(__dirname, '../../../services/api/digitalAssets.api.ts'),
  'utf8',
);

/** The single-quoted string assigned to a `const NAME =` column list. */
function columnList(name: string): string {
  const match = SOURCE.match(new RegExp(`const ${name} =[^;]*?'([^']*)'`, 's'));
  if (!match) { throw new Error(`could not find the ${name} column list`); }
  return match[1];
}

describe('digital asset column allowlists', () => {
  const storefront = columnList('STOREFRONT_COLUMNS');

  it('never selects storage_path for the storefront', () => {
    expect(storefront).not.toContain('storage_path');
  });

  it('never selects external_url for the storefront', () => {
    expect(storefront).not.toContain('external_url');
  });

  it('still selects the fields the storefront actually renders', () => {
    for (const col of ['id', 'slug', 'title', 'price', 'compare_price', 'file_type', 'thumbnail']) {
      expect(storefront).toContain(col);
    }
  });

  it('builds the admin list from the storefront list plus deleted_at and external_url', () => {
    expect(SOURCE).toContain('const ADMIN_COLUMNS = `${STOREFRONT_COLUMNS}, deleted_at, external_url`;');
  });

  it('keeps storage_path out of the admin list too — only the Edge Function reads it', () => {
    const adminExtras = SOURCE.slice(SOURCE.indexOf('const ADMIN_COLUMNS'));
    const decl = adminExtras.slice(0, adminExtras.indexOf(';'));
    expect(decl).not.toContain('storage_path');
  });

  it('never wildcards the digital_assets table itself', () => {
    // One query does select `*` — but from asset_purchases, with the joined
    // asset columns pinned to the storefront list. Any wildcard that reaches
    // digital_assets directly would drag both private columns along with it.
    const wildcards = SOURCE.match(/\.select\(\s*[`'"][^`'"]*\*[^`'"]*[`'"]/g) ?? [];
    for (const w of wildcards) {
      expect(w).toContain('digital_assets(${STOREFRONT_COLUMNS})');
    }
  });
});

describe('asset-download-url delivery branch', () => {
  const FN = readFileSync(
    resolve(__dirname, '../../../supabase/functions/asset-download-url/index.ts'),
    'utf8',
  );

  it('still gates on an ACTIVE purchase before handing over any URL', () => {
    expect(FN).toContain("from('asset_purchases')");
    expect(FN).toContain('ACTIVE');
  });

  it('resolves the entitlement check before choosing a delivery branch', () => {
    // If the external short-circuit ever moves above the entitlement check, the
    // link would be handed to anyone who knows an asset id.
    expect(FN.indexOf("from('asset_purchases')")).toBeLessThan(FN.indexOf('const isExternal'));
  });

  it('reports no expiry for an external link instead of a countdown it cannot honour', () => {
    expect(FN).toContain('const expiresAt = isExternal ? 0 :');
  });

  it('treats an asset with neither a file nor a link as not found', () => {
    expect(FN).toContain('!asset.storage_path && !asset.external_url');
  });
});
