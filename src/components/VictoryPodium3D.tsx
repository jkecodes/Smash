import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RetroAvatar, isRetroAvatar } from './RetroAvatar'
import type { CharacterId, FighterId } from '../game/types'

function VictoryActor({ id, charId, color, stageColors }: { id: FighterId; charId: CharacterId; color: string; stageColors?: { main: string; surface: string; edge: string } }) {
  const rig = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const startRef = useRef<number | null>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (startRef.current === null) startRef.current = t
    const elapsed = t - startRef.current
    if (rig.current) {
      // 開場跳躍落地 + 英雄勝利轉身擺 Pose + 輕微呼吸起伏
      const introT = Math.min(1, elapsed / 0.55)
      const jumpArc = Math.sin(introT * Math.PI) * 0.75
      const idleBob = introT >= 1 ? Math.sin(t * 3.2) * 0.04 : 0
      rig.current.position.y = -0.1 + jumpArc + idleBob
      rig.current.rotation.y = introT < 1
        ? THREE.MathUtils.lerp(-Math.PI * 1.2, 0.25, introT)
        : 0.25 + Math.sin(t * 1.4) * 0.14
      rig.current.rotation.z = introT >= 1 ? Math.sin(t * 2.4) * 0.04 : 0
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.7
    }
  })

  return (
    <group>
      {/* 勝利舞台底座（雙層發光頒獎台，套用該場地配色） */}
      <mesh position={[0, -0.82, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.55, 0.24, 32]} />
        <meshStandardMaterial color={stageColors?.main ?? '#1e293b'} metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.68, 0]} receiveShadow>
        <cylinderGeometry args={[1.08, 1.18, 0.12, 32]} />
        <meshStandardMaterial color={stageColors?.surface ?? '#0f172a'} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh ref={ring} position={[0, -0.61, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.06, 32]} />
        <meshBasicMaterial color={stageColors?.edge ?? color} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* 第一名腳色 3D 模型 */}
      <group ref={rig} scale={[1.35, 1.35, 1.35]}>
        {isRetroAvatar(charId) ? (
          <RetroAvatar id={id} charId={charId} />
        ) : (
          <group>
            <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[0.8, 0.26, 0.32]} /><meshStandardMaterial color="#00f0f0" emissive="#06b6d4" emissiveIntensity={0.45} /></mesh>
            <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.28, 0.28, 0.32]} /><meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.5} /></mesh>
          </group>
        )}
      </group>
    </group>
  )
}

export function VictoryPodium3D({ id, charId, color, stageColors }: { id: FighterId; charId: CharacterId; color: string; stageColors?: { main: string; surface: string; edge: string } }) {
  return (
    <Canvas camera={{ position: [0, 0.75, 3.8], fov: 38 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.95} />
      <directionalLight position={[3, 6, 4]} intensity={1.7} color="#fffbeb" />
      <pointLight position={[-3, 2, 2]} intensity={1.2} color={color} />
      <VictoryActor id={id} charId={charId} color={color} stageColors={stageColors} />
    </Canvas>
  )
}

const ARMLESS_CHARS = new Set<CharacterId>([
  'tetro', 'pacman', 'invader', 'snake', 'frogger', 'pong', 'omnom', 'crossy', 'red',
  'mino', 'ufo', 'viper', 'ladyfrog', 'paddle', 'omnelle', 'ducky', 'doh', 'chuck',
  'creeper', 'blinky', 'vaus',
])

function ClappingActor({ id, charId }: { id: FighterId; charId: CharacterId }) {
  const rig = useRef<THREE.Group>(null)
  const leftHand = useRef<THREE.Mesh>(null)
  const rightHand = useRef<THREE.Mesh>(null)
  const hasHands = !ARMLESS_CHARS.has(charId)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const clap = Math.abs(Math.sin(t * 7.5))
    if (rig.current) {
      rig.current.position.y = -0.18 + clap * 0.06
      rig.current.rotation.y = Math.sin(t * 2.2) * 0.14
    }
    if (leftHand.current && rightHand.current) {
      const gap = 0.05 + (1 - clap) * 0.16
      leftHand.current.position.x = -gap
      rightHand.current.position.x = gap
    }
  })
  return (
    <group ref={rig} scale={[1.15, 1.15, 1.15]}>
      {isRetroAvatar(charId) ? (
        <RetroAvatar id={id} charId={charId} hideProps />
      ) : (
        <group>
          <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.8, 0.26, 0.32]} /><meshStandardMaterial color="#00f0f0" emissive="#06b6d4" emissiveIntensity={0.45} /></mesh>
          <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.28, 0.28, 0.32]} /><meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.5} /></mesh>
        </group>
      )}
      {/* 僅對有手的腳色顯示 3D 拍手動畫雙手 */}
      {hasHands && (
        <>
          <mesh ref={leftHand} position={[-0.14, 0.04, 0.34]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#fde8d7" /></mesh>
          <mesh ref={rightHand} position={[0.14, 0.04, 0.34]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color="#fde8d7" /></mesh>
        </>
      )}
    </group>
  )
}

export function ClappingPodium3D({ id, charId }: { id: FighterId; charId: CharacterId }) {
  return (
    <Canvas camera={{ position: [0, 0.25, 2.35], fov: 36 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[2, 5, 4]} intensity={1.5} color="#ffffff" />
      <ClappingActor id={id} charId={charId} />
    </Canvas>
  )
}
