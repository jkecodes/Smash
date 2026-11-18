import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody, interactionGroups, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ModelAvatar, ModelBoundary, useModelUrl } from './ModelAvatar'
import { RetroAvatar, isRetroAvatar } from './RetroAvatar'
import * as THREE from 'three'
import { CHARACTERS } from '../game/characters'
import { PLATFORM_THICKNESS } from '../game/constants'
import { getPlatformPos, resolveStage, type PlatformDef, type StageTheme } from '../game/stages'
import { TETROMINOES, getReadyLines, getTetroBoard } from '../game/skills/tetroSkills'
import { TIER_COLORS, getSteveBlocks } from '../game/skills/steveBlocks'
import { StageDecor, StageParticles, useStageSurfaceTexture } from './StageArt'
import { StageGimmickView } from './StageGimmicks'
import { runtime } from '../game/runtime'
import { stepSimulation } from '../game/sim'
import { getActiveFighterIds, useGameStore } from '../game/store'
import { ALL_FIGHTER_IDS, PLAYER_COLORS, type FighterId } from '../game/types'

function PlatformView({ p, i, h, theme }: { p: PlatformDef; i: number; h: { x: number; y: number; z: number }; theme: StageTheme }) {
  const visRef = useRef<THREE.Group>(null)
  const edgeCol = p.edgeColor ?? theme.platEdgeColor
  useFrame(() => {
    if (!p.move || !visRef.current) return
    const pos = getPlatformPos(p, runtime.stageTime)
    visRef.current.position.set(pos.x, pos.y, 0)
  })
  return (
    <group>
      <RigidBody
        ref={(rb: RapierRigidBody | null) => { runtime.platformBodies[i] = rb }}
        type="fixed"
        position={[p.x, p.y - PLATFORM_THICKNESS / 2, 0]}
        colliders={false}
        friction={0}
        collisionGroups={interactionGroups(2 + i, [1])}
      >
        <CuboidCollider args={[p.w / 2, PLATFORM_THICKNESS / 2, h.z]} friction={0} />
      </RigidBody>
      <group ref={visRef} position={[p.x, p.y, 0]}>
        <mesh position={[0, -PLATFORM_THICKNESS / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[p.w, PLATFORM_THICKNESS, h.z * 2]} />
          <meshStandardMaterial color={p.color ?? theme.platColor} roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.01, h.z]}>
          <boxGeometry args={[p.w, 0.04, 0.06]} />
          <meshBasicMaterial color={edgeCol} />
        </mesh>
        {/* 下方斜角支撐框與兩側發光端帽 */}
        <mesh position={[0, -PLATFORM_THICKNESS - 0.06, 0]}>
          <boxGeometry args={[p.w * 0.82, 0.14, h.z * 1.6]} />
          <meshStandardMaterial color={theme.mainColor} roughness={0.6} metalness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (p.w / 2), -PLATFORM_THICKNESS / 2, 0]}>
            <boxGeometry args={[0.1, PLATFORM_THICKNESS + 0.05, h.z * 2 + 0.04]} />
            <meshBasicMaterial color={edgeCol} />
          </mesh>
        ))}
        {/* 動態移動浮板底部懸浮推進核心 */}
        {p.move && (
          <mesh position={[0, -PLATFORM_THICKNESS - 0.16, 0]}>
            <boxGeometry args={[p.w * 0.35, 0.08, h.z * 0.8]} />
            <meshBasicMaterial color={edgeCol} transparent opacity={0.85} />
          </mesh>
        )}
      </group>
    </group>
  )
}

