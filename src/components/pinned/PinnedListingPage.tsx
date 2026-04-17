'use client';

import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { setActiveConversation } from '@/store/slices/chatSlice';
import { addToast } from '@/store/slices/uiSlice';
import { clearProState } from '@/lib/chatProState';
import { cn } from '@/lib/utils';
import { themeColors, themeSpacing } from '@/lib/utils/theme';
import { GRADIENT_STYLES } from '@/lib/styles/commonStyles';
import {
  PageTitle,
  HeaderSearchInput,
  SecondaryButton,
  SelectAllCheckbox,
  ActionButton,
} from '@/components/shared';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { useConversations } from '@/hooks/useConversations';
import { useAppSelector } from '@/store/hooks';
import EmptyState from '@/components/ui/EmptyState';
import { Pin, MessageSquarePlus, PinOff } from 'lucide-react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { PinnedItemCard } from '@/components/rightPanel/PinnedItemCard';
import { useState, useMemo } from 'react';
import { extractCopyText } from '@/lib/utils/textExtraction';
import { removePinnedItem } from '@/store/slices/pinnedSlice';
import { extractTitleFromContent } from '@/lib/utils/extractTitle';
import { PinnedItemModal } from '@/components/rightPanel/PinnedItemModal';
import ShareExportModal from '@/components/chats/ShareExportModal';
import UnpinConfirmationModal from '@/components/pinned/UnpinConfirmationModal';
import LoadingIndicator from '@/components/chats/LoadingIndicator';

