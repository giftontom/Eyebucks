import React from 'react';
import { Helmet } from 'react-helmet-async';

import { CatalogSection } from '../components/sections';

export const Courses: React.FC = () => (
  <>
    <Helmet>
      <title>All Courses | Eyebuckz</title>
      <meta name="description" content="Browse our full catalog of filmmaking courses — cinematography, editing, color grading, and business skills." />
    </Helmet>
    <CatalogSection />
  </>
);
