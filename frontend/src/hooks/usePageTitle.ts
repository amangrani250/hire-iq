import { useDocumentMeta } from './useDocumentMeta';

/**
 * Backwards-compatible title hook. Prefer useDocumentMeta for new pages so
 * title and description are managed together.
 */
export default function usePageTitle(title: string): void {
  useDocumentMeta(title);
}