export default function PinnedListingPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items: apiItems, reorderPinnedItems: reorderItems, isLoading } = usePinnedItems();
  const reduxItems = useAppSelector((state) => {
    return state.pinned.items.map((item) => ({
      ...item,
      pinnedAt: new Date(item.pinnedAt),
    }));
  });
  // Use API items if available, otherwise fall back to Redux
  const items = apiItems.length > 0 ? apiItems : reduxItems;
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<typeof items[0] | null>(null);
  const [isShareExportModalOpen, setIsShareExportModalOpen] = useState(false);
  const [selectedItemForShare, setSelectedItemForShare] = useState<typeof items[0] | null>(null);
  const [openEditPanelOnMount, setOpenEditPanelOnMount] = useState(false);
  const [isUnpinModalOpen, setIsUnpinModalOpen] = useState(false);
  const [itemsToUnpin, setItemsToUnpin] = useState<typeof items>([]);
  const { updatePinnedItemAsync } = usePinnedItems();
  const { fetchConversationById } = useConversations();

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }
    
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const contentStr = typeof item.content === 'string' ? item.content : (item.content != null ? String(item.content) : '');
      const title = item.title || extractTitleFromContent(contentStr);
      const content = contentStr.toLowerCase();
      return title.toLowerCase().includes(query) || content.includes(query);
    });
  }, [items, searchQuery]);

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

  const handleCopy = async (content: string) => {
    try {
      // Extract plain text from markdown/HTML content
      const plainText = extractCopyText(content);
      await navigator.clipboard.writeText(plainText);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const { deletePinnedItem } = usePinnedItems();
  
  const handleShare = (item: typeof items[0]) => {
    setSelectedItemForShare(item);
    setIsShareExportModalOpen(true);
  };

  const handleEdit = (item: typeof items[0]) => {
    setSelectedItemForEdit(item);
    setOpenEditPanelOnMount(true);
    setIsEditModalOpen(true);
  };

  const handleExpand = (item: typeof items[0]) => {
    setSelectedItemForEdit(item);
    setOpenEditPanelOnMount(false);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (id: string, name: string, note: string) => {
    try {
      if (selectedItemForEdit && selectedItemForEdit.id === id) {
        setSelectedItemForEdit({
          ...selectedItemForEdit,
          title: name,
          note: note || undefined,
        });
      }
      
      await updatePinnedItemAsync({
        id,
        updates: {
          title: name,
          note: note || undefined,
        },
      });
      
      setOpenEditPanelOnMount(false);
    } catch (error) {
      console.error('Failed to update pinned item:', error);
    }
  };

  const handleUnpin = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setItemsToUnpin([item]);
      setIsUnpinModalOpen(true);
    }
  };

  const confirmUnpin = () => {
    itemsToUnpin.forEach((item) => {
      deletePinnedItem(item.id);
      dispatch(removePinnedItem(item.id));
    });
    setItemsToUnpin([]);
    setIsUnpinModalOpen(false);
    setSelectedItems(new Set());
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

    router.push(`/chat/${item.conversationId}`);
  };

  const handleStartChat = () => {
    clearProState();
    dispatch(setActiveConversation(null));
    router.push('/');
  };

  const handleNewChat = () => {
    clearProState();
    dispatch(setActiveConversation(null));
    router.push('/');
  };

  // Selection handlers
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

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleUnpinSelected = () => {
    const itemsToUnpinList = filteredItems.filter((item) => selectedItems.has(item.id));
    if (itemsToUnpinList.length > 0) {
      setItemsToUnpin(itemsToUnpinList);
      setIsUnpinModalOpen(true);
    }
  };

  const handleCheckboxClick = () => {
    setSelectedItems(new Set());
  };

  const showCheckbox = selectedItems.size > 0;

  return (
    <div
      className={cn('flex flex-col h-full overflow-hidden')}
      style={{
        backgroundColor: themeColors.gray50(),
        paddingTop: themeSpacing['2xl'](),
        paddingLeft: 'clamp(16px, calc((100vw - 862px) / 2), 288px)',
        paddingRight: 'clamp(16px, calc((100vw - 862px) / 2), 288px)',
        paddingBottom: '0',
      }}
    >
      {/* Page Header */}
      <div
        className="flex flex-col w-full items-center"
        style={{ gap: themeSpacing.sm2() }}
      >
        <div
          className="flex flex-col"
          style={{
            width: '854px',
            gap: themeSpacing.lg(),
            paddingLeft: '32px',
            paddingRight: '0px',
          }}
        >
          <div className="flex items-center justify-between w-full">
            <PageTitle size="large">Pinned Items</PageTitle>
            <SecondaryButton
              icon={MessageSquarePlus}
              label="New Chat"
              onClick={handleNewChat}
            />
          </div>

          <div className="w-full">
            <HeaderSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="item or chat name"
            />
          </div>
        </div>

        {/* Page Action Bar */}
        <div
          className="flex items-center"
          style={{
            width: '854px',
            gap: themeSpacing.md(),
            paddingLeft: themeSpacing.xs(),
            paddingRight: '0px',
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 16, height: 16 }}
          >
            {showCheckbox && (
              <SelectAllCheckbox
                selectedCount={selectedItems.size}
                totalCount={filteredItems.length}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleCheckboxClick}
                showCheckbox
                showButton={false}
              />
            )}
          </div>

          <div
            className="flex flex-1 items-center"
            style={{
              minHeight: 0,
              justifyContent: selectedItems.size > 0 ? 'center' : 'space-between',
              position: 'relative',
            }}
          >
            <div
              className="flex items-center"
              style={{
                width: '228px',
                paddingLeft: themeSpacing.xs(),
                position: selectedItems.size > 0 ? 'absolute' : 'relative',
                left: selectedItems.size > 0 ? 0 : 'auto',
              }}
            >
              <SelectAllCheckbox
                selectedCount={selectedItems.size}
                totalCount={filteredItems.length}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleCheckboxClick}
                showCheckbox={false}
                showButton
                buttonText={`Select All Loaded (${selectedItems.size}/${filteredItems.length})`}
                disabled={filteredItems.length === 0}
              />
            </div>

            {selectedItems.size > 0 && (
              <div
                className="flex items-center"
                style={{ gap: themeSpacing.sm() }}
              >
                <ActionButton
                  icon={PinOff}
                  onClick={handleUnpinSelected}
                  title="Unpin Selected"
                  variant="primary"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex flex-col flex-1 overflow-hidden relative"
        style={{
          minHeight: 0,
        }}
      >
        {/* Gradient Reveal Top */}
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '24px',
            zIndex: 10,
            ...GRADIENT_STYLES.topGradient,
          }}
        />

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{
            paddingLeft: '32px',
            margin: '0 auto',
            paddingTop: '24px',
            paddingBottom: '48px',
            minHeight: 0,
          }}
        >
        {isLoading ? (
          <div className="flex items-center justify-center flex-1" style={{ minHeight: '400px' }}>
            <LoadingIndicator text="Loading pinned items..." />
          </div>
        ) : filteredItems.length === 0 && items.length === 0 ? (
          <div className="flex items-center justify-center flex-1" style={{ minHeight: '400px' }}>
            <EmptyState
              icon={Pin}
              title="You currently have no Pinned Items."
              description="Pin items inside your conversations; tables, charts, and AI replies can be shared, exported and copied."
              titleWidth="506px"
              actionButton={{
                icon: MessageSquarePlus,
                label: 'Start Chat',
                onClick: handleStartChat,
              }}
            />
          </div>
        ) : filteredItems.length === 0 && items.length > 0 ? (
          <div className="flex items-center justify-center flex-1" style={{ minHeight: '400px' }}>
            <EmptyState
              icon={Pin}
              title="No pinned items found."
              description="Try adjusting your search query."
              titleWidth="506px"
            />
          </div>
        ) : (
          /* Pinned items grid with drag and drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredItems.map((item) => item.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid gap-[32px]"
                style={{
                  gridTemplateColumns: 'repeat(2, 423px)',
                  paddingBottom: '48px',
                  width: '100%',
                }}
              >
                {filteredItems.map((item, index) => (
                  <PinnedItemCard
                    key={item.id}
                    item={item}
                    isHovered={hoveredItemId === item.id}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    onCopy={() => handleCopy(item.content)}
                    onShare={() => handleShare(item)}
                    onEdit={() => handleEdit(item)}
                    onExpand={() => handleExpand(item)}
                    onUnpin={handleUnpin}
                    onViewChat={() => handleViewChat(item)}
                    showHoverMenu={false}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={() => handleSelectItem(item.id)}
                    checkboxPosition={index % 2 === 0 ? 'left' : 'right'}
                    variant="grid"
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        </div>

        {/* Gradient Reveal Bottom */}
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '48px',
            zIndex: 10,
            ...GRADIENT_STYLES.bottomGradient,
          }}
        />
      </div>

      {/* Unpin Confirmation Modal */}
      <UnpinConfirmationModal
        isOpen={isUnpinModalOpen}
        onClose={() => {
          setIsUnpinModalOpen(false);
          setItemsToUnpin([]);
        }}
        items={itemsToUnpin}
        onConfirm={confirmUnpin}
      />

      {/* Edit Modal */}
      {selectedItemForEdit && (
        <PinnedItemModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            setOpenEditPanelOnMount(false);
          }}
          item={selectedItemForEdit}
          onUpdate={handleUpdate}
          openEditPanel={openEditPanelOnMount}
        />
      )}

      {/* Share & Export Modal */}
      <ShareExportModal
        isOpen={isShareExportModalOpen}
        onClose={() => {
          setIsShareExportModalOpen(false);
          setSelectedItemForShare(null);
        }}
        chatId={selectedItemForShare?.conversationId || ''}
        chatTitle={selectedItemForShare?.title || 'Pinned Item'}
        pinnedItems={selectedItemForShare ? [selectedItemForShare] : []}
        isPinBoardExport={true}
        exportOnly={true}
      />
    </div>
  );
}

