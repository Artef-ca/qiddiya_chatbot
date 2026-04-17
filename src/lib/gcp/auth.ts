import { GoogleAuth } from 'google-auth-library';

// Cache for the access token to avoid fetching it on every request
interface TokenCache {
  token: string | null;
  expiresAt: number;
  refreshTokenPromise: Promise<string> | null;
}

let tokenCache: TokenCache = {
  token: null,
  expiresAt: 0,
  refreshTokenPromise: null,
};

/**
 * Get GCP access token using the service account credentials
 * In Cloud Run, the service account credentials are automatically available
 * via the metadata server or environment variables
 * 
 * For local development, you can use:
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account JSON file
 * 2. Run: gcloud auth application-default login
 * 
 * @param forceRefresh - Force a new token even if cached token is still valid
 * @returns Promise<string> GCP access token
 */
export async function getGcpAccessToken(forceRefresh: boolean = false): Promise<string> {
  const now = Date.now();
  
  // Check if we have a valid cached token and not forcing refresh
  if (!forceRefresh && tokenCache.token && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  // If there's already a refresh in progress, wait for it instead of starting a new one
  if (tokenCache.refreshTokenPromise) {
    return tokenCache.refreshTokenPromise;
  }

  // Start a new token refresh
  const refreshPromise = (async (): Promise<string> => {
    try {
      // Initialize GoogleAuth - it will automatically detect credentials from:
      // 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (local dev with service account JSON)
      // 2. Metadata server (Cloud Run, GCE, etc.) - automatic in production
      // 3. gcloud CLI credentials (local dev fallback via application-default)
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      // Get the access token
      // The google-auth-library automatically handles token refresh
      const client = await auth.getClient();
      const accessTokenResponse = await client.getAccessToken();

      if (!accessTokenResponse.token) {
        throw new Error('Failed to get GCP access token: token is null');
      }

      // Calculate expiration time
      // GCP tokens typically expire after 1 hour (3600 seconds)
      // We'll refresh 5 minutes before expiration to be safe
      const tokenLifetime = 3600 * 1000; // 1 hour in milliseconds
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      const expiresAt = now + tokenLifetime - bufferTime;

      // Update cache
      tokenCache = {
        token: accessTokenResponse.token,
        expiresAt,
        refreshTokenPromise: null,
      };

      console.log('[GCP Auth] Successfully obtained access token', {
        expiresIn: Math.round((expiresAt - now) / 1000 / 60),
        minutes: 'minutes',
      });

      return accessTokenResponse.token;
    } catch (error) {
      // Clear the refresh promise on error so we can retry
      tokenCache.refreshTokenPromise = null;
      
      console.error('[GCP Auth] Error getting GCP access token:', error);
      
      // If we have a cached token (even if expired), try using it as last resort
      // The API will return 401 if it's truly expired, and we'll retry
      if (tokenCache.token) {
        console.warn('[GCP Auth] Using cached token as fallback (may be expired)');
        return tokenCache.token;
      }

      // Provide helpful error message for local development
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isLocalDev = process.env.NODE_ENV !== 'production';
      
      if (isLocalDev) {
        throw new Error(
          `Failed to get GCP access token: ${errorMessage}\n` +
          `For local development, ensure you have:\n` +
          `1. Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path, OR\n` +
          `2. Run: gcloud auth application-default login`
        );
      }

      throw new Error(`Failed to get GCP access token: ${errorMessage}`);
    }
  })();

  // Store the promise so concurrent requests can wait for the same refresh
  tokenCache.refreshTokenPromise = refreshPromise;

  return refreshPromise;
}

/**
 * Clear the token cache (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = {
    token: null,
    expiresAt: 0,
    refreshTokenPromise: null,
  };
}

/**
 * Check if the current token is expired or about to expire
 */
export function isTokenExpired(): boolean {
  const now = Date.now();
  return !tokenCache.token || tokenCache.expiresAt <= now;
}
