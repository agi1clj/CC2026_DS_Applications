/** One sensor reading, as returned by the backend GET /api/data endpoints. */
export interface Measurement {
  device_id: string
  timestamp: string
  temperature: number
  humidity: number
}

/** Response of the backend GET /health endpoint. */
export interface Health {
  status: string
  service: string
  version: string
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
