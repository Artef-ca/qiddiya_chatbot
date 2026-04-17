'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { themeColors, themeRadius } from '@/lib/utils/theme';
import { PageTitle } from '@/components/shared';
import { Check, Sun, Moon, Monitor, BadgeCheck } from 'lucide-react';
import { GRADIENT_STYLES } from '@/lib/styles/commonStyles';
import { Button } from '@/components/ui/button';
import { WithdrawConsentModal } from '@/components/consent/WithdrawConsentModal';
import { useConsent } from '@/hooks/useConsent';
import { useAppSelector } from '@/store/hooks';

type Language = 'english' | 'arabic';
type Mode = 'light' | 'system' | 'dark';
type SettingsTab = 'general' | 'data-privacy';

// Saudi Arabia Flag Component
function SaudiArabiaFlag({ className, disabled = false }: { className?: string; disabled?: boolean }) {
  const flagColor = disabled ? '#71717a' : '#006C35'; // Gray when disabled, green when enabled
  const textColor = disabled ? '#9ca3af' : 'white'; // Lighter gray when disabled
  
  return (
    <svg
      width="24"
      height="16"
      viewBox="0 0 24 16"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Background - green when enabled, gray when disabled */}
      <rect x="0" y="0" width="24" height="16" fill={flagColor} rx="2" />
      {/* White/gray Arabic text area - horizontal lines to represent text */}
      <rect x="4" y="5" width="16" height="1.2" fill={textColor} opacity="0.9" />
      <rect x="4" y="7.5" width="16" height="1.2" fill={textColor} opacity="0.9" />
      <rect x="4" y="10" width="16" height="1.2" fill={textColor} opacity="0.9" />
      {/* White/gray sword on the left side */}
      <rect x="1.5" y="2.5" width="1.2" height="11" fill={textColor} opacity="0.95" />
      <rect x="1.2" y="2.5" width="1.8" height="1.5" fill={textColor} opacity="0.95" />
      <path d="M 1.5 2.5 L 2.7 2.5 L 2.1 1.2 Z" fill={textColor} opacity="0.95" />
    </svg>
  );
}

// UK Flag Component
function UKFlag({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="16"
      viewBox="0 0 24 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'block',
        opacity: 0.9,
      }}
    >
      {/* Blue background */}
      <rect width="24" height="16" fill="#012169" />
      {/* White diagonal cross (St. Andrew's Cross) */}
      <path
        d="M 0 0 L 24 16 M 24 0 L 0 16"
        stroke="white"
        strokeWidth="2.5"
      />
      {/* Red diagonal cross (St. Patrick's Cross) */}
      <path
        d="M 0 0 L 24 16 M 24 0 L 0 16"
        stroke="#C8102E"
        strokeWidth="1.5"
      />
      {/* White horizontal and vertical cross (St. George's Cross) */}
      <rect x="10" y="0" width="4" height="16" fill="white" />
      <rect x="0" y="6" width="24" height="4" fill="white" />
      {/* Red horizontal and vertical cross */}
      <rect x="11" y="0" width="2" height="16" fill="#C8102E" />
      <rect x="0" y="7" width="24" height="2" fill="#C8102E" />
    </svg>
  );
}

function formatConsentDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { hasAccepted, consentGrantedAt } = useConsent();
  const { isMobile } = useAppSelector((state) => state.ui);
  // Keep setters for UI button clicks, but the currently rendered UI doesn't need the value.
  // (Avoids lint warnings for unused state values.)
  const [, setSelectedLanguage] = useState<Language>('english');
  const [, setSelectedMode] = useState<Mode>('light');
  const [isWithdrawConsentModalOpen, setIsWithdrawConsentModalOpen] = useState(false);

  const baseHorizontalPadding = 'clamp(16px, calc((100vw - 862px) / 2), 288px)';
  // Sidebar is fixed overlay on desktop:
  // md:left-6 => 24px, md:w-72 => 288px. Add a small buffer to fully clear the overlay.
  // Tune buffer: too much buffer creates an obvious gap (see screenshot).
  // Sidebar overlay footprint on desktop is ~312px (md:left-6 + md:w-72),
  // so reserve slightly less and rely on base padding.
  // Keep Settings anchored horizontally on desktop.
  // Sidebar is a fixed overlay that slides in/out, so padding must not depend on `sidebarOpen`
  // (otherwise the Settings content shifts when closing the sidebar).
  const reservedForSidebar = !isMobile ? 60 : 0;

  return (
    <div
      className={cn('flex flex-col h-full overflow-hidden relative')}
      style={{
        backgroundColor: cssVar(CSS_VARS.gray50),
        paddingTop: '48px',
        paddingLeft: reservedForSidebar
          ? `calc(${baseHorizontalPadding} + ${reservedForSidebar}px)`
          : baseHorizontalPadding,
        // Keep right side unchanged (only left side gets extra space).
        paddingRight: baseHorizontalPadding,
        paddingBottom: '0',
      }}
    >
      {/* Main Content Area with Settings Title and Vertical Tab Menu */}
      <div
        className="flex flex-1 overflow-hidden relative"
        style={{
          minHeight: 0,
        }}
      >
        {/* Left Side - Settings Title and Vertical Tab Menu */}
        <div
          className="flex flex-col shrink-0"
          style={{
            width: '225px',
            paddingLeft: '24px',
            paddingRight: '24px',
            gap: '24px',
          }}
        >
          {/* Settings Title */}
          <div
            style={{
              paddingTop: '0',
            }}
          >
            <PageTitle size="large">Settings</PageTitle>
          </div>

          {/* Vertical Tab Menu - same design as Sidebar navigation */}
          <nav
            className="flex flex-col w-full"
            style={{ gap: '4px' }}
          >
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                'flex items-center justify-start w-full rounded-lg text-sm font-medium transition-colors text-gray-700',
                'focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2',
                activeTab !== 'general' && 'hover:bg-gray-100'
              )}
              style={{
                padding: '10px',
                height: '40px',
                gap: '12px',
                backgroundColor: activeTab === 'general' ? themeColors.gray100() : undefined,
              }}
              onMouseEnter={(e) => {
                if (activeTab === 'general') {
                  e.currentTarget.style.backgroundColor = 'var(--color-secondary-100)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab === 'general') {
                  e.currentTarget.style.backgroundColor = themeColors.gray100();
                }
              }}
            >
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '16px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  color: 'inherit',
                }}
              >
                General
              </span>
            </button>
            <button
              onClick={() => setActiveTab('data-privacy')}
              className={cn(
                'flex items-center justify-start w-full rounded-lg text-sm font-medium transition-colors text-gray-700',
                'focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2',
                activeTab !== 'data-privacy' && 'hover:bg-gray-100'
              )}
              style={{
                padding: '10px',
                height: '40px',
                gap: '12px',
                backgroundColor: activeTab === 'data-privacy' ? themeColors.gray100() : undefined,
              }}
              onMouseEnter={(e) => {
                if (activeTab === 'data-privacy') {
                  e.currentTarget.style.backgroundColor = 'var(--color-secondary-100)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab === 'data-privacy') {
                  e.currentTarget.style.backgroundColor = themeColors.gray100();
                }
              }}
            >
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '16px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  color: 'inherit',
                }}
              >
                Data & Privacy
              </span>
            </button>
          </nav>
        </div>

        {/* Main Content Section */}
        <div
          className="flex flex-col flex-1 overflow-hidden relative"
          style={{
            paddingTop: '0',
            paddingBottom: '0',
            paddingLeft: '32px',
            paddingRight: '32px',
            minHeight: 0,
          }}
        >
          {/* Gradient Reveal Top */}
          <div
            className="pointer-events-none absolute"
            style={{
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
            className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-w-0"
            style={{
              paddingTop: '15px',
              paddingBottom: '48px',
              minHeight: 0,
            }}
          >
            <div
              className="flex flex-col w-full min-w-0"
              style={{
                maxWidth: '694px',
                gap: '40px',
              }}
            >
              {/* General Tab: Language + Mode */}
              {activeTab === 'general' && (
                <>
              {/* Language Section */}
              <div
                className="flex flex-col"
                style={{
                  gap: '12px',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '18px',
                    fontWeight: 700,
                    lineHeight: '24px',
                    letterSpacing: '-0.33px',
                    color: themeColors.gray800(),
                    paddingBottom: '8px',
                  }}
                >
                  Language
                </h2>
                <div
                  className="flex items-center"
                  style={{
                    gap: '8px',
                  }}
                >
                  {/* English Option - Selected */}
                  <button
                    onClick={() => setSelectedLanguage('english')}
                    className={cn(
                      'flex flex-col items-center justify-center transition-all cursor-pointer relative',
                      'hover:opacity-90'
                    )}
                    style={{
                      padding: '12px',
                      gap: '4px',
                      borderRadius: themeRadius.md(),
                      border: `1px solid #c3b2ff`,
                      background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgba(245, 242, 255, 1) 0%, rgba(245, 242, 255, 1) 100%)',
                      boxShadow: '0px 1px 2px 0px #dcd4ff',
                      minWidth: 'auto',
                      minHeight: '82px',
                    }}
                  >
                    {/* Selected Icon - Green Checkmark at bottom, overlapping border */}
                    <div
                      className="absolute"
                      style={{
                        left: '50%',
                        bottom: '0px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '999px',
                        border: `1px solid #c3b2ff`,
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgba(245, 242, 255, 1) 0%, rgba(245, 242, 255, 1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        transform: 'translate(-50%, 50%)',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={8} style={{ color: '#4C9D4A' }} strokeWidth={3} />
                      </div>
                    </div>
                    {/* UK Flag Icon */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '16px',
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '2px',
                        }}
                      >
                        <UKFlag />
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '13px',
                        fontWeight: 700,
                        lineHeight: '24px',
                        letterSpacing: '0.09px',
                        color: themeColors.gray600(),
                        textAlign: 'center',
                        width: '50px',
                      }}
                    >
                      English
                    </span>
                  </button>

                  {/* Arabic Option - Disabled */}
                  <button
                    disabled
                    className={cn(
                      'flex flex-col items-center justify-center transition-all cursor-not-allowed relative'
                    )}
                    style={{
                      padding: '12px',
                      gap: '4px',
                      borderRadius: themeRadius.md(),
                      border: `1px solid #e6e6e7`,
                      background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgba(245, 245, 246, 1) 0%, rgba(245, 245, 246, 1) 100%)',
                      minWidth: 'auto',
                      minHeight: '82px',
                    }}
                  >
                    {/* Arabic Flag Icon - Saudi Arabia flag with grayscale filter for disabled state */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '16px',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '2px',
                        }}
                      >
                        <SaudiArabiaFlag disabled={true} />
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '13px',
                        fontWeight: 700,
                        lineHeight: '24px',
                        letterSpacing: '0.09px',
                        color: '#71717a',
                        textAlign: 'center',
                        width: '50px',
                      }}
                    >
                      Arabic
                    </span>
                  </button>
                </div>
              </div>

              {/* Mode Section */}
              <div
                className="flex flex-col"
                style={{
                  gap: '12px',
                  marginTop: '24px',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '18px',
                    fontWeight: 700,
                    lineHeight: '24px',
                    letterSpacing: '-0.33px',
                    color: themeColors.gray800(),
                    paddingBottom: '8px',
                  }}
                >
                  Mode
                </h2>
                <div
                  className="flex items-center"
                  style={{
                    gap: '8px',
                  }}
                >
                  {/* Light Option - Selected */}
                  <button
                    onClick={() => setSelectedMode('light')}
                    className={cn(
                      'flex flex-col items-center justify-center transition-all cursor-pointer relative',
                      'hover:opacity-90'
                    )}
                    style={{
                      padding: '12px',
                      gap: '4px',
                      borderRadius: themeRadius.md(),
                      border: `1px solid #c3b2ff`,
                      background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgba(245, 242, 255, 1) 0%, rgba(245, 242, 255, 1) 100%)',
                      boxShadow: '0px 1px 2px 0px #dcd4ff',
                      minWidth: 'auto',
                      minHeight: '82px',
                    }}
                  >
                    {/* Selected Icon - Green Checkmark at bottom, overlapping border */}
                    <div
                      className="absolute"
                      style={{
                        left: '50%',
                        bottom: '0px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '999px',
                        border: `1px solid #c3b2ff`,
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgba(245, 242, 255, 1) 0%, rgba(245, 242, 255, 1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        transform: 'translate(-50%, 50%)',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={8} style={{ color: '#4C9D4A' }} strokeWidth={3} />
                      </div>
                    </div>
                    <Sun
                      size={24}
                      style={{
                        color: themeColors.gray700(),
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '13px',
                        fontWeight: 700,
                        lineHeight: '24px',
                        letterSpacing: '0.09px',
                        color: themeColors.gray600(),
                        textAlign: 'center',
                        width: '50px',
                      }}
                    >
                      Light
                    </span>
                  </button>

                  {/* System Option - Disabled */}
                  <button
                    disabled
                    className={cn(
                      'flex flex-col items-center justify-center transition-all cursor-not-allowed relative',
                      'opacity-60'
                    )}
                    style={{
                      padding: '12px',
                      gap: '4px',
                      borderRadius: themeRadius.md(),
                      border: `1px solid #e6e6e7`,
                      background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgba(245, 245, 246, 1) 0%, rgba(245, 245, 246, 1) 100%)',
                      minWidth: 'auto',
                      minHeight: '82px',
                    }}
                  >
                    <Monitor
                      size={24}
                      style={{
                        color: '#71717a',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '13px',
                        fontWeight: 700,
                        lineHeight: '24px',
                        letterSpacing: '0.09px',
                        color: '#71717a',
                        textAlign: 'center',
                        width: '50px',
                      }}
                    >
                      System
                    </span>
                  </button>

                  {/* Dark Option - Disabled */}
                  <button
                    disabled
                    className={cn(
                      'flex flex-col items-center justify-center transition-all cursor-not-allowed relative',
                      'opacity-60'
                    )}
                    style={{
                      padding: '12px',
                      gap: '4px',
                      borderRadius: themeRadius.md(),
                      border: `1px solid #e6e6e7`,
                      background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgba(245, 245, 246, 1) 0%, rgba(245, 245, 246, 1) 100%)',
                      minWidth: 'auto',
                      minHeight: '82px',
                    }}
                  >
                    <Moon
                      size={24}
                      style={{
                        color: '#71717a',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '13px',
                        fontWeight: 700,
                        lineHeight: '24px',
                        letterSpacing: '0.09px',
                        color: '#71717a',
                        textAlign: 'center',
                        width: '50px',
                      }}
                    >
                      Dark
                    </span>
                  </button>
                </div>
              </div>
                </>
              )}

              {/* Data & Privacy Tab - Figma design */}
              {activeTab === 'data-privacy' && (
                <div
                  className="flex flex-col"
                  style={{
                    gap: '24px',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '18px',
                      fontWeight: 700,
                      lineHeight: '24px',
                      letterSpacing: '-0.33px',
                      color: '#2D3748',
                      margin: 0,
                    }}
                  >
                    Data Storage Consent
                  </h2>

                  {/* Consent status pill - design spec, responsive */}
                  {hasAccepted && (
                    <div
                      className="inline-flex items-center w-fit max-w-full min-w-0"
                      style={{
                        display: 'flex',
                        minHeight: '24px',
                        padding: '4px 6px 4px 6px',
                        alignItems: 'center',
                        gap: '3px',
                        borderRadius: '4px',
                        border: '1px solid #CCE8CA',
                        background: '#F4FAF3',
                      }}
                    >
                      <BadgeCheck
                        className="shrink-0"
                        width={12}
                        height={12}
                        strokeWidth={2}
                        style={{ color: '#4C9D4A' }}
                      />
                      <span
                        className="min-w-0 truncate"
                        style={{
                          fontFamily: 'Manrope, var(--font-manrope)',
                          fontSize: '10px',
                          fontWeight: 600,
                          fontStyle: 'normal',
                          lineHeight: '16px',
                          letterSpacing: '0.18px',
                          color: '#4C9D4A',
                        }}
                      >
                        Consent granted on {consentGrantedAt ? formatConsentDateTime(consentGrantedAt) : '—'}
                      </span>
                    </div>
                  )}

                  {/* Consent description */}
                  <p
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '15px',
                      lineHeight: '24px',
                      color: '#4A5568',
                      margin: 0,
                    }}
                  >
                    You have agreed to the storage of your conversations and provided data for retrieval and internal analysis. This enables chat history, saved boards, groups, and personalized features.
                  </p>

                  {/* Withdraw Consent box */}
                  <div
                    className="flex flex-col rounded-lg"
                    style={{
                      gap: '16px',
                      padding: '24px',
                      border: '1px solid #BEE3F8',
                      backgroundColor: '#E6F6FD',
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '16px',
                        fontWeight: 700,
                        lineHeight: '24px',
                        color: '#2D3748',
                        margin: 0,
                      }}
                    >
                      Withdraw Consent
                    </h3>
                    <p
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '15px',
                        lineHeight: '24px',
                        color: '#4A5568',
                        margin: 0,
                      }}
                    >
                      You can withdraw your consent at any time. Withdrawing will permanently delete your existing chat history, saved boards, and groups, and you will no longer be able to access this platform.
                    </p>
                    <Button
                      onClick={() => setIsWithdrawConsentModalOpen(true)}
                      className="self-end hover:bg-red-600 cursor-pointer"
                      style={{
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      Withdraw Consent
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gradient Reveal Bottom */}
          <div
            className="pointer-events-none absolute"
            style={{
              bottom: 0,
              left: 0,
              right: 0,
              height: '48px',
              zIndex: 10,
              ...GRADIENT_STYLES.bottomGradient,
            }}
          />
        </div>
      </div>

      {/* Withdraw Consent Warning Modal */}
      <WithdrawConsentModal
        isOpen={isWithdrawConsentModalOpen}
        onClose={() => setIsWithdrawConsentModalOpen(false)}
      />
    </div>
  );
}
