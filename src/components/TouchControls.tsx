import { useRef, useState } from 'react'
import { touchInput } from '../game/input'
import { useGameStore } from '../game/store'
import type { Btn } from '../game/types'

function ActionBtn({
  btn, label, sub, className,
}: {
  btn: Btn
  label: string
  sub?: string
  className: string
}) {
  const [down, setDown] = useState(false)
  const set = (v: boolean) => {
    touchInput.held[btn] = v
    setDown(v)
  }
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true)
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        set(false)
      }}
      onPointerCancel={() => set(false)}
      className={`touch-none select-none flex flex-col items-center justify-center rounded-full border-2 font-black shadow-lg backdrop-blur-sm transition-transform ${
        down ? 'scale-90 brightness-125' : 'active:scale-90'
      } ${className}`}
    >
      <span className="leading-none">{label}</span>
      {sub && <span className="mt-0.5 text-[9px] font-bold opacity-80 leading-none">{sub}</span>}
    </button>
  )
}

export function TouchControls() {
  const setPaused = useGameStore((s) => s.setPaused)
  const ultReady = useGameStore((s) => s.ui.p1?.ultReady)
  const padRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const maxR = rect.width * 0.42
    const dx = clientX - cx
    const dy = clientY - cy
    const dist = Math.hypot(dx, dy)
    const clamped = Math.min(dist, maxR)
    const angle = Math.atan2(dy, dx)
    const nx = dist > 6 ? (Math.cos(angle) * clamped) / maxR : 0
    const ny = dist > 6 ? (Math.sin(angle) * clamped) / maxR : 0
    setKnob({ x: nx * maxR, y: ny * maxR })
    touchInput.moveX = Math.abs(nx) < 0.16 ? 0 : nx
    touchInput.moveY = Math.abs(ny) < 0.2 ? 0 : -ny // 向上推為正、向下推為負
  }

  const resetStick = () => {
    setKnob({ x: 0, y: 0 })
    touchInput.moveX = 0
    touchInput.moveY = 0
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none touch-none">
      {/* 左上角暫停鈕 */}
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); setPaused(true) }}
        className="pointer-events-auto absolute top-3 left-3 rounded-full bg-black/60 border border-white/25 px-3 py-1.5 text-xs font-black text-white shadow backdrop-blur"
      >
        ⏸ 暫停
      </button>

      {/* 左下角：虛擬類比搖桿 */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          updateStick(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0 && e.pointerType === 'mouse') return
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
          e.preventDefault()
          updateStick(e.clientX, e.clientY)
        }}
        onPointerUp={(e) => { e.preventDefault(); resetStick() }}
        onPointerCancel={resetStick}
        className="pointer-events-auto absolute bottom-5 left-5 h-32 w-32 rounded-full border-2 border-white/30 bg-black/40 backdrop-blur-sm flex items-center justify-center touch-none"
      >
        <div className="pointer-events-none h-14 w-14 rounded-full border border-white/15" />
        <div
          className="pointer-events-none absolute h-12 w-12 rounded-full bg-white/80 border-2 border-yellow-300 shadow-xl"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* 右下角：大亂鬥風格觸控按鍵區 */}
      <div className="pointer-events-auto absolute bottom-4 right-4 h-44 w-48 touch-none">
        <ActionBtn
          btn="ult"
          label="大招"
          sub="I"
          className={`absolute top-0 left-6 h-12 w-12 text-xs ${
            ultReady
              ? 'border-yellow-300 bg-purple-600/90 text-yellow-200 animate-pulse ring-2 ring-yellow-300'
              : 'border-purple-300/40 bg-purple-900/60 text-purple-200/80'
          }`}
        />
        <ActionBtn
          btn="shield"
          label="防禦"
          sub="閃避"
          className="absolute top-1 right-1 h-12 w-12 text-xs border-emerald-300/60 bg-emerald-700/75 text-white"
        />
        <ActionBtn
          btn="jump"
          label="跳躍"
          className="absolute top-12 left-0 h-14 w-14 text-sm border-cyan-300/70 bg-slate-800/80 text-cyan-100"
        />
        <ActionBtn
          btn="skill2"
          label="技2"
          sub="L"
          className="absolute top-13 right-0 h-13 w-13 h-[3.25rem] w-[3.25rem] text-xs border-blue-300/70 bg-blue-700/80 text-white"
        />
        <ActionBtn
          btn="attack"
          label="普攻"
          sub="J"
          className="absolute bottom-0 left-10 h-16 w-16 text-base border-red-300 bg-red-600/85 text-white"
        />
        <ActionBtn
          btn="skill1"
          label="特招"
          sub="K"
          className="absolute bottom-2 right-2 h-14 w-14 text-sm border-yellow-300 bg-amber-600/85 text-white"
        />
      </div>
    </div>
  )
}
