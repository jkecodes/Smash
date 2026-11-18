import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { STAGES, type StageDef, type StageId } from '../game/stages'

function makeCanvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** 為 11 位角色各自專屬的場地程序化繪製頂面紋理 (512x256) */
export function useStageSurfaceTexture(stageId: StageId): THREE.CanvasTexture {
  const tex = useMemo(() => {
    return makeCanvasTex(512, 256, (g, w, h) => {
      if (stageId === 'reimu') {
        g.fillStyle = '#5c4448'
        g.fillRect(0, 0, w, h)
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 8; c++) {
            g.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,240,235,0.08)' : 'rgba(0,0,0,0.14)'
            g.fillRect(c * 64 + (r % 2 ? 16 : 0), r * 64, 62, 62)
          }
        }
        // 中央陰陽太極紋飾
        g.fillStyle = '#fef2f2'
        g.beginPath(); g.arc(w / 2, h / 2, 56, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#dc2626'
        g.beginPath(); g.arc(w / 2, h / 2, 56, -Math.PI / 2, Math.PI / 2); g.fill()
        g.beginPath(); g.arc(w / 2, h / 2 - 28, 28, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#fef2f2'
        g.beginPath(); g.arc(w / 2, h / 2 + 28, 28, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#dc2626'; g.fillRect(0, 0, 18, h); g.fillRect(w - 18, 0, 18, h)
      } else if (stageId === 'marisa') {
        g.fillStyle = '#1d193d'
        g.fillRect(0, 0, w, h)
        // 金色八卦法陣與星芒
        g.strokeStyle = 'rgba(250, 204, 21, 0.7)'
        g.lineWidth = 3
        g.beginPath(); g.ellipse(w / 2, h / 2, 102, 70, 0, 0, Math.PI * 2); g.stroke()
        g.beginPath(); g.ellipse(w / 2, h / 2, 72, 50, 0, 0, Math.PI * 2); g.stroke()
        g.beginPath()
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2
          const r = i % 2 === 0 ? 58 : 24
          const px = w / 2 + Math.cos(a) * r
          const py = h / 2 + Math.sin(a) * (r * 0.72)
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        }
        g.closePath(); g.stroke()
        g.fillStyle = 'rgba(250, 204, 21, 0.45)'
        g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h)
      } else if (stageId === 'tetro') {
        g.fillStyle = '#0f172a'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(0, 240, 240, 0.28)'
        g.lineWidth = 2
        for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
        for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        const blocks: [number, number, string][] = [
          [64, 32, '#00f0f0'], [96, 32, '#00f0f0'], [128, 32, '#00f0f0'],
          [352, 64, '#b84dff'], [384, 64, '#b84dff'], [384, 32, '#b84dff'],
          [224, 160, '#f0f000'], [256, 160, '#f0f000'], [224, 192, '#f0f000'], [256, 192, '#f0f000'],
        ]
        for (const [bx, by, col] of blocks) {
          g.fillStyle = col + '55'
          g.fillRect(bx + 2, by + 2, 28, 28)
        }
      } else if (stageId === 'pacman') {
        g.fillStyle = '#070e22'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#3b82f6'
        g.lineWidth = 4
        g.strokeRect(10, 12, w - 20, h - 24)
        g.strokeRect(48, 42, w - 96, h - 84)
        // 能量豆圓點
        g.fillStyle = '#fde047'
        for (let x = 32; x < w - 20; x += 40) {
          g.beginPath(); g.arc(x, 27, 4, 0, Math.PI * 2); g.fill()
          g.beginPath(); g.arc(x, h - 27, 4, 0, Math.PI * 2); g.fill()
        }
        g.fillStyle = '#fef08a'
        g.beginPath(); g.arc(30, h / 2, 10, 0, Math.PI * 2); g.fill()
        g.beginPath(); g.arc(w - 30, h / 2, 10, 0, Math.PI * 2); g.fill()
      } else if (stageId === 'mario') {
        g.fillStyle = '#9a3412'
        g.fillRect(0, 0, w, h)
        g.fillStyle = '#22c55e'
        g.fillRect(0, 0, w, 46)
        g.fillRect(0, h - 46, w, 46)
        g.strokeStyle = '#451a03'
        g.lineWidth = 3
        for (let row = 0; row < 4; row++) {
          const y = 48 + row * 40
          for (let col = 0; col < 8; col++) {
            g.strokeRect(col * 64 + (row % 2 ? 32 : 0), y, 64, 40)
          }
        }
      } else if (stageId === 'invader') {
        g.fillStyle = '#071a0e'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(34, 197, 94, 0.35)'
        g.lineWidth = 2
        for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
        for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        g.strokeStyle = '#4ade80'
        g.lineWidth = 4
        g.beginPath(); g.ellipse(w / 2, h / 2, 85, 58, 0, 0, Math.PI * 2); g.stroke()
        g.fillStyle = '#22c55e'
        g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h)
      } else if (stageId === 'bomber') {
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 8; c++) {
            g.fillStyle = (r + c) % 2 === 0 ? '#16a34a' : '#15803d'
            g.fillRect(c * 64, r * 64, 64, 64)
          }
        }
        g.strokeStyle = 'rgba(251, 146, 60, 0.8)'
        g.lineWidth = 5
        g.strokeRect(8, 8, w - 16, h - 16)
      } else if (stageId === 'snake') {
        g.fillStyle = '#183a22'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(74, 222, 128, 0.25)'
        g.lineWidth = 2
        for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
        for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        // LCD 紅蘋果像素
        g.fillStyle = '#ef4444'
        g.fillRect(w / 2 - 14, h / 2 - 14, 28, 28)
      } else if (stageId === 'frogger') {
        g.fillStyle = '#1e293b'
        g.fillRect(0, 0, w, h)
        g.fillStyle = '#0369a1'
        g.fillRect(0, 0, w, 40)
        g.fillStyle = '#4ade80'
        g.fillRect(0, h - 38, w, 38)
        g.fillStyle = '#fde047'
        for (let x = 16; x < w; x += 56) g.fillRect(x, h / 2 - 4, 32, 8)
      } else if (stageId === 'kong') {
        g.fillStyle = '#701a3c'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#f472b6'
        g.lineWidth = 4
        for (let x = 0; x < w; x += 48) {
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 24, h); g.lineTo(x + 48, 0); g.stroke()
        }
        g.fillStyle = '#facc15'
        g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12)
      } else if (stageId === 'pong') {
        // pong：極簡向量黑白球場＋中線
        g.fillStyle = '#090d16'
        g.fillRect(0, 0, w, h)
        g.fillStyle = '#f8fafc'
        g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10)
        for (let y = 16; y < h - 16; y += 28) g.fillRect(w / 2 - 4, y, 8, 16)
        g.fillStyle = '#38bdf8'
        g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h)
      } else if (stageId === 'ryu') {
        // 朱雀城木造道場地板＋紅日徽
        g.fillStyle = '#78350f'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(28, 12, 5, 0.5)'
        g.lineWidth = 2
        for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        for (let x = 0; x <= w; x += 96) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
        g.fillStyle = 'rgba(220, 38, 38, 0.45)'
        g.beginPath(); g.arc(w / 2, h / 2, 48, 0, Math.PI * 2); g.fill()
      } else if (stageId === 'chunli') {
        // 香港夜市磚紋＋金龍邊框
        g.fillStyle = '#1e293b'
        g.fillRect(0, 0, w, h)
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 8; c++) {
            g.fillStyle = (r + c) % 2 === 0 ? '#1e3a8a' : '#0f172a'
            g.fillRect(c * 64 + 2, r * 64 + 2, 60, 60)
          }
        }
        g.strokeStyle = '#facc15'
        g.lineWidth = 5
        g.strokeRect(8, 8, w - 16, h - 16)
      } else if (stageId === 'yugi') {
        // 決鬥盤魔法・陷阱格線＋黃金千年眼
        g.fillStyle = '#2e1065'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#fde047'
        g.lineWidth = 3
        for (let i = 0; i < 5; i++) {
          g.strokeRect(36 + i * 92, 34, 72, 84)
          g.strokeRect(36 + i * 92, 138, 72, 84)
        }
        g.beginPath(); g.ellipse(w / 2, h / 2, 40, 24, 0, 0, Math.PI * 2); g.stroke()
        g.fillStyle = '#fde047'
        g.beginPath(); g.arc(w / 2, h / 2, 10, 0, Math.PI * 2); g.fill()
      } else if (stageId === 'kaiba') {
        // kaiba：海馬企業六角全息決鬥台
        g.fillStyle = '#0f172a'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(56, 189, 248, 0.45)'
        g.lineWidth = 2
        for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
        for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        g.strokeStyle = '#67e8f9'
        g.lineWidth = 4
        g.beginPath(); g.arc(w / 2, h / 2, 64, 0, Math.PI * 2); g.stroke()
        g.fillStyle = '#38bdf8'
        g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h)
      } else if (stageId === 'omnom') {
        // 糖果盒實驗室：牛皮紙盒＋紅白漩渦糖果圖騰
        g.fillStyle = '#b45309'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#78350f'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16)
        g.fillStyle = '#f43f5e'; g.beginPath(); g.arc(w / 2, h / 2, 42, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, h / 2, 24, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#4ade80'; g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h)
      } else if (stageId === 'tom' || stageId === 'ben') {
        // 湯姆客廳／阿班實驗室：木紋拼接地板
        g.fillStyle = stageId === 'tom' ? '#64748b' : '#78350f'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 2
        for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        g.fillStyle = stageId === 'tom' ? '#38bdf8' : '#22c55e'
        g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h)
      } else if (stageId === 'crossy') {
        // 天天過馬路：柏油斑馬線＋草地邊緣
        g.fillStyle = '#334155'; g.fillRect(0, 0, w, h)
        g.fillStyle = '#16a34a'; g.fillRect(0, 0, w, 34); g.fillRect(0, h - 34, w, 34)
        g.fillStyle = '#f8fafc'
        for (let x = 24; x < w; x += 64) g.fillRect(x, h / 2 - 14, 34, 28)
      } else if (stageId === 'red' || stageId === 'steve') {
        // 綠豬堡壘 / Minecraft 平原草地像素塊
        g.fillStyle = '#22c55e'; g.fillRect(0, 0, w, h)
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 8; c++) {
            g.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
            g.fillRect(c * 64, r * 64, 64, 64)
          }
        }
        g.fillStyle = stageId === 'red' ? '#ef4444' : '#38bdf8'
        g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h)
      } else if (stageId === 'arisa') {
        // arisa：精靈聖樹翡翠法陣
        g.fillStyle = '#064e3b'; g.fillRect(0, 0, w, h)
        g.strokeStyle = 'rgba(110, 231, 183, 0.55)'; g.lineWidth = 3
        g.beginPath(); g.ellipse(w / 2, h / 2, 95, 62, 0, 0, Math.PI * 2); g.stroke()
        g.beginPath(); g.ellipse(w / 2, h / 2, 55, 36, 0, 0, Math.PI * 2); g.stroke()
      } else {
        const th = (STAGES[stageId] ?? STAGES.reimu)!.theme
        g.fillStyle = th.surfaceColor; g.fillRect(0, 0, w, h)
        g.strokeStyle = th.accentColor + '44'; g.lineWidth = 2
        for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
        for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        g.strokeStyle = th.edgeColor; g.lineWidth = 3
        g.beginPath(); g.ellipse(w / 2, h / 2, 80, 52, 0, 0, Math.PI * 2); g.stroke()
        g.fillStyle = th.edgeColor; g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h)
      }
    })
  }, [stageId])

  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

