import { C, panelStyle, headingStyle } from '../theme.js'

const blockStyle = (color) => ({
  background: `${color}08`,
  border: `1px solid ${color}25`,
  borderRadius: 8, padding: '12px 16px',
})

const labelStyle = { fontSize: 10, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }
const valueStyle = { fontSize: 14, color: '#111', fontWeight: 600 }
const descStyle = { fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.6 }
const arrowRight = { display: 'flex', alignItems: 'center', color: '#ccc', padding: '0 6px', fontSize: 18 }
const arrowDown = { textAlign: 'center', fontSize: 16, color: '#ccc', padding: '4px 0' }

export default function ArchitectureTab({ data }) {
  const info = data.system_info || {}

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Model', value: info.model },
          { label: 'States', value: info.states },
          { label: 'Integrator', value: info.integrator },
          { label: 'Aero Standard', value: info.aero_standard },
          { label: 'Atmosphere', value: info.atmosphere },
          { label: 'Caliber', value: info.caliber },
        ].map(s => (
          <div key={s.label} style={{ ...panelStyle, flex: 1, textAlign: 'center', padding: '12px 6px' }}>
            <div style={labelStyle}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={headingStyle}>6DOF Simulation Pipeline</div>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {[
            { title: 'Projectile', desc: 'M107 constants, aero tables, form factors', color: '#FF6B35', module: 'projectile.py' },
            { title: 'Atmosphere', desc: 'ISA 8-layer density & sound speed', color: '#FF8C42', module: 'atmosphere.py' },
            { title: 'Aero LUTs', desc: '7 coefficients, 3501-point PCHIP', color: '#FF6B35', module: 'aero.py' },
            { title: 'Forces', desc: 'Drag, lift, Magnus, pitch/yaw/roll moments', color: '#FF8C42', module: 'forces.py' },
            { title: 'Dynamics', desc: '13-state derivatives, Newton + Euler', color: '#FF6B35', module: 'dynamics.py' },
            { title: 'RK4', desc: 'Quaternion normalization per step', color: '#FF8C42', module: 'integrator.py' },
          ].map((block, i) => (
            <div key={block.title} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ ...blockStyle(block.color), minWidth: 140 }}>
                <div style={labelStyle}>{block.module}</div>
                <div style={valueStyle}>{block.title}</div>
                <div style={descStyle}>{block.desc}</div>
              </div>
              {i < 5 && <div style={arrowRight}>→</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={headingStyle}>Guidance & Control System</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...blockStyle('#FF6B35'), marginBottom: 8 }}>
              <div style={labelStyle}>Outer Loop — 10 Hz</div>
              <div style={valueStyle}>PIP Guidance Law</div>
              <div style={descStyle}>Predicts ballistic impact point from GPS state. Computes miss vector. Commands roll angle and duty scaled by miss distance and time-to-go.</div>
            </div>
            <div style={arrowDown}>↓</div>
            <div style={{ ...blockStyle('#FF8C42'), marginBottom: 8 }}>
              <div style={labelStyle}>Inner Loop — 2000 Hz</div>
              <div style={valueStyle}>Cascade PI Controller</div>
              <div style={descStyle}>Outer: position command to velocity reference with feedforward. Inner: PI tracks velocity to alternator current command.</div>
            </div>
            <div style={arrowDown}>↓</div>
            <div style={blockStyle('#FF6B35')}>
              <div style={labelStyle}>Actuator</div>
              <div style={valueStyle}>PMSM Alternator</div>
              <div style={descStyle}>3-phase AC rectified to DC bus. Continuous dissipative torque on de-spun nose. Adaptive saturation via disturbance observer.</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...blockStyle('#FF8C42'), marginBottom: 8 }}>
              <div style={labelStyle}>Sensors</div>
              <div style={valueStyle}>GPS + Magnetometer</div>
              <div style={descStyle}>GPS: 10 Hz, 5m CEP, 0.1 m/s velocity noise. Magnetometer: 100 Hz, ±2° heading noise for nose roll angle.</div>
            </div>
            <div style={{ ...blockStyle('#FF6B35'), marginBottom: 8 }}>
              <div style={labelStyle}>Aerodynamic Effector</div>
              <div style={valueStyle}>4x Fixed Canards</div>
              <div style={descStyle}>Cant angle: 2.0° fixed. De-spun nose section. Wind tunnel validated: M 0.9–2.0. 285mm moment arm from CG.</div>
            </div>
            <div style={blockStyle('#FF8C42')}>
              <div style={labelStyle}>Disturbance Observer</div>
              <div style={valueStyle}>Frequency-Domain DOB</div>
              <div style={descStyle}>Tracks aero + friction torque as equivalent load current. Saturation limits adapt online based on disturbance estimate.</div>
            </div>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={headingStyle}>13-State Vector</div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          {[
            { label: 'Position (3)', vars: 'x, y, z', desc: 'x=downrange, y=cross, z=alt (m)' },
            { label: 'Velocity (3)', vars: 'vx, vy, vz', desc: 'Earth frame (m/s)' },
            { label: 'Attitude (4)', vars: 'q0, q1, q2, q3', desc: 'Hamilton quaternion, scalar-first' },
            { label: 'Angular Rates (3)', vars: 'p, q, r', desc: 'Roll, pitch, yaw (body, rad/s)' },
          ].map(s => (
            <div key={s.label}>
              <div style={labelStyle}>{s.label}</div>
              <div style={{ fontFamily: 'monospace', color: '#FF6B35', fontWeight: 600 }}>{s.vars}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
