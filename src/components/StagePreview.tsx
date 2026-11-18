import { useId } from 'react'
import { resolveStage, type StageForm, type StageId } from '../game/stages'

/**
 * 每個對戰場地的專屬 16:9 預覽縮圖（含實際層板配置 ＋ 場地主題插畫）。
 */
export function StagePreview({ id, form = 'normal', className = '' }: { id: StageId | 'random'; form?: StageForm; className?: string }) {
  const uid = useId().replace(/:/g, '')
  if (id === 'random') {
    return (
      <svg viewBox="0 0 160 80" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`rbg-${uid}`} cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#090d16" />
          </radialGradient>
        </defs>
        <rect width="160" height="80" fill={`url(#rbg-${uid})`} />
        <rect x="26" y="62" width="108" height="8" rx="2" fill="#1e293b" stroke="#fde047" strokeWidth="1.2" opacity="0.5" />
        <text x="80" y="54" textAnchor="middle" fontSize="48" fontWeight="900" fontFamily="sans-serif" fill="#fde047" stroke="#000000" strokeWidth="2.5">
          ?
        </text>
      </svg>
    )
  }
  const st = resolveStage(id, form)
  const { theme } = st

  // 將世界座標 X (-12..12) / Y (-2..8) 映設到 160x80 SVG 畫布
  const toX = (wx: number) => 80 + wx * 5.2
  const toY = (wy: number) => 63 - wy * 6.5

  return (
    <svg viewBox="0 0 160 80" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.bg} />
          <stop offset="100%" stopColor={theme.surfaceColor} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <rect width="160" height="80" fill={`url(#sky-${uid})`} />

      {/* 場地專屬背景插畫 */}
      {id === 'reimu' && (
        <g opacity="0.85">
          <circle cx="80" cy="30" r="16" fill="#dc2626" opacity="0.25" />
          <rect x="60" y="20" width="4" height="42" fill="#dc2626" />
          <rect x="96" y="20" width="4" height="42" fill="#dc2626" />
          <rect x="52" y="20" width="56" height="4" rx="1" fill="#dc2626" />
          <rect x="56" y="28" width="48" height="3" fill="#b91c1c" />
          <circle cx="30" cy="18" r="2" fill="#fda4af" />
          <circle cx="130" cy="24" r="2" fill="#fda4af" />
          <circle cx="115" cy="14" r="1.5" fill="#fda4af" />
        </g>
      )}
      {id === 'marisa' && (
        <g opacity="0.85">
          <circle cx="80" cy="34" r="18" fill="none" stroke="#fde047" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.65" />
          <rect x="24" y="42" width="6" height="20" fill="#fef3c7" />
          <path d="M16,44 Q27,26 38,44 Z" fill="#a855f7" />
          <rect x="130" y="46" width="5" height="16" fill="#fef3c7" />
          <path d="M122,48 Q132,32 142,48 Z" fill="#38bdf8" />
          <circle cx="48" cy="16" r="1.5" fill="#fde047" />
          <circle cx="116" cy="18" r="1.5" fill="#fde047" />
        </g>
      )}
      {id === 'tetro' && (
        <g opacity="0.75">
          <rect x="18" y="34" width="8" height="28" fill="#00f0f0" opacity="0.45" />
          <rect x="26" y="46" width="8" height="16" fill="#f0f000" opacity="0.45" />
          <rect x="128" y="38" width="8" height="24" fill="#b84dff" opacity="0.45" />
          <rect x="136" y="48" width="8" height="14" fill="#ff9000" opacity="0.45" />
        </g>
      )}
      {id === 'pacman' && (
        <g opacity="0.9">
          <rect x="6" y="6" width="148" height="68" rx="6" fill="none" stroke="#2563eb" strokeWidth="2" opacity="0.6" />
          <circle cx="24" cy="24" r="5" fill="#ef4444" />
          <circle cx="136" cy="24" r="5" fill="#f472b6" />
          <circle cx="54" cy="18" r="2" fill="#fde047" />
          <circle cx="80" cy="18" r="2" fill="#fde047" />
          <circle cx="106" cy="18" r="2" fill="#fde047" />
        </g>
      )}
      {id === 'mario' && (
        <g opacity="0.9">
          <rect x="24" y="44" width="12" height="18" fill="#16a34a" />
          <rect x="22" y="42" width="16" height="4" fill="#22c55e" />
          <rect x="124" y="44" width="12" height="18" fill="#16a34a" />
          <rect x="122" y="42" width="16" height="4" fill="#22c55e" />
          <circle cx="62" cy="22" r="3" fill="#facc15" />
          <circle cx="98" cy="22" r="3" fill="#facc15" />
        </g>
      )}
      {id === 'invader' && (
        <g opacity="0.85">
          {[42, 68, 92, 118].map((x, i) => (
            <rect key={i} x={x - 5} y={18 + (i % 2) * 7} width="10" height="6" fill="#22c55e" />
          ))}
          <ellipse cx="80" cy="11" rx="9" ry="3.5" fill="#ff3366" />
        </g>
      )}
      {id === 'bomber' && (
        <g opacity="0.85">
          <circle cx="26" cy="46" r="8" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
          <circle cx="29" cy="36" r="2.5" fill="#fb923c" />
          <circle cx="134" cy="46" r="8" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
          <circle cx="137" cy="36" r="2.5" fill="#fb923c" />
        </g>
      )}
      {id === 'snake' && (
        <g opacity="0.85">
          <rect x="22" y="24" width="38" height="6" rx="2" fill="#22c55e" opacity="0.6" />
          <circle cx="80" cy="22" r="6" fill="#ef4444" />
          <rect x="79" y="14" width="2" height="4" fill="#4ade80" />
        </g>
      )}
      {id === 'frogger' && (
        <g opacity="0.85">
          <rect x="0" y="50" width="160" height="14" fill="#0369a1" opacity="0.45" />
          <ellipse cx="26" cy="56" rx="10" ry="3.5" fill="#22c55e" opacity="0.7" />
          <ellipse cx="134" cy="56" rx="10" ry="3.5" fill="#22c55e" opacity="0.7" />
        </g>
      )}
      {id === 'kong' && (
        <g opacity="0.85">
          <rect x="24" y="42" width="10" height="20" fill="#2563eb" />
          <rect x="126" y="42" width="10" height="20" fill="#2563eb" />
          <line x1="56" y1="22" x2="56" y2="62" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" opacity="0.7" />
          <line x1="104" y1="22" x2="104" y2="62" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" opacity="0.7" />
        </g>
      )}
      {id === 'pong' && (
        <g opacity="0.9">
          <line x1="80" y1="8" x2="80" y2="60" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
          <rect x="18" y="20" width="4" height="22" fill="#f8fafc" />
          <rect x="138" y="24" width="4" height="22" fill="#f8fafc" />
          <rect x="77" y="30" width="6" height="6" fill="#38bdf8" />
        </g>
      )}
      {id === 'ryu' && (
        <g opacity="0.85">
          <circle cx="80" cy="30" r="18" fill="#dc2626" opacity="0.45" />
          <polygon points="48,62 62,32 98,32 112,62" fill="#27170e" />
          <polygon points="54,36 80,22 106,36" fill="#1f2937" />
        </g>
      )}
      {id === 'chunli' && (
        <g opacity="0.85">
          <circle cx="44" cy="18" r="5" fill="#ef4444" />
          <circle cx="80" cy="16" r="5" fill="#ef4444" />
          <circle cx="116" cy="18" r="5" fill="#ef4444" />
          <rect x="18" y="26" width="12" height="26" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="130" y="26" width="12" height="26" fill="#0f172a" stroke="#ec4899" strokeWidth="1.5" />
        </g>
      )}
      {id === 'yugi' && (
        <g opacity="0.85">
          <polygon points="62,16 98,16 80,46" fill="#facc15" opacity="0.75" stroke="#854d0e" strokeWidth="1.5" />
          <rect x="22" y="28" width="14" height="20" rx="1" fill="#4c1d95" stroke="#a855f7" strokeWidth="1" />
          <rect x="124" y="28" width="14" height="20" rx="1" fill="#4c1d95" stroke="#a855f7" strokeWidth="1" />
        </g>
      )}
      {id === 'kaiba' && (
        <g opacity="0.85">
          <rect x="16" y="18" width="14" height="44" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
          <rect x="130" y="18" width="14" height="44" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="80" cy="34" r="17" fill="none" stroke="#67e8f9" strokeWidth="1.6" opacity="0.75" />
        </g>
      )}
      {id === 'omnom' && (
        <g opacity="0.9">
          <line x1="80" y1="0" x2="80" y2="28" stroke="#fde68a" strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="80" cy="30" r="8" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
        </g>
      )}
      {(id === 'tom' || id === 'ben') && (
        <g opacity="0.85">
          <rect x="20" y="34" width="16" height="28" rx="2" fill={id === 'ben' ? '#22c55e' : '#ca8a04'} />
          <rect x="124" y="34" width="16" height="28" rx="2" fill={id === 'ben' ? '#a855f7' : '#ca8a04'} />
        </g>
      )}
      {id === 'crossy' && (
        <g opacity="0.9">
          <rect x="22" y="22" width="18" height="10" fill="#ef4444" />
          <rect x="116" y="34" width="20" height="10" fill="#3b82f6" />
        </g>
      )}
      {id === 'red' && (
        <g opacity="0.85">
          <rect x="24" y="32" width="12" height="30" fill="#b45309" />
          <circle cx="30" cy="26" r="6" fill="#4ade80" />
          <rect x="124" y="32" width="12" height="30" fill="#b45309" />
          <circle cx="130" cy="26" r="6" fill="#4ade80" />
        </g>
      )}
      {id === 'steve' && (
        <g opacity="0.9">
          <rect x="24" y="42" width="8" height="20" fill="#78350f" />
          <rect x="16" y="26" width="24" height="18" fill="#16a34a" />
          <rect x="128" y="42" width="8" height="20" fill="#78350f" />
          <rect x="120" y="26" width="24" height="18" fill="#16a34a" />
        </g>
      )}
      {id === 'arisa' && (
        <g opacity="0.85">
          <circle cx="80" cy="34" r="18" fill="none" stroke="#34d399" strokeWidth="1.6" />
          <circle cx="52" cy="24" r="2.5" fill="#6ee7b7" />
          <circle cx="108" cy="24" r="2.5" fill="#6ee7b7" />
        </g>
      )}

      {/* 層板配置（依實際 stages.ts 幾何描繪） */}
      {st.platforms.map((p, i) => {
        const px = toX(p.x - p.w / 2)
        const py = toY(p.y)
        const pw = p.w * 5.2
        return (
          <g key={i}>
            <rect x={px} y={py} width={pw} height="3.5" rx="1.5" fill={p.edgeColor ?? theme.platEdgeColor} />
            {p.move && (
              <circle cx={toX(p.x)} cy={py - 3.5} r="1.8" fill="#fde047" />
            )}
          </g>
        )
      })}

      {/* 主舞台地面 */}
      <rect
        x={toX(-st.half.x)}
        y={63}
        width={st.half.x * 2 * 5.2}
        height="11"
        rx="2"
        fill={theme.mainColor}
        stroke={theme.edgeColor}
        strokeWidth="1.5"
      />
      <rect
        x={toX(-st.half.x)}
        y={63}
        width={st.half.x * 2 * 5.2}
        height="3"
        fill={theme.surfaceColor}
      />
    </svg>
  )
}
