import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import uiReducer from './slices/uiSlice';
import pinnedReducer from './slices/pinnedSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      chat: chatReducer,
      ui: uiReducer,
      pinned: pinnedReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types
          ignoredActions: ['chat/addMessage', 'chat/createConversation', 'chat/loadMockData'],
          // Ignore these field paths in all actions
          ignoredActionPaths: [
            'payload.timestamp',
            'payload.createdAt',
            'payload.updatedAt',
            'payload.message.timestamp',
            'payload.pinnedAt',
            'payload.*.messages.*.timestamp',
            'payload.*.createdAt',
            'payload.*.updatedAt',
          ],
          // Ignore these paths in the state
          ignoredPaths: ['chat.conversations'],
        },
      }),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

