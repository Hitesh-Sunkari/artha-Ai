/**
 * ArthaAI — Official Google Identity Services (GIS) OAuth 2.0 Integration
 * 
 * Uses Google's official OAuth token client (accounts.google.com/gsi/client)
 * with prompt: 'select_account' to launch the authentic Google account chooser.
 */

import { api } from '../api/client';

export interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

/**
 * Resolves the Google Cloud OAuth 2.0 Client ID in order of priority:
 * 1. Vite environment variable: import.meta.env.VITE_GOOGLE_CLIENT_ID
 * 2. Local storage override: arthai_google_client_id
 * 3. Server backend config: /auth/google/config
 */
export async function getResolvedGoogleClientId(): Promise<string> {
  // 1. Vite env variable
  try {
    const envId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (envId && typeof envId === 'string' && envId.trim()) {
      return envId.trim();
    }
  } catch {}

  // 2. LocalStorage override
  try {
    const localId = localStorage.getItem('arthai_google_client_id') || localStorage.getItem('VITE_GOOGLE_CLIENT_ID');
    if (localId && localId.trim()) {
      return localId.trim();
    }
  } catch {}

  // 3. Backend endpoint
  try {
    const res = await api.getGoogleOAuthConfig();
    if (res?.client_id && res.client_id.trim()) {
      localStorage.setItem('arthai_google_client_id', res.client_id.trim());
      return res.client_id.trim();
    }
  } catch {}

  return '';
}

/**
 * Saves a Google OAuth Client ID to localStorage for immediate usage.
 */
export function setStoredGoogleClientId(clientId: string): void {
  const clean = clientId.trim();
  if (clean) {
    localStorage.setItem('arthai_google_client_id', clean);
  }
}

/**
 * Ensures Google Identity Services (GIS) client script is loaded on the page.
 */
export function ensureGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.getElementById('google-gsi-client-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      // Poll fallback in case already loaded
      let tries = 0;
      const interval = setInterval(() => {
        tries++;
        if ((window as any).google?.accounts?.oauth2 || tries > 20) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * Triggers Google's Official OAuth 2.0 Account Chooser Popup.
 *
 * Forces Google to display the list of all browser-connected Google accounts
 * using prompt: 'select_account'.
 */
export async function launchOfficialGoogleOAuth(options: {
  clientId: string;
  onProfile: (profile: GoogleProfile) => void;
  onError: (errorMessage: string) => void;
  onLoading?: (isLoading: boolean) => void;
}): Promise<void> {
  const { clientId, onProfile, onError, onLoading } = options;

  if (!clientId || !clientId.trim()) {
    onError('Google OAuth 2.0 Client ID is missing. Please configure your Google Client ID.');
    return;
  }

  await ensureGoogleIdentityScript();

  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    onError('Google Identity Services SDK could not be loaded. Please check your network connection.');
    return;
  }

  try {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (tokenResponse: any) => {
        if (!tokenResponse) {
          onError('Empty response received from Google OAuth.');
          return;
        }

        if (tokenResponse.error) {
          const detail = tokenResponse.error_description || tokenResponse.error;
          if (tokenResponse.error === 'access_denied') {
            // User cancelled/closed account chooser
            return;
          }
          onError(`Google OAuth error: ${detail}`);
          return;
        }

        if (tokenResponse.access_token) {
          onLoading && onLoading(true);
          try {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            if (!userinfoRes.ok) {
              const errBody = await userinfoRes.text().catch(() => '');
              throw new Error(`Google profile verification failed (${userinfoRes.status}): ${errBody}`);
            }

            const profile = await userinfoRes.json();
            if (!profile?.email) {
              throw new Error('Google profile did not contain an email address.');
            }

            onProfile({
              email: profile.email,
              name: profile.name || profile.given_name || profile.email.split('@')[0],
              picture: profile.picture,
              sub: profile.sub,
            });
          } catch (err: any) {
            onError(err.message || 'Failed to retrieve verified Google profile.');
          } finally {
            onLoading && onLoading(false);
          }
        }
      },
      error_callback: (nonOAuthErr: any) => {
        console.error('Google OAuth init error:', nonOAuthErr);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
        const raw = nonOAuthErr?.message || '';
        if (raw.toLowerCase().includes('origin') || raw.toLowerCase().includes('invalid_client')) {
          onError(`Google OAuth Origin Error: '${origin}' is not added to 'Authorized JavaScript origins' in your Google Cloud Console OAuth Client settings.`);
        } else {
          onError(raw || 'Google OAuth failed to initialize. Please check your Google Cloud Client ID.');
        }
      },
    });

    // Request access token with explicit account selection prompt
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (err: any) {
    onError(err?.message || 'Failed to trigger Google OAuth popup.');
  }
}

