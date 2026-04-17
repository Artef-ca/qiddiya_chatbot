/**
 * Shared styles for markdown components
 */

export const listTextStyle: React.CSSProperties = {
  color: 'var(--Lynch-950, #23272E)',
  fontFamily: 'Manrope',
  fontSize: '14px',
  fontStyle: 'normal',
  fontWeight: 500,
  lineHeight: '22px',
  alignSelf: 'stretch'
};

export function getBotTextStyle(isBotResponse: boolean): React.CSSProperties {
  return isBotResponse ? {
    color: 'var(--Lynch-950, #23272E)',
    fontFamily: 'Manrope',
    fontSize: '14px',
    fontStyle: 'normal' as const,
    fontWeight: 500,
    lineHeight: '22px'
  } : {
    fontFamily: 'Manrope',
    fontSize: '14px',
    lineHeight: '22px',
    color: 'var(--Lynch-800, #3A4252)'
  };
}

export function getBotBoldStyle(isBotResponse: boolean): React.CSSProperties {
  return isBotResponse ? {
    color: 'var(--Lynch-950, #23272E)',
    fontFamily: 'Manrope',
    fontSize: '14px',
    fontStyle: 'normal' as const,
    fontWeight: 700,
    lineHeight: '22px'
  } : {
    fontWeight: 600,
    color: 'var(--Lynch-900, #2D3440)'
  };
}

export function getHeaderStyle(isBotResponse: boolean): React.CSSProperties {
  return isBotResponse ? {
    color: 'var(--Lynch-950, #23272E)',
    fontFamily: 'Manrope',
    fontSize: '14px',
    fontStyle: 'normal' as const,
    fontWeight: 600,
    lineHeight: '22px',
    marginBottom: '8px'
  } : {
    fontFamily: 'Manrope',
    fontSize: '14px',
    lineHeight: '22px',
    color: 'var(--Lynch-800, #3A4252)',
    fontWeight: 600
  };
}

