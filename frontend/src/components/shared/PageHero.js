import React from 'react';
import PageHeader from './PageHeader';

/**
 * PageHero — backward-compatible alias of PageHeader.
 *
 * Originally PageHero used a different visual style; now it forwards
 * to the unified PageHeader so every page in the app shares one look.
 *
 * Existing call signature is preserved:
 *   <PageHero icon="🏘️" title="..." subtitle="..." actions={...} accent="indigo" />
 */
export const PageHero = ({ icon, title, subtitle, actions, accent = 'indigo' }) => (
  <PageHeader
    theme={accent}
    iconEmoji={typeof icon === 'string' ? icon : undefined}
    icon={typeof icon !== 'string' ? icon : undefined}
    title={title}
    subtitle={subtitle}
    actions={actions}
    className="mb-6"
  />
);

export default PageHero;
