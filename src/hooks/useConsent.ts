import { useQuery } from '@tanstack/react-query';
import { consentApi } from '@/lib/api';

export type ConsentStatus = 'accept' | 'decline' | null;

const LOCAL_CONSENT_KEY = 'data_consent_accepted';
const LOCAL_CONSENT_DATE_KEY = 'data_consent_date';

/** Local mode: read consent from localStorage (no API call) */
function getLocalConsent(): { consent: 'accept' | null; needsConsent: boolean; createdAt?: string } {
  if (typeof window === 'undefined') {
    return { consent: null, needsConsent: true };
  }
  const accepted = localStorage.getItem(LOCAL_CONSENT_KEY) === 'true';
  const dateStr = localStorage.getItem(LOCAL_CONSENT_DATE_KEY);
  return {
    consent: accepted ? 'accept' : null,
    needsConsent: !accepted,
    createdAt: accepted && dateStr ? dateStr : undefined,
  };
}

export function isMockConsentMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
}

/** Set local consent (local mode only) - call after user accepts */
export function setLocalConsentAccepted(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_CONSENT_KEY, 'true');
    localStorage.setItem(LOCAL_CONSENT_DATE_KEY, new Date().toISOString());
  }
}

/** Clear local consent (local mode only) - call when user declines */
export function clearLocalConsent(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_CONSENT_KEY);
    localStorage.removeItem(LOCAL_CONSENT_DATE_KEY);
  }
}

export function useConsent() {
  const isMock = isMockConsentMode();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['consent', isMock],
    queryFn: async () => {
      // Local/mock: use localStorage only, no API
      if (isMock) {
        return getLocalConsent();
      }
      // Prod/deployed: call API
      return consentApi.get();
    },
    retry: false,
    throwOnError: false,
  });

  const consent = data?.consent ?? null;
  const needsConsent = data?.needsConsent ?? true;

  /** Show consent popup when: declined OR not in table (null) */
  const shouldShowConsentPopup = consent === 'decline' || consent === null;

  /** User has accepted - normal flow */
  const hasAccepted = consent === 'accept';

  const consentGrantedAt = data?.createdAt ? new Date(data.createdAt) : null;

  return {
    consent,
    needsConsent,
    shouldShowConsentPopup,
    hasAccepted,
    consentGrantedAt,
    isLoading,
    error,
    refetch,
  };
}
