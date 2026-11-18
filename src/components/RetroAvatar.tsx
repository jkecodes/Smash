import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/store'
import type { CharacterId, FighterId } from '../game/types'

const RETRO_IDS = new Set<CharacterId>([
  'pacman', 'mario', 'invader', 'bomber', 'snake',
  'frogger', 'kong', 'pong', 'reimu', 'marisa',
])

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
        const orbit = t * (attacking ? 11 : 4.8)
        animA.current.position.set(0, Math.sin(orbit) * 0.34, 0.36 + Math.cos(orbit) * 0.16)
      }
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
          {/* 經典紅靴 */}
          <mesh position={[0.16, -0.46, 0.08]} castShadow>
            <boxGeometry args={[0.16, 0.12, 0.26]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[-0.16, -0.46, 0.08]} castShadow>
            <boxGeometry args={[0.16, 0.12, 0.26]} />
            <meshStandardMaterial color="#ef4444" />
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
    </group>
  )
}
