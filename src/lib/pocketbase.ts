import PocketBase, { BaseAuthStore } from 'pocketbase'

const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://192.168.1.11:8090'

class SafeAuthStore extends BaseAuthStore {
  private storageKey = 'pocketbase_auth';

  constructor() {
    super();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKey) || '';
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            this.save(parsed.token || '', parsed.record || parsed.model || null);
          } catch (e) {}
        }
      }
    } catch (e) {
      // LocalStorage blocked (e.g. cross-origin iframe SecurityError)
    }
  }

  save(token: string, model: any) {
    super.save(token, model);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, JSON.stringify({ token, model }));
      }
    } catch (e) {}
  }

  clear() {
    super.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.storageKey);
      }
    } catch (e) {}
  }
}

export const pb = new PocketBase(pbUrl, new SafeAuthStore())
