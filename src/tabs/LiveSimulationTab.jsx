import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'
import { C, font, panelStyle } from '../theme.js'
import Projectile from '../Projectile.jsx'
import TargetMarker from '../TargetMarker.jsx'
import ImpactMarker from '../ImpactMarker.jsx'
import GroundPlane from '../GroundPlane.jsx'

const S = 1 / 1000

// --- Trajectory line (reused from existing) ---
function TrajectoryLine({ traj, scale, color, currentT }) {
  const fullPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i < traj.t.length; i++) {
      pts.push(new THREE.Vector3(traj.x[i] * scale, traj.z[i] * scale, traj.y[i] * scale))
    }
    return pts
  }, [traj, scale])

  const activeCount = useMemo(() => {
    let idx = 0
    for (let i = 0; i < traj.t.length; i++) {
      if (traj.t[i] <= currentT) idx = i + 1; else break
    }
    return Math.max(2, idx)
  }, [traj.t, currentT])

  const activeGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(fullPoints.slice(0, activeCount)), [fullPoints, activeCount])
  const ghostGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(fullPoints), [fullPoints])

  return (
    <group>
      <line geometry={ghostGeo}><lineBasicMaterial color={color} transparent opacity={0.08} /></line>
      <line geometry={activeGeo}><lineBasicMaterial color={color} transparent opacity={0.6} /></line>
    </group>
  )
}

// --- Single flight scene ---
function FlightScene({ traj, target, impact, color, label, guided, currentT, maxT, fired, impacted }) {
  const interpPos = useCallback((tr, t) => {
    const times = tr.t
    if (t <= times[0]) return [tr.x[0] * S, tr.z[0] * S, tr.y[0] * S]
    if (t >= times[times.length - 1]) return [tr.x[times.length - 1] * S, tr.z[times.length - 1] * S, tr.y[times.length - 1] * S]
    let lo = 0, hi = times.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid; else hi = mid }
    const frac = (t - times[lo]) / (times[hi] - times[lo])
    return [
      (tr.x[lo] + frac * (tr.x[hi] - tr.x[lo])) * S,
      (tr.z[lo] + frac * (tr.z[hi] - tr.z[lo])) * S,
      (tr.y[lo] + frac * (tr.y[hi] - tr.y[lo])) * S,
    ]
  }, [])

  const interpMach = useCallback((tr, t) => {
    const times = tr.t
    if (t <= times[0]) return tr.mach[0]
    if (t >= times[times.length - 1]) return tr.mach[times.length - 1]
    let lo = 0, hi = times.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid; else hi = mid }
    const frac = (t - times[lo]) / (times[hi] - times[lo])
    return tr.mach[lo] + frac * (tr.mach[hi] - tr.mach[lo])
  }, [])

  const pos = fired ? interpPos(traj, currentT) : [0, 0, 0]
  const mach = fired ? interpMach(traj, currentT) : 0
  const targetPos = target ? [target.x * S, 0, target.y * S] : null
  const impactPos = impact ? [impact.x * S, 0, impact.y * S] : null

  return (
    <>
      <ambientLight intensity={0.5} color="#d0d8e8" />
      <directionalLight position={[10, 15, 5]} intensity={1.5} color="#fff5e6" castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-far={50} shadow-camera-left={-15} shadow-camera-right={15}
        shadow-camera-top={15} shadow-camera-bottom={-15} />
      <hemisphereLight args={['#8aa4c0', '#2a3a28', 0.4]} />
      <color attach="background" args={['#1a2030']} />
      <fog attach="fog" args={['#1a2030', 15, 35]} />

      <GroundPlane />
      <Grid args={[20, 20]} position={[5, 0.001, 0]}
        cellSize={0.5} cellThickness={0.4} cellColor="#1e2a1e"
        sectionSize={2} sectionThickness={0.8} sectionColor="#2a3d2a"
        fadeDistance={25} fadeStrength={1} infiniteGrid />

      {/* Muzzle */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.15, 8]} />
        <meshStandardMaterial color="#6a6a6a" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Label */}
      <Text position={[0, 0.35, 0]} fontSize={0.12} color={color} anchorX="center" anchorY="bottom"
        outlineWidth={0.004} outlineColor="#111">
        {label}
      </Text>

      {fired && (
        <>
          <TrajectoryLine traj={traj} scale={S} color={color} currentT={currentT} />
          <Projectile position={pos} color={color} mach={mach} guided={guided} />
          {targetPos && <TargetMarker position={targetPos} color="#6b8fa3" label="TARGET" />}
          {impacted && impactPos && <ImpactMarker position={impactPos} color={color} label={`IMPACT`} />}
        </>
      )}

      <OrbitControls target={[4, 0.5, 0.1]} maxDistance={30} minDistance={1}
        maxPolarAngle={Math.PI / 2 - 0.05} enableDamping dampingFactor={0.05} />
    </>
  )
}

