'use client';

import React from 'react';
import { Link2 } from 'lucide-react';
import type { MarkdownDivProps, MarkdownButtonProps, MarkdownSpanProps, MarkdownLinkProps } from '../types';
import { extractText } from '../utils';
import { ResponseRenderer } from './ResponseRenderer';
import { HighlightedText } from './TextHighlight';

const SUGGESTIONS_CONTAINER_STYLE: React.CSSProperties = {
  display: 'flex',
  paddingTop: '6px',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: '8px',
};

const SUGGESTION_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  width: 'auto',
  minHeight: '34px',
  padding: '6px 12px',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '20px',
  alignSelf: 'flex-start',
  borderRadius: '10px',
  border: '1px solid var(--Lucky-Point-100, #CFEBFF)',
  background: 'rgba(228, 245, 255, 0.40)',
  boxShadow: '0 1px 4px 0 var(--Lynch-100, #ECEEF2)',
  fontFamily: 'Manrope',
  fontSize: '13px',
  fontStyle: 'normal',
  fontWeight: 600,
  lineHeight: '18px',
  color: 'var(--Picton-Blue-800, #00628D)',
  textAlign: 'start',
};

const SUGGESTION_BUTTON_HOVER_BOX_SHADOW = '0 8px 16px 0 var(--Lynch-100, #ECEEF2)';
const SUGGESTION_BUTTON_LEAVE_BOX_SHADOW = '0 1px 4px 0 var(--Lynch-100, #ECEEF2)';

const SUGGESTION_TEXT_STYLE: React.CSSProperties = {
  alignSelf: 'stretch',
  color: 'var(--Picton-Blue-800, #00628D)',
  fontFamily: 'Manrope',
  fontSize: '13px',
  fontStyle: 'normal',
  fontWeight: 600,
  lineHeight: '18px',
  opacity: 0.8,
  textAlign: 'start',
  margin: 0,
};

function getSuggestionText(children: React.ReactNode): string {
  // Keep same behavior as previous implementation:
  // - If string: return it
  // - If array: join each child's (string or nested props.children) with ''.
  if (typeof children === 'string') return children;

  if (Array.isArray(children)) {
    return children
      .map((c: unknown) => {
        if (typeof c === 'string') return c;
        // Supports elements like <p>Text</p> coming through react-markdown.
        return (c as { props?: { children?: unknown } })?.props?.children || '';
      })
      .join('');
  }

  return '';
}

const TAG_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  padding: '2px 8px',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '4px',
  background: 'var(--Lynch-200, #D5D9E2)',
  color: 'var(--Lynch-950, #23272E)',
  fontFamily: 'Manrope',
  fontSize: '10px',
  fontStyle: 'normal',
  fontWeight: 700,
  lineHeight: '16px',
  letterSpacing: '0.18px',
  verticalAlign: 'middle',
};

const TAG_ICON_STYLE: React.CSSProperties = {
  width: '12px',
  height: '12px',
  aspectRatio: '1/1',
  flexShrink: 0,
};

const LINK_STYLE: React.CSSProperties = {
  color: 'var(--Picton-Blue-800, #00628D)',
  fontFamily: 'Manrope',
};

interface CustomDivProps extends MarkdownDivProps {
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

function renderResponseRenderer(props: {
  children: React.ReactNode;
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
}) {
  const {
    children,
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
  } = props;

  const data = typeof children === 'string' ? children : extractText(children as React.ReactNode);

  return (
    <ResponseRenderer
      data={data}
      onTableCopy={onTableCopy}
      onTablePin={onTablePin}
      onTableUnpin={onTableUnpin}
      onTableShare={onTableShare}
      onChartCopy={onChartCopy}
      onChartPin={onChartPin}
      onChartUnpin={onChartUnpin}
      onChartShare={onChartShare}
      isPinnedBoard={isPinnedBoard}
      pinnedItems={pinnedItems}
    />
  );
}

function renderWarningContainer(children: React.ReactNode) {
  return <div className="mb-3">{children}</div>;
}

function renderSuggestionsContainer(children: React.ReactNode) {
  return <div style={SUGGESTIONS_CONTAINER_STYLE}>{children}</div>;
}

export function CustomDiv({ 
  children, 
  className, 
  'data-type': dataType, 
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
  ...props 
}: CustomDivProps) {
  // Response renderer container (for batch2-response, enhanced-response, etc.)
  if (dataType === 'batch2-response' || dataType === 'enhanced-response' || dataType === 'response') {
    return renderResponseRenderer({
      children,
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
    });
  }
  
  // Warning header container - just render as normal container
  if (className?.includes('warning-box') || dataType === 'warning') {
    return renderWarningContainer(children);
  }
  // Suggestion buttons container
  if (className?.includes('suggestions') || dataType === 'suggestions') {
    return renderSuggestionsContainer(children);
  }
  return <div className={className} {...props}>{children}</div>;
}

interface CustomButtonProps extends MarkdownButtonProps {
  onSuggestionClick?: (suggestion: string) => void;
}

export function CustomButton({ children, onClick, onSuggestionClick, className, 'data-type': dataType, ...props }: CustomButtonProps) {
  // Suggestion button
  if (dataType === 'suggestion' || className?.includes('suggestion-button')) {
    const buttonText = getSuggestionText(children);
    
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          if (onSuggestionClick && buttonText) {
            onSuggestionClick(buttonText);
          } else if (onClick) {
            onClick(e);
          }
        }}
        className="focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 transition-all duration-200 cursor-pointer"
        style={SUGGESTION_BUTTON_STYLE}
        onMouseEnter={(e) => {
          const textElement = e.currentTarget.querySelector('p');
          if (textElement) {
            textElement.style.opacity = '1';
          }
          e.currentTarget.style.boxShadow = SUGGESTION_BUTTON_HOVER_BOX_SHADOW;
        }}
        onMouseLeave={(e) => {
          const textElement = e.currentTarget.querySelector('p');
          if (textElement) {
            textElement.style.opacity = '0.8';
          }
          e.currentTarget.style.boxShadow = SUGGESTION_BUTTON_LEAVE_BOX_SHADOW;
        }}
      >
        <p 
          style={SUGGESTION_TEXT_STYLE}
        >
          {children}
        </p>
      </button>
    );
  }
  return <button onClick={onClick} {...props}>{children}</button>;
}

export function CustomSpan({ children, className, 'data-type': dataType, ...props }: MarkdownSpanProps) {
  // Highlighted text
  if (dataType === 'highlight' || className?.includes('highlight')) {
    const highlightType = (props as { 'data-highlight'?: string })['data-highlight'] as 'yellow' | 'red' | 'green' | 'blue' | 'gray' | undefined;
    const textColor = (props as { 'data-color'?: string })['data-color'];
    
    return (
      <HighlightedText
        highlight={highlightType}
        color={textColor}
      >
        {children}
      </HighlightedText>
    );
  }
  
  // Tag/link styling
  if (className?.includes('tag') || dataType === 'tag') {
    return (
      <span
        className="inline-flex items-center cursor-pointer hover:opacity-80 transition-opacity"
        style={TAG_STYLE}
        {...props}
      >
        <Link2 
          style={TAG_ICON_STYLE}
        />
        {children}
      </span>
    );
  }
  return <span className={className} {...props}>{children}</span>;
}

export function CustomLink({ children, href }: MarkdownLinkProps) {
  return (
    <a 
      href={href} 
      className="text-blue-600 hover:text-blue-800 underline"
      style={LINK_STYLE}
    >
      {children}
    </a>
  );
}

