import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

export default function TargetMarker({ position, color = '#6b8fa3', label = 'TARGET' }) {
  const ringRef = useRef()

  useFrame(() => {
    if (ringRef.current) ringRef.current.rotation.y += 0.008
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.008, 8, 32]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.004, 8, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <Text
        position={[0, 0.28, 0]}
        fontSize={0.06}
        color={color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.003}
        outlineColor="#111"
      >
        {label}
      </Text>
    </group>
  )
}