/** 各場地環境漂浮粒子 */
export function StageParticles({ stage }: { stage: StageDef }) {
  const count = 110
  const ptsRef = useRef<THREE.Points>(null)

  const data = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const phases = new Float32Array(count)
    const c1 = new THREE.Color(stage.theme.accentColor)
    const c2 = new THREE.Color(stage.theme.edgeColor)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 52
      pos[i * 3 + 1] = -10 + Math.random() * 28
      pos[i * 3 + 2] = -22 + Math.random() * 26
      speeds[i] = 0.35 + Math.random() * 0.9
      phases[i] = Math.random() * Math.PI * 2
      const c = i % 2 === 0 ? c1 : c2
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    return { pos, colors, speeds, phases }
  }, [stage.id, stage.theme.accentColor, stage.theme.edgeColor])

  useFrame(({ clock }, dt) => {
    const pts = ptsRef.current
    if (!pts) return
    const t = clock.elapsedTime
    const arr = data.pos
    const dir = stage.id === 'reimu' ? -0.6 : 1
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += data.speeds[i] * dt * dir
      arr[i * 3] += Math.sin(t * 0.8 + data.phases[i]) * 0.25 * dt
      if (dir > 0 && arr[i * 3 + 1] > 18) {
        arr[i * 3 + 1] = -10; arr[i * 3] = (Math.random() - 0.5) * 52
      } else if (dir < 0 && arr[i * 3 + 1] < -10) {
        arr[i * 3 + 1] = 18; arr[i * 3] = (Math.random() - 0.5) * 52
      }
    }
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute
    attr.needsUpdate = true
  })

  return (
    <points ref={ptsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.pos} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={data.colors} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={stage.id === 'reimu' ? 0.24 : 0.18}
        vertexColors
        transparent
        opacity={0.78}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/** 1. 靈夢主場：博麗神社（朱紅大鳥居 ＋ 社殿大屋頂 ＋ 漂浮巨型陰陽玉） */
function ReimuDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const orb = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (orb.current) {
      orb.current.rotation.z = clock.elapsedTime * 0.6
      orb.current.position.y = 8.5 + Math.sin(clock.elapsedTime * 1.4) * 0.4
    }
  })
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.65, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#3d282c" roughness={0.85} /></mesh>
      <mesh position={[0, -0.6, h.z + 0.04]}><boxGeometry args={[h.x * 1.98, 0.14, 0.08]} /><meshBasicMaterial color="#ffd76a" /></mesh>
      {/* 朱紅大鳥居 */}
      <group position={[0, 2.5, -8.5]}>
        <mesh position={[-5.2, 1.8, 0]}><cylinderGeometry args={[0.45, 0.55, 11, 14]} /><meshStandardMaterial color="#dc2626" /></mesh>
        <mesh position={[5.2, 1.8, 0]}><cylinderGeometry args={[0.45, 0.55, 11, 14]} /><meshStandardMaterial color="#dc2626" /></mesh>
        <mesh position={[0, 5.2, 0]}><boxGeometry args={[12.8, 0.7, 0.8]} /><meshStandardMaterial color="#b91c1c" /></mesh>
        <mesh position={[0, 7.2, 0]}><boxGeometry args={[14.6, 0.9, 1.0]} /><meshStandardMaterial color="#dc2626" /></mesh>
        <mesh position={[0, 7.75, 0]}><boxGeometry args={[15.2, 0.35, 1.1]} /><meshStandardMaterial color="#1f2937" /></mesh>
        <mesh position={[0, 6.2, 0.3]}><boxGeometry args={[1.6, 1.8, 0.3]} /><meshStandardMaterial color="#111827" /></mesh>
      </group>
      {/* 雙側賽錢箱 / 石燈籠 */}
      {[-9.5, 9.5].map((lx, i) => (
        <group key={i} position={[lx, 0.8, -5.5]}>
          <mesh><boxGeometry args={[1.2, 3.2, 1.2]} /><meshStandardMaterial color="#57534e" /></mesh>
          <mesh position={[0, 2.0, 0]}><sphereGeometry args={[0.45, 10, 10]} /><meshBasicMaterial color="#fef08a" /></mesh>
        </group>
      ))}
      {/* 巨型漂浮陰陽玉 */}
      <group ref={orb} position={[0, 8.5, -16]}>
        <mesh><torusGeometry args={[3.2, 0.14, 12, 48]} /><meshBasicMaterial color="#fda4af" transparent opacity={0.45} /></mesh>
        <mesh position={[0, 0, -0.2]}><circleGeometry args={[2.6, 32]} /><meshBasicMaterial color="#dc2626" transparent opacity={0.22} /></mesh>
      </group>
    </>
  )
}

