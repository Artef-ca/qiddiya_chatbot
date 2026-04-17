'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks';
import { 
  updateConversationTitle,
  toggleStarConversation,
  setActiveConversation
} from '@/store/slices/chatSlice';
import { clearProState } from '@/lib/chatProState';
import { useConversations } from '@/hooks/useConversations';
import { addToast, removeToast } from '@/store/slices/uiSlice';
import { Star, EllipsisVertical, PencilLine, Share2, FileDown, Trash2, Check, X } from 'lucide-react';
import { exportChatAsPDF } from '@/lib/utils/exportChatAsPDF';
import DeleteChatModal from '@/components/chats/DeleteChatModal';
import ShareExportModal from '@/components/chats/ShareExportModal';
import AddToGroupModal from '@/components/chats/AddToGroupModal';
import type { Conversation } from '@/types';

interface ChatHeaderProps {
  conversation: Conversation;
}

interface GroupOption {
  id: string;
  name: string;
  conversationIds: string[];
}

function isGroupOption(value: unknown): value is GroupOption {
  if (!value || typeof value !== 'object') return false;
  const maybeGroup = value as Record<string, unknown>;
  return (
    typeof maybeGroup.id === 'string' &&
    typeof maybeGroup.name === 'string' &&
    Array.isArray(maybeGroup.conversationIds)
  );
}

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();
  const { activeConversationId } = useAppSelector((state) => state.chat);
  const { updateConversationAsync, groups: allGroups } = useConversations();
  const validAllGroups: GroupOption[] = (Array.isArray(allGroups) ? (allGroups as unknown[]) : []).filter(isGroupOption);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareExportModalOpen, setIsShareExportModalOpen] = useState(false);
  const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleRename = () => {
    setIsEditing(true);
    setEditValue(conversation.title);
  };

  const handleRenameSubmit = async () => {
    const trimmedValue = editValue.trim();
    
    // Validate input
    if (!trimmedValue) {
      dispatch(addToast({
        type: 'error',
        message: 'Chat name cannot be empty',
      }));
      return;
    }

    // If name hasn't changed, just close
    if (trimmedValue === conversation.title) {
      setIsEditing(false);
      return;
    }

    try {
      // Update conversation via API
      await updateConversationAsync({ 
        id: conversation.id, 
        updates: { title: trimmedValue } 
      });

      // Update Redux store
      dispatch(updateConversationTitle({ 
        id: conversation.id, 
        title: trimmedValue 
      }));

      // Show success notification
      dispatch(addToast({
        type: 'success',
        message: 'Chat was successfully renamed',
      }));

      setIsEditing(false);
    } catch {
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to rename the selected Chat. Please try again later.',
      }));
    }
  };

  const handleRenameCancel = () => {
    setIsEditing(false);
    setEditValue(conversation.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const handleStar = async () => {
    const newStarredValue = !conversation.starred;
    const conversationTitle = conversation.title;
    
    // Optimistically update the UI
    dispatch(toggleStarConversation(conversation.id));
    
    try {
      // Update conversation via API
      await updateConversationAsync({ 
        id: conversation.id, 
        updates: { starred: newStarredValue } 
      });

      // Show success notification
      dispatch(addToast({
        type: 'success',
        message: newStarredValue 
          ? `${conversationTitle} was successfully starred`
          : `${conversationTitle} was successfully unstarred`,
      }));
    } catch {
      // Revert the optimistic update on error
      dispatch(toggleStarConversation(conversation.id));
      
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to star the selected chat. Please try again later.',
      }));
    }
  };

  const handleAddToGroup = () => {
    setIsAddToGroupModalOpen(true);
    setMenuOpen(false);
  };

  const handleShareExport = () => {
    setIsShareExportModalOpen(true);
    setMenuOpen(false);
  };

  const handleDownloadPDF = async () => {
    // Check if conversation has messages
    if (!conversation.messages || conversation.messages.length === 0) {
      alert('No messages found in this conversation.');
      setMenuOpen(false);
      return;
    }

    setMenuOpen(false);

    const generatingMessage = 'Generating PDF...';
    dispatch(
      addToast({
        message: generatingMessage,
        type: 'info',
        duration: 0,
      })
    );
    const generatingToastId = store
      .getState()
      .ui.toasts.find((t) => t.message === generatingMessage && t.type === 'info')?.id;

    // Pass conversation data to ensure newly created chats can be exported (include is_pro for Pro frame in PDF)
    const conversationData = {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content || '',
        timestamp: msg.timestamp,
        is_pro: msg.is_pro,
      })),
    };

    try {
      await exportChatAsPDF(conversation.title || 'chat', conversation.id, conversationData);
    } finally {
      if (generatingToastId) {
        dispatch(removeToast(generatingToastId));
      }
    }
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
    setMenuOpen(false);
  };

  const handleDeleteComplete = () => {
    // Check if the deleted conversation is the active one
    const isActiveConversation = activeConversationId === conversation.id;
    
    // If deleting the active conversation, redirect to welcome screen
    if (isActiveConversation) {
      clearProState();
      dispatch(setActiveConversation(null));
      router.push('/');
    }
  };

  const renderOverflowMenu = () => (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 hover:bg-gray-100 transition-colors"
        title="More options"
        aria-label="More options"
        aria-expanded={menuOpen}
      >
        <EllipsisVertical
          style={{
            width: '16px',
            height: '16px',
            aspectRatio: '1/1',
            color: '#434E61'
          }}
        />
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            left: '-114px',
            bottom: '-125px',
            display: 'flex',
            width: '146px',
            padding: '4px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            borderRadius: '8px',
            border: '1px solid #D5D9E2',
            background: '#FFF',
            boxShadow: '0 2px 8px 0 #ECEEF2',
            zIndex: 50,
          }}
        >
          <button
            onClick={handleAddToGroup}
            style={{
              display: 'flex',
              padding: '0 8px',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '4px',
              width: '130px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Image
              src="/AddToGroup.svg"
              alt="Add to Group"
              width={14}
              height={14}
              style={{
                width: '14px',
                height: '14px',
                display: 'block',
              }}
            />
            <span
              style={{
                width: '92px',
                color: '#434E61',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
              }}
            >
              Add to Group
            </span>
          </button>
          <button
            onClick={handleShareExport}
            style={{
              display: 'flex',
              padding: '0 8px',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '4px',
              width: '130px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Share2 style={{ width: '14px', height: '14px', color: '#434E61' }} />
            <span
              style={{
                width: '92px',
                color: '#434E61',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
              }}
            >
              Share & Export
            </span>
          </button>
          <button
            onClick={handleDownloadPDF}
            style={{
              display: 'flex',
              padding: '0 8px',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '4px',
              width: '130px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <FileDown style={{ width: '14px', height: '14px', color: '#434E61' }} />
            <span
              style={{
                width: '92px',
                color: '#434E61',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
              }}
            >
              Download PDF
            </span>
          </button>
          <div
            style={{
              display: 'flex',
              padding: '0 8px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '10px',
              alignSelf: 'stretch',
              opacity: 0.8,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '1px',
                background: '#D5D9E2',
              }}
            />
          </div>
          <button
            onClick={handleDelete}
            style={{
              display: 'flex',
              padding: '0 8px',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '4px',
              width: '130px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 style={{ width: '14px', height: '14px', color: '#CC5702' }} />
            <span
              style={{
                width: '92px',
                color: '#CC5702',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
              }}
            >
              Delete
            </span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div 
      className="relative z-10 mx-auto"
      style={{
        display: 'flex',
        width: '100%',
        maxWidth: '800px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '10px',
        background: 'none',
      }}
    >
      <div 
        style={{
          display: 'flex',
          width: '100%',
          padding: '4px 8px',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          borderRadius: '6px',
        }}
      >
        {isEditing ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: '1 0 0',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #ECEEF2',
                background: '#FFF',
                boxShadow: '0 1px 4px 0 #D5D9E2 inset',
                minWidth: 0,
              }}
            >
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-base font-medium bg-transparent border-none focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 focus-visible:rounded min-w-0"
                style={{ 
                  color: '#434E61',
                  fontFamily: 'Manrope',
                  fontSize: '16px',
                  fontWeight: 500,
                  lineHeight: '24px',
                }}
              />
              <button
                onClick={handleRenameSubmit}
                className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                title="Save"
                aria-label="Save"
              >
                <Check 
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    aspectRatio: '1/1',
                    color: '#7C3AED' // Purple color for checkmark
                  }} 
                />
              </button>
              <button
                onClick={handleRenameCancel}
                className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                title="Cancel"
                aria-label="Cancel"
              >
                <X 
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    aspectRatio: '1/1',
                    color: '#434E61' // Dark grey for X
                  }} 
                />
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleStar}
                className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                title={conversation.starred ? "Unstar this conversation" : "Star this conversation"}
                aria-label={conversation.starred ? "Unstar this conversation" : "Star this conversation"}
              >
                {conversation.starred ? (
                  <Star 
                    size={16} 
                    fill="currentColor"
                    style={{ color: '#0093D4' }} 
                  />
                ) : (
                  <Star 
                    style={{ 
                      width: '16px',
                      height: '16px',
                      aspectRatio: '1/1',
                      color: '#434E61'
                    }} 
                  />
                )}
              </button>

              {renderOverflowMenu()}
            </div>
          </>
        ) : (
          <>
            <h1 
              style={{
                color: '#065274',
                fontFamily: 'Manrope',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '24px',
                flex: '1 0 0',
                minWidth: 0,
              }}
            >
              {conversation.title}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {!isEditing && (
                <button
                  onClick={handleRename}
                  className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                  title="Rename this conversation"
                  aria-label="Rename this conversation"
                >
                  <PencilLine   
                    style={{ 
                      width: '16px', 
                      height: '16px',
                      aspectRatio: '1/1',
                      color: '#434E61'
                    }} 
                  />
                </button>
              )}
              <button
                onClick={handleStar}
                className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                title={conversation.starred ? "Unstar this conversation" : "Star this conversation"}
                aria-label={conversation.starred ? "Unstar this conversation" : "Star this conversation"}
              >
                {conversation.starred ? (
                  <Star 
                    size={16} 
                    fill="currentColor"
                    style={{ color: '#0093D4' }} 
                  />
                ) : (
                  <Star 
                    style={{ 
                      width: '16px',
                      height: '16px',
                      aspectRatio: '1/1',
                      color: '#434E61'
                    }} 
                  />
                )}
              </button>

              {renderOverflowMenu()}
            </div>
          </>
        )}
      </div>

      {/* Delete Chat Modal */}
      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        conversationsToDelete={[conversation]}
        onDeleteComplete={handleDeleteComplete}
      />

      {/* Share & Export Modal */}
      <ShareExportModal
        isOpen={isShareExportModalOpen}
        onClose={() => setIsShareExportModalOpen(false)}
        chatId={conversation.id}
        chatTitle={conversation.title}
        exportOnly={true}
      />

      {/* Add to Group Modal */}
      <AddToGroupModal
        isOpen={isAddToGroupModalOpen}
        onClose={() => setIsAddToGroupModalOpen(false)}
        conversations={[conversation]}
        groups={validAllGroups}
      />
    </div>
  );
}

