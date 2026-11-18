import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from '../game/runtime'
import { useGameStore } from '../game/store'
import type { CharacterId, FighterId } from '../game/types'

const RETRO_IDS = new Set<CharacterId>([
  'pacman', 'mario', 'invader', 'bomber', 'snake',
  'frogger', 'kong', 'pong', 'reimu', 'marisa',
  'ryu', 'chunli', 'yugi', 'kaiba',
  'omnom', 'tom', 'ben', 'crossy', 'red', 'steve', 'arisa',
  'chihiro', 'ichi', 'ruri', 'nona', 'gojo', 'deku', 'yodaka', 'saki', 'spe', 'kaoruko',
  'stelle', 'lumine', 'miyabi', 'rover', 'rapi', 'akira', 'kotone', 'hutao', 'seija', 'youmu',
])

type AnimePreset = {
  body: string; hair: string; accent: string; head?: string
  prop?: 'katana' | 'spear' | 'orb' | 'horns' | 'ears' | 'bat' | 'rifle' | 'hat' | 'mic' | 'needle' | 'book'
  style?: 'sword' | 'spear' | 'martial' | 'gun' | 'idol' | 'mage'
  shortHair?: boolean; scar?: boolean; twintails?: boolean; huTaoHat?: boolean; blindfold?: boolean; hornColor?: string; dualSword?: boolean
}
const ANIME_PRESETS: Partial<Record<CharacterId, AnimePreset>> = {
  chihiro: { body: '#18181b', hair: '#09090b', accent: '#ef4444', prop: 'katana', style: 'sword', shortHair: true, scar: true },
  ichi: { body: '#1e3a8a', hair: '#111827', accent: '#38bdf8', prop: 'hat', style: 'mage', shortHair: true },
  ruri: { body: '#111827', hair: '#7c3aed', accent: '#f8fafc', prop: 'horns', style: 'mage', hornColor: '#f8fafc' },
  nona: { body: '#4a044e', hair: '#e9d5ff', accent: '#e879f9', prop: 'needle', style: 'mage' },
  gojo: { body: '#111827', hair: '#f8fafc', accent: '#818cf8', prop: 'orb', style: 'martial', shortHair: true, blindfold: true },
  deku: { body: '#14532d', hair: '#15803d', accent: '#4ade80', prop: 'orb', style: 'martial', shortHair: true },
  yodaka: { body: '#0f172a', hair: '#334155', accent: '#38bdf8', prop: 'katana', style: 'sword', shortHair: true },
  saki: { body: '#be123c', hair: '#fb7185', accent: '#fde047', prop: 'mic', style: 'idol' },
  spe: { body: '#ffffff', hair: '#78350f', accent: '#c084fc', prop: 'ears', style: 'martial' },
  kaoruko: { body: '#831843', hair: '#1e1b2e', accent: '#f9a8d4', prop: 'book', style: 'idol' },
  stelle: { body: '#1e293b', hair: '#94a3b8', accent: '#facc15', prop: 'bat', style: 'spear' },
  lumine: { body: '#f8fafc', hair: '#fde047', accent: '#5eead4', prop: 'katana', style: 'sword' },
  miyabi: { body: '#0f172a', hair: '#18181b', accent: '#22d3ee', prop: 'ears', style: 'sword' },
  rover: { body: '#1e293b', hair: '#09090b', accent: '#facc15', prop: 'katana', style: 'sword', shortHair: true },
  rapi: { body: '#27272a', hair: '#9a3412', accent: '#ef4444', prop: 'rifle', style: 'gun' },
  akira: { body: '#1e3a8a', hair: '#f472b6', accent: '#fbcfe8', prop: 'book', style: 'mage' },
  kotone: { body: '#f59e0b', hair: '#facc15', accent: '#fef08a', prop: 'mic', style: 'idol', twintails: true },
  hutao: { body: '#18181b', hair: '#3f2318', accent: '#ef4444', prop: 'spear', style: 'spear', twintails: true, huTaoHat: true },
  seija: { body: '#be123c', hair: '#1e1b4b', accent: '#f8fafc', prop: 'horns', style: 'mage', shortHair: true, hornColor: '#e11d48' },
  youmu: { body: '#0f766e', hair: '#e2e8f0', accent: '#34d399', prop: 'katana', style: 'sword', shortHair: true, dualSword: true },
}

export function isRetroAvatar(c: CharacterId): boolean {
  return RETRO_IDS.has(c)
}

interface MatSnapshot {
  mat: THREE.MeshStandardMaterial
  baseEmissive: THREE.Color
  baseIntensity: number
}

/**
 * 經典街機 ＋ 東方 Project 角色專屬 3D 程式化造型與動作演出。
 * 局部座標以 +Z 為角色正前方、+Y 為上方（對應 World.tsx 的 ±PI/2 轉向）。
 */
