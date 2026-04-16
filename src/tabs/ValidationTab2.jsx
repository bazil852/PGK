import { C, font, panelStyle } from '../theme.js'

const CHECK = '✓'
const WARN = '⚠'

const subsystems = [
  {
    name: 'Ballistic Model (MPM)',
    status: 'validated',
    tests: 722,
    details: '7 charges validated against FT 155-AM-2',
    metrics: [
      { k: 'R²', v: '0.9998' },
      { k: 'RMS Error', v: '56 m (< 0.4%)' },
      { k: 'TOF Accuracy', v: '< 0.3 s' },
      { k: 'Charges', v: '4G → 8 (7 total)' },
    ],
  },
  {
    name: '6DOF Rigid Body',
    status: 'validated',
    tests: 13,
    details: '13-state model, RK4 integrator, STANAG-4355 Ed.3',
    metrics: [
      { k: 'States', v: '13' },
      { k: 'Spin Drift', v: '~400 m @ 14 km' },
      { k: 'Epicyclic', v: 'Captured' },
      { k: 'Roll Decoupled', v: 'Yes (body + nose)' },
    ],
  },
  {
    name: 'Wind Tunnel',
    status: 'validated',
    tests: 48,
    details: 'Canard lift measured, area corrected from Design 1 → 2',
    metrics: [
      { k: 'Measured Lift', v: '10 N (D1) → 40 N (D2)' },
      { k: 'Cd₀ Correction', v: 'Applied at M 0.9–2.0' },
      { k: 'Range Penalty', v: '< 3%' },
      { k: 'Test Articles', v: '2 (D1 + D2)' },
    ],
  },
  {
    name: 'CFD Analysis',
    status: 'validated',
    tests: 4,
    details: 'Mach 0.9, 1.2, 1.5, 2.0 — velocity, temperature, pressure fields',
    metrics: [
      { k: 'Solver', v: 'RANS (k-ω SST)' },
      { k: 'Mesh', v: '~2M cells' },
      { k: 'Convergence', v: 'Cd residual < 1e-4' },
      { k: 'Mach Range', v: '0.9 – 2.0' },
    ],
  },
  {
    name: 'Guidance Law (PN)',
    status: 'validated',
    tests: 80,
    details: 'Proportional Navigation N=3, validated in ideal + noisy sim',
    metrics: [
      { k: 'Law', v: 'PN · N = 3' },
      { k: 'Ideal CEP', v: '< 5 m' },
      { k: 'With EKF', v: '35–50 m' },
      { k: 'MC Runs', v: '80' },
    ],
  },
  {
    name: 'State Estimation (EKF)',
    status: 'validated',
    tests: 80,
    details: '15-state tightly-coupled GPS+IMU Extended Kalman Filter',
    metrics: [
      { k: 'States', v: '15' },
      { k: 'Attitude Error', v: '< 0.3° (1σ)' },
      { k: 'GPS Dropout', v: 'Survives 2s' },
      { k: 'IMU Rate', v: '1 kHz' },
    ],
  },
  {
    name: 'Autopilot (Inner Loop)',
    status: 'validated',
    tests: 80,
    details: 'Cascade PI on PMSM alternator, gain-scheduled',
    metrics: [
      { k: 'Settling', v: '≈ 130 ms' },
      { k: 'Gain Margin', v: '> 10 dB' },
      { k: 'Phase Margin', v: '> 45°' },
      { k: 'Peak Current', v: '4 A / 8 A' },
    ],
  },
  {
    name: 'Flight Software (RT)',
    status: 'validated',
    tests: 3,
    details: 'Multi-rate scheduler, DOB, actuator-aware control',
    metrics: [
      { k: 'Inner Loop', v: '1 kHz ± 25 µs' },
      { k: 'CPU Budget', v: '41% / 70%' },
      { k: 'Missed Deadlines', v: '0' },
      { k: 'DOB Filter', v: 'τ_f = 0.5 s' },
    ],
  },
  {
    name: 'FEA / Structural',
    status: 'validated',
    tests: 1,
    details: 'Bearing survival under 15,400g setback — lock-out mechanism',
    metrics: [
      { k: 'Setback g', v: '15,400' },
      { k: 'Solution', v: 'Lock-out @ 200 m' },
      { k: 'Bearing Class', v: 'Aerospace' },
      { k: 'Risk', v: 'CLOSED' },
    ],
  },
  {
    name: 'Monte Carlo Campaign',
    status: 'validated',
    tests: 80,
    details: 'Full closed-loop MC: 6DOF + EKF + guidance + autopilot',
    metrics: [
      { k: 'Unguided CEP₅₀', v: '≈ 161 m' },
      { k: 'Guided CEP₅₀', v: '35–50 m' },
      { k: 'Improvement', v: '~4×' },
      { k: 'Hit Rate (D4)', v: '> 75%' },
    ],
  },
]

export default function ValidationDashboard() {
  return (
    <div style={{ padding: 36 }}>
      <div style={{ ...panelStyle, padding: '20px 28px', marginBottom: 20 }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Validation & Readiness
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.textBright, marginBottom: 8 }}>
          Subsystem Verification Status
        </div>
        <div style={{ fontSize: 22, color: C.textDim, lineHeight: 1.6, maxWidth: 1100 }}>
          Every subsystem in the PGK simulation chain has been independently validated.
          This dashboard shows the current verification status, test coverage, and key metrics.
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'SUBSYSTEMS', value: '10 / 10', color: '#16a34a' },
          { label: 'TOTAL TESTS', value: '1,089', color: C.accent },
          { label: 'GUIDED CEP₅₀', value: '35–50 m', color: '#16a34a' },
          { label: 'OVERALL STATUS', value: 'READY', color: '#16a34a' },
        ].map(s => (
          <div key={s.label} style={{
            ...panelStyle, padding: '16px 20px', textAlign: 'center',
            borderTop: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 13, color: C.textDim, letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Subsystem cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {subsystems.map(sub => (
          <div key={sub.name} style={{
            ...panelStyle, padding: '18px 22px',
            borderLeft: `4px solid #16a34a`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.textBright }}>{sub.name}</div>
              <div style={{
                background: '#16a34a15', border: '1px solid #16a34a40',
                borderRadius: 6, padding: '4px 12px',
                fontSize: 13, fontWeight: 700, color: '#16a34a', letterSpacing: 1,
              }}>{CHECK} VALIDATED</div>
            </div>
            <div style={{ fontSize: 14, color: C.textDim, marginBottom: 12 }}>{sub.details}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {sub.metrics.map(m => (
                <div key={m.k} style={{ fontSize: 14, padding: '4px 0' }}>
                  <span style={{ color: C.textDim }}>{m.k}: </span>
                  <span style={{ color: C.textBright, fontWeight: 600 }}>{m.v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
