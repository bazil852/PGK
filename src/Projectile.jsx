import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Projectile({ position, color, mach, guided = false }) {
  const meshRef = useRef()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...position)
    }
  })

  return (
    <group ref={meshRef}>
      <mesh castShadow>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
      {guided && (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.1, 0.004, 0.016]} />
            <meshStandardMaterial color="#888" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.1, 0.004, 0.016]} />
            <meshStandardMaterial color="#888" metalness={0.5} roughness={0.4} />
          </mesh>
        </>
      )}
    </group>
  )
}
