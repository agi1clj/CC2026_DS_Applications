import type { Measurement } from '../types'

const timestampFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

interface MeasurementsTableProps {
  measurements: Measurement[]
}

export function MeasurementsTable({ measurements }: MeasurementsTableProps) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Timestamp (UTC)</th>
            <th className="num">Temperature (°C)</th>
            <th className="num">Humidity (%)</th>
          </tr>
        </thead>
        <tbody>
          {measurements.map((m) => (
            <tr key={`${m.device_id}-${m.timestamp}`}>
              <td>{m.device_id}</td>
              <td>{timestampFormat.format(new Date(m.timestamp))}</td>
              <td className="num">{m.temperature.toFixed(1)}</td>
              <td className="num">{m.humidity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
