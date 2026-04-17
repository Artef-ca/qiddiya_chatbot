'use client';

import React from 'react';
import { KPICard, KPICardGrid } from './KPICard';
import { ComparisonSection, YearOverYearComparison } from './Comparison';
import { HighlightedText } from './TextHighlight';
import { ParagraphDivider } from './ParagraphDivider';
import {
  PieChartComponent,
  DonutChartComponent,
  RadarChartComponent,
  RadialChartComponent,
} from './Charts';
import {
  WrappedAreaChartComponent,
  WrappedLineChartComponent,
  WrappedBarChartComponent,
} from './ChartComponents';
import { Heading1, Heading2, Heading3, Heading4 } from './Heading';
import { UnorderedList, OrderedList, ListItem } from './List';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from './Table';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const REMARK_PLUGINS = [remarkGfm];

function MarkdownBlock({ content, marginBottom }: { content: string; marginBottom: string }) {
  return (
    <div style={{ marginBottom }}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{content}</ReactMarkdown>
    </div>
  );
}

function MarkdownParagraphDivider({ paragraphs }: { paragraphs: string[] }) {
  return (
    <ParagraphDivider>
      {paragraphs.map((para, idx) => (
        <div key={idx} style={{ marginBottom: '8px' }}>
          <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{para}</ReactMarkdown>
        </div>
      ))}
    </ParagraphDivider>
  );
}

export interface ResponseData {
  type?: 'batch2' | 'enhanced';
  blocks: ResponseBlock[];
}

export type ResponseBlock =
  | KPICardBlock
  | ComparisonBlock
  | YearOverYearBlock
  | TextBlock
  | ParagraphDividerBlock
  | ChartBlock
  | HeadingBlock
  | ListBlock
  | TableBlock
  | HighlightedTextBlock;

export interface KPICardBlock {
  type: 'kpi-card';
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
    color?: 'green' | 'red';
  };
}

export interface ComparisonBlock {
  type: 'comparison';
  title: string;
  subtitle?: string;
  items: Array<{
    label: string;
    currentValue: string;
    change: {
      value: string;
      percentage: string;
      direction: 'up' | 'down';
    };
  }>;
}

export interface YearOverYearBlock {
  type: 'year-over-year';
  title: string;
  currentYear: string;
  currentValue: string;
  previousYear: string;
  previousValue: string;
  change: {
    value: string;
    percentage: string;
    direction: 'up' | 'down';
  };
  description?: string;
}

export interface TextBlock {
  type: 'text' | 'paragraph';
  content: string;
}

export interface ParagraphDividerBlock {
  type: 'paragraph-divider';
  paragraphs: string[];
}

export interface ChartBlock {
  type: 'chart';
  chartType: 'area' | 'line' | 'bar' | 'pie' | 'donut' | 'radar' | 'radial';
  title?: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  height?: number;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  onChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onChartPin?: (chartData: string) => void;
  onChartUnpin?: (chartData: string) => void;
  onChartShare?: () => void;
  isPinned?: boolean;
  isPinnedBoard?: boolean;
  pinnedItems?: Array<{ content: string }>;
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4;
  content: string;
  children?: ResponseBlock[];
}

export interface ListBlock {
  type: 'list';
  ordered?: boolean;
  items: Array<string | { text: string; children?: string[] }>;
}

export interface TableBlock {
  type: 'table';
  headers?: string[];
  rows?: string[][];
  /** Alternative: array of objects, converted to headers/rows */
  data?: Array<Record<string, string | number>>;
}

export interface HighlightedTextBlock {
  type: 'highlighted-text';
  content: string;
  highlight?: 'yellow' | 'red' | 'green' | 'blue' | 'gray';
  color?: string;
  backgroundColor?: string;
}

