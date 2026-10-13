import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchMeasurements } from '../api'
import type { Measurement } from '../types'

interface MeasurementsState {
  measurements: Measurement[]
  loading: boolean
  error: string | null
  reload: () => void
}

/** Loads measurements on mount and whenever reload() is called. */
export function useMeasurements(): MeasurementsState {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchMeasurements(controller.signal)
      .then(setMeasurements)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof ApiError ? err.message : 'Unexpected error while loading data')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return { measurements, loading, error, reload }
}
