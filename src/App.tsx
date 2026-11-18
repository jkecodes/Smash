import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useGameStore } from './game/store'
import { DebugHitboxes, FxLayer, Projectiles, SmashBallView, Zones } from './components/Effects'
import { HUD } from './components/HUD'
import { Arena, CameraRig, Fighters, SimLoop } from './components/World'
import { GRAVITY } from './game/constants'
import './game/skills' // 註冊所有招式

export default function App() {
  const paused = useGameStore((s) => s.paused)
  return (
    <div className="relative h-full w-full bg-[#0b1020]">
      <Canvas camera={{ position: [0, 8, 24], fov: 45 }} shadows dpr={[1, 2]}>
        <color attach="background" args={['#0b1020']} />
        <fog attach="fog" args={['#0b1020', 40, 110]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 20, 14]} intensity={1.6} castShadow />
        <Physics gravity={[0, GRAVITY, 0]} timeStep="vary" paused={paused}>
          <Arena />
          <Fighters />
          <SimLoop />
        </Physics>
        <Projectiles />
        <Zones />
        <SmashBallView />
        <FxLayer />
        <DebugHitboxes />
        <CameraRig />
      </Canvas>
      <HUD />
    </div>
  )
}
