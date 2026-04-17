'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  AreaChart as ChartArea, 
  ChartColumnBig  as ChartBarBig, 
  ChartLine  as ChartLine,
  ChartPie,
  Pentagon,
  Radar,
} from 'lucide-react';
import { ChartModal } from './ChartModal';
import { HoverMenu } from './HoverMenu';
import Select from '@/components/ui/Select';
import { FONT_FAMILY } from '@/lib/styles/constants';

export type ChartType = 'area' | 'line' | 'bar' | 'pie' | 'donut' | 'radar' | 'radial';

type ChartDataPoint = Record<string, string | number>;

/** Filter chart data by selected time period */
function filterDataByTimePeriod(
  data: ChartDataPoint[],
  selectedPeriod: string | null,
  dateRange: { start: Date; end: Date } | null
): ChartDataPoint[] {
  if (!data || data.length === 0) return data;
  if (!selectedPeriod) return data;

  // "All Data" - show everything
  if (selectedPeriod === 'all') return data;

  // Date-based filtering (Last month, Last 3 month, Last 6 month, Last 12 month)
  if (!dateRange) return data;

  const { end } = dateRange;
  const numValue = parseInt(selectedPeriod, 10);
  if (isNaN(numValue)) return data;

  const cutoffDate = new Date(end);
  cutoffDate.setMonth(cutoffDate.getMonth() - numValue);

  return data.filter((item) => {
    const dateStr = String(item.name ?? item.date ?? '');
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true; // Include if unparseable
    return itemDate >= cutoffDate;
  });
}

interface ChartWrapperProps {
  chartType: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode | ((filteredData: ChartDataPoint[]) => React.ReactNode);
  data?: Array<Record<string, string | number>>;
  dateRange?: {
    startDate: Date | string;
    endDate: Date | string;
  };
  onTimePeriodChange?: (period: string) => void;
  onChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onChartPin?: (chartData: string) => void;
  onChartUnpin?: (chartData: string) => void;
  onChartShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  isPinned?: boolean;
  isPinnedBoard?: boolean;
  pinnedItems?: Array<{ content: string }>;
}

// Chart type icons for the header (based on chart type)
const CHART_TYPE_ICONS: Record<ChartType, { label: string; icon: React.ComponentType<{ className?: string; size?: number }> }> = {
  area: { label: 'Area Chart', icon: ChartArea },
  bar: { label: 'Bar Chart', icon: ChartBarBig },
  line: { label: 'Line Chart', icon: ChartLine },
  pie: { label: 'Pie Chart', icon: ChartPie },
  donut: { label: 'Donut Chart', icon: ChartPie },
  radar: { label: 'Radar Chart', icon: Pentagon },
  radial: { label: 'Radial Chart', icon: Radar },
};

// Icon buttons for the right side (always Area, Bar, Line)
const CHART_TYPE_BUTTONS: Array<{ value: ChartType; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }> = [
  { value: 'area', label: 'Area Chart', icon: ChartArea },
  { value: 'bar', label: 'Bar Chart', icon: ChartBarBig },
  { value: 'line', label: 'Line Chart', icon: ChartLine },
];

const CHART_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  padding: '6px 12px',
  justifyContent: 'space-between',
  alignItems: 'center',
  alignSelf: 'stretch',
  borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
};

const CHART_NAME_LEFT_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const CHART_ICON_WRAPPER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '14.4px',
  height: '14.4px',
  color: 'var(--Lynch-400, #8695AA)',
};

const CHART_TYPE_LABEL_STYLE: React.CSSProperties = {
  fontFamily: FONT_FAMILY.manrope,
  fontSize: '13px',
  fontStyle: 'normal',
  fontWeight: 500,
  lineHeight: '24px',
  letterSpacing: '0.09px',
  color: 'var(--Lynch-400, #8695AA)',
};

const CHART_TITLE_BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  padding: '12px 20px 14px 20px',
  alignItems: 'center',
  gap: '8px',
  alignSelf: 'stretch',
  borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
};

