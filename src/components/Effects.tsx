import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { removeFx, runtime } from '../game/runtime'
import { useGameStore } from '../game/store'
import type { FxItem, Projectile, Zone } from '../game/types'

const ADD = THREE.AdditiveBlending
const age01 = (it: FxItem) => (performance.now() - it.createdAt) / it.ttl
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function Slash({ it }: { it: FxItem }) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const r = it.radius ?? 1.5
  const arc = Math.PI * 0.75
  // 2.5D：斬擊弧畫在 (前方, 上方) 平面，攝影機側視才看得見
  const theta = Math.PI - arc / 2
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    if (mat.current) mat.current.opacity = (1 - t) * 0.95
    if (mesh.current) mesh.current.scale.setScalar(0.8 + easeOut(t) * 0.5)
  })
  return (
    <group position={it.pos} rotation={[0, it.yaw ?? 0, 0]}>
      <group rotation={[(it.plane === 'vertical' ? 0 : (it.tilt ?? 0) * 2) , 0, 0]} scale={[1, it.flip ? -1 : 1, 1]}>
        <mesh ref={mesh} rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[r * 0.55, r, 32, 1, theta, arc]} />
          <meshBasicMaterial ref={mat} color={it.color} transparent side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function Ring({ it }: { it: FxItem }) {
  const mesh = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const R = it.radius ?? 2
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    if (mat.current) mat.current.opacity = (1 - t) * 0.9
    mesh.current?.scale.setScalar(Math.max(0.05, R * easeOut(t)))
  })
  return (
    <group ref={mesh} position={it.pos}>
      {/* 同時畫地面平放環與面向鏡頭的環，側視下都看得到 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.88, 1, 56]} />
        <meshBasicMaterial ref={mat} color={it.color} transparent side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.9, 1, 56]} />
        <meshBasicMaterial color={it.color} transparent opacity={0.6} side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Burst({ it }: { it: FxItem }) {
  const pts = useRef<THREE.Points>(null)
  const mat = useRef<THREE.PointsMaterial>(null)
  const data = useMemo(() => {
    const n = it.count ?? 16
    const pos = new Float32Array(n * 3)
    const vel = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos.set(it.pos, i * 3)
      const a = Math.random() * Math.PI * 2
      const sp = (it.speed ?? 5) * (0.35 + Math.random() * 0.65)
      vel[i * 3] = Math.cos(a) * sp
      vel[i * 3 + 1] = Math.sin(a) * sp * 0.9 + Math.random() * 1.5
      vel[i * 3 + 2] = (Math.random() - 0.5) * sp * 0.4
    }
    return { pos, vel, n }
  }, [])
  const last = useRef(performance.now())
  useFrame(() => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - last.current) / 1000)
    last.current = now
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    const { pos, vel, n } = data
    const drag = Math.pow(0.05, dt)
    for (let i = 0; i < n; i++) {
      vel[i * 3] *= drag; vel[i * 3 + 1] = vel[i * 3 + 1] * drag - 6 * dt; vel[i * 3 + 2] *= drag
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt
    }
    const g = pts.current?.geometry.attributes.position
    if (g) g.needsUpdate = true
    if (mat.current) mat.current.opacity = 1 - t
  })
  return (
    <points ref={pts} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.pos} count={data.n} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial ref={mat} color={it.color} size={it.size ?? 0.2} transparent blending={ADD} depthWrite={false} sizeAttenuation />
    </points>
  )
}

function Afterimage({ it }: { it: FxItem }) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    if (mat.current) mat.current.opacity = (1 - t) * 0.5
    mesh.current?.scale.setScalar((it.shape === 'sphere' ? it.size ?? 1 : 1) * (1 - t * 0.35))
  })
  return (
    <mesh ref={mesh} position={it.pos} rotation={[0, it.yaw ?? 0, 0]}>
      {it.shape === 'sphere' ? <sphereGeometry args={[0.5, 12, 12]} /> : <boxGeometry args={[1, 1, 1]} />}
      <meshBasicMaterial ref={mat} color={it.color} transparent blending={ADD} depthWrite={false} />
    </mesh>
  )
}

function Beam({ it }: { it: FxItem }) {
  const outer = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const L = it.length ?? 16
  const R = it.radius ?? 0.5
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    const w = (1 - t) * (t < 0.1 ? t * 10 : 1)
    outer.current?.scale.set(w, 1, w)
    core.current?.scale.set(w, 1, w)
    ;(outer.current?.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t)
  })
  return (
    <group position={it.pos} rotation={[0, it.yaw ?? 0, 0]}>
      <group position={[0, 0, L / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh ref={outer}>
          <cylinderGeometry args={[R, R, L, 20, 1, true]} />
          <meshBasicMaterial color={it.color} transparent blending={ADD} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={core}>
          <cylinderGeometry args={[R * 0.35, R * 0.35, L, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  )
}

function Pillar({ it }: { it: FxItem }) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const R = it.radius ?? 2
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    const s = R * (0.6 + easeOut(t) * 0.8) * (1 - t * 0.6)
    mesh.current?.scale.set(s, 1, s)
    if (mat.current) mat.current.opacity = (1 - t) * 0.6
  })
  return (
    <mesh ref={mesh} position={[it.pos[0], it.pos[1] + 15, it.pos[2]]}>
      <cylinderGeometry args={[1, 1, 30, 24, 1, true]} />
      <meshBasicMaterial ref={mat} color={it.color} transparent blending={ADD} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function FxLayer() {
  useGameStore((s) => s.fxVersion)
  return (
    <>
      {runtime.fx.map((it) => {
        switch (it.kind) {
          case 'slash': return <Slash key={it.id} it={it} />
          case 'ring': return <Ring key={it.id} it={it} />
          case 'burst': return <Burst key={it.id} it={it} />
          case 'afterimage': return <Afterimage key={it.id} it={it} />
          case 'beam': return <Beam key={it.id} it={it} />
          case 'pillar': return <Pillar key={it.id} it={it} />
        }
      })}
    </>
  )
}

function ProjectileView({ p }: { p: Projectile }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => g.current?.position.set(p.pos[0], p.pos[1], p.pos[2]))
  return (
    <group ref={g} position={p.pos}>
      <mesh><sphereGeometry args={[p.radius * 0.6, 16, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh><sphereGeometry args={[p.radius, 16, 16]} /><meshBasicMaterial color={p.color} transparent opacity={0.55} blending={ADD} depthWrite={false} /></mesh>
    </group>
  )
}
export function Projectiles() {
  useGameStore((s) => s.projVersion)
  return <>{runtime.projectiles.map((p) => <ProjectileView key={p.id} p={p} />)}</>
}

function ZoneView({ z }: { z: Zone }) {
  const g = useRef<THREE.Group>(null)
  const disc = useRef<THREE.MeshBasicMaterial>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const fade = Math.min(1, z.ttlMs / 300, (z.durationMs - z.ttlMs) / 150 + 0.01)
    if (disc.current) disc.current.opacity = 0.22 * fade
    if (ring.current) ring.current.rotation.z += dt * 1.5
    g.current?.scale.setScalar(0.9 + 0.1 * Math.sin(performance.now() / 200))
  })
  return (
    <group position={z.pos} rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={g}>
        <mesh><circleGeometry args={[z.radius, 48]} /><meshBasicMaterial ref={disc} color={z.color} transparent depthWrite={false} blending={ADD} /></mesh>
        <mesh ref={ring}>
          <ringGeometry args={[z.radius * 0.92, z.radius, 6]} />
          <meshBasicMaterial color={z.color} transparent opacity={0.8} side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
        </mesh>
        <mesh><ringGeometry args={[z.radius * 0.45, z.radius * 0.5, 32]} /><meshBasicMaterial color={z.color} transparent opacity={0.5} blending={ADD} depthWrite={false} /></mesh>
      </group>
    </group>
  )
}
export function Zones() {
  useGameStore((s) => s.zoneVersion)
  return <>{runtime.zones.map((z) => <ZoneView key={z.id} z={z} />)}</>
}

/** 判定框除錯顯示（H 鍵切換）：每幀把最近的查詢球體畫出來 */
export function DebugHitboxes() {
  const show = useGameStore((s) => s.showDebug)
  const pool = useRef<THREE.Mesh[]>([])
  useFrame(() => {
    const list = runtime.debugSpheres
    pool.current.forEach((m, i) => {
      const d = list[list.length - 1 - i]
      if (!m) return
      m.visible = show && !!d
      if (d && show) { m.position.set(d.pos[0], d.pos[1], d.pos[2]); m.scale.setScalar(d.r) }
    })
  })
  return (
    <>
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} ref={(m) => { if (m) pool.current[i] = m }} visible={false}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color="#ff2d55" wireframe transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

/** 大招球：打破它的人獲得一次大招 */
export function SmashBallView() {
  const g = useRef<THREE.Group>(null)
  const shell = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.MeshBasicMaterial>(null)
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  const halo = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const b = runtime.ball
    if (!g.current) return
    g.current.visible = !!b
    if (!b) return
    g.current.position.set(b.pos[0], b.pos[1], 0)
    const t = performance.now() / 1000
    const hue = (t * 0.6) % 1
    const blink = b.ttlMs < 4000 && Math.floor(t * 6) % 2 === 0
    core.current?.color.setHSL(hue, 1, b.flashMs > 0 ? 0.95 : 0.6)
    glow.current?.color.setHSL((hue + 0.5) % 1, 1, 0.55)
    if (glow.current) glow.current.opacity = blink ? 0.1 : 0.4
    if (shell.current) { shell.current.rotation.y += dt * 2; shell.current.rotation.x += dt * 1.3 }
    if (halo.current) halo.current.scale.setScalar(1.2 + 0.15 * Math.sin(t * 6) + (b.maxHp - b.hp) * 0.1)
    g.current.scale.setScalar(b.flashMs > 0 ? 1.25 : 1)
  })
  return (
    <group ref={g} visible={false}>
      <mesh><sphereGeometry args={[0.55, 20, 20]} /><meshBasicMaterial ref={core} color="#fff" /></mesh>
      <mesh ref={halo}><sphereGeometry args={[0.85, 20, 20]} /><meshBasicMaterial ref={glow} color="#fff" transparent opacity={0.4} blending={ADD} depthWrite={false} /></mesh>
      <mesh ref={shell}><icosahedronGeometry args={[0.95, 1]} /><meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} /></mesh>
    </group>
  )
}