/** 2. 魔理沙主場：魔法森林（發光巨大蘑菇群 ＋ 旋轉金色八卦星環） */
function MarisaDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (ring.current) ring.current.rotation.z += dt * 0.4 })
  return (
    <>
      <mesh position={[0, -2.0, 0]}><cylinderGeometry args={[h.x * 0.9, h.x * 0.3, 3.2, 10]} /><meshStandardMaterial color="#1e1b38" roughness={0.9} /></mesh>
      {[[-10, -1, -7, '#a855f7'], [10.5, 0, -8, '#38bdf8'], [-15, 2, -14, '#eab308'], [16, 1.5, -15, '#c084fc']].map(([x, y, z, col], i) => (
        <group key={i} position={[x as number, y as number, z as number]}>
          <mesh position={[0, -2, 0]}><cylinderGeometry args={[0.6, 0.9, 5, 10]} /><meshStandardMaterial color="#fef3c7" /></mesh>
          <mesh position={[0, 1, 0]}><sphereGeometry args={[2.3, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshStandardMaterial color={col as string} emissive={col as string} emissiveIntensity={0.35} /></mesh>
        </group>
      ))}
      <mesh ref={ring} position={[0, 5.5, -14]}>
        <ringGeometry args={[5.5, 6.0, 8]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

/** 3. 方塊使主場：俄羅斯矩陣（霓虹疊塊高塔） */
function TetroDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const cols = ['#00f0f0', '#f0f000', '#b84dff', '#00e850', '#ff3040', '#3080ff', '#ff9000']
  return (
    <>
      <mesh position={[0, -2.2, 0]}><boxGeometry args={[h.x * 1.8, 3.0, h.z * 1.4]} /><meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.3} /></mesh>
      {[-12, -8, 8, 12].map((bx, i) => (
        <group key={i} position={[bx, -2, -10 - (i % 2) * 4]}>
          {[0, 1, 2, 3, 4].map((row) => (
            <mesh key={row} position={[(row % 2) * 1.1, row * 1.25, 0]}>
              <boxGeometry args={[1.1, 1.1, 1.1]} />
              <meshStandardMaterial color={cols[(i + row) % cols.length]} emissive={cols[(i + row) % cols.length]} emissiveIntensity={0.45} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

/** 4. 吃豆人主場：霓虹迷宮（背景潛行四色幽靈 ＋ 藍光迷宮拱門） */
function PacmanDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const ghosts = useRef<THREE.Group>(null)
  const gColors = ['#ef4444', '#f472b6', '#22d3ee', '#fb923c']
  useFrame(({ clock }) => {
    ghosts.current?.children.forEach((g, idx) => {
      g.position.y = 4 + Math.sin(clock.elapsedTime * 2.5 + idx) * 0.7
      g.position.x = -9 + idx * 6 + Math.sin(clock.elapsedTime * 0.7 + idx) * 2
    })
  })
  return (
    <>
      <mesh position={[0, -1.8, 0]}><boxGeometry args={[h.x * 1.75, 2.4, h.z * 1.3]} /><meshStandardMaterial color="#0f1c3f" /></mesh>
      <mesh position={[0, -1.8, h.z * 0.7]}><boxGeometry args={[h.x * 1.85, 0.25, 0.2]} /><meshBasicMaterial color="#3b82f6" /></mesh>
      <group ref={ghosts}>
        {gColors.map((col, i) => (
          <group key={i} position={[-9 + i * 6, 4, -12]}>
            <mesh><sphereGeometry args={[1.1, 14, 14]} /><meshBasicMaterial color={col} /></mesh>
            <mesh position={[0, -0.5, 0]}><cylinderGeometry args={[1.1, 1.1, 1.0, 14]} /><meshBasicMaterial color={col} /></mesh>
            <mesh position={[-0.38, 0.25, 0.98]}><sphereGeometry args={[0.25, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position={[0.38, 0.25, 0.98]}><sphereGeometry args={[0.25, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </group>
        ))}
      </group>
    </>
  )
}

/** 5. 水管工主場：蘑菇王國 1-1（綠色傳送水管 ＋ 旋轉金幣 ＋ 問號磚） */
function MarioDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const coins = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    coins.current?.children.forEach((c) => { c.rotation.y += dt * 3.2 })
  })
  return (
    <>
      <mesh position={[0, -2.2, 0]}><boxGeometry args={[h.x * 1.85, 3.0, h.z * 1.4]} /><meshStandardMaterial color="#7c2d12" roughness={0.85} /></mesh>
      {/* 雙側經典綠色水管 */}
      {[-7.8, 7.8].map((px, i) => (
        <group key={i} position={[px, -0.4, -3.6]}>
          <mesh><cylinderGeometry args={[0.9, 0.9, 3.6, 16]} /><meshStandardMaterial color="#16a34a" /></mesh>
          <mesh position={[0, 1.9, 0]}><cylinderGeometry args={[1.12, 1.12, 0.65, 16]} /><meshStandardMaterial color="#22c55e" /></mesh>
        </group>
      ))}
      <group ref={coins}>
        {[-6, -2, 2, 6].map((cx, i) => (
          <mesh key={i} position={[cx, 6.8, -8]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.16, 14]} />
            <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.45} />
          </mesh>
        ))}
      </group>
    </>
  )
}

/** 6. 太空侵略者主場：太空防線（空中遊走的像素艦隊 ＋ 紅飛碟） */
function InvaderDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const fleet = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (fleet.current) fleet.current.position.x = Math.sin(clock.elapsedTime * 0.9) * 5.5
  })
  return (
    <>
      <mesh position={[0, -1.8, 0]}><boxGeometry args={[h.x * 1.7, 2.4, h.z * 1.3]} /><meshStandardMaterial color="#0b2012" /></mesh>
      <group ref={fleet} position={[0, 7.5, -14]}>
        {[-8, -4, 0, 4, 8].map((ix, i) => (
          <group key={i} position={[ix, (i % 2) * 1.8, 0]}>
            <mesh><boxGeometry args={[1.6, 1.0, 0.5]} /><meshBasicMaterial color="#22c55e" /></mesh>
            <mesh position={[0, 0.7, 0]}><boxGeometry args={[0.9, 0.4, 0.5]} /><meshBasicMaterial color="#4ade80" /></mesh>
          </group>
        ))}
        <mesh position={[0, 3.6, 0]}><sphereGeometry args={[1.3, 12, 8]} /><meshBasicMaterial color="#ff3366" /></mesh>
      </group>
    </>
  )
}

/** 7. 炸彈人主場：爆風競技場（鋼磚棋盤座 ＋ 巨大炸彈裝飾） */
function BomberDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#334155" /></mesh>
      {[-11, 11].map((bx, i) => (
        <group key={i} position={[bx, 2.5, -9]}>
          <mesh><sphereGeometry args={[2.2, 16, 16]} /><meshStandardMaterial color="#0f172a" roughness={0.35} /></mesh>
          <mesh position={[0, 2.4, 0]}><sphereGeometry args={[0.55, 10, 10]} /><meshBasicMaterial color="#fb923c" /></mesh>
        </group>
      ))}
    </>
  )
}

/** 8. 貪食蛇主場：Nokia LCD 螢幕（巨型像素綠蛇盤繞 ＋ 大紅蘋果） */
function SnakeDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const segs = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    segs.current?.children.forEach((s, i) => {
      s.position.y = 4.5 + Math.sin(clock.elapsedTime * 2.2 - i * 0.6) * 1.2
    })
  })
  return (
    <>
      <mesh position={[0, -1.9, 0]}><boxGeometry args={[h.x * 1.8, 2.6, h.z * 1.3]} /><meshStandardMaterial color="#14301d" /></mesh>
      <group ref={segs} position={[0, 0, -14]}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} position={[-11 + i * 2.4, 4.5, 0]}>
            <boxGeometry args={[1.8, 1.8, 1.2]} />
            <meshStandardMaterial color={i === 9 ? '#86efac' : '#22c55e'} emissive="#15803d" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
      <SnakeApples />
    </>
  )
}

