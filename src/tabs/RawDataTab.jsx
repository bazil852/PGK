import { useState, useEffect, useRef, useCallback } from 'react'
import { C, font } from '../theme.js'

const MONO = "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace"
const GREEN = '#4ade80'
const AMBER = '#fbbf24'
const CYAN = '#22d3ee'
const DIM = '#555'
const BRIGHT = '#e0e0e0'

function fmtNum(n, w = 10, d = 3) {
  return n.toFixed(d).padStart(w)
}

function generateLogLine(traj, t, idx, maxT) {
  const times = traj.t
  if (t <= times[0]) return null

  let lo = 0, hi = times.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid; else hi = mid }
  const frac = (t - times[lo]) / (times[hi] - times[lo])
  const lerp = (arr) => arr[lo] + frac * (arr[hi] - arr[lo])

  const x = lerp(traj.x), y = lerp(traj.y), z = lerp(traj.z)
  const vx = lerp(traj.vx), vy = lerp(traj.vy), vz = lerp(traj.vz)
  const mach = lerp(traj.mach)
  const V = Math.sqrt(vx * vx + vy * vy + vz * vz)
  const qbar = 0.5 * 1.225 * V * V * Math.exp(-z / 8500)  // approx dynamic pressure
  const alpha = Math.atan2(vz, vx) * 180 / Math.PI
  const phase = vz > 0 ? 'ASCENT' : mach > 0.9 ? 'GUIDING' : 'TERMINAL'

  // Simulate guidance commands
  const corrFrac = t / maxT
  const cmdLat = corrFrac > 0.45 ? (0.19 * Math.sin(t * 0.3 + 1.2)).toFixed(3) : '0.000'
  const cmdNorm = corrFrac > 0.45 ? (0.12 * Math.cos(t * 0.2)).toFixed(3) : '0.000'
  const canardDeg = corrFrac > 0.45 ? (2.0 * Math.sin(t * 0.4)).toFixed(2) : '0.00'
  const iLoad = corrFrac > 0.45 ? (2.5 + 1.5 * Math.sin(t * 0.5)).toFixed(2) : '0.00'

  // Spin rates
  const pBody = (-1130 + 30 * (t / maxT)).toFixed(1)
  const pNose = t < 0.43 ? pBody : (Math.max(0, -1130 * Math.exp(-(t - 0.43) / 0.25))).toFixed(1)

  return {
    t, x, y, z, vx, vy, vz, V, mach, qbar, alpha, phase,
    cmdLat, cmdNorm, canardDeg, iLoad, pBody, pNose, idx,
  }
}

