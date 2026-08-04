import React from 'react';
import { Helmet } from 'react-helmet-async';

import { AssetsCatalogSection } from '../components/sections';

export const Assets: React.FC = () => (
  <>
    <Helmet>
      <title>Digital Assets | Eyebuckz</title>
      <meta name="description" content="Shop LUTs, presets, sound packs, overlays, templates and project files to level up your filmmaking." />
    </Helmet>
    <AssetsCatalogSection />
  </>
);
