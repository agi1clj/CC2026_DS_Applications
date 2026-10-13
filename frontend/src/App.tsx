import { useMemo, useState } from 'react'
import { ALL_DEVICES, DeviceFilter } from './components/DeviceFilter'
import { MeasurementsTable } from './components/MeasurementsTable'
import { API_BASE_URL } from './config'
import { useMeasurements } from './hooks/useMeasurements'
import './App.css'

export default function App() {
  const { measurements, loading, error, reload } = useMeasurements()
  const [device, setDevice] = useState(ALL_DEVICES)

  const devices = useMemo(() => [...new Set(measurements.map((m) => m.device_id))].sort(), [measurements])
  const visible = device === ALL_DEVICES ? measurements : measurements.filter((m) => m.device_id === device)

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Device Measurements Dashboard</h1>
          <p className="subtitle">CC2026 · Project Part 1</p>
        </div>
        <div className="toolbar">
          <DeviceFilter devices={devices} value={device} disabled={loading || error !== null} onChange={setDevice} />
          <button type="button" onClick={reload} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {loading && (
        <p className="status" role="status">
          <span className="spinner" aria-hidden="true" /> Loading measurements…
        </p>
      )}

      {!loading && error && (
        <div className="error" role="alert">
          <strong>Could not load data.</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="summary">
            Showing {visible.length} of {measurements.length} measurements
          </p>
          <MeasurementsTable measurements={visible} />
        </>
      )}

      <footer className="footer">
        API: <code>{API_BASE_URL}</code>
      </footer>
    </main>
  )
}
