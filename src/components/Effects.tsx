import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { removeFx, runtime } from '../game/runtime'
import { useGameStore } from '../game/store'
import { PLAYER_COLORS, type CharacterId, type FxItem, type Projectile, type Zone } from '../game/types'

const ADD = THREE.AdditiveBlending
const age01 = (it: FxItem) => (performance.now() - it.createdAt) / it.ttl
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

type FxStyle = 'pixel' | 'katana' | 'magic' | 'martial' | 'cute'
const PIXEL_CHARS = new Set<CharacterId>(['tetro', 'pong', 'invader', 'snake', 'crossy', 'steve', 'frogger', 'pacman'])
const KATANA_CHARS = new Set<CharacterId>(['chihiro', 'miyabi', 'yodaka', 'rover'])
const MAGIC_CHARS = new Set<CharacterId>(['reimu', 'marisa', 'nona', 'ichi', 'arisa', 'yugi', 'kaiba', 'lumine'])
const MARTIAL_CHARS = new Set<CharacterId>(['ryu', 'chunli', 'deku', 'gojo', 'kong', 'red'])

function fxStyleOf(c?: CharacterId): FxStyle {
  if (!c) return 'martial'
  if (PIXEL_CHARS.has(c)) return 'pixel'
  if (KATANA_CHARS.has(c)) return 'katana'
  if (MAGIC_CHARS.has(c)) return 'magic'
  if (MARTIAL_CHARS.has(c)) return 'martial'
  return 'cute'
}

function Slash({ it }: { it: FxItem }) {
  const mesh = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const r = it.radius ?? 1.5
  const arc = Math.PI * 0.75
  const theta = Math.PI - arc / 2
  const style = fxStyleOf(it.char)
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    if (mat.current) mat.current.opacity = (1 - t) * 0.95
    if (mesh.current) mesh.current.scale.setScalar(0.8 + easeOut(t) * 0.5)
  })
  return (
    <group position={it.pos} rotation={[0, it.yaw ?? 0, 0]}>
      <group rotation={[(it.plane === 'vertical' ? 0 : (it.tilt ?? 0) * 2), 0, 0]} scale={[1, it.flip ? -1 : 1, 1]}>
        <group ref={mesh}>
          {style === 'pixel' ? (
            <>
              {[-0.6, -0.3, 0, 0.3, 0.6].map((a, i) => (
                <mesh key={i} position={[0, Math.sin(a) * r * 0.85, Math.cos(a) * r * 0.85]}>
                  <boxGeometry args={[0.22, 0.22, 0.22]} />
                  <meshBasicMaterial ref={i === 0 ? mat : undefined} color={i % 2 === 0 ? it.color : '#ffffff'} transparent blending={ADD} depthWrite={false} />
                </mesh>
              ))}
            </>
          ) : style === 'katana' ? (
            <>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[r * 0.72, r, 32, 1, theta, arc]} />
                <meshBasicMaterial ref={mat} color={it.color} transparent side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0.22]}>
                <ringGeometry args={[r * 0.86, r * 0.96, 32, 1, theta, arc]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
              </mesh>
            </>
          ) : style === 'magic' ? (
            <>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[r * 0.6, r, 8, 1, theta, arc]} />
                <meshBasicMaterial ref={mat} color={it.color} transparent side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
              </mesh>
              <mesh position={[0, 0, r * 0.85]}>
                <octahedronGeometry args={[0.22, 0]} />
                <meshBasicMaterial color="#fde047" transparent opacity={0.9} blending={ADD} />
              </mesh>
            </>
          ) : style === 'cute' ? (
            <>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[r * 0.55, r, 24, 1, theta, arc]} />
                <meshBasicMaterial ref={mat} color={it.color} transparent side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
              </mesh>
              {[-0.4, 0, 0.4].map((a, i) => (
                <mesh key={i} position={[0, Math.sin(a) * r, Math.cos(a) * r]}>
                  <octahedronGeometry args={[0.14, 0]} />
                  <meshBasicMaterial color="#fde047" transparent opacity={0.85} blending={ADD} />
                </mesh>
              ))}
            </>
          ) : (
            <>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[r * 0.52, r, 32, 1, theta, arc]} />
                <meshBasicMaterial ref={mat} color={it.color} transparent side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[r * 0.68, r * 0.82, 32, 1, theta, arc]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.65} side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
              </mesh>
            </>
          )}
        </group>
      </group>
    </group>
  )
}

function Ring({ it }: { it: FxItem }) {
  const mesh = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const R = it.radius ?? 2
  const style = fxStyleOf(it.char)
  const segs = style === 'pixel' ? 4 : style === 'magic' ? 8 : style === 'katana' ? 6 : 48
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
        <ringGeometry args={[0.88, 1, segs]} />
        <meshBasicMaterial ref={mat} color={it.color} transparent side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.9, 1, segs]} />
        <meshBasicMaterial color={style === 'magic' ? '#fde047' : it.color} transparent opacity={0.6} side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
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

function SlingshotFx({ it }: { it: FxItem }) {
  const g = useRef<THREE.Group>(null)
  const band = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    if (band.current) {
      // 前 32% 拉弓蓄力向後拉，之後彈射回彈
      const pull = t < 0.32 ? -(t / 0.32) * 0.9 : Math.max(0, 1 - (t - 0.32) * 4) * 0.45
      band.current.position.z = pull
      band.current.scale.z = 1 + Math.abs(pull) * 1.4
    }
    if (g.current) {
      const s = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1
      g.current.scale.setScalar(Math.max(0.01, s))
    }
  })
  return (
    <group ref={g} position={[it.pos[0], it.pos[1] - 0.4, it.pos[2]]} rotation={[0, it.yaw ?? 0, 0]}>
      {/* 木質 Y 型彈弓底座與雙叉臂 */}
      <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.1, 0.12, 0.75, 8]} /><meshStandardMaterial color="#78350f" /></mesh>
      <mesh position={[-0.22, 0.92, 0]} rotation={[0, 0, 0.38]}><cylinderGeometry args={[0.075, 0.09, 0.65, 8]} /><meshStandardMaterial color="#92400e" /></mesh>
      <mesh position={[0.22, 0.92, 0]} rotation={[0, 0, -0.38]}><cylinderGeometry args={[0.075, 0.09, 0.65, 8]} /><meshStandardMaterial color="#92400e" /></mesh>
      {/* 彈力橡皮筋與皮兜 */}
      <mesh ref={band} position={[0, 1.05, 0]}>
        <boxGeometry args={[0.72, 0.07, 0.14]} />
        <meshStandardMaterial color="#451a03" emissive="#dc2626" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

