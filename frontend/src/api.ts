import { API_BASE_URL } from './config'
import type { Measurement } from './types'

export class ApiError extends Error {}

/** Fetches all measurements from the backend. Throws ApiError with a readable message. */
export async function fetchMeasurements(signal?: AbortSignal): Promise<Measurement[]> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/data`, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    // Network failures and CORS rejections both surface as a TypeError in the browser.
    throw new ApiError(`Cannot reach the backend at ${API_BASE_URL}`)
  }

  if (!response.ok) {
    throw new ApiError(`Backend responded with HTTP ${response.status}`)
  }
  return (await response.json()) as Measurement[]
}
