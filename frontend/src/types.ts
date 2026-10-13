/** One sensor reading, as returned by the backend GET /api/data endpoints. */
export interface Measurement {
  device_id: string
  timestamp: string
  temperature: number
  humidity: number
}

/** Shape of window.APP_CONFIG, written to /config.js when the container starts. */
export interface RuntimeConfig {
  API_BASE_URL: string
}

declare global {
  interface Window {
    APP_CONFIG?: Partial<RuntimeConfig>
  }
}
