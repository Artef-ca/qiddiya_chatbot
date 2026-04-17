'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { createMarkdownComponents } from '@/components/markdown/components/markdownComponents';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onSuggestionClick?: (suggestion: string) => void;
  onTableCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onTablePin?: (tableData: string) => void;
  onTableUnpin?: (tableData: string) => void;
  onTableShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onChartPin?: (chartData: string) => void;
  onChartUnpin?: (chartData: string) => void;
  onChartShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  isPinnedBoard?: boolean;
  pinnedItems?: Array<{ content: string }>;
}

export default function MarkdownRenderer({ 
  content, 
  className,
  onSuggestionClick,
  onTableCopy,
  onTablePin,
  onTableUnpin,
  onTableShare,
  onChartCopy,
  onChartPin,
  onChartUnpin,
  onChartShare,
  isPinnedBoard = false,
  pinnedItems = []
}: MarkdownRendererProps) {
  const isBotResponse = Boolean(className?.includes('bot-response-text'));

  // Memoize components to prevent recreating them on every render
  // This prevents Table and other components from remounting when parent re-renders
  const components = useMemo(() => createMarkdownComponents({
    isBotResponse,
    onSuggestionClick,
    onTableCopy,
    onTablePin,
    onTableUnpin,
    onTableShare,
    onChartCopy,
    onChartPin,
    onChartUnpin,
    onChartShare,
    isPinnedBoard,
    pinnedItems,
  }), [
    isBotResponse,
    onSuggestionClick,
    onTableCopy,
    onTablePin,
    onTableUnpin,
    onTableShare,
    onChartCopy,
    onChartPin,
    onChartUnpin,
    onChartShare,
    isPinnedBoard,
    pinnedItems,
  ]);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
