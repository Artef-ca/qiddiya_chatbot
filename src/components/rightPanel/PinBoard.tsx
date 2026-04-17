'use client';

import { Pin, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removePinnedItem } from '@/store/slices/pinnedSlice';
import { addToast } from '@/store/slices/uiSlice';
import { useState, useEffect } from 'react';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { useConversations } from '@/hooks/useConversations';
import ShareExportModal from '@/components/chats/ShareExportModal';
import CopyAsModal from '@/components/chats/CopyAsModal';
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
import { PinnedItemCard } from './PinnedItemCard';
import { PinnedItemModal } from './PinnedItemModal';
import EmptyState from '@/components/ui/EmptyState';

export default function PinBoard() {
  const router = useRouter();
  const { items: apiItems, reorderPinnedItems: reorderItems, updatePinnedItemAsync } = usePinnedItems();
  const { fetchConversationById } = useConversations();
  const reduxItems = useAppSelector((state) => {
    return state.pinned.items.map((item) => ({
      ...item,
      pinnedAt: new Date(item.pinnedAt),
    }));
  });
  // Use API items if available, otherwise fall back to Redux
  const items = apiItems.length > 0 ? apiItems : reduxItems;
  const dispatch = useAppDispatch();
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isShareExportModalOpen, setIsShareExportModalOpen] = useState(false);
  const [selectedItemForShare, setSelectedItemForShare] = useState<typeof items[0] | null>(null);
  const [isCopyAsModalOpen, setIsCopyAsModalOpen] = useState(false);
  const [selectedItemForCopy, setSelectedItemForCopy] = useState<typeof items[0] | null>(null);
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);
  const [selectedItemForExpand, setSelectedItemForExpand] = useState<typeof items[0] | null>(null);
  const [openEditPanelOnMount, setOpenEditPanelOnMount] = useState(false);
  
  // Sync selectedItemForExpand with updated items from the list
  useEffect(() => {
    if (selectedItemForExpand && isExpandModalOpen) {
      const updatedItem = items.find((item) => item.id === selectedItemForExpand.id);
      if (updatedItem) {
        // Always update to ensure we have the latest data from the API
        // Compare all relevant fields to detect changes
        const currentTitle = selectedItemForExpand.title || '';
        const currentNote = selectedItemForExpand.note || '';
        const updatedTitle = updatedItem.title || '';
        const updatedNote = updatedItem.note || '';
        
        const hasChanged = 
          updatedTitle !== currentTitle ||
          updatedNote !== currentNote ||
          updatedItem.content !== selectedItemForExpand.content;
        
        if (hasChanged) {
          setSelectedItemForExpand(updatedItem);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isExpandModalOpen]);

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

  const handleCopy = (item: typeof items[0]) => {
    setSelectedItemForCopy(item);
    setIsCopyAsModalOpen(true);
  };

  const handleShare = (item: typeof items[0]) => {
    setSelectedItemForShare(item);
    setIsShareExportModalOpen(true);
  };

  const handleEdit = (item: typeof items[0]) => {
    // Open modal with edit panel for this item
    setSelectedItemForExpand(item);
    setOpenEditPanelOnMount(true); // Open edit panel when modal opens
    setIsExpandModalOpen(true);
  };

  const handleAddNote = () => {
    // TODO: Implement add note functionality
    console.log('Add note clicked');
  };

  const handleUpdate = async (id: string, name: string, note: string) => {
    try {
      // Optimistically update the selected item in the modal first
      if (selectedItemForExpand && selectedItemForExpand.id === id) {
        setSelectedItemForExpand({
          ...selectedItemForExpand,
          title: name,
          note: note || undefined,
        });
      }
      
      // Call the mutation and wait for it to complete
      // The mutation returns the updated item from the API
      const updatedItemData = await updatePinnedItemAsync({
        id,
        updates: {
          title: name,
          note: note || undefined,
        },
      });
      
      // Update selectedItemForExpand with the data returned from the API
      // Convert pinnedAt from string to Date if needed
      if (selectedItemForExpand && selectedItemForExpand.id === id && updatedItemData) {
        setSelectedItemForExpand({
          ...selectedItemForExpand,
          title: updatedItemData.title,
          note: updatedItemData.note,
          // Keep other properties from selectedItemForExpand
        });
      }
      
      // Reset the openEditPanelOnMount flag after update
      setOpenEditPanelOnMount(false);
      
      // The pin board list will automatically update via React Query invalidation
      // The useEffect will also sync selectedItemForExpand with the updated items array
      // when the query refetches
    } catch (error) {
      console.error('Failed to update pinned item:', error);
      // Revert optimistic update on error
      if (selectedItemForExpand && selectedItemForExpand.id === id) {
        const originalItem = items.find((item) => item.id === id);
        if (originalItem) {
          setSelectedItemForExpand(originalItem);
        }
      }
    }
  };

  const handleExpand = (item: typeof items[0]) => {
    setSelectedItemForExpand(item);
    setIsExpandModalOpen(true);
  };

  const handleViewChat = async (item: typeof items[0]) => {
    if (!item.conversationId) return;

    const conversation = await fetchConversationById(item.conversationId, { force: true });
    if (!conversation) {
      dispatch(addToast({
        type: 'error',
        message: 'This conversation is no longer available.',
      }));
      return;
    }

    const messageHash = item.messageId ? `#message-${item.messageId}` : '';
    router.push(`/chat/${item.conversationId}${messageHash}`);
  };

  const { deletePinnedItem } = usePinnedItems();
  
  const handleUnpin = (id: string) => {
    deletePinnedItem(id);
    dispatch(removePinnedItem(id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with count and share button */}
      <div
        style={{
          display: 'flex',
          width: '558px',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 16px 16px 40px',
        }}
      >
        <span style={{
          flex: '1 0 0',
          fontFamily: 'Manrope',
          fontSize: '13px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: '24px',
          letterSpacing: '0.09px',
          color: 'var(--Lynch-600, #526077)',
        }}>
          Pinned items: {items.length}
        </span>
        <button
          onClick={() => {
            if (items.length > 0) {
              setIsShareExportModalOpen(true);
            }
          }}
          disabled={items.length === 0}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '2px',
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            cursor: items.length > 0 ? 'pointer' : 'not-allowed',
            opacity: items.length > 0 ? 1 : 0.5,
          }}
          className="hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
          title="Share & Export"
          aria-label="Share & Export"
        >
          <Share2 
            className="h-4 w-4" 
            style={{ 
              color: items.length === 0 
                ? 'var(--Jumbo-400, #84848C)' 
                : 'var(--Electric-Violet-600, #7122F4)' 
            }}
          />
          <span
            style={{
              color: items.length === 0 
                ? 'var(--Jumbo-400, #84848C)' 
                : 'var(--Electric-Violet-600, #7122F4)',
              fontFamily: 'Manrope',
              fontSize: '13px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: '24px',
              letterSpacing: '0.09px',
            }}
          >
            Share & Export
          </span>
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          width: '558px',
          padding: '0 16px 40px 16px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
          background: 'var(--Lynch-100, #ECEEF2)',
        }}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        {items.length === 0 ? (
          <EmptyState
            icon={Pin}
            title="You currently have no Pinned Items."
            description="Pin items inside your conversations; tables, charts, and AI replies can be shared, exported and copied."
            titleWidth="506px"
            className="flex flex-col items-center pt-6"
          />
        ) : (
          /* Pinned items list with drag and drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {items.map((item) => (
                  <PinnedItemCard
                    key={item.id}
                    item={item}
                    isHovered={hoveredItemId === item.id}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    onCopy={() => handleCopy(item)}
                    onShare={() => handleShare(item)}
                    onEdit={() => handleEdit(item)}
                    onUnpin={handleUnpin}
                    onExpand={() => handleExpand(item)}
                    onViewChat={() => handleViewChat(item)}
                    showHoverMenu={true}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Share & Export Modal */}
      <ShareExportModal
        isOpen={isShareExportModalOpen}
        onClose={() => {
          setIsShareExportModalOpen(false);
          setSelectedItemForShare(null);
        }}
        chatId=""
        chatTitle={selectedItemForShare?.title || 'Pinned Item'}
        pinnedItems={selectedItemForShare ? [selectedItemForShare] : items}
        isPinBoardExport={true}
        exportOnly={true}
      />

      {/* Copy As Modal */}
      <CopyAsModal
        isOpen={isCopyAsModalOpen}
        onClose={() => {
          setIsCopyAsModalOpen(false);
          setSelectedItemForCopy(null);
        }}
        chatId=""
        chatTitle={selectedItemForCopy?.title || 'Pinned Item'}
        pinnedItems={selectedItemForCopy ? [selectedItemForCopy] : []}
        isPinBoardExport={true}
      />

        {/* Expand Modal */}
        {selectedItemForExpand && (
          <PinnedItemModal
            isOpen={isExpandModalOpen}
            onClose={() => {
              setIsExpandModalOpen(false);
              setSelectedItemForExpand(null);
              setOpenEditPanelOnMount(false);
            }}
            item={selectedItemForExpand}
            onEdit={() => {
              // handleEdit expects an item, but onEdit doesn't need it since item is already set
              // This is just to open the edit panel
              setOpenEditPanelOnMount(true);
            }}
            onAddNote={handleAddNote}
            onUpdate={handleUpdate}
            openEditPanel={openEditPanelOnMount}
          />
        )}
    </div>
  );
}

