'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { consentApi } from '@/lib/api';
import { authApi } from '@/lib/api/auth';
import { setLocalConsentAccepted, clearLocalConsent, isMockConsentMode } from '@/hooks/useConsent';
import { Button } from '@/components/ui/button';

const BODY_TEXT =
  "By clicking 'Accept,' you agree to the storage of your conversations and any provided data. This enables chat history, saved boards, and personalized features. Stored data may be used for system improvement and internal reporting.";

const WARNING_TEXT = 'If you "Reject", you won\'t be granted access to the platform.';

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

/**
 * Non-dismissable consent modal for first-time users on welcome screen (Figma 1212-6964, 1212-6977).
 * User must check the consent checkbox to enable Accept. Reject logs out and redirects.
 */
export function ConsentModal({ isOpen, onAccept }: ConsentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const isMockMode = isMockConsentMode();

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => setIsConfirmed(false), 0);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const handleAccept = async () => {
    if (isSubmitting || !isConfirmed) return;
    setIsSubmitting(true);
    try {
      if (isMockMode) {
        setLocalConsentAccepted();
        onAccept();
      } else {
        await consentApi.accept();
        onAccept();
      }
    } catch (error) {
      console.error('Failed to accept consent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isMockMode) {
        clearLocalConsent();
      } else {
        await consentApi.decline().catch((err) => {
          console.error('Failed to save consent decline:', err);
        });
      }
    } finally {
      await authApi.logout();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Non-dismissable overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
        }}
      />

      {/* Modal Dialog */}
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
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-modal-title"
          aria-describedby="consent-modal-desc"
          style={{
            background: cssVar(CSS_VARS.backgroundSecondary),
            border: `1px solid ${cssVar(CSS_VARS.borderLight)}`,
            borderRadius: theme.borderRadius.xl,
            padding: '24px',
            boxShadow: `0px 8px 24px 0px ${cssVar(CSS_VARS.borderLight)}`,
            maxWidth: '520px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            pointerEvents: 'auto',
          }}
        >
          {/* Title - 10px gap below */}
          <h2
            id="consent-modal-title"
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: '28px',
              letterSpacing: '-0.12px',
              color: '#1A202C',
              margin: 0,
              paddingBottom: '10px',
            }}
          >
            Data Storage Consent
          </h2>

          {/* Body text + warning (no gap between) */}
          <div>
            <p
              id="consent-modal-desc"
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '15px',
                lineHeight: '24px',
                color: '#2D3748',
                margin: 0,
              }}
            >
              {BODY_TEXT}
            </p>
            <p
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '15px',
                lineHeight: '24px',
                color: '#F89000',
                fontWeight: 500,
                margin: 0,
                marginTop: '10px',
              }}
            >
              {WARNING_TEXT}
            </p>
          </div>

          {/* Checkbox - 16px gap above from text, 32px gap below to buttons */}
          <label
            className="flex items-center gap-3 cursor-pointer select-none"
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              marginTop: '16px',
              marginBottom: '32px',
            }}
            onClick={() => setIsConfirmed(!isConfirmed)}
          >
            <div
              role="checkbox"
              aria-checked={isConfirmed}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsConfirmed(!isConfirmed);
                }
              }}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                border: `1px solid ${isConfirmed ? theme.colors.primary[500] : '#A0AEC0'}`,
                background: isConfirmed ? theme.colors.primary[500] : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              {isConfirmed && <Check size={10} strokeWidth={3} style={{ color: 'white' }} />}
            </div>
            <span style={{ fontSize: '15px', lineHeight: '24px', color: '#2D3748' }}>
              I understand & consent to the above
            </span>
          </label>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              variant="ghost"
              onClick={handleReject}
              disabled={isSubmitting}
              style={{ color: '#4A5568', backgroundColor: 'transparent', border: 'none' }}
            >
              Reject
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isSubmitting || !isConfirmed}
              className="inline-flex"
              style={{
                padding: '6px 14px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                ...(isConfirmed && !isSubmitting
                  ? {
                      color: 'white',
                      backgroundColor: theme.colors.primary[500],
                      border: `1px solid ${theme.colors.primary[500]}`,
                    }
                  : {
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--Jumbo-200, #CFCFD2)',
                      background: 'var(--Jumbo-100, #E6E6E7)',
                      color: '#71717a',
                    }),
              }}
            >
              <Check size={16} strokeWidth={2.5} style={{ color: 'inherit' }} />
              {isSubmitting ? 'Processing...' : 'Accept'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
