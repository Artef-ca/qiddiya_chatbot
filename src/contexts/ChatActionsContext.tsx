'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';

interface ChatActionsContextType {
  sendMessage: (message: string) => void;
  addToInput: (text: string) => void;
  scrollToBottom?: (smooth?: boolean) => void;
}

const ChatActionsContext = createContext<ChatActionsContextType | null>(null);

export function ChatActionsProvider({ 
  children, 
  sendMessage, 
  addToInput,
  scrollToBottom
}: { 
  children: ReactNode;
  sendMessage: (message: string) => void;
  addToInput: (text: string) => void;
  scrollToBottom?: (smooth?: boolean) => void;
}) {
  // Memoize the context value to prevent unnecessary re-renders when parent re-renders
  const value = useMemo(() => ({
    sendMessage,
    addToInput,
    scrollToBottom,
  }), [sendMessage, addToInput, scrollToBottom]);

  return (
    <ChatActionsContext.Provider value={value}>
      {children}
    </ChatActionsContext.Provider>
  );
}

export function useChatActions() {
  const context = useContext(ChatActionsContext);
  return context;
}

