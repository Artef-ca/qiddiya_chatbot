'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChartWrapper, ChartType } from './ChartWrapper';

type ChartDataPoint = Record<string, string | number>;

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
  '#0077B6',
  '#4A9FD8',
  '#6BB5E8',
  '#8CC8F0',
];

function getNumericDataKeys(data: ChartDataPoint[]): string[] {
  if (!data || data.length === 0) return [];

  // Only get keys that are not 'name' and have numeric values
  return Object.keys(data[0]).filter((k) => {
    if (k === 'name') return false;
    // Check if at least one row has a valid numeric value for this key
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

// Internal chart rendering components
function AreaChartRenderer({ 
  data, 
  height = 300,
  colors = DEFAULT_COLORS 
}: { data: ChartDataPoint[]; height?: number; colors?: string[] }) {
  const dataKeys = getNumericDataKeys(data);
  const chartConfig = buildChartConfig(dataKeys, colors);

  return (
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
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {dataKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId={dataKeys.length > 1 ? "1" : undefined}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

function LineChartRenderer({ 
  data, 
  height = 300,
  colors = DEFAULT_COLORS 
}: { data: ChartDataPoint[]; height?: number; colors?: string[] }) {
  const dataKeys = getNumericDataKeys(data);
  const chartConfig = buildChartConfig(dataKeys, colors);

  return (
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
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function BarChartRenderer({ 
  data, 
  height = 300,
  colors = DEFAULT_COLORS 
}: { data: ChartDataPoint[]; height?: number; colors?: string[] }) {
  const dataKeys = getNumericDataKeys(data);
  const chartConfig = buildChartConfig(dataKeys, colors);

  return (
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
        <ChartTooltip content={<ChartTooltipContent />} />
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
  );
}

// Wrapped chart components with enhanced UI
export function WrappedAreaChartComponent(props: BaseChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');

  return (
    <ChartWrapper
      chartType={chartType}
      onChartTypeChange={setChartType}
      title={props.title}
      subtitle={props.subtitle}
      data={props.data}
      dateRange={props.dateRange}
      onChartCopy={props.onChartCopy}
      onChartPin={props.onChartPin}
      onChartUnpin={props.onChartUnpin}
      onChartShare={props.onChartShare}
      isPinned={props.isPinned}
      isPinnedBoard={props.isPinnedBoard}
      pinnedItems={props.pinnedItems}
    >
      {(filteredData) => {
        switch (chartType) {
          case 'area':
            return <AreaChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          case 'line':
            return <LineChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          case 'bar':
            return <BarChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          default:
            return <AreaChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
        }
      }}
    </ChartWrapper>
  );
}

export function WrappedLineChartComponent(props: BaseChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');

  return (
    <ChartWrapper
      chartType={chartType}
      onChartTypeChange={setChartType}
      title={props.title}
      subtitle={props.subtitle}
      data={props.data}
      dateRange={props.dateRange}
      onChartCopy={props.onChartCopy}
      onChartPin={props.onChartPin}
      onChartUnpin={props.onChartUnpin}
      onChartShare={props.onChartShare}
      isPinned={props.isPinned}
      isPinnedBoard={props.isPinnedBoard}
      pinnedItems={props.pinnedItems}
    >
      {(filteredData) => {
        switch (chartType) {
          case 'area':
            return <AreaChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          case 'line':
            return <LineChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          case 'bar':
            return <BarChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          default:
            return <LineChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
        }
      }}
    </ChartWrapper>
  );
}

export function WrappedBarChartComponent(props: BaseChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  return (
    <ChartWrapper
      chartType={chartType}
      onChartTypeChange={setChartType}
      title={props.title}
      subtitle={props.subtitle}
      data={props.data}
      dateRange={props.dateRange}
      onChartCopy={props.onChartCopy}
      onChartPin={props.onChartPin}
      onChartUnpin={props.onChartUnpin}
      onChartShare={props.onChartShare}
      isPinned={props.isPinned}
      isPinnedBoard={props.isPinnedBoard}
      pinnedItems={props.pinnedItems}
    >
      {(filteredData) => {
        switch (chartType) {
          case 'area':
            return <AreaChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          case 'line':
            return <LineChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          case 'bar':
            return <BarChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
          default:
            return <BarChartRenderer data={filteredData} height={props.height} colors={props.colors} />;
        }
      }}
    </ChartWrapper>
  );
}