export default function RawDataTab({ data }) {
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [elapsed, setElapsed] = useState(0)
  const [lines, setLines] = useState([])
  const logRef = useRef(null)
  const rafRef = useRef(null)
  const lastRef = useRef(0)
  const idxRef = useRef(0)

  const traj = data.unguided.trajectory
  const maxT = traj.t[traj.t.length - 1]

  const reset = () => {
    setRunning(false)
    setElapsed(0)
    setLines([])
    idxRef.current = 0
    lastRef.current = 0
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  const start = () => {
    reset()
    setTimeout(() => {
      lastRef.current = performance.now()
      setRunning(true)
    }, 100)
  }

  useEffect(() => {
    if (!running) return
    let active = true

    const tick = (now) => {
      if (!active) return
      const dt = (now - lastRef.current) / 1000 * speed
      lastRef.current = now

      setElapsed(prev => {
        const next = Math.min(prev + dt, maxT)
        const line = generateLogLine(traj, next, idxRef.current++, maxT)
        if (line) {
          setLines(prev => {
            const updated = [...prev, line]
            return updated.length > 200 ? updated.slice(-200) : updated
          })
        }
        if (next >= maxT) { setRunning(false); return maxT }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [running, speed, traj, maxT])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [lines])

  const phase = elapsed === 0 ? 'IDLE' : elapsed >= maxT ? 'COMPLETE' : lines.length > 0 ? lines[lines.length - 1].phase : 'INIT'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0e14', color: BRIGHT, fontFamily: MONO }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px', borderBottom: '1px solid #1a2030', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: GREEN, fontSize: 14, fontWeight: 700, letterSpacing: 2 }}>RAW TELEMETRY</span>
          <span style={{ color: DIM, fontSize: 13 }}>6DOF · 13-STATE · RK4 @ 0.05s</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 5, 10].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              background: speed === s ? '#333' : 'transparent', border: `1px solid ${speed === s ? '#555' : '#222'}`,
              borderRadius: 4, color: speed === s ? '#fff' : '#666', padding: '4px 12px', fontSize: 13,
              fontFamily: MONO, cursor: 'pointer',
            }}>{s}x</button>
          ))}
          <button onClick={running ? reset : start} style={{
            background: running ? '#dc2626' : GREEN, border: 'none', borderRadius: 6,
            color: running ? '#fff' : '#000', padding: '6px 20px', fontSize: 14, fontWeight: 700,
            fontFamily: MONO, cursor: 'pointer', letterSpacing: 2, marginLeft: 8,
          }}>{running ? 'ABORT' : elapsed >= maxT ? 'RERUN' : 'START SIM'}</button>
        </div>
      </div>

      {/* Status strip */}
      <div style={{
        display: 'flex', gap: 24, padding: '8px 24px', borderBottom: '1px solid #1a2030',
        fontSize: 13, flexShrink: 0,
      }}>
        <span>T+ <span style={{ color: AMBER, fontWeight: 700 }}>{elapsed.toFixed(2)}s</span></span>
        <span>PHASE: <span style={{ color: phase === 'GUIDING' ? C.accent : phase === 'COMPLETE' ? GREEN : CYAN, fontWeight: 700 }}>{phase}</span></span>
        <span>FRAMES: <span style={{ color: BRIGHT }}>{lines.length}</span></span>
        <span>MAX_T: <span style={{ color: DIM }}>{maxT.toFixed(2)}s</span></span>
        <span style={{ marginLeft: 'auto', color: DIM }}>M107 155mm · STANAG-4355 · ISA 8-Layer</span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '70px 100px 100px 80px 90px 90px 90px 80px 70px 80px 80px 80px',
        padding: '6px 24px', borderBottom: '1px solid #1a2030', fontSize: 11, color: DIM,
        letterSpacing: 1.5, flexShrink: 0,
      }}>
        <span>T (s)</span><span>X (m)</span><span>Y (m)</span><span>Z (m)</span>
        <span>V (m/s)</span><span>MACH</span><span>Q̄ (Pa)</span>
        <span>α (°)</span><span>p_b</span><span>a_lat</span><span>δ_c (°)</span><span>i_ld (A)</span>
      </div>

      {/* Scrolling log */}
      <div ref={logRef} style={{
        flex: 1, overflow: 'auto', padding: '0 24px',
        fontSize: 13, lineHeight: 1.8,
      }}>
        {lines.map((l, i) => {
          const isGuiding = l.phase === 'GUIDING'
          const rowColor = isGuiding ? 'rgba(255,107,53,0.04)' : 'transparent'
          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '70px 100px 100px 80px 90px 90px 90px 80px 70px 80px 80px 80px',
              background: rowColor,
              borderLeft: isGuiding ? `2px solid ${C.accent}` : '2px solid transparent',
              paddingLeft: 2,
            }}>
              <span style={{ color: AMBER }}>{l.t.toFixed(2)}</span>
              <span style={{ color: BRIGHT }}>{l.x.toFixed(1)}</span>
              <span style={{ color: BRIGHT }}>{l.y.toFixed(1)}</span>
              <span style={{ color: CYAN }}>{l.z.toFixed(1)}</span>
              <span style={{ color: BRIGHT }}>{l.V.toFixed(1)}</span>
              <span style={{ color: l.mach > 1 ? '#ef4444' : GREEN, fontWeight: l.mach > 1 ? 700 : 400 }}>{l.mach.toFixed(3)}</span>
              <span style={{ color: DIM }}>{l.qbar.toFixed(0)}</span>
              <span style={{ color: DIM }}>{l.alpha.toFixed(2)}</span>
              <span style={{ color: '#6366f1' }}>{l.pBody}</span>
              <span style={{ color: isGuiding ? C.accent : DIM }}>{l.cmdLat}</span>
              <span style={{ color: isGuiding ? C.accent : DIM }}>{l.canardDeg}</span>
              <span style={{ color: isGuiding ? AMBER : DIM }}>{l.iLoad}</span>
            </div>
          )
        })}
        {elapsed >= maxT && lines.length > 0 && (
          <div style={{ padding: '16px 0', borderTop: '1px solid #1a2030', marginTop: 8 }}>
            <span style={{ color: GREEN, fontWeight: 700 }}>═══ SIMULATION COMPLETE ═══</span>
            <span style={{ color: DIM, marginLeft: 16 }}>
              {lines.length} frames · {maxT.toFixed(2)}s flight time · IMPACT at ({lines[lines.length-1].x.toFixed(0)}, {lines[lines.length-1].y.toFixed(0)}) m
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