export function RetroAvatar({ id, charId }: { id: FighterId; charId: CharacterId }) {
  const root = useRef<THREE.Group>(null)
  const animA = useRef<THREE.Group>(null)
  const animB = useRef<THREE.Group>(null)
  const animC = useRef<THREE.Group>(null)
  const matsRef = useRef<MatSnapshot[]>([])

  useEffect(() => {
    const list: MatSnapshot[] = []
    root.current?.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        list.push({
          mat: obj.material,
          baseEmissive: obj.material.emissive.clone(),
          baseIntensity: obj.material.emissiveIntensity,
        })
      }
    })
    matsRef.current = list
  }, [charId])

  useFrame(({ clock }) => {
    const f = useGameStore.getState().fighters[id]
    if (!f || !root.current) return
    const t = clock.elapsedTime
    const attacking = f.fsm === 'ATTACK_ACTIVE' || f.fsm === 'ATTACK_STARTUP'
    const running = f.fsm === 'RUN'
    const flash = f.flashMs > 0
    const blink = f.invulnMs > 0 && Math.floor(performance.now() / 80) % 2 === 0

    // 閃避旋轉 ＋ 奔跑前傾 ＋ 呼吸浮動
    if (f.fsm === 'DODGE') {
      root.current.rotation.x = (f.stateMs / 360) * Math.PI * 2
    } else {
      const targetLean = running ? 0.14 : f.fsm === 'ATTACK_ACTIVE' ? 0.18 : 0
      root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x % (Math.PI * 2), targetLean, 0.25)
    }
    const bobSpeed = running ? 14 : 4.2
    const bobAmp = running ? 0.055 : 0.03
    root.current.position.y = Math.sin(t * bobSpeed) * bobAmp

    // 受擊閃白與無敵閃爍
    for (const s of matsRef.current) {
      if (flash) {
        s.mat.emissive.set('#ffffff')
        s.mat.emissiveIntensity = 0.85
      } else if (f.fsm === 'ATTACK_ACTIVE') {
        s.mat.emissive.copy(s.baseEmissive)
        s.mat.emissiveIntensity = Math.max(s.baseIntensity, 0.35)
      } else {
        s.mat.emissive.copy(s.baseEmissive)
        s.mat.emissiveIntensity = s.baseIntensity
      }
      s.mat.transparent = blink
      s.mat.opacity = blink ? 0.42 : 1
    }

    // 角色專屬動畫（重用 animA / animB / animC 三個樞紐群組）
    if (charId === 'pacman') {
      const chomp = 0.14 + Math.abs(Math.sin(t * (attacking ? 18 : running ? 13 : 6))) * 0.42
      if (animA.current) animA.current.rotation.x = -chomp
      if (animB.current) animB.current.rotation.x = chomp
    } else if (charId === 'mario' || charId === 'bomber' || charId === 'kong') {
      const swing = running ? Math.sin(t * 14) * 0.65 : attacking ? -0.9 : Math.sin(t * 3) * 0.1
      if (animA.current) animA.current.rotation.x = swing
      if (animB.current) animB.current.rotation.x = -swing
      if (charId === 'bomber' && animC.current) {
        animC.current.scale.setScalar(1 + Math.sin(t * 18) * 0.22)
      }
    } else if (charId === 'invader') {
      const step = Math.sin(t * (running ? 14 : 6))
      if (animA.current) animA.current.position.y = step * 0.08
      if (animB.current) animB.current.position.y = -step * 0.08
    } else if (charId === 'snake') {
      const slither = running ? 12 : 5
      if (animA.current) animA.current.position.x = Math.sin(t * slither) * 0.12
      if (animB.current) animB.current.position.x = -Math.sin(t * slither + 1.2) * 0.14
      if (animC.current) animC.current.scale.z = 0.7 + Math.abs(Math.sin(t * 9)) * 0.7
    } else if (charId === 'frogger') {
      const jumpStretch = !f.grounded ? 0.28 : 0
      if (animA.current) animA.current.rotation.x = -jumpStretch
      if (animB.current) animB.current.scale.setScalar(1 + Math.max(0, Math.sin(t * 5)) * 0.18)
    } else if (charId === 'pong') {
      if (animA.current) {
        const ballOut = runtime.projectiles.some((p) => p.owner === id)
        animA.current.visible = !ballOut && f.fsm !== 'ATTACK_ACTIVE'
        const orbit = t * (attacking ? 11 : 4.8)
        animA.current.position.set(0, Math.sin(orbit) * 0.34, 0.36 + Math.cos(orbit) * 0.16)
      }
      if (attacking) root.current.rotation.x = 0.25
    } else if (charId === 'reimu') {
      // 兩顆陰陽玉繞體公轉 ＋ 御幣揮動
      if (animA.current) {
        animA.current.rotation.y = t * (attacking ? 7 : 2.6)
        animA.current.rotation.z = Math.sin(t * 2) * 0.22
      }
      if (animB.current) {
        animB.current.rotation.x = attacking ? -0.9 : Math.sin(t * 3.5) * 0.15
      }
    } else if (charId === 'marisa') {
      // 八卦爐脈動 ＋ 掃帚懸浮微擺
      if (animA.current) {
        animA.current.rotation.z = t * (attacking ? 8 : 2.4)
        animA.current.scale.setScalar(attacking ? 1.3 : 1 + Math.sin(t * 6) * 0.08)
      }
      if (animB.current) animB.current.rotation.x = Math.sin(t * 4) * 0.08
    } else if (charId === 'ryu' || charId === 'chunli') {
      const kick = running ? Math.sin(t * 15) * 0.65 : attacking ? -0.95 : Math.sin(t * 4) * 0.12
      if (animA.current) animA.current.rotation.x = kick
      if (animB.current) animB.current.rotation.x = -kick
      if (charId === 'ryu' && animC.current) animC.current.scale.setScalar(attacking ? 1.45 : 0.8 + Math.sin(t * 6) * 0.15)
    } else if (charId === 'yugi' || charId === 'kaiba') {
      if (animA.current) animA.current.rotation.y = t * (attacking ? 7 : 2.2)
      if (animB.current) animB.current.rotation.x = running ? 0.35 + Math.sin(t * 10) * 0.15 : Math.sin(t * 3) * 0.08
    } else if (charId === 'omnom' || charId === 'red') {
      if (animA.current) animA.current.rotation.x = running ? Math.sin(t * 14) * 0.25 : Math.sin(t * 4) * 0.08
    } else if (ANIME_PRESETS[charId]) {
      const style = ANIME_PRESETS[charId]!.style ?? 'martial'
      const startup = f.fsm === 'ATTACK_STARTUP'
      const active = f.fsm === 'ATTACK_ACTIVE'
      const sw = running ? Math.sin(t * 14) * 0.65 : Math.sin(t * 3.5) * 0.1
      let targetYaw = 0
      if (style === 'sword') {
        if (startup) { targetYaw = -0.35; if (animA.current) { animA.current.rotation.set(0.85, 0, 0.3) } }
        else if (active) { targetYaw = 0.45; if (animA.current) { animA.current.rotation.set(-1.65, 0, -0.65) } }
        else if (animA.current) { animA.current.rotation.set(sw, 0, 0) }
        if (animB.current) animB.current.rotation.x = active ? 0.5 : -sw
      } else if (style === 'spear') {
        if (startup) { targetYaw = -0.45; if (animA.current) animA.current.rotation.set(0.6, 0, 0) }
        else if (active) { targetYaw = Math.sin(t * 22) * 0.55; if (animA.current) animA.current.rotation.set(-1.45 + Math.sin(t * 28) * 0.45, 0, -0.35) }
        else if (animA.current) animA.current.rotation.set(sw, 0, 0)
        if (animB.current) animB.current.rotation.x = active ? -1.0 : -sw
      } else if (style === 'gun') {
        const recoil = active ? Math.sin(t * 40) * 0.15 : 0
        if (animA.current) animA.current.rotation.set(attacking ? -1.45 + recoil : sw * 0.4, 0, 0)
        if (animB.current) animB.current.rotation.set(attacking ? -1.25 + recoil : -sw * 0.4, 0, 0)
      } else if (style === 'idol') {
        if (active) targetYaw = (f.stateMs * 0.015) % (Math.PI * 2)
        if (animA.current) animA.current.rotation.set(attacking ? -1.8 : sw, 0, active ? -0.4 : 0)
        if (animB.current) animB.current.rotation.set(attacking ? -1.8 : -sw, 0, active ? 0.4 : 0)
      } else if (style === 'mage') {
        if (animA.current) animA.current.rotation.set(attacking ? -1.95 : sw, 0, attacking ? -0.3 : 0)
        if (animB.current) animB.current.rotation.set(attacking ? -1.95 : -sw, 0, attacking ? 0.3 : 0)
      } else {
        // martial: 快速交替連拳
        const flurry = Math.sin(t * 32) * 1.15
        if (animA.current) animA.current.rotation.set(active ? -1.1 + flurry : startup ? 0.6 : sw, 0, 0)
        if (animB.current) animB.current.rotation.set(active ? -1.1 - flurry : startup ? 0.4 : -sw, 0, 0)
      }
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, targetYaw, 0.35)
    } else if (charId === 'tom' || charId === 'ben' || charId === 'steve' || charId === 'crossy' || charId === 'arisa') {
      const sw = running ? Math.sin(t * 14) * 0.65 : attacking ? -0.9 : Math.sin(t * 3.5) * 0.1
      if (animA.current) animA.current.rotation.x = sw
      if (animB.current) animB.current.rotation.x = -sw
    }
  })

  return (
    <group ref={root}>
      {charId === 'pacman' && (
        <group position={[0, 0.04, 0]}>
          {/* 上顎半球（往 +Z 張嘴） */}
          <group ref={animA}>
            <mesh castShadow>
              <sphereGeometry args={[0.48, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color="#ffe01b" roughness={0.3} />
            </mesh>
            <mesh position={[0.17, 0.24, 0.35]}>
              <sphereGeometry args={[0.075, 10, 10]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <mesh position={[-0.17, 0.24, 0.35]}>
              <sphereGeometry args={[0.075, 10, 10]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          </group>
          {/* 下顎半球 */}
          <group ref={animB}>
            <mesh castShadow>
              <sphereGeometry args={[0.48, 22, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
              <meshStandardMaterial color="#facc15" roughness={0.3} />
            </mesh>
          </group>
          {/* 口腔核心 */}
          <mesh>
            <sphereGeometry args={[0.33, 14, 14]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
          </mesh>
        </group>
      )}

      {charId === 'mario' && (
        <group>
          {/* 藍色吊帶褲軀幹 ＋ 紅衣袖 */}
          <mesh position={[0, -0.1, 0]} castShadow>
            <boxGeometry args={[0.48, 0.44, 0.38]} />
            <meshStandardMaterial color="#2563eb" roughness={0.5} />
          </mesh>
          <mesh position={[0.12, -0.02, 0.2]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[-0.12, -0.02, 0.2]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.3} />
          </mesh>
          {/* 手臂 */}
          <group ref={animA} position={[0.32, 0.04, 0]}>
            <mesh position={[0, -0.1, 0.06]} castShadow>
              <boxGeometry args={[0.15, 0.3, 0.15]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <mesh position={[0, -0.26, 0.09]} castShadow>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          </group>
          <group ref={animB} position={[-0.32, 0.04, 0]}>
            <mesh position={[0, -0.1, 0.06]} castShadow>
              <boxGeometry args={[0.15, 0.3, 0.15]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <mesh position={[0, -0.26, 0.09]} castShadow>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          </group>
          {/* 圓頭 ＋ 紅帽 ＋ 大鼻子 ＋ 八字鬍 */}
          <mesh position={[0, 0.28, 0.02]} castShadow>
            <sphereGeometry args={[0.27, 16, 16]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.42, -0.01]} castShadow>
            <sphereGeometry args={[0.285, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            <meshStandardMaterial color="#dc2626" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.39, 0.22]} castShadow>
            <boxGeometry args={[0.34, 0.05, 0.2]} />
            <meshStandardMaterial color="#b91c1c" />
          </mesh>
          <mesh position={[0, 0.25, 0.3]} castShadow>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#fb923c" />
          </mesh>
          <mesh position={[0, 0.18, 0.27]} castShadow>
            <boxGeometry args={[0.24, 0.06, 0.08]} />
            <meshStandardMaterial color="#27170e" />
          </mesh>
          {/* 咖啡色鞋子 */}
          <mesh position={[0.13, -0.43, 0.06]} castShadow>
            <boxGeometry args={[0.18, 0.16, 0.28]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[-0.13, -0.43, 0.06]} castShadow>
            <boxGeometry args={[0.18, 0.16, 0.28]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
      )}

      {charId === 'invader' && (
        <group>
          {/* 3D 像素螃蟹外星人本體 */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[0.56, 0.34, 0.62]} />
            <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.45} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.26, 0.18]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
            <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.26, -0.18]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
            <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.5} />
          </mesh>
          {/* 發光大眼（正前 +Z ＆ 側視均可見） */}
          <mesh position={[0.18, 0.07, 0.29]}>
            <boxGeometry args={[0.16, 0.11, 0.08]} />
            <meshStandardMaterial color="#090d16" />
          </mesh>
          <mesh position={[-0.18, 0.07, 0.29]}>
            <boxGeometry args={[0.16, 0.11, 0.08]} />
            <meshStandardMaterial color="#090d16" />
          </mesh>
          {/* 雙側大鉗子與觸腳（上下擺動） */}
          <group ref={animA} position={[0, -0.02, 0.36]}>
            <mesh castShadow>
              <boxGeometry args={[0.42, 0.24, 0.14]} />
              <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.4} />
            </mesh>
          </group>
          <group ref={animB} position={[0, -0.02, -0.36]}>
            <mesh castShadow>
              <boxGeometry args={[0.42, 0.24, 0.14]} />
              <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.4} />
            </mesh>
          </group>
          <mesh position={[0, -0.3, 0.2]} castShadow>
            <boxGeometry args={[0.44, 0.2, 0.12]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
          <mesh position={[0, -0.3, -0.2]} castShadow>
            <boxGeometry args={[0.44, 0.2, 0.12]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
        </group>
      )}

      {charId === 'bomber' && (
        <group>
          {/* 白頭盔 ＋ 深藍護目臉 */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <sphereGeometry args={[0.29, 16, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.23, 0.22]} castShadow>
            <boxGeometry args={[0.32, 0.2, 0.14]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.08, 0.24, 0.3]}>
            <boxGeometry args={[0.05, 0.11, 0.03]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[-0.08, 0.24, 0.3]}>
            <boxGeometry args={[0.05, 0.11, 0.03]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
          </mesh>
          {/* 頭頂粉紅天線球 */}
          <mesh position={[0, 0.56, 0]} castShadow>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={0.3} />
          </mesh>
          {/* 藍色身軀 ＋ 金腰帶 */}
          <mesh position={[0, -0.14, 0]} castShadow>
            <boxGeometry args={[0.4, 0.38, 0.34]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.43, 0.09, 0.37]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, -0.22, 0.19]}>
            <boxGeometry args={[0.12, 0.1, 0.04]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {/* 粉紅手套雙臂（右手舉著小炸彈） */}
          <group ref={animA} position={[0.26, -0.02, 0.08]}>
            <mesh position={[0, -0.08, 0.12]} castShadow>
              <sphereGeometry args={[0.11, 10, 10]} />
              <meshStandardMaterial color="#ec4899" />
            </mesh>
            <mesh position={[0, 0.08, 0.26]} castShadow>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </mesh>
            <group ref={animC} position={[0, 0.26, 0.26]}>
              <mesh>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={1} />
              </mesh>
            </group>
          </group>
          <group ref={animB} position={[-0.26, -0.02, 0.04]}>
            <mesh position={[0, -0.1, 0.06]} castShadow>
              <sphereGeometry args={[0.11, 10, 10]} />
              <meshStandardMaterial color="#ec4899" />
            </mesh>
          </group>
          <mesh position={[0.12, -0.44, 0.06]} castShadow>
            <boxGeometry args={[0.15, 0.14, 0.24]} />
            <meshStandardMaterial color="#ec4899" />
          </mesh>
          <mesh position={[-0.12, -0.44, 0.06]} castShadow>
            <boxGeometry args={[0.15, 0.14, 0.24]} />
            <meshStandardMaterial color="#ec4899" />
          </mesh>
        </group>
      )}

      {charId === 'snake' && (
        <group>
          {/* 蛇頭（向 +Z 伸出紅信子） */}
          <mesh position={[0, 0.34, 0.22]} castShadow>
            <boxGeometry args={[0.34, 0.24, 0.42]} />
            <meshStandardMaterial color="#22c55e" emissive="#15803d" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0.13, 0.39, 0.36]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#fde047" emissive="#eab308" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[-0.13, 0.39, 0.36]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#fde047" emissive="#eab308" emissiveIntensity={0.6} />
          </mesh>
          <group ref={animC} position={[0, 0.28, 0.45]}>
            <mesh position={[0, 0, 0.12]}>
              <boxGeometry args={[0.06, 0.03, 0.24]} />
              <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.4} />
            </mesh>
          </group>
          {/* S 型盤繞蛇身方塊節點 */}
          <group ref={animA}>
            <mesh position={[0, 0.1, 0.06]} castShadow>
              <boxGeometry args={[0.3, 0.26, 0.3]} />
              <meshStandardMaterial color="#4ade80" />
            </mesh>
            <mesh position={[0, -0.14, -0.06]} castShadow>
              <boxGeometry args={[0.34, 0.24, 0.34]} />
              <meshStandardMaterial color="#16a34a" />
            </mesh>
          </group>
          <group ref={animB}>
            <mesh position={[0, -0.36, -0.16]} castShadow>
              <boxGeometry args={[0.36, 0.22, 0.44]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
            <mesh position={[0, -0.38, -0.44]} castShadow>
              <boxGeometry args={[0.18, 0.14, 0.24]} />
              <meshStandardMaterial color="#86efac" />
            </mesh>
          </group>
        </group>
      )}

      {charId === 'frogger' && (
        <group>
          {/* 蹲姿青蛙身體 ＋ 米白肚皮 */}
          <group ref={animA}>
            <mesh position={[0, -0.04, 0]} scale={[1.1, 0.82, 1.25]} castShadow>
              <sphereGeometry args={[0.34, 16, 14]} />
              <meshStandardMaterial color="#4ade80" roughness={0.4} />
            </mesh>
            <mesh position={[0, -0.14, 0.08]} scale={[0.95, 0.65, 1.05]}>
              <sphereGeometry args={[0.28, 12, 12]} />
              <meshStandardMaterial color="#fef3c7" />
            </mesh>
            {/* 鼓起鳴囊 */}
            <group ref={animB} position={[0, -0.04, 0.33]}>
              <mesh>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshStandardMaterial color="#fde047" />
              </mesh>
            </group>
            {/* 頭頂凸出大眼睛 */}
            <mesh position={[0.18, 0.28, 0.2]} castShadow>
              <sphereGeometry args={[0.13, 12, 12]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[-0.18, 0.28, 0.2]} castShadow>
              <sphereGeometry args={[0.13, 12, 12]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[0.18, 0.29, 0.31]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[-0.18, 0.29, 0.31]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
          {/* 強壯跳躍後腿 */}
          <mesh position={[0.32, -0.32, -0.16]} rotation={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.16, 0.22, 0.42]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
          <mesh position={[-0.32, -0.32, -0.16]} rotation={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.16, 0.22, 0.42]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
        </group>
      )}

      {charId === 'kong' && (
        <group>
          {/* 厚實大猩猩胸膛 ＋ 淺褐胸甲 */}
          <mesh position={[0, 0.02, -0.02]} castShadow>
            <boxGeometry args={[0.7, 0.54, 0.5]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.04, 0.22]}>
            <boxGeometry args={[0.46, 0.38, 0.1]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
          {/* 標誌紅領帶 */}
          <mesh position={[0, -0.02, 0.29]} castShadow>
            <boxGeometry args={[0.16, 0.42, 0.05]} />
            <meshStandardMaterial color="#dc2626" emissive="#991b1b" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, -0.18, 0.3]}>
            <boxGeometry args={[0.12, 0.1, 0.06]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {/* 頭部 ＋ 尖刺髮型 */}
          <mesh position={[0, 0.38, 0.06]} castShadow>
            <sphereGeometry args={[0.25, 14, 14]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 0.33, 0.24]} castShadow>
            <boxGeometry args={[0.28, 0.18, 0.16]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
          <mesh position={[0, 0.61, 0.08]} rotation={[0.3, 0, 0]} castShadow>
            <coneGeometry args={[0.13, 0.22, 6]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          {/* 巨大雙拳 */}
          <group ref={animA} position={[0.44, 0.1, 0]}>
            <mesh position={[0, -0.22, 0.14]} castShadow>
              <boxGeometry args={[0.22, 0.44, 0.24]} />
              <meshStandardMaterial color="#92400e" />
            </mesh>
            <mesh position={[0, -0.44, 0.18]} castShadow>
              <sphereGeometry args={[0.14, 10, 10]} />
              <meshStandardMaterial color="#d97706" />
            </mesh>
          </group>
          <group ref={animB} position={[-0.44, 0.1, 0]}>
            <mesh position={[0, -0.22, 0.14]} castShadow>
              <boxGeometry args={[0.22, 0.44, 0.24]} />
              <meshStandardMaterial color="#92400e" />
            </mesh>
            <mesh position={[0, -0.44, 0.18]} castShadow>
              <sphereGeometry args={[0.14, 10, 10]} />
              <meshStandardMaterial color="#d97706" />
            </mesh>
          </group>
        </group>
      )}

      {charId === 'pong' && (
        <group>
          {/* 經典霓虹白色長條球拍 */}
          <mesh castShadow>
            <boxGeometry args={[0.24, 0.96, 0.24]} />
            <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.65} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.36, 0.14]}>
            <boxGeometry args={[0.28, 0.12, 0.08]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[0, -0.36, 0.14]}>
            <boxGeometry args={[0.28, 0.12, 0.08]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.9} />
          </mesh>
          {/* 前方高速彈跳方塊球 */}
          <group ref={animA} position={[0, 0, 0.36]}>
            <mesh>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color="#ffffff" emissive="#67e8f9" emissiveIntensity={1} />
            </mesh>
          </group>
        </group>
      )}

      {charId === 'reimu' && (
        <group>
          {/* 巫女紅袴裙（下擺展開） */}
          <mesh position={[0, -0.24, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.38, 0.48, 12]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
          {/* 白色千早 / 上衣 ＋ 紅領襟 */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <boxGeometry args={[0.34, 0.3, 0.24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.14, 0.13]}>
            <boxGeometry args={[0.16, 0.14, 0.04]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          {/* 標誌性白振袖寬衣袖 ＋ 右手持驅魔御幣 */}
          <mesh position={[-0.25, 0.04, 0.02]} rotation={[0, 0, 0.2]} castShadow>
            <boxGeometry args={[0.16, 0.34, 0.24]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <group ref={animB} position={[0.25, 0.08, 0.05]}>
            <mesh position={[0, -0.05, 0.04]} rotation={[0, 0, -0.2]} castShadow>
              <boxGeometry args={[0.16, 0.32, 0.22]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[0.04, 0.06, 0.28]} rotation={[0.9, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.56, 8]} />
              <meshStandardMaterial color="#fef3c7" />
            </mesh>
            <mesh position={[0.04, 0.2, 0.44]}>
              <boxGeometry args={[0.08, 0.24, 0.14]} />
              <meshStandardMaterial color="#ffffff" emissive="#fca5a5" emissiveIntensity={0.4} />
            </mesh>
          </group>
          {/* 頭與烏黑長髮 */}
          <mesh position={[0, 0.37, 0.03]} castShadow>
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshStandardMaterial color="#fde8d7" />
          </mesh>
          <mesh position={[0, 0.39, -0.04]} castShadow>
            <sphereGeometry args={[0.22, 14, 12]} />
            <meshStandardMaterial color="#1e1b2e" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.12, -0.18]} castShadow>
            <boxGeometry args={[0.3, 0.48, 0.12]} />
            <meshStandardMaterial color="#1e1b2e" />
          </mesh>
          {/* 頭後巨大紅蝴蝶結 */}
          <mesh position={[0.16, 0.54, -0.18]} rotation={[0, 0, 0.4]} castShadow>
            <boxGeometry args={[0.24, 0.14, 0.08]} />
            <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[-0.16, 0.54, -0.18]} rotation={[0, 0, -0.4]} castShadow>
            <boxGeometry args={[0.24, 0.14, 0.08]} />
            <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.25} />
          </mesh>
          {/* 繞行護體陰陽玉 ×2 */}
          <group ref={animA} position={[0, 0.15, 0]}>
            <mesh position={[0, 0, 0.56]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#ffffff" emissive="#ef4444" emissiveIntensity={0.55} />
            </mesh>
            <mesh position={[0, 0, -0.56]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#0f172a" emissive="#f87171" emissiveIntensity={0.45} />
            </mesh>
          </group>
        </group>
      )}

      {charId === 'marisa' && (
        <group>
          {/* 黑白魔女洋裝 */}
          <mesh position={[0, -0.24, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.36, 0.46, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.24, 0.14]}>
            <boxGeometry args={[0.22, 0.34, 0.12]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, 0.07, 0]} castShadow>
            <boxGeometry args={[0.3, 0.28, 0.24]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
          {/* 金髮 ＋ 頭部 */}
          <mesh position={[0, 0.34, 0.03]} castShadow>
            <sphereGeometry args={[0.19, 14, 14]} />
            <meshStandardMaterial color="#fde8d7" />
          </mesh>
          <mesh position={[0, 0.33, -0.05]} castShadow>
            <sphereGeometry args={[0.22, 14, 12]} />
            <meshStandardMaterial color="#facc15" roughness={0.4} />
          </mesh>
          <mesh position={[0.18, 0.18, 0.02]} castShadow>
            <boxGeometry args={[0.1, 0.32, 0.14]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
          <mesh position={[-0.18, 0.18, 0.02]} castShadow>
            <boxGeometry args={[0.1, 0.32, 0.14]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
          {/* 巨大黑魔女尖帽 ＋ 白緞帶 */}
          <mesh position={[0, 0.49, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.44, 0.04, 16]} />
            <meshStandardMaterial color="#09090b" />
          </mesh>
          <mesh position={[0, 0.54, 0]}>
            <cylinderGeometry args={[0.21, 0.22, 0.08, 14]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, 0.72, -0.04]} rotation={[-0.18, 0, 0]} castShadow>
            <coneGeometry args={[0.21, 0.44, 14]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
          {/* 魔法掃帚（跨於下方，往 -Z 展毛刷） */}
          <group ref={animB} position={[0, -0.34, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 1.05, 8]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            <mesh position={[0, 0, -0.52]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
              <coneGeometry args={[0.15, 0.32, 10]} />
              <meshStandardMaterial color="#eab308" />
            </mesh>
          </group>
          {/* 發光迷你八卦爐 */}
          <group ref={animA} position={[0.22, 0.06, 0.36]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.06, 8]} />
              <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.9} />
            </mesh>
          </group>
        </group>
      )}

      {charId === 'ryu' && (
        <group>
          {/* 白無袖道服 ＋ 黑帶垂尾 */}
          <mesh position={[0, -0.05, 0]} castShadow><boxGeometry args={[0.42, 0.5, 0.32]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, -0.14, 0]}><boxGeometry args={[0.45, 0.09, 0.35]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0, -0.38, 0.1]} castShadow><boxGeometry args={[0.16, 0.28, 0.18]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
          <mesh position={[0, -0.38, -0.1]} castShadow><boxGeometry args={[0.16, 0.28, 0.18]} /><meshStandardMaterial color="#f1f5f9" /></mesh>
          {/* 頭＋棕刺頭＋紅頭帶垂尾 */}
          <mesh position={[0, 0.34, 0.02]} castShadow><sphereGeometry args={[0.21, 14, 14]} /><meshStandardMaterial color="#fed7aa" /></mesh>
          <mesh position={[0, 0.44, -0.02]} castShadow><boxGeometry args={[0.32, 0.18, 0.34]} /><meshStandardMaterial color="#451a03" /></mesh>
          <mesh position={[0, 0.4, 0.02]}><cylinderGeometry args={[0.22, 0.22, 0.07, 14]} /><meshStandardMaterial color="#ef4444" /></mesh>
          <mesh position={[0, 0.32, -0.28]} rotation={[0.5, 0, 0]}><boxGeometry args={[0.08, 0.28, 0.04]} /><meshStandardMaterial color="#ef4444" /></mesh>
          {/* 紅護拳雙臂 ＋ 波動能量核 */}
          <group ref={animA} position={[0.28, 0.1, 0.08]}>
            <mesh position={[0, -0.1, 0.12]} castShadow><boxGeometry args={[0.14, 0.24, 0.2]} /><meshStandardMaterial color="#fed7aa" /></mesh>
            <mesh position={[0, -0.1, 0.26]} castShadow><boxGeometry args={[0.15, 0.15, 0.15]} /><meshStandardMaterial color="#dc2626" /></mesh>
            <group ref={animC} position={[0, -0.08, 0.4]}>
              <mesh><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} /></mesh>
            </group>
          </group>
          <group ref={animB} position={[-0.28, 0.1, 0.08]}>
            <mesh position={[0, -0.1, 0.1]} castShadow><boxGeometry args={[0.14, 0.24, 0.2]} /><meshStandardMaterial color="#fed7aa" /></mesh>
            <mesh position={[0, -0.1, 0.24]} castShadow><boxGeometry args={[0.15, 0.15, 0.15]} /><meshStandardMaterial color="#dc2626" /></mesh>
          </group>
        </group>
      )}

      {charId === 'chunli' && (
        <group>
          {/* 皇家藍金邊旗袍 */}
          <mesh position={[0, -0.1, 0]} castShadow><cylinderGeometry args={[0.18, 0.34, 0.56, 12]} /><meshStandardMaterial color="#2563eb" /></mesh>
          <mesh position={[0, -0.35, 0]}><cylinderGeometry args={[0.35, 0.36, 0.07, 12]} /><meshStandardMaterial color="#facc15" /></mesh>
          {/* 雙丸子頭＋白髮飾＋白長靴 */}
          <mesh position={[0, 0.32, 0.02]} castShadow><sphereGeometry args={[0.19, 14, 14]} /><meshStandardMaterial color="#fde8d7" /></mesh>
          <mesh position={[0, 0.36, -0.03]}><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color="#27170e" /></mesh>
          <mesh position={[0.2, 0.44, -0.02]} castShadow><sphereGeometry args={[0.11, 10, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[-0.2, 0.44, -0.02]} castShadow><sphereGeometry args={[0.11, 10, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <group ref={animA} position={[0.12, -0.32, 0.06]}>
            <mesh position={[0, -0.12, 0.08]} castShadow><boxGeometry args={[0.14, 0.28, 0.18]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          </group>
          <group ref={animB} position={[-0.12, -0.32, -0.04]}>
            <mesh position={[0, -0.12, 0.08]} castShadow><boxGeometry args={[0.14, 0.28, 0.18]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          </group>
        </group>
      )}

      {charId === 'yugi' && (
        <group>
          {/* 紫色決鬥戰衣 ＋ 披肩外套 */}
          <mesh position={[0, -0.1, 0]} castShadow><boxGeometry args={[0.34, 0.54, 0.26]} /><meshStandardMaterial color="#1e1b4b" /></mesh>
          <group ref={animB} position={[0, 0.08, -0.18]}>
            <mesh position={[0, -0.22, -0.08]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.42, 0.54, 0.08]} /><meshStandardMaterial color="#312e81" /></mesh>
          </group>
          {/* 胸前黃金千年積木 */}
          <mesh position={[0, 0.05, 0.16]} rotation={[Math.PI, 0, 0]} castShadow>
            <coneGeometry args={[0.12, 0.2, 4]} />
            <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.6} />
          </mesh>
          {/* 三色刺刺海星頭 */}
          <mesh position={[0, 0.34, 0.02]} castShadow><sphereGeometry args={[0.19, 14, 14]} /><meshStandardMaterial color="#fde8d7" /></mesh>
          <mesh position={[0, 0.42, -0.04]} castShadow><coneGeometry args={[0.28, 0.45, 5]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0.14, 0.38, 0.14]} rotation={[0.4, 0, -0.4]}><coneGeometry args={[0.08, 0.26, 4]} /><meshStandardMaterial color="#facc15" /></mesh>
          <mesh position={[-0.14, 0.38, 0.14]} rotation={[0.4, 0, 0.4]}><coneGeometry args={[0.08, 0.26, 4]} /><meshStandardMaterial color="#facc15" /></mesh>
          {/* 決鬥盤與發光魔法卡片繞行 */}
          <mesh position={[0.24, 0.04, 0.28]}><boxGeometry args={[0.12, 0.06, 0.34]} /><meshStandardMaterial color="#94a3b8" /></mesh>
          <group ref={animA} position={[0, 0.12, 0]}>
            <mesh position={[0, 0, 0.56]}><boxGeometry args={[0.04, 0.22, 0.16]} /><meshStandardMaterial color="#a855f7" emissive="#c084fc" emissiveIntensity={0.9} /></mesh>
            <mesh position={[0, 0, -0.56]}><boxGeometry args={[0.04, 0.22, 0.16]} /><meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.8} /></mesh>
          </group>
        </group>
      )}

      {charId === 'kaiba' && (
        <group>
          {/* 白銀社長長大衣 */}
          <mesh position={[0, -0.1, 0]} castShadow><cylinderGeometry args={[0.19, 0.32, 0.58, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, 0.02, 0.12]}><boxGeometry args={[0.24, 0.34, 0.1]} /><meshStandardMaterial color="#1e293b" /></mesh>
          <group ref={animB} position={[0, 0.06, -0.18]}>
            <mesh position={[0, -0.24, -0.1]} rotation={[0.25, 0, 0]} castShadow><boxGeometry args={[0.46, 0.58, 0.07]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
          </group>
          {/* 棕刺髮頭 ＋ 高領 */}
          <mesh position={[0, 0.36, 0.02]} castShadow><sphereGeometry args={[0.19, 14, 14]} /><meshStandardMaterial color="#fde8d7" /></mesh>
          <mesh position={[0, 0.48, -0.02]} castShadow><coneGeometry args={[0.24, 0.32, 6]} /><meshStandardMaterial color="#78350f" /></mesh>
          {/* 青眼白龍光環決鬥盤 */}
          <mesh position={[0.26, 0.04, 0.3]}><boxGeometry args={[0.14, 0.07, 0.4]} /><meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.6} /></mesh>
          <group ref={animA} position={[0, 0.15, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.56, 0.03, 8, 24]} /><meshStandardMaterial color="#67e8f9" emissive="#38bdf8" emissiveIntensity={0.9} /></mesh>
          </group>
        </group>
      )}

      {charId === 'omnom' && (
        <group ref={animA}>
          <mesh position={[0, 0.02, 0]} scale={[1.05, 0.95, 1.05]} castShadow><sphereGeometry args={[0.42, 16, 16]} /><meshStandardMaterial color="#4ade80" /></mesh>
          <mesh position={[0, 0.45, 0]}><coneGeometry args={[0.08, 0.2, 8]} /><meshStandardMaterial color="#22c55e" /></mesh>
          <mesh position={[0.14, 0.18, 0.34]}><sphereGeometry args={[0.11, 10, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[-0.14, 0.18, 0.34]}><sphereGeometry args={[0.11, 10, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0.14, 0.19, 0.43]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[-0.14, 0.19, 0.43]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[0, -0.05, 0.36]}><boxGeometry args={[0.36, 0.14, 0.1]} /><meshStandardMaterial color="#7f1d1d" /></mesh>
          <mesh position={[0.08, -0.02, 0.4]}><boxGeometry args={[0.07, 0.07, 0.06]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[-0.08, -0.02, 0.4]}><boxGeometry args={[0.07, 0.07, 0.06]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </group>
      )}

      {charId === 'tom' && (
        <group>
          <mesh position={[0, -0.08, 0]} castShadow><cylinderGeometry args={[0.22, 0.26, 0.5, 12]} /><meshStandardMaterial color="#94a3b8" /></mesh>
          <mesh position={[0, -0.08, 0.14]}><boxGeometry args={[0.24, 0.36, 0.14]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, 0.34, 0.02]} castShadow><sphereGeometry args={[0.24, 14, 14]} /><meshStandardMaterial color="#94a3b8" /></mesh>
          <mesh position={[0.16, 0.56, 0]}><coneGeometry args={[0.09, 0.22, 4]} /><meshStandardMaterial color="#64748b" /></mesh>
          <mesh position={[-0.16, 0.56, 0]}><coneGeometry args={[0.09, 0.22, 4]} /><meshStandardMaterial color="#64748b" /></mesh>
          <mesh position={[0.09, 0.38, 0.22]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#22c55e" /></mesh>
          <mesh position={[-0.09, 0.38, 0.22]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#22c55e" /></mesh>
          <group ref={animA} position={[0.26, 0.02, 0]}><mesh position={[0, -0.14, 0.06]}><boxGeometry args={[0.12, 0.3, 0.14]} /><meshStandardMaterial color="#94a3b8" /></mesh></group>
          <group ref={animB} position={[-0.26, 0.02, 0]}><mesh position={[0, -0.14, 0.06]}><boxGeometry args={[0.12, 0.3, 0.14]} /><meshStandardMaterial color="#94a3b8" /></mesh></group>
        </group>
      )}

      {charId === 'ben' && (
        <group>
          <mesh position={[0, -0.08, 0]} castShadow><cylinderGeometry args={[0.25, 0.28, 0.52, 12]} /><meshStandardMaterial color="#b45309" /></mesh>
          <mesh position={[0, 0.34, 0.02]} castShadow><sphereGeometry args={[0.23, 14, 14]} /><meshStandardMaterial color="#b45309" /></mesh>
          <mesh position={[0, 0.28, 0.22]}><boxGeometry args={[0.22, 0.14, 0.18]} /><meshStandardMaterial color="#fde68a" /></mesh>
          <mesh position={[0.18, 0.42, 0]}><boxGeometry args={[0.1, 0.24, 0.14]} /><meshStandardMaterial color="#78350f" /></mesh>
          <mesh position={[-0.18, 0.42, 0]}><boxGeometry args={[0.1, 0.24, 0.14]} /><meshStandardMaterial color="#78350f" /></mesh>
          <group ref={animA} position={[0.28, 0.02, 0]}>
            <mesh position={[0, -0.1, 0.14]}><cylinderGeometry args={[0.06, 0.07, 0.24, 10]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} /></mesh>
          </group>
          <group ref={animB} position={[-0.28, 0.02, 0]}><mesh position={[0, -0.12, 0.06]}><boxGeometry args={[0.13, 0.28, 0.13]} /><meshStandardMaterial color="#92400e" /></mesh></group>
        </group>
      )}

      {charId === 'crossy' && (
        <group>
          <mesh position={[0, -0.05, -0.04]} castShadow><boxGeometry args={[0.46, 0.42, 0.54]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, 0.3, 0.12]} castShadow><boxGeometry args={[0.36, 0.34, 0.34]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 0.52, 0.12]}><boxGeometry args={[0.12, 0.12, 0.24]} /><meshStandardMaterial color="#ef4444" /></mesh>
          <mesh position={[0, 0.28, 0.33]}><boxGeometry args={[0.18, 0.1, 0.14]} /><meshStandardMaterial color="#f97316" /></mesh>
          <mesh position={[0, 0.18, 0.29]}><boxGeometry args={[0.1, 0.12, 0.08]} /><meshStandardMaterial color="#ef4444" /></mesh>
          <group ref={animA} position={[0.14, -0.34, 0]}><mesh><boxGeometry args={[0.1, 0.22, 0.18]} /><meshStandardMaterial color="#f97316" /></mesh></group>
          <group ref={animB} position={[-0.14, -0.34, 0]}><mesh><boxGeometry args={[0.1, 0.22, 0.18]} /><meshStandardMaterial color="#f97316" /></mesh></group>
        </group>
      )}

      {charId === 'red' && (
        <group ref={animA}>
          <mesh position={[0, 0.02, 0]} castShadow><sphereGeometry args={[0.42, 16, 16]} /><meshStandardMaterial color="#dc2626" /></mesh>
          <mesh position={[0, -0.16, 0.22]}><sphereGeometry args={[0.26, 12, 12]} /><meshStandardMaterial color="#fef3c7" /></mesh>
          <mesh position={[0, 0.46, -0.04]} rotation={[-0.4, 0, 0]}><boxGeometry args={[0.12, 0.22, 0.18]} /><meshStandardMaterial color="#b91c1c" /></mesh>
          <mesh position={[0, 0.02, 0.44]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.12, 0.24, 4]} /><meshStandardMaterial color="#facc15" /></mesh>
          <mesh position={[0.12, 0.2, 0.36]} rotation={[0, 0, 0.35]}><boxGeometry args={[0.18, 0.06, 0.06]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[-0.12, 0.2, 0.36]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.18, 0.06, 0.06]} /><meshStandardMaterial color="#0f172a" /></mesh>
        </group>
      )}

      {charId === 'steve' && (
        <group>
          {/* Steve 方塊頭 ＋ 青藍襯衫 ＋ 深藍長褲 ＋ 鑽石劍 */}
          <mesh position={[0, 0.36, 0]} castShadow><boxGeometry args={[0.36, 0.36, 0.36]} /><meshStandardMaterial color="#d97706" /></mesh>
          <mesh position={[0, 0.46, 0]}><boxGeometry args={[0.37, 0.14, 0.37]} /><meshStandardMaterial color="#451a03" /></mesh>
          <mesh position={[0, -0.02, 0]} castShadow><boxGeometry args={[0.38, 0.42, 0.24]} /><meshStandardMaterial color="#06b6d4" /></mesh>
          <mesh position={[0, -0.36, 0]} castShadow><boxGeometry args={[0.36, 0.28, 0.24]} /><meshStandardMaterial color="#312e81" /></mesh>
          <group ref={animA} position={[0.27, 0.1, 0]}>
            <mesh position={[0, -0.14, 0.04]}><boxGeometry args={[0.14, 0.34, 0.14]} /><meshStandardMaterial color="#d97706" /></mesh>
            <mesh position={[0, -0.1, 0.36]} rotation={[0.8, 0, 0]}><boxGeometry args={[0.06, 0.56, 0.12]} /><meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.45} /></mesh>
          </group>
          <group ref={animB} position={[-0.27, 0.1, 0]}><mesh position={[0, -0.14, 0]}><boxGeometry args={[0.14, 0.34, 0.14]} /><meshStandardMaterial color="#d97706" /></mesh></group>
        </group>
      )}

      {charId === 'arisa' && (
        <group>
          {/* 亞里莎精靈綠裙 ＋ 金髮雙馬尾 ＋ 發光精靈長弓 */}
          <mesh position={[0, -0.2, 0]} castShadow><cylinderGeometry args={[0.18, 0.36, 0.48, 12]} /><meshStandardMaterial color="#10b981" /></mesh>
          <mesh position={[0, 0.08, 0]} castShadow><boxGeometry args={[0.3, 0.26, 0.22]} /><meshStandardMaterial color="#f8fafc" /></mesh>
          <mesh position={[0, 0.35, 0.02]} castShadow><sphereGeometry args={[0.19, 14, 14]} /><meshStandardMaterial color="#fde8d7" /></mesh>
          <mesh position={[0, 0.38, -0.04]}><sphereGeometry args={[0.21, 12, 12]} /><meshStandardMaterial color="#facc15" /></mesh>
          <mesh position={[0.2, 0.42, 0.02]} rotation={[0, 0, -0.5]}><coneGeometry args={[0.05, 0.18, 4]} /><meshStandardMaterial color="#fde8d7" /></mesh>
          <mesh position={[-0.2, 0.42, 0.02]} rotation={[0, 0, 0.5]}><coneGeometry args={[0.05, 0.18, 4]} /><meshStandardMaterial color="#fde8d7" /></mesh>
          <group ref={animA} position={[0.24, 0.08, 0.2]}>
            <mesh rotation={[0, 0, 0]}><torusGeometry args={[0.28, 0.03, 8, 16, Math.PI]} /><meshStandardMaterial color="#6ee7b7" emissive="#10b981" emissiveIntensity={0.8} /></mesh>
          </group>
          <group ref={animB} position={[-0.24, 0.08, 0]}><mesh position={[0, -0.12, 0]}><boxGeometry args={[0.1, 0.26, 0.1]} /><meshStandardMaterial color="#fde8d7" /></mesh></group>
        </group>
      )}

      {ANIME_PRESETS[charId] && (() => {
        const pr = ANIME_PRESETS[charId]!
        return (
          <group>
            <mesh position={[0, -0.16, 0]} castShadow><cylinderGeometry args={[0.19, 0.3, 0.54, 12]} /><meshStandardMaterial color={pr.body} /></mesh>
            <mesh position={[0, 0.06, 0.12]}><boxGeometry args={[0.24, 0.28, 0.1]} /><meshStandardMaterial color={pr.accent} /></mesh>
            <mesh position={[0, 0.34, 0.02]} castShadow><sphereGeometry args={[0.2, 14, 14]} /><meshStandardMaterial color="#fde8d7" /></mesh>
            <mesh position={[0, 0.38, -0.04]}><sphereGeometry args={[0.22, 14, 12]} /><meshStandardMaterial color={pr.hair} /></mesh>
            {pr.shortHair && (
              <>
                <mesh position={[0, 0.56, 0.02]} rotation={[0.2, 0, 0]}><coneGeometry args={[0.1, 0.2, 5]} /><meshStandardMaterial color={pr.hair} /></mesh>
                <mesh position={[-0.12, 0.52, 0.04]} rotation={[0.1, 0, 0.45]}><coneGeometry args={[0.08, 0.18, 5]} /><meshStandardMaterial color={pr.hair} /></mesh>
                <mesh position={[0.12, 0.52, 0.04]} rotation={[0.1, 0, -0.45]}><coneGeometry args={[0.08, 0.18, 5]} /><meshStandardMaterial color={pr.hair} /></mesh>
                <mesh position={[0.06, 0.43, 0.17]} rotation={[0.35, 0, -0.2]}><coneGeometry args={[0.06, 0.16, 4]} /><meshStandardMaterial color={pr.hair} /></mesh>
              </>
            )}
            {pr.scar && (
              <mesh position={[0.08, 0.34, 0.2]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.025, 0.11, 0.03]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.35} /></mesh>
            )}
            {pr.twintails && (
              <>
                <mesh position={[-0.22, 0.22, -0.04]} rotation={[0, 0, 0.22]}><coneGeometry args={[0.075, 0.44, 8]} /><meshStandardMaterial color={pr.hair} /></mesh>
                <mesh position={[0.22, 0.22, -0.04]} rotation={[0, 0, -0.22]}><coneGeometry args={[0.075, 0.44, 8]} /><meshStandardMaterial color={pr.hair} /></mesh>
              </>
            )}
            {pr.huTaoHat && (
              <group position={[0, 0.52, 0]}>
                <mesh><cylinderGeometry args={[0.28, 0.3, 0.05, 16]} /><meshStandardMaterial color="#18181b" /></mesh>
                <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.16, 0.2, 0.18, 14]} /><meshStandardMaterial color="#27272a" /></mesh>
                <mesh position={[-0.1, 0.1, 0.17]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} /></mesh>
              </group>
            )}
            {pr.blindfold && (
              <mesh position={[0, 0.36, 0.14]}><boxGeometry args={[0.36, 0.09, 0.18]} /><meshStandardMaterial color="#111827" /></mesh>
            )}
            {pr.prop === 'horns' && (
              <>
                <mesh position={[0.12, 0.6, 0.04]} rotation={[0, 0, -0.25]}><coneGeometry args={[0.05, 0.22, 6]} /><meshStandardMaterial color={pr.hornColor ?? '#d97706'} /></mesh>
                <mesh position={[-0.12, 0.6, 0.04]} rotation={[0, 0, 0.25]}><coneGeometry args={[0.05, 0.22, 6]} /><meshStandardMaterial color={pr.hornColor ?? '#d97706'} /></mesh>
              </>
            )}
            {pr.prop === 'ears' && (
              <>
                <mesh position={[0.14, 0.6, 0]}><coneGeometry args={[0.06, 0.24, 6]} /><meshStandardMaterial color={pr.hair} /></mesh>
                <mesh position={[-0.14, 0.6, 0]}><coneGeometry args={[0.06, 0.24, 6]} /><meshStandardMaterial color={pr.hair} /></mesh>
              </>
            )}
            {pr.prop === 'hat' && (
              <mesh position={[0, 0.62, 0]}><coneGeometry args={[0.26, 0.36, 12]} /><meshStandardMaterial color={pr.body} /></mesh>
            )}
            <group ref={animA} position={[0.25, 0.06, 0]}>
              <mesh position={[0, -0.12, 0.06]}><boxGeometry args={[0.11, 0.28, 0.12]} /><meshStandardMaterial color={pr.body} /></mesh>
              {pr.prop === 'katana' && (
                <group position={[0, -0.04, 0.36]} rotation={[0.95, 0, 0]}>
                  <mesh position={[0, 0.26, 0]}><boxGeometry args={[0.04, 0.68, 0.07]} /><meshStandardMaterial color={pr.accent} emissive={pr.accent} emissiveIntensity={0.6} /></mesh>
                  <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.14, 0.04, 0.14]} /><meshStandardMaterial color="#facc15" /></mesh>
                </group>
              )}
              {pr.prop === 'spear' && (
                <group position={[0, -0.02, 0.42]} rotation={[1.05, 0, 0]}>
                  <mesh><cylinderGeometry args={[0.025, 0.025, 1.05, 8]} /><meshStandardMaterial color="#18181b" /></mesh>
                  <mesh position={[0, 0.62, 0]}><coneGeometry args={[0.08, 0.28, 5]} /><meshStandardMaterial color={pr.accent} emissive={pr.accent} emissiveIntensity={0.75} /></mesh>
                </group>
              )}
              {pr.prop === 'bat' && (
                <mesh position={[0, -0.02, 0.38]} rotation={[0.9, 0, 0]}><cylinderGeometry args={[0.055, 0.025, 0.66, 10]} /><meshStandardMaterial color="#e2e8f0" emissive={pr.accent} emissiveIntensity={0.45} /></mesh>
              )}
              {pr.prop === 'rifle' && (
                <group position={[0, -0.06, 0.36]}>
                  <mesh><boxGeometry args={[0.08, 0.14, 0.68]} /><meshStandardMaterial color="#18181b" /></mesh>
                  <mesh position={[0, 0.1, -0.05]}><boxGeometry args={[0.05, 0.06, 0.22]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} /></mesh>
                </group>
              )}
              {pr.prop === 'mic' && (
                <group position={[0, -0.04, 0.26]} rotation={[0.7, 0, 0]}>
                  <mesh><cylinderGeometry args={[0.03, 0.025, 0.26, 8]} /><meshStandardMaterial color="#18181b" /></mesh>
                  <mesh position={[0, 0.16, 0]}><sphereGeometry args={[0.075, 10, 10]} /><meshStandardMaterial color={pr.accent} emissive={pr.accent} emissiveIntensity={0.85} /></mesh>
                </group>
              )}
              {pr.prop === 'needle' && (
                <mesh position={[0, -0.04, 0.38]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.04, 0.62, 8]} /><meshStandardMaterial color="#e2e8f0" emissive="#e879f9" emissiveIntensity={0.7} /></mesh>
              )}
              {pr.prop === 'book' && (
                <mesh position={[0, -0.04, 0.26]} rotation={[0.4, 0, 0]}><boxGeometry args={[0.18, 0.22, 0.05]} /><meshStandardMaterial color={pr.accent} emissive={pr.accent} emissiveIntensity={0.35} /></mesh>
              )}
              {pr.prop === 'orb' && (
                <mesh position={[0, -0.04, 0.32]}><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial color={pr.accent} emissive={pr.accent} emissiveIntensity={0.85} /></mesh>
              )}
            </group>
            <group ref={animB} position={[-0.25, 0.06, 0]}>
              <mesh position={[0, -0.12, 0.04]}><boxGeometry args={[0.11, 0.28, 0.12]} /><meshStandardMaterial color={pr.body} /></mesh>
              {pr.dualSword && (
                <group position={[0, -0.04, 0.3]} rotation={[0.95, 0, 0]}>
                  <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.036, 0.52, 0.06]} /><meshStandardMaterial color="#f8fafc" emissive={pr.accent} emissiveIntensity={0.45} /></mesh>
                  <mesh position={[0, -0.06, 0]}><boxGeometry args={[0.12, 0.035, 0.12]} /><meshStandardMaterial color="#facc15" /></mesh>
                </group>
              )}
            </group>
            {pr.dualSword && (
              <group position={[0, 0.32, -0.38]}>
                <mesh><sphereGeometry args={[0.16, 12, 12]} /><meshStandardMaterial color="#f8fafc" emissive="#a7f3d0" emissiveIntensity={0.7} transparent opacity={0.9} /></mesh>
                <mesh position={[0, -0.1, -0.14]} rotation={[0.6, 0, 0]}><coneGeometry args={[0.1, 0.26, 8]} /><meshStandardMaterial color="#ecfdf5" transparent opacity={0.8} /></mesh>
              </group>
            )}
          </group>
        )
      })()}
    </group>
  )
}
