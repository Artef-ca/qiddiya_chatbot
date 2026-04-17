'use client';

import React, { useState, useRef, useEffect, createContext, useContext, useMemo, useCallback, memo } from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight, Activity, Plus, GitCompare } from 'lucide-react';
import type { MarkdownComponentProps } from '../types';
import { HoverMenu } from './HoverMenu';
import { ChartModal } from './ChartModal';
import { useChatActions } from '@/contexts/ChatActionsContext';

type SortDirection = 'normal' | 'asc' | 'desc';

interface TableContextType {
  sortState: { columnIndex: number | null; direction: SortDirection };
  onSort: (columnIndex: number) => void;
  statusColumnIndices: Set<number>;
  setStatusColumnIndex: (index: number, isStatus: boolean) => void;
  selectedRows: Set<number>;
  onRowSelect: (rowIndex: number) => void;
}

const TableContext = createContext<TableContextType | null>(null);

interface TableProps extends MarkdownComponentProps {
  onTableCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onTablePin?: (tableData: string) => void;
  onTableUnpin?: (tableData: string) => void;
  onTableShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  isPinnedBoard?: boolean;
  pinnedItems?: Array<{ content: string }>;
  rowsPerPage?: number;
  onSendMessage?: (message: string) => void;
  onAddToInput?: (text: string) => void;
}

