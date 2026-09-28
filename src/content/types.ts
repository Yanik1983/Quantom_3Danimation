export interface EquationBlock {
  /** KaTeX (display mode). */
  tex: string;
  caption: string;
}

/**
 * Copy for one concept. Paragraph strings support inline math between `$…$`
 * and emphasis between `**…**`.
 */
export interface SectionContent {
  simple: string[];
  technical: string[];
  /** Rendered inside a visibly labelled "Analogy" box. */
  analogy?: string;
  /** Static text alternative describing what the visualization shows. */
  altText: string;
  underTheHood: {
    equations: EquationBlock[];
    method: string[];
  };
}
