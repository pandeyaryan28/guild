import { useEffect } from 'react';

interface MetadataProps {
  title: string;
  description: string;
  canonicalPath: string;
}

export function useDocumentMetadata({ title, description, canonicalPath }: MetadataProps) {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title === 'Guild Orbit' ? title : `${title} | Guild Orbit`;
    document.title = formattedTitle;

    // 2. Update Description Meta Tag
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // 3. Update Canonical Tag
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    const fullCanonicalUrl = `https://guildorbit.com${canonicalPath}`;
    linkCanonical.setAttribute('href', fullCanonicalUrl);

    // 4. Update Open Graph (og:title, og:description, og:url)
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', formattedTitle);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', fullCanonicalUrl);
  }, [title, description, canonicalPath]);
}
