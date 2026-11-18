import { useFrame, useLoader } from '@react-three/fiber'
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { CHARACTERS } from '../game/characters'
import { useGameStore } from '../game/store'
import type { FighterId, FsmState } from '../game/types'

/** 模型縮放到的目標身高（碰撞盒是 1x1x1，腳底對齊碰撞盒底部）。 */
const MODEL_HEIGHT = 1.15
const MODEL_MAX_WIDTH = 1.3
/** 若你的模型正面不是 +Z，在這裡補轉角（弧度），例如 Math.PI 表示轉 180°。 */
const MODEL_YAW_OFFSET = 0

/** 載入失敗（檔案不存在 / 格式錯誤）時安靜地回到方塊角色。 */
export class ModelBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: string | null }> {
  state = { failed: null as string | null }
  static getDerivedStateFromError(e: unknown) { return { failed: String(e) } }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: null })
  }
  componentDidCatch(e: unknown) { console.warn('[smash] 模型載入失敗，改用方塊：', e) }
  render() { return this.state.failed ? null : this.props.children }
}

/** 決定這位玩家的模型網址：拖曳匯入 > public/models/<角色id>.glb > 無（方塊）。 */
export function useModelUrl(id: FighterId): string | null {
  const dropped = useGameStore((s) => s.playerModel[id]?.url ?? null)
  const charId = useGameStore((s) => s.selection[id])
  // 以 charId 標記檢查結果，換角色時不會先變成 null 再變回來（避免不必要的重新掛載）
  const [auto, setAuto] = useState<{ charId: string; url: string | null } | null>(null)
  useEffect(() => {
    let dead = false
    const url = `/models/${charId}.glb`
    fetch(url, { method: 'HEAD' })
      .then((r) => { if (!dead) setAuto({ charId, url: r.ok && !(r.headers.get('content-type') ?? '').includes('text/html') ? url : null }) })
      .catch(() => { if (!dead) setAuto({ charId, url: null }) })
    return () => { dead = true }
  }, [charId])
  return dropped ?? (auto && auto.charId === charId ? auto.url : null)
}

const CLIP_PATTERNS: [FsmState | 'DEFAULT', RegExp][] = [
  ['SHIELD', /shield|guard|block/i],
  ['HITSTUN', /hit|hurt|damage|stun|knock/i],
  ['ATTACK_ACTIVE', /attack|punch|slash|strike|kick|swing/i],
  ['JUMP', /jump|fall|air/i],
  ['RUN', /run|walk|sprint/i],
  ['IDLE', /idle|stand|breath|wait/i],
]
const fsmToClipKey = (s: FsmState): FsmState => {
  if (s === 'ATTACK_STARTUP' || s === 'ATTACK_RECOVERY') return 'ATTACK_ACTIVE'
  if (s === 'LEDGE') return 'JUMP'
  if (s === 'DODGE') return 'SHIELD'
  return s
}

