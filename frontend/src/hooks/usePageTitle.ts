import { useEffect } from 'react';

/** Sets the document title for the lifetime of a route. */
export default function usePageTitle(title: string): void {
  useEffect(() => {
    if (title) document.title = `${title} — HireIQ`;
  }, [title]);
}
