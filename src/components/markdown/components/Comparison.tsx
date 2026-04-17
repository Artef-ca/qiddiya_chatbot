'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';

interface ComparisonItem {
  label: string;
  currentValue: string;
  change: {
    value: string;
    percentage: string;
    direction: 'up' | 'down';
  };
}

interface ComparisonSectionProps {
  title: string;
  subtitle?: string;
  items: ComparisonItem[];
}

export function ComparisonSection({ title, subtitle, items }: ComparisonSectionProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '8px',
        paddingTop: '8px',
        paddingBottom: '16px',
        width: '100%',
      }}
    >
      {/* H2 Title */}
      <div
        style={{
          height: '44px',
          paddingBottom: '12px',
          width: '100%',
        }}
      >
        <h2
          style={{
            fontFamily: 'Manrope',
            fontSize: '25px',
            fontStyle: 'normal',
            fontWeight: 600,
            lineHeight: '32px',
            letterSpacing: '-0.27px',
            color: '#343a46',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>

      {/* Paragraph/Subtitle */}
      {subtitle && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '16px',
            width: '100%',
          }}
        >
          <p
            style={{
              fontFamily: 'Manrope',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '24px',
              color: '#343a46',
              margin: 0,
              width: '100%',
            }}
          >
            {subtitle}
          </p>
        </div>
      )}

      {/* Comparison Items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        {(items ?? []).map((item, index) => {
          const isPositive = item.change.direction === 'up';
          const bgColor = isPositive ? '#e5f4e4' : '#fde7e3';
          const textColor = isPositive ? '#3a8138' : '#d64933';

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {/* Label */}
              <p
                style={{
                  fontFamily: 'Manrope',
                  fontSize: '13px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.09px',
                  color: '#64748b',
                  width: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  margin: 0,
                  flexShrink: 0,
                }}
              >
                {item.label}
              </p>

              {/* Value */}
              <p
                style={{
                  fontFamily: 'Manrope',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '32px',
                  letterSpacing: '-0.12px',
                  color: '#343a46',
                  width: '140px',
                  margin: 0,
                  flexShrink: 0,
                }}
              >
                {item.currentValue}
              </p>

              {/* Delta Indicator */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  minWidth: '140px',
                  padding: '2px 8px 2px 4px',
                  borderRadius: '4px',
                  backgroundColor: bgColor,
                  flexShrink: 0,
                }}
              >
                {isPositive ? (
                  <ArrowUp size={20} color={textColor} />
                ) : (
                  <ArrowDown size={20} color={textColor} />
                )}
                <p
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '24px',
                    color: textColor,
                    margin: 0,
                    flex: '1 0 0',
                  }}
                >
                  {item.change.value} ({item.change.percentage})
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface YearOverYearComparisonProps {
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

export function YearOverYearComparison({
  title,
  currentYear,
  currentValue,
  previousYear,
  previousValue,
  change,
  description,
}: YearOverYearComparisonProps) {
  const isPositive = change.direction === 'up';
  const bgColor = isPositive ? '#e5f4e4' : '#fde7e3';
  const textColor = isPositive ? '#3a8138' : '#d64933';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
        paddingTop: '20px',
      }}
    >
      {/* H3 Title */}
      <div
        style={{
          paddingBottom: '10px',
          width: '100%',
        }}
      >
        <h3
          style={{
            fontFamily: 'Manrope',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 600,
            lineHeight: '32px',
            letterSpacing: '-0.12px',
            color: '#343a46',
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>

      {/* Description/Subtitle */}
      {description && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '16px',
            width: '100%',
          }}
        >
          <p
            style={{
              fontFamily: 'Manrope',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '24px',
              color: '#343a46',
              margin: 0,
              width: '100%',
            }}
          >
            {description}
          </p>
        </div>
      )}

      {/* Comparison Items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        {/* Previous Year Row */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <p
            style={{
              fontFamily: 'Manrope',
              fontSize: '13px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '24px',
              letterSpacing: '0.09px',
              color: '#64748b',
              width: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
              flexShrink: 0,
            }}
          >
            {previousYear}
          </p>
          <p
            style={{
              fontFamily: 'Manrope',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '32px',
              letterSpacing: '-0.12px',
              color: '#343a46',
              width: '140px',
              margin: 0,
              flexShrink: 0,
            }}
          >
            {previousValue}
          </p>
          {/* Empty delta indicator for first row */}
          <div
            style={{
              minWidth: '140px',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Current Year Row */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <p
            style={{
              fontFamily: 'Manrope',
              fontSize: '13px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '24px',
              letterSpacing: '0.09px',
              color: '#64748b',
              width: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
              flexShrink: 0,
            }}
          >
            {currentYear}
          </p>
          <p
            style={{
              fontFamily: 'Manrope',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '32px',
              letterSpacing: '-0.12px',
              color: '#343a46',
              width: '140px',
              margin: 0,
              flexShrink: 0,
            }}
          >
            {currentValue}
          </p>

          {/* Delta Indicator */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              minWidth: '140px',
              padding: '2px 8px 2px 4px',
              borderRadius: '4px',
              backgroundColor: bgColor,
              flexShrink: 0,
            }}
          >
            {isPositive ? (
              <ArrowUp size={20} color={textColor} />
            ) : (
              <ArrowDown size={20} color={textColor} />
            )}
            <p
              style={{
                fontFamily: 'Manrope',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
                color: textColor,
                margin: 0,
                flex: '1 0 0',
              }}
            >
              {change.value} ({change.percentage})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

