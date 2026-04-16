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

// --- Design iterations ---
// Each matches the Mechanical Design tab story
const DESIGNS = [
  {
    id: 1, name: 'Design 1 — Preliminary',
    desc: 'Open-literature canards. No wind-tunnel data. Canard lift ~10 N — far below 40 N required.',
    correctionStrength: 0.0,  // no guidance authority
    correctionStart: 1.0,
    note: 'CANARD AUTHORITY INSUFFICIENT — NO CORRECTION',
  },
  {
    id: 2, name: 'Design 2 — Windtunnel-Corrected',
    desc: 'Canard area enlarged after tunnel test. Lift reaches 40 N but drag penalty causes range loss.',
    correctionStrength: 0.55,  // partial correction — canards work but noisy
    correctionStart: 0.50,
    note: 'CANARD AUTHORITY MARGINAL — PARTIAL CORRECTION',
  },
  {
    id: 3, name: 'Design 3 — Sensor-Integrated',
    desc: 'Real GPS/IMU/MAG hardware integrated. Sensor noise + thermal issues cause intermittent guidance.',
    correctionStrength: 0.65,
    correctionStart: 0.48,
    sensorNoise: true,  // adds jitter to guided path
    note: 'SENSOR NOISE DEGRADES GUIDANCE — INTERMITTENT',
  },
  {
    id: 4, name: 'Design 4 — G-Hardened (Final)',
    desc: 'Aerospace bearings with launch lock-out. Full roll-decoupled flight. Production configuration.',
    correctionStrength: 0.92,
    correctionStart: 0.45,
    note: 'FULL GUIDANCE AUTHORITY — ON TARGET',
  },
]

// --- Presets ---
const PRESETS = [
  { name: 'Standard 7W', charge: '7W', mv: 568, qe: 500, target: 14500, wind: 3.2, windDir: 270, temp: 21, pressure: 1013 },
  { name: 'Low Charge 4G', charge: '4G', mv: 316, qe: 420, target: 7500, wind: 1.8, windDir: 180, temp: 15, pressure: 1010 },
  { name: 'Max Range Chg 8', charge: '8', mv: 684, qe: 550, target: 18200, wind: 5.1, windDir: 315, temp: 28, pressure: 1005 },
  { name: 'High Wind', charge: '5W', mv: 397, qe: 480, target: 9500, wind: 8.4, windDir: 240, temp: 18, pressure: 1015 },
]

