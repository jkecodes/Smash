import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useGameStore } from './game/store'
import { STAGES } from './game/stages'
import { DebugHitboxes, FxLayer, Projectiles, SmashBallView, Summons, Zones } from './components/Effects'
import { HUD } from './components/HUD'
import { Arena, CameraRig, Fighters, SimLoop } from './components/World'
import { GRAVITY } from './game/constants'
import './game/skills' // 註冊所有招式

export default function App() {
  const paused = useGameStore((s) => s.paused)
  const ultCutin = useGameStore((s) => s.ultCutin)
  const stageId = useGameStore((s) => s.stageId)
  const stage = (STAGES[stageId] ?? STAGES.reimu)!
  const theme = stage.theme

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: theme.bg }}>
      <Canvas camera={{ position: [0, 8, 24], fov: 45 }} shadows dpr={[1, 2]}>
        <color attach="background" args={[theme.bg]} />
        <fog attach="fog" args={[theme.fog, 35, 110]} />
        <ambientLight color={theme.ambientColor} intensity={theme.ambientIntensity} />
        <directionalLight
          position={theme.dirLightPos}
          color={theme.dirLightColor}
          intensity={theme.dirLightIntensity}
          castShadow
        />
        <Physics gravity={[0, GRAVITY, 0]} timeStep="vary" paused={paused || !!ultCutin}>
          <Arena />
          <Fighters />
          <SimLoop />
        </Physics>
        <Projectiles />
        <Zones />
        <Summons />
        <SmashBallView />
        <FxLayer />
        <DebugHitboxes />
        <CameraRig />
      </Canvas>
      <HUD />
    </div>
  )
}
