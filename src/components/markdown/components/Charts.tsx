'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useChatActions } from '@/contexts/ChatActionsContext';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChartWrapper } from './ChartWrapper';
import {Plus, GitCompare, Activity} from 'lucide-react';

// Custom tooltip with dark background
const DarkTooltipContent = (props: React.ComponentProps<typeof ChartTooltipContent>) => {
  // Inject global styles for dark tooltip
  useEffect(() => {
    const styleId = 'dark-tooltip-styles';
    if (document.getElementById(styleId)) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      .recharts-tooltip-wrapper > div:first-child {
        background-color: #343A46 !important;
        background: #343A46 !important;
        color: #ffffff !important;
        border-color: #374151 !important;
      }
      .recharts-tooltip-wrapper > div:first-child span.text-muted-foreground,
      .recharts-tooltip-wrapper > div:first-child .text-muted-foreground {
        color: #d1d5db !important;
      }
      .recharts-tooltip-wrapper > div:first-child span.text-foreground,
      .recharts-tooltip-wrapper > div:first-child .text-foreground {
        color: #ffffff !important;
      }
      .recharts-tooltip-wrapper > div:first-child div.font-medium {
        color: #ffffff !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  return <ChartTooltipContent {...props} />;
};

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface BaseChartProps {
  title?: string;
  subtitle?: string;
  data: ChartDataPoint[];
  height?: number;
  colors?: string[];
  dateRange?: {
    startDate: Date | string;
    endDate: Date | string;
  };
  onChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onChartPin?: (chartData: string) => void;
  onChartUnpin?: (chartData: string) => void;
  onChartShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  isPinned?: boolean;
  isPinnedBoard?: boolean;
  pinnedItems?: Array<{ content: string }>;
}

const DEFAULT_COLORS = [
  '#0077B6', // Blue
  '#FF6B35', // Orange
  '#F7B801', // Yellow
  '#10B981', // Green
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

function getNumericDataKeys(data: ChartDataPoint[]): string[] {
  if (!data || data.length === 0) return [];

  return Object.keys(data[0]).filter((k) => {
    if (k === 'name') return false;

    // Include the key only if at least one row has a valid numeric value for it.
    return data.some((row) => {
      const val = row[k];
      return typeof val === 'number' || !isNaN(parseFloat(String(val)));
    });
  });
}

function buildChartConfig(dataKeys: string[], colors: string[]): ChartConfig {
  return dataKeys.reduce((acc, key, index) => {
    acc[key] = {
      label: key,
      color: colors[index % colors.length],
    };
    return acc;
  }, {} as ChartConfig);
}

// Helper function to format data point for messages
function formatDataPoint(dataPoint: ChartDataPoint, keys: string[]): string {
  const pairs: string[] = [];
  keys.forEach(key => {
    if (key !== 'name' && dataPoint[key] !== undefined) {
      pairs.push(`${key}: ${dataPoint[key]}`);
    }
  });
  if (dataPoint.name) {
    pairs.unshift(`Name: ${dataPoint.name}`);
  }
  return pairs.join('\n');
}

// Helper function to format data point by index (for Pie/Donut/Radial charts)
function formatDataPointByIndex(dataPoint: ChartDataPoint, dataKey?: string, nameKey?: string): string {
  const pairs: string[] = [];
  const name = String(dataPoint[nameKey || 'name'] || dataPoint.name || '');
  if (name) {
    pairs.push(`Name: ${name}`);
  }
  const value = dataPoint[dataKey || 'value'] ?? dataPoint.value;
  if (value !== undefined) {
    pairs.push(`Value: ${value}`);
  }
  // Add other properties
  Object.keys(dataPoint).forEach(key => {
    if (key !== 'name' && key !== (nameKey || 'name') && key !== (dataKey || 'value') && key !== 'value') {
      pairs.push(`${key}: ${dataPoint[key]}`);
    }
  });
  return pairs.join('\n');
}

// Data Points Table Component - shows data points below charts
function DataPointsTable({ 
  data, 
  dataKeys, 
  colors = DEFAULT_COLORS 
}: { 
  data: ChartDataPoint[]; 
  dataKeys: string[];
  colors?: string[];
}) {
  if (!data || data.length === 0 || dataKeys.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '20px',
        borderTop: '1px solid var(--Lynch-200, #D5D9E2)',
        paddingTop: '16px',
      }}
    >
      <div
        style={{
          overflowX: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Manrope',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--Lynch-600, #6B7785)',
                  borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
                  whiteSpace: 'nowrap',
                }}
              >
                Date
              </th>
              {dataKeys.map((key, index) => (
                <th
                  key={key}
                  style={{
                    textAlign: 'right',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--Lynch-600, #6B7785)',
                    borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                    {key}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  borderBottom: rowIndex < data.length - 1 ? '1px solid var(--Lynch-100, #ECEEF2)' : 'none',
                }}
              >
                <td
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--Lynch-900, #2D3440)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.name}
                </td>
                {dataKeys.map((key) => {
                  const value = row[key];
                  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                  const displayValue = !isNaN(numValue) ? numValue.toLocaleString() : String(value || '-');
                  
                  return (
                    <td
                      key={key}
                      style={{
                        textAlign: 'right',
                        padding: '10px 12px',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'var(--Lynch-900, #2D3440)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Selection Panel Component
interface SelectionPanelProps {
  selectedCount: number;
  onAnalyze?: () => void;
  onCompare?: () => void;
  onAddToPrompt?: () => void;
}

function SelectionPanel({ selectedCount, onAnalyze, onCompare, onAddToPrompt }: SelectionPanelProps) {
  if (selectedCount === 0) return null;
  
  const isMultiple = selectedCount > 1;
  const handleAction = isMultiple ? onCompare : onAnalyze;
  
  const handleActionClick = () => {
    if (handleAction) {
      handleAction();
    } else {
      console.error('SelectionPanel: Action handler not available', { isMultiple, onAnalyze: !!onAnalyze, onCompare: !!onCompare });
    }
  };
  
  const handleAddToPromptClick = () => {
    if (onAddToPrompt) {
      onAddToPrompt();
    } else {
      console.error('SelectionPanel: AddToPrompt handler not available');
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideUpFromBottom {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '24px',
          transform: 'translateX(-50%)',
          width: '309px',
          height: '80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0px',
          zIndex: 1000,
          animation: 'slideUpFromBottom 0.3s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            padding: '8px 24px 12px 24px',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            width: '309px',
            height: '80px',
            boxSizing: 'border-box',
            borderRadius: '8px 8px 0 0',
            border: '1px solid #DCD4FF',
            background: '#FFF',
            boxShadow: '0 8px 16px 0 #ECEEF2',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              color: '#0075AB',
              fontFamily: 'Manrope',
              fontSize: '10px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '16px',
              letterSpacing: '0.18px',
              textAlign: 'center',
              width: '100%',
              flexShrink: 0,
              height: '16px',
            }}
          >
            {selectedCount} {selectedCount === 1 ? 'selection' : 'selections'}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              width: '100%',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleActionClick}
              type="button"
              style={{
                flex: 1,
                display: 'flex',
                padding: '6px 12px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '8px',
                border: '1px solid #C3B2FF',
                background: '#F5F2FF',
                boxShadow: '0 1px 2px 0 #ECE8FF',
                cursor: 'pointer',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                color: '#6C20E1',
                transition: 'all 0.2s',
                minWidth: 0,
                height: '36px',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E9D5FF';
                e.currentTarget.style.borderColor = '#A78BFA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5F2FF';
                e.currentTarget.style.borderColor = '#C3B2FF';
              }}
            >
              {isMultiple ? (
                <>
                  <GitCompare className="h-4 w-4" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Compare</span>
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Analyze</span>
                </>
              )}
            </button>
            <button
              onClick={handleAddToPromptClick}
              type="button"
              style={{
                flex: 1,
                display: 'flex',
                padding: '6px 12px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '8px',
                border: '1px solid #C3B2FF',
                background: '#F5F2FF',
                boxShadow: '0 1px 2px 0 #ECE8FF',
                cursor: 'pointer',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                color: '#6C20E1',
                transition: 'all 0.2s',
                minWidth: 0,
                height: '36px',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E9D5FF';
                e.currentTarget.style.borderColor = '#A78BFA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5F2FF';
                e.currentTarget.style.borderColor = '#C3B2FF';
              }}
            >
              <Plus className="h-4 w-4" style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap' }}>Add to Prompt</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Simple Data Points Table for Pie/Donut charts (name-value pairs)
function SimpleDataPointsTable({ 
  data, 
  dataKey = 'value',
  nameKey = 'name',
  colors = DEFAULT_COLORS 
}: { 
  data: ChartDataPoint[]; 
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
}) {
  if (!data || data.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '20px',
        borderTop: '1px solid var(--Lynch-200, #D5D9E2)',
        paddingTop: '16px',
      }}
    >
      <div
        style={{
          overflowX: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Manrope',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--Lynch-600, #6B7785)',
                  borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
                  whiteSpace: 'nowrap',
                }}
              >
                Name
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--Lynch-600, #6B7785)',
                  borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
                  whiteSpace: 'nowrap',
                }}
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => {
              const value = row[dataKey];
              const numValue = typeof value === 'number' ? value : parseFloat(String(value));
              const displayValue = !isNaN(numValue) ? numValue.toLocaleString() : String(value || '-');
              
              return (
                <tr
                  key={rowIndex}
                  style={{
                    borderBottom: rowIndex < data.length - 1 ? '1px solid var(--Lynch-100, #ECEEF2)' : 'none',
                  }}
                >
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--Lynch-900, #2D3440)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: colors[rowIndex % colors.length],
                        }}
                      />
                      {row[nameKey] || row.name}
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'var(--Lynch-900, #2D3440)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayValue}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AreaChartComponent({ 
  title, 
  subtitle, 
  data, 
  height = 300,
  colors = DEFAULT_COLORS 
}: BaseChartProps) {
  // State for selected items - format: { dataIndex: { [dataKey]: true } }
  const [selectedItems, setSelectedItems] = useState<Record<number, Record<string, boolean>>>({});
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chatActions = useChatActions();
  
  // Debug: Log when context becomes available
  useEffect(() => {
    if (chatActions) {
      console.log('[AreaChart] ChatActions context is available');
    } else {
      console.warn('[AreaChart] ChatActions context is NOT available - buttons will not work');
    }
  }, [chatActions]);

  const dataKeys = useMemo(() => {
    return getNumericDataKeys(data);
  }, [data]);
  
  const chartConfig: ChartConfig = useMemo(() => {
    return buildChartConfig(dataKeys, colors);
  }, [dataKeys, colors]);

  // Handle data point click
  const handleDataPointClick = useCallback((dataIndex: number, dataKey: string) => {
    setSelectedItems((prev) => {
      const newSelection = { ...prev };
      if (!newSelection[dataIndex]) {
        newSelection[dataIndex] = {};
      }
      
      // Toggle selection
      if (newSelection[dataIndex][dataKey]) {
        delete newSelection[dataIndex][dataKey];
        if (Object.keys(newSelection[dataIndex]).length === 0) {
          delete newSelection[dataIndex];
        }
      } else {
        newSelection[dataIndex][dataKey] = true;
      }
      
      return newSelection;
    });
  }, []);

  // Get total selection count
  const selectionCount = useMemo(() => {
    return Object.values(selectedItems).reduce(
      (total, keys) => total + Object.keys(keys).length,
      0
    );
  }, [selectedItems]);

  // Check if a dataKey has any selected points
  const hasSelectedPoints = useCallback((dataKey: string) => {
    return Object.values(selectedItems).some(keys => keys[dataKey]);
  }, [selectedItems]);

  // Add click handlers and update line styles
  useEffect(() => {
    if (!chartRef.current || dataKeys.length === 0) return;

    const updateChart = () => {
      const svg = chartRef.current?.querySelector('svg');
      if (!svg) return;

      // Update line stroke styles based on selection
      dataKeys.forEach((dataKey, keyIndex) => {
        const isSelected = hasSelectedPoints(dataKey);
        
        // Find all path elements for this dataKey (area paths)
        const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
          const stroke = path.getAttribute('stroke');
          const fill = path.getAttribute('fill');
          const expectedColor = colors[keyIndex % colors.length];
          
          // Match by stroke or fill color
          return (stroke === expectedColor || fill === expectedColor) &&
                 path.getAttribute('d')?.includes('L'); // Line/area path
        });

        paths.forEach(path => {
          if (isSelected) {
            path.setAttribute('stroke-dasharray', '4 4');
            path.style.strokeDasharray = '4 4';
          } else {
            path.setAttribute('stroke-dasharray', '0');
            path.style.strokeDasharray = '0';
          }
        });
      });

      // Add click handlers to paths (area lines) and circles (dots)
      dataKeys.forEach((dataKey, keyIndex) => {
        const expectedColor = colors[keyIndex % colors.length];
        
        // Find paths for this dataKey
        const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
          const stroke = path.getAttribute('stroke');
          const fill = path.getAttribute('fill');
          return (stroke === expectedColor || fill === expectedColor) &&
                 path.getAttribute('d')?.includes('L');
        });

        // Add click handler to paths
        paths.forEach(path => {
          path.style.cursor = 'pointer';
          path.style.pointerEvents = 'all';
          
          const clickHandler = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Get click coordinates relative to SVG
            const svgRect = svg.getBoundingClientRect();
            const clickX = e.clientX - svgRect.left;
            
            // Find the chart plot area (where the actual chart is drawn)
            const chartArea = svg.querySelector('.recharts-cartesian-grid')?.parentElement;
            if (!chartArea) return;
            
            const chartAreaRect = chartArea.getBoundingClientRect();
            const relativeX = clickX - (chartAreaRect.left - svgRect.left);
            const chartWidth = chartAreaRect.width;
            
            // Calculate which data point was clicked based on X position
            if (chartWidth > 0 && data.length > 0) {
              const dataIndex = Math.round((relativeX / chartWidth) * (data.length - 1));
              const clampedIndex = Math.max(0, Math.min(data.length - 1, dataIndex));
              console.log('Area chart clicked:', { dataIndex: clampedIndex, dataKey, relativeX, chartWidth });
              handleDataPointClick(clampedIndex, dataKey);
            }
          };

          const oldHandler = (path as SVGPathElement & { __areaPathClickHandler?: (e: MouseEvent) => void }).__areaPathClickHandler;
          if (oldHandler) {
            path.removeEventListener('click', oldHandler);
          }
          (path as SVGPathElement & { __areaPathClickHandler?: (e: MouseEvent) => void }).__areaPathClickHandler = clickHandler;
          path.addEventListener('click', clickHandler, true);
        });

        // Also add click handlers to circles (dots) for this dataKey
        const circles = Array.from(svg.querySelectorAll('circle')).filter(circle => {
          const fill = circle.getAttribute('fill') || '';
          return fill === expectedColor || fill.toLowerCase() === expectedColor.toLowerCase();
        });

        circles.forEach((circle) => {
          circle.style.cursor = 'pointer';
          circle.setAttribute('data-point-key', dataKey);

          const clickHandler = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();

            // Find all circles for this dataKey
            const allCirclesForKey = circles.filter(c => {
              const cFill = c.getAttribute('fill') || '';
              return cFill === expectedColor || cFill.toLowerCase() === expectedColor.toLowerCase();
            });

            // Sort by x position to match data order
            const sortedCircles = [...allCirclesForKey].sort((a, b) => {
              return parseFloat(a.getAttribute('cx') || '0') - parseFloat(b.getAttribute('cx') || '0');
            });

            // Find clicked circle index
            const circleIndex = sortedCircles.indexOf(circle);
            if (circleIndex >= 0 && circleIndex < data.length) {
              handleDataPointClick(circleIndex, dataKey);
            }
          };

          const oldHandler = (circle as SVGCircleElement & { __areaClickHandler?: (e: MouseEvent) => void }).__areaClickHandler;
          if (oldHandler) {
            circle.removeEventListener('click', oldHandler);
          }
          (circle as SVGCircleElement & { __areaClickHandler?: (e: MouseEvent) => void }).__areaClickHandler = clickHandler;
          circle.addEventListener('click', clickHandler, true);
        });
      });
    };

    const timeout1 = setTimeout(updateChart, 100);
    const timeout2 = setTimeout(updateChart, 500);
    const timeout3 = setTimeout(updateChart, 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [data, dataKeys, colors, selectedItems, handleDataPointClick, hasSelectedPoints]);

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '24px',
        marginTop: '16px',
        position: 'relative',
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: '16px' }}>
          {title && (
            <h3
              style={{
                fontFamily: 'Manrope',
                fontSize: '18px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
                color: 'var(--Lynch-900, #2D3440)',
                marginBottom: '4px',
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              style={{
                fontFamily: 'Manrope',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px',
                color: 'var(--Lynch-600, #6B7785)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div style={{ position: 'relative' }} ref={chartRef}>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
              axisLine={{ stroke: '#6B7785' }}
            />
            <YAxis 
              tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
              axisLine={{ stroke: '#6B7785' }}
            />
            <ChartTooltip content={<DarkTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {dataKeys.map((key, index) => {
              const isSelected = hasSelectedPoints(key);
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId={dataKeys.length > 1 ? "1" : undefined}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                  strokeDasharray={isSelected ? '4 4' : '0'}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </AreaChart>
        </ChartContainer>
      </div>
      <SelectionPanel
        selectedCount={selectionCount}
        onAnalyze={() => {
          if (selectionCount !== 1) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const selectedEntries = Object.entries(selectedItems);
          if (selectedEntries.length === 0) return;
          const [dataIndex, keys] = selectedEntries[0];
          const dataPoint = data[parseInt(dataIndex)];
          if (dataPoint) {
            const formatted = formatDataPoint(dataPoint, Object.keys(keys));
            chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${formatted}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onCompare={() => {
          if (selectionCount < 2) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${formattedData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onAddToPrompt={() => {
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.addToInput(formattedData.join('\n\n'));
          }
        }}
      />
    </div>
  );
}

export function LineChartComponent({ 
  title, 
  subtitle, 
  data, 
  height = 300,
  colors = DEFAULT_COLORS 
}: BaseChartProps) {
  // State for selected items - format: { dataIndex: { [dataKey]: true } }
  const [selectedItems, setSelectedItems] = useState<Record<number, Record<string, boolean>>>({});
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chatActions = useChatActions();

  const dataKeys = useMemo(() => {
    return getNumericDataKeys(data);
  }, [data]);
  
  const chartConfig: ChartConfig = useMemo(() => {
    return buildChartConfig(dataKeys, colors);
  }, [dataKeys, colors]);

  // Handle data point click
  const handleDataPointClick = useCallback((dataIndex: number, dataKey: string) => {
    setSelectedItems((prev) => {
      const newSelection = { ...prev };
      if (!newSelection[dataIndex]) {
        newSelection[dataIndex] = {};
      }
      
      // Toggle selection
      if (newSelection[dataIndex][dataKey]) {
        delete newSelection[dataIndex][dataKey];
        if (Object.keys(newSelection[dataIndex]).length === 0) {
          delete newSelection[dataIndex];
        }
      } else {
        newSelection[dataIndex][dataKey] = true;
      }
      
      return newSelection;
    });
  }, []);

  // Get total selection count
  const selectionCount = useMemo(() => {
    return Object.values(selectedItems).reduce(
      (total, keys) => total + Object.keys(keys).length,
      0
    );
  }, [selectedItems]);

  // Check if a dataKey has any selected points
  const hasSelectedPoints = useCallback((dataKey: string) => {
    return Object.values(selectedItems).some(keys => keys[dataKey]);
  }, [selectedItems]);

  // Add click handlers and update line styles
  useEffect(() => {
    if (!chartRef.current || dataKeys.length === 0) return;

    const updateChart = () => {
      const svg = chartRef.current?.querySelector('svg');
      if (!svg) return;

      // Update line stroke styles based on selection
      dataKeys.forEach((dataKey, keyIndex) => {
        const isSelected = hasSelectedPoints(dataKey);
        
        // Find all path elements for this dataKey (line paths)
        const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
          const stroke = path.getAttribute('stroke');
          const expectedColor = colors[keyIndex % colors.length];
          
          // Match by stroke color
          return stroke === expectedColor && path.getAttribute('d')?.includes('L'); // Line path
        });

        paths.forEach(path => {
          if (isSelected) {
            path.setAttribute('stroke-dasharray', '4 4');
            path.style.strokeDasharray = '4 4';
          } else {
            path.setAttribute('stroke-dasharray', '0');
            path.style.strokeDasharray = '0';
          }
        });
      });

      // Add click handlers to paths (lines) and circles (dots)
      dataKeys.forEach((dataKey, keyIndex) => {
        const expectedColor = colors[keyIndex % colors.length];
        
        // Find paths for this dataKey
        const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
          const stroke = path.getAttribute('stroke');
          return stroke === expectedColor && path.getAttribute('d')?.includes('L');
        });

        // Add click handler to paths
        paths.forEach(path => {
          path.style.cursor = 'pointer';
          path.style.pointerEvents = 'all';
          
          const clickHandler = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Get click coordinates relative to SVG
            const svgRect = svg.getBoundingClientRect();
            const clickX = e.clientX - svgRect.left;
            
            // Find the chart plot area (where the actual chart is drawn)
            const chartArea = svg.querySelector('.recharts-cartesian-grid')?.parentElement;
            if (!chartArea) return;
            
            const chartAreaRect = chartArea.getBoundingClientRect();
            const relativeX = clickX - (chartAreaRect.left - svgRect.left);
            const chartWidth = chartAreaRect.width;
            
            // Calculate which data point was clicked based on X position
            if (chartWidth > 0 && data.length > 0) {
              const dataIndex = Math.round((relativeX / chartWidth) * (data.length - 1));
              const clampedIndex = Math.max(0, Math.min(data.length - 1, dataIndex));
              console.log('Line chart clicked:', { dataIndex: clampedIndex, dataKey, relativeX, chartWidth });
              handleDataPointClick(clampedIndex, dataKey);
            }
          };

          const oldHandler = (path as SVGPathElement & { __linePathClickHandler?: (e: MouseEvent) => void }).__linePathClickHandler;
          if (oldHandler) {
            path.removeEventListener('click', oldHandler);
          }
          (path as SVGPathElement & { __linePathClickHandler?: (e: MouseEvent) => void }).__linePathClickHandler = clickHandler;
          path.addEventListener('click', clickHandler, true);
        });

        // Also add click handlers to circles (dots) for this dataKey
        const circles = Array.from(svg.querySelectorAll('circle')).filter(circle => {
          const fill = circle.getAttribute('fill') || '';
          return fill === expectedColor || fill.toLowerCase() === expectedColor.toLowerCase();
        });

        circles.forEach((circle) => {
          circle.style.cursor = 'pointer';
          circle.setAttribute('data-point-key', dataKey);

          const clickHandler = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Find all circles for this dataKey
            const allCirclesForKey = circles.filter(c => {
              const cFill = c.getAttribute('fill') || '';
              return cFill === expectedColor || cFill.toLowerCase() === expectedColor.toLowerCase();
            });

            // Sort by x position to match data order
            const sortedCircles = [...allCirclesForKey].sort((a, b) => {
              return parseFloat(a.getAttribute('cx') || '0') - parseFloat(b.getAttribute('cx') || '0');
            });

            // Find clicked circle index
            const circleIndex = sortedCircles.indexOf(circle);
            if (circleIndex >= 0 && circleIndex < data.length) {
              handleDataPointClick(circleIndex, dataKey);
            }
          };

          const oldHandler = (circle as SVGCircleElement & { __lineClickHandler?: (e: MouseEvent) => void }).__lineClickHandler;
          if (oldHandler) {
            circle.removeEventListener('click', oldHandler);
          }
          (circle as SVGCircleElement & { __lineClickHandler?: (e: MouseEvent) => void }).__lineClickHandler = clickHandler;
          circle.addEventListener('click', clickHandler, true);
        });
      });
    };

    const timeout1 = setTimeout(updateChart, 100);
    const timeout2 = setTimeout(updateChart, 500);
    const timeout3 = setTimeout(updateChart, 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [data, dataKeys, colors, selectedItems, handleDataPointClick, hasSelectedPoints]);

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '24px',
        marginTop: '16px',
        position: 'relative',
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: '16px' }}>
          {title && (
            <h3
              style={{
                fontFamily: 'Manrope',
                fontSize: '18px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
                color: 'var(--Lynch-900, #2D3440)',
                marginBottom: '4px',
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              style={{
                fontFamily: 'Manrope',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px',
                color: 'var(--Lynch-600, #6B7785)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div style={{ position: 'relative' }} ref={chartRef}>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
              axisLine={{ stroke: '#6B7785' }}
            />
            <YAxis 
              tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
              axisLine={{ stroke: '#6B7785' }}
            />
            <ChartTooltip content={<DarkTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {dataKeys.map((key, index) => {
              const isSelected = hasSelectedPoints(key);
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  strokeDasharray={isSelected ? '4 4' : '0'}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        </ChartContainer>
      </div>
      <SelectionPanel
        selectedCount={selectionCount}
        onAnalyze={() => {
          if (selectionCount !== 1) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const selectedEntries = Object.entries(selectedItems);
          if (selectedEntries.length === 0) return;
          const [dataIndex, keys] = selectedEntries[0];
          const dataPoint = data[parseInt(dataIndex)];
          if (dataPoint) {
            const formatted = formatDataPoint(dataPoint, Object.keys(keys));
            chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${formatted}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onCompare={() => {
          if (selectionCount < 2) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${formattedData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onAddToPrompt={() => {
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.addToInput(formattedData.join('\n\n'));
          }
        }}
      />
    </div>
  );
}

export function BarChartComponent({ 
  title, 
  subtitle, 
  data, 
  height = 300,
  colors = DEFAULT_COLORS 
}: BaseChartProps) {
  // State for selected items - format: { dataIndex: { [dataKey]: true } }
  const [selectedItems, setSelectedItems] = useState<Record<number, Record<string, boolean>>>({});
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chatActions = useChatActions();

  const dataKeys = useMemo(() => {
    return getNumericDataKeys(data);
  }, [data]);
  
  const chartConfig: ChartConfig = useMemo(() => {
    return buildChartConfig(dataKeys, colors);
  }, [dataKeys, colors]);

  // Handle bar click
  const handleBarClick = useCallback((dataIndex: number, dataKey: string) => {
    setSelectedItems((prev) => {
      const newSelection = { ...prev };
      if (!newSelection[dataIndex]) {
        newSelection[dataIndex] = {};
      }
      
      // Toggle selection
      if (newSelection[dataIndex][dataKey]) {
        delete newSelection[dataIndex][dataKey];
        if (Object.keys(newSelection[dataIndex]).length === 0) {
          delete newSelection[dataIndex];
        }
      } else {
        newSelection[dataIndex][dataKey] = true;
      }
      
      return newSelection;
    });
  }, []);

  // Get total selection count
  const selectionCount = Object.values(selectedItems).reduce(
    (total, keys) => total + Object.keys(keys).length,
    0
  );

  // Add click handlers and selection borders to bars
  useEffect(() => {
    if (!chartRef.current || dataKeys.length === 0) return;

    const updateBars = () => {
      const svg = chartRef.current?.querySelector('svg');
      if (!svg) return;

      // Remove existing selection borders
      svg.querySelectorAll('.selection-border').forEach(el => el.remove());

      // Get all rects in the chart
      const allRects = Array.from(svg.querySelectorAll('rect'));
      
      // Filter to get only bar rects (not grid, axis, or borders)
      const bars = allRects.filter(rect => {
        const fill = rect.getAttribute('fill');
        const width = parseFloat(rect.getAttribute('width') || '0');
        const height = parseFloat(rect.getAttribute('height') || '0');
        const parent = rect.parentElement;
        const classes = rect.getAttribute('class') || '';
        
        // Must be a visible bar with fill color
        return fill && 
               fill !== 'none' && 
               fill !== 'transparent' &&
               !fill.startsWith('url(') && // Not a gradient
               width > 3 && 
               height > 3 &&
               !classes.includes('selection-border') &&
               parent && 
               !parent.classList.contains('recharts-cartesian-grid') &&
               !parent.classList.contains('recharts-cartesian-axis');
      });

      if (bars.length === 0) return;

      // Group bars by fill color (each color represents a dataKey)
      const barsByColor: Record<string, SVGRectElement[]> = {};
      bars.forEach(rect => {
        const fill = rect.getAttribute('fill') || '';
        if (fill && !barsByColor[fill]) {
          barsByColor[fill] = [];
        }
        if (fill) {
          barsByColor[fill].push(rect);
        }
      });

      // Process each color group
      Object.entries(barsByColor).forEach(([fillColor, rects]) => {
        // Find which dataKey this color corresponds to
        let keyIndex = -1;
        
        // Try exact match first
        keyIndex = colors.findIndex(c => c === fillColor);
        
        // Try case-insensitive match
        if (keyIndex < 0) {
          keyIndex = colors.findIndex(c => c.toLowerCase() === fillColor.toLowerCase());
        }
        
        // Try RGB comparison (convert hex to rgb and compare)
        if (keyIndex < 0) {
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            } : null;
          };
          
          const fillRgb = hexToRgb(fillColor);
          if (fillRgb) {
            keyIndex = colors.findIndex(c => {
              const colorRgb = hexToRgb(c);
              if (!colorRgb) return false;
              // Allow small differences (for opacity variations)
              return Math.abs(fillRgb.r - colorRgb.r) < 5 &&
                     Math.abs(fillRgb.g - colorRgb.g) < 5 &&
                     Math.abs(fillRgb.b - colorRgb.b) < 5;
            });
          }
        }
        
        // If still no match, try to match by order (first color group = first dataKey, etc.)
        if (keyIndex < 0) {
          const colorGroups = Object.keys(barsByColor);
          const groupIndex = colorGroups.indexOf(fillColor);
          if (groupIndex >= 0 && groupIndex < dataKeys.length) {
            keyIndex = groupIndex;
          }
        }
        
        if (keyIndex < 0 || keyIndex >= dataKeys.length) {
          return;
        }
        
        const dataKey = dataKeys[keyIndex];

        // Sort bars by x position (left to right) to match data array order
        rects.sort((a, b) => {
          const ax = parseFloat(a.getAttribute('x') || '0');
          const bx = parseFloat(b.getAttribute('x') || '0');
          // If x is same, sort by y (bottom to top for stacked bars)
          if (Math.abs(ax - bx) < 1) {
            const ay = parseFloat(a.getAttribute('y') || '0');
            const by = parseFloat(b.getAttribute('y') || '0');
            return by - ay; // Higher y (lower on screen) comes first
          }
          return ax - bx;
        });

        // Attach handlers to each bar
        rects.forEach((rect, sortedIndex) => {
          // Limit to data length
          if (sortedIndex >= data.length) return;
          
          const dataIndex = sortedIndex;
          
          // Make clickable
          rect.style.cursor = 'pointer';
          rect.setAttribute('data-bar-index', String(dataIndex));
          rect.setAttribute('data-bar-key', dataKey);
          
          // Create click handler
          const clickHandler = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Bar clicked:', { dataIndex, dataKey });
            handleBarClick(dataIndex, dataKey);
          };

          // Remove old handler if exists
          const oldHandler = (rect as SVGRectElement & { __barClickHandler?: (e: MouseEvent) => void }).__barClickHandler;
          if (oldHandler) {
            rect.removeEventListener('click', oldHandler);
          }
          
          // Store and attach new handler
          (rect as SVGRectElement & { __barClickHandler?: (e: MouseEvent) => void }).__barClickHandler = clickHandler;
          rect.addEventListener('click', clickHandler, true);

          // Add selection border if selected
          const isSelected = selectedItems[dataIndex]?.[dataKey] || false;
          if (isSelected) {
            const x = parseFloat(rect.getAttribute('x') || '0');
            const y = parseFloat(rect.getAttribute('y') || '0');
            const width = parseFloat(rect.getAttribute('width') || '0');
            const height = parseFloat(rect.getAttribute('height') || '0');

            // Only add border if we have valid dimensions
            if (width > 0 && height > 0) {
              const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              border.setAttribute('x', String(x - 2));
              border.setAttribute('y', String(y - 2));
              border.setAttribute('width', String(width + 4));
              border.setAttribute('height', String(height + 4));
              border.setAttribute('fill', 'none');
              border.setAttribute('stroke', '#8B5CF6');
              border.setAttribute('stroke-width', '2');
              border.setAttribute('stroke-dasharray', '4 4');
              border.setAttribute('rx', '6');
              border.setAttribute('ry', '6');
              border.setAttribute('class', 'selection-border');
              border.style.pointerEvents = 'none';
              
              // Insert after the bar rect
              const parent = rect.parentElement;
              if (parent) {
                parent.insertBefore(border, rect.nextSibling);
              }
            }
          }
        });
      });
    };

    // Update bars after chart renders
    const timeout1 = setTimeout(updateBars, 100);
    const timeout2 = setTimeout(updateBars, 500);
    const timeout3 = setTimeout(updateBars, 1000);

    // Add coordinate-based fallback click handler
    const handleChartClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      // Only handle if clicking directly on SVG or a rect that doesn't have a handler
      if (target.tagName === 'svg' || (target.tagName === 'rect' && !target.getAttribute('data-bar-index'))) {
        const svg = chartRef.current?.querySelector('svg');
        if (!svg) return;

        const svgRect = svg.getBoundingClientRect();
        const clickX = e.clientX - svgRect.left;
        const clickY = e.clientY - svgRect.top;

        // Find all bars and check which one was clicked
        const allRects = Array.from(svg.querySelectorAll('rect'));
        const bars = allRects.filter(rect => {
          const fill = rect.getAttribute('fill');
          const width = parseFloat(rect.getAttribute('width') || '0');
          const height = parseFloat(rect.getAttribute('height') || '0');
          return fill && fill !== 'none' && fill !== 'transparent' && width > 3 && height > 3;
        });

        // Check each bar to see if click is inside
        for (const rect of bars) {
          const x = parseFloat(rect.getAttribute('x') || '0');
          const y = parseFloat(rect.getAttribute('y') || '0');
          const width = parseFloat(rect.getAttribute('width') || '0');
          const height = parseFloat(rect.getAttribute('height') || '0');
          const fill = rect.getAttribute('fill') || '';

          // Convert SVG coordinates to screen coordinates
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = clickX;
          svgPoint.y = clickY;
          const ctm = rect.getScreenCTM();
          if (ctm) {
            const localPoint = svgPoint.matrixTransform(ctm.inverse());
            
            if (localPoint.x >= x && localPoint.x <= x + width &&
                localPoint.y >= y && localPoint.y <= y + height) {
              // Found the clicked bar - identify which dataKey and dataIndex
              const keyIndex = colors.findIndex(c => c === fill || c.toLowerCase() === fill.toLowerCase());
              if (keyIndex >= 0 && keyIndex < dataKeys.length) {
                // Find data index by x position
                const allBarsForKey = bars.filter(b => {
                  const bFill = b.getAttribute('fill') || '';
                  return bFill === fill || bFill.toLowerCase() === fill.toLowerCase();
                });
                const sortedBars = [...allBarsForKey].sort((a, b) => {
                  return parseFloat(a.getAttribute('x') || '0') - parseFloat(b.getAttribute('x') || '0');
                });
                const barIndex = sortedBars.indexOf(rect);
                if (barIndex >= 0 && barIndex < data.length) {
                  e.stopPropagation();
                  handleBarClick(barIndex, dataKeys[keyIndex]);
                  return;
                }
              }
            }
          }
        }
      }
    };

    const chartElement = chartRef.current;
    chartElement?.addEventListener('click', handleChartClick, true);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      chartElement?.removeEventListener('click', handleChartClick, true);
    };
  }, [data, dataKeys, colors, selectedItems, handleBarClick]);


  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '24px',
        marginTop: '16px',
        position: 'relative',
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: '16px' }}>
          {title && (
            <h3
              style={{
                fontFamily: 'Manrope',
                fontSize: '18px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
                color: 'var(--Lynch-900, #2D3440)',
                marginBottom: '4px',
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              style={{
                fontFamily: 'Manrope',
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '20px',
                color: 'var(--Lynch-600, #6B7785)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div style={{ position: 'relative' }} ref={chartRef}>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
              axisLine={{ stroke: '#6B7785' }}
            />
            <YAxis 
              tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
              axisLine={{ stroke: '#6B7785' }}
            />
            <ChartTooltip content={<DarkTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
      <SelectionPanel
        selectedCount={selectionCount}
        onAnalyze={() => {
          if (selectionCount !== 1) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const selectedEntries = Object.entries(selectedItems);
          if (selectedEntries.length === 0) return;
          const [dataIndex, keys] = selectedEntries[0];
          const dataPoint = data[parseInt(dataIndex)];
          if (dataPoint) {
            const formatted = formatDataPoint(dataPoint, Object.keys(keys));
            chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${formatted}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onCompare={() => {
          if (selectionCount < 2) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${formattedData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onAddToPrompt={() => {
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.addToInput(formattedData.join('\n\n'));
          }
        }}
      />
    </div>
  );
}

interface PieChartProps extends BaseChartProps {
  dataKey?: string;
  nameKey?: string;
}

// Internal chart renderer for Pie Chart
function PieChartRenderer({ 
  data, 
  height = 300,
  colors = DEFAULT_COLORS,
  dataKey = 'value',
  nameKey = 'name',
  selectedIndices = [],
  onCellClick
}: { 
  data: ChartDataPoint[]; 
  height?: number; 
  colors?: string[]; 
  dataKey?: string; 
  nameKey?: string;
  selectedIndices?: number[];
  onCellClick?: (index: number) => void;
}) {
  const chartConfig: ChartConfig = data.reduce((acc, item, index) => {
    const name = String(item[nameKey] || item.name);
    acc[name] = {
      label: name,
      color: colors[index % colors.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
        >
          {data.map((entry, index) => {
            const isSelected = selectedIndices.includes(index);
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
                onClick={() => onCellClick?.(index)}
                style={{ cursor: 'pointer' }}
                stroke={isSelected ? '#8B5CF6' : 'none'}
                strokeWidth={isSelected ? 3 : 0}
                strokeDasharray={isSelected ? '4 4' : '0'}
              />
            );
          })}
        </Pie>
        <ChartTooltip content={<DarkTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}

export function PieChartComponent(props: PieChartProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chatActions = useChatActions();

  const handleCellClick = useCallback((index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  }, []);

  // Add DOM-based click handlers for pie chart (fallback if Cell onClick doesn't work)
  useEffect(() => {
    if (!chartRef.current) return;

    const attachHandlers = () => {
      const svg = chartRef.current?.querySelector('svg');
      if (!svg) return;

      // Find all path elements that are pie slices
      const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
        const fill = path.getAttribute('fill');
        const d = path.getAttribute('d') || '';
        return fill && 
               fill !== 'none' && 
               fill !== 'transparent' &&
               d.includes('A') && // Arc command
               !path.classList.contains('selection-border');
      });

      paths.forEach((path, index) => {
        if (index >= props.data.length) return;
        
        path.style.cursor = 'pointer';
        
        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();
          handleCellClick(index);
        };

        // Remove old handler
        const oldHandler = (path as SVGPathElement & { __pieClickHandler?: (e: MouseEvent) => void }).__pieClickHandler;
        if (oldHandler) {
          path.removeEventListener('click', oldHandler);
        }
        
        (path as SVGPathElement & { __pieClickHandler?: (e: MouseEvent) => void }).__pieClickHandler = clickHandler;
        path.addEventListener('click', clickHandler, true);

        // Add/remove selection border
        const existingBorder = path.parentElement?.querySelector(`.selection-border-${index}`);
        if (existingBorder) {
          existingBorder.remove();
        }

        if (selectedIndices.includes(index)) {
          const border = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          border.setAttribute('d', path.getAttribute('d') || '');
          border.setAttribute('fill', 'none');
          border.setAttribute('stroke', '#8B5CF6');
          border.setAttribute('stroke-width', '3');
          border.setAttribute('stroke-dasharray', '4 4');
          border.setAttribute('class', `selection-border selection-border-${index}`);
          border.style.pointerEvents = 'none';
          
          path.parentElement?.insertBefore(border, path.nextSibling);
        }
      });
    };

    const timeout1 = setTimeout(attachHandlers, 200);
    const timeout2 = setTimeout(attachHandlers, 800);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [props.data, selectedIndices, handleCellClick]);

  const filteredDataRef = React.useRef<ChartDataPoint[]>([]);
  return (
    <div style={{ position: 'relative' }}>
      <ChartWrapper
        chartType="pie"
        title={props.title}
        subtitle={props.subtitle}
        data={props.data}
        dateRange={props.dateRange}
        onTimePeriodChange={() => setSelectedIndices([])}
        onChartCopy={props.onChartCopy}
        onChartPin={props.onChartPin}
        onChartUnpin={props.onChartUnpin}
        onChartShare={props.onChartShare}
        isPinned={props.isPinned}
        isPinnedBoard={props.isPinnedBoard}
        pinnedItems={props.pinnedItems}
      >
        {(filteredData) => {
          filteredDataRef.current = filteredData as ChartDataPoint[];
          return (
            <div style={{ position: 'relative' }} ref={chartRef} >
              <PieChartRenderer 
                data={filteredData as ChartDataPoint[]} 
                height={props.height} 
                colors={props.colors}
                dataKey={props.dataKey}
                nameKey={props.nameKey}
                selectedIndices={selectedIndices.filter((i) => i < filteredData.length)}
                onCellClick={handleCellClick}
              />
            </div>
          );
        }}
      </ChartWrapper>
      <SelectionPanel
        selectedCount={selectedIndices.length}
        onAnalyze={() => {
          if (selectedIndices.length !== 1) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const dataPoint = filteredDataRef.current[selectedIndices[0]];
          if (dataPoint) {
            const formatted = formatDataPointByIndex(dataPoint, props.dataKey, props.nameKey);
            chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${formatted}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onCompare={() => {
          if (selectedIndices.length < 2) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = selectedIndices
            .map(index => {
              const dataPoint = filteredDataRef.current[index];
              if (dataPoint) {
                return formatDataPointByIndex(dataPoint, props.dataKey, props.nameKey);
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${formattedData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onAddToPrompt={() => {
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = selectedIndices
            .map(index => {
              const dataPoint = filteredDataRef.current[index];
              if (dataPoint) {
                return formatDataPointByIndex(dataPoint, props.dataKey, props.nameKey);
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.addToInput(formattedData.join('\n\n'));
          }
        }}
      />
    </div>
  );
}

export function DonutChartComponent(props: PieChartProps) {
  const { 
    title, 
    subtitle, 
    data, 
    height = 300,
    colors = DEFAULT_COLORS,
    dataKey = 'value',
    nameKey = 'name'
  } = props;
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chatActions = useChatActions();

  const handleCellClick = useCallback((index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  }, []);

  const chartConfig: ChartConfig = data.reduce((acc, item, index) => {
    const name = String(item[nameKey] || item.name);
    acc[name] = {
      label: name,
      color: colors[index % colors.length],
    };
    return acc;
  }, {} as ChartConfig);

  const selectionCount = selectedIndices.length;
  const filteredDataRef = React.useRef<ChartDataPoint[]>([]);

  // Add DOM-based click handlers for donut chart (fallback if Cell onClick doesn't work)
  useEffect(() => {
    if (!chartRef.current) return;

    const attachHandlers = () => {
      const svg = chartRef.current?.querySelector('svg');
      if (!svg) return;

      // Find all path elements that are pie/donut slices
      const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
        const fill = path.getAttribute('fill');
        const d = path.getAttribute('d') || '';
        // Pie slices have arc paths (contain 'A' command) and fill colors
        return fill && 
               fill !== 'none' && 
               fill !== 'transparent' &&
               d.includes('A') && // Arc command
               !path.classList.contains('selection-border');
      });

      // Sort paths by angle/position to match data order
      paths.sort((a, b) => {
        const aD = a.getAttribute('d') || '';
        const bD = b.getAttribute('d') || '';
        // Extract start angle from path data (rough approximation)
        const aMatch = aD.match(/M\s*[\d.]+\s*([\d.]+)/);
        const bMatch = bD.match(/M\s*[\d.]+\s*([\d.]+)/);
        if (aMatch && bMatch) {
          return parseFloat(aMatch[1]) - parseFloat(bMatch[1]);
        }
        return 0;
      });

      paths.forEach((path, index) => {
        if (index >= data.length) return;
        
        path.style.cursor = 'pointer';
        
        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();
          handleCellClick(index);
        };

        // Remove old handler
        const oldHandler = (path as SVGPathElement & { __donutClickHandler?: (e: MouseEvent) => void }).__donutClickHandler;
        if (oldHandler) {
          path.removeEventListener('click', oldHandler);
        }
        
        (path as SVGPathElement & { __donutClickHandler?: (e: MouseEvent) => void }).__donutClickHandler = clickHandler;
        path.addEventListener('click', clickHandler, true);

        // Add/remove selection border
        const existingBorder = path.parentElement?.querySelector(`.selection-border-${index}`);
        if (existingBorder) {
          existingBorder.remove();
        }

        if (selectedIndices.includes(index)) {
          // Clone the path for the border
          const border = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          border.setAttribute('d', path.getAttribute('d') || '');
          border.setAttribute('fill', 'none');
          border.setAttribute('stroke', '#8B5CF6');
          border.setAttribute('stroke-width', '3');
          border.setAttribute('stroke-dasharray', '4 4');
          border.setAttribute('class', `selection-border selection-border-${index}`);
          border.style.pointerEvents = 'none';
          
          path.parentElement?.insertBefore(border, path.nextSibling);
        }
      });
    };

    const timeout1 = setTimeout(attachHandlers, 200);
    const timeout2 = setTimeout(attachHandlers, 800);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [data, selectedIndices, handleCellClick]);

  return (
    <div style={{ position: 'relative' }}>
      <ChartWrapper
        chartType="donut"
        title={props.title}
        subtitle={props.subtitle}
        data={props.data}
        dateRange={props.dateRange}
        onTimePeriodChange={() => setSelectedIndices([])}
        onChartCopy={props.onChartCopy}
        onChartPin={props.onChartPin}
        onChartUnpin={props.onChartUnpin}
        onChartShare={props.onChartShare}
        isPinned={props.isPinned}
        isPinnedBoard={props.isPinnedBoard}
        pinnedItems={props.pinnedItems}
      >
        {(filteredData) => {
          filteredDataRef.current = filteredData as ChartDataPoint[];
          const filteredChartConfig = (filteredData as ChartDataPoint[]).reduce((acc, item, index) => {
            const name = String(item[nameKey] || item.name);
            acc[name] = {
              label: name,
              color: colors[index % colors.length],
            };
            return acc;
          }, {} as ChartConfig);
          return (
            <div style={{ position: 'relative' }} ref={chartRef}>
              <ChartContainer config={filteredChartConfig} className="h-[220px] w-full">
                <PieChart>
                  <Pie
                    data={filteredData as ChartDataPoint[]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {filteredData.map((entry, index) => {
                  const isSelected = selectedIndices.includes(index);
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]}
                      onClick={() => handleCellClick(index)}
                      style={{ cursor: 'pointer' }}
                      stroke={isSelected ? '#8B5CF6' : 'none'}
                      strokeWidth={isSelected ? 3 : 0}
                      strokeDasharray={isSelected ? '4 4' : '0'}
                    />
                  );
                })}
              </Pie>
              <ChartTooltip content={<DarkTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </div>
          );
        }}
      </ChartWrapper>
      <SelectionPanel
        selectedCount={selectionCount}
        onAnalyze={() => {
          if (selectionCount !== 1) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const dataPoint = filteredDataRef.current[selectedIndices[0]];
          if (dataPoint) {
            const formatted = formatDataPointByIndex(dataPoint, dataKey, nameKey);
            chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${formatted}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onCompare={() => {
          if (selectionCount < 2) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = selectedIndices
            .map(index => {
              const dataPoint = filteredDataRef.current[index];
              if (dataPoint) {
                return formatDataPointByIndex(dataPoint, dataKey, nameKey);
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${formattedData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onAddToPrompt={() => {
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = selectedIndices
            .map(index => {
              const dataPoint = filteredDataRef.current[index];
              if (dataPoint) {
                return formatDataPointByIndex(dataPoint, dataKey, nameKey);
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.addToInput(formattedData.join('\n\n'));
          }
        }}
      />
    </div>
  );
}

interface RadarChartProps extends BaseChartProps {
  dataKey?: string;
}

// Internal chart renderer for Radar Chart
function RadarChartRenderer({ 
  data, 
  height = 300,
  colors = DEFAULT_COLORS,
  dataKey = 'value',
  hasSelectedPoints,
  dataKeys
}: { 
  data: ChartDataPoint[]; 
  height?: number; 
  colors?: string[]; 
  dataKey?: string;
  hasSelectedPoints?: (key: string) => boolean;
  dataKeys?: string[];
}) {
  // Use first dataKey if multiple exist, otherwise use provided dataKey
  const primaryDataKey = dataKeys && dataKeys.length > 0 ? dataKeys[0] : dataKey;
  const isSelected = hasSelectedPoints ? hasSelectedPoints(primaryDataKey) : false;
  
  const chartConfig: ChartConfig = {
    [primaryDataKey]: {
      label: 'Value',
      color: colors[0],
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis 
          dataKey="name" 
          tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
        />
        <PolarRadiusAxis 
          tick={{ fill: '#6B7785', fontSize: 12, fontFamily: 'Manrope' }}
        />
        {dataKeys && dataKeys.length > 0 ? (
          dataKeys.map((key, index) => {
            const keyIsSelected = hasSelectedPoints ? hasSelectedPoints(key) : false;
            return (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
                strokeDasharray={keyIsSelected ? '4 4' : '0'}
                dot={{ r: 4 }}
              />
            );
          })
        ) : (
          <Radar
            name="Value"
            dataKey={primaryDataKey}
            stroke={colors[0]}
            fill={colors[0]}
            fillOpacity={0.6}
            strokeDasharray={isSelected ? '4 4' : '0'}
            dot={{ r: 4 }}
          />
        )}
        <ChartTooltip content={<DarkTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </RadarChart>
    </ChartContainer>
  );
}

export function RadarChartComponent(props: RadarChartProps) {
  // State for selected items - format: { dataIndex: { [dataKey]: true } }
  const [selectedItems, setSelectedItems] = useState<Record<number, Record<string, boolean>>>({});
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chatActions = useChatActions();

  const dataKeys = useMemo(() => {
    return getNumericDataKeys(props.data);
  }, [props.data]);

  // Handle data point click
  const handleDataPointClick = useCallback((dataIndex: number, dataKey: string) => {
    setSelectedItems((prev) => {
      const newSelection = { ...prev };
      if (!newSelection[dataIndex]) {
        newSelection[dataIndex] = {};
      }
      
      // Toggle selection
      if (newSelection[dataIndex][dataKey]) {
        delete newSelection[dataIndex][dataKey];
        if (Object.keys(newSelection[dataIndex]).length === 0) {
          delete newSelection[dataIndex];
        }
      } else {
        newSelection[dataIndex][dataKey] = true;
      }
      
      return newSelection;
    });
  }, []);

  // Get total selection count
  const selectionCount = useMemo(() => {
    return Object.values(selectedItems).reduce(
      (total, keys) => total + Object.keys(keys).length,
      0
    );
  }, [selectedItems]);

  // Check if a dataKey has any selected points
  const hasSelectedPoints = useCallback((dataKey: string) => {
    return Object.values(selectedItems).some(keys => keys[dataKey]);
  }, [selectedItems]);

  // Add click handlers and update radar line styles
  useEffect(() => {
    if (!chartRef.current || dataKeys.length === 0) return;

    const updateChart = () => {
      const svg = chartRef.current?.querySelector('svg');
      if (!svg) return;

      // Update radar line stroke styles based on selection
      dataKeys.forEach((dataKey, keyIndex) => {
        const isSelected = hasSelectedPoints(dataKey);
        const expectedColor = props.colors?.[keyIndex % (props.colors?.length || DEFAULT_COLORS.length)] || DEFAULT_COLORS[keyIndex % DEFAULT_COLORS.length];
        
        // Find all path elements for this dataKey (radar polygon paths)
        const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
          const stroke = path.getAttribute('stroke');
          const fill = path.getAttribute('fill');
          
          // Match by stroke or fill color
          return (stroke === expectedColor || fill === expectedColor) &&
                 path.getAttribute('d')?.includes('L'); // Polygon path
        });

        paths.forEach(path => {
          if (isSelected) {
            path.setAttribute('stroke-dasharray', '4 4');
            path.style.strokeDasharray = '4 4';
          } else {
            path.setAttribute('stroke-dasharray', '0');
            path.style.strokeDasharray = '0';
          }
        });
      });

      // Add click handlers to dots/circles (data points on radar)
      const circles = Array.from(svg.querySelectorAll('circle'));
      circles.forEach((circle) => {
        const fill = circle.getAttribute('fill') || '';

        // Find which dataKey this circle belongs to by color
        const keyIndex = (props.colors || DEFAULT_COLORS).findIndex(c => c === fill || c.toLowerCase() === fill.toLowerCase());
        if (keyIndex < 0 || keyIndex >= dataKeys.length) return;

        const dataKey = dataKeys[keyIndex];

        circle.style.cursor = 'pointer';
        circle.setAttribute('data-point-key', dataKey);

        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();
          
          // For radar charts, we need to find which data point this circle represents
          // by finding its position relative to other circles
          const circleFill = circle.getAttribute('fill') || '';
          const allCirclesForKey = circles.filter(c => {
            const cFill = c.getAttribute('fill') || '';
            return cFill === circleFill || cFill.toLowerCase() === circleFill.toLowerCase();
          });

          // For radar, we can use angle/position to determine index
          // Sort circles by angle from center
          const centerX = svg.viewBox?.baseVal?.width ? svg.viewBox.baseVal.width / 2 : parseFloat(svg.getAttribute('width') || '0') / 2;
          const centerY = svg.viewBox?.baseVal?.height ? svg.viewBox.baseVal.height / 2 : parseFloat(svg.getAttribute('height') || '0') / 2;

          const sortedCircles = [...allCirclesForKey].sort((a, b) => {
            const ax = parseFloat(a.getAttribute('cx') || '0') - centerX;
            const ay = parseFloat(a.getAttribute('cy') || '0') - centerY;
            const bx = parseFloat(b.getAttribute('cx') || '0') - centerX;
            const by = parseFloat(b.getAttribute('cy') || '0') - centerY;
            
            const angleA = Math.atan2(ay, ax);
            const angleB = Math.atan2(by, bx);
            return angleA - angleB;
          });

          const circleIndex = sortedCircles.indexOf(circle);
          if (circleIndex >= 0 && circleIndex < props.data.length) {
            handleDataPointClick(circleIndex, dataKey);
          }
        };

        // Remove old handler
        const oldHandler = (circle as SVGCircleElement & { __radarClickHandler?: (e: MouseEvent) => void }).__radarClickHandler;
        if (oldHandler) {
          circle.removeEventListener('click', oldHandler);
        }

        (circle as SVGCircleElement & { __radarClickHandler?: (e: MouseEvent) => void }).__radarClickHandler = clickHandler;
        circle.addEventListener('click', clickHandler, true);
      });
    };

    const timeout1 = setTimeout(updateChart, 100);
    const timeout2 = setTimeout(updateChart, 500);
    const timeout3 = setTimeout(updateChart, 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [props.data, dataKeys, props.colors, selectedItems, handleDataPointClick, hasSelectedPoints]);

  return (
    <div style={{ position: 'relative' }}>
      <ChartWrapper
        chartType="radar"
        title={props.title}
        subtitle={props.subtitle}
        data={props.data}
        dateRange={props.dateRange}
        onTimePeriodChange={() => setSelectedItems({})}
        onChartCopy={props.onChartCopy}
        onChartPin={props.onChartPin}
        onChartUnpin={props.onChartUnpin}
        onChartShare={props.onChartShare}
        isPinned={props.isPinned}
        isPinnedBoard={props.isPinnedBoard}
        pinnedItems={props.pinnedItems}
      >
        {(filteredData) => (
          <div style={{ position: 'relative' }} ref={chartRef}>
            <RadarChartRenderer 
              data={filteredData as ChartDataPoint[]} 
              height={props.height} 
              colors={props.colors}
              dataKey={props.dataKey}
              hasSelectedPoints={hasSelectedPoints}
              dataKeys={dataKeys}
            />
          </div>
        )}
      </ChartWrapper>
      <SelectionPanel
        selectedCount={selectionCount}
        onAnalyze={() => {
          if (selectionCount !== 1 || !chatActions) return;
          const selectedEntries = Object.entries(selectedItems);
          if (selectedEntries.length === 0) return;
          const [dataIndex, keys] = selectedEntries[0];
          const dataPoint = props.data[parseInt(dataIndex)];
          if (dataPoint) {
            const formatted = formatDataPoint(dataPoint, Object.keys(keys));
            chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${formatted}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
          }
        }}
        onCompare={() => {
          if (selectionCount < 2) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = props.data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${formattedData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onAddToPrompt={() => {
          if (!chatActions) return;
          const formattedData = Object.entries(selectedItems)
            .map(([dataIndex, keys]) => {
              const dataPoint = props.data[parseInt(dataIndex)];
              if (dataPoint) {
                return formatDataPoint(dataPoint, Object.keys(keys));
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.addToInput(formattedData.join('\n\n'));
          }
        }}
      />
    </div>
  );
}

export function RadialChartComponent(props: PieChartProps) {
  const { 
    title, 
    subtitle, 
    data, 
    height = 300,
    colors = DEFAULT_COLORS,
    dataKey = 'value',
    nameKey = 'name'
  } = props;
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chatActions = useChatActions();

  const handleCellClick = useCallback((index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  }, []);

  // Add fill colors to each data point
  const dataWithColors = data.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length],
  }));

  const chartConfig: ChartConfig = data.reduce((acc, item, index) => {
    const name = String(item[nameKey] || item.name);
    acc[name] = {
      label: name,
      color: colors[index % colors.length],
    };
    return acc;
  }, {} as ChartConfig);

  const selectionCount = selectedIndices.length;
  const filteredDataRef = React.useRef<ChartDataPoint[]>([]);

  // Add click handlers for radial bars via DOM (fallback if Cell onClick doesn't work)
  useEffect(() => {
    if (!chartRef.current) return;

    const attachHandlers = () => {
      const svg = chartRef.current?.querySelector('svg');
      if (!svg) return;

      // Find all path elements that are radial bars (not axes or grid)
      const paths = Array.from(svg.querySelectorAll('path')).filter(path => {
        const fill = path.getAttribute('fill');
        const d = path.getAttribute('d') || '';
        // Radial bars have arc paths and fill colors
        return fill && 
               fill !== 'none' && 
               fill !== 'transparent' &&
               d.includes('A') && // Arc command
               !path.classList.contains('selection-border');
      });

      paths.forEach((path, index) => {
        if (index >= data.length) return;
        
        path.style.cursor = 'pointer';
        
        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();
          handleCellClick(index);
        };

        // Remove old handler
        const oldHandler = (path as SVGPathElement & { __radialClickHandler?: (e: MouseEvent) => void }).__radialClickHandler;
        if (oldHandler) {
          path.removeEventListener('click', oldHandler);
        }
        
        (path as SVGPathElement & { __radialClickHandler?: (e: MouseEvent) => void }).__radialClickHandler = clickHandler;
        path.addEventListener('click', clickHandler, true);

        // Add selection border if selected
        if (selectedIndices.includes(index)) {
          // Remove existing border for this path
          const existingBorder = path.parentElement?.querySelector(`.selection-border-${index}`);
          if (existingBorder) {
            existingBorder.remove();
          }

          // Get path bounds
          const bbox = path.getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            // Create a border path matching the radial bar
            const border = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            border.setAttribute('d', path.getAttribute('d') || '');
            border.setAttribute('fill', 'none');
            border.setAttribute('stroke', '#8B5CF6');
            border.setAttribute('stroke-width', '3');
            border.setAttribute('stroke-dasharray', '4 4');
            border.setAttribute('class', `selection-border selection-border-${index}`);
            border.style.pointerEvents = 'none';
            
            path.parentElement?.insertBefore(border, path.nextSibling);
          }
        } else {
          // Remove border if not selected
          const existingBorder = path.parentElement?.querySelector(`.selection-border-${index}`);
          if (existingBorder) {
            existingBorder.remove();
          }
        }
      });
    };

    const timeout1 = setTimeout(attachHandlers, 200);
    const timeout2 = setTimeout(attachHandlers, 800);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [data, selectedIndices, handleCellClick]);

  return (
    <div style={{ position: 'relative' }}>
      <ChartWrapper
        chartType="radial"
        title={props.title}
        subtitle={props.subtitle}
        data={props.data}
        dateRange={props.dateRange}
        onTimePeriodChange={() => setSelectedIndices([])}
        onChartCopy={props.onChartCopy}
        onChartPin={props.onChartPin}
        onChartUnpin={props.onChartUnpin}
        onChartShare={props.onChartShare}
        isPinned={props.isPinned}
        isPinnedBoard={props.isPinnedBoard}
        pinnedItems={props.pinnedItems}
      >
        {(filteredData) => {
          filteredDataRef.current = filteredData as ChartDataPoint[];
          const filteredDataWithColors = (filteredData as ChartDataPoint[]).map((entry, index) => ({
            ...entry,
            fill: colors[index % colors.length],
          }));
          const filteredChartConfig = (filteredData as ChartDataPoint[]).reduce((acc, item, index) => {
            const name = String(item[nameKey] || item.name);
            acc[name] = {
              label: name,
              color: colors[index % colors.length],
            };
            return acc;
          }, {} as ChartConfig);
          return (
            <div style={{ position: 'relative' }} ref={chartRef}>
              <ChartContainer config={filteredChartConfig} className="h-[220px] w-full">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="20%" 
                  outerRadius="80%" 
                  data={filteredDataWithColors}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey={dataKey}
                cornerRadius={4}
              >
                {(filteredData as ChartDataPoint[]).map((entry, index) => {
                  const isSelected = selectedIndices.includes(index);
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]}
                      onClick={() => handleCellClick(index)}
                      style={{ cursor: 'pointer' }}
                      stroke={isSelected ? '#8B5CF6' : 'none'}
                      strokeWidth={isSelected ? 3 : 0}
                      strokeDasharray={isSelected ? '4 4' : '0'}
                    />
                  );
                })}
              </RadialBar>
              <ChartTooltip content={<DarkTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
            </RadialBarChart>
          </ChartContainer>
        </div>
          );
        }}
      </ChartWrapper>
      <SelectionPanel
        selectedCount={selectionCount}
        onAnalyze={() => {
          if (selectionCount !== 1) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const dataPoint = filteredDataRef.current[selectedIndices[0]];
          if (dataPoint) {
            const formatted = formatDataPointByIndex(dataPoint, dataKey, nameKey);
            chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${formatted}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onCompare={() => {
          if (selectionCount < 2) return;
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = selectedIndices
            .map(index => {
              const dataPoint = filteredDataRef.current[index];
              if (dataPoint) {
                return formatDataPointByIndex(dataPoint, dataKey, nameKey);
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${formattedData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
            // Scroll to bottom after sending
            if (chatActions.scrollToBottom) {
              setTimeout(() => {
                chatActions.scrollToBottom?.(true);
              }, 200);
            }
          }
        }}
        onAddToPrompt={() => {
          if (!chatActions) {
            console.error('ChatActions context not available');
            return;
          }
          const formattedData = selectedIndices
            .map(index => {
              const dataPoint = filteredDataRef.current[index];
              if (dataPoint) {
                return formatDataPointByIndex(dataPoint, dataKey, nameKey);
              }
              return null;
            })
            .filter(Boolean);
          if (formattedData.length > 0) {
            chatActions.addToInput(formattedData.join('\n\n'));
          }
        }}
      />
    </div>
  );
}
