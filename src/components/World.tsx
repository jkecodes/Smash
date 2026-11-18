import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody, interactionGroups, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ModelAvatar, ModelBoundary, useModelUrl } from './ModelAvatar'
import * as THREE from 'three'
import { CHARACTERS } from '../game/characters'
import { PLATFORMS, PLATFORM_THICKNESS, STAGE_HALF } from '../game/constants'
import { runtime } from '../game/runtime'
import { stepSimulation } from '../game/sim'
import { useGameStore } from '../game/store'
import { FIGHTER_IDS, type FighterId } from '../game/types'

/** 場地：懸空平台（碰撞群組 0，只與角色群組 1 碰撞） */
export function Arena() {
  const h = STAGE_HALF
  return (
    <>
      <RigidBody type="fixed" colliders={false} friction={0} collisionGroups={interactionGroups(0, [1])}>
        <CuboidCollider args={[h.x, h.y, h.z]} position={[0, -h.y, 0]} friction={0} />
      </RigidBody>
      <mesh position={[0, -h.y, 0]} receiveShadow castShadow>
        <boxGeometry args={[h.x * 2, h.y * 2, h.z * 2]} />
        <meshStandardMaterial color="#2b3350" />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[h.x * 2, h.z * 2]} />
        <meshStandardMaterial color="#3a4570" />
      </mesh>
      {PLATFORMS.map((p, i) => (
        <group key={`plat${i}`}>
          <RigidBody type="fixed" colliders={false} friction={0} collisionGroups={interactionGroups(2 + i, [1])}>
            <CuboidCollider args={[p.w / 2, PLATFORM_THICKNESS / 2, h.z]} position={[p.x, p.y - PLATFORM_THICKNESS / 2, 0]} friction={0} />
          </RigidBody>
          <mesh position={[p.x, p.y - PLATFORM_THICKNESS / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[p.w, PLATFORM_THICKNESS, h.z * 2]} />
            <meshStandardMaterial color="#3a4a7e" />
          </mesh>
          <mesh position={[p.x, p.y + 0.01, h.z]}>
            <boxGeometry args={[p.w, 0.04, 0.06]} />
            <meshBasicMaterial color="#8fc0ff" />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (h.x + 0.04), -0.06, 0]}>
          <boxGeometry args={[0.12, 0.14, h.z * 2 + 0.02]} />
          <meshBasicMaterial color="#ffe066" />
        </mesh>
      ))}
      <mesh position={[0, -3.2, 0]}>
        <coneGeometry args={[4, 5, 6]} />
        <meshStandardMaterial color="#1c2238" />
      </mesh>
      <gridHelper args={[80, 40, '#243055', '#1a2140']} position={[0, -14, 0]} />
    </>
  )
}

/** 把 rapier world 交給模擬層，並每幀驅動模擬。 */
export function SimLoop() {
  const { world, rapier } = useRapier()
  useEffect(() => {
    runtime.physics = { world, rapier }
    return () => { runtime.physics = null }
  }, [world, rapier])
  useFrame((_, dt) => stepSimulation(dt))
  return null
}