function SteveBlocksView() {
  useGameStore((s) => s.ui)
  const blocks = getSteveBlocks()
  const blinkOff = Math.floor(performance.now() / 110) % 2 === 0
  return (
    <>
      {blocks.map((b) => {
        if (b.ttlMs < 1500 && blinkOff) return null
        const col = TIER_COLORS[b.tier]
        return (
          <group key={b.id} position={[b.x, b.y, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1.4]} />
              <meshStandardMaterial color={col.side} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.42, 0]}>
              <boxGeometry args={[1.02, 0.18, 1.42]} />
              <meshStandardMaterial color={col.top} roughness={0.5} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/** 場地：動態載入懸空主平台與穿透式層板 */
export function Arena() {
  const stageId = useGameStore((s) => s.stageId)
  const stageForm = useGameStore((s) => s.stageForm)
  const stage = resolveStage(stageId, stageForm)
  const h = stage.half
  const theme = stage.theme
  const surfaceTex = useStageSurfaceTexture(stage.id)

  useEffect(() => {
    return () => { runtime.platformBodies = [] }
  }, [stage.id, stageForm])

  return (
    <group key={`${stage.id}-${stageForm}`}>
      <RigidBody type="fixed" colliders={false} friction={0} collisionGroups={interactionGroups(0, [1])}>
        <CuboidCollider args={[h.x, h.y, h.z]} position={[0, -h.y, 0]} friction={0} />
      </RigidBody>
      <mesh position={[0, -h.y, 0]} receiveShadow castShadow>
        <boxGeometry args={[h.x * 2, h.y * 2, h.z * 2]} />
        <meshStandardMaterial color={theme.mainColor} roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[h.x * 2, h.z * 2]} />
        <meshStandardMaterial map={surfaceTex} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* 主舞台前後金屬斜角飾條 */}
      {[-1, 1].map((s) => (
        <mesh key={`trim-${s}`} position={[0, -h.y, s * (h.z + 0.03)]}>
          <boxGeometry args={[h.x * 2, 0.16, 0.06]} />
          <meshBasicMaterial color={theme.accentColor} />
        </mesh>
      ))}
      <mesh position={[0, -0.05, h.z + 0.03]}>
        <boxGeometry args={[h.x * 2, 0.07, 0.06]} />
        <meshBasicMaterial color={theme.platEdgeColor} />
      </mesh>
      {stage.platforms.map((p, i) => (
        <PlatformView key={`plat-${stage.id}-${i}`} p={p} i={i} h={h} theme={theme} />
      ))}
      {(stage.solids ?? []).map((s, i) => (
        <group key={`solid-${stage.id}-${i}`}>
          <RigidBody type="fixed" colliders={false} friction={0} collisionGroups={interactionGroups(0, [1])}>
            <CuboidCollider args={[s.w / 2, s.h / 2, h.z]} position={[s.x, s.y + s.h / 2, 0]} friction={0} />
          </RigidBody>
          <mesh position={[s.x, s.y + s.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[s.w, s.h, h.z * 2]} />
            <meshStandardMaterial color={s.color ?? theme.mainColor} roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[s.x, s.y + s.h + 0.01, h.z]}>
            <boxGeometry args={[s.w, 0.06, 0.08]} />
            <meshBasicMaterial color={s.edgeColor ?? theme.edgeColor} />
          </mesh>
        </group>
      ))}
      {!stage.walkOff && [-1, 1].map((s) => (
        <mesh key={s} position={[s * (h.x + 0.04), -0.06, 0]}>
          <boxGeometry args={[0.12, 0.14, h.z * 2 + 0.02]} />
          <meshBasicMaterial color={theme.edgeColor} />
        </mesh>
      ))}
      <StageDecor stage={stage} />
      <StageGimmickView stage={stage} />
      <SteveBlocksView />
      <StageParticles stage={stage} />
    </group>
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
function makeMarkTexture(label: string, color: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.beginPath(); g.moveTo(128, 124); g.lineTo(100, 96); g.lineTo(156, 96); g.closePath(); g.fill() // 向下小箭頭
  g.beginPath(); g.roundRect(28, 8, 200, 86, 22); g.fill()
  g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke()
  g.fillStyle = '#ffffff'; g.font = 'bold 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(label, 128, 52)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
function PlayerMarker({ id }: { id: FighterId }) {
  const cpu = useGameStore((s) => s.cpu[id])
  const charId = useGameStore((s) => s.selection[id])
  const charScale = CHARACTERS[charId]?.scale ?? 1
  const tag = id.toUpperCase()
  const label = cpu ? `${tag} CPU` : tag
  const tex = useState(() => ({ t: null as THREE.CanvasTexture | null }))[0]
  useEffect(() => { tex.t = makeMarkTexture(label, PLAYER_COLORS[id]); setV((v) => v + 1); return () => tex.t?.dispose() }, [label, id, tex])
  const [, setV] = useState(0)
  const ref = useRef<THREE.Sprite>(null)
  useFrame(() => { if (ref.current) ref.current.position.y = 1.9 * charScale + 0.1 + Math.sin(performance.now() / 300) * 0.06 })
  if (!tex.t) return null
  return (
    <sprite ref={ref} position={[0, 1.9 * charScale + 0.1, 0]} scale={[1.5, 0.75, 1]} renderOrder={10}>
      <spriteMaterial map={tex.t} transparent depthTest={false} />
    </sprite>
  )
}

/** TETRO 專屬 3D 俄羅斯方塊戰士 ＋ 頭頂懸浮 4×6 即時方塊矩陣 */
function TetroAvatar({ id }: { id: FighterId }) {
  const bodyGroup = useRef<THREE.Group>(null)
  const blockRefs = useRef<THREE.Mesh[]>([])
  const blockMats = useRef<THREE.MeshStandardMaterial[]>([])
  const cellRefs = useRef<THREE.Mesh[]>([])
  const cellMats = useRef<THREE.MeshBasicMaterial[]>([])
  const frameMat = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    const f = useGameStore.getState().fighters[id]
    const b = getTetroBoard(id)
    const piece = TETROMINOES[b.current]
    const flash = f.flashMs > 0
    const blink = f.invulnMs > 0 && Math.floor(performance.now() / 80) % 2 === 0

    // 更新本體 4 顆俄羅斯方塊的位置與顏色
    piece.blocks.forEach(([bx, by], i) => {
      const m = blockRefs.current[i]
      const mat = blockMats.current[i]
      if (m) m.position.set(0, by * 0.36, bx * 0.36)
      if (mat) {
        mat.color.set(flash ? '#ffffff' : piece.color)
        mat.emissive.set(piece.color).multiplyScalar(f.fsm === 'ATTACK_ACTIVE' ? 0.8 : 0.25)
        mat.opacity = blink ? 0.45 : 1
        mat.transparent = true
      }
    })

    if (bodyGroup.current) {
      if (f.fsm === 'DODGE' || f.fsm === 'ATTACK_ACTIVE') {
        bodyGroup.current.rotation.x = (f.stateMs / 260) * Math.PI * 2
      } else {
        bodyGroup.current.rotation.x *= 0.75
      }
    }

    // 更新背後的 6×4 全息俄羅斯方塊矩陣
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c
        const cm = cellRefs.current[idx]
        const cmat = cellMats.current[idx]
        const col = b.grid[r][c]
        if (cm && cmat) {
          cm.visible = !!col || c < 3
          cmat.color.set(col ?? '#1e293b')
          cmat.opacity = col ? 0.95 : 0.22
        }
      }
    }
    if (frameMat.current) {
      const ready = getReadyLines(id)
      frameMat.current.color.set(ready >= 4 ? '#ffe066' : ready >= 2 ? '#00e850' : '#00f0f0')
    }
  })

  return (
    <group>
      {/* 動態變形的 4 格俄羅斯方塊本體 */}
      <group ref={bodyGroup}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} ref={(el) => { if (el) blockRefs.current[i] = el }} castShadow>
            <boxGeometry args={[0.34, 0.34, 0.34]} />
            <meshStandardMaterial ref={(el) => { if (el) blockMats.current[i] = el }} roughness={0.25} metalness={0.2} />
          </mesh>
        ))}
      </group>
      {/* 懸浮於角色後上方的 4×6 迷你俄羅斯方塊矩陣（固定朝向鏡頭） */}
      <group position={[0, 1.05, -0.65]} rotation={[0, -Math.PI / 2, 0]} scale={[0.75, 0.75, 0.75]}>
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[0.92, 1.32]} />
          <meshBasicMaterial color="#090d16" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[0.98, 1.38]} />
          <meshBasicMaterial ref={frameMat} color="#00f0f0" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 24 }, (_, idx) => {
          const r = Math.floor(idx / 4)
          const c = idx % 4
          return (
            <mesh
              key={idx}
              ref={(el) => { if (el) cellRefs.current[idx] = el }}
              position={[(c - 1.5) * 0.2, (r - 2.5) * 0.2, 0]}
            >
              <boxGeometry args={[0.17, 0.17, 0.06]} />
              <meshBasicMaterial ref={(el) => { if (el) cellMats.current[idx] = el }} transparent />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function FighterView({ id }: { id: FighterId }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const nose = useRef<THREE.Mesh>(null)
  const orb = useRef<THREE.Group>(null)
  const shield = useRef<THREE.Group>(null)
  const aura = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const charId = useGameStore((s) => s.selection[id])
  const tint = CHARACTERS[charId].color
  const modelUrl = useModelUrl(id)
  // 已載入完成的模型網址；與目前要顯示的網址相同才隱藏備用方塊（不依賴 effect 執行順序）
  const readyUrl = useRef<string | null>(null)

  useFrame(() => {
    const f = useGameStore.getState().fighters[id]
    if (!group.current || !mat.current) return
    group.current.visible = f.alive
    const modelShown = !!modelUrl && readyUrl.current === modelUrl
    const isTetro = f.character === 'tetro' && !modelShown
    const isRetro = isRetroAvatar(f.character) && !modelShown
    if (body.current) {
      body.current.visible = !modelShown && !isTetro && !isRetro
      body.current.rotation.x = f.fsm === 'DODGE' ? (f.stateMs / 340) * Math.PI * 2 : 0
    }
    if (nose.current) nose.current.visible = !modelShown && !isTetro && !isRetro
    group.current.rotation.y = f.facing[0] >= 0 ? Math.PI / 2 : -Math.PI / 2
    const flash = f.flashMs > 0
    const base = new THREE.Color(tint)
    mat.current.color.copy(flash ? new THREE.Color('#ffffff') : base)
    mat.current.emissive.copy(base).multiplyScalar(f.fsm === 'ATTACK_ACTIVE' ? 0.9 : f.fsm === 'HITSTUN' ? 0.5 : 0.12)
    mat.current.opacity = f.invulnMs > 0 && Math.floor(performance.now() / 80) % 2 === 0 ? 0.45 : 1
    mat.current.transparent = true
    const squash = f.fsm === 'ATTACK_STARTUP' ? 0.85 : f.fsm === 'SHIELD' ? 0.88 : 1
    const cs = CHAR_SCALE * (CHARACTERS[f.character]?.scale ?? 1)
    group.current.scale.set(cs, cs * squash, cs)
    const jitter = runtime.hitstopMs > 0 && f.fsm === 'HITSTUN' ? (Math.random() - 0.5) * 0.22 : 0
    group.current.position.set(jitter, (cs - 1) * 0.5, 0) // 腳底維持貼地，受擊頓幀時震顫
    if (aura.current) {
      aura.current.visible = f.ultReady
      aura.current.scale.setScalar(1.35 + 0.12 * Math.sin(performance.now() / 120))
      ;(aura.current.material as THREE.MeshBasicMaterial).color.setHSL((performance.now() / 1500) % 1, 1, 0.6)
    }
    if (shield.current) {
      shield.current.visible = f.fsm === 'SHIELD'
      shield.current.scale.setScalar(0.65 + 0.45 * Math.max(0, f.shield) / 100) // 護盾耐久越低越小
      shield.current.rotation.y = performance.now() / 600
    }
    if (orb.current) {
      const r = f.skill?.chargeRatio ?? 0
      orb.current.visible = !!f.skill && f.skill.def.charge !== undefined && f.skill.phase === 'startup' && !f.skill.released
      orb.current.scale.setScalar(0.15 + r * 0.55)
      orb.current.rotation.y = performance.now() / 160
      orb.current.rotation.z = performance.now() / 220
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
      {charId === 'tetro' && !modelUrl && <TetroAvatar id={id} />}
      {isRetroAvatar(charId) && !modelUrl && <RetroAvatar id={id} charId={charId} />}
      <mesh ref={body} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={mat} color={tint} />
      </mesh>
      <mesh ref={nose} position={[0, 0.12, 0.55]}>
        <boxGeometry args={[0.5, 0.18, 0.12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <group ref={orb} position={[0, 0.1, 0.95]} visible={false}>
        <mesh>
          <octahedronGeometry args={[0.85, 0]} />
          <meshBasicMaterial color={CHARACTERS[charId].color} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.08, 8, 20]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <mesh ref={aura} visible={false}>
        <sphereGeometry args={[0.8, 20, 20]} />
        <meshBasicMaterial color="#ffd24d" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={shield} position={[0, 0.1, 0]} visible={false}>
        <mesh>
          <sphereGeometry args={[1.02, 24, 24]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.38} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshBasicMaterial color="#bae6fd" wireframe transparent opacity={0.7} depthWrite={false} />
        </mesh>
      </group>
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
  const idx = ALL_FIGHTER_IDS.indexOf(id)
  const initX = idx === 0 ? -4 : idx === 1 ? 4 : -6 + idx * 1.7
  return (
    <RigidBody
      ref={(rb: RapierRigidBody | null) => {
        runtime.bodies[id] = rb
        if (rb) runtime.handles.set(rb.handle, id)
      }}
      position={[initX, 1, 0]}
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
  const playerCount = useGameStore((s) => s.playerCount)
  return <>{ALL_FIGHTER_IDS.slice(0, playerCount).map((id) => <Fighter key={id} id={id} />)}</>
}

/** 自動取景的側視攝影機（2.5D） */
export function CameraRig() {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 2, 0))
  const stageId = useGameStore((s) => s.stageId)
  const stageForm = useGameStore((s) => s.stageForm)
  const stage = resolveStage(stageId, stageForm)

  useFrame((_, dt) => {
    const fs = useGameStore.getState().fighters
    const pts = getActiveFighterIds().map((i) => fs[i]).filter((f) => f?.alive).map((f) => f.pos)
    let cx = 0, cy = 2, spread = 8
    if (pts.length) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
      cx = (Math.min(...xs) + Math.max(...xs)) / 2
      cy = (Math.min(...ys) + Math.max(...ys)) / 2
      spread = Math.max(8, Math.max(...xs) - Math.min(...xs) + 6, (Math.max(...ys) - Math.min(...ys)) * 1.6 + 6)
    }
    const boundX = stage.half.x + 2
    cx = THREE.MathUtils.clamp(cx, -boundX, boundX)
    cy = THREE.MathUtils.clamp(cy, -2, 13)
    const k = 1 - Math.pow(0.02, dt)
    const sh = runtime.shake
    const fatal = useGameStore.getState().fatalFlash
    const zoomActive = fatal && performance.now() < fatal.until
    const target = zoomActive
      ? new THREE.Vector3(fatal.x + (Math.random() - 0.5) * sh, fatal.y + 1.2 + (Math.random() - 0.5) * sh, 10.5)
      : new THREE.Vector3(cx * 0.8 + (Math.random() - 0.5) * sh, cy + 4 + (Math.random() - 0.5) * sh, 12 + spread * 1.05)
    camera.position.lerp(target, zoomActive ? Math.min(1, k * 2.2) : k)
    look.current.lerp(zoomActive ? new THREE.Vector3(fatal.x, fatal.y + 0.5, 0) : new THREE.Vector3(cx * 0.8, cy + 1, 0), zoomActive ? Math.min(1, k * 2.2) : k)
    camera.lookAt(look.current)
  })
  return null
}