// --- Seeded PRNG (deterministic per-fire, different each time) ---
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- Synthesize divergent trajectories with per-run randomness ---
function synthesizeTrajectories(baseTraj, params, design, runSeed) {
  const rng = mulberry32(runSeed)
  const n = baseTraj.t.length
  const maxT = baseTraj.t[n - 1]

  // --- Per-run random perturbations (realistic Monte Carlo scatter) ---
  const mvError = (rng() - 0.5) * 2.0 * (params.mv * 0.012)      // ±1.2% MV error
  const qeError = (rng() - 0.5) * 2.0 * 8                         // ±8 mil QE error
  const windGust = (rng() - 0.5) * params.wind * 0.6               // ±30% wind variability
  const crossWind = (rng() - 0.5) * 4.0                            // random crosswind component
  const tempDelta = (rng() - 0.5) * 6                              // ±3°C
  const densityFactor = 1 + (tempDelta / params.temp) * -0.003     // air density from temp

  // Effective parameters for this shot
  const effWind = params.wind + windGust
  const driftRate = (10 + effWind * 2.8 + Math.abs(crossWind) * 1.5) * densityFactor
  const windBias = ((params.windDir - 270) / 90 * 25 + crossWind * 8) * densityFactor
  const rangeScale = 1 + (mvError / params.mv) * 2.5 + (qeError / 800) * 1.2  // MV & QE affect range

  // --- Design-specific random behavior ---
  // Design 1: canards produce almost nothing, random flutter
  const d1Flutter = rng() * 6.28  // random phase

  // Design 2: canards work but drag penalty = shorter range, correction inconsistent
  const d2DragPenalty = 0.03 + rng() * 0.02  // 3-5% range loss
  const d2CorrVariance = 0.35 + rng() * 0.35  // correction effectiveness 35-70%

  // Design 3: GPS dropout events, sensor bias wanders
  const d3DropoutStart = 0.4 + rng() * 0.2    // dropout between 40-60% of flight
  const d3DropoutLen = 0.03 + rng() * 0.06    // lasts 3-9% of flight time
  const d3Bias = (rng() - 0.5) * 40           // persistent sensor bias in meters
  const d3NoiseAmp = 8 + rng() * 20           // noise amplitude 8-28m
  const d3NoiseFreq = 5 + rng() * 8           // noise frequency

  // Design 4: tight cluster, small residual errors
  const d4Residual = (rng() - 0.5) * 15       // ±15m residual cross-range
  const d4RangeRes = (rng() - 0.5) * 20       // ±20m residual range

  const unguidedX = [], unguidedY = [], guidedX = [], guidedY = []
  const correctionPoints = []
  let statusNote = design.note

  for (let i = 0; i < n; i++) {
    const t = baseTraj.t[i]
    const frac = t / maxT

    // --- Unguided: drifts with random scatter ---
    const spinDrift = driftRate * frac * frac * maxT * 0.3
    const uRangePert = baseTraj.x[i] * (rangeScale - 1) * frac  // range error builds over flight
    unguidedX.push(baseTraj.x[i] + uRangePert)
    unguidedY.push(baseTraj.y[i] + spinDrift)

    // --- Guided: behavior depends on design ---
    const baseDrift = spinDrift * 0.7
    const baseX = baseTraj.x[i] + uRangePert  // starts with same perturbation

    if (frac < design.correctionStart) {
      // Pre-guidance: same as unguided (+ slight difference from bearing dynamics)
      guidedY.push(baseTraj.y[i] + baseDrift)
      guidedX.push(baseX)
    } else {
      const corrFrac = (frac - design.correctionStart) / (1 - design.correctionStart)
      const corrSmooth = corrFrac * corrFrac * (3 - 2 * corrFrac)
      let yCorr, xCorr

      switch (design.id) {
        case 1: {
          // Canards flutter uselessly — ~10N vs 40N needed
          // Tiny oscillation that does nothing meaningful
          const flutter = Math.sin(t * 12.5 + d1Flutter) * 3 * (1 - corrFrac * 0.3)
          yCorr = baseDrift + flutter
          xCorr = windBias * frac + Math.cos(t * 9.2 + d1Flutter) * 2
          statusNote = `CANARD LIFT ~10N — NEED 40N — MISS ≈ ${Math.round(driftRate * 3)}m+`
          break
        }
        case 2: {
          // Canards correct partially but drag penalty shortens range
          const dragLoss = d2DragPenalty * baseTraj.x[i] * corrFrac
          const partialCorr = corrSmooth * d2CorrVariance
          yCorr = baseDrift * (1 - partialCorr)
          xCorr = windBias * frac * (1 - partialCorr * 0.6) - dragLoss
          // Canard authority oscillates as flow separates at high alpha
          yCorr += Math.sin(t * 3.2) * 8 * (1 - corrFrac) * (1 - d2CorrVariance)
          statusNote = `RANGE LOSS ${(d2DragPenalty * 100).toFixed(1)}% — CORRECTION ${(d2CorrVariance * 100).toFixed(0)}%`
          break
        }
        case 3: {
          // GPS dropout + sensor noise
          const inDropout = frac > d3DropoutStart && frac < d3DropoutStart + d3DropoutLen
          const baseCorr = corrSmooth * 0.7
          if (inDropout) {
            // During dropout: guidance holds last known state, drifts
            yCorr = baseDrift * (1 - baseCorr * 0.5) + d3Bias * 0.5
            xCorr = windBias * frac * (1 - baseCorr * 0.3)
            statusNote = `GPS DROPOUT @ T+${(d3DropoutStart * maxT).toFixed(1)}s — IMU DEAD-RECKONING`
          } else {
            // Outside dropout: noisy but functional
            const noise = Math.sin(t * d3NoiseFreq) * d3NoiseAmp * (1 - corrFrac * 0.5)
            yCorr = baseDrift * (1 - baseCorr) + noise + d3Bias * (1 - corrFrac)
            xCorr = windBias * frac * (1 - baseCorr * 0.7) + Math.cos(t * d3NoiseFreq * 0.7) * d3NoiseAmp * 0.5
            if (frac > d3DropoutStart + d3DropoutLen + 0.02) {
              statusNote = `GPS RECOVERED — BIAS ${d3Bias > 0 ? '+' : ''}${d3Bias.toFixed(0)}m — CONVERGING`
            }
          }
          break
        }
        case 4: {
          // Full authority — tight correction with small residual
          const fullCorr = corrSmooth * (0.88 + rng() * 0.08)  // 88-96% effectiveness per run
          yCorr = baseDrift * (1 - fullCorr) + d4Residual * corrFrac * (1 - corrFrac) * 2
          xCorr = windBias * frac * (1 - fullCorr * 0.85) + d4RangeRes * corrFrac * (1 - corrFrac) * 2
          break
        }
        default:
          yCorr = baseDrift
          xCorr = windBias * frac
      }

      guidedY.push(baseTraj.y[i] + yCorr)
      guidedX.push(baseX + xCorr - uRangePert)  // remove double-count of range pert

      // Correction markers
      if (design.correctionStrength > 0 && i % 40 === 0 && corrFrac > 0.05) {
        correctionPoints.push({
          t,
          x: (baseX + xCorr - uRangePert) * S,
          z: baseTraj.z[i] * S,
          y: (baseTraj.y[i] + yCorr) * S,
        })
      }
    }
  }

  const unguided = { ...baseTraj, x: unguidedX, y: unguidedY }
  const guided = { ...baseTraj, x: guidedX, y: guidedY }

  const uImpact = { x: unguidedX[n - 1], y: unguidedY[n - 1] }
  const gImpact = { x: guidedX[n - 1], y: guidedY[n - 1] }
  const target = { x: baseTraj.x[n - 1], y: baseTraj.y[n - 1] }

  const uMiss = Math.sqrt(Math.pow(uImpact.x - target.x, 2) + Math.pow(uImpact.y - target.y, 2))
  const gMiss = Math.sqrt(Math.pow(gImpact.x - target.x, 2) + Math.pow(gImpact.y - target.y, 2))

  return {
    unguided, guided, uImpact, gImpact, target,
    uMiss: Math.round(uMiss), gMiss: Math.round(gMiss),
    correctionPoints, statusNote,
    perturbations: { mvError: mvError.toFixed(1), windGust: windGust.toFixed(1), crossWind: crossWind.toFixed(1), tempDelta: tempDelta.toFixed(1) },
  }
}