function TableComponent({ children, onTableCopy, onTablePin, onTableUnpin, onTableShare, isPinnedBoard = false, pinnedItems = [], rowsPerPage = 8, onSendMessage, onAddToInput }: TableProps) {
  const chatActions = useChatActions();
  // Use context if available, otherwise use props
  const sendMessage = onSendMessage || chatActions?.sendMessage;
  const addToInput = onAddToInput || chatActions?.addToInput;
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<{ columnIndex: number | null; direction: SortDirection }>({
    columnIndex: null,
    direction: 'normal'
  });
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringContainerRef = useRef(false);
  const isHoveringMenuRef = useRef(false);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalColumns, setTotalColumns] = useState(0);
  const [statusColumnIndices, setStatusColumnIndices] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  const setStatusColumnIndex = useCallback((index: number, isStatus: boolean) => {
    setStatusColumnIndices(prev => {
      const newSet = new Set(prev);
      if (isStatus) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }, []);

  const handleRowSelect = useCallback((rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, []);
  
  // Store original row order
  const originalRowOrderRef = useRef<HTMLTableRowElement[] | null>(null);

  // Function to handle column sorting
  const handleColumnSort = useCallback((columnIndex: number) => {
    if (!tableRef.current) return;

    const tbody = tableRef.current.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
    if (rows.length === 0) return;

    // Store original order on first sort
    if (originalRowOrderRef.current === null) {
      originalRowOrderRef.current = [...rows];
    }

    // Determine next sort direction
    let nextDirection: SortDirection = 'asc';
    if (sortState.columnIndex === columnIndex) {
      if (sortState.direction === 'asc') {
        nextDirection = 'desc';
      } else if (sortState.direction === 'desc') {
        nextDirection = 'normal';
      }
    }

    setSortState({
      columnIndex: nextDirection === 'normal' ? null : columnIndex,
      direction: nextDirection
    });

    // If normal, restore original order
    if (nextDirection === 'normal') {
      if (originalRowOrderRef.current) {
        originalRowOrderRef.current.forEach(row => tbody.appendChild(row));
        originalRowOrderRef.current = null; // Reset for next sort
      }
      return;
    }

    // Sort rows based on column content
    const sortedRows = [...rows].sort((a, b) => {
      const aCell = a.querySelectorAll('td')[columnIndex];
      const bCell = b.querySelectorAll('td')[columnIndex];
      
      if (!aCell || !bCell) return 0;

      const aText = aCell.textContent?.trim() || '';
      const bText = bCell.textContent?.trim() || '';

      // Try to parse as numbers
      const aNum = parseFloat(aText.replace(/[^0-9.-]/g, ''));
      const bNum = parseFloat(bText.replace(/[^0-9.-]/g, ''));

      let comparison = 0;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        comparison = aNum - bNum;
      } else {
        comparison = aText.localeCompare(bText);
      }

      return nextDirection === 'asc' ? comparison : -comparison;
    });

    // Re-append sorted rows
    sortedRows.forEach(row => tbody.appendChild(row));
  }, [sortState]);
  
  // Memoize context value to prevent infinite loops
  const contextValue = useMemo(() => ({
    sortState,
    onSort: handleColumnSort,
    statusColumnIndices,
    setStatusColumnIndex,
    selectedRows,
    onRowSelect: handleRowSelect
  }), [sortState, statusColumnIndices, setStatusColumnIndex, handleColumnSort, selectedRows, handleRowSelect]);
  
  // Track row count with ref to prevent unnecessary updates
  const rowCountRef = useRef(0);
  const columnCountRef = useRef(0);
  const isInitializedRef = useRef(false);
  const lastPageRef = useRef(1);
  const lastRowsPerPageRef = useRef(rowsPerPage);
  
  // Calculate total rows and pages, and update visible rows
  useEffect(() => {
    if (!tableRef.current) {
      return;
    }
    const tbody = tableRef.current.querySelector('tbody');
    const thead = tableRef.current.querySelector('thead');
    if (!tbody) {
      return;
    }
    
    const allRows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
    const total = allRows.length;
    
    // Count columns from header or first row
    let columnCount = 0;
    if (thead) {
      const headerCells = thead.querySelectorAll('th');
      columnCount = headerCells.length;
    } else if (allRows.length > 0) {
      const firstRowCells = allRows[0].querySelectorAll('td');
      columnCount = firstRowCells.length;
    }
    
    if (total === 0) return;
    
    // Only update state if row count actually changed and is valid
    if (total !== rowCountRef.current && total > 0) {
      rowCountRef.current = total;
      const totalPagesCount = Math.max(1, Math.ceil(total / rowsPerPage));
      
      // Batch state updates to prevent flickering
      columnCountRef.current = columnCount;
      setTotalRows(total);
      setTotalPages(totalPagesCount);
      setTotalColumns(columnCount);
      
      // Reset to page 1 if data changed and not initialized
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        lastPageRef.current = 1;
        lastRowsPerPageRef.current = rowsPerPage;
      }
    } else if (total === 0 && rowCountRef.current > 0) {
      // Only clear if we had rows before
      rowCountRef.current = 0;
      columnCountRef.current = 0;
      setTotalRows(0);
      setTotalPages(1);
      setTotalColumns(0);
      return;
    }
    
    // Update column count if it changed
    if (columnCount > 0 && columnCount !== columnCountRef.current) {
      columnCountRef.current = columnCount;
      setTotalColumns(columnCount);
    }
    
    // Update visible rows based on current page
    // If totalRows <= 8, show all rows (no pagination)
    // Otherwise, show only rows for current page
    if (total <= 8) {
      // Show all rows when <= 8 rows
      allRows.forEach((row) => {
        row.style.display = '';
      });
    } else {
      // Apply pagination when > 8 rows
      const pageStart = (currentPage - 1) * rowsPerPage;
      const pageEnd = pageStart + rowsPerPage;
      
      allRows.forEach((row, index) => {
        // Only show rows within the current page range
        if (index >= pageStart && index < pageEnd) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
    
    // Update refs to track last applied state
    lastPageRef.current = currentPage;
    lastRowsPerPageRef.current = rowsPerPage;
    
    // Save current page to DOM to persist across remounts
    if (tableRef.current && isInitializedRef.current) {
      tableRef.current.setAttribute('data-current-page', currentPage.toString());
    }
  }, [currentPage, rowsPerPage]);
  
  // Initialize table data once on mount - hide all rows initially, then show first page
  useEffect(() => {
    // Only run initialization once
    if (isInitializedRef.current) return;
    
    // Use a small delay to ensure DOM is ready after mount
    const timeoutId = setTimeout(() => {
      if (!tableRef.current) return;
      
      // Check if table was already initialized (using data attribute as persistent marker)
      const wasInitialized = tableRef.current.getAttribute('data-initialized') === 'true';
      
      const tbody = tableRef.current.querySelector('tbody');
      const thead = tableRef.current.querySelector('thead');
      if (!tbody) return;
      
      const allRows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
      const total = allRows.length;
      
      // Count columns from header or first row
      let columnCount = 0;
      if (thead) {
        const headerCells = thead.querySelectorAll('th');
        columnCount = headerCells.length;
      } else if (allRows.length > 0) {
        const firstRowCells = allRows[0].querySelectorAll('td');
        columnCount = firstRowCells.length;
      }
      
      if (total === 0) return;
      
      // If table was already initialized, restore state without resetting page
      if (wasInitialized) {
        rowCountRef.current = total;
        isInitializedRef.current = true;
        const totalPagesCount = Math.max(1, Math.ceil(total / rowsPerPage));
        columnCountRef.current = columnCount;
        setTotalRows(total);
        setTotalPages(totalPagesCount);
        setTotalColumns(columnCount);
        
        // Restore saved page from DOM attribute if available
        const savedPage = tableRef.current.getAttribute('data-current-page');
        if (savedPage) {
          const pageNum = parseInt(savedPage, 10);
          const validPage = Math.min(Math.max(1, pageNum), totalPagesCount);
          if (validPage !== currentPage) {
            setCurrentPage(validPage);
          }
          lastPageRef.current = validPage;
        } else {
          lastPageRef.current = currentPage;
        }
        lastRowsPerPageRef.current = rowsPerPage;
        return;
      }
      
      // First time initialization
      if (rowCountRef.current === 0 && total > 0) {
        rowCountRef.current = total;
        isInitializedRef.current = true;
        lastPageRef.current = 1;
        lastRowsPerPageRef.current = rowsPerPage;
        
        // Mark table as initialized in DOM (persists across remounts)
        tableRef.current.setAttribute('data-initialized', 'true');
        
        const totalPagesCount = Math.max(1, Math.ceil(total / rowsPerPage));
        columnCountRef.current = columnCount;
        setTotalRows(total);
        setTotalPages(totalPagesCount);
        setTotalColumns(columnCount);
        setCurrentPage(1);
        
        // Show all rows if <= 8, otherwise show first page
        allRows.forEach((row, index) => {
          if (total <= 8) {
            row.style.display = '';
          } else {
            if (index < rowsPerPage) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          }
        });
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - rowsPerPage is handled in the main effect

  // Convert the current table DOM into a markdown pipe table.
  // NOTE: `convertToMarkdownTableSync` and `convertToMarkdownTable` previously had identical logic.
  const extractMarkdownTable = useCallback((): string => {
    if (!tableRef.current) return '';

    const table = tableRef.current;
    const rows: string[] = [];

    // Extract headers
    const headers: string[] = [];
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach((th) => {
      const text = th.textContent?.trim() || '';
      headers.push(text);
    });
    if (headers.length > 0) {
      rows.push('| ' + headers.join(' | ') + ' |');
      rows.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    }

    // Extract data rows
    const dataRows = table.querySelectorAll('tbody tr');
    dataRows.forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll('td').forEach((td) => {
        const text = td.textContent?.trim() || '';
        cells.push(text);
      });
      if (cells.length > 0) {
        rows.push('| ' + cells.join(' | ') + ' |');
      }
    });

    return rows.join('\n');
  }, []);

  const convertToMarkdownTableSync = (): string => {
    return extractMarkdownTable();
  };

  const handleCopy = () => {
    const markdownTable = convertToMarkdownTable();
    if (markdownTable && onTableCopy) {
      // Extract table title if available
      const tableTitle = tableRef.current?.closest('[data-table-title]')?.getAttribute('data-table-title') || undefined;
      onTableCopy('table', markdownTable, tableTitle);
    }
  };

  const handleShare = () => {
    const markdownTable = convertToMarkdownTable();
    if (markdownTable && onTableShare) {
      // Extract table title if available
      const tableTitle = tableRef.current?.closest('[data-table-title]')?.getAttribute('data-table-title') || undefined;
      console.log('[Table] Calling onTableShare with:', { type: 'table', contentLength: markdownTable.length, title: tableTitle });
      onTableShare('table', markdownTable, tableTitle);
    } else {
      console.warn('[Table] Cannot share: markdownTable=', !!markdownTable, 'onTableShare=', !!onTableShare);
    }
  };

  // Check if this table is pinned
  const checkIfTablePinned = (): boolean => {
    if (isPinnedBoard) return true; // Always pinned in pinned board
    if (!tableRef.current) return false;
    const markdownTable = convertToMarkdownTableSync();
    return pinnedItems.some((item) => item.content.trim() === markdownTable.trim());
  };

  const handlePin = () => {
    const markdownTable = convertToMarkdownTable();
    if (markdownTable) {
      const isPinned = checkIfTablePinned();
      if (isPinned && onTableUnpin) {
        onTableUnpin(markdownTable);
      } else if (!isPinned && onTablePin) {
        onTablePin(markdownTable);
      }
    }
  };

  const handleUnpin = () => {
    const markdownTable = convertToMarkdownTable();
    if (markdownTable && onTableUnpin) {
      onTableUnpin(markdownTable);
    }
  };

  const convertToMarkdownTable = (): string => {
    return extractMarkdownTable();
  };

  // Reset hover state when in pinned board
  useEffect(() => {
    if (isPinnedBoard) {
      queueMicrotask(() => {
        setIsHovered(false);
      });
    }
  }, [isPinnedBoard]);

  // Handle hover with delay to allow movement between container and menu
  const handleContainerMouseEnter = () => {
    if (!isPinnedBoard) {
      isHoveringContainerRef.current = true;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  };

  const handleContainerMouseLeave = () => {
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
  };

  const handleMenuMouseEnter = () => {
    if (!isPinnedBoard) {
      isHoveringMenuRef.current = true;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHovered(true);
    }
  };

  const handleMenuMouseLeave = () => {
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
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Update pinned state (avoid accessing refs during render)
  useEffect(() => {
    queueMicrotask(() => {
      if (isPinnedBoard) {
        setIsPinned(true);
        return;
      }
      if (!tableRef.current) {
        setIsPinned(false);
        return;
      }
      const markdownTable = extractMarkdownTable();
      const pinned = pinnedItems.some((item) => item.content.trim() === markdownTable.trim());
      setIsPinned(pinned);
    });
  }, [isPinnedBoard, pinnedItems, extractMarkdownTable]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Save current page to DOM to persist across remounts
      if (tableRef.current) {
        tableRef.current.setAttribute('data-current-page', page.toString());
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`my-3 relative ${isPinnedBoard ? 'pinned-board-table' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: isPinnedBoard ? '0' : '12px 10px 12px 10px',
        alignItems: 'flex-start',
        gap: '8px',
        alignSelf: 'stretch',
        borderRadius: isPinnedBoard ? '0' : '4px',
        border: isPinnedBoard ? 'none' : '1px solid var(--Lynch-200, #D5D9E2)',
        background: isPinnedBoard ? 'transparent' : 'rgba(255, 255, 255, 0.60)',
        boxShadow: isPinnedBoard ? 'none' : '0 1px 4px 0 var(--Lynch-200, #D5D9E2) inset',
        position: 'relative'
      }}
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .markdown-table {
          border-collapse: separate;
          border-spacing: 0;
        }
        .markdown-table tbody tr {
          display: table-row;
          transition: background-color 0.2s ease;
          height: 32px;
          max-height: 32px;
        }
        .markdown-table thead tr {
          height: 32px;
          max-height: 32px;
        }
        .markdown-table tbody td,
        .markdown-table thead th {
          height: 32px !important;
          max-height: 32px !important;
          min-height: 32px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          line-height: 22px !important;
          margin: 0 !important;
          vertical-align: middle !important;
        }
        .markdown-table tbody td *,
        .markdown-table thead th * {
          line-height: 22px !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
        .markdown-table tbody td > span,
        .markdown-table thead th > div > span {
          display: block !important;
          line-height: 22px !important;
          height: 22px !important;
          max-height: 22px !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .markdown-table tbody tr:hover:not([data-selected="true"]) {
          background-color: var(--Picton-Blue-50, #EFFAFF) !important;
        }
        .markdown-table tbody tr[data-selected="true"] {
          background-color: var(--Picton-Blue-50, #EFFAFF) !important;
          outline: 2px dashed var(--Picton-Blue-500, #0BC0FF);
          outline-offset: -2px;
        }
        .markdown-table tbody tr[data-selected="true"] td {
          color: var(--Lynch-800, #3A4252) !important;
        }
        .pinned-board-table .markdown-table {
          border: 1px solid var(--Lynch-200, #D5D9E2) !important;
          border-collapse: collapse !important;
        }
        .pinned-board-table .markdown-table th,
        .pinned-board-table .markdown-table td {
          border: 1px solid var(--Lynch-200, #D5D9E2) !important;
        }
        .pinned-board-table .markdown-table th:first-child,
        .pinned-board-table .markdown-table td:first-child {
          border-left: 1px solid var(--Lynch-200, #D5D9E2) !important;
        }
        .pinned-board-table .markdown-table th:last-child,
        .pinned-board-table .markdown-table td:last-child {
          border-right: 1px solid var(--Lynch-200, #D5D9E2) !important;
        }
        .pinned-board-table .markdown-table thead th {
          border-top: 1px solid var(--Lynch-200, #D5D9E2) !important;
          border-bottom: 1px solid var(--Lynch-200, #D5D9E2) !important;
        }
        .pinned-board-table .markdown-table tbody tr:last-child td {
          border-bottom: 1px solid var(--Lynch-200, #D5D9E2) !important;
        }
        ${!isPinnedBoard ? `
        .markdown-table th:first-child {
          border-top-left-radius: 12px;
          border-left: 1px solid var(--Lynch-300, #B1BBC8) !important;
          border-top: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        .markdown-table th:not(:first-child) {
          border-top: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        .markdown-table th:last-child {
          border-top-right-radius: 12px;
          border-right: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        .markdown-table td:first-child {
          border-left: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        .markdown-table tbody tr:last-child td:first-child {
          border-bottom-left-radius: 12px;
          border-bottom: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        .markdown-table tbody tr:last-child td:not(:first-child) {
          border-bottom: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        .markdown-table tbody tr:last-child td:last-child {
          border-bottom-right-radius: 12px;
          border-right: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        .markdown-table td:last-child {
          border-right: 1px solid var(--Lynch-300, #B1BBC8) !important;
        }
        ` : ''}
      `}} />
      <div style={{ 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        borderRadius: isPinnedBoard ? '0' : '12px',
        background: isPinnedBoard ? 'transparent' : 'rgba(255, 255, 255, 0.10)',
        boxShadow: isPinnedBoard ? 'none' : '0 1px 4px 0 var(--Lynch-100, #ECEEF2)',
        overflow: totalColumns > 5 ? 'auto' : 'hidden',
        overflowX: totalColumns > 5 ? 'auto' : 'hidden',
        overflowY: 'hidden'
      }}>
        <TableContext.Provider value={contextValue}>
          <table 
            ref={tableRef}
            className="w-full markdown-table"
            style={{
              width: totalColumns > 5 ? 'auto' : '100%',
              minWidth: '100%',
              borderRadius: 0,
              background: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden',
              marginBottom: 0
            }}
          >
            {children}
          </table>
        </TableContext.Provider>
        
        {/* Pagination - only show if there are more than 8 rows - positioned directly below table inside inner div */}
        {totalRows > 8 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: '8px 20px 2px',
            marginTop: '0px',
            marginBottom: '0px',
            borderRadius:  '0 0 12px 12px',
            border: '1px solid var(--Lynch-200, #D5D9E2)',
            borderTop: 'none'
          }}>
            <div style={{
              color: 'var(--Lynch-700, #434E61)',
              fontFamily: 'Manrope',
              fontSize: '13px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '20px',
              letterSpacing: '0.09px',
            }}>
              Viewing {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} rows
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              // gap: '2px'
            }}>
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  width: '25px',
                  height: '32px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronsLeft size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  width: '25px',
                  height: '32px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
              </button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage === 1) {
                  pageNum = i + 1;
                } else if (currentPage === totalPages) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      display: 'flex',
                      minWidth: '25px',
                      height: '32px',
                      padding: '4px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: currentPage === pageNum ? 'var(--Picton-Blue-700, #0077A3)' : 'var(--Lynch-700, #434E61)',
                      fontFamily: 'Manrope',
                      fontSize: '13px',
                      fontStyle: 'normal',
                      fontWeight: currentPage === pageNum ? 700 : 500,
                      lineHeight: '20px',
                      letterSpacing: '0.09px'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  display: 'flex',
                  width: '25px',
                  height: '32px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                <ChevronRight size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  display: 'flex',
                  width: '25px',
                  height: '32px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                <ChevronsRight size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Hover menu - only show if not in pinned board */}
      {!isPinnedBoard && (
        <HoverMenu
          isHovered={isHovered}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
          onExpand={() => setIsModalOpen(true)}
          onShare={handleShare}
          onCopy={handleCopy}
          onPin={handlePin}
          onUnpin={handleUnpin}
          isPinned={isPinned}
          expandLabel="Expand"
          shareLabel="Share table"
          copyLabel="Copy table"
          pinLabel="Pin table"
          unpinLabel="Unpin table"
        />
      )}

      {/* Selection Panel - only show if not in pinned board and has selections */}
      {!isPinnedBoard && selectedRows.size > 0 && (
        <TableSelectionPanel
          selectedCount={selectedRows.size}
          onAnalyze={() => {
            if (!tableRef.current || selectedRows.size !== 1) return;
            if (!chatActions?.sendMessage) {
              if (!sendMessage) return;
              // Fallback to prop sendMessage if context not available
              const rowData = extractSelectedRowData(tableRef.current, Array.from(selectedRows)[0]);
              if (rowData) {
                sendMessage(`Analyze this selection and provide insights:\n\n${rowData}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
              }
              return;
            }
            const rowData = extractSelectedRowData(tableRef.current, Array.from(selectedRows)[0]);
            if (rowData) {
              chatActions.sendMessage(`Analyze this selection and provide insights:\n\n${rowData}\n\n  Based on the conversation context, tell me what's significant about this data point and if there are any concerns or opportunities I should know about.`);
              // Scroll to bottom after sending
              if (chatActions.scrollToBottom) {
                setTimeout(() => {
                  chatActions.scrollToBottom?.(true);
                }, 200);
              }
            }
          }}
          onCompare={() => {
            if (!tableRef.current || selectedRows.size < 2) return;
            if (!chatActions?.sendMessage) {
              if (!sendMessage) return;
              // Fallback to prop sendMessage if context not available
              const rowsData = Array.from(selectedRows)
                .map(rowIndex => extractSelectedRowData(tableRef.current!, rowIndex))
                .filter(Boolean);
              if (rowsData.length > 0) {
                sendMessage(`Compare these selections and highlight key differences:\n\n${rowsData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
              }
              return;
            }
            const rowsData = Array.from(selectedRows)
              .map(rowIndex => extractSelectedRowData(tableRef.current!, rowIndex))
              .filter(Boolean);
            if (rowsData.length > 0) {
              chatActions.sendMessage(`Compare these selections and highlight key differences:\n\n${rowsData.join('\n\n---\n\n')}\n\nWhat are the significant differences between these? Explain why these differences exist and highlight any concerns or opportunities.`);
              // Scroll to bottom after sending
              if (chatActions.scrollToBottom) {
                setTimeout(() => {
                  chatActions.scrollToBottom?.(true);
                }, 200);
              }
            }
          }}
          onAddToPrompt={() => {
            if (!tableRef.current || !addToInput) return;
            const rowsData = Array.from(selectedRows)
              .map(rowIndex => extractSelectedRowData(tableRef.current!, rowIndex))
              .filter(Boolean);
            if (rowsData.length > 0) {
              const text = rowsData.join('\n\n');
              addToInput(text);
            }
          }}
        />
      )}
      
      {/* Modal for Expanded View */}
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="table"
        onShare={handleShare}
        onDownload={handleShare} // Download opens share/export modal
        onCopy={handleCopy}
        onPin={handlePin}
        onUnpin={handleUnpin}
        isPinned={isPinned}
        tableChartContent={{
          type: 'table',
          content: convertToMarkdownTableSync(),
          title: tableRef.current?.closest('[data-table-title]')?.getAttribute('data-table-title') || undefined,
        }}
        fullContent={
          <ModalTableContent
            contextValue={contextValue}
            totalRows={totalRows}
            rowsPerPage={8}
          >
            {children}
          </ModalTableContent>
        }
      />
    </div>
  );
}

// Modal Table Content Component with Pagination
interface ModalTableContentProps {
  contextValue: TableContextType;
  totalRows: number;
  rowsPerPage: number;
  children: React.ReactNode;
}

function ModalTableContent({ contextValue, totalRows, rowsPerPage, children }: ModalTableContentProps) {
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const modalTableRef = useRef<HTMLTableElement>(null);

  const modalTotalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  // Apply pagination to modal table
  useEffect(() => {
    if (!modalTableRef.current) return;
    
    const tbody = modalTableRef.current.querySelector('tbody');
    if (!tbody) return;
    
    const allRows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
    
    if (totalRows <= rowsPerPage) {
      // Show all rows when <= rowsPerPage
      allRows.forEach((row) => {
        row.style.display = '';
      });
    } else {
      // Apply pagination
      const pageStart = (modalCurrentPage - 1) * rowsPerPage;
      const pageEnd = pageStart + rowsPerPage;
      
      allRows.forEach((row, index) => {
        if (index >= pageStart && index < pageEnd) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
  }, [modalCurrentPage, totalRows, rowsPerPage]);

  const handleModalPageChange = (page: number) => {
    if (page >= 1 && page <= modalTotalPages) {
      setModalCurrentPage(page);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '0px 32px 32px 32px',
      gap: '4px',
      overflow: 'hidden',
    }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid var(--Lynch-300, #B1BBC8)',
          borderRadius: '12px',
          boxShadow: '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <TableContext.Provider value={contextValue}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table 
              ref={modalTableRef}
              className="w-full markdown-table"
              style={{
                width: '100%',
              }}
            >
              {children}
            </table>
          </div>
        </TableContext.Provider>
        
        {/* Pagination - show if there are more than rowsPerPage rows */}
        {totalRows > rowsPerPage && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: '8px 24px 12px',
            background: 'rgba(246, 247, 249, 0.3)',
            borderTop: '1px solid var(--Lynch-200, #D5D9E2)',
          }}>
            <div style={{
              color: 'var(--Lynch-500, #64748B)',
              fontFamily: 'Manrope',
              fontSize: '13px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '28px',
              letterSpacing: '0.0897px',
            }}>
              Viewing {Math.min(modalCurrentPage * rowsPerPage, totalRows)} of {totalRows} rows
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <button
                onClick={() => handleModalPageChange(1)}
                disabled={modalCurrentPage === 1}
                style={{
                  display: 'flex',
                  width: '24px',
                  height: '24px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: modalCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: modalCurrentPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronsLeft size={16} style={{ color: modalCurrentPage === 1 ? 'var(--Lynch-400, #8695AA)' : 'var(--Lynch-700, #434E61)' }} />
              </button>
              <button
                onClick={() => handleModalPageChange(modalCurrentPage - 1)}
                disabled={modalCurrentPage === 1}
                style={{
                  display: 'flex',
                  width: '24px',
                  height: '24px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: modalCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: modalCurrentPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={16} style={{ color: modalCurrentPage === 1 ? 'var(--Lynch-400, #8695AA)' : 'var(--Lynch-700, #434E61)' }} />
              </button>
              {Array.from({ length: Math.min(3, modalTotalPages) }, (_, i) => {
                let pageNum: number;
                if (modalTotalPages <= 3) {
                  pageNum = i + 1;
                } else if (modalCurrentPage === 1) {
                  pageNum = i + 1;
                } else if (modalCurrentPage === modalTotalPages) {
                  pageNum = modalTotalPages - 2 + i;
                } else {
                  pageNum = modalCurrentPage - 1 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handleModalPageChange(pageNum)}
                    style={{
                      display: 'flex',
                      minWidth: '16px',
                      height: '24px',
                      padding: '4px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: modalCurrentPage === pageNum ? 'var(--Picton-Blue-700, #0075AB)' : 'var(--Lynch-700, #434E61)',
                      fontFamily: 'Manrope',
                      fontSize: '13px',
                      fontStyle: 'normal',
                      fontWeight: modalCurrentPage === pageNum ? 700 : 600,
                      lineHeight: '28px',
                      letterSpacing: '0.0897px'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handleModalPageChange(modalCurrentPage + 1)}
                disabled={modalCurrentPage === modalTotalPages}
                style={{
                  display: 'flex',
                  width: '24px',
                  height: '24px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: modalCurrentPage === modalTotalPages ? 'not-allowed' : 'pointer',
                  opacity: modalCurrentPage === modalTotalPages ? 0.5 : 1
                }}
              >
                <ChevronRight size={16} style={{ color: modalCurrentPage === modalTotalPages ? 'var(--Lynch-400, #8695AA)' : 'var(--Lynch-700, #434E61)' }} />
              </button>
              <button
                onClick={() => handleModalPageChange(modalTotalPages)}
                disabled={modalCurrentPage === modalTotalPages}
                style={{
                  display: 'flex',
                  width: '24px',
                  height: '24px',
                  padding: '4px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: modalCurrentPage === modalTotalPages ? 'not-allowed' : 'pointer',
                  opacity: modalCurrentPage === modalTotalPages ? 0.5 : 1
                }}
              >
                <ChevronsRight size={16} style={{ color: modalCurrentPage === modalTotalPages ? 'var(--Lynch-400, #8695AA)' : 'var(--Lynch-700, #434E61)' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize Table component to prevent remounting when parent re-renders
// This prevents the table from resetting pagination when scroll button visibility changes
export const Table = memo(TableComponent);

export function TableHead({ children }: MarkdownComponentProps) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: MarkdownComponentProps) {
  return <tbody>{children}</tbody>;
}

// Extract selected row data as formatted text
function extractSelectedRowData(table: HTMLTableElement, rowIndex: number): string | null {
  const tbody = table.querySelector('tbody');
  if (!tbody) return null;
  
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const row = rows[rowIndex];
  if (!row) return null;
  
  // Get headers
  const thead = table.querySelector('thead');
  const headers: string[] = [];
  if (thead) {
    const headerCells = thead.querySelectorAll('th');
    headerCells.forEach((th) => {
      const text = th.textContent?.trim() || '';
      // Remove sort icon text if present
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (cleanText) {
        headers.push(cleanText);
      }
    });
  }
  
  // Get row cells
  const cells = row.querySelectorAll('td');
  const cellValues: string[] = [];
  cells.forEach((td) => {
    const text = td.textContent?.trim() || '';
    cellValues.push(text);
  });
  
  // Format as key-value pairs
  if (headers.length > 0 && cellValues.length > 0) {
    const pairs: string[] = [];
    const maxLen = Math.min(headers.length, cellValues.length);
    for (let i = 0; i < maxLen; i++) {
      pairs.push(`${headers[i]}: ${cellValues[i]}`);
    }
    return pairs.join('\n');
  }
  
  // Fallback: just return cell values
  return cellValues.join(' | ');
}

// Table Selection Panel Component
interface TableSelectionPanelProps {
  selectedCount: number;
  onAnalyze?: () => void;
  onCompare?: () => void;
  onAddToPrompt?: () => void;
}

function TableSelectionPanel({ selectedCount, onAnalyze, onCompare, onAddToPrompt }: TableSelectionPanelProps) {
  if (selectedCount === 0) return null;
  
  const isMultiple = selectedCount > 1;
  const handleAction = isMultiple ? onCompare : onAnalyze;

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
          bottom: '1px',
          transform: 'translateX(-50%)',
          width: '309px',
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
            boxSizing: 'border-box',
            borderRadius: '8px 8px 0 0',
            border: '1px solid var(--electric-violet-200, #DCD4FF)',
            background: '#FFF',
            boxShadow: '0 8px 16px 0 var(--Lynch-100, #ECEEF2)',
            overflow: 'hidden',
            marginBottom: '-2px',
          }}
        >
          <div
            style={{
              color: 'var(--Picton-Blue-700, #0075AB)',
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
              gap: '12px',
              width: '100%',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleAction}
              type="button"
              style={{
                flex: 1,
                display: 'flex',
                padding: '6px 12px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '8px',
                border: '1px solid var(--electric-violet-300, #C3B2FF)',
                background: 'var(--electric-violet-50, #F5F2FF)',
                boxShadow: '0 1px 2px 0 var(--electric-violet-100, #ECE8FF)',
                cursor: 'pointer',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '28px',
                letterSpacing: '0.09px',
                color: 'var(--electric-violet-700, #6C20E1)',
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
                e.currentTarget.style.background = 'var(--electric-violet-50, #F5F2FF)';
                e.currentTarget.style.borderColor = 'var(--electric-violet-300, #C3B2FF)';
              }}
            >
              {isMultiple ? (
                <>
                  <GitCompare size={16} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Compare</span>
                </>
              ) : (
                <>
                  <Activity size={16} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>Analyze</span>
                </>
              )}
            </button>
            <button
              onClick={onAddToPrompt}
              type="button"
              style={{
                flex: 1,
                display: 'flex',
                padding: '6px 12px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '8px',
                border: '1px solid var(--electric-violet-300, #C3B2FF)',
                background: 'var(--electric-violet-50, #F5F2FF)',
                boxShadow: '0 1px 2px 0 var(--electric-violet-100, #ECE8FF)',
                cursor: 'pointer',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '28px',
                letterSpacing: '0.09px',
                color: 'var(--electric-violet-700, #6C20E1)',
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
                e.currentTarget.style.background = 'var(--electric-violet-50, #F5F2FF)';
                e.currentTarget.style.borderColor = 'var(--electric-violet-300, #C3B2FF)';
              }}
            >
              <Plus size={16} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap' }}>Add to Prompt</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function TableRow({ children }: MarkdownComponentProps) {
  const context = useContext(TableContext);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [rowIndex, setRowIndex] = useState<number | null>(null);

  // Determine row index from DOM position
  useEffect(() => {
    if (!rowRef.current) return;
    const tbody = rowRef.current.closest('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const index = rows.indexOf(rowRef.current);
    if (index >= 0) {
      setRowIndex(index);
    }
  }, []);

  const isSelected = context && rowIndex !== null && context.selectedRows.has(rowIndex);

  const handleClick = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
    // Don't trigger selection if clicking on a link or button
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"]')) {
      return;
    }
    
    if (rowIndex !== null && context) {
      context.onRowSelect(rowIndex);
    }
  }, [rowIndex, context]);

  return (
    <tr 
      ref={rowRef}
      onClick={handleClick}
      data-selected={isSelected ? 'true' : 'false'}
      style={{
        cursor: 'pointer',
      }}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children }: MarkdownComponentProps) {
  const headerRef = useRef<HTMLTableCellElement>(null);
  const context = useContext(TableContext);
  const [columnIndex, setColumnIndex] = useState<number | null>(null);
  const hasRegisteredStatusRef = useRef(false);

  // Extract header text once
  const headerText = useMemo(() => {
    return (typeof children === 'string' ? children : 
      React.Children.toArray(children).find(child => typeof child === 'string') as string || '').toLowerCase().trim();
  }, [children]);

  // Determine column index from DOM position
  useEffect(() => {
    if (!headerRef.current) return;
    const thead = headerRef.current.closest('thead');
    if (!thead) return;
    const headers = Array.from(thead.querySelectorAll('th'));
    const index = headers.indexOf(headerRef.current);
    if (index >= 0) {
      setColumnIndex(index);
      // Check if this is a status column and notify context (only once)
      if (context && headerText === 'status' && !hasRegisteredStatusRef.current) {
        hasRegisteredStatusRef.current = true;
        context.setStatusColumnIndex(index, true);
      }
    }
  }, [headerText, context]);

  const isActive = context && context.sortState.columnIndex === columnIndex;
  const sortDirection = isActive ? context.sortState.direction : 'normal';

  const handleClick = () => {
    if (columnIndex !== null && context) {
      context.onSort(columnIndex);
    }
  };

  const getSortIcon = () => {
    const inactiveColor = 'var(--Lynch-400, #8695AA)';
    const activeColor = 'var(--Picton-Blue-600, #0093D4)'; // Picton Blue 600 for active state
    
    if (sortDirection === 'asc') {
      // Show chevron-up active, chevron-down inactive, positioned exactly like chevrons-up-down
      return (
        <div style={{ position: 'relative', width: '15px', height: '15px' }}>
          <ChevronUp 
            size={13} 
            strokeWidth={2.5}
            style={{ 
              color: activeColor,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) translateY(-3.8px)'
            }} 
          />
          <ChevronDown 
            size={13} 
            strokeWidth={2.5}
            style={{ 
              color: inactiveColor,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) translateY(3.8px)'
            }} 
          />
        </div>
      );
    } else if (sortDirection === 'desc') {
      // Show chevron-up inactive, chevron-down active, positioned exactly like chevrons-up-down
      return (
        <div style={{ position: 'relative', width: '15px', height: '15px' }}>
          <ChevronUp 
            size={13} 
            strokeWidth={2.5}
            style={{ 
              color: inactiveColor,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) translateY(-3.8px)'
            }} 
          />
          <ChevronDown 
            size={13} 
            strokeWidth={2.5}
            style={{ 
              color: activeColor,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) translateY(3.8px)'
            }} 
          />
        </div>
      );
    }
    // Normal state: show chevrons-up-down with inactive color
    return <ChevronsUpDown size={16} style={{ color: inactiveColor }} />;
  };

  return (
    <th 
      ref={headerRef}
      style={{
        padding: '6px 8px 6px 16px',
        borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
        borderRight: '1px solid var(--Lynch-200, #D5D9E2)',
        background: 'var(--Lynch-50, #F6F7F9)',
        textAlign: 'left',
        verticalAlign: 'middle',
        boxSizing: 'border-box',
        margin: 0
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1,
          flex: '1 0 0',
          overflow: 'hidden',
          color: 'var(--Lynch-700, #434E61)',
          textOverflow: 'ellipsis',
          fontFamily: 'Manrope',
          fontSize: '13px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: '28px',
          letterSpacing: '0.09px'
        }}>
          {children}
        </span>
        <div 
          onClick={handleClick}
          style={{
            display: 'flex',
            width: '24px',
            height: '24px',
            padding: '4px',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
            cursor: columnIndex !== null && context ? 'pointer' : 'default',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (columnIndex !== null && context) {
              e.currentTarget.style.backgroundColor = 'var(--Lynch-100, #ECEEF2)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {getSortIcon()}
        </div>
      </div>
    </th>
  );
}

// Status Label Component
interface StatusLabelProps {
  status: 'positive' | 'negative' | 'warning';
  children: React.ReactNode;
}

function StatusLabel({ status, children }: StatusLabelProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusStyles = () => {
    switch (status) {
      case 'positive':
        return {
          background: '#E8F5E9', // Light green
          color: '#2E7D32', // Dark green
        };
      case 'negative':
        return {
          background: '#FFEBEE', // Light red
          color: '#C62828', // Dark red
        };
      case 'warning':
        return {
          background: '#FFF3E0', // Light yellow/orange
          color: '#E65100', // Dark orange
        };
      default:
        return {
          background: '#F6F7F9',
          color: '#434E61',
        };
    }
  };

  const styles = getStatusStyles();

  // Hover styles matching the image: Picton Blue/50 background (same as table hover), light blue text, light blue border with glow
  const hoverStyles = {
    background: 'var(--Picton-Blue-50, #EFFAFF)',
    color: 'var(--Picton-Blue-500, #0BC0FF)',
    border: '1px solid var(--Picton-Blue-500, #0BC0FF)',
  };

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        padding: '4px 12px',
        alignItems: 'center',
        textAlign: 'center',
        borderRadius: '12px',
        background: isHovered ? hoverStyles.background : styles.background,
        color: isHovered ? hoverStyles.color : styles.color,
        border: isHovered ? hoverStyles.border : '1px solid transparent',
        fontFamily: 'Manrope',
        fontSize: '12px',
        fontStyle: 'normal',
        fontWeight: 600,
        lineHeight: '16px',
        letterSpacing: '0.08px',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
    >
      {children}
    </span>
  );
}

export function TableCell({ children }: MarkdownComponentProps) {
  const cellRef = useRef<HTMLTableCellElement>(null);
  const context = useContext(TableContext);
  const [columnIndex, setColumnIndex] = useState<number | null>(null);

  // Check if children contains status label text
  const childrenText = typeof children === 'string' ? children : 
    (React.Children.toArray(children).find(child => typeof child === 'string') as string || '');
  
  const normalizedText = childrenText.toLowerCase().trim();
  let detectedStatus: 'positive' | 'negative' | 'warning' | null = null;
  if (normalizedText.includes('positive') || normalizedText === 'positive label') {
    detectedStatus = 'positive';
  } else if (normalizedText.includes('negative') || normalizedText === 'negative label') {
    detectedStatus = 'negative';
  } else if (normalizedText.includes('warning') || normalizedText === 'warning label') {
    detectedStatus = 'warning';
  }

  // Determine column index
  useEffect(() => {
    if (!cellRef.current) return;
    
    const row = cellRef.current.closest('tr');
    if (!row) return;
    
    const cells = Array.from(row.querySelectorAll('td'));
    const index = cells.indexOf(cellRef.current);
    if (index >= 0) {
      setColumnIndex(index);
    }
  }, []);

  const isStatusColumn = context && columnIndex !== null && context.statusColumnIndices.has(columnIndex);
  const finalStatus = detectedStatus;
  const finalIsStatusColumn = isStatusColumn || !!detectedStatus;

  return (
    <td 
      ref={cellRef}
      style={{
        padding: '6px 16px',
        borderBottom: '1px solid var(--Lynch-200, #D5D9E2)',
        borderRight: '1px solid var(--Lynch-200, #D5D9E2)',
        textAlign: 'left',
        verticalAlign: 'middle',
        boxSizing: 'border-box',
        margin: 0
      }}
    >
      {finalIsStatusColumn && finalStatus ? (
        <StatusLabel status={finalStatus}>
          {finalStatus === 'positive' ? 'Positive Label' :
           finalStatus === 'negative' ? 'Negative Label' :
           finalStatus === 'warning' ? 'Warning Label' : children}
        </StatusLabel>
      ) : (
        <span style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1,
          overflow: 'hidden',
          color: 'var(--Lynch-700, #434E61)',
          textOverflow: 'ellipsis',
          fontFamily: 'Manrope',
          fontSize: '13px',
          fontStyle: 'normal',
          fontWeight: 500,
          lineHeight: '28px',
          letterSpacing: '0.09px'
        }}>
          {children}
        </span>
      )}
    </td>
  );
}

