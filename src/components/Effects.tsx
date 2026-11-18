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
  const spin = useRef<THREE.Group>(null)
  const charId = useGameStore.getState().selection[p.owner]
  const skillId = p.source.def.id
  const r = p.radius

  useFrame((_, dt) => {
    if (g.current) {
      g.current.position.set(p.pos[0], p.pos[1], p.pos[2])
    }
    if (spin.current) {
      if (charId === 'kong' || charId === 'mario' || charId === 'bomber' || charId === 'snake' || charId === 'marisa' || charId === 'reimu' || charId === 'yugi' || charId === 'kaiba' || charId === 'tetro') {
        spin.current.rotation.z -= Math.sign(p.vel[0] || 1) * dt * 10
        spin.current.rotation.y += dt * 4
      } else {
        spin.current.rotation.z = Math.atan2(p.vel[1], p.vel[0])
      }
    }
  })

  return (
    <group ref={g} position={p.pos}>
      <group ref={spin}>
        {charId === 'tetro' ? (
          <>
            <mesh><boxGeometry args={[r * 1.6, r * 1.6, r * 1.6]} /><meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.6} /></mesh>
            <mesh><boxGeometry args={[r * 1.75, r * 1.75, r * 1.75]} /><meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.45} /></mesh>
          </>
        ) : charId === 'pacman' && skillId.includes('cherry') ? (
          <>
            <mesh position={[-r * 0.4, -r * 0.25, 0]}><sphereGeometry args={[r * 0.55, 12, 12]} /><meshStandardMaterial color="#ef4444" emissive="#991b1b" emissiveIntensity={0.4} /></mesh>
            <mesh position={[r * 0.4, -r * 0.25, 0]}><sphereGeometry args={[r * 0.55, 12, 12]} /><meshStandardMaterial color="#ef4444" emissive="#991b1b" emissiveIntensity={0.4} /></mesh>
            <mesh position={[0, r * 0.45, 0]}><boxGeometry args={[r * 0.2, r * 0.7, r * 0.2]} /><meshStandardMaterial color="#22c55e" /></mesh>
          </>
        ) : charId === 'mario' && skillId.includes('shell') ? (
          <>
            <mesh><cylinderGeometry args={[r * 0.9, r * 0.9, r * 0.7, 14]} /><meshStandardMaterial color="#22c55e" emissive="#15803d" emissiveIntensity={0.35} /></mesh>
            <mesh><cylinderGeometry args={[r * 0.96, r * 0.96, r * 0.22, 14]} /><meshStandardMaterial color="#fef3c7" /></mesh>
          </>
        ) : charId === 'invader' ? (
          <>
            <mesh><boxGeometry args={[r * 2.4, r * 0.55, r * 0.55]} /><meshBasicMaterial color="#4ade80" /></mesh>
            <mesh><boxGeometry args={[r * 2.8, r * 0.95, r * 0.95]} /><meshBasicMaterial color={p.color} transparent opacity={0.4} blending={ADD} depthWrite={false} /></mesh>
          </>
        ) : charId === 'bomber' ? (
          <>
            <mesh><sphereGeometry args={[r * 0.9, 14, 14]} /><meshStandardMaterial color="#0f172a" roughness={0.3} /></mesh>
            <mesh position={[0, r * 0.95, 0]}><cylinderGeometry args={[r * 0.2, r * 0.25, r * 0.35, 8]} /><meshStandardMaterial color="#64748b" /></mesh>
            <mesh position={[0, r * 1.25, 0]}><sphereGeometry args={[r * 0.35, 8, 8]} /><meshBasicMaterial color="#fb923c" /></mesh>
          </>
        ) : charId === 'snake' ? (
          <>
            <mesh><sphereGeometry args={[r * 0.92, 14, 14]} /><meshStandardMaterial color="#ef4444" emissive="#991b1b" emissiveIntensity={0.4} /></mesh>
            <mesh position={[0, r * 0.95, 0]}><cylinderGeometry args={[r * 0.1, r * 0.12, r * 0.4, 6]} /><meshStandardMaterial color="#78350f" /></mesh>
            <mesh position={[r * 0.3, r * 1.0, 0]} rotation={[0, 0, -0.6]}><boxGeometry args={[r * 0.45, r * 0.2, r * 0.12]} /><meshStandardMaterial color="#22c55e" /></mesh>
          </>
        ) : charId === 'kong' ? (
          <>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.85, r * 0.85, r * 1.35, 14]} /><meshStandardMaterial color="#92400e" roughness={0.7} /></mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.9, r * 0.9, r * 0.2, 14]} /><meshStandardMaterial color="#1e293b" /></mesh>
          </>
        ) : charId === 'pong' ? (
          <>
            <mesh><boxGeometry args={[r * 1.5, r * 1.5, r * 1.5]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><boxGeometry args={[r * 2.1, r * 2.1, r * 2.1]} /><meshBasicMaterial color="#38bdf8" transparent opacity={0.45} blending={ADD} depthWrite={false} /></mesh>
          </>
        ) : charId === 'reimu' ? (
          skillId.includes('amulet') ? (
            <>
              <mesh><boxGeometry args={[r * 1.7, r * 1.1, r * 0.18]} /><meshStandardMaterial color="#ffffff" emissive="#fecdd3" emissiveIntensity={0.5} /></mesh>
              <mesh><boxGeometry args={[r * 0.7, r * 0.7, r * 0.22]} /><meshBasicMaterial color="#ef4444" /></mesh>
            </>
          ) : (
            <>
              <mesh><sphereGeometry args={[r * 0.85, 16, 16]} /><meshStandardMaterial color="#ffffff" emissive="#ef4444" emissiveIntensity={0.65} /></mesh>
              <mesh><torusGeometry args={[r * 1.05, r * 0.12, 8, 20]} /><meshBasicMaterial color="#fb7185" /></mesh>
            </>
          )
        ) : charId === 'marisa' ? (
          skillId.includes('potion') ? (
            <>
              <mesh><sphereGeometry args={[r * 0.85, 12, 12]} /><meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.6} /></mesh>
              <mesh position={[0, r * 0.95, 0]}><cylinderGeometry args={[r * 0.25, r * 0.3, r * 0.4, 8]} /><meshStandardMaterial color="#fde047" /></mesh>
            </>
          ) : (
            <>
              <mesh><octahedronGeometry args={[r * 1.05, 0]} /><meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.85} /></mesh>
              <mesh><sphereGeometry args={[r * 1.25, 12, 12]} /><meshBasicMaterial color={p.color} transparent opacity={0.35} blending={ADD} depthWrite={false} /></mesh>
            </>
          )
        ) : charId === 'ryu' || charId === 'chunli' ? (
          <>
            <mesh><sphereGeometry args={[r * 0.65, 16, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><sphereGeometry args={[r * 1.05, 16, 16]} /><meshBasicMaterial color={p.color} transparent opacity={0.55} blending={ADD} depthWrite={false} /></mesh>
            <mesh rotation={[Math.PI / 4, 0, 0]}><torusGeometry args={[r * 1.15, r * 0.12, 8, 24]} /><meshBasicMaterial color={p.color} transparent opacity={0.8} blending={ADD} /></mesh>
          </>
        ) : charId === 'yugi' || charId === 'kaiba' ? (
          skillId.includes('a1') ? (
            <mesh><boxGeometry args={[r * 1.8, r * 1.3, r * 0.14]} /><meshStandardMaterial color={charId === 'kaiba' ? '#38bdf8' : '#a855f7'} emissive="#ffffff" emissiveIntensity={0.4} /></mesh>
          ) : (
            <>
              <mesh><boxGeometry args={[r * 2.4, r * 0.7, r * 0.7]} /><meshBasicMaterial color="#ffffff" /></mesh>
              <mesh><sphereGeometry args={[r * 1.25, 16, 16]} /><meshBasicMaterial color={p.color} transparent opacity={0.5} blending={ADD} depthWrite={false} /></mesh>
              <mesh><torusGeometry args={[r * 1.1, r * 0.12, 8, 20]} /><meshBasicMaterial color="#fde047" transparent opacity={0.75} blending={ADD} /></mesh>
            </>
          )
        ) : charId === 'omnom' ? (
          <>
            <mesh><sphereGeometry args={[r * 0.9, 16, 16]} /><meshStandardMaterial color="#f43f5e" emissive="#be123c" emissiveIntensity={0.35} /></mesh>
            <mesh><torusGeometry args={[r * 0.92, r * 0.14, 8, 20]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'tom' ? (
          <>
            <mesh><cylinderGeometry args={[r, r, r * 0.45, 14]} /><meshStandardMaterial color="#fef3c7" /></mesh>
            <mesh position={[0, r * 0.25, 0]}><sphereGeometry args={[r * 0.7, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshStandardMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'ben' ? (
          <>
            <mesh><cylinderGeometry args={[r * 0.45, r * 0.55, r * 1.6, 12]} /><meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.6} /></mesh>
            <mesh position={[0, r * 0.9, 0]}><cylinderGeometry args={[r * 0.25, r * 0.25, r * 0.35, 10]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
          </>
        ) : charId === 'crossy' ? (
          <mesh><boxGeometry args={[r * 1.4, r * 1.6, r * 1.4]} /><meshStandardMaterial color={p.color} /></mesh>
        ) : charId === 'red' ? (
          <>
            <mesh><sphereGeometry args={[r * 0.9, 14, 14]} /><meshStandardMaterial color={p.color} /></mesh>
            <mesh position={[r * 0.75, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.3, r * 0.6, 6]} /><meshStandardMaterial color="#facc15" /></mesh>
          </>
        ) : charId === 'steve' ? (
          skillId.includes('tnt') ? (
            <>
              <mesh><boxGeometry args={[r * 1.7, r * 1.7, r * 1.7]} /><meshStandardMaterial color="#ef4444" emissive="#991b1b" emissiveIntensity={0.35} /></mesh>
              <mesh><boxGeometry args={[r * 1.75, r * 0.55, r * 1.75]} /><meshBasicMaterial color="#ffffff" /></mesh>
            </>
          ) : (
            <mesh><boxGeometry args={[r * 2.5, r * 0.35, r * 0.35]} /><meshStandardMaterial color="#a855f7" emissive="#c084fc" emissiveIntensity={0.65} /></mesh>
          )
        ) : charId === 'arisa' || charId === 'nona' || charId === 'miyabi' || charId === 'chihiro' || charId === 'rover' ? (
          <>
            <mesh><boxGeometry args={[r * 2.5, r * 0.38, r * 0.38]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><sphereGeometry args={[r * 0.95, 12, 12]} /><meshBasicMaterial color={p.color} transparent opacity={0.5} blending={ADD} depthWrite={false} /></mesh>
          </>
        ) : charId === 'gojo' || charId === 'ichi' || charId === 'ruri' || charId === 'stelle' || charId === 'lumine' || charId === 'saki' ? (
          <>
            <mesh><octahedronGeometry args={[r * 0.95, 0]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><sphereGeometry args={[r * 1.15, 14, 14]} /><meshBasicMaterial color={p.color} transparent opacity={0.55} blending={ADD} depthWrite={false} /></mesh>
            <mesh rotation={[Math.PI / 4, 0, 0]}><torusGeometry args={[r * 1.1, r * 0.1, 8, 20]} /><meshBasicMaterial color={p.color} blending={ADD} /></mesh>
          </>
        ) : charId === 'spe' || charId === 'kaoruko' || charId === 'rapi' || charId === 'akira' ? (
          <>
            <mesh><boxGeometry args={[r * 1.8, r * 0.9, r * 0.9]} /><meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.6} /></mesh>
            <mesh><sphereGeometry args={[r * 1.05, 12, 12]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35} blending={ADD} depthWrite={false} /></mesh>
          </>
        ) : (
          <>
            <mesh><sphereGeometry args={[r * 0.6, 16, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><sphereGeometry args={[r, 16, 16]} /><meshBasicMaterial color={p.color} transparent opacity={0.55} blending={ADD} depthWrite={false} /></mesh>
          </>
        )}
      </group>
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
  const charId = useGameStore.getState().selection[z.owner]
  const sides = charId === 'reimu' ? 8 : charId === 'snake' ? 4 : 6
  useFrame((_, dt) => {
    const fade = Math.min(1, z.ttlMs / 300, (z.durationMs - z.ttlMs) / 150 + 0.01)
    if (disc.current) disc.current.opacity = 0.24 * fade
    if (ring.current) ring.current.rotation.z += dt * (charId === 'reimu' ? 2.2 : 1.5)
    g.current?.scale.setScalar(0.92 + 0.08 * Math.sin(performance.now() / 200))
  })
  return (
    <group position={z.pos} rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={g}>
        <mesh><circleGeometry args={[z.radius, 48]} /><meshBasicMaterial ref={disc} color={z.color} transparent depthWrite={false} blending={ADD} /></mesh>
        <mesh ref={ring}>
          <ringGeometry args={[z.radius * 0.9, z.radius, sides]} />
          <meshBasicMaterial color={z.color} transparent opacity={0.85} side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
        </mesh>
        <mesh><ringGeometry args={[z.radius * 0.45, z.radius * 0.5, charId === 'reimu' ? 8 : 32]} /><meshBasicMaterial color={charId === 'reimu' ? '#ffffff' : z.color} transparent opacity={0.55} blending={ADD} depthWrite={false} /></mesh>
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
