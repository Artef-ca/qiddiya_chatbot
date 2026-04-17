'use client';

import { useState, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { themeColors, themeSpacing } from '@/lib/utils/theme';
import { getLabelStyle } from '@/lib/utils/textStyles';
import { PinnedItemCard } from '@/components/rightPanel/PinnedItemCard';
import { Pin, Share2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { removePinnedItem } from '@/store/slices/pinnedSlice';
import { useAppDispatch } from '@/store/hooks';
import { extractCopyText } from '@/lib/utils/textExtraction';
import { PinnedItemModal } from '@/components/rightPanel/PinnedItemModal';
import ShareExportModal from '@/components/chats/ShareExportModal';
import UnpinConfirmationModal from '@/components/pinned/UnpinConfirmationModal';
import DeleteConfirmationModal from '@/components/pinned/DeleteConfirmationModal';

interface GroupPinnedItemsPanelProps {
  conversationIds: string[];
  filteredConversationId?: string | null; // If set, show only pinned items from this conversation
}

export default function GroupPinnedItemsPanel({
  conversationIds,
  filteredConversationId,
}: GroupPinnedItemsPanelProps) {
  const dispatch = useAppDispatch();
  const { items: apiItems, reorderPinnedItems: reorderItems, deletePinnedItem } = usePinnedItems();
  const reduxItems = useAppSelector((state) => {
    return state.pinned.items.map((item) => ({
      ...item,
      pinnedAt: new Date(item.pinnedAt),
    }));
  });
  
  // Use API items if available, otherwise fall back to Redux
  const allItems = apiItems.length > 0 ? apiItems : reduxItems;
  
  // Filter items by conversation IDs
  const filteredItems = useMemo(() => {
    let items = allItems.filter((item) => conversationIds.includes(item.conversationId));
    
    // If a specific conversation is selected, filter further
    if (filteredConversationId) {
      items = items.filter((item) => item.conversationId === filteredConversationId);
    }
    
    return items;
  }, [allItems, conversationIds, filteredConversationId]);
  
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<typeof filteredItems[0] | null>(null);
  const [isShareExportModalOpen, setIsShareExportModalOpen] = useState(false);
  const [selectedItemForShare, setSelectedItemForShare] = useState<typeof filteredItems[0] | null>(null);
  const [isUnpinModalOpen, setIsUnpinModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemsToUnpin, setItemsToUnpin] = useState<typeof filteredItems>([]);
  const [itemsToDelete, setItemsToDelete] = useState<typeof filteredItems>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderItems({
        activeId: String(active.id),
        overId: String(over.id),
      });
    }
  };
  
  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  
  const handleCopy = (content: string) => {
    const text = extractCopyText(content);
    navigator.clipboard.writeText(text);
  };
  
  const handleShare = (item: typeof filteredItems[0]) => {
    setSelectedItemForShare(item);
    setIsShareExportModalOpen(true);
  };
  
  const handleEdit = (item: typeof filteredItems[0]) => {
    setSelectedItemForEdit(item);
    setIsEditModalOpen(true);
  };
  
  const handleUnpin = async (itemId: string) => {
    try {
      await deletePinnedItem(itemId, {
        onSuccess: () => {
          dispatch(removePinnedItem(itemId));
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            dispatch(removePinnedItem(itemId));
          }
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not found') && !errorMessage.includes('404')) {
        console.error('Failed to unpin item:', error);
      }
      dispatch(removePinnedItem(itemId));
    }
  };
  
  const handleDelete = async (itemId: string) => {
    try {
      await deletePinnedItem(itemId, {
        onSuccess: () => {
          dispatch(removePinnedItem(itemId));
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            dispatch(removePinnedItem(itemId));
          }
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not found') && !errorMessage.includes('404')) {
        console.error('Failed to delete item:', error);
      }
      dispatch(removePinnedItem(itemId));
    }
  };
  
  const handleShareExport = () => {
    if (filteredItems.length > 0) {
      // Open share export modal for all pinned items
      // For now, use the first item's conversation ID and pass all items
      setSelectedItemForShare(filteredItems[0]);
      setIsShareExportModalOpen(true);
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
          style={{
            backgroundColor: themeColors.gray50(),
            borderLeft: `1px solid ${themeColors.gray200()}`,
          }}
    >
      {/* Header with Gradient */}
      <div
        className="flex items-end justify-between relative"
        style={{
          paddingBottom: '8px',
          paddingLeft: '20px',
          paddingRight: '40px',
          paddingTop: '56px',
          background: 'linear-gradient(to top, rgba(246, 247, 249, 0.1) 0%, rgba(246, 247, 249, 0.1) 22.159%, var(--lynch-50, #F6F7F9) 100%)',
        }}
      >
        <h2
          style={{
            fontFamily: 'Manrope, var(--font-manrope)',
            fontSize: '18px',
            fontWeight: 500,
            lineHeight: '24px',
            letterSpacing: '-0.0594px',
            color: themeColors.gray700(),
            flex: '1 0 0',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          Selected Chat Items
        </h2>
      </div>
      
      {/* Pin Board Section */}
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
        {/* Board Header */}
        <div
          className="flex items-center relative"
          style={{
              paddingLeft: '20px',
              paddingRight: '40px',
              paddingTop: 0,
              paddingBottom: 0,
              gap: '10px', // Keep specific design spacing
          }}
        >
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '13px',
              fontWeight: 700,
              lineHeight: '24px',
              letterSpacing: '0.09px',
              ...getLabelStyle(themeColors.gray600()),
              flex: '1 0 0',
              minWidth: 0,
            }}
          >
            Pinned items: {filteredItems.length}
          </p>
          <button
            onClick={filteredItems.length > 0 ? handleShareExport : undefined}
            disabled={filteredItems.length === 0}
            className="flex items-center justify-center transition-colors"
            style={{
              gap: '4px',
              borderRadius: '2px',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: filteredItems.length > 0 ? 'pointer' : 'not-allowed',
              opacity: filteredItems.length > 0 ? 1 : 0.5,
            }}
          >
            <Share2
              size={16}
              style={{ color: filteredItems.length > 0 ? themeColors.primary600() : themeColors.neutral400() }}
            />
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                color: filteredItems.length > 0 ? themeColors.primary600() : themeColors.neutral400(),
              }}
            >
              Share & Export
            </span>
          </button>
        </div>
      
        {/* Scrollable Content Container with Fixed Gradients */}
        <div
          className="flex flex-col flex-1 overflow-hidden relative"
          style={{
            minHeight: 0,
          }}
        >
          {/* Gradient Reveal Top - Fixed position below header */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: '20px',
              zIndex: 10,
              background: 'linear-gradient(to bottom, var(--lynch-50, rgba(246, 247, 249, 1)) 0%, rgba(246, 247, 249, 0.9) 44.181%, rgba(246, 247, 249, 0) 100%)',
            }}
          />
          
          {/* Scrollable Content */}
          <div
            className="flex-1 overflow-y-auto custom-scrollbar"
            style={{
              paddingTop: '20px',
              paddingBottom: '40px',
              paddingLeft: '20px',
              paddingRight: '40px',
              minHeight: 0,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div
              className="flex flex-col"
              style={{
                gap: themeSpacing.sm(),
              }}
            >
              {filteredItems.length === 0 ? (
                <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                  <EmptyState
                    icon={Pin}
                    title="No pinned items found."
                    description={filteredConversationId ? "This chat has no pinned items." : "This group has no pinned items."}
                    titleWidth="506px"
                  />
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredItems.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredItems.map((item) => (
                      <PinnedItemCard
                        key={item.id}
                        item={item}
                        isHovered={hoveredItemId === item.id}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                        onCopy={() => handleCopy(item.content)}
                        onShare={() => handleShare(item)}
                        onEdit={() => handleEdit(item)}
                        onUnpin={() => handleUnpin(item.id)}
                        onViewChat={() => {}}
                        onDelete={() => handleDelete(item.id)}
                        showHoverMenu={false}
                        isSelected={selectedItems.has(item.id)}
                        onSelect={() => handleSelectItem(item.id)}
                        checkboxPosition="left"
                        variant="list"
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
          
          {/* Gradient Reveal Bottom - Fixed position */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: 0,
              left: 0,
              right: 0,
              height: '40px',
              zIndex: 10,
              background: 'linear-gradient(to top, var(--lynch-50, #F6F7F9) 8%, rgba(246, 247, 249, 0) 100%)',
            }}
          />
        </div>
      </div>
      
      {/* Modals */}
      {selectedItemForEdit && (
        <PinnedItemModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
          }}
          item={selectedItemForEdit}
          onUpdate={() => {
            // Handle update if needed
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
          }}
        />
      )}
      
      {selectedItemForShare && (
        <ShareExportModal
          isOpen={isShareExportModalOpen}
          onClose={() => {
            setIsShareExportModalOpen(false);
            setSelectedItemForShare(null);
          }}
          chatId={selectedItemForShare.conversationId}
          chatTitle="Selected Chat Items"
          pinnedItems={filteredItems}
          isPinBoardExport={true}
          exportOnly={true}
        />
      )}
      
      <UnpinConfirmationModal
        isOpen={isUnpinModalOpen}
        onClose={() => {
          setIsUnpinModalOpen(false);
          setItemsToUnpin([]);
        }}
        items={itemsToUnpin}
        onConfirm={async () => {
          for (const item of itemsToUnpin) {
            await handleUnpin(item.id);
          }
          setSelectedItems(new Set());
          setIsUnpinModalOpen(false);
          setItemsToUnpin([]);
        }}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemsToDelete([]);
        }}
        items={itemsToDelete}
        onConfirm={async () => {
          for (const item of itemsToDelete) {
            await handleDelete(item.id);
          }
          setSelectedItems(new Set());
          setIsDeleteModalOpen(false);
          setItemsToDelete([]);
        }}
      />
    </div>
  );
}

