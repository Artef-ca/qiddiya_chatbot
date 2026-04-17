'use client';

import { AtSign } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Typography from '@/components/ui/Typography';
import ColumnCard from './ColumnCard';
import { COLORS } from '@/lib/styles/constants';

interface Column {
  name: string;
  type: string;
}

interface TableColumnsProps {
  columns: Column[];
}

export default function TableColumns({ columns }: TableColumnsProps) {
  return (
    <div
      style={{
        display: 'flex',
          width: '558px',
        paddingTop: '5px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '16px',
        flex: '1 0 0',
        minHeight: 0,
        overflowY: 'auto',
      }}
      className="custom-scrollbar"
    >
      {columns.length === 0 ? (
        <EmptyState
          icon={AtSign}
          title="Select Table to add as Context"
          description="Add a Table to your Chat as a context to ask questions related to it."
        />
      ) : (
        /* Columns list */
        <div
          style={{
            display: 'flex',
            paddingRight: '32px',
            paddingBottom: '40px',
            paddingLeft: '40px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
            alignSelf: 'stretch',
            width: '100%',
          }}
        >
          <Typography
            variant="label"
            color={COLORS.lynch[700]}
            style={{ marginBottom: '12px' }}
          >
            Table Columns
          </Typography>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
            }}
          >
            {columns.map((column, index) => (
              <ColumnCard
                key={`${column.name}-${index}`}
                name={column.name}
                type={column.type}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
