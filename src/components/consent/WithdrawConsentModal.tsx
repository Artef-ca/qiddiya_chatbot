'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { consentApi } from '@/lib/api';
import { authApi } from '@/lib/api/auth';
import { clearLocalConsent, isMockConsentMode } from '@/hooks/useConsent';
import { theme } from '@/lib/theme';

const CONSEQUENCES = [
  'Delete all your saved conversations',
  'Remove your boards and groups',
  'Sign you out of the platform',
];

const RED_WARNING =
  'This cannot be undone. You can re-grant consent at any time by accepting the data storage agreement on your next login.';

interface WithdrawConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Warning modal for withdrawing consent in Settings (Figma 1212-8450).
 * On confirm: deletes all user data, withdraws consent, logs out.
 * Local mode: clears localStorage only. Prod: calls API to delete DB data.
 */
export function WithdrawConsentModal({ isOpen, onClose }: WithdrawConsentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const isMockMode = isMockConsentMode();

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => setIsConfirmed(false), 0);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isSubmitting || !isConfirmed) return;
    setIsSubmitting(true);
    try {
      await consentApi.withdraw();
      if (isMockMode) clearLocalConsent();
      await authApi.logout();
      onClose();
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="480px" variant="default" contentPadding="24px">
      <div className="flex flex-col" style={{ gap: '32px' }}>
        <div className="flex flex-col">
          {/* Title */}
          <h3
            id="modal-title"
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '18px',
              fontWeight: 700,
              lineHeight: '24px',
              letterSpacing: '-0.12px',
              color: '#1A202C',
              margin: 0,
              paddingBottom: '8px',
            }}
          >
            Withdraw Data Consent
          </h3>
          {/* Intro + list (no gap between them) */}
          <div>
            <p
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '15px',
                lineHeight: '24px',
                color: '#2D3748',
                margin: 0,
              }}
            >
              This action is permanent. Withdrawing your consent will:
            </p>
            <ul
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '15px',
                lineHeight: '24px',
                color: '#2D3748',
                margin: 0,
                marginTop: '4px',
                paddingLeft: '24px',
                listStyleType: 'disc',
                listStylePosition: 'outside',
              }}
            >
              {CONSEQUENCES.map((item) => (
                <li key={item} style={{ marginBottom: '2px' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Red warning */}
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '15px',
              lineHeight: '24px',
              color: '#EF4444',
              fontWeight: 500,
              margin: 0,
              marginTop: '16px',
            }}
          >
            {RED_WARNING}
          </p>
          {/* Checkbox */}
          <label
            className="flex items-center gap-3 cursor-pointer select-none"
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              marginTop: '16px',
              marginBottom: 0,
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
            <span
              style={{
                fontSize: '15px',
                lineHeight: '24px',
                color: '#2D3748',
              }}
            >
              I understand this will permanently delete my data
            </span>
          </label>
        </div>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="cursor-pointer disabled:cursor-not-allowed"
            style={{
              color: '#4A5568',
              backgroundColor: 'transparent',
              border: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || !isConfirmed}
            className="inline-flex cursor-pointer disabled:cursor-not-allowed"
            style={{
              padding: '6px 14px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              ...(isConfirmed && !isSubmitting
                ? { color: 'white', backgroundColor: '#EF4444', border: '1px solid #EF4444' }
                : {
                    borderRadius: 'var(--radius-sm, 6px)',
                    border: '1px solid var(--Jumbo-200, #CFCFD2)',
                    background: 'var(--Jumbo-100, #E6E6E7)',
                    color: '#71717a',
                  }),
            }}
          >
            <Check size={16} strokeWidth={2.5} style={{ color: 'inherit' }} />
            {isSubmitting ? 'Processing...' : 'Withdraw Consent'}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