/** Normalize block formats from API (table data→headers/rows, bullets→list, etc.) */
function normalizeBlock(block: Record<string, unknown>): ResponseBlock | null {
  const type = block.type as string;
  if (!type) return null;

  // Table: convert data array to headers/rows if needed
  if (type === 'table') {
    const tableBlock = block as unknown as TableBlock & { data?: Array<Record<string, string | number>> };
    if (tableBlock.data && Array.isArray(tableBlock.data) && tableBlock.data.length > 0 && !tableBlock.headers) {
      const headers = Object.keys(tableBlock.data[0]);
      const rows = tableBlock.data.map((row) => headers.map((h) => String(row[h] ?? '')));
      return { type: 'table', headers, rows };
    }
    if (tableBlock.headers && tableBlock.rows) return tableBlock;
    return null;
  }

  // Bullets / bullet-list / bullet_points → list
  if (type === 'bullets' || type === 'bullet-list' || type === 'bullet_points') {
    const items = (block.items as string[]) || [];
    return { type: 'list', ordered: false, items };
  }

  return block as unknown as ResponseBlock;
}

interface ResponseRendererProps {
  data: ResponseData | string;
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

export function ResponseRenderer({ 
  data, 
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
}: ResponseRendererProps) {
  let parsedData: unknown;

  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      // Partial JSON during streaming - avoid showing error; render nothing until complete
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        return null;
      }
      console.error('Failed to parse ResponseRenderer data:', e);
      return <div>Error: Invalid data format</div>;
    }
  } else {
    parsedData = data;
  }

  // Support API wrapper shape:
  // { output: { response: "<batch2 JSON string>" } }
  // or { output: { response: { type: "batch2", blocks: [...] } } }
  const maybeBlocks = (parsedData as { blocks?: unknown }).blocks;
  const maybeWrappedResponse = (parsedData as { output?: { response?: unknown } }).output?.response;
  if ((maybeBlocks === undefined || maybeBlocks === null) && maybeWrappedResponse !== undefined) {
    parsedData = maybeWrappedResponse;
  }

  // If response is itself a JSON-string, parse it.
  if (typeof parsedData === 'string') {
    try {
      parsedData = JSON.parse(parsedData);
    } catch {
      // If it can't be parsed, we'll fall through to the structure validation below.
    }
  }

  const finalBlocks = (parsedData as { blocks?: unknown }).blocks;
  if (!finalBlocks || !Array.isArray(finalBlocks)) {
    return <div>Error: Invalid data structure</div>;
  }

  // Normalize blocks (table data format, bullet-list aliases, etc.)
  const normalizedBlocks = (finalBlocks as unknown[])
    .map((block: unknown) => normalizeBlock(block as Record<string, unknown>))
    .filter(Boolean) as ResponseBlock[];

  // Group consecutive KPI cards together
  const groupedBlocks: (ResponseBlock | KPICardBlock[])[] = [];
  let currentKPIGroup: KPICardBlock[] = [];

  for (const block of normalizedBlocks) {
    if (block.type === 'kpi-card') {
      currentKPIGroup.push(block);
    } else {
      if (currentKPIGroup.length > 0) {
        groupedBlocks.push(currentKPIGroup);
        currentKPIGroup = [];
      }
      groupedBlocks.push(block);
    }
  }
  
  if (currentKPIGroup.length > 0) {
    groupedBlocks.push(currentKPIGroup);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        fontFamily: 'Manrope',
      }}
    >
      {groupedBlocks.map((blockOrGroup, index) => {
        if (Array.isArray(blockOrGroup)) {
          return (
            <KPICardGrid key={index}>
              {blockOrGroup.map((card, idx) => (
                <KPICard key={idx} {...card} />
              ))}
            </KPICardGrid>
          );
        }
        return (
          <BlockRenderer 
            key={index} 
            block={blockOrGroup}
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
      })}
    </div>
  );
}