function SummonFx({ it }: { it: FxItem }) {
  const g = useRef<THREE.Group>(null)
  const sub = useRef<THREE.Group>(null)
  const dir = it.dir ?? 1
  useFrame((_, dt) => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    if (!g.current) return
    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : Math.min(1, t * 5)
    g.current.scale.setScalar((it.size ?? 1) * fade)
    if (it.model === 'ufo') {
      g.current.position.x = it.pos[0] + Math.sin(t * Math.PI * 2) * 2.2 * dir
      g.current.position.y = it.pos[1] + Math.sin(t * Math.PI * 4) * 0.25
      if (sub.current) sub.current.rotation.y += dt * 4
    } else if (it.model === 'goldfish') {
      g.current.position.x = it.pos[0] + dir * t * 7.5
      g.current.position.y = it.pos[1] + Math.sin(t * Math.PI * 3) * 0.45
      if (sub.current) sub.current.rotation.y = Math.sin(t * 22) * 0.35
    } else if (it.model === 'train') {
      g.current.position.x = it.pos[0] + dir * (-6 + t * 18)
    } else if (it.model === 'eagle') {
      g.current.position.y = it.pos[1] + (1 - Math.sin(t * Math.PI)) * 6.5
      g.current.position.x = it.pos[0] + dir * (t - 0.5) * 4
    } else if (it.model === 'needle') {
      g.current.position.y = it.pos[1] + Math.max(0, 1 - t * 3.5) * 7
    } else if (it.model === 'thunderFox') {
      g.current.position.x = it.pos[0] + dir * t * 8.5
      g.current.position.y = it.pos[1] + Math.abs(Math.sin(t * Math.PI * 4)) * 0.45
    } else if (it.model === 'baku') {
      g.current.position.x = it.pos[0] + dir * t * 2.2
      g.current.position.y = it.pos[1] + Math.sin(t * Math.PI * 3) * 0.3
      if (sub.current) sub.current.rotation.z = Math.sin(t * Math.PI * 4) * 0.08
    } else if (it.model === 'iceShark') {
      g.current.position.x = it.pos[0] + dir * t * 7.2
      g.current.position.y = it.pos[1] + Math.sin(t * Math.PI * 3) * 0.35
      if (sub.current) sub.current.rotation.y = Math.sin(t * 16) * 0.2
    } else if (it.model === 'hollow') {
      g.current.position.x = it.pos[0] + dir * t * 18
      if (sub.current) { sub.current.rotation.z += dt * 6; sub.current.rotation.y += dt * 4 }
    } else if (it.model === 'exodia') {
      g.current.position.y = it.pos[1] + Math.sin(t * Math.PI) * 0.65
      if (sub.current) sub.current.rotation.z += dt * 2.2
    } else {
      g.current.position.x = it.pos[0] + dir * t * 3.5
      if (sub.current) sub.current.rotation.z += dt * 3
    }
  })

  return (
    <group ref={g} position={it.pos} rotation={[0, dir < 0 ? Math.PI : 0, 0]}>
      {it.model === 'ufo' && (
        <group ref={sub}>
          <mesh><cylinderGeometry args={[1.3, 1.8, 0.45, 16]} /><meshStandardMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.6} /></mesh>
          <mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.85, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.7} /></mesh>
          <mesh position={[0, -2.2, 0]}><coneGeometry args={[1.5, 4.2, 16, 1, true]} /><meshBasicMaterial color="#4ade80" transparent opacity={0.28} blending={ADD} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        </group>
      )}
      {it.model === 'goldfish' && (
        <>
          <mesh scale={[1.4, 0.85, 0.7]}><sphereGeometry args={[0.7, 14, 14]} /><meshStandardMaterial color="#18181b" emissive="#ef4444" emissiveIntensity={0.45} /></mesh>
          <mesh position={[0.45, 0.12, 0.45]}><sphereGeometry args={[0.1, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          <mesh position={[0.1, 0.7, 0]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.7, 0.55, 0.08]} /><meshBasicMaterial color="#ef4444" transparent opacity={0.85} /></mesh>
          <group ref={sub} position={[-0.95, 0, 0]}>
            <mesh position={[-0.45, 0.2, 0]} rotation={[0, 0, 0.4]}><boxGeometry args={[0.95, 0.5, 0.06]} /><meshBasicMaterial color="#dc2626" transparent opacity={0.8} /></mesh>
            <mesh position={[-0.45, -0.2, 0]} rotation={[0, 0, -0.4]}><boxGeometry args={[0.95, 0.5, 0.06]} /><meshBasicMaterial color="#18181b" transparent opacity={0.85} /></mesh>
          </group>
        </>
      )}
      {it.model === 'ghost' && (
        <group ref={sub}>
          <mesh><sphereGeometry args={[0.8, 16, 16]} /><meshStandardMaterial color="#ffffff" emissive="#f97316" emissiveIntensity={0.35} /></mesh>
          <mesh position={[0.35, 0.15, 0.65]}><sphereGeometry args={[0.12, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          <mesh position={[-0.35, 0.15, 0.65]}><sphereGeometry args={[0.12, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.75, 0.9, 0.6, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </group>
      )}
      {it.model === 'blueEyes' && (
        <group ref={sub}>
          <mesh position={[0.5, 0.2, 0]}><boxGeometry args={[1.4, 0.85, 0.9]} /><meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={0.55} /></mesh>
          <mesh position={[-0.6, 0.7, 0.9]} rotation={[0.4, 0, 0.3]}><boxGeometry args={[1.6, 0.12, 1.8]} /><meshBasicMaterial color="#bae6fd" transparent opacity={0.85} /></mesh>
          <mesh position={[-0.6, 0.7, -0.9]} rotation={[-0.4, 0, 0.3]}><boxGeometry args={[1.6, 0.12, 1.8]} /><meshBasicMaterial color="#bae6fd" transparent opacity={0.85} /></mesh>
        </group>
      )}
      {it.model === 'train' && (
        <group>
          <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.9, 4.2, 8, 16]} /><meshStandardMaterial color="#e2e8f0" emissive="#facc15" emissiveIntensity={0.35} /></mesh>
          <mesh position={[2.2, 0, 0]}><sphereGeometry args={[0.95, 14, 14]} /><meshBasicMaterial color="#38bdf8" transparent opacity={0.85} /></mesh>
        </group>
      )}
      {it.model === 'eagle' && (
        <group>
          <mesh><sphereGeometry args={[1.0, 14, 14]} /><meshStandardMaterial color="#78350f" /></mesh>
          <mesh position={[0, 0.5, 0]}><sphereGeometry args={[0.7, 12, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0.7, 0.4, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.25, 0.6, 6]} /><meshStandardMaterial color="#facc15" /></mesh>
          <mesh position={[0, 0.2, 1.6]} rotation={[0.25, 0, 0]}><boxGeometry args={[1.2, 0.15, 2.8]} /><meshStandardMaterial color="#92400e" /></mesh>
          <mesh position={[0, 0.2, -1.6]} rotation={[-0.25, 0, 0]}><boxGeometry args={[1.2, 0.15, 2.8]} /><meshStandardMaterial color="#92400e" /></mesh>
        </group>
      )}
      {it.model === 'needle' && (
        <group>
          <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.35, 3.8, 10]} /><meshStandardMaterial color="#e2e8f0" emissive="#e879f9" emissiveIntensity={0.6} /></mesh>
          <mesh position={[0, 2.0, 0]}><torusGeometry args={[0.38, 0.09, 8, 18]} /><meshBasicMaterial color="#f0abfc" /></mesh>
        </group>
      )}
      {it.model === 'hollow' && (
        <group ref={sub}>
          <mesh><sphereGeometry args={[1.1, 18, 18]} /><meshBasicMaterial color="#a855f7" transparent opacity={0.8} /></mesh>
          <mesh><torusGeometry args={[1.7, 0.1, 10, 24]} /><meshBasicMaterial color="#38bdf8" /></mesh>
          <mesh rotation={[0.8, 0.4, 0]}><torusGeometry args={[1.9, 0.1, 10, 24]} /><meshBasicMaterial color="#ef4444" /></mesh>
        </group>
      )}
      {it.model === 'iceShark' && (
        <group ref={sub}>
          <mesh scale={[1.6, 0.85, 0.75]}><coneGeometry args={[0.75, 1.8, 8]} /><meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.65} /></mesh>
          <mesh position={[-0.2, 0.75, 0]} rotation={[0, 0, -0.4]}><boxGeometry args={[0.5, 0.75, 0.12]} /><meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.6} /></mesh>
          <mesh position={[-1.0, 0.15, 0]} rotation={[0, 0, 0.45]}><boxGeometry args={[0.65, 0.55, 0.1]} /><meshBasicMaterial color="#facc15" /></mesh>
        </group>
      )}
      {it.model === 'thunderFox' && (
        <group ref={sub}>
          {/* 雷狐身軀與頭部 */}
          <mesh scale={[1.3, 0.85, 0.85]}><sphereGeometry args={[0.65, 12, 12]} /><meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.65} /></mesh>
          <mesh position={[0.65, 0.3, 0]}><sphereGeometry args={[0.42, 12, 12]} /><meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.5} /></mesh>
          {/* 狐狸眼睛與尖鼻 */}
          <mesh position={[0.92, 0.36, 0.2]}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color="#38bdf8" /></mesh>
          <mesh position={[0.92, 0.36, -0.2]}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color="#38bdf8" /></mesh>
          {/* 四肢 */}
          {[[0.35, -0.55, 0.25], [0.35, -0.55, -0.25], [-0.4, -0.55, 0.25], [-0.4, -0.55, -0.25]].map(([lx, ly, lz], i) => (
            <mesh key={i} position={[lx, ly, lz]}><cylinderGeometry args={[0.1, 0.08, 0.5, 6]} /><meshStandardMaterial color="#eab308" /></mesh>
          ))}
          {/* 尖銳狐耳 */}
          <mesh position={[0.55, 0.82, 0.22]} rotation={[0, 0, -0.25]}><coneGeometry args={[0.14, 0.45, 5]} /><meshStandardMaterial color="#facc15" /></mesh>
          <mesh position={[0.55, 0.82, -0.22]} rotation={[0, 0, -0.25]}><coneGeometry args={[0.14, 0.45, 5]} /><meshStandardMaterial color="#facc15" /></mesh>
          {/* 閃電蓬鬆狐尾 */}
          <mesh position={[-0.85, 0.35, 0]} rotation={[0, 0, 0.65]}><coneGeometry args={[0.32, 1.1, 6]} /><meshStandardMaterial color="#38bdf8" emissive="#facc15" emissiveIntensity={0.7} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.05, 0.06, 8, 20]} /><meshBasicMaterial color="#38bdf8" /></mesh>
        </group>
      )}
      {it.model === 'baku' && (
        <group ref={sub}>
          {/* 夢貘圓潤身軀＋紫色夢境鞍紋 */}
          <mesh scale={[1.35, 1.0, 0.95]}><sphereGeometry args={[0.72, 14, 14]} /><meshStandardMaterial color="#3b0764" emissive="#7e22ce" emissiveIntensity={0.5} /></mesh>
          <mesh position={[-0.1, 0.15, 0]} scale={[0.9, 0.92, 1.02]}><sphereGeometry args={[0.65, 12, 12]} /><meshStandardMaterial color="#e9d5ff" /></mesh>
          {/* 眼睛與四肢 */}
          <mesh position={[0.72, 0.28, 0.28]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#f0abfc" /></mesh>
          <mesh position={[0.72, 0.28, -0.28]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#f0abfc" /></mesh>
          {[[0.4, -0.65, 0.28], [0.4, -0.65, -0.28], [-0.45, -0.65, 0.28], [-0.45, -0.65, -0.28]].map(([lx, ly, lz], i) => (
            <mesh key={i} position={[lx, ly, lz]}><cylinderGeometry args={[0.13, 0.11, 0.45, 6]} /><meshStandardMaterial color="#3b0764" /></mesh>
          ))}
          {/* 夢貘長鼻與圓耳 */}
          <mesh position={[0.95, 0.02, 0]} rotation={[0, 0, -1.25]}><cylinderGeometry args={[0.14, 0.22, 0.65, 10]} /><meshStandardMaterial color="#581c87" /></mesh>
          <mesh position={[0.45, 0.68, 0.35]}><sphereGeometry args={[0.18, 10, 10]} /><meshStandardMaterial color="#c084fc" /></mesh>
          <mesh position={[0.45, 0.68, -0.35]}><sphereGeometry args={[0.18, 10, 10]} /><meshStandardMaterial color="#c084fc" /></mesh>
          {/* 夢境睡眠光環 */}
          <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.85, 0.07, 8, 22]} /><meshBasicMaterial color="#e879f9" /></mesh>
        </group>
      )}
      {it.model === 'exodia' && (
        <group>
          {/* 黑暗大法師・艾克索迪亞：黃金巨軀＋千年印記胸甲 */}
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[1.6, 2.0, 1.1]} /><meshStandardMaterial color="#b45309" emissive="#facc15" emissiveIntensity={0.35} metalness={0.6} /></mesh>
          <mesh position={[0.6, 0.45, 0]}><sphereGeometry args={[0.28, 12, 12]} /><meshBasicMaterial color="#ef4444" /></mesh>
          {/* 黃金巨肩甲 */}
          <mesh position={[0, 1.1, 0.95]}><boxGeometry args={[1.1, 0.7, 0.8]} /><meshStandardMaterial color="#facc15" metalness={0.7} /></mesh>
          <mesh position={[0, 1.1, -0.95]}><boxGeometry args={[1.1, 0.7, 0.8]} /><meshStandardMaterial color="#facc15" metalness={0.7} /></mesh>
          {/* 雙前伸黃金巨拳＋封印鐵鍊手銬 */}
          <mesh position={[1.45, 0.55, 0.95]}><boxGeometry args={[1.35, 0.58, 0.58]} /><meshStandardMaterial color="#eab308" emissive="#fde047" emissiveIntensity={0.4} /></mesh>
          <mesh position={[1.45, 0.55, -0.95]}><boxGeometry args={[1.35, 0.58, 0.58]} /><meshStandardMaterial color="#eab308" emissive="#fde047" emissiveIntensity={0.4} /></mesh>
          <mesh position={[0.95, 0.55, 0.95]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.35, 0.08, 8, 16]} /><meshStandardMaterial color="#1e293b" /></mesh>
          <mesh position={[0.95, 0.55, -0.95]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.35, 0.08, 8, 16]} /><meshStandardMaterial color="#1e293b" /></mesh>
          {/* 法老黃金頭盔＋雙角＋紅眼 */}
          <mesh position={[0.1, 1.85, 0]}><boxGeometry args={[0.85, 0.9, 0.85]} /><meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.3} /></mesh>
          <mesh position={[0.15, 2.45, 0.35]} rotation={[0.3, 0, -0.2]}><coneGeometry args={[0.16, 0.65, 5]} /><meshStandardMaterial color="#fde047" /></mesh>
          <mesh position={[0.15, 2.45, -0.35]} rotation={[-0.3, 0, -0.2]}><coneGeometry args={[0.16, 0.65, 5]} /><meshStandardMaterial color="#fde047" /></mesh>
          <mesh position={[0.55, 1.9, 0.22]}><sphereGeometry args={[0.09, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          <mesh position={[0.55, 1.9, -0.22]}><sphereGeometry args={[0.09, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          {/* 背後旋轉千年魔法陣 */}
          <group ref={sub} position={[-0.75, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh><torusGeometry args={[2.3, 0.1, 10, 32]} /><meshBasicMaterial color="#fde047" /></mesh>
            <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[3.2, 0.12, 0.12]} /><meshBasicMaterial color="#f59e0b" /></mesh>
          </group>
        </group>
      )}
    </group>
  )
}

function FatalFx({ it }: { it: FxItem }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = age01(it)
    if (t >= 1) return removeFx(it.id)
    if (!g.current) return
    const s = 0.6 + easeOut(t) * 1.4
    g.current.scale.setScalar(s)
    g.current.rotation.z = t * 0.4
  })
  return (
    <group ref={g} position={it.pos}>
      {/* 大亂鬥致命一擊：黑紅閃電交叉裂空星芒 */}
      {[0, 0.78, 1.57, 2.35].map((a, i) => (
        <mesh key={i} rotation={[0, 0, a]}>
          <boxGeometry args={[it.radius ? it.radius * 2.4 : 9, i % 2 === 0 ? 0.35 : 0.22, 0.2]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#ef4444' : '#ffffff'} transparent opacity={0.95} blending={ADD} depthWrite={false} />
        </mesh>
      ))}
      <mesh>
        <ringGeometry args={[2.0, 2.7, 32]} />
        <meshBasicMaterial color="#dc2626" transparent opacity={0.85} side={THREE.DoubleSide} blending={ADD} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} />
      </mesh>
    </group>
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
          case 'slingshot': return <SlingshotFx key={it.id} it={it} />
          case 'summon': return <SummonFx key={it.id} it={it} />
          case 'fatal': return <FatalFx key={it.id} it={it} />
        }
      })}
    </>
  )
}

