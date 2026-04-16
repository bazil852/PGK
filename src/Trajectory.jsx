import { useMemo } from 'react'
import * as THREE from 'three'

export default function Trajectory({ traj, scale, color, currentT }) {
  const fullPoints = useMemo(() => {
    const pts = []
    for (let i = 0; i < traj.t.length; i++) {
      pts.push(new THREE.Vector3(
        traj.x[i] * scale,
        traj.z[i] * scale,
        traj.y[i] * scale
      ))
    }
    return pts
  }, [traj, scale])

  const activeCount = useMemo(() => {
    let idx = 0
    for (let i = 0; i < traj.t.length; i++) {
      if (traj.t[i] <= currentT) idx = i + 1
      else break
    }
    return Math.max(2, idx)
  }, [traj.t, currentT])

  const activePoints = fullPoints.slice(0, activeCount)

  const activeGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(activePoints)
  }, [activePoints])

  const ghostGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(fullPoints)
  }, [fullPoints])

  return (
    <group>
      {/* Ghost — faint full path */}
      <line geometry={ghostGeo}>
        <lineBasicMaterial color={color} transparent opacity={0.08} />
      </line>
      {/* Active trail */}
      <line geometry={activeGeo}>
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </line>
    </group>
  )
}
