const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEFAULT_WS_BASE_URL = "ws://localhost:8000/ws";

const getEnv = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {}
  return fallback;
};

export const API_BASE_URL: string = getEnv("VITE_API_BASE_URL", DEFAULT_API_BASE_URL);
export const WS_BASE_URL: string = getEnv("VITE_WS_BASE_URL", DEFAULT_WS_BASE_URL);
export const CLERK_PUBLISHABLE_KEY: string =
  getEnv("VITE_CLERK_PUBLISHABLE_KEY", "") ||
  getEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "") ||
  "pk_test_c3VtbWFyeS1idWNrLTczNDMuY2xlcmsuYWNjb3VudHMuZGV2JA";

// Exponential backoff configuration
export const MAX_RECONNECT_DELAY = 30000; // 30 seconds
export const INITIAL_RECONNECT_DELAY = 1000; // 1 second

