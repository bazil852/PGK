import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Sky, Text } from '@react-three/drei'
import * as THREE from 'three'
import Trajectory from './Trajectory.jsx'
import Projectile from './Projectile.jsx'
import TargetMarker from './TargetMarker.jsx'
import ImpactMarker from './ImpactMarker.jsx'
import GroundPlane from './GroundPlane.jsx'

const S = 1 / 1000

// Muted, professional palette
const COL = {
  unguided: '#b45454',   // muted red
  hit: '#5a9e6f',        // muted green
  miss: '#c47040',       // muted amber/orange
  target: '#6b8fa3',     // slate blue
  muzzle: '#888',
  grid: '#1e2a1e',
  gridSection: '#2a3d2a',
}

function getRunColor(run) {
  return run.success ? COL.hit : COL.miss
}

export default function Scene({ data }) {
  const controlsRef = useRef()
  const [playback, setPlayback] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [showUnguided, setShowUnguided] = useState(true)
  const [showGuided, setShowGuided] = useState(true)
  const [showHits, setShowHits] = useState(true)
  const [showMisses, setShowMisses] = useState(true)

  useEffect(() => {
    window.__pgkDemo = {
      playback, setPlayback, playing, setPlaying,
      speed, setSpeed, showUnguided, setShowUnguided,
      showGuided, setShowGuided, showHits, setShowHits,
      showMisses, setShowMisses,
    }
  })

  const maxT = Math.max(
    data.unguided.trajectory.t[data.unguided.trajectory.t.length - 1],
    ...data.guided_runs.map(r => r.trajectory.t[r.trajectory.t.length - 1])
  )

  useFrame((_, delta) => {
    if (playing) {
      setPlayback(prev => {
        const next = prev + (delta * speed) / maxT
        return next >= 1 ? 0 : next
      })
    }
  })

  const currentT = playback * maxT

  const interpPos = useCallback((traj, t) => {
    const times = traj.t
    if (t <= times[0]) return [traj.x[0] * S, traj.z[0] * S, traj.y[0] * S]
    if (t >= times[times.length - 1]) return [traj.x[times.length-1] * S, traj.z[times.length-1] * S, traj.y[times.length-1] * S]
    let lo = 0, hi = times.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (times[mid] <= t) lo = mid; else hi = mid
    }
    const frac = (t - times[lo]) / (times[hi] - times[lo])
    return [
      (traj.x[lo] + frac * (traj.x[hi] - traj.x[lo])) * S,
      (traj.z[lo] + frac * (traj.z[hi] - traj.z[lo])) * S,
      (traj.y[lo] + frac * (traj.y[hi] - traj.y[lo])) * S,
    ]
  }, [])

  const interpMach = useCallback((traj, t) => {
    const times = traj.t
    if (t <= times[0]) return traj.mach[0]
    if (t >= times[times.length - 1]) return traj.mach[times.length - 1]
    let lo = 0, hi = times.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (times[mid] <= t) lo = mid; else hi = mid
    }
    const frac = (t - times[lo]) / (times[hi] - times[lo])
    return traj.mach[lo] + frac * (traj.mach[hi] - traj.mach[lo])
  }, [])

  const posU = interpPos(data.unguided.trajectory, currentT)
  const machU = interpMach(data.unguided.trajectory, currentT)
  const impactU = [data.unguided.impact.x * S, 0, data.unguided.impact.y * S]

  const visibleRuns = data.guided_runs.filter(r => {
    if (r.success && !showHits) return false
    if (!r.success && !showMisses) return false
    return true
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} color="#d0d8e8" />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.5}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-5, 8, -3]} intensity={0.3} color="#8090b0" />
      <hemisphereLight args={['#8aa4c0', '#2a3a28', 0.4]} />

      {/* Sky gradient background */}
      <color attach="background" args={['#1a2030']} />
      <fog attach="fog" args={['#1a2030', 15, 35]} />

      <GroundPlane />

      <Grid
        args={[20, 20]}
        position={[5, 0.001, 0]}
        cellSize={0.5}
        cellThickness={0.4}
        cellColor={COL.grid}
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor={COL.gridSection}
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Muzzle */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.15, 8]} />
        <meshStandardMaterial color="#6a6a6a" metalness={0.7} roughness={0.4} />
      </mesh>
      <Text position={[0, 0.3, 0]} fontSize={0.1} color="#777" anchorX="center" anchorY="bottom">
        M198 MUZZLE
      </Text>

      {/* Unguided */}
      {showUnguided && (
        <>
          <Trajectory traj={data.unguided.trajectory} scale={S} color={COL.unguided} currentT={currentT} />
          <Projectile position={posU} color={COL.unguided} mach={machU} />
          {playback > 0.95 && <ImpactMarker position={impactU} color={COL.unguided} label="UNGUIDED" />}
        </>
      )}

      {/* Guided runs */}
      {showGuided && visibleRuns.map((run) => {
        const color = getRunColor(run)
        const pos = interpPos(run.trajectory, currentT)
        const mach = interpMach(run.trajectory, currentT)
        const targetPos = [run.target.x * S, 0, run.target.y * S]
        const impactPos = [run.impact.x * S, 0, run.impact.y * S]

        return (
          <group key={run.label}>
            <Trajectory traj={run.trajectory} scale={S} color={color} currentT={currentT} />
            <Projectile position={pos} color={color} mach={mach} guided />
            <TargetMarker position={targetPos} color={COL.target} label={run.label} />
            {playback > 0.95 && (
              <ImpactMarker
                position={impactPos}
                color={color}
                label={`${run.label}: ${run.miss}m`}
              />
            )}
          </group>
        )
      })}

      <OrbitControls
        ref={controlsRef}
        target={[4, 0.5, 0.1]}
        maxDistance={30}
        minDistance={1}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}
