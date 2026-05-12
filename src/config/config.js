/**
 * Gullak Mobile — Environment Configuration
 *
 * Centralizes all configurable values. Defaults point to the Tailscale production server.
 * Override via environment variables or modify defaults for dev/staging.
 */

// In React Native, process.env is typically set via react-native-dotenv or Expo's .env support.
// For now, we use simple defaults that can be swapped per environment.

const env = typeof process !== 'undefined' && process.env ? process.env : {};

export const API_BASE_URL = env.GULLAK_API_URL || 'http://100.84.80.76:3001/api';
export const API_TIMEOUT_MS = env.GULLAK_API_TIMEOUT ? parseInt(env.GULLAK_API_TIMEOUT, 10) : 15000;
export const CACHE_TTL_MS = env.GULLAK_CACHE_TTL ? parseInt(env.GULLAK_CACHE_TTL, 10) : 30000;

export const FEATURE_FLAGS = {
  use_server_forecast_v2: true,
};
