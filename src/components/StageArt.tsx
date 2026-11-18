import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { StageDef, StageId } from '../game/stages'

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

/** 為不同場地程序化繪製主地面頂面紋理（512x256） */
export function useStageSurfaceTexture(stageId: StageId): THREE.CanvasTexture {
  const tex = useMemo(() => {
    return makeCanvasTex(512, 256, (g, w, h) => {
      if (stageId === 'battlefield') {
        g.fillStyle = '#2f3a60'
        g.fillRect(0, 0, w, h)
        // 金屬裝甲板分塊與科技網格
        g.strokeStyle = 'rgba(143, 192, 255, 0.25)'
        g.lineWidth = 2
        for (let x = 0; x <= w; x += 64) {
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke()
        }
        for (let y = 0; y <= h; y += 64) {
          g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke()
        }
        // 中央競技場發光徽章環
        g.strokeStyle = 'rgba(77, 148, 255, 0.65)'
        g.lineWidth = 4
        g.beginPath(); g.ellipse(w / 2, h / 2, 110, 72, 0, 0, Math.PI * 2); g.stroke()
        g.strokeStyle = 'rgba(255, 224, 102, 0.5)'
        g.lineWidth = 2
        g.beginPath(); g.ellipse(w / 2, h / 2, 76, 50, 0, 0, Math.PI * 2); g.stroke()
        // 左右端點能量帶
        g.fillStyle = 'rgba(255, 224, 102, 0.35)'
        g.fillRect(0, 0, 14, h)
        g.fillRect(w - 14, 0, 14, h)
      } else if (stageId === 'destination') {
        const grad = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6)
        grad.addColorStop(0, '#5a237c')
        grad.addColorStop(0.55, '#33154b')
        grad.addColorStop(1, '#1d0b2c')
        g.fillStyle = grad
        g.fillRect(0, 0, w, h)
        // 虛空能量脈絡
        g.strokeStyle = 'rgba(224, 102, 255, 0.32)'
        g.lineWidth = 2
        for (let i = 0; i < 8; i++) {
          const x = (i / 7) * w
          g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(x, i % 2 === 0 ? 0 : h); g.stroke()
        }
        // 中央宇宙羅盤星芒
        g.strokeStyle = 'rgba(255, 42, 133, 0.75)'
        g.lineWidth = 3
        g.beginPath()
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4
          const r = i % 2 === 0 ? 78 : 30
          const px = w / 2 + Math.cos(a) * r
          const py = h / 2 + Math.sin(a) * (r * 0.7)
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        }
        g.closePath()
        g.stroke()
        g.strokeStyle = 'rgba(255, 77, 148, 0.5)'
        g.strokeRect(6, 6, w - 12, h - 12)
      } else if (stageId === 'cyberpunk') {
        g.fillStyle = '#142630'
        g.fillRect(0, 0, w, h)
        // 賽博電路紋路
        g.strokeStyle = 'rgba(0, 255, 238, 0.28)'
        g.lineWidth = 2
        for (let i = 1; i < 6; i++) {
          const y = (h / 6) * i
          g.beginPath()
          g.moveTo(28, y)
          g.lineTo(w * 0.35, y)
          g.lineTo(w * 0.42, y + (i % 2 === 0 ? 12 : -12))
          g.lineTo(w - 28, y + (i % 2 === 0 ? 12 : -12))
          g.stroke()
        }
        // 兩側霓虹警戒斜紋
        const drawHazard = (x0: number) => {
          g.save()
          g.beginPath(); g.rect(x0, 0, 26, h); g.clip()
          g.fillStyle = '#0d1a20'; g.fillRect(x0, 0, 26, h)
          g.fillStyle = '#00ffee'
          for (let y = -32; y < h + 32; y += 24) {
            g.beginPath()
            g.moveTo(x0, y); g.lineTo(x0 + 26, y + 12)
            g.lineTo(x0 + 26, y + 22); g.lineTo(x0, y + 10)
            g.closePath(); g.fill()
          }
          g.restore()
        }
        drawHazard(0)
        drawHazard(w - 26)
        g.strokeStyle = 'rgba(255, 0, 170, 0.65)'
        g.lineWidth = 3
        g.strokeRect(28, 8, w - 56, h - 16)
      } else {
        // skyruins：大理石石磚與金色符文鑲邊
        g.fillStyle = '#4e463a'
        g.fillRect(0, 0, w, h)
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 8; col++) {
            const x = col * 64 + (row % 2 ? 32 : 0)
            const y = row * 64
            g.fillStyle = (row + col) % 2 === 0 ? 'rgba(255,245,220,0.06)' : 'rgba(0,0,0,0.12)'
            g.fillRect(x % w, y, 60, 60)
            g.strokeStyle = 'rgba(25, 20, 15, 0.45)'
            g.lineWidth = 2
            g.strokeRect(x % w, y, 64, 64)
          }
        }
        // 金色神殿符文內框與圓陣
        g.strokeStyle = 'rgba(255, 215, 106, 0.7)'
        g.lineWidth = 4
        g.strokeRect(10, 10, w - 20, h - 20)
        g.beginPath(); g.ellipse(w / 2, h / 2, 82, 56, 0, 0, Math.PI * 2); g.stroke()
        g.strokeStyle = 'rgba(255, 187, 51, 0.45)'
        g.lineWidth = 2
        g.beginPath(); g.ellipse(w / 2, h / 2, 62, 42, 0, 0, Math.PI * 2); g.stroke()
      }
    })
  }, [stageId])

  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

