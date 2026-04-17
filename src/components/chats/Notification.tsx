'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Notification({
  id,
  type,
  message,
  onDismiss,
  duration = 5000,
}: NotificationProps) {
  const [isExiting, setIsExiting] = useState(false);
  const dismissTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (duration > 0 && !isExiting) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isExiting]);

  const handleDismiss = () => {
    if (isExiting) return; // Prevent multiple calls
    
    setIsExiting(true);
    
    // Clear any existing timeout
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    
    // Call onDismiss immediately - let the container handle the timing
    // The container will keep it in exiting state during animation
    onDismiss();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const isSuccess = type === 'success';
  const isInfo = type === 'info';
  
  // Success styles
  const successStyles = {
    background: '#F4FAF3', // De-York-50
    borderColor: '#CCE8CA', // De-York-200
    iconColor: '#4C9D4A', // De-York-600 (green)
    dismissColor: '#3A8138', // De-York-600
  };

  // Error styles
  const errorStyles = {
    background: '#FEF4F2', // Punch-50
    borderColor: '#FCD2CC', // Punch-200
    iconColor: '#D64933', // Punch-600 (red)
    dismissColor: '#D64933', // Punch-600
  };

  // Info styles (for loading/generating states)
  const infoStyles = {
    background: '#EFFAFF', // Picton-Blue-50
    borderColor: '#B6EBFF', // Picton-Blue-200
    iconColor: '#0093D4', // Picton-Blue-500
    dismissColor: '#0093D4', // Picton-Blue-500
  };

  const styles = isSuccess ? successStyles : isInfo ? infoStyles : errorStyles;

  const notificationContent = (
      <div
        className={isExiting ? 'notification-slide-out' : 'notification-slide-in'}
        style={{
          position: 'fixed',
          top: '48px',
          right: 0,
          zIndex: 10001,
          willChange: 'transform',
        }}
      >
      <div
        style={{
          background: styles.background,
          borderTop: `1px solid ${styles.borderColor}`,
          borderBottom: `1px solid ${styles.borderColor}`,
          borderLeft: `1px solid ${styles.borderColor}`,
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          padding: '16px 16px 16px 8px',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
          boxShadow: '0px 20px 44px 0px rgba(35, 39, 46, 0.04), 0px 80px 80px 0px rgba(35, 39, 46, 0.03), 0px 181px 109px 0px rgba(35, 39, 46, 0.02), 0px 322px 129px 0px rgba(35, 39, 46, 0.01), 0px 503px 141px 0px rgba(35, 39, 46, 0)',
          width: '278px',
          minHeight: '74px',
          boxSizing: 'border-box',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '20px',
            height: '20px',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {isSuccess ? (
            <CheckCircle2 size={20} color={styles.iconColor} strokeWidth={2} />
          ) : isInfo ? (
            <Info size={20} color={styles.iconColor} strokeWidth={2} />
          ) : (
            <XCircle size={20} color={styles.iconColor} strokeWidth={2} />
          )}
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            minWidth: 0,
            width: 0, // Force flex item to respect max-width
          }}
        >
          {/* Message */}
          <div
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '10px',
              fontWeight: 700,
              lineHeight: '16px',
              letterSpacing: '0.18px',
              color: '#434E61', // Lynch-700
              margin: 0,
              paddingTop: '2px',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              width: '100%',
            }}
          >
            {type === 'error' && message.includes('Something went wrong!') ? (
              <>
                <span style={{ fontWeight: 700 }}>Something went wrong!</span>
                <br />
                {message.replace('Something went wrong!', '').trim()}
              </>
            ) : message.includes('**') ? (
              // Parse bold text markers (**text**)
              (() => {
                const parts: (string | React.ReactElement)[] = [];
                const regex = /\*\*(.*?)\*\*/g;
                let lastIndex = 0;
                let match;
                
                while ((match = regex.exec(message)) !== null) {
                  // Add text before the bold marker
                  if (match.index > lastIndex) {
                    parts.push(message.substring(lastIndex, match.index));
                  }
                  // Add bold text
                  parts.push(
                    <span key={match.index} style={{ fontWeight: 700 }}>
                      {match[1]}
                    </span>
                  );
                  lastIndex = regex.lastIndex;
                }
                // Add remaining text
                if (lastIndex < message.length) {
                  parts.push(message.substring(lastIndex));
                }
                return <>{parts}</>;
              })()
            ) : (
              message
            )}
          </div>

          {/* Dismiss Link */}
          <button
            onClick={handleDismiss}
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '10px',
              fontWeight: 600,
              lineHeight: '16px',
              letterSpacing: '0.18px',
              color: styles.dismissColor,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              alignSelf: 'flex-start',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>

    </div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(notificationContent, document.body);
  }

  return null;
}

