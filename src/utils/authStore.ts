import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Session } from '@supabase/supabase-js';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_MARGIN = 5 * 60; // 5 minutes before expiry

class AuthStore {
  private supabase = createClientComponentClient();
  private idleTimer: NodeJS.Timeout | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup activity listeners
      ['mousedown', 'keydown', 'touchstart', 'mousemove'].forEach(event => {
        window.addEventListener(event, () => this.resetIdleTimer());
      });
    }
  }

  async initialize() {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    if (session) {
      this.setupTimers(session);
    }

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.setupTimers(session);
      } else if (event === 'SIGNED_OUT') {
        this.clearTimers();
      }
    });
  }

  private setupTimers(session: Session) {
    this.setupIdleTimer();
    this.setupTokenRefreshTimer(session);
  }

  private setupIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => this.handleIdle(), IDLE_TIMEOUT);
  }

  private setupTokenRefreshTimer(session: Session) {
    this.clearTokenRefreshTimer();

    const expiresAt = session?.expires_at ?? 0;
    const timeUntilExpiry = (expiresAt - TOKEN_REFRESH_MARGIN) * 1000 - Date.now();

    if (timeUntilExpiry > 0) {
      this.tokenRefreshTimer = setTimeout(() => this.refreshToken(), timeUntilExpiry);
    } else {
      // If token is already close to expiry, refresh immediately
      this.refreshToken();
    }
  }

  private clearTimers() {
    this.clearIdleTimer();
    this.clearTokenRefreshTimer();
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private clearTokenRefreshTimer() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  private resetIdleTimer() {
    this.setupIdleTimer();
  }

  private async handleIdle() {
    const { error } = await this.supabase.auth.signOut();
    if (!error) {
      window.location.href = '/auth/signin?message=Session expired due to inactivity';
    }
  }

  private async refreshToken() {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.refreshSession();

    if (error) {
      console.error('Failed to refresh token:', error);
      // Force re-authentication on refresh failure
      await this.supabase.auth.signOut();
      window.location.href = '/auth/signin?message=Please sign in again';
      return;
    }

    if (session) {
      this.setupTokenRefreshTimer(session);
    }
  }
}

export const authStore = new AuthStore();
