import React from 'react';

interface Props {
  data: Record<string, unknown>;
}

/** Injects a JSON-LD structured data script tag. Used for SEO-rich search results. */
export const JsonLd: React.FC<Props> = ({ data }) => (
  <script
    type="application/ld+json"
    // Escape `<` to prevent `</script>` in admin-controlled fields from breaking out of the tag.
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
  />
);
