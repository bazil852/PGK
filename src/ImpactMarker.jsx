import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

export default function ImpactMarker({ position, color, label }) {
  const ringRef = useRef()

  useFrame(() => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.002) * 0.1
      ringRef.current.scale.set(scale, 1, scale)
    }
  })

  return (
    <group position={position}>
      <mesh ref={ringRef} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.055, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={2} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.015, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={2} />
      </mesh>
      <Text
        position={[0, 0.16, 0]}
        fontSize={0.05}
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