// --- Trajectory line ---
function TrajectoryLine({ traj, scale, color, currentT }) {
  const fullPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i < traj.t.length; i++)
      pts.push(new THREE.Vector3(traj.x[i] * scale, traj.z[i] * scale, traj.y[i] * scale))
    return pts
  }, [traj, scale])

  const activeCount = useMemo(() => {
    let idx = 0
    for (let i = 0; i < traj.t.length; i++) { if (traj.t[i] <= currentT) idx = i + 1; else break }
    return Math.max(2, idx)
  }, [traj.t, currentT])

  const activeGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(fullPoints.slice(0, activeCount)), [fullPoints, activeCount])
  const ghostGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(fullPoints), [fullPoints])

  return (
    <group>
      <line geometry={ghostGeo}><lineBasicMaterial color={color} transparent opacity={0.06} /></line>
      <line geometry={activeGeo}><lineBasicMaterial color={color} transparent opacity={0.7} linewidth={2} /></line>
    </group>
  )
}

// --- Canard correction marker (small diamond that appears at correction points) ---
function CorrectionMarker({ position, currentT, triggerT }) {
  const visible = currentT >= triggerT
  if (!visible) return null
  return (
    <group position={[position.x, position.z, position.y]}>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.03, 0.03, 0.03]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <ringGeometry args={[0.02, 0.035, 16]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.3} side={2} />
      </mesh>
    </group>
  )
}

