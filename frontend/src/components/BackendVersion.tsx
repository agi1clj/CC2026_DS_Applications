import { useEffect, useState } from 'react'
import { fetchHealth } from '../api'

const SHORT_SHA_LENGTH = 7

/** Shows which backend build is answering, e.g. "backend 3f2a9c1". */
export function BackendVersion() {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchHealth(controller.signal).then((health) => setVersion(health?.version ?? null))
    return () => controller.abort()
  }, [])

  if (!version) return null
  return <> · backend {version.slice(0, SHORT_SHA_LENGTH)}</>
}
