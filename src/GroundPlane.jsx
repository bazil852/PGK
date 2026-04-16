import { useMemo } from 'react'
import * as THREE from 'three'

export default function GroundPlane() {
  const texture = useMemo(() => {
    // Create a simple procedural ground texture
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // Base color
    ctx.fillStyle = '#2a3520'
    ctx.fillRect(0, 0, 512, 512)

    // Add noise
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      const shade = Math.floor(30 + Math.random() * 20)
      ctx.fillStyle = `rgb(${shade + 10}, ${shade + 20}, ${shade})`
      ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(8, 8)
    return tex
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[40, 20]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.9}
        metalness={0.0}
        color="#3a4a30"
      />
    </mesh>
  )
}