export function ModelAvatar({ id, url, onReady }: { id: FighterId; url: string; onReady: () => void }) {
  const gltf = useLoader(GLTFLoader, url)
  const built = useMemo(() => {
    const root = cloneSkinned(gltf.scene)
    const mats: THREE.Material[] = []
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.frustumCulled = false
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone()
      mats.push(...[m.material].flat())
    })
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const s = Math.min(MODEL_HEIGHT / (size.y || 1), MODEL_MAX_WIDTH / (Math.max(size.x, size.z) || 1))
    root.scale.setScalar(s)
    root.position.set(-center.x * s, -box.min.y * s - 0.5, -center.z * s)
    const holder = new THREE.Group()
    holder.add(root)
    const inner = new THREE.Group()
    inner.rotation.y = MODEL_YAW_OFFSET
    inner.add(holder)
    return { inner, holder, mats, root }
  }, [gltf])

  // 動畫：模型若自帶動畫片段，依名稱對應到狀態機；沒有就用程序式晃動
  const anim = useMemo(() => {
    if (!gltf.animations.length) return null
    const mixer = new THREE.AnimationMixer(built.root)
    const actions = new Map<string, THREE.AnimationAction>()
    for (const clip of gltf.animations) {
      const hit = CLIP_PATTERNS.find(([, re]) => re.test(clip.name))
      if (hit && !actions.has(hit[0])) actions.set(hit[0], mixer.clipAction(clip))
    }
    const byName = (re: RegExp) => gltf.animations.find((c) => re.test(c.name))
    // 沒有專屬片段時的合理替代：防禦=蹲下、受擊=墜落姿勢
    if (!actions.has('SHIELD')) { const c = byName(/^crouch$/i); if (c) actions.set('SHIELD', mixer.clipAction(c)) }
    if (!actions.has('HITSTUN')) { const c = byName(/^fall$/i); if (c) actions.set('HITSTUN', mixer.clipAction(c)) }
    // 角色自訂的片段覆寫（例如槍手攻擊用 holding-right-shoot）
    const override = (CHARACTERS[useGameStore.getState().selection[id]].clips ?? {}) as Record<string, string>
    for (const [state, name] of Object.entries(override)) {
      const c = gltf.animations.find((x) => x.name === name)
      if (c) actions.set(state, mixer.clipAction(c))
    }
    if (!actions.size) actions.set('IDLE', mixer.clipAction(gltf.animations[0]))
    for (const [k, a] of actions) if (k === 'ATTACK_ACTIVE') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true }
    return { mixer, actions, current: null as THREE.AnimationAction | null }
  }, [gltf, built])

  useEffect(() => { onReady() }, [built])
  const last = useRef<FsmState>('IDLE')
  const lastSkill = useRef<string | null>(null)
  useEffect(() => () => { anim?.mixer.stopAllAction() }, [anim])

  useFrame((_, dt) => {
    const f = useGameStore.getState().fighters[id]
    const t = performance.now() / 1000
    const { holder, mats } = built

    if (anim) {
      anim.mixer.update(dt)
      const skillId = f.skill?.def.id ?? null
      const newSkill = skillId !== lastSkill.current // 連段換招時重播攻擊動作
      lastSkill.current = skillId
      if (last.current !== f.fsm || !anim.current || (newSkill && skillId)) {
        last.current = f.fsm
        const next = anim.actions.get(fsmToClipKey(f.fsm)) ?? anim.actions.get('IDLE') ?? [...anim.actions.values()][0]
        if (next && (next !== anim.current || (newSkill && skillId))) {
          next.reset().fadeIn(0.08).play()
          if (anim.current && anim.current !== next) anim.current.fadeOut(0.08)
          anim.current = next
        }
      }
      if (f.fsm === 'DODGE') {
        if (f.dodgeKind === 'spot') {
          holder.rotation.x += (-0.25 - holder.rotation.x) * 0.4
          holder.position.x += (0.38 - holder.position.x) * 0.4
          holder.scale.y += (0.82 - holder.scale.y) * 0.4
        } else {
          holder.rotation.x = (f.stateMs / 340) * Math.PI * 2
          holder.scale.y += (0.75 - holder.scale.y) * 0.4
        }
      } else if (f.fsm === 'SHIELD') {
        holder.rotation.x += (0.16 - holder.rotation.x) * 0.35
        holder.position.x += (0 - holder.position.x) * 0.35
        holder.scale.y += (0.82 - holder.scale.y) * 0.35
      } else {
        holder.rotation.x += (0 - holder.rotation.x) * 0.35
        holder.position.x += (0 - holder.position.x) * 0.35
        holder.scale.y += (1 - holder.scale.y) * 0.35
      }
    } else {
      // 程序式姿態（靜態模型）
      let lean = 0, bob = 0, sy = 1, z = 0
      switch (f.fsm) {
        case 'RUN': lean = 0.18; bob = Math.abs(Math.sin(t * 14)) * 0.07; break
        case 'JUMP': sy = 1.06; lean = 0.08; break
        case 'ATTACK_STARTUP': lean = -0.12; sy = 0.92; break
        case 'ATTACK_ACTIVE': lean = 0.35; z = 0.15; break
        case 'ATTACK_RECOVERY': lean = 0.1; break
        case 'HITSTUN': lean = -0.45; break
        case 'LEDGE': lean = 0; bob = 0.1; break
        case 'DODGE': lean = 0.35; sy = 0.85; break
        default: bob = Math.sin(t * 2.5) * 0.015
      }
      holder.rotation.x += (lean - holder.rotation.x) * 0.3
      holder.position.y += (bob - holder.position.y) * 0.5
      holder.position.z += (z - holder.position.z) * 0.4
      holder.scale.y += (sy - holder.scale.y) * 0.3
    }

    // 受擊閃白、攻擊發光、無敵閃爍
    const flash = f.flashMs > 0
    const blink = f.invulnMs > 0 && Math.floor(performance.now() / 80) % 2 === 0
    const glow = f.fsm === 'ATTACK_ACTIVE' ? 0.35 : 0
    for (const m of mats as any[]) {
      if (m.emissive) m.emissive.setScalar(flash ? 1 : glow)
      m.transparent = true
      m.opacity = blink ? 0.45 : 1
    }
  })

  return <primitive object={built.inner} />
}

/** 讀取玩家選的角色名稱（給選單顯示） */
export const characterName = (id: string) => (CHARACTERS as any)[id]?.name ?? id