const CHART_TITLE_LEFT_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  flex: '1 0 0',
  minWidth: 0,
  justifyContent: 'center',
};

const CHART_TITLE_STYLE: React.CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 1,
  overflow: 'hidden',
  color: 'var(--Lynch-900, #343A46)',
  textOverflow: 'ellipsis',
  fontFamily: FONT_FAMILY.manrope,
  fontSize: '16px',
  fontStyle: 'normal',
  fontWeight: 600,
  lineHeight: '24px',
  margin: 0,
  padding: 0,
};

const CHART_SUBTITLE_STYLE: React.CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
  color: 'var(--muted-foreground, #737373)',
  textOverflow: 'ellipsis',
  fontFamily: FONT_FAMILY.manrope,
  fontSize: '13px',
  fontStyle: 'normal',
  fontWeight: 500,
  lineHeight: '24px',
  letterSpacing: '0.09px',
  margin: 0,
  padding: 0,
};

const TIME_PERIOD_DROPDOWN_STYLE: React.CSSProperties = {
  display: 'flex',
  width: '147px',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '4px',
};

export function ChartWrapper({
  chartType,
  onChartTypeChange,
  title,
  subtitle,
  children,
  data = [],
  dateRange,
  onTimePeriodChange,
  onChartCopy,
  onChartPin,
  onChartUnpin,
  onChartShare,
  isPinned: isPinnedProp = false,
  isPinnedBoard = false,
  pinnedItems = [],
}: ChartWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringContainerRef = useRef(false);
  const isHoveringMenuRef = useRef(false);

  // Handle hover with delay to allow movement between container and menu
  const handleContainerMouseEnter = React.useCallback(() => {
    if (!isPinnedBoard) {
      isHoveringContainerRef.current = true;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  }, [isPinnedBoard]);

  const handleContainerMouseLeave = React.useCallback(() => {
    if (!isPinnedBoard) {
      isHoveringContainerRef.current = false;
      // Only hide if we're not hovering over the menu either
      if (!isHoveringMenuRef.current) {
        hoverTimeoutRef.current = setTimeout(() => {
          // Double-check that we're still not hovering before hiding
          if (!isHoveringContainerRef.current && !isHoveringMenuRef.current) {
            setIsHovered(false);
          }
          hoverTimeoutRef.current = null;
        }, 200);
      }
    }
  }, [isPinnedBoard]);

  const handleMenuMouseEnter = React.useCallback(() => {
    if (!isPinnedBoard) {
      isHoveringMenuRef.current = true;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  }, [isPinnedBoard]);

  const handleMenuMouseLeave = React.useCallback(() => {
    if (!isPinnedBoard) {
      isHoveringMenuRef.current = false;
      // Only hide if we're not hovering over the container either
      if (!isHoveringContainerRef.current) {
        hoverTimeoutRef.current = setTimeout(() => {
          // Double-check that we're still not hovering before hiding
          if (!isHoveringContainerRef.current && !isHoveringMenuRef.current) {
            setIsHovered(false);
          }
          hoverTimeoutRef.current = null;
        }, 200);
      }
    }
  }, [isPinnedBoard]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Disable hover state when in pinned board - ensure it's always false
  React.useEffect(() => {
    if (isPinnedBoard) {
      setIsHovered(false);
    }
  }, [isPinnedBoard]);
  
  // Ensure hover state is never true when in pinned board
  const effectiveIsHovered = isPinnedBoard ? false : isHovered;

  // Serialize chart data to string for pinning
  const serializeChartData = (): string => {
    const chartInfo = {
      type: 'chart',
      chartType,
      title,
      subtitle,
      data,
      dateRange: dateRange ? {
        startDate: typeof dateRange.startDate === 'string' ? dateRange.startDate : dateRange.startDate.toISOString(),
        endDate: typeof dateRange.endDate === 'string' ? dateRange.endDate : dateRange.endDate.toISOString(),
      } : undefined,
    };
    return JSON.stringify(chartInfo);
  };

  // Check if this chart is pinned
  const checkIfChartPinned = (): boolean => {
    if (isPinnedBoard) return true; // Always pinned in pinned board
    if (isPinnedProp) return true; // If explicitly set as pinned
    const chartDataString = serializeChartData();
    return pinnedItems.some((item) => {
      const itemContent = typeof item.content === 'string' ? item.content : String(item.content || '');
      try {
        // Try to parse and compare JSON structures
        const itemData = JSON.parse(itemContent);
        const currentData = JSON.parse(chartDataString);
        return JSON.stringify(itemData) === JSON.stringify(currentData);
      } catch {
        // If not JSON, do string comparison
        return itemContent.trim() === chartDataString.trim();
      }
    });
  };

  const isPinned = checkIfChartPinned();

  // Generate time period options based on date range or data dynamically
  const timePeriodOptions = React.useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    
    // First, try to use provided dateRange
    if (dateRange) {
      const { startDate, endDate } = dateRange;
      start = typeof startDate === 'string' ? new Date(startDate) : startDate;
      end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    }
    
    // If dateRange is not provided or invalid, try to extract from data
    if ((!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) && data && data.length > 0) {
      // Try to find date values in the data
      const dateValues: Date[] = [];
      
      // First, check if 'name' field contains dates (most common case)
      data.forEach((item) => {
        if (item.name) {
          const dateStr = String(item.name);
          const date = new Date(dateStr);
          // Check if it's a valid date and not just a number that happens to parse
          if (!isNaN(date.getTime()) && dateStr.length > 4) {
            dateValues.push(date);
          }
        }
      });
      
      // If no dates found in 'name', check other string fields
      if (dateValues.length === 0 && data.length > 0) {
        const firstItem = data[0];
        const potentialDateKeys: string[] = [];
        
        // Find fields that might contain dates (exclude numeric fields)
        Object.keys(firstItem).forEach((key) => {
          if (key !== 'name' && key !== 'value') {
            const value = firstItem[key];
            const valueStr = String(value);
            // Check if it looks like a date string (contains separators like /, -, or is ISO format)
            if (typeof value === 'string' && (valueStr.includes('/') || valueStr.includes('-') || valueStr.includes('T'))) {
              potentialDateKeys.push(key);
            }
          }
        });
        
        // Try to parse dates from potential date fields
        for (const key of potentialDateKeys) {
          let foundValidDates = false;
          const tempDates: Date[] = [];
          
          for (const item of data) {
            const dateStr = String(item[key]);
            const date = new Date(dateStr);
            if (!isNaN(date.getTime()) && dateStr.length > 4) {
              tempDates.push(date);
              foundValidDates = true;
            }
          }
          
          if (foundValidDates && tempDates.length === data.length) {
            dateValues.push(...tempDates);
            break; // Use the first field that has valid dates for all items
          }
        }
      }
      
      if (dateValues.length > 0) {
        dateValues.sort((a, b) => a.getTime() - b.getTime());
        start = dateValues[0];
        end = dateValues[dateValues.length - 1];
      }
    }
    
    // If we don't have valid dates, show only "All Data"
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      if (data && data.length > 0) {
        return [{ value: 'all', label: 'All Data' }];
      }
      return [];
    }
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.ceil(diffDays / 30);
    
    // Only these 5 options: All Data, Last month, Last 3 month, Last 6 month, Last 12 month
    // Show options progressively based on data range:
    // - 1 month of data: All Data, Last month
    // - 2+ months: All Data, Last month, Last 3 month
    // - 3+ months: All Data, Last month, Last 3 month, Last 6 month
    // - 6+ months: All Data, Last month, Last 3 month, Last 6 month, Last 12 month
    const options: Array<{ value: string; label: string }> = [
      { value: 'all', label: 'All Data' },
    ];
    
    if (diffMonths >= 1) {
      options.push({ value: '1', label: 'Last month' });
    }
    if (diffMonths >= 2) {
      options.push({ value: '3', label: 'Last 3 month' });
    }
    if (diffMonths >= 3) {
      options.push({ value: '6', label: 'Last 6 month' });
    }
    if (diffMonths >= 6) {
      options.push({ value: '12', label: 'Last 12 month' });
    }
    
    return options;
  }, [dateRange, data]);

  // Extract date range for filtering (from prop or data)
  const dateRangeForFilter = useMemo(() => {
    if (dateRange) {
      const start = typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate;
      const end = typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate;
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return { start, end };
      }
    }
    if (data && data.length > 0) {
      const dateValues: Date[] = [];
      data.forEach((item) => {
        const dateStr = String(item.name ?? item.date ?? '');
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && dateStr.length > 4) {
          dateValues.push(date);
        }
      });
      if (dateValues.length > 0) {
        dateValues.sort((a, b) => a.getTime() - b.getTime());
        return { start: dateValues[0], end: dateValues[dateValues.length - 1] };
      }
    }
    return null;
  }, [dateRange, data]);

  // Filtered data based on selected time period
  const filteredData = useMemo(() => {
    return filterDataByTimePeriod(data, selectedTimePeriod, dateRangeForFilter);
  }, [data, selectedTimePeriod, dateRangeForFilter]);

  const selectedTimePeriodLabel = useMemo(() => {
    if (!selectedTimePeriod) return undefined;
    return timePeriodOptions.find((option) => option.value === selectedTimePeriod)?.label;
  }, [selectedTimePeriod, timePeriodOptions]);

  // Default to "All Data" when we have options and nothing selected
  React.useEffect(() => {
    if (timePeriodOptions.length > 0 && selectedTimePeriod === null) {
      const allOption = timePeriodOptions.find((o) => o.value === 'all');
      setSelectedTimePeriod(allOption ? 'all' : timePeriodOptions[0].value);
    }
  }, [timePeriodOptions, selectedTimePeriod]);

  const currentChartTypeInfo = CHART_TYPE_ICONS[chartType] || CHART_TYPE_ICONS.area;
  const ChartIcon = currentChartTypeInfo.icon;

  const buildExportChartPayload = React.useCallback(() => {
    return JSON.stringify({
      type: 'chart',
      chartType,
      title,
      subtitle,
      data: filteredData,
      dateRange,
      selectedTimePeriod: selectedTimePeriod || 'all',
      selectedTimePeriodLabel: selectedTimePeriodLabel || 'All Data',
    });
  }, [chartType, title, subtitle, filteredData, dateRange, selectedTimePeriod, selectedTimePeriodLabel]);

  const handleTimePeriodChange = (value: string) => {
    setSelectedTimePeriod(value);
    if (onTimePeriodChange) {
      onTimePeriodChange(value);
    }
  };

  const handleExpand = () => {
    setIsModalOpen(true);
  };

  function renderChartTypeButtons(opts: { variant: 'main' | 'modal' }) {
    const { variant } = opts;
    const isClickable = !!onChartTypeChange;

    return (
      <>
        {CHART_TYPE_BUTTONS.map((type, index) => {
          const isActive = chartType === type.value;
          const IconComponent = type.icon;
          const isLeft = index === 0;
          const isRight = index === CHART_TYPE_BUTTONS.length - 1;
          const isCenter = !isLeft && !isRight;

          const button = (
            <button
              key={type.value}
              onClick={() => {
                if (onChartTypeChange) {
                  onChartTypeChange(type.value);
                }
              }}
              disabled={variant === 'main' ? !isClickable : undefined}
              style={{
                display: 'flex',
                padding: '8px 10px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                borderRadius: isLeft
                  ? '8px 0 0 8px'
                  : isRight
                    ? '0 8px 8px 0'
                    : '0',
                border: '1px solid var(--Lynch-100, #ECEEF2)',
                background: isActive
                  ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.50) 100%), var(--Lynch-50, #F6F7F9)'
                  : 'linear-gradient(0deg, rgba(255, 255, 255, 0.80) 0%, rgba(255, 255, 255, 0.80) 100%), var(--Lynch-50, #F6F7F9)',
                boxShadow: isCenter || isRight ? '0 1px 4px 0 var(--Lynch-100, #ECEEF2)' : 'none',
                cursor: variant === 'main' ? (isClickable ? 'pointer' : 'default') : 'pointer',
                transition: 'all 0.15s ease',
                opacity: variant === 'main' ? (isClickable ? 1 : 0.6) : undefined,
              }}
              onMouseEnter={(e) => {
                // In modal, buttons are always clickable.
                if (variant === 'modal') return;
                if (isClickable && !isActive) {
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                // In modal, buttons are always clickable.
                if (variant === 'modal') return;
                if (isClickable && !isActive) {
                  e.currentTarget.style.opacity = '1';
                }
              }}
              title={type.label}
              aria-label={type.label}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? 'var(--Picton-Blue-500, #0BC0FF)' : 'var(--Lynch-700, #434E61)',
                }}
              >
                <IconComponent size={16} />
              </div>
            </button>
          );

          return button;
        })}
      </>
    );
  }

  // Render full chart content for modal (with wrapper, header, dropdown, chart)
  const renderFullChartContent = () => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          alignSelf: 'stretch',
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          padding: '0 32px 32px 32px',
        }}
      >
        {/* Inner Box - contains header and chart */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            flex: '1 1 auto',
            borderRadius: '12px',
            border: '1px solid var(--Lynch-300, #B1BBC8)',
            background: 'rgba(255, 255, 255, 0.60)',
            width: '100%',
            maxHeight: '422px',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Chart Header */}
          <div
            style={CHART_HEADER_STYLE}
          >
            {/* Left: Chart Name with Icon */}
            <div
              style={CHART_NAME_LEFT_STYLE}
            >
              <div
                style={CHART_ICON_WRAPPER_STYLE}
              >
                <ChartIcon size={14.4} />
              </div>
              <span
                style={CHART_TYPE_LABEL_STYLE}
              >
                {currentChartTypeInfo.label}
              </span>
            </div>

            {/* Right: Chart Type Selector Buttons (3 icon buttons - always Area, Bar, Line) */}
            {onChartTypeChange && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  flex: '1 0 0',
                }}
              >
                {renderChartTypeButtons({ variant: 'modal' })}
              </div>
            )}
          </div>

          {/* Chart Title/Details and Time Period Selector */}
          <div
            style={CHART_TITLE_BAR_STYLE}
          >
            {/* Left: Chart Title and Details */}
            <div
              style={CHART_TITLE_LEFT_STYLE}
            >
              {title && (
                <h3
                  style={CHART_TITLE_STYLE}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={CHART_SUBTITLE_STYLE}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Right: Time Period Dropdown */}
            {timePeriodOptions.length > 0 && (
              <div 
                style={TIME_PERIOD_DROPDOWN_STYLE}
              >
                <Select
                  value={selectedTimePeriod}
                  onChange={handleTimePeriodChange}
                  options={timePeriodOptions}
                  placeholder="Select period"
                  variant="chart"
                />
              </div>
            )}
          </div>

          {/* Chart Container */}
          <div
            style={{
              width: '100%',
              padding: '6px 16px 14px 16px',
              position: 'relative',
              background: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'auto',
              flex: 1,
              minHeight: 0,
            }}
          >
            {typeof children === 'function' ? children(filteredData) : children}
          </div>
        </div>
      </div>
    );
  };

  const handleCopy = () => {
    if (onChartCopy) {
      const chartData = buildExportChartPayload();
      onChartCopy('chart', chartData, title);
    }
  };

  const handleShare = () => {
    if (onChartShare) {
      const chartData = buildExportChartPayload();
      console.log('[Chart] Calling onChartShare with:', { type: 'chart', contentLength: chartData.length, title });
      onChartShare('chart', chartData, title);
    } else {
      console.warn('[Chart] Cannot share: onChartShare not provided');
    }
  };

  const handlePin = () => {
    const chartDataString = serializeChartData();
    if (isPinned && onChartUnpin) {
      onChartUnpin(chartDataString);
    } else if (!isPinned && onChartPin) {
      onChartPin(chartDataString);
    }
  };

  return (
    <>
      {/* Main Container - like table wrapper */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          padding: isPinnedBoard ? '0' : '12px 10px 16px 10px',
          alignItems: 'flex-start',
          gap: '8px',
          alignSelf: 'stretch',
          borderRadius: isPinnedBoard ? '0' : '4px',
          border: isPinnedBoard ? 'none' : '1px solid var(--Lynch-200, #D5D9E2)',
          background: isPinnedBoard ? 'transparent' : 'rgba(255, 255, 255, 0.60)',
          boxShadow: isPinnedBoard ? 'none' : '0 1px 4px 0 var(--Lynch-200, #D5D9E2) inset',
          position: 'relative',
          marginTop: isPinnedBoard ? '0' : '12px',
          marginBottom: isPinnedBoard ? '0' : '16px',
        }}
        onMouseEnter={handleContainerMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
      >
        {/* Inner Box - contains header and chart */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            flex: '1 0 0',
            borderRadius: '12px',
            border: '1px solid var(--Lynch-300, #B1BBC8)',
            background: 'rgba(255, 255, 255, 0.60)',
          }}
        >
        {/* Chart Header */}
        <div
          style={CHART_HEADER_STYLE}
        >
          {/* Left: Chart Name with Icon */}
          <div
            style={CHART_NAME_LEFT_STYLE}
          >
            <div
              style={CHART_ICON_WRAPPER_STYLE}
            >
              <ChartIcon size={14.4} />
            </div>
            <span
              style={CHART_TYPE_LABEL_STYLE}
            >
              {currentChartTypeInfo.label}
            </span>
          </div>

          {/* Right: Chart Type Selector Buttons (3 icon buttons - always Area, Bar, Line) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              flex: '1 0 0',
            }}
          >
            {renderChartTypeButtons({ variant: 'main' })}
          </div>
        </div>

        {/* Chart Title/Details and Time Period Selector */}
        <div
          style={CHART_TITLE_BAR_STYLE}
        >
          {/* Left: Chart Title and Details */}
          <div
            style={CHART_TITLE_LEFT_STYLE}
          >
            {title && (
              <h3
                style={CHART_TITLE_STYLE}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={CHART_SUBTITLE_STYLE}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Right: Time Period Dropdown */}
          {timePeriodOptions.length > 0 && (
            <div 
              style={TIME_PERIOD_DROPDOWN_STYLE}
            >
              <Select
                value={selectedTimePeriod}
                onChange={handleTimePeriodChange}
                options={timePeriodOptions}
                placeholder="Select period"
                variant="chart"
              />
            </div>
          )}
        </div>

        {/* Chart Container */}
        <div
          style={{
            width: '100%',
            padding: '6px 16px 14px 16px',
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {typeof children === 'function' ? children(filteredData) : children}
        </div>
        </div>
        
        {/* Hover menu - only show if not in pinned board */}
        {!isPinnedBoard && effectiveIsHovered && (
          <HoverMenu
            isHovered={effectiveIsHovered}
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
            onExpand={handleExpand}
            onShare={handleShare}
            onCopy={handleCopy}
            onPin={handlePin}
            onUnpin={handlePin}
            isPinned={isPinned}
            expandLabel="Expand"
            shareLabel="Share chart"
            copyLabel="Copy chart"
            pinLabel="Pin chart"
            unpinLabel="Unpin chart"
          />
        )}
      </div>

      {/* Modal for Expanded View */}
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="chart"
        title={title}
        subtitle={subtitle}
        onShare={handleShare}
        onDownload={handleShare} // Download opens share/export modal
        onCopy={handleCopy}
        onPin={handlePin}
        onUnpin={handlePin}
        isPinned={isPinned}
        tableChartContent={{
          type: 'chart',
          content: buildExportChartPayload(),
          title,
        }}
        fullContent={renderFullChartContent()}
      />
    </>
  );
}