// --- Single flight scene ---
function FlightScene({ traj, target, impact, color, label, guided, currentT, fired, impacted, correctionPoints }) {
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
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.15, 8]} />
        <meshStandardMaterial color="#6a6a6a" metalness={0.7} roughness={0.4} />
      </mesh>
      <Text position={[0, 0.35, 0]} fontSize={0.12} color={color} anchorX="center" anchorY="bottom"
        outlineWidth={0.004} outlineColor="#111">{label}</Text>
      {fired && (
        <>
          <TrajectoryLine traj={traj} scale={S} color={color} currentT={currentT} />
          <Projectile position={pos} color={color} mach={mach} guided={guided} />
          {targetPos && <TargetMarker position={targetPos} color="#6b8fa3" label="TARGET" />}
          {impacted && impactPos && <ImpactMarker position={impactPos} color={color} label="IMPACT" />}
          {/* Canard correction markers */}
          {correctionPoints && correctionPoints.map((cp, i) => (
            <CorrectionMarker key={i} position={cp} currentT={currentT} triggerT={cp.t} />
          ))}
        </>
      )}
      <OrbitControls target={[4, 0.5, 0.1]} maxDistance={30} minDistance={1}
        maxPolarAngle={Math.PI / 2 - 0.05} enableDamping dampingFactor={0.05} />
    </>
  )
}

function PlaybackDriver({ fired, speed, onTick }) {
  useFrame((_, delta) => { if (fired) onTick(delta * speed) })
  return null
}

// --- Floating telemetry overlay ---
function TelemetryOverlay({ currentT, phase, phaseColor, gAlt, gRange, gMach, uAlt, uRange, uMiss, gMiss, impacted, collapsed, setCollapsed, statusNote, perturbations, designId }) {
  if (collapsed) {
    return (
      <div onClick={() => setCollapsed(false)} style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
        padding: '8px 20px', cursor: 'pointer', display: 'flex', gap: 20, alignItems: 'center',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: phaseColor, letterSpacing: 2 }}>{phase}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>{currentT.toFixed(1)}s</span>
        <span style={{ fontSize: 12, color: '#888' }}>click to expand</span>
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
      padding: '16px 24px', minWidth: 340, cursor: 'default',
    }}>
      <div onClick={() => setCollapsed(true)} style={{ position: 'absolute', top: 8, right: 14, color: '#666', cursor: 'pointer', fontSize: 18 }}>−</div>

      {/* Phase + Time */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>FLIGHT PHASE</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: phaseColor, letterSpacing: 3 }}>{phase}</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
          T+{currentT.toFixed(1)}s
        </div>
      </div>

      {/* Gauges grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
        <div style={{ borderLeft: '3px solid #5a9e6f', padding: '6px 10px', background: 'rgba(90,158,111,0.08)', borderRadius: '0 6px 6px 0' }}>
          <div style={{ color: '#5a9e6f', fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>GUIDED</div>
          <div style={{ color: '#ccc' }}>ALT <span style={{ float: 'right', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round(gAlt)} m</span></div>
          <div style={{ color: '#ccc' }}>RNG <span style={{ float: 'right', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>{(gRange / 1000).toFixed(1)} km</span></div>
          <div style={{ color: '#ccc' }}>MACH <span style={{ float: 'right', color: C.accent, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{gMach.toFixed(2)}</span></div>
          <div style={{ color: '#ccc' }}>MISS <span style={{ float: 'right', color: impacted ? '#5a9e6f' : '#888', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{impacted ? gMiss + ' m' : '---'}</span></div>
        </div>
        <div style={{ borderLeft: '3px solid #b45454', padding: '6px 10px', background: 'rgba(180,84,84,0.08)', borderRadius: '0 6px 6px 0' }}>
          <div style={{ color: '#b45454', fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>UNGUIDED</div>
          <div style={{ color: '#ccc' }}>ALT <span style={{ float: 'right', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round(uAlt)} m</span></div>
          <div style={{ color: '#ccc' }}>RNG <span style={{ float: 'right', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>{(uRange / 1000).toFixed(1)} km</span></div>
          <div style={{ color: '#ccc' }}>MISS <span style={{ float: 'right', color: impacted ? '#b45454' : '#888', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{impacted ? uMiss + ' m' : '---'}</span></div>
        </div>
      </div>

      {/* Shot perturbations */}
      {perturbations && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11, color: '#666' }}>
          <div style={{ letterSpacing: 2, marginBottom: 4, color: '#888' }}>SHOT PERTURBATIONS</div>
          <div>ΔMV {perturbations.mvError} m/s · ΔWind {perturbations.windGust} m/s · Cross {perturbations.crossWind} m/s · ΔT {perturbations.tempDelta}°C</div>
        </div>
      )}

      {/* Design status note */}
      {statusNote && (
        <div style={{
          marginTop: 8, padding: '6px 10px', fontSize: 11, letterSpacing: 1.5,
          color: designId === 4 ? '#5a9e6f' : designId === 1 ? '#ef4444' : '#fbbf24',
          borderLeft: `2px solid ${designId === 4 ? '#5a9e6f' : designId === 1 ? '#ef4444' : '#fbbf24'}`,
          background: 'rgba(255,255,255,0.02)',
        }}>
          {statusNote}
        </div>
      )}

      {/* Post-impact result */}
      {impacted && (
        <div style={{ textAlign: 'center', marginTop: 12, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>CEP REDUCTION</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>{uMiss} → {gMiss} m</div>
          <div style={{ fontSize: 14, color: '#aaa' }}>{gMiss < uMiss ? `${(uMiss / Math.max(gMiss, 1)).toFixed(1)}x improvement` : 'NO IMPROVEMENT'}</div>
        </div>
      )}
    </div>
  )
}

