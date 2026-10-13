const DEFAULT_API_BASE_URL = 'http://localhost:8000'

/**
 * Backend base URL, resolved at runtime from /config.js (see index.html).
 * Nothing environment-specific is compiled into the bundle, so the same image
 * runs locally and in Azure.
 */
export const API_BASE_URL: string = (window.APP_CONFIG?.API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '')
