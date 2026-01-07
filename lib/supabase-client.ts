import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: ReturnType<typeof createBrowserClient> | null = null;
let initPromise: Promise<void> | null = null;

export function createSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Force token refresh on every getUser/getSession call
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Add storage to ensure cookies work correctly
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null;
            return window.localStorage.getItem(key);
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem(key, value);
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return;
            window.localStorage.removeItem(key);
          },
        },
      },
    });

    // Initialize session on first client creation
    if (!initPromise) {
      initPromise = (async () => {
        try {
          await client!.auth.getSession();
        } catch (error) {
          console.error('Failed to initialize Supabase session:', error);
        }
      })();
    }
  }
  return client;
}

// Helper function to ensure client is ready
export async function waitForSupabaseInit() {
  createSupabaseBrowserClient();
  if (initPromise) {
    await initPromise;
  }
}
