'use client';

/**
 * Centralized markdown component mapping configuration
 * Makes it easier to maintain and extend markdown rendering components
 */

import type { Components } from 'react-markdown';
import { Paragraph } from './Paragraph';
import { 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableHeader, 
  TableCell 
} from './Table';
import { Code, Pre } from './Code';
import { CustomDiv, CustomButton, CustomSpan, CustomLink } from './CustomElements';
import { UnorderedList, OrderedList, ListItem } from './List';
import { Heading1, Heading2, Heading3, Heading4 } from './Heading';
import { Blockquote } from './Blockquote';
import { getBotBoldStyle } from '../styles';

interface CreateMarkdownComponentsOptions {
  isBotResponse?: boolean;
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

/**
 * Creates a components configuration object for react-markdown
 * Centralizes component mapping logic for better maintainability
 */
export function createMarkdownComponents(
  options: CreateMarkdownComponentsOptions = {}
): Components {
  const {
    isBotResponse = false,
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
    pinnedItems = [],
  } = options;

  const botBoldStyle = getBotBoldStyle(isBotResponse);

  return {
    p: ({ children }) => (
      <Paragraph isBotResponse={isBotResponse}>{children}</Paragraph>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold" style={botBoldStyle}>{children}</strong>
    ),
    ul: ({ children }) => <UnorderedList>{children}</UnorderedList>,
    ol: ({ children }) => <OrderedList>{children}</OrderedList>,
    li: ({ children }) => <ListItem>{children}</ListItem>,
    table: ({ children }) => (
      <Table 
        onTableCopy={onTableCopy}
        onTablePin={onTablePin}
        onTableUnpin={onTableUnpin}
        onTableShare={onTableShare}
        isPinnedBoard={isPinnedBoard}
        pinnedItems={pinnedItems}
      >
        {children}
      </Table>
    ),
    thead: ({ children }) => <TableHead>{children}</TableHead>,
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    th: ({ children }) => <TableHeader>{children}</TableHeader>,
    td: ({ children }) => <TableCell>{children}</TableCell>,
    code: ({ children, className: codeClassName }) => (
      <Code className={codeClassName}>{children}</Code>
    ),
    pre: ({ children }) => <Pre>{children}</Pre>,
    blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
    div: ({ children, className: divClassName, ...props }) => {
      const dataType = (props as { 'data-type'?: string })['data-type'];
      return (
        <CustomDiv 
          className={divClassName} 
          data-type={dataType}
          onSuggestionClick={onSuggestionClick}
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
          {...props}
        >
          {children}
        </CustomDiv>
      );
    },
    button: ({ children, onClick, className: buttonClassName, ...props }) => {
      const dataType = (props as { 'data-type'?: string })['data-type'];
      return (
        <CustomButton
          onClick={onClick}
          className={buttonClassName}
          data-type={dataType}
          onSuggestionClick={onSuggestionClick}
          {...props}
        >
          {children}
        </CustomButton>
      );
    },
    span: ({ children, className: spanClassName, ...props }) => {
      const dataType = (props as { 'data-type'?: string })['data-type'];
      return (
        <CustomSpan 
          className={spanClassName}
          data-type={dataType}
          {...props}
        >
          {children}
        </CustomSpan>
      );
    },
    a: ({ children, href }) => (
      <CustomLink href={href}>{children}</CustomLink>
    ),
    h1: ({ children }) => <Heading1>{children}</Heading1>,
    h2: ({ children }) => <Heading2>{children}</Heading2>,
    h3: ({ children }) => <Heading3>{children}</Heading3>,
    h4: ({ children }) => <Heading4>{children}</Heading4>,
  };
}

