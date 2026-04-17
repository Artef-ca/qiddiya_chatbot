/**
 * Browser detection utility for cross-browser compatibility
 * Helps identify browser-specific quirks and provide appropriate fallbacks
 */

export interface BrowserInfo {
  name: 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'unknown';
  version: number | null;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isChromium: boolean; // Chrome, Edge (Chromium), Opera
}

/**
 * Detects browser information from user agent
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined' || !navigator) {
    return {
      name: 'unknown',
      version: null,
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isChromium: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  // Detect mobile
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(platform) || /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  // Detect browser
  let name: BrowserInfo['name'] = 'unknown';
  let version: number | null = null;
  let isChromium = false;

  // Chrome (including Chromium-based Edge)
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
    const match = ua.match(/chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : null;
    isChromium = true;

    // Check if it's Edge (Chromium)
    if (/edg/i.test(ua)) {
      name = 'edge';
    } else {
      name = 'chrome';
    }
  }
  // Edge (Chromium)
  else if (/edg/i.test(ua)) {
    const match = ua.match(/edg\/(\d+)/);
    version = match ? parseInt(match[1], 10) : null;
    name = 'edge';
    isChromium = true;
  }
  // Safari
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    const match = ua.match(/version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : null;
    name = 'safari';
  }
  // Firefox
  else if (/firefox/i.test(ua)) {
    const match = ua.match(/firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : null;
    name = 'firefox';
  }
  // Opera
  else if (/opera|opr/i.test(ua)) {
    const match = ua.match(/(?:opera|opr)\/(\d+)/);
    version = match ? parseInt(match[1], 10) : null;
    name = 'opera';
    isChromium = true; // Modern Opera is Chromium-based
  }

  return {
    name,
    version,
    isMobile,
    isIOS,
    isAndroid,
    isChromium,
  };
}

/**
 * Get browser-specific error messages
 */
export function getBrowserSpecificError(
  browser: BrowserInfo,
  errorType: 'speech-recognition' | 'speech-synthesis',
  errorCode?: string
): string {
  if (errorType === 'speech-recognition') {
    if (browser.name === 'safari') {
      if (errorCode === 'not-allowed' || errorCode === 'audio-capture') {
        return 'Please enable Siri in System Settings > Siri & Spotlight, and grant microphone permissions in Safari settings.';
      }
      return 'Speech recognition requires Safari 14.1+ with Siri enabled in System Settings.';
    }

    if (browser.name === 'firefox') {
      return 'Speech recognition is not supported in Firefox. Please use Chrome, Edge, or Safari.';
    }

    if (errorCode === 'not-allowed') {
      return 'Microphone permission denied. Please allow microphone access in your browser settings.';
    }

    if (errorCode === 'audio-capture') {
      return 'Microphone not found or access denied. Please check your microphone settings.';
    }
  }

  if (errorType === 'speech-synthesis') {
    if (browser.name === 'safari') {
      return 'Text-to-speech may have limited voice options in Safari. Try using Chrome or Edge for better voice selection.';
    }

    if (browser.name === 'firefox') {
      return 'Text-to-speech is supported but may have limited functionality in Firefox.';
    }
  }

  return 'An error occurred. Please try again.';
}

/**
 * Check if browser supports Speech Recognition API
 */
export function supportsSpeechRecognition(browser: BrowserInfo): boolean {
  if (typeof window === 'undefined') return false;

  // Firefox doesn't support Speech Recognition
  if (browser.name === 'firefox') return false;

  // Safari requires 14.1+
  if (browser.name === 'safari') {
    return browser.version !== null && browser.version >= 14;
  }

  // Chrome, Edge, Opera support it
  return browser.isChromium;
}

/**
 * Check if browser supports Speech Synthesis API
 */
export function supportsSpeechSynthesis(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

/**
 * Get the appropriate Speech Recognition class for the browser
 */
export function getSpeechRecognitionClass(): (typeof window.SpeechRecognition) | (typeof window.webkitSpeechRecognition) | null {
  if (typeof window === 'undefined') return null;

  // Try standard API first (Chrome, Edge)
  if (window.SpeechRecognition) {
    return window.SpeechRecognition as typeof window.SpeechRecognition;
  }

  // Fallback to webkit prefix (Safari, older Chrome)
  if (window.webkitSpeechRecognition) {
    return window.webkitSpeechRecognition as typeof window.webkitSpeechRecognition;
  }

  return null;
}

