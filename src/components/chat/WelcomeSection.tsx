'use client';

import Image from 'next/image';
import ChatInput from './ChatInput';
import { useWelcomePrompts } from '@/hooks/useWelcomePrompts';
import { useUserProfile } from '@/hooks/useUserProfile';

interface WelcomeSectionProps {
  onPromptClick: (prompt: string) => void;
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  isPro?: boolean;
  onIsProChange?: (isPro: boolean) => void;
}

export default function WelcomeSection({ onPromptClick, onSendMessage, isLoading = false, isPro, onIsProChange }: WelcomeSectionProps) {
  const { greeting, subtitle, prompts: suggestedPrompts } = useWelcomePrompts();
  const { user, error: userError, isLoading: isLoadingUser } = useUserProfile();
  
  // Prioritize user's first name from session over API greeting
  // If user profile API fails or user is not authenticated, show "Hey there" instead of the greeting from welcome prompts
  // Only use the greeting from welcome prompts if we're still loading and haven't gotten an error yet
  // Use firstName (or name for backward compatibility) - not fullName
  const firstName = user?.firstName || user?.name;
  const displayGreeting = firstName 
    ? `Hey ${firstName}` 
    : (userError || (!isLoadingUser && !user) ? 'Hey There' : (greeting || 'Hey There'));
  
  return (
    <div className="flex h-full flex-col items-center justify-between px-4" style={{ paddingTop: '60px', paddingBottom: '40px', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div className="w-full space-y-6 flex flex-col" style={{ width: '100%', maxWidth: '800px', flex: '1 0 auto' }}>
        {/* Logo */}
        <div 
          style={{
            display: 'flex',
            width: '100px',
            height: '95px',
            padding: '0 0.016px 0.385px 0',
            justifyContent: 'center',
            alignItems: 'center',
            aspectRatio: '20/19',
            marginBottom: '40px',
          }}
        >
          <Image
            src="/Qiddiya-logo.png"
            alt="Qiddiya Logo"
            width={100}
            height={95}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Greeting */}
        <div className="space-y-3 text-left">
          <h1 
            style={{
              color: 'var(--Lynch-900, #343A46)',
              fontFamily: 'Manrope',
              fontSize: '44px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '48px',
              letterSpacing: '-1.051px',
            }}
          >
            {displayGreeting}
          </h1>
          <p 
            style={{
              color: 'var(--Lynch-900, #343A46)',
              fontFamily: 'Manrope',
              fontSize: '28px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '36px',
              letterSpacing: '-0.48px',
            }}
          >
            {subtitle || 'Where should we start?'}
          </p>
        </div>

        {/* Prompt Cards */}
        <div className="flex flex-wrap gap-4 md:grid md:grid-cols-2 md:justify-items-start lg:flex lg:flex-wrap">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => onPromptClick(prompt.text)}
              className="focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 transition-all duration-200 md:max-w-[200px] lg:max-w-[231px]"
              style={{
                display: 'flex',
                maxWidth: '231px',
                padding: '20px 16px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '32px',
                flex: '1 0 0',
                borderRadius: '12px',
                border: '1px solid var(--Lucky-Point-100, #CFEBFF)',
                background: 'rgba(228, 245, 255, 0.40)',
                boxShadow: '0 1px 4px 0 var(--Lynch-100, #ECEEF2)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const textElement = e.currentTarget.querySelector('p');
                if (textElement) {
                  textElement.style.opacity = '1';
                }
                e.currentTarget.style.boxShadow = '0 8px 16px 0 var(--Lynch-100, #ECEEF2)';
              }}
              onMouseLeave={(e) => {
                const textElement = e.currentTarget.querySelector('p');
                if (textElement) {
                  textElement.style.opacity = '0.8';
                }
                e.currentTarget.style.boxShadow = '0 1px 4px 0 var(--Lynch-100, #ECEEF2)';
              }}
            >
              <p 
                style={{ 
                  alignSelf: 'stretch',
                  color: 'var(--Picton-Blue-800, #00628D)',
                  fontFamily: 'Manrope',
                  fontSize: '14px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '22px',
                  opacity: 0.8,
                  textAlign: 'start',
                }}
              >
                {prompt.text}
              </p>
            </button>
          ))}
        </div>

        {/* Chat Input in Center */}
        <div className="mt-8 w-full">
          <ChatInput
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            noPadding={true}
            isPro={isPro}
            onIsProChange={onIsProChange}
          />
        </div>
      </div>

      {/* Powered by Data Office - Always at bottom */}
      <p 
        style={{
          color: 'var(--Lynch-600, #526077)',
          fontFamily: 'Manrope',
          fontSize: '14px',
          fontStyle: 'normal',
          fontWeight: 500,
          lineHeight: '22px',
          textAlign: 'center',
          margin: 0,
          marginTop: 'auto',
          width: '100%',
          paddingTop: '32px',
          paddingBottom: '16px',
          flexShrink: 0,
        }}
      >
        <span>Powered by </span>
        <span style={{ fontWeight: 600 }}>Data Office</span>
      </p>
    </div>
  );
}

