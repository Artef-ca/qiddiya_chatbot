import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { serializeDate, toDate } from '@/lib/utils/date';
import type { PinnedItem } from '@/types';

// Redux state type - dates stored as strings for serialization
interface PinnedItemState {
  id: string;
  messageId: string;
  conversationId: string;
  content: string;
  title?: string;
  note?: string;
  pinnedAt: string; // Stored as ISO string in Redux
  type: 'message' | 'response';
}

interface PinnedState {
  items: PinnedItemState[];
}

// Type for pinned item creation payload (dates can be strings for serialization)
type PinnedItemPayload = Omit<PinnedItem, 'pinnedAt'> & {
  pinnedAt: string | Date;
};

const initialState: PinnedState = {
  items: [],
};

const pinnedSlice = createSlice({
  name: 'pinned',
  initialState,
  reducers: {
    addPinnedItem: (state, action: PayloadAction<PinnedItemPayload>) => {
      // Convert Date to ISO string for Redux storage
      const pinnedAtString = typeof action.payload.pinnedAt === 'string'
        ? action.payload.pinnedAt
        : serializeDate(action.payload.pinnedAt);

      const pinnedItem: PinnedItemState = {
        ...action.payload,
        pinnedAt: pinnedAtString,
      };
      // Check if item already exists
      const exists = state.items.some((item) => item.messageId === pinnedItem.messageId);
      if (!exists) {
        state.items.push(pinnedItem);
      }
    },
    removePinnedItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    removePinnedItemByMessageId: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.messageId !== action.payload);
    },
    clearPinnedItems: (state) => {
      state.items = [];
    },
    updatePinnedItemTitle: (
      state,
      action: PayloadAction<{ id: string; title: string }>
    ) => {
      const item = state.items.find((item) => item.id === action.payload.id);
      if (item) {
        item.title = action.payload.title;
      }
    },
    updatePinnedItem: (
      state,
      action: PayloadAction<{ id: string; title?: string; note?: string }>
    ) => {
      const item = state.items.find((item) => item.id === action.payload.id);
      if (item) {
        if (action.payload.title !== undefined) {
          item.title = action.payload.title;
        }
        if (action.payload.note !== undefined) {
          item.note = action.payload.note;
        }
      }
    },
    reorderPinnedItems: (
      state,
      action: PayloadAction<{ activeId: string; overId: string }>
    ) => {
      const { activeId, overId } = action.payload;
      if (activeId === overId) return;

      const activeIndex = state.items.findIndex((item) => item.id === activeId);
      const overIndex = state.items.findIndex((item) => item.id === overId);

      if (activeIndex === -1 || overIndex === -1) return;

      const [removed] = state.items.splice(activeIndex, 1);
      state.items.splice(overIndex, 0, removed);
    },
    /** Replace all items (used when hydrating from API on load) */
    setPinnedItems: (state, action: PayloadAction<PinnedItemState[]>) => {
      state.items = action.payload;
    },
  },
});

// Export actions
export const {
  addPinnedItem,
  removePinnedItem,
  removePinnedItemByMessageId,
  clearPinnedItems,
  updatePinnedItemTitle,
  updatePinnedItem,
  reorderPinnedItems,
  setPinnedItems,
} = pinnedSlice.actions;

// Selector to convert state items to PinnedItem format (with Date objects)
export const selectPinnedItems = (state: { pinned: PinnedState }): PinnedItem[] => {
  return state.pinned.items.map((item) => ({
    ...item,
    pinnedAt: toDate(item.pinnedAt),
  }));
};

export default pinnedSlice.reducer;

