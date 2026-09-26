import { useEffect } from 'react';
import { toast } from 'sonner';
import securityService from '@/services/security.service';
import { useAuthStore } from '@/store/authStore';

const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
const KEY = 'last_activity_at';

/** Signs the person out after the school's "no activity" limit (Settings → Security → Rules). Activity in any tab
 *  counts, because the last-activity time is shared through localStorage. */
export function useIdleSignOut() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!isAuthenticated) return;
    let minutes = 0;
    let timer: number | undefined;
    let cancelled = false;
    const touch = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ } };
    const last = () => { try { return Number(localStorage.getItem(KEY)) || Date.now(); } catch { return Date.now(); } };
    const check = () => {
      if (!minutes || cancelled) return;
      if (Date.now() - last() >= minutes * 60_000) {
        logout();
        toast.info('You were signed out after a period of no activity.');
        window.location.href = '/login';
      }
    };
    touch();
    securityService.rules().then((r) => {
      if (cancelled || !r.idle_minutes) return;
      minutes = r.idle_minutes;
      EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
      timer = window.setInterval(check, 30_000);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      EVENTS.forEach((e) => window.removeEventListener(e, touch));
      if (timer) window.clearInterval(timer);
    };
  }, [isAuthenticated, logout]);
}