/** 立體紅蘋果（球體＋蘋果柄＋綠葉），貪食蛇場地的醒目目標物 */
function Apple({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[0.7, 20, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#991b1b" emissiveIntensity={0.45} roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh position={[0.22, 0.28, 0.5]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshBasicMaterial color="#fecaca" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.38, 8]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[0.24, 0.84, 0]} rotation={[0, 0, -0.7]} scale={[1, 0.45, 0.25]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#15803d" emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

function SnakeApples() {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    g.current?.children.forEach((c, i) => {
      c.position.y = [7.2, 5.0, 5.4][i] + Math.sin(clock.elapsedTime * 2 + i * 1.7) * 0.35
      c.rotation.y = clock.elapsedTime * 0.9 + i
    })
  })
  return (
    <group ref={g}>
      <Apple position={[0, 7.2, -6]} scale={1.5} />
      <Apple position={[-8.5, 5.0, -5]} scale={1.1} />
      <Apple position={[8.5, 5.4, -5]} scale={1.1} />
    </group>
  )
}

/** 9. 青蛙過河主場：湍流大河（移動玩具車流 ＋ 大蓮葉） */
function FroggerDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const cars = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    cars.current?.children.forEach((c, idx) => {
      const span = 28
      c.position.x = (((clock.elapsedTime * (idx % 2 === 0 ? 5 : -6) + idx * 8) % span) + span) % span - 14
    })
  })
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <group ref={cars} position={[0, -0.2, -5.5]}>
        {['#ef4444', '#facc15', '#38bdf8'].map((col, i) => (
          <mesh key={i} position={[0, 0, -i * 2.2]}>
            <boxGeometry args={[2.6, 1.1, 1.4]} />
            <meshStandardMaterial color={col} />
          </mesh>
        ))}
      </group>
      {[-12, 12].map((lx, i) => (
        <mesh key={i} position={[lx, -1.2, -10]} rotation={[0.1, 0, 0]}>
          <cylinderGeometry args={[2.8, 2.8, 0.3, 18]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      ))}
    </>
  )
}

/** 10. 大金剛主場：25m 鋼樑工地（藍油桶群 ＋ 桃紅鋼架背景） */
function KongDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.1, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#701a3c" /></mesh>
      {[-9.5, 9.5].map((x, i) => (
        <group key={i} position={[x, 0.5, -7]}>
          <mesh position={[0, 0, 0]}><cylinderGeometry args={[1.1, 1.1, 2.4, 14]} /><meshStandardMaterial color="#2563eb" /></mesh>
          <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[1.1, 1.1, 2.4, 14]} /><meshStandardMaterial color="#1d4ed8" /></mesh>
          <mesh position={[0, 4.0, 0]}><sphereGeometry args={[0.7, 10, 10]} /><meshBasicMaterial color="#fb923c" /></mesh>
        </group>
      ))}
      {/* 工地梯架 */}
      {[-4.5, 4.5].map((lx, i) => (
        <mesh key={i} position={[lx, 4.5, -12]}><boxGeometry args={[0.8, 12, 0.3]} /><meshBasicMaterial color="#38bdf8" transparent opacity={0.35} /></mesh>
      ))}
    </>
  )
}

