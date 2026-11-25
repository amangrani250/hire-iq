import { useEffect } from 'react';

const BASE_TITLE = 'HireIQ';

export function useDocumentMeta(title?: string, description?: string) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [title]);

  useEffect(() => {
    if (!description) return;
    let meta = document.querySelector('meta[name="description"]');
    const needsCreate = !meta;
    if (needsCreate) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
    }
    meta!.setAttribute('content', description);
    if (needsCreate) {
      document.head.appendChild(meta!);
    }
    return () => {
      if (needsCreate && meta?.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, [description]);
}
