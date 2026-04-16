import { useState, useEffect, useRef } from 'react'
import { C, panelStyle, headingStyle } from '../theme.js'

const mono = "'SF Mono', 'Fira Code', 'Consolas', monospace"

function fmt(n, d = 1) { return typeof n === 'number' ? n.toFixed(d) : '---' }
function pad(s, len) { return String(s).padStart(len, ' ') }

export default function TelemetryTab({ data }) {
  const [running, setRunning] = useState(false)
  const [runIdx, setRunIdx] = useState(0)
  const [frameIdx, setFrameIdx] = useState(0)
  const [speed, setSpeed] = useState(5) // frames per tick
  const [log, setLog] = useState([])
  const logRef = useRef(null)
  const intervalRef = useRef(null)

  const runs = [
    { label: 'Unguided', traj: data.unguided.trajectory, color: '#FF6B35', guided: false },
    ...data.guided_runs.map(r => ({
      label: r.label, traj: r.trajectory, color: r.success ? '#4ade80' : '#ef4444',
      guided: true, miss: r.miss, success: r.success, target: r.target,
    })),
  ]

  const activeRun = runs[runIdx]
  const traj = activeRun.traj
  const frame = Math.min(frameIdx, traj.t.length - 1)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(prev => {
          const next = prev + speed
          if (next >= traj.t.length - 1) {
            setRunning(false)
            return traj.t.length - 1
          }
          return next
        })
      }, 50)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, speed, traj.t.length])

  // Generate log entries
  useEffect(() => {
    const entries = []
    const step = Math.max(1, Math.floor(traj.t.length / 40))
    for (let i = 0; i <= frame; i += step) {
      if (i > frame) break
      const t = traj.t[i]
      const alt = traj.z[i]
      const mach = traj.mach[i]
      const range = traj.x[i]
      const vx = traj.vx[i]
      const vz = traj.vz[i]
      const vel = Math.sqrt(vx * vx + vz * vz)

      let status = 'FLIGHT'
      if (alt < 10 && t > 1) status = 'IMPACT'
      else if (activeRun.guided && mach < 2.5 && mach > 0.9 && vz < 0) status = 'GUIDING'
      else if (vz < 0) status = 'DESCENT'
      else status = 'ASCENT'

      entries.push({
        t: fmt(t, 2),
        alt: fmt(alt, 0),
        range: fmt(range, 0),
        mach: fmt(mach, 3),
        vel: fmt(vel, 0),
        status,
      })
    }
    setLog(entries)
  }, [frame, traj, activeRun.guided])

  // Auto scroll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

  const reset = () => { setFrameIdx(0); setRunning(false); setLog([]) }
  const startRun = (idx) => { setRunIdx(idx); setFrameIdx(0); setLog([]); setRunning(true) }

  const statusColor = (s) => {
    if (s === 'GUIDING') return '#FF6B35'
    if (s === 'IMPACT') return '#ef4444'
    if (s === 'DESCENT') return '#ffffff'
    return '#666'
  }

  return (
    <div style={{ padding: 24, display: 'flex', gap: 16, height: 'calc(100vh - 52px)' }}>
      {/* Left: Run selector */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ ...panelStyle, height: '100%' }}>
          <div style={headingStyle}>Select Run</div>
          {runs.map((r, i) => (
            <div
              key={r.label}
              onClick={() => startRun(i)}
              style={{
                padding: '8px 10px', marginBottom: 4, borderRadius: 4, cursor: 'pointer',
                background: runIdx === i ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: `1px solid ${runIdx === i ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 12, color: r.color, fontWeight: 600 }}>{r.label}</div>
              {r.guided && (
                <div style={{ fontSize: 10, color: C.textDim }}>
                  Miss: {r.miss}m — {r.success ? 'HIT' : 'MISS'}
                </div>
              )}
              {!r.guided && <div style={{ fontSize: 10, color: C.textDim }}>Ballistic reference</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Telemetry feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Live gauges */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'TIME', value: fmt(traj.t[frame], 2), unit: 's' },
            { label: 'ALTITUDE', value: fmt(traj.z[frame], 0), unit: 'm' },
            { label: 'RANGE', value: fmt(traj.x[frame], 0), unit: 'm' },
            { label: 'MACH', value: fmt(traj.mach[frame], 3), unit: '' },
            { label: 'VELOCITY', value: fmt(Math.sqrt(traj.vx[frame]**2 + traj.vz[frame]**2), 0), unit: 'm/s' },
            { label: 'CROSSRANGE', value: fmt(traj.y[frame], 1), unit: 'm' },
          ].map(g => (
            <div key={g.label} style={{ ...panelStyle, flex: 1, textAlign: 'center', padding: '10px 4px' }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1.5 }}>{g.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: activeRun.color, fontFamily: mono, marginTop: 4 }}>
                {g.value}
              </div>
              <div style={{ fontSize: 9, color: C.textDim }}>{g.unit}</div>
            </div>
          ))}
        </div>

        {/* Terminal log */}
        <div style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ ...headingStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Flight Telemetry — {activeRun.label}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => running ? setRunning(false) : setRunning(true)}
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                  borderRadius: 3, color: C.text, padding: '2px 10px', fontSize: 10, cursor: 'pointer', fontFamily: mono }}>
                {running ? 'PAUSE' : 'RUN'}
              </button>
              <button onClick={reset}
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                  borderRadius: 3, color: C.text, padding: '2px 10px', fontSize: 10, cursor: 'pointer', fontFamily: mono }}>
                RESET
              </button>
              {[1, 5, 15, 30].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  style={{ background: speed === s ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${speed === s ? 'rgba(255,255,255,0.12)' : C.border}`,
                    borderRadius: 3, color: speed === s ? C.textBright : C.textDim,
                    padding: '2px 6px', fontSize: 9, cursor: 'pointer', fontFamily: mono }}>
                  {s}x
                </button>
              ))}
            </div>
          </div>
          <div ref={logRef} style={{
            flex: 1, overflow: 'auto', fontFamily: mono, fontSize: 11,
            lineHeight: 1.7, padding: '8px 0', color: C.text,
          }}>
            <div style={{ color: C.textDim, marginBottom: 8 }}>
              {'>'} ESFORGE SIMULATION NETWORK — PGK FLIGHT TELEMETRY
            </div>
            <div style={{ color: C.textDim, marginBottom: 4 }}>
              {'>'} {activeRun.label.toUpperCase()} | CHARGE {data.charge} | MV {data.muzzle_velocity} m/s | QE {data.qe_mils} mils
            </div>
            {activeRun.guided && (
              <div style={{ color: C.textDim, marginBottom: 8 }}>
                {'>'} TARGET: ({activeRun.target.x}, {activeRun.target.y}) | CEP {'<'} {data.system_info.cep_target}m
              </div>
            )}
            <div style={{ color: C.textDim, marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
              {'  '}T(s){'     '}ALT(m){'   '}RNG(m){'   '}MACH{'    '}VEL(m/s){'  '}STATUS
            </div>
            {log.map((entry, i) => (
              <div key={i}>
                <span style={{ color: C.textDim }}> </span>
                <span>{pad(entry.t, 7)}</span>
                <span>{pad(entry.alt, 8)}</span>
                <span>{pad(entry.range, 8)}</span>
                <span>{pad(entry.mach, 8)}</span>
                <span>{pad(entry.vel, 9)}</span>
                <span style={{ color: statusColor(entry.status), fontWeight: 600 }}>{'  '}{entry.status}</span>
              </div>
            ))}
            {!running && frameIdx >= traj.t.length - 2 && (
              <div style={{ marginTop: 8, color: activeRun.guided ? activeRun.color : '#b45454', fontWeight: 600 }}>
                {'>'} IMPACT — RANGE: {fmt(traj.x[traj.x.length-1], 0)}m | CROSSRANGE: {fmt(traj.y[traj.y.length-1], 1)}m
                {activeRun.guided && ` | MISS: ${activeRun.miss}m | ${activeRun.success ? 'WITHIN CEP ✓' : 'OUTSIDE CEP ✗'}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
