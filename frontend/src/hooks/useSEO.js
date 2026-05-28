/**
 * useSEO — Lightweight, dependency-free SEO management hook.
 * Mirrors the JSON-LD pattern used in HomePage.js (direct DOM manipulation).
 *
 * Usage:
 *   useSEO({
 *     title: 'Page Title',
 *     description: '...',
 *     canonical: 'https://...',
 *     og: { title, description, image, type, url },
 *     keywords: 'a, b, c',
 *     jsonLd: { '@context': 'https://schema.org', ... },
 *   });
 */
import { useEffect } from 'react';

const SCRIPT_ID_PREFIX = 'page-seo-ld-';

const upsertMeta = (selector, attr, value, content) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
};

const upsertLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
};

const useSEO = ({ title, description, canonical, keywords, og, twitter, jsonLd, jsonLdId }) => {
  useEffect(() => {
    const previousTitle = document.title;
    const createdElements = [];

    if (title) document.title = title;

    if (description) {
      createdElements.push(upsertMeta('meta[name="description"]', 'name', 'description', description));
    }
    if (keywords) {
      createdElements.push(upsertMeta('meta[name="keywords"]', 'name', 'keywords', keywords));
    }
    if (canonical) {
      createdElements.push(upsertLink('canonical', canonical));
    }

    // Open Graph
    if (og) {
      Object.entries(og).forEach(([k, v]) => {
        if (v == null) return;
        const property = `og:${k}`;
        createdElements.push(
          upsertMeta(`meta[property="${property}"]`, 'property', property, String(v))
        );
      });
    }

    // Twitter
    if (twitter) {
      Object.entries(twitter).forEach(([k, v]) => {
        if (v == null) return;
        const name = `twitter:${k}`;
        createdElements.push(
          upsertMeta(`meta[name="${name}"]`, 'name', name, String(v))
        );
      });
    }

    // JSON-LD structured data
    let ldEl = null;
    if (jsonLd) {
      const id = SCRIPT_ID_PREFIX + (jsonLdId || 'default');
      ldEl = document.getElementById(id);
      if (!ldEl) {
        ldEl = document.createElement('script');
        ldEl.id = id;
        ldEl.type = 'application/ld+json';
        document.head.appendChild(ldEl);
      }
      ldEl.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      document.title = previousTitle;
      if (ldEl && ldEl.parentNode) ldEl.parentNode.removeChild(ldEl);
      // We intentionally don't remove meta tags — they'd be overwritten by next page's useSEO.
    };
  }, [title, description, canonical, keywords, og, twitter, jsonLd, jsonLdId]);
};

export default useSEO;
