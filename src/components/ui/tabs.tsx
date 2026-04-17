'use client';

import { ReactNode, Children, isValidElement } from 'react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tabs({ value, onValueChange, children, disabled, className }: TabsProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: theme.spacing.sm,
        paddingBottom: theme.spacing.md,
      }}
    >
      {children}
    </div>
  );
}

interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

export function Tab({ value, children, disabled }: TabProps) {
  // This will be used by parent Tabs component
  return null;
}

interface TabsListProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}

// Helper component to render tabs
export function TabsList({ value, onValueChange, disabled, children }: TabsListProps) {
  const tabs = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === Tab
  ) as React.ReactElement<TabProps>[];

  return (
    <div style={{ display: 'flex', gap: theme.spacing.sm }}>
      {tabs.map((tab) => {
        const tabValue = tab.props.value;
        const isActive = value === tabValue;
        const isDisabled = disabled || tab.props.disabled;

        return (
          <button
            key={tabValue}
            onClick={() => !isDisabled && onValueChange(tabValue)}
            disabled={isDisabled}
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.small.size,
              fontWeight: isActive
                ? theme.typography.weights.bold.value
                : theme.typography.weights.semibold.value,
              lineHeight: '24px',
              letterSpacing: '0.0897px',
              color: isActive
                ? cssVar(CSS_VARS.textPrimary)
                : cssVar(CSS_VARS.textSecondary),
              background: 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${cssVar(CSS_VARS.textSecondary)}` : 'none',
              padding: '0 4px 12px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {tab.props.children}
          </button>
        );
      })}
    </div>
  );
}

