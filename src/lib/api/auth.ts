const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Clears all cookies accessible via document.cookie (non-httpOnly).
 * httpOnly cookies (session, token) are cleared server-side in logout response.
 */
function clearCookies(): void {
  if (typeof document === 'undefined') return;
  try {
    const cookies = document.cookie.split(';');
    const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    for (const cookie of cookies) {
      const eq = cookie.indexOf('=');
      const name = eq > -1 ? cookie.substring(0, eq).trim() : cookie.trim();
      if (name) {
        document.cookie = `${name}=; ${expire}; path=/`;
      }
    }
  } catch (e) {
    console.warn('Could not clear cookies:', e);
  }
}

/**
 * Clears all client-side browser data for this application.
 * Call before redirecting to login after consent decline/withdraw to prevent
 * 403 errors from stale session/cookies when re-logging in.
 */
function clearAllBrowserData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.clear();
    sessionStorage.clear();
    clearCookies();
  } catch (e) {
    console.warn('Could not clear browser storage:', e);
  }
}

/**
 * Redirect to login with cache-busting to avoid serving stale cached content.
 */
function redirectToLogin(): void {
  const url = `/login?t=${Date.now()}`;
  window.location.replace(url);
}

export const authApi = {
  // Initiate SAML login
  login: () => {
    window.location.href = `${API_BASE_URL}/auth/saml/login`;
  },

  // Check session status
  getSession: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/session`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  },

  // Logout - clears session, localStorage, sessionStorage, cookies, redirects to login.
  // Must clear all browser data to prevent 403 on re-login after consent decline/withdraw.
  logout: async () => {
    // Clear client storage first so no stale data persists after redirect
    clearAllBrowserData();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Ensure cookies are sent for server to clear
      });
      if (response.redirected) {
        window.location.replace(response.url);
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (data?.success) {
        redirectToLogin();
        return;
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    // Always redirect to login (cookies cleared server-side; storage already cleared above)
    redirectToLogin();
  },
};