/** 各場地環境漂浮粒子 */
export function StageParticles({ stage }: { stage: StageDef }) {
  const count = 120
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
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += data.speeds[i] * dt
      arr[i * 3] += Math.sin(t * 0.8 + data.phases[i]) * 0.18 * dt
      if (arr[i * 3 + 1] > 18) {
        arr[i * 3 + 1] = -10
        arr[i * 3] = (Math.random() - 0.5) * 52
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
        size={0.18}
        vertexColors
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

function BattlefieldDecor({ stage }: { stage: StageDef }) {
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const islandsRef = useRef<THREE.Group>(null)
  const { theme } = stage

  useFrame(({ clock }, dt) => {
    if (ring1.current) ring1.current.rotation.z += dt * 0.65
    if (ring2.current) ring2.current.rotation.z -= dt * 0.45
    if (islandsRef.current) {
      islandsRef.current.children.forEach((child, idx) => {
        child.position.y += Math.sin(clock.elapsedTime * 1.1 + idx * 1.6) * 0.003
      })
    }
  })

  const islands: { pos: [number, number, number]; s: number; crystal: string }[] = [
    { pos: [-16, 4.5, -18], s: 1.3, crystal: '#4d94ff' },
    { pos: [17, 6.2, -22], s: 1.5, crystal: '#8fc0ff' },
    { pos: [-8, -2.5, -24], s: 1.1, crystal: '#4d94ff' },
    { pos: [10, 1.8, -16], s: 0.9, crystal: '#ffe066' },
  ]

  return (
    <>
      {/* 舞台下方多層倒六角要塞與能量反應爐 */}
      <mesh position={[0, -2.8, 0]}>
        <coneGeometry args={[4.4, 4.5, 6]} />
        <meshStandardMaterial color="#1d253f" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, -5.2, 0]}>
        <coneGeometry args={[2.2, 3.0, 6]} />
        <meshStandardMaterial color="#13192c" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, -2.1, 0]}>
        <sphereGeometry args={[1.05, 20, 20]} />
        <meshBasicMaterial color={theme.accentColor} />
      </mesh>
      <mesh ref={ring1} position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.5, 0.09, 14, 36]} />
        <meshBasicMaterial color={theme.accentColor} />
      </mesh>
      <mesh ref={ring2} position={[0, -3.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.07, 12, 6]} />
        <meshBasicMaterial color="#ffe066" />
      </mesh>

      {/* 遠景浮空晶石島嶼 */}
      <group ref={islandsRef}>
        {islands.map((isl, idx) => (
          <group key={idx} position={isl.pos} scale={isl.s}>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[2.2, 0.4, 2.2, 7]} />
              <meshStandardMaterial color="#232c4a" roughness={0.85} />
            </mesh>
            <mesh position={[0, 1.25, 0]}>
              <cylinderGeometry args={[2.3, 2.2, 0.3, 7]} />
              <meshStandardMaterial color="#374572" roughness={0.7} />
            </mesh>
            <mesh position={[0, 2.4, 0]}>
              <coneGeometry args={[0.45, 2.0, 5]} />
              <meshBasicMaterial color={isl.crystal} transparent opacity={0.85} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 左上星空軌道行星 */}
      <group position={[-18, 12, -32]} rotation={[0.35, 0.2, -0.25]}>
        <mesh>
          <sphereGeometry args={[4.2, 28, 28]} />
          <meshStandardMaterial color="#2e3f78" emissive="#121e44" roughness={0.7} />
        </mesh>
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[6.8, 0.24, 8, 48]} />
          <meshBasicMaterial color="#8fc0ff" transparent opacity={0.45} />
        </mesh>
      </group>
    </>
  )
}

