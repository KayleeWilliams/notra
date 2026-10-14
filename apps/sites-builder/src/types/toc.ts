import type { MarkdownHeading } from "astro";

export interface TocProps {
  headings: MarkdownHeading[];
  /** Renders without label or landmark id, with every sub-heading shown (mobile jump menu). */
  inline?: boolean;
  /** Fewest headings that still render the list. */
  minItems?: number;
}

export interface TocItem {
  slug: string;
  text: string;
}

export interface TocSection extends TocItem {
  children: TocItem[];
}