function ProjectileView({ p }: { p: Projectile }) {
  const g = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const charId = useGameStore.getState().selection[p.owner]
  const ownerColor = PLAYER_COLORS[p.owner] ?? p.color
  const skillId = p.source.def.id
  const r = p.radius

  useFrame((_, dt) => {
    if (g.current) {
      g.current.position.set(p.pos[0], p.pos[1], p.pos[2])
    }
    if (spin.current) {
      if (charId === 'kong' || charId === 'mario' || charId === 'bomber' || charId === 'snake' || charId === 'marisa' || charId === 'reimu' || charId === 'yugi' || charId === 'kaiba' || charId === 'tetro' || charId === 'rapi' || charId === 'yodaka' || charId === 'kaoruko' || charId === 'akira' || charId === 'kotone') {
        spin.current.rotation.z -= Math.sign(p.vel[0] || 1) * dt * 10
        spin.current.rotation.y += dt * 4
      } else {
        spin.current.rotation.z = Math.atan2(p.vel[1], p.vel[0])
      }
    }
  })

  return (
    <group ref={g} position={p.pos}>
      <mesh>
        <torusGeometry args={[r * 1.18, Math.max(0.06, r * 0.12), 8, 20]} />
        <meshBasicMaterial color={ownerColor} transparent opacity={0.8} blending={ADD} depthWrite={false} />
      </mesh>
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
        ) : charId === 'chihiro' ? (
          <group scale={[r * 1.15, r * 1.15, r * 1.15]}>
            {/* 六平千礦：直接發射 3D 黑紅金魚（錦／涅） */}
            <mesh scale={[1.4, 0.85, 0.7]}><sphereGeometry args={[0.7, 14, 14]} /><meshStandardMaterial color="#18181b" emissive="#ef4444" emissiveIntensity={0.55} /></mesh>
            <mesh position={[0.45, 0.12, 0.45]}><sphereGeometry args={[0.1, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
            <mesh position={[0.45, 0.12, -0.45]}><sphereGeometry args={[0.1, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
            <mesh position={[0.1, 0.7, 0]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.7, 0.55, 0.08]} /><meshBasicMaterial color="#ef4444" transparent opacity={0.9} /></mesh>
            <mesh position={[-1.1, 0.2, 0]} rotation={[0, 0, 0.4]}><boxGeometry args={[0.95, 0.5, 0.06]} /><meshBasicMaterial color="#dc2626" transparent opacity={0.85} /></mesh>
            <mesh position={[-1.1, -0.2, 0]} rotation={[0, 0, -0.4]}><boxGeometry args={[0.95, 0.5, 0.06]} /><meshBasicMaterial color="#18181b" transparent opacity={0.9} /></mesh>
          </group>
        ) : charId === 'hutao' ? (
          <>
            <mesh><sphereGeometry args={[r * 0.85, 14, 14]} /><meshStandardMaterial color="#ffffff" emissive="#f97316" emissiveIntensity={0.5} /></mesh>
            <mesh position={[r * 0.35, r * 0.2, r * 0.5]}><sphereGeometry args={[r * 0.16, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
            <mesh position={[r * 0.35, r * 0.2, -r * 0.5]}><sphereGeometry args={[r * 0.16, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </>
        ) : charId === 'kotone' ? (
          <>
            <mesh><octahedronGeometry args={[r * 1.05, 0]} /><meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.85} /></mesh>
            <mesh><torusGeometry args={[r * 1.15, r * 0.12, 8, 20]} /><meshBasicMaterial color="#ffffff" blending={ADD} /></mesh>
          </>
        ) : charId === 'rapi' ? (
          <>
            {/* NIKKE 拉毗：3D 軍用手榴彈 */}
            <mesh><cylinderGeometry args={[r * 0.65, r * 0.65, r * 1.35, 10]} /><meshStandardMaterial color="#3f6212" roughness={0.5} /></mesh>
            <mesh position={[0, r * 0.85, 0]}><cylinderGeometry args={[r * 0.25, r * 0.3, r * 0.35, 8]} /><meshStandardMaterial color="#94a3b8" metalness={0.7} /></mesh>
            <mesh position={[r * 0.35, r * 0.65, 0]} rotation={[0, 0, -0.4]}><boxGeometry args={[r * 0.14, r * 0.9, r * 0.22]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
            <mesh position={[0, 0, r * 0.68]}><sphereGeometry args={[r * 0.2, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </>
        ) : charId === 'spe' ? (
          <>
            {/* 賽馬娘：3D 特製紅蘿蔔飛彈 */}
            <mesh rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.55, r * 2.2, 10]} /><meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.35} /></mesh>
            <mesh position={[-r * 1.15, 0, 0]}><boxGeometry args={[r * 0.7, r * 0.6, r * 0.25]} /><meshStandardMaterial color="#22c55e" /></mesh>
          </>
        ) : charId === 'kaoruko' ? (
          <>
            {/* 薰子：3D 草莓鮮奶油蛋糕 */}
            <mesh><cylinderGeometry args={[r * 0.9, r * 0.9, r * 0.95, 12]} /><meshStandardMaterial color="#fff1f2" /></mesh>
            <mesh position={[0, r * 0.05, 0]}><cylinderGeometry args={[r * 0.92, r * 0.92, r * 0.25, 12]} /><meshStandardMaterial color="#f472b6" /></mesh>
            <mesh position={[0, r * 0.68, 0]}><sphereGeometry args={[r * 0.35, 10, 10]} /><meshStandardMaterial color="#ef4444" /></mesh>
          </>
        ) : charId === 'akira' ? (
          <>
            {/* 百瀨晶：3D 粉紅初戀作戰筆記 / 情書 */}
            <mesh><boxGeometry args={[r * 1.8, r * 1.25, r * 0.22]} /><meshStandardMaterial color="#fbcfe8" emissive="#f472b6" emissiveIntensity={0.35} /></mesh>
            <mesh position={[0, 0, r * 0.14]}><sphereGeometry args={[r * 0.3, 8, 8]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </>
        ) : charId === 'yodaka' ? (
          <>
            {/* 夜鷹：3D 忍者十字手裡劍 */}
            <mesh><boxGeometry args={[r * 2.4, r * 0.42, r * 0.12]} /><meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} /></mesh>
            <mesh><boxGeometry args={[r * 0.42, r * 2.4, r * 0.12]} /><meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} /></mesh>
            <mesh><cylinderGeometry args={[r * 0.25, r * 0.25, r * 0.18, 10]} /><meshBasicMaterial color="#38bdf8" /></mesh>
          </>
        ) : charId === 'nona' ? (
          <>
            {/* 諾娜：3D 銀白縫紉魔針 */}
            <mesh rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.35, r * 2.5, 8]} /><meshStandardMaterial color="#e2e8f0" emissive="#e879f9" emissiveIntensity={0.55} /></mesh>
            <mesh position={[-r * 1.25, 0, 0]}><torusGeometry args={[r * 0.32, r * 0.09, 6, 14]} /><meshBasicMaterial color="#f0abfc" /></mesh>
          </>
        ) : charId === 'stelle' ? (
          <>
            {/* 星：3D 存護炎槍槍尖 */}
            <mesh rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.52, r * 2.5, 6]} /><meshStandardMaterial color="#f97316" emissive="#facc15" emissiveIntensity={0.75} /></mesh>
            <mesh position={[-r * 0.9, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r * 0.65, r * 0.1, 8, 16]} /><meshBasicMaterial color="#fde047" /></mesh>
          </>
        ) : charId === 'arisa' || charId === 'miyabi' || charId === 'rover' ? (
          <>
            <mesh><boxGeometry args={[r * 2.5, r * 0.38, r * 0.38]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><sphereGeometry args={[r * 0.95, 12, 12]} /><meshBasicMaterial color={p.color} transparent opacity={0.5} blending={ADD} depthWrite={false} /></mesh>
          </>
        ) : charId === 'ichi' ? (
          <group scale={[r * 0.9, r * 0.9, r * 0.9]}>
            {/* 伊奇：3D 雷狐動物魔彈 */}
            <mesh scale={[1.3, 0.85, 0.85]}><sphereGeometry args={[0.65, 12, 12]} /><meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.65} /></mesh>
            <mesh position={[0.65, 0.3, 0]}><sphereGeometry args={[0.42, 12, 12]} /><meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.5} /></mesh>
            <mesh position={[0.92, 0.36, 0.2]}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color="#38bdf8" /></mesh>
            <mesh position={[0.92, 0.36, -0.2]}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color="#38bdf8" /></mesh>
            {[[0.35, -0.55, 0.25], [0.35, -0.55, -0.25], [-0.4, -0.55, 0.25], [-0.4, -0.55, -0.25]].map(([lx, ly, lz], i) => (
              <mesh key={i} position={[lx, ly, lz]}><cylinderGeometry args={[0.1, 0.08, 0.5, 6]} /><meshStandardMaterial color="#eab308" /></mesh>
            ))}
            <mesh position={[0.55, 0.82, 0.22]} rotation={[0, 0, -0.25]}><coneGeometry args={[0.14, 0.45, 5]} /><meshStandardMaterial color="#facc15" /></mesh>
            <mesh position={[0.55, 0.82, -0.22]} rotation={[0, 0, -0.25]}><coneGeometry args={[0.14, 0.45, 5]} /><meshStandardMaterial color="#facc15" /></mesh>
            <mesh position={[-0.85, 0.35, 0]} rotation={[0, 0, 0.65]}><coneGeometry args={[0.32, 1.1, 6]} /><meshStandardMaterial color="#38bdf8" emissive="#facc15" emissiveIntensity={0.7} /></mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.05, 0.06, 8, 20]} /><meshBasicMaterial color="#38bdf8" /></mesh>
          </group>
        ) : charId === 'gojo' || charId === 'ruri' || charId === 'lumine' || charId === 'saki' ? (
          <>
            <mesh><octahedronGeometry args={[r * 0.95, 0]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><sphereGeometry args={[r * 1.15, 14, 14]} /><meshBasicMaterial color={p.color} transparent opacity={0.55} blending={ADD} depthWrite={false} /></mesh>
            <mesh rotation={[Math.PI / 4, 0, 0]}><torusGeometry args={[r * 1.1, r * 0.1, 8, 20]} /><meshBasicMaterial color={p.color} blending={ADD} /></mesh>
          </>
        ) : charId === 'deku' ? (
          <>
            {/* 綠谷：Air Force 綠色空氣壓縮氣環 */}
            <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r * 0.95, r * 0.2, 8, 20]} /><meshBasicMaterial color="#4ade80" /></mesh>
            <mesh><octahedronGeometry args={[r * 0.55, 0]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'mario' ? (
          <>
            {/* 瑪利歐：3D 跳彈火球 */}
            <mesh><sphereGeometry args={[r * 0.85, 12, 12]} /><meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={0.85} /></mesh>
            <mesh><torusGeometry args={[r * 0.95, r * 0.14, 8, 16]} /><meshBasicMaterial color="#fde047" /></mesh>
          </>
        ) : charId === 'frogger' ? (
          <>
            {/* 青蛙：3D 荷葉 / 水泡彈 */}
            <mesh><cylinderGeometry args={[r * 0.95, r * 0.95, r * 0.24, 14]} /><meshStandardMaterial color="#22c55e" emissive="#4ade80" emissiveIntensity={0.4} /></mesh>
            <mesh position={[0, r * 0.35, 0]}><sphereGeometry args={[r * 0.45, 10, 10]} /><meshBasicMaterial color="#38bdf8" transparent opacity={0.75} /></mesh>
          </>
        ) : charId === 'pacman' ? (
          <>
            {/* 小精靈：3D 能量豆 Power Pellet */}
            <mesh><octahedronGeometry args={[r * 0.9, 0]} /><meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.9} /></mesh>
          </>
        ) : charId === 'bakugo' ? (
          <>
            {/* 爆豪：3D 手榴彈爆炎彈 */}
            <mesh><sphereGeometry args={[r * 0.85, 10, 10]} /><meshStandardMaterial color="#14532d" emissive="#f97316" emissiveIntensity={0.5} /></mesh>
            <mesh><torusGeometry args={[r * 1.05, r * 0.14, 8, 16]} /><meshBasicMaterial color="#fde047" /></mesh>
          </>
        ) : charId === 'sukuna' ? (
          <>
            {/* 宿儺：交叉紅色「解」斬擊波 */}
            <mesh rotation={[0, 0, 0.55]}><boxGeometry args={[r * 2.4, r * 0.25, r * 0.25]} /><meshBasicMaterial color="#ef4444" /></mesh>
            <mesh rotation={[0, 0, -0.55]}><boxGeometry args={[r * 2.4, r * 0.25, r * 0.25]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'ellen' ? (
          <>
            {/* 艾蓮：急凍鯊魚鰭冰刃 */}
            <mesh rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.75, r * 2.1, 4]} /><meshStandardMaterial color="#1e293b" emissive="#38bdf8" emissiveIntensity={0.75} /></mesh>
            <mesh><torusGeometry args={[r * 0.95, r * 0.1, 6, 14]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </>
        ) : charId === 'firefly' ? (
          <>
            {/* 流螢：薩姆烈焰翠綠核心爆彈 */}
            <mesh><octahedronGeometry args={[r * 0.85, 0]} /><meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.95} /></mesh>
            <mesh><torusGeometry args={[r * 1.08, r * 0.14, 8, 18]} /><meshBasicMaterial color="#f97316" /></mesh>
          </>
        ) : charId === 'jinhsi' ? (
          <>
            {/* 今汐：歲主金色龍珠光束 */}
            <mesh><sphereGeometry args={[r * 0.85, 14, 14]} /><meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={1} /></mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r * 1.2, r * 0.12, 8, 20]} /><meshBasicMaterial color="#fde047" /></mesh>
          </>
        ) : charId === 'youmu' || charId === 'erika' ? (
          <>
            {/* 妖夢／艾莉卡：雙重劍氣斬波 */}
            <mesh rotation={[0, 0, 0.35]}><boxGeometry args={[r * 2.3, r * 0.28, r * 0.16]} /><meshBasicMaterial color={p.color} /></mesh>
            <mesh rotation={[0, 0, -0.35]}><boxGeometry args={[r * 1.9, r * 0.22, r * 0.16]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'seija' ? (
          <>
            {/* 正邪：逆轉天邪鬼赤紅箭矢 */}
            <mesh rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.55, r * 2.0, 5]} /><meshStandardMaterial color="#be123c" emissive="#f43f5e" emissiveIntensity={0.85} /></mesh>
          </>
        ) : charId === 'luigi' ? (
          <>
            {/* 路易吉：綠色跳彈火球 */}
            <mesh><sphereGeometry args={[r * 0.85, 12, 12]} /><meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.85} /></mesh>
            <mesh><torusGeometry args={[r * 0.95, r * 0.12, 8, 16]} /><meshBasicMaterial color="#fde047" /></mesh>
          </>
        ) : charId === 'blinky' ? (
          <>
            {/* 紅幽靈：迷你紅幽靈飛彈 */}
            <mesh><sphereGeometry args={[r * 0.85, 12, 12]} /><meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.5} /></mesh>
            <mesh position={[r * 0.35, r * 0.2, r * 0.65]}><sphereGeometry args={[r * 0.2, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position={[r * 0.35, r * 0.2, -r * 0.65]}><sphereGeometry args={[r * 0.2, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'diddy' ? (
          <>
            {/* 狄狄剛：3D 花生彈 */}
            <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[r * 0.45, r * 0.9, 6, 10]} /><meshStandardMaterial color="#d97706" /></mesh>
          </>
        ) : charId === 'creeper' ? (
          <>
            {/* 苦力怕：3D 像素 TNT 炸藥方塊 */}
            <mesh><boxGeometry args={[r * 1.5, r * 1.5, r * 1.5]} /><meshStandardMaterial color="#ef4444" /></mesh>
            <mesh><boxGeometry args={[r * 1.55, r * 0.5, r * 1.55]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'chuck' || charId === 'ducky' ? (
          <>
            {/* Chuck／鴨子：金黃三角飛鏢／羽毛箭 */}
            <mesh rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.65, r * 2.0, 4]} /><meshStandardMaterial color="#facc15" emissive="#f97316" emissiveIntensity={0.5} /></mesh>
          </>
        ) : charId === 'suzuka' ? (
          <>
            {/* 賽馬娘：疾風馬蹄光環 */}
            <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r * 0.9, r * 0.18, 8, 16, Math.PI * 1.4]} /><meshBasicMaterial color={p.color} /></mesh>
          </>
        ) : charId === 'anis' ? (
          <>
            {/* 阿妮絲：橘白蘇打榴彈罐 */}
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.55, r * 0.55, r * 1.3, 12]} /><meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={0.5} /></mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 0.58, r * 0.58, r * 0.3, 12]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'vaus' || charId === 'paddle' || charId === 'ufo' ? (
          <>
            {/* 街機機體：方塊像素光球／外星雷射 */}
            <mesh><boxGeometry args={[r * 1.4, r * 1.4, r * 1.4]} /><meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.85} /></mesh>
          </>
        ) : charId === 'mino' ? (
          <>
            {/* 米諾：3D L 型俄羅斯方塊飛彈 */}
            <mesh position={[0, 0, 0]}><boxGeometry args={[r * 1.1, r * 1.1, r * 1.1]} /><meshStandardMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.6} /></mesh>
            <mesh position={[-r * 1.05, r * 0.9, 0]}><boxGeometry args={[r * 1.0, r * 1.0, r * 1.0]} /><meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.6} /></mesh>
          </>
        ) : charId === 'blackbomber' ? (
          <>
            {/* 黑炸彈人：黑球炸彈＋粉紅導火線 */}
            <mesh><sphereGeometry args={[r * 0.95, 12, 12]} /><meshStandardMaterial color="#18181b" /></mesh>
            <mesh position={[0, r * 0.95, 0]}><sphereGeometry args={[r * 0.35, 8, 8]} /><meshBasicMaterial color="#ec4899" /></mesh>
          </>
        ) : charId === 'viper' ? (
          <>
            {/* 毒蛇：霓虹雙毒牙光刺 */}
            <mesh position={[0, r * 0.3, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.3, r * 1.8, 6]} /><meshBasicMaterial color="#a3e635" /></mesh>
            <mesh position={[0, -r * 0.3, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[r * 0.3, r * 1.8, 6]} /><meshBasicMaterial color="#84cc16" /></mesh>
          </>
        ) : charId === 'ladyfrog' || charId === 'omnelle' || charId === 'rintaro' ? (
          <>
            {/* 粉紅水泡／糖果／花瓣爆彈 */}
            <mesh><sphereGeometry args={[r * 0.9, 14, 14]} /><meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={0.45} transparent opacity={0.88} /></mesh>
            <mesh><torusGeometry args={[r * 1.05, r * 0.1, 8, 18]} /><meshBasicMaterial color="#fde047" /></mesh>
          </>
        ) : charId === 'hakuri' ? (
          <>
            {/* 威葬／風渦雙重共鳴光環 */}
            <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r * 0.95, r * 0.16, 8, 20]} /><meshBasicMaterial color={p.color} /></mesh>
            <mesh><sphereGeometry args={[r * 0.55, 10, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </>
        ) : charId === 'descara' || charId === 'miramira' ? (
          <>
            {/* 深淵／沉降魔法：雙色魔導法球 */}
            <mesh><sphereGeometry args={[r * 0.85, 12, 12]} /><meshStandardMaterial color={charId === 'descara' ? '#09090b' : '#14b8a6'} emissive={p.color} emissiveIntensity={0.75} /></mesh>
            <mesh rotation={[Math.PI / 3, 0, 0]}><torusGeometry args={[r * 1.15, r * 0.12, 8, 18]} /><meshBasicMaterial color={charId === 'descara' ? '#fde047' : '#a855f7'} /></mesh>
          </>
        ) : charId === 'hibari' ? (
          <>
            {/* 忍者：旋轉十字手裏劍 */}
            <mesh><boxGeometry args={[r * 2.1, r * 0.35, r * 0.16]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} /></mesh>
            <mesh><boxGeometry args={[r * 0.35, r * 2.1, r * 0.16]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} /></mesh>
          </>
        ) : charId === 'hajime' ? (
          <>
            {/* 久我山元：白底紅線棒球直球 */}
            <mesh><sphereGeometry args={[r * 0.85, 14, 14]} /><meshStandardMaterial color="#ffffff" /></mesh>
            <mesh rotation={[0.4, 0.4, 0]}><torusGeometry args={[r * 0.86, r * 0.08, 6, 18]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </>
        ) : charId === 'umi' ? (
          <>
            {/* 青木海：3D 便當盒炸彈 */}
            <mesh><boxGeometry args={[r * 1.5, r * 0.9, r * 1.2]} /><meshStandardMaterial color="#d97706" /></mesh>
            <mesh><boxGeometry args={[r * 1.55, r * 0.25, r * 1.25]} /><meshBasicMaterial color="#ef4444" /></mesh>
          </>
        ) : charId === 'doh' ? (
          <>
            {/* 多夫：浮空摩艾巨岩磚塊 */}
            <mesh><boxGeometry args={[r * 1.3, r * 1.8, r * 1.1]} /><meshStandardMaterial color="#92400e" emissive="#a855f7" emissiveIntensity={0.4} /></mesh>
          </>
        ) : charId === 'ruri' ? (
          <>
            {/* 瑠璃：龍炎電光雙色火球 */}
            <mesh><sphereGeometry args={[r * 0.9, 12, 12]} /><meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={0.85} /></mesh>
            <mesh><torusGeometry args={[r * 1.1, r * 0.12, 8, 18]} /><meshBasicMaterial color="#34d399" /></mesh>
          </>
        ) : charId === 'akira' || charId === 'saki' ? (
          <>
            {/* 亞里／咲季：筆記紙頁／應援星光 */}
            <mesh rotation={[0.2, 0.3, 0]}><boxGeometry args={[r * 1.5, r * 1.1, r * 0.12]} /><meshStandardMaterial color="#ffffff" emissive={p.color} emissiveIntensity={0.5} /></mesh>
          </>
        ) : (
          <>
            <mesh><octahedronGeometry args={[r * 0.85, 0]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh><torusGeometry args={[r * 1.0, r * 0.12, 8, 20]} /><meshBasicMaterial color={p.color} transparent opacity={0.75} blending={ADD} depthWrite={false} /></mesh>
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
