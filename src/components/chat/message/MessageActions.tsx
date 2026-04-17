'use client';

import { 
  Flag, 
  ThumbsDown, 
  RotateCcw, 
  Volume2, 
  VolumeOff,
  Share2, 
  Copy, 
  Pin,
  PinOff,
  Check
} from 'lucide-react';

interface MessageActionsProps {
  onReportIssue: () => void;
  onDislike: () => void;
  onRegenerate: () => void;
  isRegenerateEnabled?: boolean;
  onReadAloud: () => void;
  onShare: () => void;
  onCopy: () => void;
  onPin: () => void;
  isFlagged: boolean;
  isDisliked: boolean;
  isMuted: boolean;
  isPinned: boolean;
  copied: boolean;
}

function ActionButton({
  onClick,
  disabled,
  className,
  ariaLabel,
  title,
  ariaPressed,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className: string;
  ariaLabel: string;
  title: string;
  ariaPressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      title={title}
      aria-pressed={ariaPressed}
    >
      {children}
    </button>
  );
}

export function MessageActions({
  onReportIssue,
  onDislike,
  onRegenerate,
  isRegenerateEnabled = true,
  onReadAloud,
  onShare,
  onCopy,
  onPin,
  isFlagged,
  isDisliked,
  isMuted,
  isPinned,
  copied,
}: MessageActionsProps) {
  return (
    <div className="flex items-center justify-between pt-2 mt-2">
      {/* Left side actions */}
      <div className="flex items-center gap-1">
        <ActionButton
          onClick={onReportIssue}
          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          ariaLabel="Report issue"
          title="Report issue"
          ariaPressed={isFlagged}
        >
          <Flag 
            className="h-4 w-4" 
            style={{ color: isFlagged ? 'var(--color-error, #E8604B)' : 'inherit' }}
          />
        </ActionButton>
        <ActionButton
          onClick={onDislike}
          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          ariaLabel="Dislike"
          title="Dislike"
          ariaPressed={isDisliked}
        >
          <ThumbsDown 
            className="h-4 w-4" 
            style={{ color: isDisliked ? 'var(--color-error, #E8604B)' : 'inherit' }}
          />
        </ActionButton>
        <ActionButton
          onClick={onRegenerate}
          disabled={!isRegenerateEnabled}
          className={`p-2 rounded transition-colors ${isRegenerateEnabled ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'cursor-not-allowed opacity-30 grayscale'}`}
          ariaLabel={isRegenerateEnabled ? 'Regenerate' : 'Regenerate (disabled)'}
          title={isRegenerateEnabled ? 'Regenerate' : 'Regenerate (disabled - new query in progress)'}
        >
          <RotateCcw className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          onClick={onReadAloud}
          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          ariaLabel={isMuted ? 'Read aloud' : 'Stop reading'}
          title={isMuted ? 'Read aloud' : 'Stop reading'}
        >
          {isMuted ? (
            <Volume2 
              className="h-4 w-4"
              style={{ color: 'inherit' }}
            />
          ) : (
            <VolumeOff
              className="h-4 w-4" 
              style={{ color: '#0093D4' }}
            />
          )}
        </ActionButton>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <ActionButton
          onClick={onShare}
          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          ariaLabel="Share & export"
          title="Share & export"
        >
          <Share2 className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          onClick={onCopy}
          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          ariaLabel="Copy chat"
          title="Copy chat"
        >
          {copied ? (
            <Check 
              className="h-4 w-4" 
              style={{ color: 'var(--color-secondary-600)' }}
            />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </ActionButton>
        <ActionButton
          onClick={onPin}
          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          ariaLabel={isPinned ? 'Unpin reply' : 'Pin reply'}
          title={isPinned ? 'Unpin reply' : 'Pin reply'}
        >
          {isPinned ? (
            <PinOff 
              className="h-4 w-4" 
              style={{ color: 'var(--color-secondary-600)' }}
            />
          ) : (
            <Pin className="h-4 w-4" />
          )}
        </ActionButton>
      </div>
    </div>
  );
}

