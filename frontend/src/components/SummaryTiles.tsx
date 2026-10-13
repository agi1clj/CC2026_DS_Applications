import type { Measurement } from '../types'

interface SummaryTilesProps {
  measurements: Measurement[]
}

function average(values: number[]): string {
  if (values.length === 0) return '–'
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
}

/** Key figures for the measurements currently shown. */
export function SummaryTiles({ measurements }: SummaryTilesProps) {
  const devices = new Set(measurements.map((m) => m.device_id)).size
  const tiles = [
    { label: 'Devices', value: String(devices) },
    { label: 'Readings', value: String(measurements.length) },
    { label: 'Avg temperature (°C)', value: average(measurements.map((m) => m.temperature)) },
    { label: 'Avg humidity (%)', value: average(measurements.map((m) => m.humidity)) },
  ]

  return (
    <div className="tiles">
      {tiles.map((tile) => (
        <div className="tile" key={tile.label}>
          <span className="tile-value">{tile.value}</span>
          <span className="tile-label">{tile.label}</span>
        </div>
      ))}
    </div>
  )
}