const CHAR_SCALE = 1.4 // 角色視覺放大倍率（碰撞體不變）
const MARK_COLOR: Record<FighterId, string> = { p1: '#ff4d4d', p2: '#3d9bff' }
function makeMarkTexture(label: string, color: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.beginPath(); g.moveTo(128, 124); g.lineTo(100, 96); g.lineTo(156, 96); g.closePath(); g.fill() // 向下小箭頭
  g.beginPath(); g.roundRect(28, 8, 200, 86, 22); g.fill()
  g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke()
  g.fillStyle = '#ffffff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(label, 128, 52)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
function PlayerMarker({ id }: { id: FighterId }) {
  const cpu = useGameStore((s) => s.cpu[id])
  const label = cpu ? `${id === 'p1' ? 'P1' : 'P2'} CPU` : id === 'p1' ? 'P1' : 'P2'
  const tex = useState(() => ({ t: null as THREE.CanvasTexture | null }))[0]
  useEffect(() => { tex.t = makeMarkTexture(label, MARK_COLOR[id]); setV((v) => v + 1); return () => tex.t?.dispose() }, [label, id, tex])
  const [, setV] = useState(0)
  const ref = useRef<THREE.Sprite>(null)
  useFrame(() => { if (ref.current) ref.current.position.y = 2.0 + Math.sin(performance.now() / 300) * 0.06 })
  if (!tex.t) return null
  return (
    <sprite ref={ref} position={[0, 2.0, 0]} scale={[1.5, 0.75, 1]} renderOrder={10}>
      <spriteMaterial map={tex.t} transparent depthTest={false} />
    </sprite>
  )
}

function FighterView({ id }: { id: FighterId }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const nose = useRef<THREE.Mesh>(null)
  const orb = useRef<THREE.Mesh>(null)
  const shield = useRef<THREE.Mesh>(null)
  const aura = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const tint = useGameStore((s) => CHARACTERS[s.selection[id]].color)
  const modelUrl = useModelUrl(id)
  // 已載入完成的模型網址；與目前要顯示的網址相同才隱藏備用方塊（不依賴 effect 執行順序）
  const readyUrl = useRef<string | null>(null)

  useFrame(() => {
    const f = useGameStore.getState().fighters[id]
    if (!group.current || !mat.current) return
    group.current.visible = f.alive
    const modelShown = !!modelUrl && readyUrl.current === modelUrl
    if (body.current) body.current.visible = !modelShown
    if (nose.current) nose.current.visible = !modelShown
    group.current.rotation.y = f.facing[0] >= 0 ? Math.PI / 2 : -Math.PI / 2
    const flash = f.flashMs > 0
    const base = new THREE.Color(tint)
    mat.current.color.copy(flash ? new THREE.Color('#ffffff') : base)
    mat.current.emissive.copy(base).multiplyScalar(f.fsm === 'ATTACK_ACTIVE' ? 0.9 : f.fsm === 'HITSTUN' ? 0.5 : 0.12)
    mat.current.opacity = f.invulnMs > 0 && Math.floor(performance.now() / 80) % 2 === 0 ? 0.45 : 1
    mat.current.transparent = true
    const squash = f.fsm === 'ATTACK_STARTUP' ? 0.85 : 1
    group.current.scale.set(CHAR_SCALE, CHAR_SCALE * squash, CHAR_SCALE)
    group.current.position.y = (CHAR_SCALE - 1) * 0.5 // 腳底維持貼地
    if (aura.current) {
      aura.current.visible = f.ultReady
      aura.current.scale.setScalar(1.35 + 0.12 * Math.sin(performance.now() / 120))
      ;(aura.current.material as THREE.MeshBasicMaterial).color.setHSL((performance.now() / 1500) % 1, 1, 0.6)
    }
    if (shield.current) {
      shield.current.visible = f.fsm === 'SHIELD'
      shield.current.scale.setScalar(0.55 + 0.45 * Math.max(0, f.shield) / 100) // 護盾耐久越低越小
    }
    if (orb.current) {
      const r = f.skill?.chargeRatio ?? 0
      orb.current.visible = !!f.skill && f.skill.def.charge !== undefined && f.skill.phase === 'startup' && !f.skill.released
      orb.current.scale.setScalar(0.15 + r * 0.55)
    }
  })

  return (
    <>
    <PlayerMarkerGate id={id} />
    <group ref={group}>
      {modelUrl && (
        <ModelBoundary resetKey={modelUrl}>
          <Suspense fallback={null}>
            <ModelAvatar id={id} url={modelUrl} onReady={() => { readyUrl.current = modelUrl }} />
          </Suspense>
        </ModelBoundary>
      )}
      <mesh ref={body} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={mat} color={tint} />
      </mesh>
      <mesh ref={nose} position={[0, 0.12, 0.55]}>
        <boxGeometry args={[0.5, 0.18, 0.12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh ref={orb} position={[0, 0.1, 0.95]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#aeeaff" transparent opacity={0.85} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={aura} visible={false}>
        <sphereGeometry args={[0.8, 20, 20]} />
        <meshBasicMaterial color="#ffd24d" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={shield} visible={false}>
        <sphereGeometry args={[0.95, 24, 24]} />
        <meshBasicMaterial color="#6cc8ff" transparent opacity={0.3} />
      </mesh>
    </group>
    </>
  )
}

function PlayerMarkerGate({ id }: { id: FighterId }) {
  const [alive, setAlive] = useState(true)
  useFrame(() => { const a = useGameStore.getState().fighters[id].alive; if (a !== alive) setAlive(a) })
  return alive ? <PlayerMarker id={id} /> : null
}

function Fighter({ id }: { id: FighterId }) {
  return (
    <RigidBody
      ref={(rb: RapierRigidBody | null) => {
        runtime.bodies[id] = rb
        if (rb) runtime.handles.set(rb.handle, id)
      }}
      position={[id === 'p1' ? -4 : 4, 1, 0]}
      enabledRotations={[false, false, false]}
      enabledTranslations={[true, true, false]} // 2.5D：鎖定 Z 軸
      colliders={false}
      canSleep={false}
      ccd
      linearDamping={0}
      collisionGroups={interactionGroups(1, [0, 2, 3, 4])}
    >
      <CuboidCollider args={[0.5, 0.5, 0.5]} friction={0} restitution={0} />
      <FighterView id={id} />
    </RigidBody>
  )
}

export function Fighters() {
  return <>{FIGHTER_IDS.map((id) => <Fighter key={id} id={id} />)}</>
}

/** 自動取景的側視攝影機（2.5D） */
export function CameraRig() {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 2, 0))
  useFrame((_, dt) => {
    const fs = useGameStore.getState().fighters
    const pts = FIGHTER_IDS.map((i) => fs[i]).filter((f) => f.alive).map((f) => f.pos)
    let cx = 0, cy = 2, spread = 8
    if (pts.length) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
      cx = (Math.min(...xs) + Math.max(...xs)) / 2
      cy = (Math.min(...ys) + Math.max(...ys)) / 2
      spread = Math.max(8, Math.max(...xs) - Math.min(...xs) + 6, (Math.max(...ys) - Math.min(...ys)) * 1.6 + 6)
    }
    cx = THREE.MathUtils.clamp(cx, -10, 10)
    cy = THREE.MathUtils.clamp(cy, -2, 12)
    const k = 1 - Math.pow(0.02, dt)
    const sh = runtime.shake
    const target = new THREE.Vector3(cx * 0.8 + (Math.random() - 0.5) * sh, cy + 4 + (Math.random() - 0.5) * sh, 12 + spread * 1.05)
    camera.position.lerp(target, k)
    look.current.lerp(new THREE.Vector3(cx * 0.8, cy + 1, 0), k)
    camera.lookAt(look.current)
  })
  return null
}
