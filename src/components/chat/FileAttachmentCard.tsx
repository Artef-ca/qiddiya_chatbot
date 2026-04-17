'use client';

import { X, File, FileText, Image, FileSpreadsheet, FileCode, FileVideo, FileAudio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileAttachment } from '@/types';

interface FileAttachmentCardProps {
  attachment: FileAttachment;
  onRemove?: (id: string) => void;
  showRemove?: boolean;
}

function FileIcon({ type, name }: { type: string; name: string }) {
  const iconStyle = {
    width: '16px',
    height: '16px',
    aspectRatio: '1/1' as const,
    color: 'var(--Lynch-500, #64748B)'
  };

  if (type.startsWith('image/')) return <Image style={iconStyle} aria-hidden="true" />;
  if (type.startsWith('video/')) return <FileVideo style={iconStyle} aria-hidden="true" />;
  if (type.startsWith('audio/')) return <FileAudio style={iconStyle} aria-hidden="true" />;
  if (type.includes('spreadsheet') || type.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return <FileSpreadsheet style={iconStyle} aria-hidden="true" />;
  }
  if (type.includes('pdf') || name.endsWith('.pdf')) return <FileText style={iconStyle} aria-hidden="true" />;
  if (type.includes('text') || type.includes('code') || name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json)$/)) {
    return <FileCode style={iconStyle} aria-hidden="true" />;
  }
  return <File style={iconStyle} aria-hidden="true" />;
}

export default function FileAttachmentCard({ 
  attachment, 
  onRemove, 
  showRemove = true 
}: FileAttachmentCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded border',
        'transition-colors'
      )}
      style={{
        display: 'flex',
        padding: '4px 4px 4px 8px',
        alignItems: 'center',
        height: '32px',
        maxWidth: '162px',
        borderRadius: '4px',
        border: '1px solid var(--Lynch-200, #D5D9E2)',
        background: 'var(--Lynch-100, #ECEEF2)',
      }}
    >
      <div className="shrink-0">
        <FileIcon type={attachment.type} name={attachment.name} />
      </div>
      <div 
        className="min-w-0"
        style={{
          flex: '1 1 0',
          minWidth: 0,
          overflow: 'hidden',
          color: 'var(--Lynch-600, #526077)',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'Manrope',
          fontSize: '13px',
          fontStyle: 'normal',
          fontWeight: 600,
          lineHeight: '24px',
          letterSpacing: '0.09px',
        }}
        title={attachment.name}
      >
        {attachment.name}
      </div>
      {showRemove && onRemove && (
        <button
          onClick={() => onRemove(attachment.id)}
          className="shrink-0 p-0.5 hover:bg-gray-100 rounded transition-colors"
          aria-label={`Remove ${attachment.name}`}
          title="Remove"
        >
          <X 
            className="h-3 w-3" 
            style={{ color: 'var(--Lynch-600, #526077)' }}
          />
        </button>
      )}
    </div>
  );
}