function DestinationDecor() {
  const gyro1 = useRef<THREE.Mesh>(null)
  const gyro2 = useRef<THREE.Mesh>(null)
  const gyro3 = useRef<THREE.Mesh>(null)
  const portal = useRef<THREE.Group>(null)
  const shards = useRef<THREE.Group>(null)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (gyro1.current) gyro1.current.rotation.z += dt * 0.5
    if (gyro2.current) { gyro2.current.rotation.x += dt * 0.35; gyro2.current.rotation.y += dt * 0.45 }
    if (gyro3.current) { gyro3.current.rotation.y -= dt * 0.6; gyro3.current.rotation.z += dt * 0.2 }
    if (portal.current) portal.current.rotation.z -= dt * 0.28
    if (shards.current) {
      shards.current.children.forEach((c, i) => {
        c.position.y += Math.sin(t * 1.6 + i) * 0.004
        c.rotation.y += dt * 0.7
      })
    }
  })

  return (
    <>
      {/* 舞台下方黑曜石星核尖塔 */}
      <mesh position={[0, -3.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[3.4, 0]} />
        <meshStandardMaterial color="#28123b" roughness={0.25} metalness={0.8} />
      </mesh>
      <mesh position={[0, -6.2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[2.0, 4.5, 5]} />
        <meshStandardMaterial color="#1a0928" roughness={0.35} metalness={0.75} />
      </mesh>

      {/* 三重傾角宇宙陀螺光環 */}
      <mesh ref={gyro1} position={[0, -3.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7.8, 0.09, 14, 56]} />
        <meshBasicMaterial color="#ff2a85" />
      </mesh>
      <mesh ref={gyro2} position={[0, -3.4, 0]} rotation={[0.5, 0.3, 0]}>
        <torusGeometry args={[5.8, 0.07, 12, 48]} />
        <meshBasicMaterial color="#e066ff" transparent opacity={0.8} />
      </mesh>
      <mesh ref={gyro3} position={[0, -3.4, 0]} rotation={[-0.6, -0.4, 0.2]}>
        <torusGeometry args={[4.4, 0.06, 12, 40]} />
        <meshBasicMaterial color="#ff90c8" transparent opacity={0.75} />
      </mesh>

      {/* 四枚側翼懸浮晶簇 */}
      <group ref={shards}>
        {[[-9.5, -4.5, -1.5], [9.5, -4.5, -1.5], [-14, 1.5, -12], [14, 2.5, -12]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <octahedronGeometry args={[i < 2 ? 1.2 : 1.7, 0]} />
            <meshStandardMaterial color="#4b1a6e" emissive="#6d1e88" emissiveIntensity={0.45} roughness={0.2} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* 遠景巨型星雲蟲洞傳送門 */}
      <group ref={portal} position={[0, 6, -29]}>
        <mesh>
          <circleGeometry args={[5.5, 48]} />
          <meshBasicMaterial color="#ff2a85" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {[6.5, 8.8, 11.4].map((r, i) => (
          <mesh key={i} rotation={[0, 0, i * 0.7]}>
            <torusGeometry args={[r, 0.14 - i * 0.02, 12, 48]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#e066ff' : '#ff4d94'} transparent opacity={0.55 - i * 0.1} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[2.2, 24, 24]} />
          <meshBasicMaterial color="#ffe6f7" transparent opacity={0.45} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </>
  )
}

function CyberpunkDecor({ stage }: { stage: StageDef }) {
  const { half: h } = stage
  const beaconL = useRef<THREE.MeshBasicMaterial>(null)
  const beaconR = useRef<THREE.MeshBasicMaterial>(null)
  const sweepL = useRef<THREE.Mesh>(null)
  const sweepR = useRef<THREE.Mesh>(null)

  const winTex = useMemo(() => makeCanvasTex(128, 256, (g, w, h2) => {
    g.fillStyle = '#09131a'
    g.fillRect(0, 0, w, h2)
    for (let y = 10; y < h2 - 10; y += 16) {
      for (let x = 10; x < w - 10; x += 18) {
        if ((x * 7 + y * 13) % 5 !== 0) {
          g.fillStyle = (x + y) % 3 === 0 ? '#ff00aa' : '#00ffee'
          g.globalAlpha = 0.35 + ((x * y) % 5) * 0.12
          g.fillRect(x, y, 10, 8)
        }
      }
    }
    g.globalAlpha = 1
  }), [])

  const billboard1 = useMemo(() => makeCanvasTex(256, 128, (g, w, h2) => {
    g.fillStyle = '#0a1622'; g.fillRect(0, 0, w, h2)
    g.strokeStyle = '#00ffee'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h2 - 8)
    g.fillStyle = '#00ffee'; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('SMASH // 2099', w / 2, h2 / 2 - 14)
    g.fillStyle = '#ff00aa'; g.font = 'bold 20px sans-serif'
    g.fillText('NEON ARENA', w / 2, h2 / 2 + 24)
  }), [])

  const billboard2 = useMemo(() => makeCanvasTex(256, 128, (g, w, h2) => {
    g.fillStyle = '#1b0918'; g.fillRect(0, 0, w, h2)
    g.strokeStyle = '#ff00aa'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h2 - 8)
    g.fillStyle = '#ffe066'; g.font = 'bold 32px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText('CYBER ROOF', w / 2, h2 / 2 - 12)
    g.fillStyle = '#00ffee'; g.font = 'bold 18px monospace'
    g.fillText('>> LIVE <<', w / 2, h2 / 2 + 24)
  }), [])

  useEffect(() => () => {
    winTex.dispose(); billboard1.dispose(); billboard2.dispose()
  }, [winTex, billboard1, billboard2])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const blink = Math.floor(t * 2.5) % 2 === 0
    if (beaconL.current) beaconL.current.opacity = blink ? 1 : 0.25
    if (beaconR.current) beaconR.current.opacity = !blink ? 1 : 0.25
    if (sweepL.current) sweepL.current.rotation.z = -0.35 + Math.sin(t * 0.7) * 0.35
    if (sweepR.current) sweepR.current.rotation.z = 0.35 - Math.sin(t * 0.65) * 0.35
  })

  const buildings = [
    { x: -24, h: 20, w: 4.5, z: -20, col: '#00ffee' },
    { x: -19, h: 26, w: 3.8, z: -25, col: '#ff00aa' },
    { x: -14, h: 16, w: 4.2, z: -18, col: '#00ffee' },
    { x: -9.5, h: 23, w: 3.4, z: -27, col: '#ff00aa' },
    { x: -4.5, h: 18, w: 4.0, z: -23, col: '#00ffee' },
    { x: 0.5, h: 28, w: 4.5, z: -29, col: '#ff00aa' },
    { x: 5.5, h: 19, w: 3.6, z: -21, col: '#00ffee' },
    { x: 10.5, h: 25, w: 4.2, z: -26, col: '#ff00aa' },
    { x: 15.5, h: 17, w: 3.8, z: -18, col: '#00ffee' },
    { x: 20.5, h: 24, w: 4.4, z: -24, col: '#ff00aa' },
    { x: 25.5, h: 19, w: 4.0, z: -20, col: '#00ffee' },
  ]

  return (
    <>
      {/* 摩天樓主結構與發光橫向霓虹帶 */}
      <mesh position={[0, -8.5, 0]}>
        <boxGeometry args={[h.x * 1.82, 16, h.z * 1.82]} />
        <meshStandardMaterial color="#0b151c" roughness={0.75} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.6, h.z + 0.03]}>
        <boxGeometry args={[h.x * 1.92, 0.09, 0.06]} />
        <meshBasicMaterial color="#00ffee" />
      </mesh>
      <mesh position={[0, -1.0, h.z + 0.03]}>
        <boxGeometry args={[h.x * 1.72, 0.07, 0.06]} />
        <meshBasicMaterial color="#ff00aa" />
      </mesh>

      {/* 頂樓兩側信號天線 */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (h.x - 0.8), -0.2, -1.8]}>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.08, 0.14, 2.6, 8]} />
            <meshStandardMaterial color="#1a2e38" metalness={0.6} />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshBasicMaterial ref={s === -1 ? beaconL : beaconR} color={s === -1 ? '#00ffee' : '#ff00aa'} transparent />
          </mesh>
        </group>
      ))}

      {/* 遠景霓虹摩天大樓天際線 */}
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2 - 14, b.z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshStandardMaterial map={winTex} roughness={0.6} />
          </mesh>
          <mesh position={[0, b.h / 2 + 0.1, 0]}>
            <boxGeometry args={[b.w + 0.15, 0.2, b.w + 0.15]} />
            <meshBasicMaterial color={b.col} />
          </mesh>
        </group>
      ))}

      {/* 兩面大型全息廣告看板 */}
      <mesh position={[-12, 7.5, -17]} rotation={[0, 0.2, 0]}>
        <planeGeometry args={[6.4, 3.2]} />
        <meshBasicMaterial map={billboard1} transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[12.5, 6.2, -17.5]} rotation={[0, -0.2, 0]}>
        <planeGeometry args={[6.0, 3.0]} />
        <meshBasicMaterial map={billboard2} transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>

      {/* 城市底部掃射探照燈光束 */}
      <mesh ref={sweepL} position={[-13, -4, -15]}>
        <coneGeometry args={[3.5, 28, 16, 1, true]} />
        <meshBasicMaterial color="#00ffee" transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={sweepR} position={[13, -4, -15]}>
        <coneGeometry args={[3.5, 28, 16, 1, true]} />
        <meshBasicMaterial color="#ff00aa" transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