/** 11. 打磚塊主場：雅達利球場（背景超大雙球拍互相對打的發光向量球） */
function PongDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const ball = useRef<THREE.Mesh>(null)
  const lp = useRef<THREE.Mesh>(null)
  const rp = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const bx = Math.sin(t * 2.1) * 10.5
    const by = 6.0 + Math.cos(t * 3.1) * 2.4
    if (ball.current) ball.current.position.set(bx, by, -14)
    if (lp.current) lp.current.position.y = by * 0.9
    if (rp.current) rp.current.position.y = by * 0.9
  })
  return (
    <>
      <mesh position={[0, -1.8, 0]}><boxGeometry args={[h.x * 1.85, 2.4, h.z * 1.3]} /><meshStandardMaterial color="#0f172a" /></mesh>
      <mesh ref={lp} position={[-12, 6, -14]}><boxGeometry args={[0.8, 4.4, 0.8]} /><meshBasicMaterial color="#f8fafc" /></mesh>
      <mesh ref={rp} position={[12, 6, -14]}><boxGeometry args={[0.8, 4.4, 0.8]} /><meshBasicMaterial color="#f8fafc" /></mesh>
      <mesh ref={ball} position={[0, 6, -14]}><boxGeometry args={[0.9, 0.9, 0.9]} /><meshBasicMaterial color="#38bdf8" /></mesh>
    </>
  )
}

/** 12. 隆主場：朱雀城道場（夕陽紅日 ＋ 天守閣層簷 ＋ 木燈籠） */
function RyuDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#451a03" /></mesh>
      <mesh position={[0, 7.5, -24]}><circleGeometry args={[6.2, 32]} /><meshBasicMaterial color="#dc2626" transparent opacity={0.45} /></mesh>
      <group position={[0, 1.5, -11]}>
        <mesh><boxGeometry args={[12, 5.5, 2.5]} /><meshStandardMaterial color="#27170e" /></mesh>
        <mesh position={[0, 3.6, 0]}><boxGeometry args={[15.5, 1.1, 3.2]} /><meshStandardMaterial color="#1f2937" /></mesh>
        <mesh position={[0, 5.2, 0]}><boxGeometry args={[11, 1.0, 2.6]} /><meshStandardMaterial color="#991b1b" /></mesh>
      </group>
    </>
  )
}

/** 13. 春麗主場：香港霓虹街市（懸掛紅燈籠 ＋ 閃亮霓虹招牌樓房） */
function ChunliDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const lanterns = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    lanterns.current?.children.forEach((l, i) => { l.rotation.z = Math.sin(clock.elapsedTime * 2 + i) * 0.12 })
  })
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <group ref={lanterns} position={[0, 7.5, -9]}>
        {[-7.5, -2.5, 2.5, 7.5].map((lx, i) => (
          <group key={i} position={[lx, 0, 0]}>
            <mesh><sphereGeometry args={[0.85, 12, 12]} /><meshBasicMaterial color="#ef4444" /></mesh>
            <mesh position={[0, -1.2, 0]}><boxGeometry args={[0.25, 0.8, 0.25]} /><meshBasicMaterial color="#fde047" /></mesh>
          </group>
        ))}
      </group>
      {[[-11, '#38bdf8'], [11, '#ec4899']].map(([x, col], i) => (
        <mesh key={i} position={[x as number, 3.5, -13]}>
          <boxGeometry args={[3.2, 7.5, 1.2]} />
          <meshStandardMaterial color="#0f172a" emissive={col as string} emissiveIntensity={0.45} />
        </mesh>
      ))}
    </>
  )
}

/** 14. 武藤遊戲主場：決鬥者王國擂台（懸浮巨型千年積木金字塔 ＋ 魔導法陣） */
function YugiDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const puzzle = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, dt) => {
    if (puzzle.current) {
      puzzle.current.rotation.y += dt * 0.7
      puzzle.current.position.y = 7.2 + Math.sin(clock.elapsedTime * 1.6) * 0.45
    }
  })
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#2e1065" /></mesh>
      <mesh ref={puzzle} position={[0, 7.2, -14]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[3.2, 4.4, 4]} />
        <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.5} metalness={0.6} roughness={0.25} />
      </mesh>
      {[-9, 9].map((cx, i) => (
        <mesh key={i} position={[cx, 3.5, -11]} rotation={[0, i === 0 ? 0.25 : -0.25, 0]}>
          <boxGeometry args={[2.6, 3.8, 0.2]} />
          <meshStandardMaterial color="#4c1d95" emissive="#a855f7" emissiveIntensity={0.45} />
        </mesh>
      ))}
    </>
  )
}

/** 15. 海馬瀨人主場：海馬巨蛋決鬥塔（巨型全息 KC 雙塔 ＋ 盤旋光環） */
function KaibaDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const halo = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (halo.current) halo.current.rotation.z -= dt * 0.5 })
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.8, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#0f172a" metalness={0.55} /></mesh>
      {[-12, 12].map((kx, i) => (
        <mesh key={i} position={[kx, 3.5, -15]}>
          <boxGeometry args={[3.0, 14, 2.4]} />
          <meshStandardMaterial color="#0c4a6e" emissive="#38bdf8" emissiveIntensity={0.45} />
        </mesh>
      ))}
      <mesh ref={halo} position={[0, 6.5, -16]}>
        <torusGeometry args={[5.4, 0.16, 12, 48]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.55} />
      </mesh>
    </>
  )
}

/** 16. Cut the Rope / Talking Tom & Ben / Crossy / Angry Birds / Minecraft / Shadowverse 裝飾 */
function OmnomDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#78350f" /></mesh>
      {[-8, 8].map((x, i) => (
        <group key={i} position={[x, 6.5, -10]}>
          <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.1, 0.1, 7, 6]} /><meshStandardMaterial color="#fde68a" /></mesh>
          <mesh><sphereGeometry args={[1.4, 14, 14]} /><meshStandardMaterial color={i === 0 ? '#f43f5e' : '#facc15'} /></mesh>
        </group>
      ))}
    </>
  )
}
function TomBenDecor({ stage, lab }: { stage: StageDef; lab?: boolean }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color={lab ? '#451a03' : '#334155'} /></mesh>
      {[-10, 10].map((x, i) => (
        <mesh key={i} position={[x, 3.2, -11]}>
          <cylinderGeometry args={[1.2, 1.4, 4.5, 12]} />
          <meshStandardMaterial color={lab ? (i === 0 ? '#22c55e' : '#a855f7') : '#ca8a04'} emissive={lab ? (i === 0 ? '#22c55e' : '#a855f7') : '#000000'} emissiveIntensity={0.45} />
        </mesh>
      ))}
    </>
  )
}
function CrossyDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.8, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
      {[-9, 0, 9].map((x, i) => (
        <mesh key={i} position={[x, 4.5 + (i % 2) * 2, -13]}>
          <boxGeometry args={[3.2, 1.8, 1.8]} />
          <meshStandardMaterial color={['#ef4444', '#facc15', '#3b82f6'][i]} />
        </mesh>
      ))}
    </>
  )
}
function RedDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.75, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#15803d" /></mesh>
      {[-10, 10].map((x, i) => (
        <group key={i} position={[x, 2.5, -11]}>
          <mesh><boxGeometry args={[2.6, 5.0, 2.2]} /><meshStandardMaterial color="#b45309" /></mesh>
          <mesh position={[0, 3.4, 0]}><sphereGeometry args={[1.1, 12, 12]} /><meshStandardMaterial color="#4ade80" /></mesh>
        </group>
      ))}
    </>
  )
}
function SteveDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  return (
    <>
      <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.8, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#78350f" /></mesh>
      {[-10, 10].map((x, i) => (
        <group key={i} position={[x, 2.0, -11]}>
          <mesh><boxGeometry args={[1.4, 5.2, 1.4]} /><meshStandardMaterial color="#78350f" /></mesh>
          <mesh position={[0, 3.4, 0]}><boxGeometry args={[3.8, 3.0, 3.8]} /><meshStandardMaterial color="#16a34a" /></mesh>
        </group>
      ))}
    </>
  )
}
function ArisaDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (ring.current) ring.current.rotation.z += dt * 0.45 })
  return (
    <>
      <mesh position={[0, -2.0, 0]}><cylinderGeometry args={[h.x * 0.9, h.x * 0.35, 3.0, 10]} /><meshStandardMaterial color="#064e3b" /></mesh>
      <mesh ref={ring} position={[0, 6.2, -14]}>
        <torusGeometry args={[5.2, 0.16, 12, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.55} />
      </mesh>
    </>
  )
}

