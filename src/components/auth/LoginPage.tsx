'use client';

import Image from 'next/image';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/auth';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';

// Asset URLs
const QIDDIYA_LOGO_URL = '/Qiddiya-logo.png';

// QAIC Logo Component - SVG from Figma
function QaicLogo({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)} data-name="QAIC-Logo">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="180"
        height="168"
        viewBox="0 0 180 168"
        fill="none"
        className="h-full w-full"
      >
        <g clipPath="url(#clip0_1113_55599)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M64.9257 0L64.9261 13.714C36.4795 14.64 15.3029 37.1969 15.3029 66.3736C15.3029 96.0248 36.9161 119.208 66.9126 119.373C95.9896 119.55 117.482 95.2595 118.341 68.2097L134.006 68.211C133.45 91.9548 121.166 111.916 102.901 123.242C118.704 141.592 138.544 155.436 162.74 155.436C164.228 155.436 165.809 155.405 167.476 155.349L170.042 155.245C170.481 155.225 170.924 155.203 171.373 155.18L174.128 155.026L177.004 154.844L179.998 154.637C180.125 161.414 175.133 167.201 168.359 167.682C165.786 167.846 163.358 168 160.949 168C132.089 168 108.539 151.921 90.6353 129.046C82.9896 131.841 74.9084 133.259 66.7672 133.234C29.1964 133.234 0 104.573 0 66.528C0 28.9772 29.0089 0.929077 64.9257 0Z"
            fill="#233B7C"
          />
          <path
            d="M81.0953 15.5379L85.374 2.37443C80.4334 1.05942 75.2535 0.264991 69.9018 0.0415039L69.8994 13.7693C73.7937 13.9801 77.5365 14.5813 81.0953 15.5379Z"
            fill="#0EB1E3"
          />
          <path
            d="M95.9317 22.2384L104.328 10.6894C99.9469 7.88108 95.1942 5.57571 90.15 3.83252L85.846 17.0649C89.4457 18.4193 92.8206 20.1579 95.9317 22.2384Z"
            fill="#4F9F45"
          />
          <path
            d="M107.718 33.3648L119.795 24.5987C116.477 20.4484 112.658 16.7418 108.424 13.5425L99.9335 25.2225C102.828 27.6217 105.436 30.3502 107.718 33.3648Z"
            fill="#F4B11E"
          />
          <path
            d="M115.262 47.5533L129.964 42.7821C128.122 37.6931 125.692 32.9514 122.755 28.6171L110.529 37.4921C112.434 40.6132 114.023 43.9796 115.262 47.5533Z"
            fill="#F26B20"
          />
          <path
            d="M118.28 63.2211L133.952 63.2202C133.71 57.7362 132.865 52.4914 131.483 47.5348L116.678 52.3387C117.536 55.8124 118.08 59.4499 118.28 63.2211Z"
            fill="#CF4B9B"
          />
          <path
            d="M151.52 32.1966C151.325 31.4412 150.931 30.7519 150.379 30.2003C149.827 29.6486 149.137 29.2549 148.381 29.0601L134.98 25.6071C134.751 25.5423 134.55 25.4047 134.407 25.2152C134.264 25.0257 134.186 24.7947 134.186 24.5572C134.186 24.3198 134.264 24.0888 134.407 23.8993C134.55 23.7098 134.751 23.5722 134.98 23.5074L148.381 20.0522C149.137 19.8576 149.827 19.4642 150.379 18.913C150.931 18.3618 151.325 17.6729 151.52 16.9179L154.976 3.52732C155.04 3.29796 155.178 3.0959 155.368 2.95196C155.557 2.80802 155.789 2.7301 156.028 2.7301C156.266 2.7301 156.498 2.80802 156.688 2.95196C156.878 3.0959 157.015 3.29796 157.079 3.52732L160.533 16.9179C160.728 17.6733 161.122 18.3626 161.674 18.9142C162.226 19.4658 162.916 19.8596 163.672 20.0544L177.073 23.5052C177.303 23.5687 177.507 23.706 177.651 23.8961C177.796 24.0861 177.875 24.3184 177.875 24.5572C177.875 24.7961 177.796 25.0284 177.651 25.2184C177.507 25.4085 177.303 25.5458 177.073 25.6093L163.672 29.0601C162.916 29.2549 162.226 29.6486 161.674 30.2003C161.122 30.7519 160.728 31.4412 160.533 32.1966L157.077 45.5872C157.013 45.8165 156.875 46.0186 156.686 46.1625C156.496 46.3065 156.264 46.3844 156.025 46.3844C155.787 46.3844 155.555 46.3065 155.365 46.1625C155.175 46.0186 155.038 45.8165 154.974 45.5872L151.52 32.1966Z"
            fill="#0093D4"
          />
        </g>
        <defs>
          <clipPath id="clip0_1113_55599">
            <rect width="180" height="168" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check if coming from successful authentication
  const authSuccess = searchParams.get('auth') === 'success';

  // Derive error message from URL params (no setState in effect)
  const errorParam = searchParams.get('error');
  const errorMessages: Record<string, string> = {
    authentication_failed: 'Authentication failed. Please try again.',
    missing_user_data: 'Unable to retrieve user information. Please contact support.',
    session_creation_failed: 'Failed to create session. Please try again.',
    callback_error: 'An error occurred during authentication. Please try again.',
  };
  const error = errorParam ? (errorMessages[errorParam] || 'An error occurred. Please try again.') : null;

  // Check if user is already authenticated
  useEffect(() => {
    // Small delay to ensure cookies are available after redirect
    const checkSession = async () => {
      try {
        // If coming from successful auth, wait longer for cookie to be available
        const initialDelay = authSuccess ? 300 : 100;
        await new Promise(resolve => setTimeout(resolve, initialDelay));
        
        // Try multiple times if needed (for redirect scenarios)
        let attempts = 0;
        const maxAttempts = authSuccess ? 5 : 3; // More attempts if coming from auth
        
        while (attempts < maxAttempts) {
          const session = await authApi.getSession();
          if (session?.authenticated) {
            setIsCheckingSession(false);
            // Remove auth param from URL and redirect
            router.replace('/'); // Use replace instead of push to avoid adding to history
            return;
          }
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
        
        setIsCheckingSession(false);
      } catch {
        setIsCheckingSession(false);
      }
    };
    
    checkSession();
  }, [router, authSuccess]);

  const handleLogin = () => {
    setIsLoading(true);
    authApi.login();
  };

  // Show loading state while checking session to prevent flash
  if (isCheckingSession || isLoading) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-[var(--color-gray-50)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size={26} text="Authenticating..." />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-[var(--color-gray-50)]">
      {/* Coloured Blurred Background — full viewport height, capped width on large screens */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[min(100%,720px)] -translate-x-1/2 overflow-hidden border-x-2 border-[var(--color-gray-100)] backdrop-blur-[6px] backdrop-filter">
        <div className="absolute left-1/2 top-1/2 h-[1080px] w-[1920px] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[rgba(246,247,249,0.4)]">
          {/* Background Gradient with multiple blurred layers */}
          <div className="absolute left-0 top-0 h-[1080px] w-[1920px] opacity-20 blur-[111px] filter">
            {/* Gradient Layer 1 - Purple (rotated) */}
            <div className="absolute -left-[102.66px] -top-[1177.14px] flex h-[2030.507px] w-[1670.645px] items-center justify-center mix-blend-hard-light">
              <div className="rotate-[188.61deg]">
                <div className="relative h-[1840px] w-[1411.098px]">
                  <div
                    className="absolute inset-0"
                    style={{ '--fill-0': 'rgba(166, 134, 255, 1)' } as React.CSSProperties}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'radial-gradient(ellipse 70% 70% at center, rgba(166, 134, 255, 1) 0%, transparent 70%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gradient Layer 2 - Cyan */}
            <div className="absolute left-[845.01px] top-[104.01px] h-[2302px] w-[1264.884px] mix-blend-hard-light">
              <div
                className="absolute inset-0"
                style={{ '--fill-0': 'rgba(11, 192, 255, 1)' } as React.CSSProperties}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse 70% 70% at center, rgba(11, 192, 255, 1) 0%, transparent 70%)',
                  }}
                />
              </div>
            </div>

            {/* Gradient Layer 3 - Blue (rotated) */}
            <div className="absolute -left-[437.2px] -top-[28.47px] flex h-[1839.887px] w-[1715.671px] items-center justify-center mix-blend-hard-light">
              <div className="rotate-[31.742deg]">
                <div className="relative h-[1483px] w-[1100px]">
                  <div
                    className="absolute inset-0"
                    style={{ '--fill-0': 'rgba(62, 143, 255, 1)' } as React.CSSProperties}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'radial-gradient(ellipse 70% 70% at center, rgba(62, 143, 255, 1) 0%, transparent 70%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gradient Layer 4 - Pink */}
            <div className="absolute left-[645.69px] top-[622.02px] h-[1244.355px] w-[1891.779px] mix-blend-hard-light">
              <div
                className="absolute inset-0"
                style={{ '--fill-0': 'rgba(255, 88, 216, 1)' } as React.CSSProperties}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse 70% 70% at center, rgba(255, 88, 216, 1) 0%, transparent 70%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-dvh flex-1 flex-col items-center overflow-y-auto px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-12 md:pt-16">
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 sm:gap-8">
          <div className="relative h-14 w-[72px] shrink-0 sm:h-[76px] sm:w-20">
            <Image
              src={QIDDIYA_LOGO_URL}
              alt="Qiddiya Logo"
              width={80}
              height={76}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <QaicLogo className="aspect-[15/14] w-[min(180px,52vw)] max-w-[180px] shrink-0 sm:w-[180px]" />

          <p className="text-center text-headline-medium font-medium leading-8 tracking-[-0.27px] text-[var(--color-gray-700)] sm:leading-[32px]">
            Welcome to QAIC
          </p>

          <div className="flex w-full flex-col items-center gap-2">
            {error && (
              <div className="mb-1 max-w-full rounded-md bg-red-50 px-4 py-2 text-center text-sm text-red-600">
                {error}
              </div>
            )}
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className={cn(
                'inline-flex h-auto shrink-0 items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-primary-600)] bg-[var(--color-primary-600)] px-[14px] py-[6px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition-colors hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50',
                'text-small font-bold leading-[24px] tracking-[0.0897px] text-[var(--color-primary-50)]'
              )}
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              <span>{isLoading ? 'Redirecting...' : 'Login'}</span>
            </Button>
          </div>
        </div>

        <p className="mt-auto shrink-0 pt-8 text-center text-base font-medium leading-6 text-[var(--color-gray-600)] sm:pt-10">
          <span>Powered by </span>
          <span className="font-semibold">Data Office</span>
        </p>
      </div>
    </div>
  );
}
