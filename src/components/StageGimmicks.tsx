import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { gimmickRuntime } from '../game/gimmicks'
import type { StageDef } from '../game/stages'

export function StageGimmickView({ stage }: { stage: StageDef }) {
  const g = stage.gimmick
  const mainRef = useRef<THREE.Group>(null)
  const subRef = useRef<THREE.Group>(null)
  const warnRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!g) return
    if (g.kind === 'bumper' && mainRef.current) {
      const s = 1 + Math.sin(t * 5) * 0.08
      mainRef.current.scale.set(s, 1, s)
    } else if (g.kind === 'portal') {
      if (mainRef.current) mainRef.current.rotation.z = t * 2.2
      if (subRef.current) subRef.current.rotation.z = -t * 2.2
    } else if (g.kind === 'pickup' && mainRef.current) {
      mainRef.current.visible = gimmickRuntime.pickupReady
      mainRef.current.position.y = g.pos[1] + Math.sin(t * 3.2) * 0.18
      mainRef.current.rotation.y = t * 2.0
    } else if (g.kind === 'hazard') {
      if (mainRef.current) {
        mainRef.current.visible = gimmickRuntime.hazardState !== 'idle'
        mainRef.current.position.set(gimmickRuntime.hazardPos[0], gimmickRuntime.hazardPos[1], 0)
        mainRef.current.rotation.z = t * 3.5
        mainRef.current.rotation.y = t * 2.0
      }
      if (warnRef.current) {
        warnRef.current.visible = g.mode === 'bomb' && gimmickRuntime.hazardState === 'warn'
        warnRef.current.position.set(gimmickRuntime.hazardPos[0], Math.max(0.08, gimmickRuntime.hazardPos[1] - 0.5), 0)
        const pulse = 0.8 + Math.sin(t * 16) * 0.25
        warnRef.current.scale.set(pulse, pulse, 1)
      }
    } else if (g.kind === 'wind' && mainRef.current) {
      const dir = gimmickRuntime.windDir
      mainRef.current.children.forEach((child, i) => {
        if (g.mode === 'up') {
          child.position.y = ((t * 4.5 + i * 1.1) % 4.5) + 0.3
        } else {
          const span = g.radius * 1.8
          const raw = ((t * 5.5 * dir + i * (span / 5)) % span + span) % span
          child.position.x = g.pos[0] - g.radius * 0.9 + raw
        }
      })
    }
  })

  if (!g) return null

  if (g.kind === 'bumper') {
    return (
      <group position={[g.pos[0], g.pos[1], 0]}>
        <group ref={mainRef}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[g.radius * 0.85, g.radius, 0.22, 20]} />
            <meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={0.6} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
            <ringGeometry args={[g.radius * 0.72, g.radius * 1.05, 24]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.75} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    )
  }

  if (g.kind === 'portal') {
    const posB = g.pos2 ?? [-g.pos[0], g.pos[1]]
    return (
      <>
        <group ref={mainRef} position={[g.pos[0], g.pos[1], 0]}>
          <mesh>
            <torusGeometry args={[g.radius * 0.85, 0.1, 10, 24]} />
            <meshBasicMaterial color={g.color} />
          </mesh>
          <mesh>
            <circleGeometry args={[g.radius * 0.78, 24]} />
            <meshBasicMaterial color={g.color} transparent opacity={0.32} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <group ref={subRef} position={[posB[0], posB[1], 0]}>
          <mesh>
            <torusGeometry args={[g.radius * 0.85, 0.1, 10, 24]} />
            <meshBasicMaterial color={g.color} />
          </mesh>
          <mesh>
            <circleGeometry args={[g.radius * 0.78, 24]} />
            <meshBasicMaterial color={g.color} transparent opacity={0.32} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </>
    )
  }

  if (g.kind === 'pickup') {
    return (
      <>
        <mesh position={[g.pos[0], g.pos[1] - 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[g.radius * 0.6, g.radius * 0.85, 20]} />
          <meshBasicMaterial color={g.color} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <group ref={mainRef} position={[g.pos[0], g.pos[1], 0]}>
          <mesh>
            <octahedronGeometry args={[g.radius * 0.65, 0]} />
            <meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={0.8} />
          </mesh>
        </group>
      </>
    )
  }

  if (g.kind === 'wind') {
    return (
      <group ref={mainRef}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={g.mode === 'up' ? [g.pos[0] + (i - 2) * (g.radius * 0.35), 1 + i, 0] : [g.pos[0], g.pos[1] + 0.6 + (i % 3) * 1.1, 0]}
          >
            <boxGeometry args={g.mode === 'up' ? [0.1, 0.75, 0.1] : [1.1, 0.08, 0.08]} />
            <meshBasicMaterial color={g.color} transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
    )
  }

  // kind === 'hazard'
  return (
    <>
      <mesh ref={warnRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[g.radius * 0.55, g.radius, 24]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <group ref={mainRef} position={[g.pos[0], g.pos[1], 0]} visible={false}>
        {g.mode === 'pull' ? (
          <>
            <mesh>
              <sphereGeometry args={[0.7, 16, 16]} />
              <meshBasicMaterial color={g.color} transparent opacity={0.75} />
            </mesh>
            <mesh>
              <torusGeometry args={[g.radius * 0.55, 0.08, 8, 24]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          </>
        ) : (
          <mesh>
            <dodecahedronGeometry args={[g.radius * 0.7, 0]} />
            <meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={0.85} />
          </mesh>
        )}
      </group>
    </>
  )
}
