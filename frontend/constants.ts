const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_WS_BASE_URL = "ws://localhost:8000/ws";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || DEFAULT_API_BASE_URL;
export const WS_BASE_URL: string =
  (import.meta.env.VITE_WS_BASE_URL as string) || DEFAULT_WS_BASE_URL;
export const CLERK_PUBLISHABLE_KEY: string =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string) ||
  (import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as string) ||
  "pk_test_c3VtbWFyeS1idWNrLTczNDMuY2xlcmsuYWNjb3VudHMuZGV2JA";

// Exponential backoff configuration
export const MAX_RECONNECT_DELAY = 30000; // 30 seconds
export const INITIAL_RECONNECT_DELAY = 1000; // 1 second