function SkyruinsDecor({ stage }: { stage: StageDef }) {
  const { half: h } = stage
  const runeRing = useRef<THREE.Mesh>(null)
  const sunHalo = useRef<THREE.Mesh>(null)
  const islands = useRef<THREE.Group>(null)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (runeRing.current) runeRing.current.rotation.z += dt * 0.25
    if (sunHalo.current) sunHalo.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.06)
    if (islands.current) {
      islands.current.children.forEach((ch, idx) => {
        ch.position.y += Math.sin(t * 0.9 + idx * 2) * 0.0025
      })
    }
  })

  return (
    <>
      {/* 階梯神殿底座與金色鑲邊 */}
      <mesh position={[0, -1.8, 0]}>
        <boxGeometry args={[h.x * 1.65, 2.4, h.z * 1.55]} />
        <meshStandardMaterial color="#302a22" roughness={0.85} />
      </mesh>
      <mesh position={[0, -3.8, 0]}>
        <boxGeometry args={[h.x * 1.15, 2.2, h.z * 1.25]} />
        <meshStandardMaterial color="#24201a" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.65, h.z + 0.02]}>
        <boxGeometry args={[h.x * 1.98, 0.1, 0.06]} />
        <meshBasicMaterial color="#ffd76a" />
      </mesh>
      <mesh ref={runeRing} position={[0, -4.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.2, 0.09, 12, 32]} />
        <meshBasicMaterial color="#ffd76a" />
      </mesh>

      {/* 中景四座古希臘風神殿石柱與火盆 */}
      {[[-9.8, -4.2], [9.8, -4.2], [-15.5, -10.5], [15.5, -10.5]].map(([px, pz], i) => (
        <group key={i} position={[px, i < 2 ? 1.5 : 3.0, pz]}>
          <mesh>
            <cylinderGeometry args={[0.68, 0.82, 6.8, 12]} />
            <meshStandardMaterial color="#4a4236" roughness={0.85} />
          </mesh>
          <mesh position={[0, 3.55, 0]}>
            <boxGeometry args={[1.85, 0.5, 1.85]} />
            <meshStandardMaterial color="#5c5243" roughness={0.75} />
          </mesh>
          {/* 火盆金光 */}
          <mesh position={[0, 4.15, 0]}>
            <sphereGeometry args={[0.5, 12, 12]} />
            <meshBasicMaterial color="#ffbb33" transparent opacity={0.85} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}

      {/* 遠景浮空聖島與發光瀑布 */}
      <group ref={islands}>
        {[[-18, 4, -22], [19, 6, -24], [-2, -1, -28]].map(([ix, iy, iz], idx) => (
          <group key={idx} position={[ix, iy, iz]}>
            <mesh>
              <cylinderGeometry args={[3.2, 0.6, 3.0, 8]} />
              <meshStandardMaterial color="#3c352c" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.65, 0]}>
              <cylinderGeometry args={[3.35, 3.2, 0.35, 8]} />
              <meshStandardMaterial color="#685b48" roughness={0.8} />
            </mesh>
            {/* 瀑布光柱 */}
            <mesh position={[0, -3.5, 1.8]}>
              <planeGeometry args={[0.9, 10]} />
              <meshBasicMaterial color="#ffe799" transparent opacity={0.3} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 右上金陽與光暈 */}
      <group position={[15, 12.5, -30]}>
        <mesh>
          <circleGeometry args={[3.4, 32]} />
          <meshBasicMaterial color="#fff1b8" />
        </mesh>
        <mesh ref={sunHalo}>
          <circleGeometry args={[5.8, 32]} />
          <meshBasicMaterial color="#ffbb33" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

/** 各場地獨特風格、3D 紋理立體底座與遠景建築 */
export function StageDecor({ stage }: { stage: StageDef }) {
  const { theme } = stage
  return (
    <>
      {stage.id === 'battlefield' && <BattlefieldDecor stage={stage} />}
      {stage.id === 'destination' && <DestinationDecor />}
      {stage.id === 'cyberpunk' && <CyberpunkDecor stage={stage} />}
      {stage.id === 'skyruins' && <SkyruinsDecor stage={stage} />}
      <gridHelper args={[80, 40, theme.gridColor1, theme.gridColor2]} position={[0, -14, 0]} />
    </>
  )
}
