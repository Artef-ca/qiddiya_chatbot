'use client';

import { AlertTriangle } from 'lucide-react';
import type { MarkdownParagraphProps } from '../types';
import { extractText, isWarningHeader, isSuggestionHeader, isRegularHeader } from '../utils';
import { getBotTextStyle, getHeaderStyle } from '../styles';

interface ParagraphComponentProps extends MarkdownParagraphProps {
  isBotResponse: boolean;
}

export function Paragraph({ children, isBotResponse = false }: ParagraphComponentProps) {
  const textContent = extractText(children);
  const warningHeader = isWarningHeader(textContent);
  const suggestionHeader = isSuggestionHeader(textContent);
  const regularHeader = isRegularHeader(textContent);
  const headerStyle = getHeaderStyle(isBotResponse);
  const botTextStyle = getBotTextStyle(isBotResponse);

  if (warningHeader) {
    return (
      <p className="mb-2 last:mb-0" style={{
        ...headerStyle,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontWeight: 600
      }}>
        <AlertTriangle 
          size={20}
          style={{
            color: '#F59E0B',
            flexShrink: 0,
            marginTop: '2px'
          }}
        />
        <span style={{ fontWeight: 600 }}>{children}</span>
      </p>
    );
  }
  
  if (suggestionHeader) {
    return (
      <p className="last:mb-0" style={{
        color: 'var(--Picton-Blue-800, #00628D)',
        fontFamily: 'Manrope',
        fontSize: '14px',
        padding: '20px 0 12px 0',
        marginTop: '8px',
        fontStyle: 'normal',
        fontWeight: 600,
        lineHeight: '22px',
      }}>
        {children}
      </p>
    );
  }
  
  if (regularHeader) {  
    return (
      <p className="mb-2 last:mb-0" style={{
        ...headerStyle,
        fontWeight: 600
      }}>
        {children}
      </p>
    );
  }

  return <p className="mb-3 last:mb-0" style={botTextStyle}>{children}</p>;
}

