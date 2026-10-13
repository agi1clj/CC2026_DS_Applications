export const ALL_DEVICES = ''

interface DeviceFilterProps {
  devices: string[]
  value: string
  disabled: boolean
  onChange: (device: string) => void
}

export function DeviceFilter({ devices, value, disabled, onChange }: DeviceFilterProps) {
  return (
    <>
      <label htmlFor="device">Device</label>
      <select id="device" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL_DEVICES}>All devices</option>
        {devices.map((device) => (
          <option key={device} value={device}>
            {device}
          </option>
        ))}
      </select>
    </>
  )
}