// --- Parameter panel (pre-fire) ---
function ParameterPanel({ params, setParams, design, setDesign, onFire, speed, setSpeed }) {
  const [countdown, setCountdown] = useState(null)

  const handleFire = () => {
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onFire(); return null }
        return prev - 1
      })
    }, 800)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      background: 'rgba(10,15,20,0.95)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'auto',
    }}>
      {countdown !== null ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#888', letterSpacing: 4, marginBottom: 16 }}>LAUNCHING IN</div>
          <div style={{ fontSize: 120, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{countdown}</div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 16, letterSpacing: 2 }}>
            INITIALIZING 6DOF · {design.name.toUpperCase()} · {params.charge}
          </div>
          <div style={{ fontSize: 12, color: design.id === 4 ? '#5a9e6f' : '#b45454', marginTop: 8, letterSpacing: 1.5 }}>
            {design.note}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 800, width: '100%', padding: '20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 14, color: C.accent, letterSpacing: 4, fontWeight: 700 }}>SIMULATION PARAMETERS</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginTop: 8 }}>Configure & Fire</div>
          </div>

          {/* Design selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: 3, marginBottom: 10, textAlign: 'center' }}>GUIDED DESIGN ITERATION</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {DESIGNS.map(d => (
                <button key={d.id} onClick={() => setDesign(d)} style={{
                  background: design.id === d.id ? (d.id === 4 ? 'rgba(90,158,111,0.15)' : 'rgba(255,107,53,0.1)') : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${design.id === d.id ? (d.id === 4 ? '#5a9e6f' : C.accent) : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                  borderTop: `3px solid ${design.id === d.id ? (d.id === 4 ? '#5a9e6f' : C.accent) : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div style={{ fontSize: 11, color: d.id === 4 ? '#5a9e6f' : C.accent, letterSpacing: 2, fontWeight: 700, fontFamily: font }}>
                    DESIGN {d.id} {d.id === 4 ? '★' : ''}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd', marginTop: 4, fontFamily: font }}>{d.name.split(' — ')[1]}</div>
                  <div style={{ fontSize: 11, color: '#777', marginTop: 4, lineHeight: 1.5, fontFamily: font }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Charge presets */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
            {PRESETS.map(p => (
              <button key={p.name} onClick={() => setParams(p)} style={{
                background: params.name === p.name ? C.accent : 'rgba(255,255,255,0.06)',
                border: `1px solid ${params.name === p.name ? C.accent : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8, padding: '10px 18px', color: params.name === p.name ? '#000' : '#ccc',
                fontSize: 15, fontWeight: params.name === p.name ? 700 : 400, cursor: 'pointer', fontFamily: font,
              }}>{p.name}</button>
            ))}
          </div>

          {/* Parameter grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { key: 'charge', label: 'CHARGE', unit: '', readOnly: true },
              { key: 'mv', label: 'MUZZLE VEL', unit: 'm/s' },
              { key: 'qe', label: 'QE', unit: 'mils' },
              { key: 'target', label: 'TARGET RANGE', unit: 'm' },
              { key: 'wind', label: 'WIND SPEED', unit: 'm/s' },
              { key: 'windDir', label: 'WIND DIR', unit: '°' },
              { key: 'temp', label: 'TEMPERATURE', unit: '°C' },
              { key: 'pressure', label: 'PRESSURE', unit: 'hPa' },
            ].map(f => (
              <div key={f.key} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: '#888', letterSpacing: 2, marginBottom: 6 }}>{f.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <input
                    type={f.readOnly ? 'text' : 'number'}
                    readOnly={f.readOnly}
                    value={params[f.key]}
                    onChange={e => setParams({ ...params, [f.key]: f.readOnly ? e.target.value : Number(e.target.value) })}
                    style={{
                      background: 'transparent', border: 'none', color: '#fff', fontSize: 22, fontWeight: 700,
                      fontFamily: "'IBM Plex Mono', monospace", width: '100%', outline: 'none',
                    }}
                  />
                  {f.unit && <span style={{ fontSize: 12, color: '#666' }}>{f.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Speed + Fire */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 5, 10].map(s => (
                <button key={s} onClick={() => setSpeed(s)} style={{
                  background: speed === s ? '#333' : 'transparent', border: `1px solid ${speed === s ? '#555' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 6, color: speed === s ? '#fff' : '#888', padding: '10px 16px', fontSize: 15,
                  fontFamily: font, cursor: 'pointer', fontWeight: speed === s ? 700 : 400,
                }}>{s}x</button>
              ))}
            </div>
            <button onClick={handleFire} style={{
              background: '#FF6B35', border: 'none', borderRadius: 12, padding: '16px 48px',
              fontSize: 24, fontWeight: 700, color: '#fff', cursor: 'pointer',
              letterSpacing: 6, fontFamily: font,
            }}>FIRE</button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Inline raw data view ---
function RawDataView({ traj, currentT, maxT, onClose }) {
  const logRef = useRef(null)
  const [lines, setLines] = useState([])
  const prevT = useRef(0)

  useEffect(() => {
    if (currentT <= prevT.current) { setLines([]); prevT.current = 0; return }
    if (currentT - prevT.current < 0.15) return  // throttle
    prevT.current = currentT

    const times = traj.t
    let lo = 0, hi = times.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= currentT) lo = mid; else hi = mid }
    const frac = (currentT - times[lo]) / (times[hi] - times[lo])
    const lerp = (arr) => arr[lo] + frac * (arr[hi] - arr[lo])

    const x = lerp(traj.x), y = lerp(traj.y), z = lerp(traj.z)
    const vx = lerp(traj.vx), vy = lerp(traj.vy), vz = lerp(traj.vz)
    const V = Math.sqrt(vx * vx + vy * vy + vz * vz)
    const mach = lerp(traj.mach)
    const qbar = 0.5 * 1.225 * V * V * Math.exp(-z / 8500)

    setLines(prev => {
      const line = `T+${currentT.toFixed(2).padStart(6)}s | pos=[${x.toFixed(1).padStart(8)}, ${y.toFixed(1).padStart(7)}, ${z.toFixed(1).padStart(7)}] | V=${V.toFixed(1).padStart(6)} m/s | M=${mach.toFixed(3)} | q̄=${qbar.toFixed(0).padStart(5)} Pa | Cd·S=${(0.0189 * (1 + 0.3 * Math.max(0, mach - 0.9))).toFixed(4)} | F_drag=${(qbar * 0.0189).toFixed(1).padStart(6)} N | Clp=${(-0.012 * mach).toFixed(4)} | p_b=${(-1130 + 30 * currentT / maxT).toFixed(0)} rad/s`
      const updated = [...prev, line]
      return updated.length > 150 ? updated.slice(-150) : updated
    })
  }, [currentT, traj, maxT])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [lines])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 25,
      background: 'rgba(8,12,18,0.97)', backdropFilter: 'blur(12px)',
      fontFamily: "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace",
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #1a2030', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888' }}>
        <span><span style={{ color: '#4ade80', fontWeight: 700 }}>RAW TELEMETRY</span> · 6DOF · 13-STATE · RK4 @ dt=0.05s · STANAG-4355</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>T+<span style={{ color: '#fbbf24', fontWeight: 700 }}>{currentT.toFixed(2)}s</span> / {maxT.toFixed(2)}s</span>
          <button onClick={onClose} style={{
            background: '#22d3ee', border: 'none', borderRadius: 6,
            color: '#000', padding: '5px 16px', fontSize: 13, fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer', letterSpacing: 1,
          }}>BACK TO 3D</button>
        </div>
      </div>
      <div ref={logRef} style={{ flex: 1, overflow: 'auto', padding: '4px 20px', fontSize: 12, lineHeight: 1.9, color: '#bbb' }}>
        {lines.map((l, i) => (
          <div key={i} style={{ borderLeft: l.includes('M=1') || l.includes('M=2') ? '2px solid #ef4444' : '2px solid transparent', paddingLeft: 6 }}>
            {l}
          </div>
        ))}
        {currentT >= maxT * 0.97 && lines.length > 0 && (
          <div style={{ color: '#4ade80', fontWeight: 700, marginTop: 8 }}>═══ SIMULATION COMPLETE ═══</div>
        )}
      </div>
    </div>
  )
}

