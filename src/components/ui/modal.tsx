'use client';

import { createPortal } from 'react-dom';
import { ReactNode, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  variant?: 'default' | 'danger';
  className?: string;
  contentPadding?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '500px',
  variant = 'default',
  className,
  contentPadding,
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const borderColor =
    variant === 'danger'
      ? '#FDE7E3' // Punch-100 (error border)
      : cssVar(CSS_VARS.borderLight);

  const modalContent = (
    <>
      {/* Blurred Background Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
        }}
        onClick={handleBackdropClick}
      />

      {/* Modal Dialog Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          pointerEvents: 'none',
        }}
        onClick={handleBackdropClick}
      >
        <div
          className={className}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            background: cssVar(CSS_VARS.backgroundSecondary),
            border: `1px solid ${borderColor}`,
            borderRadius: theme.borderRadius.xl,
            padding: contentPadding ?? theme.spacing.xl,
            boxShadow: `0px 8px 16px 0px ${cssVar(CSS_VARS.borderLight)}`,
            maxWidth,
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing['2xl'],
            overflowY: 'auto',
            overflowX: 'hidden',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        width: '100%',
      }}
    >
      <h3
        id="modal-title"
        style={{
          fontFamily: 'Manrope, var(--font-manrope)',
          fontSize: theme.typography.headline.small.size,
          fontWeight: theme.typography.weights.semibold.value,
          lineHeight: '32px',
          letterSpacing: '-0.12px',
          color: cssVar(CSS_VARS.textPrimary),
          margin: 0,
          paddingBottom: '10px',
        }}
      >
        {children}
      </h3>
    </div>
  );
}

interface ModalContentProps {
  children: ReactNode;
  className?: string;
}

export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.md,
          alignItems: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