// --- Playback driver (runs inside a Canvas) ---
function PlaybackDriver({ fired, speed, onTick, maxT }) {
  useFrame((_, delta) => {
    if (fired) onTick(delta * speed)
  })
  return null
}

// --- Telemetry gauge ---
function Gauge({ label, value, unit, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#999', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent ? C.accent : C.textBright, fontFamily: "'IBM Plex Mono', monospace" }}>
        {value}
      </div>
      {unit && <div style={{ fontSize: 11, color: '#777' }}>{unit}</div>}
    </div>
  )
}

// --- Main tab ---
export default function LiveSimulationTab({ data }) {
  const [fired, setFired] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [impacted, setImpacted] = useState(false)

  // Pick one guided run for comparison
  const guidedRun = data.guided_runs[0]
  const unguidedTraj = data.unguided.trajectory
  const guidedTraj = guidedRun.trajectory

  const maxT = Math.max(
    unguidedTraj.t[unguidedTraj.t.length - 1],
    guidedTraj.t[guidedTraj.t.length - 1]
  )

  const currentT = Math.min(elapsed, maxT)

  // Interpolate values for telemetry
  const interp = useCallback((traj, t, key) => {
    const times = traj.t, vals = traj[key]
    if (t <= times[0]) return vals[0]
    if (t >= times[times.length - 1]) return vals[times.length - 1]
    let lo = 0, hi = times.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid; else hi = mid }
    const frac = (t - times[lo]) / (times[hi] - times[lo])
    return vals[lo] + frac * (vals[hi] - vals[lo])
  }, [])

  const gAlt = fired ? interp(guidedTraj, currentT, 'z') : 0
  const gRange = fired ? interp(guidedTraj, currentT, 'x') : 0
  const gMach = fired ? interp(guidedTraj, currentT, 'mach') : 0
  const uAlt = fired ? interp(unguidedTraj, currentT, 'z') : 0
  const uRange = fired ? interp(unguidedTraj, currentT, 'x') : 0

  // Detect phase
  const gVz = fired ? interp(guidedTraj, currentT, 'vz') : 0
  const phase = !fired ? 'STANDBY'
    : currentT >= maxT * 0.97 ? 'IMPACT'
    : gMach < 0.9 && gVz < 0 ? 'TERMINAL'
    : gVz < 0 ? 'GUIDING'
    : 'ASCENT'

  const phaseColor = { STANDBY: '#666', ASCENT: '#0ea5e9', GUIDING: '#FF6B35', TERMINAL: '#ef4444', IMPACT: '#16a34a' }

  useEffect(() => {
    if (elapsed >= maxT && fired) setImpacted(true)
  }, [elapsed, maxT, fired])

  const handleFire = () => {
    setFired(false)
    setElapsed(0)
    setImpacted(false)
    setTimeout(() => setFired(true), 100)
  }

  const handleTick = useCallback((dt) => {
    setElapsed(prev => {
      const next = prev + dt
      return next >= maxT ? maxT : next
    })
  }, [maxT])

  // Miss distances
  const unguidedMiss = data.unguided.impact
    ? Math.sqrt(Math.pow(data.unguided.impact.x - guidedRun.target.x, 2) + Math.pow(data.unguided.impact.y - guidedRun.target.y, 2))
    : 161
  const guidedMiss = guidedRun.miss

  return (
    <div style={{ padding: 36, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ ...panelStyle, marginBottom: 16, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
            Live Simulation
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.textBright }}>
            Unguided vs Guided — Side by Side
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 5, 10].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              background: speed === s ? '#333' : 'transparent', border: `1px solid ${speed === s ? '#555' : C.border}`,
              borderRadius: 6, color: speed === s ? '#fff' : '#888', padding: '6px 14px', fontSize: 14,
              fontFamily: font, cursor: 'pointer', fontWeight: speed === s ? 700 : 400,
            }}>{s}x</button>
          ))}
        </div>
      </div>

      {/* Main content: 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: Unguided */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden', borderRadius: 12, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 14, left: 18, zIndex: 10,
            fontSize: 14, letterSpacing: 2, fontWeight: 700, color: '#b45454',
            background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 6,
          }}>UNGUIDED</div>
          <Canvas camera={{ position: [2, 3, 6], fov: 45 }} shadows style={{ background: '#1a2030' }}>
            <PlaybackDriver fired={fired} speed={speed} onTick={handleTick} maxT={maxT} />
            <FlightScene
              traj={unguidedTraj}
              target={guidedRun.target}
              impact={data.unguided.impact}
              color="#b45454"
              label="UNGUIDED"
              guided={false}
              currentT={currentT}
              maxT={maxT}
              fired={fired}
              impacted={impacted}
            />
          </Canvas>
        </div>

        {/* Center: Telemetry + Fire */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Phase indicator */}
          <div style={{
            ...panelStyle, padding: '14px 16px', textAlign: 'center',
            borderLeft: `4px solid ${phaseColor[phase]}`,
          }}>
            <div style={{ fontSize: 11, color: '#999', letterSpacing: 2, marginBottom: 4 }}>FLIGHT PHASE</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: phaseColor[phase], letterSpacing: 3 }}>{phase}</div>
          </div>

          {/* Time */}
          <div style={{ ...panelStyle, padding: '12px 16px', textAlign: 'center' }}>
            <Gauge label="TIME" value={currentT.toFixed(1)} unit="seconds" />
          </div>

          {/* Guided telemetry */}
          <div style={{ ...panelStyle, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>GUIDED</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Gauge label="ALT" value={Math.round(gAlt)} unit="m" />
              <Gauge label="RANGE" value={(gRange / 1000).toFixed(1)} unit="km" />
              <Gauge label="MACH" value={gMach.toFixed(2)} unit="" accent />
              <Gauge label="MISS" value={impacted ? guidedMiss.toFixed(0) : '---'} unit="m" accent={impacted} />
            </div>
          </div>

          {/* Unguided telemetry */}
          <div style={{ ...panelStyle, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#b45454', letterSpacing: 2, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>UNGUIDED</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Gauge label="ALT" value={Math.round(uAlt)} unit="m" />
              <Gauge label="RANGE" value={(uRange / 1000).toFixed(1)} unit="km" />
              <Gauge label="MISS" value={impacted ? Math.round(unguidedMiss) : '---'} unit="m" />
            </div>
          </div>

          {/* FIRE button */}
          <button onClick={handleFire} style={{
            background: fired && !impacted ? '#333' : '#FF6B35',
            border: 'none', borderRadius: 12, padding: '18px 24px',
            fontSize: 22, fontWeight: 700, color: '#fff', cursor: 'pointer',
            letterSpacing: 4, fontFamily: font,
            transition: 'all 0.2s',
            opacity: fired && !impacted ? 0.5 : 1,
          }}>
            {!fired ? 'FIRE' : impacted ? 'FIRE AGAIN' : 'IN FLIGHT...'}
          </button>

          {/* Result card */}
          {impacted && (
            <div style={{
              ...panelStyle, padding: '14px 16px', textAlign: 'center',
              borderTop: `4px solid ${C.accent}`,
              animation: 'fadeIn 0.5s ease',
            }}>
              <div style={{ fontSize: 11, color: '#999', letterSpacing: 2, marginBottom: 6 }}>CEP REDUCTION</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: C.accent }}>
                {Math.round(unguidedMiss)} → {guidedMiss.toFixed(0)} m
              </div>
              <div style={{ fontSize: 16, color: C.textDim, marginTop: 4 }}>
                {(unguidedMiss / guidedMiss).toFixed(1)}x improvement
              </div>
            </div>
          )}
        </div>

        {/* Right: Guided */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden', borderRadius: 12, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 14, left: 18, zIndex: 10,
            fontSize: 14, letterSpacing: 2, fontWeight: 700, color: '#5a9e6f',
            background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 6,
          }}>GUIDED</div>
          <Canvas camera={{ position: [2, 3, 6], fov: 45 }} shadows style={{ background: '#1a2030' }}>
            <FlightScene
              traj={guidedTraj}
              target={guidedRun.target}
              impact={guidedRun.impact}
              color="#5a9e6f"
              label="GUIDED"
              guided={true}
              currentT={currentT}
              maxT={maxT}
              fired={fired}
              impacted={impacted}
            />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
