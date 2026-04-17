'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
    color?: 'green' | 'red';
  };
}

export function KPICard({ title, value, subtitle, trend }: KPICardProps) {
  const trendColor = trend?.color === 'red' 
    ? 'var(--color-accent-red-500, #EF4444)' 
    : 'var(--color-accent-green-500, #10B981)';
  
  const trendBgColor = trend?.color === 'red'
    ? 'rgba(239, 68, 68, 0.1)'
    : 'rgba(16, 185, 129, 0.1)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '20px',
        borderRadius: '12px',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        minWidth: '200px',
        flex: '1 1 0',
      }}
    >
      {/* Header with trend indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          alignSelf: 'stretch',
        }}
      >
        <h3
          style={{
            fontFamily: 'Manrope',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '20px',
            color: 'var(--Lynch-700, #5A6573)',
            margin: 0,
          }}
        >
          {title}
        </h3>
        {trend && (
          <div
            style={{
              display: 'flex',
              padding: '4px 8px',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '4px',
              background: trendBgColor,
            }}
          >
            {trend.direction === 'up' ? (
              <TrendingUp size={12} color={trendColor} />
            ) : (
              <TrendingDown size={12} color={trendColor} />
            )}
            <span
              style={{
                fontFamily: 'Manrope',
                fontSize: '12px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '16px',
                color: trendColor,
              }}
            >
              {trend.value}
            </span>
          </div>
        )}
      </div>

      {/* Main value */}
      <div
        style={{
          fontFamily: 'Manrope',
          fontSize: '32px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: '40px',
          color: 'var(--Lynch-900, #2D3440)',
        }}
      >
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
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
        </div>
      )}
    </div>
  );
}

interface KPICardGridProps {
  children: React.ReactNode;
}

export function KPICardGrid({ children }: KPICardGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        marginTop: '16px',
      }}
    >
      {children}
    </div>
  );
}