function AnimeGameDecor({ stage }: { stage: StageDef }) {
  const h = stage.half
  const spin = useRef<THREE.Group>(null)
  const spin2 = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.z += dt * 0.45
    if (spin2.current) spin2.current.rotation.y += dt * 0.65
  })

  switch (stage.id) {
    case 'chihiro': // 鍛刀工坊：雙鍛造爐柱＋巨型紅黑妖刀剪影
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.85, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#271216" /></mesh>
          {[-7, 7].map((x, i) => (
            <group key={i} position={[x, 2.0, -11]}>
              <mesh><boxGeometry args={[2.4, 7.5, 2.0]} /><meshStandardMaterial color="#18181b" /></mesh>
              <mesh position={[0, -1.2, 1.1]}><boxGeometry args={[1.4, 1.8, 0.3]} /><meshBasicMaterial color="#ef4444" /></mesh>
            </group>
          ))}
          <group ref={spin} position={[0, 6.2, -14]}>
            <mesh rotation={[0, 0, -0.45]}><boxGeometry args={[11, 0.45, 0.3]} /><meshStandardMaterial color="#18181b" emissive="#ef4444" emissiveIntensity={0.45} /></mesh>
            <mesh rotation={[0, 0, 0.45]}><boxGeometry args={[11, 0.45, 0.3]} /><meshStandardMaterial color="#7f1d1d" emissive="#f87171" emissiveIntensity={0.45} /></mesh>
          </group>
        </>
      )
    case 'ichi': // 魔法荒野：斜插冰晶＋懸浮旋轉八面體魔石
      return (
        <>
          <mesh position={[0, -2.1, 0]}><cylinderGeometry args={[h.x * 0.9, h.x * 0.5, 3.0, 6]} /><meshStandardMaterial color="#0f172a" /></mesh>
          {[-9, -4.5, 4.5, 9].map((x, i) => (
            <mesh key={i} position={[x, 2.5 + (i % 2) * 1.5, -12]} rotation={[0.1, 0, (i - 1.5) * 0.18]}>
              <coneGeometry args={[1.4, 7.5, 5]} />
              <meshStandardMaterial color="#0c4a6e" emissive="#38bdf8" emissiveIntensity={0.4} transparent opacity={0.85} />
            </mesh>
          ))}
          <mesh ref={spin2} position={[0, 6.8, -14]}>
            <octahedronGeometry args={[2.8, 0]} />
            <meshStandardMaterial color="#38bdf8" emissive="#818cf8" emissiveIntensity={0.7} wireframe />
          </mesh>
        </>
      )
    case 'ruri': // 教室天台：校舍屋頂護欄＋水塔＋積雨雲
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.9, 2.8, h.z * 1.5]} /><meshStandardMaterial color="#334155" /></mesh>
          <mesh position={[7.5, 3.8, -11]}><cylinderGeometry args={[1.8, 1.8, 4.2, 12]} /><meshStandardMaterial color="#475569" /></mesh>
          <mesh position={[7.5, 6.2, -11]}><coneGeometry args={[2.0, 1.4, 12]} /><meshStandardMaterial color="#0f766e" /></mesh>
          {[-6, -2, 3].map((x, i) => (
            <mesh key={i} position={[x, 7.2 + (i % 2) * 0.9, -15]}>
              <sphereGeometry args={[2.1, 12, 10]} />
              <meshStandardMaterial color="#e2e8f0" emissive="#34d399" emissiveIntensity={0.2} />
            </mesh>
          ))}
        </>
      )
    case 'nona': // 魔法監察局：巨型交叉魔針與旋轉齒輪環
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.8, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#2e1065" /></mesh>
          <mesh position={[-7.5, 4.2, -12]} rotation={[0, 0, -0.32]}><cylinderGeometry args={[0.25, 0.08, 12, 8]} /><meshStandardMaterial color="#e2e8f0" emissive="#e879f9" emissiveIntensity={0.4} /></mesh>
          <mesh position={[7.5, 4.2, -12]} rotation={[0, 0, 0.32]}><cylinderGeometry args={[0.25, 0.08, 12, 8]} /><meshStandardMaterial color="#e2e8f0" emissive="#e879f9" emissiveIntensity={0.4} /></mesh>
          <group ref={spin} position={[0, 6.2, -15]}>
            <mesh><torusGeometry args={[4.4, 0.14, 10, 24]} /><meshBasicMaterial color="#f0abfc" transparent opacity={0.6} /></mesh>
            <mesh rotation={[0, 0, 0.78]}><boxGeometry args={[8.4, 0.12, 0.12]} /><meshBasicMaterial color="#e879f9" /></mesh>
          </group>
        </>
      )
    case 'gojo': // 涉谷地下鐵：拱形隧道穹頂＋無量空處虛式「茈」球體
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.9, 2.8, h.z * 1.5]} /><meshStandardMaterial color="#1e1b4b" /></mesh>
          {[-9, -3, 3, 9].map((x, i) => (
            <mesh key={i} position={[x, 3.0, -11]}>
              <cylinderGeometry args={[0.55, 0.55, 10, 10]} />
              <meshStandardMaterial color="#312e81" emissive="#818cf8" emissiveIntensity={0.25} />
            </mesh>
          ))}
          <group ref={spin} position={[0, 6.5, -14]}>
            <mesh><sphereGeometry args={[2.2, 20, 20]} /><meshBasicMaterial color="#a855f7" transparent opacity={0.65} /></mesh>
            <mesh><torusGeometry args={[3.4, 0.14, 12, 32]} /><meshBasicMaterial color="#38bdf8" /></mesh>
            <mesh rotation={[0.5, 0.4, 0]}><torusGeometry args={[4.2, 0.1, 12, 32]} /><meshBasicMaterial color="#f43f5e" /></mesh>
          </group>
        </>
      )
    case 'deku': // 雄英訓練場 γ：工業鋼桁架塔與煙囪管線
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.85, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
          {[-8.5, -2.5, 4.5, 9.5].map((x, i) => (
            <group key={i} position={[x, 1.5 + i * 0.9, -12 - (i % 2) * 2]}>
              <mesh><boxGeometry args={[2.8, 7 + i * 1.8, 2.4]} /><meshStandardMaterial color="#334155" /></mesh>
              <mesh position={[0, 2.5, 1.25]}><boxGeometry args={[1.8, 0.35, 0.2]} /><meshBasicMaterial color="#22c55e" /></mesh>
            </group>
          ))}
        </>
      )
    case 'yodaka': // 忍事暗夜屋簷：和風天守閣瓦頂＋巨大滿月
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.85, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[0, 7.2, -18]}><circleGeometry args={[4.6, 32]} /><meshBasicMaterial color="#e2e8f0" /></mesh>
          {[-7.5, 7.5].map((x, i) => (
            <group key={i} position={[x, 2.2, -11]}>
              <mesh><boxGeometry args={[3.8, 5.2, 2.2]} /><meshStandardMaterial color="#1e293b" /></mesh>
              <mesh position={[0, 3.3, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.4, 2.2, 4]} /><meshStandardMaterial color="#020617" /></mesh>
            </group>
          ))}
        </>
      )
    case 'saki': // 初星學園 LIVE：舞台燈光桁架＋雙巨型音響＋聚光燈柱
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.9, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#4c0519" /></mesh>
          {[-9, 9].map((x, i) => (
            <group key={i} position={[x, 3.2, -11]}>
              <mesh><boxGeometry args={[3.2, 7.0, 2.0]} /><meshStandardMaterial color="#1e1b4b" /></mesh>
              <mesh position={[0, 1.2, 1.05]}><torusGeometry args={[0.9, 0.18, 10, 24]} /><meshBasicMaterial color="#f43f5e" /></mesh>
              <mesh position={[0, -1.4, 1.05]}><torusGeometry args={[1.1, 0.18, 10, 24]} /><meshBasicMaterial color="#fde047" /></mesh>
            </group>
          ))}
          {[-4, 0, 4].map((x, i) => (
            <mesh key={i} position={[x, 6.5, -14]} rotation={[0, 0, (i - 1) * 0.25]}>
              <coneGeometry args={[2.2, 11, 12, 1, true]} />
              <meshBasicMaterial color={i === 1 ? '#fde047' : '#fb7185'} transparent opacity={0.18} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </>
      )
    case 'spe': // 東京競馬場：草地圍欄＋終點大拱門
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.95, 2.8, h.z * 1.5]} /><meshStandardMaterial color="#14532d" /></mesh>
          {[-9, -4.5, 0, 4.5, 9].map((x, i) => (
            <mesh key={i} position={[x, 0.4, -7.5]}><boxGeometry args={[0.3, 1.8, 0.3]} /><meshStandardMaterial color="#ffffff" /></mesh>
          ))}
          <mesh position={[0, 0.9, -7.5]}><boxGeometry args={[22, 0.25, 0.25]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 6.4, -13]}><torusGeometry args={[6.2, 0.35, 10, 32, Math.PI]} /><meshStandardMaterial color="#c084fc" emissive="#c084fc" emissiveIntensity={0.4} /></mesh>
        </>
      )
    case 'kaoruko': // 甜點街角：歐風咖啡遮雨棚與粉色花拱門
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.85, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#500724" /></mesh>
          {[-7, 7].map((x, i) => (
            <group key={i} position={[x, 3.2, -12]}>
              <mesh><boxGeometry args={[4.0, 6.5, 2.0]} /><meshStandardMaterial color="#831843" /></mesh>
              <mesh position={[0, 1.5, 1.4]} rotation={[0.45, 0, 0]}><boxGeometry args={[4.2, 0.3, 1.6]} /><meshStandardMaterial color="#fbcfe8" /></mesh>
            </group>
          ))}
          <mesh position={[0, 5.5, -14]}><torusGeometry args={[4.8, 0.45, 12, 24, Math.PI]} /><meshStandardMaterial color="#f9a8d4" /></mesh>
        </>
      )
    case 'stelle': // 星穹列車：流線型星海列車頭剪影＋金色行星環
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.9, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
          <mesh position={[-3, 3.2, -13]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[1.6, 10, 8, 16]} /><meshStandardMaterial color="#334155" emissive="#38bdf8" emissiveIntensity={0.25} /></mesh>
          <mesh position={[7, 7.2, -17]}><sphereGeometry args={[2.6, 20, 20]} /><meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.35} /></mesh>
          <mesh position={[7, 7.2, -17]} rotation={[1.1, 0.3, 0]}><torusGeometry args={[4.4, 0.16, 10, 32]} /><meshBasicMaterial color="#fde68a" /></mesh>
        </>
      )
    case 'lumine': // 風起地七天神像：巨型翡翠樹冠＋風元素共鳴環
      return (
        <>
          <mesh position={[0, -2.1, 0]}><cylinderGeometry args={[h.x * 0.92, h.x * 0.45, 3.0, 12]} /><meshStandardMaterial color="#134e4a" /></mesh>
          <mesh position={[0, 3.2, -14]}><cylinderGeometry args={[1.3, 2.1, 9.0, 10]} /><meshStandardMaterial color="#78350f" /></mesh>
          {[-3.2, 0, 3.2].map((x, i) => (
            <mesh key={i} position={[x, 8.2 + (i === 1 ? 1.2 : 0), -14]}>
              <sphereGeometry args={[3.4, 14, 12]} />
              <meshStandardMaterial color="#16a34a" emissive="#5eead4" emissiveIntensity={0.2} />
            </mesh>
          ))}
          <mesh ref={spin2} position={[0, 4.5, -11]}><torusGeometry args={[2.8, 0.12, 10, 32]} /><meshBasicMaterial color="#fde047" transparent opacity={0.7} /></mesh>
        </>
      )
    case 'miyabi': // 新艾利都空洞：懸浮六角形以太晶體陣列與裂隙球
      return (
        <>
          <mesh position={[0, -2.0, 0]}><cylinderGeometry args={[h.x * 0.9, h.x * 0.3, 3.0, 6]} /><meshStandardMaterial color="#0f172a" /></mesh>
          {[-8, -3.5, 3.5, 8].map((x, i) => (
            <mesh key={i} position={[x, 2.5 + i * 0.8, -11]} rotation={[0.2, 0.4, 0.2]}>
              <boxGeometry args={[1.8, 5.5, 1.8]} />
              <meshStandardMaterial color="#164e63" emissive="#22d3ee" emissiveIntensity={0.5} />
            </mesh>
          ))}
          <mesh ref={spin2} position={[0, 6.2, -14]}>
            <icosahedronGeometry args={[3.0, 0]} />
            <meshBasicMaterial color="#22d3ee" wireframe />
          </mesh>
        </>
      )
    case 'rover': // 瑝瓏今州城：雙側飛簷牌樓柱＋旋轉聲骸金色星環
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.9, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
          {[-8.5, 8.5].map((x, i) => (
            <group key={i} position={[x, 3.2, -12]}>
              <mesh><cylinderGeometry args={[0.6, 0.7, 7.5, 8]} /><meshStandardMaterial color="#334155" /></mesh>
              <mesh position={[0, 3.9, 0]}><boxGeometry args={[4.4, 0.6, 1.8]} /><meshStandardMaterial color="#ca8a04" /></mesh>
            </group>
          ))}
          <group ref={spin} position={[0, 6.4, -14]}>
            <mesh><torusGeometry args={[3.8, 0.14, 10, 32]} /><meshBasicMaterial color="#facc15" /></mesh>
            <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[5.4, 0.14, 0.14]} /><meshBasicMaterial color="#fde047" /></mesh>
          </group>
        </>
      )
    case 'rapi': // 地面奪回戰壕：鋼鐵碉堡與雙重砲塔剪影
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.9, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#27272a" /></mesh>
          {[-8, 8].map((x, i) => (
            <group key={i} position={[x, 2.4, -11]}>
              <mesh><boxGeometry args={[4.2, 5.2, 2.8]} /><meshStandardMaterial color="#3f3f46" /></mesh>
              <mesh position={[x > 0 ? -1.8 : 1.8, 1.4, 0]} rotation={[0, 0, x > 0 ? 0.35 : -0.35]}>
                <cylinderGeometry args={[0.28, 0.35, 3.8, 8]} />
                <meshStandardMaterial color="#18181b" emissive="#ef4444" emissiveIntensity={0.4} />
              </mesh>
            </group>
          ))}
        </>
      )
    case 'kotone': // 初星黃金街頭舞台：巨大五角星霓虹燈牌＋雙側聚光燈柱
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.9, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#422006" /></mesh>
          <group ref={spin} position={[0, 6.2, -14]}>
            <mesh><torusGeometry args={[3.8, 0.2, 10, 5]} /><meshBasicMaterial color="#facc15" /></mesh>
            <mesh><octahedronGeometry args={[1.4, 0]} /><meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={0.7} /></mesh>
          </group>
          {[-8.5, 8.5].map((x, i) => (
            <mesh key={i} position={[x, 3.5, -12]}><boxGeometry args={[1.8, 7.5, 1.8]} /><meshStandardMaterial color="#713f12" emissive="#facc15" emissiveIntensity={0.25} /></mesh>
          ))}
        </>
      )
    case 'hutao': // 往生堂無妄坡：朱紅燈籠柱＋幽冥鬼火環
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.85, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#271216" /></mesh>
          {[-7.5, 7.5].map((x, i) => (
            <group key={i} position={[x, 3.2, -11]}>
              <mesh><cylinderGeometry args={[0.35, 0.45, 7.5, 8]} /><meshStandardMaterial color="#18181b" /></mesh>
              <mesh position={[0, 2.6, 0.8]}><sphereGeometry args={[0.9, 12, 12]} /><meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={0.75} /></mesh>
            </group>
          ))}
          <mesh ref={spin2} position={[0, 6.5, -14]}>
            <torusGeometry args={[3.2, 0.14, 10, 24]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
          </mesh>
        </>
      )
    case 'akira': // 鄉間通學小路：校門磚柱與兩側盛開櫻花樹
    default:
      return (
        <>
          <mesh position={[0, -2.0, 0]}><boxGeometry args={[h.x * 1.85, 2.8, h.z * 1.4]} /><meshStandardMaterial color="#334155" /></mesh>
          {[-5.5, 5.5].map((x, i) => (
            <mesh key={i} position={[x, 2.4, -11]}><boxGeometry args={[1.6, 5.6, 1.6]} /><meshStandardMaterial color="#9f1239" /></mesh>
          ))}
          {[-9.5, 9.5].map((x, i) => (
            <group key={i} position={[x, 3.0, -13]}>
              <mesh position={[0, -1.2, 0]}><cylinderGeometry args={[0.5, 0.7, 4.5, 8]} /><meshStandardMaterial color="#78350f" /></mesh>
              <mesh position={[0, 2.2, 0]}><sphereGeometry args={[2.9, 12, 10]} /><meshStandardMaterial color="#f472b6" emissive="#fbcfe8" emissiveIntensity={0.25} /></mesh>
            </group>
          ))}
        </>
      )
  }
}

