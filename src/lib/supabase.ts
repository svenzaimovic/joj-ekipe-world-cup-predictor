import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Copy .env.example to .env.local and fill in your project credentials.')
}

// iOS Safari blocks localStorage in private browsing and some privacy settings.
// Fall back to an in-memory store so the Supabase client always initialises.
function safeStorage(): Storage | undefined {
  try {
    const key = '__supabase_test__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return localStorage
  } catch {
    // In-memory fallback — session won't persist across page loads but the
    // app will render correctly instead of crashing with a blank screen.
    const store: Record<string, string> = {}
    return {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v },
      removeItem: (k) => { delete store[k] },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
      key: (i) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length },
    } as Storage
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: safeStorage(),
    // Supabase JS v2 serialises ALL auth + data operations behind navigator.locks
    // (a real cross-tab browser mutex). When a stored session exists, _initialize()
    // holds this lock while refreshing the token — which blocks every data query in
    // the same tab for the full duration of the refresh (up to several seconds on
    // the free tier). A single-tab SPA never needs a cross-context mutex, so we
    // replace it with a no-op that runs the callback immediately. Token refresh
    // still happens in the background; we just don't make everything else wait for it.
    lock: (_name: string, _acquireTimeout: number, fn: () => Promise<void>) => fn(),
  },
})
