/**
 * Content that replaces a skeleton fades in instead of popping. Opacity only,
 * so it never shifts layout, and short enough not to delay reading. A wrapper
 * whose page still shows its own skeleton (`data-page-skeleton`) waits and
 * fades in once that skeleton is replaced, so the skeleton never fades twice.
 */
export const SKELETON_REVEAL_CLASS =
  "animate-in fade-in duration-200 ease-out motion-reduce:animate-none has-[[data-page-skeleton]]:animate-none";
