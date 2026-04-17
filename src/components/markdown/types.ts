import type { ReactNode } from 'react';

/**
 * Types for ReactMarkdown component props
 */
export interface MarkdownComponentProps {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

export interface MarkdownParagraphProps extends MarkdownComponentProps {
  children?: ReactNode;
}

export interface MarkdownCodeProps extends MarkdownComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface MarkdownDivProps extends MarkdownComponentProps {
  className?: string;
  'data-type'?: string;
  children?: ReactNode;
}

export interface MarkdownButtonProps extends MarkdownComponentProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  'data-type'?: string;
  children?: ReactNode;
}

export interface MarkdownSpanProps extends MarkdownComponentProps {
  className?: string;
  'data-type'?: string;
  children?: ReactNode;
}

export interface MarkdownLinkProps extends MarkdownComponentProps {
  href?: string;
  children?: ReactNode;
}

export interface MarkdownHeadingProps extends MarkdownComponentProps {
  children?: ReactNode;
}