/** 各場地獨特風格、3D 紋理立體底座與遠景建築 */
export function StageDecor({ stage }: { stage: StageDef }) {
  const { theme } = stage
  return (
    <>
      {stage.id === 'reimu' ? <ReimuDecor stage={stage} />
        : stage.id === 'marisa' ? <MarisaDecor stage={stage} />
        : stage.id === 'tetro' ? <TetroDecor stage={stage} />
        : stage.id === 'pacman' ? <PacmanDecor stage={stage} />
        : stage.id === 'mario' ? <MarioDecor stage={stage} />
        : stage.id === 'invader' ? <InvaderDecor stage={stage} />
        : stage.id === 'bomber' ? <BomberDecor stage={stage} />
        : stage.id === 'snake' ? <SnakeDecor stage={stage} />
        : stage.id === 'frogger' ? <FroggerDecor stage={stage} />
        : stage.id === 'kong' ? <KongDecor stage={stage} />
        : stage.id === 'pong' ? <PongDecor stage={stage} />
        : stage.id === 'ryu' ? <RyuDecor stage={stage} />
        : stage.id === 'chunli' ? <ChunliDecor stage={stage} />
        : stage.id === 'yugi' ? <YugiDecor stage={stage} />
        : stage.id === 'kaiba' ? <KaibaDecor stage={stage} />
        : stage.id === 'omnom' ? <OmnomDecor stage={stage} />
        : stage.id === 'tom' ? <TomBenDecor stage={stage} />
        : stage.id === 'ben' ? <TomBenDecor stage={stage} lab />
        : stage.id === 'crossy' ? <CrossyDecor stage={stage} />
        : stage.id === 'red' ? <RedDecor stage={stage} />
        : stage.id === 'steve' ? <SteveDecor stage={stage} />
        : stage.id === 'arisa' ? <ArisaDecor stage={stage} />
        : <AnimeGameDecor stage={stage} />}
      <gridHelper args={[80, 40, theme.gridColor1, theme.gridColor2]} position={[0, -14, 0]} />
    </>
  )
}
