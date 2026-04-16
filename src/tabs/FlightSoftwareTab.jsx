import { C, panelStyle } from '../theme.js'

export default function FlightSoftwareTab({ data }) {
  return (
    <div style={{ padding: 36 }}>
      <div style={{ ...panelStyle, padding: '28px 32px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Section 05 — Flight Software</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.textBright, marginBottom: 10 }}>Flight Software</div>
        <div style={{ fontSize: 22, color: C.textDim, lineHeight: 1.6 }}>Content coming soon.</div>
      </div>
    </div>
  )
}