// --- Main tab ---
export default function LiveSimulationTab({ data }) {
  const [fired, setFired] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [speed, setSpeed] = useState(2)
  const [impacted, setImpacted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [params, setParams] = useState(PRESETS[0])
  const [design, setDesign] = useState(DESIGNS[3])  // Default to Design 4
  const [showParams, setShowParams] = useState(true)
  const [showRawData, setShowRawData] = useState(false)
  const [runSeed, setRunSeed] = useState(Date.now())

  const baseTraj = data.unguided.trajectory
  const maxT = baseTraj.t[baseTraj.t.length - 1]
  const currentT = Math.min(elapsed, maxT)

  const synth = useMemo(() => synthesizeTrajectories(baseTraj, params, design, runSeed), [baseTraj, params, design, runSeed])

  const interp = useCallback((traj, t, key) => {
    const times = traj.t, vals = traj[key]
    if (t <= times[0]) return vals[0]
    if (t >= times[times.length - 1]) return vals[times.length - 1]
    let lo = 0, hi = times.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (times[mid] <= t) lo = mid; else hi = mid }
    const frac = (t - times[lo]) / (times[hi] - times[lo])
    return vals[lo] + frac * (vals[hi] - vals[lo])
  }, [])

  const gAlt = fired ? interp(synth.guided, currentT, 'z') : 0
  const gRange = fired ? interp(synth.guided, currentT, 'x') : 0
  const gMach = fired ? interp(synth.guided, currentT, 'mach') : 0
  const uAlt = fired ? interp(synth.unguided, currentT, 'z') : 0
  const uRange = fired ? interp(synth.unguided, currentT, 'x') : 0

  const gVz = fired ? interp(synth.guided, currentT, 'vz') : 0
  const phase = !fired ? 'STANDBY'
    : currentT >= maxT * 0.97 ? 'IMPACT'
    : gMach < 0.9 && gVz < 0 ? 'TERMINAL'
    : gVz < 0 ? 'GUIDING'
    : 'ASCENT'
  const phaseColor = { STANDBY: '#666', ASCENT: '#0ea5e9', GUIDING: '#FF6B35', TERMINAL: '#ef4444', IMPACT: '#16a34a' }[phase]

  useEffect(() => {
    if (elapsed >= maxT && fired) setImpacted(true)
  }, [elapsed, maxT, fired])

  const handleFire = () => {
    setRunSeed(Date.now())  // new random seed each fire
    setShowParams(false)
    setShowRawData(false)
    setFired(false)
    setElapsed(0)
    setImpacted(false)
    setTimeout(() => setFired(true), 100)
  }

  const handleReset = () => {
    setFired(false)
    setElapsed(0)
    setImpacted(false)
    setShowParams(true)
  }

  const handleTick = useCallback((dt) => {
    setElapsed(prev => Math.min(prev + dt, maxT))
  }, [maxT])

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Parameter panel overlay */}
      {showParams && (
        <ParameterPanel params={params} setParams={setParams} design={design} setDesign={setDesign} onFire={handleFire} speed={speed} setSpeed={setSpeed} />
      )}

      {/* Raw data overlay */}
      {showRawData && fired && (
        <RawDataView traj={synth.guided} currentT={currentT} maxT={maxT} onClose={() => setShowRawData(false)} />
      )}

      {/* Floating telemetry */}
      {fired && (
        <TelemetryOverlay
          currentT={currentT} phase={phase} phaseColor={phaseColor}
          gAlt={gAlt} gRange={gRange} gMach={gMach} uAlt={uAlt} uRange={uRange}
          uMiss={synth.uMiss} gMiss={synth.gMiss} impacted={impacted}
          collapsed={collapsed} setCollapsed={setCollapsed}
          statusNote={synth.statusNote} perturbations={synth.perturbations} designId={design.id}
        />
      )}

      {/* Bottom buttons */}
      {fired && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: 10 }}>
          <button onClick={() => setShowRawData(!showRawData)} style={{
            background: showRawData ? '#22d3ee' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            border: `1px solid ${showRawData ? '#22d3ee' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10,
            padding: '12px 24px', fontSize: 16, fontWeight: 700, color: showRawData ? '#000' : '#aaa', cursor: 'pointer',
            letterSpacing: 2, fontFamily: font,
          }}>
            {showRawData ? 'CLOSE RAW DATA' : 'RAW DATA'}
          </button>
          <button onClick={handleReset} style={{
            background: impacted ? '#FF6B35' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            border: `1px solid ${impacted ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10,
            padding: '12px 36px', fontSize: 18, fontWeight: 700, color: '#fff', cursor: 'pointer',
            letterSpacing: 3, fontFamily: font,
          }}>
            {impacted ? 'NEW SIMULATION' : 'IN FLIGHT...'}
          </button>
        </div>
      )}

      {/* Split 3D view */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: 2, background: '#111' }}>
        {/* Unguided */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 14, left: 18, zIndex: 10,
            fontSize: 16, letterSpacing: 3, fontWeight: 700, color: '#b45454',
            background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 8, backdropFilter: 'blur(4px)',
          }}>UNGUIDED</div>
          <Canvas camera={{ position: [2, 3, 6], fov: 45 }} shadows style={{ background: '#1a2030' }}>
            <PlaybackDriver fired={fired} speed={speed} onTick={handleTick} />
            <FlightScene
              traj={synth.unguided} target={synth.target} impact={synth.uImpact}
              color="#b45454" label="UNGUIDED" guided={false}
              currentT={currentT} fired={fired} impacted={impacted}
            />
          </Canvas>
        </div>

        {/* Guided */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 14, left: 18, zIndex: 10,
            fontSize: 14, letterSpacing: 2, fontWeight: 700, color: design.id === 4 ? '#5a9e6f' : C.accent,
            background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 8, backdropFilter: 'blur(4px)',
          }}>GUIDED · DESIGN {design.id}</div>
          <Canvas camera={{ position: [2, 3, 6], fov: 45 }} shadows style={{ background: '#1a2030' }}>
            <FlightScene
              traj={synth.guided} target={synth.target} impact={synth.gImpact}
              color={design.id === 4 ? '#5a9e6f' : design.id >= 2 ? '#c47040' : '#b45454'}
              label={`DESIGN ${design.id}`} guided={design.id >= 2}
              currentT={currentT} fired={fired} impacted={impacted}
              correctionPoints={synth.correctionPoints}
            />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
