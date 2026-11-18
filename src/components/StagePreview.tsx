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
      {id === 'chihiro' && (
        <g opacity="0.85">
          <line x1="58" y1="16" x2="102" y2="52" stroke="#ef4444" strokeWidth="2.4" />
          <line x1="102" y1="16" x2="58" y2="52" stroke="#f87171" strokeWidth="2.4" />
          <rect x="26" y="34" width="10" height="28" fill="#18181b" stroke="#ef4444" strokeWidth="0.9" />
          <rect x="124" y="34" width="10" height="28" fill="#18181b" stroke="#ef4444" strokeWidth="0.9" />
        </g>
      )}
      {id === 'ichi' && (
        <g opacity="0.85">
          <polygon points="80,14 94,32 80,50 66,32" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
          <polygon points="24,62 32,26 40,62" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="120,62 128,26 136,62" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
        </g>
      )}
      {id === 'ruri' && (
        <g opacity="0.85">
          <rect x="114" y="30" width="16" height="22" rx="2" fill="#475569" stroke="#34d399" strokeWidth="1" />
          <circle cx="52" cy="24" r="9" fill="#e2e8f0" opacity="0.7" />
          <circle cx="64" cy="22" r="11" fill="#e2e8f0" opacity="0.75" />
          <circle cx="76" cy="25" r="8" fill="#e2e8f0" opacity="0.65" />
        </g>
      )}
      {id === 'nona' && (
        <g opacity="0.85">
          <line x1="34" y1="12" x2="54" y2="62" stroke="#e879f9" strokeWidth="1.4" />
          <line x1="126" y1="12" x2="106" y2="62" stroke="#e879f9" strokeWidth="1.4" />
          <circle cx="80" cy="34" r="15" fill="none" stroke="#f0abfc" strokeWidth="1.4" strokeDasharray="4 3" />
        </g>
      )}
      {id === 'gojo' && (
        <g opacity="0.88">
          <circle cx="80" cy="34" r="12" fill="#a855f7" opacity="0.45" />
          <circle cx="80" cy="34" r="17" fill="none" stroke="#38bdf8" strokeWidth="1.3" />
          <rect x="26" y="20" width="6" height="42" fill="#312e81" />
          <rect x="128" y="20" width="6" height="42" fill="#312e81" />
        </g>
      )}
      {id === 'deku' && (
        <g opacity="0.85">
          <rect x="22" y="32" width="14" height="30" fill="#334155" stroke="#22c55e" strokeWidth="0.9" />
          <rect x="52" y="22" width="16" height="40" fill="#334155" stroke="#22c55e" strokeWidth="0.9" />
          <rect x="114" y="16" width="18" height="46" fill="#334155" stroke="#4ade80" strokeWidth="0.9" />
        </g>
      )}
      {id === 'yodaka' && (
        <g opacity="0.88">
          <circle cx="80" cy="28" r="14" fill="#e2e8f0" opacity="0.75" />
          <polygon points="18,38 34,24 50,38" fill="#020617" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="110,38 126,24 142,38" fill="#020617" stroke="#38bdf8" strokeWidth="1" />
        </g>
      )}
      {id === 'saki' && (
        <g opacity="0.85">
          <polygon points="56,14 40,62 72,62" fill="#fb7185" opacity="0.22" />
          <polygon points="80,14 64,62 96,62" fill="#fde047" opacity="0.22" />
          <polygon points="104,14 88,62 120,62" fill="#fb7185" opacity="0.22" />
          <rect x="20" y="28" width="14" height="34" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="1" />
          <rect x="126" y="28" width="14" height="34" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="1" />
        </g>
      )}
      {id === 'spe' && (
        <g opacity="0.85">
          <path d="M 38 62 A 42 36 0 0 1 122 62" fill="none" stroke="#c084fc" strokeWidth="2.4" />
          <line x1="16" y1="54" x2="144" y2="54" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
        </g>
      )}
      {id === 'kaoruko' && (
        <g opacity="0.85">
          <path d="M 48 62 A 32 28 0 0 1 112 62" fill="none" stroke="#f9a8d4" strokeWidth="3" />
          <rect x="22" y="34" width="18" height="28" fill="#831843" stroke="#fbcfe8" strokeWidth="1" />
          <rect x="120" y="34" width="18" height="28" fill="#831843" stroke="#fbcfe8" strokeWidth="1" />
        </g>
      )}
      {id === 'stelle' && (
        <g opacity="0.88">
          <circle cx="114" cy="24" r="10" fill="#facc15" opacity="0.75" />
          <ellipse cx="114" cy="24" rx="19" ry="5" fill="none" stroke="#fde68a" strokeWidth="1.2" transform="rotate(-18 114 24)" />
          <rect x="30" y="38" width="54" height="12" rx="6" fill="#334155" stroke="#38bdf8" strokeWidth="1.1" />
        </g>
      )}
      {id === 'lumine' && (
        <g opacity="0.85">
          <rect x="76" y="34" width="8" height="28" fill="#78350f" />
          <circle cx="80" cy="26" r="15" fill="#16a34a" opacity="0.8" />
          <circle cx="66" cy="30" r="10" fill="#16a34a" opacity="0.75" />
          <circle cx="94" cy="30" r="10" fill="#16a34a" opacity="0.75" />
          <circle cx="80" cy="40" r="9" fill="none" stroke="#fde047" strokeWidth="1.2" />
        </g>
      )}
      {id === 'miyabi' && (
        <g opacity="0.88">
          <polygon points="80,16 96,26 96,44 80,54 64,44 64,26" fill="none" stroke="#22d3ee" strokeWidth="1.6" />
          <rect x="24" y="30" width="9" height="24" transform="rotate(14 28 42)" fill="#164e63" stroke="#22d3ee" strokeWidth="1" />
          <rect x="126" y="28" width="9" height="24" transform="rotate(-14 130 40)" fill="#164e63" stroke="#f43f5e" strokeWidth="1" />
        </g>
      )}
      {id === 'rover' && (
        <g opacity="0.85">
          <circle cx="80" cy="32" r="15" fill="none" stroke="#facc15" strokeWidth="1.5" />
          <line x1="65" y1="32" x2="95" y2="32" stroke="#fde047" strokeWidth="1.2" />
          <rect x="22" y="28" width="6" height="34" fill="#334155" />
          <rect x="16" y="25" width="18" height="5" fill="#ca8a04" />
          <rect x="132" y="28" width="6" height="34" fill="#334155" />
          <rect x="126" y="25" width="18" height="5" fill="#ca8a04" />
        </g>
      )}
      {id === 'rapi' && (
        <g opacity="0.85">
          <rect x="20" y="34" width="22" height="28" fill="#3f3f46" stroke="#ef4444" strokeWidth="1" />
          <line x1="42" y1="42" x2="58" y2="36" stroke="#ef4444" strokeWidth="2.4" />
          <rect x="118" y="34" width="22" height="28" fill="#3f3f46" stroke="#ef4444" strokeWidth="1" />
          <line x1="118" y1="42" x2="102" y2="36" stroke="#ef4444" strokeWidth="2.4" />
        </g>
      )}
      {id === 'akira' && (
        <g opacity="0.88">
          <rect x="44" y="34" width="8" height="28" fill="#9f1239" />
          <rect x="108" y="34" width="8" height="28" fill="#9f1239" />
          <circle cx="28" cy="32" r="12" fill="#f472b6" opacity="0.8" />
          <circle cx="132" cy="32" r="12" fill="#f472b6" opacity="0.8" />
        </g>
      )}
      {id === 'kotone' && (
        <g opacity="0.88">
          <polygon points="80,14 86,28 100,28 89,37 93,51 80,42 67,51 71,37 60,28 74,28" fill="none" stroke="#facc15" strokeWidth="1.8" />
          <rect x="22" y="28" width="12" height="34" fill="#713f12" stroke="#facc15" strokeWidth="1" />
          <rect x="126" y="28" width="12" height="34" fill="#713f12" stroke="#facc15" strokeWidth="1" />
        </g>
      )}
      {id === 'hutao' && (
        <g opacity="0.88">
          <circle cx="32" cy="28" r="7" fill="#ef4444" opacity="0.85" />
          <circle cx="128" cy="28" r="7" fill="#ef4444" opacity="0.85" />
          <circle cx="80" cy="34" r="14" fill="none" stroke="#f97316" strokeWidth="1.5" />
          <rect x="29" y="35" width="6" height="27" fill="#18181b" />
          <rect x="125" y="35" width="6" height="27" fill="#18181b" />
        </g>
      )}
      {id === 'seija' && (
        <g opacity="0.88">
          <circle cx="80" cy="24" r="14" fill="#be123c" opacity="0.55" />
          <polygon points="36,12 124,12 106,36 54,36" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.2" />
          <polygon points="48,36 112,36 96,54 64,54" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
        </g>
      )}
      {id === 'youmu' && (
        <g opacity="0.88">
          <circle cx="122" cy="20" r="11" fill="#d1fae5" opacity="0.7" />
          <path d="M28,63 L34,34 L18,22 M34,34 L50,24" stroke="#78350f" strokeWidth="3.5" fill="none" />
          <circle cx="32" cy="22" r="16" fill="#f9a8d4" opacity="0.6" />
          <circle cx="48" cy="26" r="12" fill="#fbcfe8" opacity="0.5" />
          <rect x="120" y="42" width="8" height="20" fill="#334155" />
        </g>
      )}
      {id === 'luigi' && (
        <g opacity="0.9">
          <path d="M122,12 A10,10 0 1,0 132,26 A8,8 0 1,1 122,12 Z" fill="#fef08a" opacity="0.8" />
          <rect x="20" y="20" width="12" height="43" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
          <rect x="128" y="20" width="12" height="43" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
          <circle cx="52" cy="28" r="6" fill="#e9d5ff" opacity="0.6" />
          <circle cx="104" cy="34" r="5" fill="#4ade80" opacity="0.6" />
        </g>
      )}
      {id === 'blinky' && (
        <g opacity="0.9">
          <rect x="24" y="16" width="112" height="38" rx="4" fill="none" stroke="#2563eb" strokeWidth="2.5" />
          <line x1="62" y1="16" x2="98" y2="16" stroke="#f472b6" strokeWidth="3" />
          <circle cx="44" cy="34" r="4" fill="#ef4444" />
          <circle cx="80" cy="34" r="3" fill="#fde047" />
          <circle cx="116" cy="34" r="4" fill="#38bdf8" />
        </g>
      )}
      {id === 'diddy' && (
        <g opacity="0.88">
          <path d="M10,50 Q80,34 150,50" fill="none" stroke="#92400e" strokeWidth="3" />
          <line x1="36" y1="44" x2="36" y2="63" stroke="#78350f" strokeWidth="3" />
          <line x1="80" y1="42" x2="80" y2="63" stroke="#78350f" strokeWidth="3" />
          <line x1="124" y1="44" x2="124" y2="63" stroke="#78350f" strokeWidth="3" />
          <circle cx="24" cy="22" r="12" fill="#15803d" opacity="0.7" />
          <circle cx="136" cy="22" r="12" fill="#166534" opacity="0.7" />
        </g>
      )}
      {id === 'creeper' && (
        <g opacity="0.9">
          <rect x="24" y="18" width="12" height="45" fill="#78350f" />
          <rect x="124" y="18" width="12" height="45" fill="#78350f" />
          <rect x="20" y="14" width="120" height="8" fill="#92400e" />
          <rect x="52" y="26" width="14" height="14" fill="#334155" stroke="#22c55e" strokeWidth="1.5" />
          <rect x="94" y="28" width="14" height="14" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="36" cy="28" r="4" fill="#facc15" />
          <circle cx="124" cy="28" r="4" fill="#facc15" />
        </g>
      )}
      {id === 'chuck' && (
        <g opacity="0.9">
          <rect x="26" y="28" width="22" height="35" fill="#92400e" stroke="#facc15" strokeWidth="1.2" />
          <rect x="112" y="24" width="22" height="39" fill="#92400e" stroke="#facc15" strokeWidth="1.2" />
          <polygon points="24,28 37,16 50,28" fill="#b45309" />
          <polygon points="110,24 123,12 136,24" fill="#b45309" />
          <circle cx="80" cy="24" r="6" fill="#4ade80" opacity="0.8" />
        </g>
      )}
      {id === 'suzuka' && (
        <g opacity="0.9">
          <line x1="10" y1="54" x2="150" y2="54" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="10" y1="48" x2="150" y2="48" stroke="#22c55e" strokeWidth="1.5" />
          <rect x="30" y="14" width="8" height="40" fill="#334155" />
          <circle cx="34" cy="14" r="5" fill="#fde047" />
          <rect x="122" y="14" width="8" height="40" fill="#334155" />
          <circle cx="126" cy="14" r="5" fill="#fde047" />
        </g>
      )}
      {id === 'firefly' && (
        <g opacity="0.9">
          <circle cx="80" cy="30" r="16" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
          <circle cx="80" cy="30" r="9" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="20" y="24" width="12" height="39" fill="#1e293b" stroke="#f97316" strokeWidth="1" />
          <rect x="128" y="24" width="12" height="39" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
        </g>
      )}
      {id === 'ellen' && (
        <g opacity="0.9">
          <rect x="18" y="20" width="24" height="43" fill="#0f172a" stroke="#ef4444" strokeWidth="1.2" />
          <rect x="118" y="20" width="24" height="43" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          <path d="M52,63 A28,28 0 0,1 108,63" fill="none" stroke="#e2e8f0" strokeWidth="2" />
          <rect x="64" y="16" width="32" height="10" rx="2" fill="#ef4444" opacity="0.75" />
        </g>
      )}
      {id === 'jinhsi' && (
        <g opacity="0.9">
          <polygon points="12,63 42,20 72,63" fill="#1e293b" opacity="0.85" />
          <polygon points="88,63 118,22 148,63" fill="#1e293b" opacity="0.85" />
          <circle cx="80" cy="28" r="13" fill="none" stroke="#fde047" strokeWidth="1.8" />
          <circle cx="80" cy="28" r="6" fill="#fef08a" opacity="0.45" />
        </g>
      )}
      {id === 'anis' && (
        <g opacity="0.9">
          <polygon points="16,63 32,20 48,20 56,63" fill="#27272a" stroke="#f59e0b" strokeWidth="1.2" />
          <polygon points="104,63 112,20 128,20 144,63" fill="#27272a" stroke="#f59e0b" strokeWidth="1.2" />
          <path d="M56,36 A26,26 0 0,1 104,36" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeDasharray="4 3" />
        </g>
      )}
      {id === 'erika' && (
        <g opacity="0.9">
          <path d="M56,63 L56,24 A24,24 0 0,1 104,24 L104,63" fill="#1e1b4b" stroke="#facc15" strokeWidth="1.8" />
          <rect x="24" y="18" width="12" height="36" fill="#4338ca" stroke="#facc15" strokeWidth="1" />
          <rect x="124" y="18" width="12" height="36" fill="#4338ca" stroke="#facc15" strokeWidth="1" />
        </g>
      )}
      {id === 'vaus' && (
        <g opacity="0.92">
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={24 + i * 23} y={14} width="20" height="7" rx="1" fill={['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7'][i]} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={24 + i * 23} y={24} width="20" height="7" rx="1" fill={['#38bdf8', '#a855f7', '#ef4444', '#facc15', '#22c55e'][i]} />
          ))}
          <circle cx="92" cy="44" r="3" fill="#ffffff" />
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
