'use client';

import { useState, useEffect } from 'react';
import TableColumns from './TableColumns';
import Select from '@/components/ui/Select';
import { useDatasets, useDatasetTables, useTableColumns } from '@/hooks/useDatasets';
import { COLORS } from '@/lib/styles/constants';

export default function DatasetExplorer() {
  const [selectedDataset, setSelectedDataset] = useState<string | null>('entertainment');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const { datasets } = useDatasets();
  const { tables: availableTables } = useDatasetTables(selectedDataset);
  const { columns } = useTableColumns(selectedDataset, selectedTable);

  // Reset table when dataset changes (but don't auto-select on initial load)
  useEffect(() => {
    if (selectedDataset && availableTables.length > 0) {
      // Only reset if the current table doesn't exist in the new dataset
      if (selectedTable) {
        const tableExists = availableTables.some(t => t.id === selectedTable);
        if (!tableExists) {
          setSelectedTable(null);
        }
      }
    } else {
      setSelectedTable(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTables, selectedDataset]);

  return (
    <div
      style={{
        display: 'flex',
        width: '538px',
        // paddingTop: '24px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '16px',
        flex: '1 0 0',
        height: '100%',
        minHeight: 0,
        background: 'var(--Lynch-100, #ECEEF2)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="flex-1"
    >
      {/* Dataset and Table Selectors */}
      <div
        style={{
          display: 'flex',
          padding: '0 24px 0 40px',
          alignItems: 'flex-end',
          gap: '8px',
          alignSelf: 'stretch',
          height: '70px',
          position: 'sticky',
          top: '10',
          zIndex: 10,
          background: 'var(--Lynch-100, #ECEEF2)',
          flexShrink: 0,
        }}
      >
        {/* Dataset Dropdown */}
        <Select
          label="Dataset"
          value={selectedDataset}
          onChange={(value) => {
            setSelectedDataset(value);
            setSelectedTable(null); // Reset table when dataset changes
          }}
          options={datasets.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Select a Dataset"
        />

        {/* Table Dropdown */}
        <Select
          label="Table"
          value={selectedTable}
          onChange={setSelectedTable}
          options={availableTables.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="Select a Table"
          // disabled={!selectedDataset || availableTables.length === 0}
        />

        {/* Inject in Chat Icon Button */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
          }}
        >
          {/* Spacer to align with dropdown field (label height + gap) */}
          <div style={{ height: '28px' }}></div>
          <button
            disabled={!selectedDataset || !selectedTable}
            style={{
              display: 'flex',
              padding: '10px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--spacing-md, 0px)',
              borderRadius: '8px',
              border: selectedDataset && selectedTable 
                ? `1px solid ${COLORS.electricViolet[300]}` 
                : `1px solid ${COLORS.jumbo[200]}`,
              background: selectedDataset && selectedTable 
                ? COLORS.electricViolet[50] 
                : COLORS.jumbo[100],
              boxShadow: selectedDataset && selectedTable 
                ? `0px 1px 2px 0px ${COLORS.electricViolet[100]}` 
                : 'none',
              cursor: selectedDataset && selectedTable ? 'pointer' : 'not-allowed',
              opacity: selectedDataset && selectedTable ? 1 : 1,
            }}
            className={selectedDataset && selectedTable ? "hover:opacity-80 transition-opacity" : ""}
            title={selectedDataset && selectedTable ? "Inject in chat" : "Select dataset and table"}
            aria-label={selectedDataset && selectedTable ? "Inject in chat" : "Select dataset and table"}
          >
            <img
              src={selectedDataset && selectedTable ? '/inject-in-chat-enabled.svg' : '/inject-in-chat-disabled.svg'}
              alt="Inject in chat"
              width={24}
              height={24}
              style={{
                width: '24px',
                height: '24px',
                display: 'block',
              }}
            />
          </button>
        </div>
      </div>

      {/* Gradient Div */}
      <div
        style={{
          display: 'flex',
          width: '558px',
          height: '28px',
          padding: '10px',
          alignItems: 'flex-start',
          gap: '10px',
          position: 'absolute',
          top: '75px',
          background: 'linear-gradient(180deg, var(--Lynch-100, #ECEEF2) 16.66%, rgba(236, 238, 242, 0.90) 44.18%, rgba(236, 238, 242, 0.00) 99.65%)',
          zIndex: 5,
        }}
      />
      {/* Table Columns Section */}
        <TableColumns columns={columns} />
      {/* Gradient Div */}
      <div
        style={{
          display: 'flex',
          width: '558px',
          height: '30px',
          padding: '10px',
          alignItems: 'flex-start',
          gap: '10px',
          position: 'absolute',
          bottom: '0px',
          background: 'linear-gradient(0deg, var(--Lynch-100, #ECEEF2) 16.66%, rgba(236, 238, 242, 0.90) 44.18%, rgba(236, 238, 242, 0.00) 99.65%)',
          zIndex: 5,
        }}
      />
    </div>
  );
}