interface BlockRendererProps {
  block: ResponseBlock;
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

function BlockRenderer({ 
  block, 
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
}: BlockRendererProps) {
  switch (block.type) {
    case 'kpi-card':
      return <KPICard {...block} />;

    case 'comparison':
      return <ComparisonSection title={block.title} subtitle={block.subtitle} items={block.items} />;

    case 'year-over-year':
      return <YearOverYearComparison {...block} />;

    case 'text':
    case 'paragraph':
      return <MarkdownBlock content={block.content} marginBottom="16px" />;

    case 'paragraph-divider':
      return <MarkdownParagraphDivider paragraphs={block.paragraphs ?? []} />;

    case 'chart':
      return renderChart(block, onChartCopy, onChartPin, onChartUnpin, onChartShare, isPinnedBoard, pinnedItems);

    case 'heading':
      return renderHeading(block);

    case 'list':
      return renderList(block);

    case 'table':
      return renderTable(block, onTableCopy, onTablePin, onTableUnpin, onTableShare, pinnedItems);

    case 'highlighted-text':
      return (
        <HighlightedText
          highlight={(block as HighlightedTextBlock).highlight}
          color={(block as HighlightedTextBlock).color}
        >
          {(block as HighlightedTextBlock).content}
        </HighlightedText>
      );

    default:
      // Fallback: render content as markdown if block has content/text
      const fallbackBlock = block as Record<string, unknown>;
      const content = fallbackBlock.content ?? fallbackBlock.text ?? fallbackBlock.textContent;
      if (typeof content === 'string' && content.trim()) {
        return <MarkdownBlock content={content} marginBottom="16px" />;
      }
      return null;
  }
}

function renderChart(
  block: ChartBlock,
  onChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void,
  onChartPin?: (chartData: string) => void,
  onChartUnpin?: (chartData: string) => void,
  onChartShare?: (type: 'table' | 'chart', content: string, title?: string) => void,
  isPinnedBoard?: boolean,
  pinnedItems?: Array<{ content: string }>
) {
  // Transform data to ensure it matches ChartDataPoint type requirements
  // When data has a single numeric key (e.g. "Total Net Sales"), keep that key so all chart types
  // (bar, line, area, pie, donut, radar, radial) show the actual label instead of "value"
  let inferredDataKey: string | undefined;
  const transformedData = block.data.map((item) => {
    const result: { name: string; value: number; [key: string]: string | number } = {
      name: (item.name as string) || String(item[Object.keys(item)[0] || 'name'] || 'Unknown'),
      value: typeof item.value === 'number' ? item.value : (typeof item.value === 'string' ? parseFloat(item.value) || 0 : 0),
      ...item
    };
    // If value is still 0 and not explicitly set, try to find first numeric value
    let inferredFromKey: string | undefined;
    if (result.value === 0 && typeof item.value === 'undefined') {
      const numericKey = Object.keys(item).find(key => 
        key !== 'name' && 
        (typeof item[key] === 'number' || (typeof item[key] === 'string' && !isNaN(parseFloat(item[key] as string))))
      );
      if (numericKey) {
        result.value = typeof item[numericKey] === 'number' 
          ? item[numericKey] as number
          : parseFloat(item[numericKey] as string);
        inferredFromKey = numericKey;
        if (!inferredDataKey) inferredDataKey = numericKey;
      }
    }
    // When we inferred value from a key (e.g. "Total Net Sales"), remove "value" and keep the original key
    // so all chart types show the actual label instead of "value"
    if (inferredFromKey) {
      return Object.fromEntries(
        Object.entries(result).filter(([k]) => k !== 'value')
      ) as { name: string; value: number; [key: string]: string | number };
    }
    return result;
  });

  // Forward onChartCopy - ChartWrapper (and other chart components) build chartData with the
  // currently selected/visible chart type and pass it when calling onChartCopy. We must forward
  // that content so copy/export uses the correct chart type (e.g. area when user switched from bar).
  const chartCopyHandler = onChartCopy || block.onChartCopy
    ? (type: 'table' | 'chart', content: string, title?: string) => {
        const handler = onChartCopy || block.onChartCopy;
        if (handler) {
          handler(type, content, title);
        }
      }
    : undefined;

  const commonProps = {
    title: block.title,
    subtitle: block.subtitle,
    data: transformedData,
    height: block.height,
    colors: block.colors,
    // Add date range if available in block
    dateRange: block.dateRange,
    onChartCopy: chartCopyHandler,
    onChartPin: onChartPin || block.onChartPin,
    onChartUnpin: onChartUnpin || block.onChartUnpin,
    onChartShare: onChartShare || block.onChartShare,
    isPinned: block.isPinned,
    isPinnedBoard: isPinnedBoard || block.isPinnedBoard,
    pinnedItems: pinnedItems || block.pinnedItems,
  };

  switch (block.chartType) {
    case 'area':
      return <WrappedAreaChartComponent {...commonProps} />;
    case 'line':
      return <WrappedLineChartComponent {...commonProps} />;
    case 'bar':
      return <WrappedBarChartComponent {...commonProps} />;
    case 'pie':
      return (
        <PieChartComponent
          {...commonProps}
          dataKey={block.dataKey ?? inferredDataKey}
          nameKey={block.nameKey}
        />
      );
    case 'donut':
      return (
        <DonutChartComponent
          {...commonProps}
          dataKey={block.dataKey ?? inferredDataKey}
          nameKey={block.nameKey}
        />
      );
    case 'radar':
      return (
        <RadarChartComponent
          {...commonProps}
          dataKey={block.dataKey ?? inferredDataKey}
        />
      );
    case 'radial':
      return (
        <RadialChartComponent
          {...commonProps}
          dataKey={block.dataKey ?? inferredDataKey}
          nameKey={block.nameKey}
        />
      );
    default:
      return null;
  }
}

function renderHeading(block: HeadingBlock) {
  const HeadingComponent =
    block.level === 1
      ? Heading1
      : block.level === 2
      ? Heading2
      : block.level === 3
      ? Heading3
      : Heading4;

  return (
    <div>
      <HeadingComponent>{block.content}</HeadingComponent>
      {block.children && block.children.length > 0 && (
        <div style={{ marginLeft: '24px', marginTop: '8px' }}>
          {block.children.map((child, idx) => (
            <BlockRenderer key={idx} block={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function renderList(block: ListBlock) {
  const ListComponent = block.ordered ? OrderedList : UnorderedList;

  return (
    <ListComponent>
      {block.items.map((item, idx) => {
        if (typeof item === 'string') {
          return <ListItem key={idx}>{item}</ListItem>;
        } else {
          return (
            <ListItem key={idx}>
              {item.text}
              {item.children && item.children.length > 0 && (
                <UnorderedList style={{ marginTop: '8px', marginLeft: '24px' }}>
                  {item.children.map((child, childIdx) => (
                    <ListItem key={childIdx}>{child}</ListItem>
                  ))}
                </UnorderedList>
              )}
            </ListItem>
          );
        }
      })}
    </ListComponent>
  );
}

function renderTable(
  block: TableBlock,
  onTableCopy?: (type: 'table' | 'chart', content: string, title?: string) => void,
  onTablePin?: (tableData: string) => void,
  onTableUnpin?: (tableData: string) => void,
  onTableShare?: (type: 'table' | 'chart', content: string, title?: string) => void,
  pinnedItems: Array<{ content: string }> = []
) {
  const headers = block.headers ?? [];
  const rows = block.rows ?? [];
  if (headers.length === 0 && rows.length === 0) return null;
  return (
    <Table
      onTableCopy={onTableCopy}
      onTablePin={onTablePin}
      onTableUnpin={onTableUnpin}
      onTableShare={onTableShare}
      pinnedItems={pinnedItems}
    >
      <TableHead>
        <TableRow>
          {headers.map((header, idx) => (
            <TableHeader key={idx}>{header}</TableHeader>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, rowIdx) => (
          <TableRow key={rowIdx}>
            {row.map((cell, cellIdx) => (
              <TableCell key={cellIdx}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

