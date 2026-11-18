import { useId } from 'react'
import type { CharacterId } from '../game/types'

export const SHORT_NAMES: Record<CharacterId, string> = {
  cube: 'CUBE',
  nova: 'NOVA',
  knight: 'KNIGHT',
  robot: 'ROBOT',
  alien: 'ALIEN',
  soldier: 'SOLDIER',
  zombie: 'ZOMBIE',
  tetro: 'TETRO',
}

export function CharacterPortrait({ id, className = '' }: { id: CharacterId | 'random'; className?: string }) {
  const uid = useId().replace(/:/g, '')

  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
      {id === 'cube' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#ff7369" />
              <stop offset="55%" stopColor="#d92b2b" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
            <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff6666" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 格鬥鬥氣閃電與爆發光線 */}
          <polygon points="60,60 15,0 38,0" fill="#ffe066" opacity="0.22" />
          <polygon points="60,60 105,0 82,0" fill="#ffe066" opacity="0.22" />
          <polygon points="60,60 120,30 120,52" fill="#ffffff" opacity="0.14" />
          <polygon points="60,60 0,32 0,55" fill="#ffffff" opacity="0.14" />
          {/* 立體格鬥方塊角色頭部 */}
          <polygon points="24,34 86,28 98,38 36,44" fill="#ff9e9e" />
          <polygon points="86,28 98,38 98,96 86,88" fill="#7f1d1d" />
          <rect x="24" y="34" width="62" height="58" rx="6" fill={`url(#body-${uid})`} stroke="#450a0a" strokeWidth="2.5" />
          {/* 白色武道頭帶與飄帶 */}
          <path d="M22,43 L88,43 L98,48 L98,57 L88,53 L22,53 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5" />
          <path d="M88,46 L112,35 L108,47 L116,54 L88,52 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
          {/* 銳利發光雙眼 */}
          <polygon points="34,62 50,65 48,71 33,69" fill="#ffffff" />
          <polygon points="78,62 62,65 64,71 79,69" fill="#ffffff" />
          <polygon points="39,64 46,66 45,69 38,68" fill="#ffe066" />
          <polygon points="73,64 66,66 67,69 74,68" fill="#ffe066" />
          {/* 火花 */}
          <circle cx="16" cy="78" r="3" fill="#ffe066" />
          <circle cx="104" cy="22" r="2.5" fill="#fffbeb" />
          <circle cx="18" cy="24" r="2" fill="#ffe066" />
        </>
      )}

      {id === 'nova' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#081226" />
            </radialGradient>
            <linearGradient id={`helm-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 星際斜斬光刃背景 */}
          <polygon points="-10,95 110,5 125,18 5,112" fill="#7dd3fc" opacity="0.28" />
          <polygon points="10,115 125,25 130,31 15,120" fill="#ffffff" opacity="0.55" />
          {/* 星點 */}
          <circle cx="20" cy="22" r="2" fill="#e0f2fe" />
          <circle cx="96" cy="28" r="2.5" fill="#bae6fd" />
          <circle cx="24" cy="84" r="1.8" fill="#7dd3fc" />
          {/* 頭盔冠飾與星刃面罩 */}
          <polygon points="60,12 72,34 48,34" fill="#f0f9ff" stroke="#0c4a6e" strokeWidth="2" />
          <path d="M26,48 Q60,18 94,48 L88,92 L60,104 L32,92 Z" fill={`url(#helm-${uid})`} stroke="#082f49" strokeWidth="2.5" />
          {/* V型發光護目鏡 */}
          <polygon points="28,52 60,64 92,52 84,72 60,80 36,72" fill="#082f49" />
          <polygon points="33,55 60,65 87,55 82,68 60,74 38,68" fill="#22d3ee" />
          <polygon points="36,57 56,64 42,67" fill="#ffffff" opacity="0.7" />
          {/* 光暈星芒 */}
          <path d="M96,20 L99,27 L106,30 L99,33 L96,40 L93,33 L86,30 L93,27 Z" fill="#ffffff" />
        </>
      )}

      {id === 'knight' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="68%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="55%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#09111e" />
            </radialGradient>
            <linearGradient id={`steel-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 背後大劍劍柄與盾徽輪廓 */}
          <polygon points="88,12 104,12 96,76" fill="#cbd5e1" opacity="0.45" />
          <rect x="82" y="18" width="28" height="6" rx="2" fill="#fbbf24" opacity="0.65" />
          {/* 緋紅羽飾 */}
          <path d="M52,22 Q32,4 20,18 Q36,24 46,34 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.8" />
          {/* 聖騎士銀色大頭盔 */}
          <path d="M30,38 Q60,18 90,38 L92,84 L60,104 L28,84 Z" fill={`url(#steel-${uid})`} stroke="#0f172a" strokeWidth="2.5" />
          {/* 金色十字裝飾護額 */}
          <rect x="55" y="28" width="10" height="72" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
          <rect x="29" y="54" width="62" height="10" fill="#0f172a" />
          <rect x="30" y="48" width="60" height="5" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
          {/* 面甲裂縫中的金眼 */}
          <polygon points="36,56 51,58 49,62 36,61" fill="#fde047" />
          <polygon points="84,56 69,58 71,62 84,61" fill="#fde047" />
          {/* 透氣孔 */}
          <circle cx="40" cy="76" r="2" fill="#1e293b" />
          <circle cx="46" cy="82" r="2" fill="#1e293b" />
          <circle cx="80" cy="76" r="2" fill="#1e293b" />
          <circle cx="74" cy="82" r="2" fill="#1e293b" />
        </>
      )}

      {id === 'robot' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#1c1208" />
            </radialGradient>
            <linearGradient id={`armor-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="45%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 工業六角格紋 */}
          <circle cx="60" cy="60" r="46" fill="none" stroke="#fef3c7" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.3" />
          {/* 肩部飛彈艙 */}
          <rect x="8" y="64" width="22" height="34" rx="4" fill="#475569" stroke="#0f172a" strokeWidth="2" />
          <circle cx="19" cy="74" r="4" fill="#ef4444" />
          <circle cx="19" cy="86" r="4" fill="#ef4444" />
          <rect x="90" y="64" width="22" height="34" rx="4" fill="#475569" stroke="#0f172a" strokeWidth="2" />
          <circle cx="101" cy="74" r="4" fill="#ef4444" />
          <circle cx="101" cy="86" r="4" fill="#ef4444" />
          {/* 側耳天線 */}
          <rect x="18" y="42" width="10" height="20" rx="2" fill="#64748b" />
          <line x1="23" y1="42" x2="23" y2="20" stroke="#cbd5e1" strokeWidth="3" />
          <circle cx="23" cy="18" r="4" fill="#38bdf8" />
          <rect x="92" y="42" width="10" height="20" rx="2" fill="#64748b" />
          <line x1="97" y1="42" x2="97" y2="20" stroke="#cbd5e1" strokeWidth="3" />
          <circle cx="97" cy="18" r="4" fill="#38bdf8" />
          {/* 機甲頭部 */}
          <rect x="26" y="28" width="68" height="62" rx="10" fill={`url(#armor-${uid})`} stroke="#431407" strokeWidth="2.5" />
          {/* 黑色護目屏幕＋發光青色感測器 */}
          <rect x="33" y="44" width="54" height="22" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <rect x="39" y="51" width="42" height="8" rx="4" fill="#22d3ee" />
          <circle cx="60" cy="55" r="5" fill="#ffffff" />
          {/* 散熱口 */}
          <rect x="42" y="74" width="36" height="9" rx="2" fill="#431407" />
          <line x1="50" y1="74" x2="50" y2="83" stroke="#f97316" strokeWidth="2" />
          <line x1="60" y1="74" x2="60" y2="83" stroke="#f97316" strokeWidth="2" />
          <line x1="70" y1="74" x2="70" y2="83" stroke="#f97316" strokeWidth="2" />
        </>
      )}

      {id === 'alien' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#9333ea" />
              <stop offset="55%" stopColor="#3b0764" />
              <stop offset="100%" stopColor="#090214" />
            </radialGradient>
            <radialGradient id={`skin-${uid}`} cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#bef264" />
              <stop offset="65%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#14532d" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 繞行軌道引力環 */}
          <ellipse cx="60" cy="64" rx="54" ry="18" transform="rotate(-18 60 64)" fill="none" stroke="#c084fc" strokeWidth="2.5" opacity="0.65" />
          {/* 雙觸角 */}
          <path d="M40,28 Q30,12 24,16" fill="none" stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="24" cy="16" r="4.5" fill="#e9d5ff" />
          <path d="M80,28 Q90,12 96,16" fill="none" stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="96" cy="16" r="4.5" fill="#e9d5ff" />
          {/* 經典外星人倒梨形頭 */}
          <path d="M24,48 Q24,18 60,18 Q96,18 96,48 Q94,88 60,102 Q26,88 24,48 Z" fill={`url(#skin-${uid})`} stroke="#052e16" strokeWidth="2.5" />
          {/* 額頭靈能第三眼寶石 */}
          <polygon points="60,26 66,35 60,44 54,35" fill="#d8b4fe" stroke="#581c87" strokeWidth="1.5" />
          {/* 巨大黑曜石宇宙斜眼 */}
          <ellipse cx="42" cy="60" rx="12" ry="16" transform="rotate(-20 42 60)" fill="#020617" />
          <ellipse cx="78" cy="60" rx="12" ry="16" transform="rotate(20 78 60)" fill="#020617" />
          <ellipse cx="39" cy="54" rx="3.5" ry="6" transform="rotate(-20 39 54)" fill="#a855f7" opacity="0.85" />
          <ellipse cx="75" cy="54" rx="3.5" ry="6" transform="rotate(20 75 54)" fill="#a855f7" opacity="0.85" />
          <circle cx="40" cy="52" r="2" fill="#ffffff" />
          <circle cx="76" cy="52" r="2" fill="#ffffff" />
        </>
      )}

      {id === 'soldier' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#65a30d" />
              <stop offset="55%" stopColor="#365314" />
              <stop offset="100%" stopColor="#0f1708" />
            </radialGradient>
            <linearGradient id={`helm-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a3e635" />
              <stop offset="60%" stopColor="#4d7c0f" />
              <stop offset="100%" stopColor="#1a2e05" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 準星裝飾 */}
          <circle cx="60" cy="60" r="48" fill="none" stroke="#bef264" strokeWidth="1.2" opacity="0.28" />
          <line x1="60" y1="6" x2="60" y2="20" stroke="#bef264" strokeWidth="2" opacity="0.4" />
          <line x1="60" y1="100" x2="60" y2="114" stroke="#bef264" strokeWidth="2" opacity="0.4" />
          {/* 臉龐與迷彩戰術口罩 */}
          <rect x="34" y="42" width="52" height="54" rx="14" fill="#fcd34d" stroke="#422006" strokeWidth="2" />
          <path d="M33,66 L87,66 L82,94 Q60,104 38,94 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          {/* 戰術頭盔 */}
          <path d="M22,52 Q24,18 60,18 Q96,18 98,52 L88,56 L32,56 Z" fill={`url(#helm-${uid})`} stroke="#1a2e05" strokeWidth="2.5" />
          {/* 夜視雙筒護目鏡（發光綠鏡片） */}
          <rect x="29" y="42" width="62" height="22" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx="45" cy="53" r="8.5" fill="#4ade80" stroke="#14532d" strokeWidth="2" />
          <circle cx="75" cy="53" r="8.5" fill="#4ade80" stroke="#14532d" strokeWidth="2" />
          <circle cx="42" cy="50" r="2.8" fill="#ffffff" opacity="0.85" />
          <circle cx="72" cy="50" r="2.8" fill="#ffffff" opacity="0.85" />
          {/* 槍口火光火花 */}
          <polygon points="104,76 116,66 110,78 120,82 108,85 113,94 102,86" fill="#fbbf24" opacity="0.85" />
        </>
      )}

      {id === 'zombie' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="55%" stopColor="#14532d" />
              <stop offset="100%" stopColor="#05160c" />
            </radialGradient>
            <linearGradient id={`zskin-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 劇毒沼澤氣泡 */}
          <circle cx="18" cy="92" r="8" fill="#86efac" opacity="0.22" />
          <circle cx="102" cy="28" r="6" fill="#86efac" opacity="0.25" />
          <circle cx="96" cy="90" r="10" fill="#4ade80" opacity="0.18" />
          {/* 殭屍方塊腐化頭顱 */}
          <rect x="26" y="24" width="68" height="72" rx="10" fill={`url(#zskin-${uid})`} stroke="#052e16" strokeWidth="2.5" />
          {/* 額頭縫線傷疤 */}
          <path d="M62,28 L78,44" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
          <line x1="64" y1="36" x2="70" y2="30" stroke="#1e293b" strokeWidth="2" />
          <line x1="70" y1="42" x2="76" y2="36" stroke="#1e293b" strokeWidth="2" />
          {/* 不對稱發光黃/紅兇眼 */}
          <circle cx="43" cy="54" r="8.5" fill="#0f172a" />
          <circle cx="43" cy="54" r="4.5" fill="#fde047" />
          <circle cx="77" cy="56" r="10" fill="#0f172a" />
          <circle cx="77" cy="56" r="5.5" fill="#ef4444" />
          {/* 咧嘴獠牙 */}
          <path d="M36,75 L84,75 L80,88 L40,88 Z" fill="#1e293b" stroke="#052e16" strokeWidth="1.5" />
          <polygon points="42,75 47,83 52,75" fill="#fef9c3" />
          <polygon points="68,75 73,83 78,75" fill="#fef9c3" />
          <rect x="55" y="75" width="9" height="6" fill="#fef08a" />
        </>
      )}

      {id === 'tetro' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="55%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 矩陣背景網格 */}
          {[24, 48, 72, 96].map((p) => (
            <g key={p} opacity="0.22">
              <line x1={p} y1="0" x2={p} y2="120" stroke="#22d3ee" strokeWidth="1" />
              <line x1="0" y1={p} x2="120" y2={p} stroke="#22d3ee" strokeWidth="1" />
            </g>
          ))}
          {/* 方塊魔像由 I(青)、T(紫)、O(黃)、L(橘) 組成 */}
          {/* 青色 I-block 頂冠 */}
          <rect x="26" y="16" width="68" height="17" rx="2" fill="#00f0f0" stroke="#083344" strokeWidth="2" />
          <line x1="43" y1="16" x2="43" y2="33" stroke="#083344" strokeWidth="1.5" />
          <line x1="60" y1="16" x2="60" y2="33" stroke="#083344" strokeWidth="1.5" />
          <line x1="77" y1="16" x2="77" y2="33" stroke="#083344" strokeWidth="1.5" />
          {/* 紫色 T-block 頭部主體 */}
          <rect x="43" y="33" width="34" height="17" rx="2" fill="#b84dff" stroke="#2e1065" strokeWidth="2" />
          <rect x="26" y="50" width="68" height="22" rx="2" fill="#a855f7" stroke="#2e1065" strokeWidth="2" />
          {/* 黃色 O-block 左肩與橘色 L-block 右肩 */}
          <rect x="14" y="72" width="34" height="30" rx="2" fill="#f0f000" stroke="#422006" strokeWidth="2" />
          <rect x="72" y="72" width="34" height="30" rx="2" fill="#ff9000" stroke="#431407" strokeWidth="2" />
          {/* 紅色 Z-block 胸口核心 */}
          <rect x="48" y="72" width="24" height="24" rx="2" fill="#ff3040" stroke="#450a0a" strokeWidth="2" />
          {/* 發光像素雙眼 */}
          <rect x="35" y="55" width="14" height="10" rx="1.5" fill="#020617" />
          <rect x="71" y="55" width="14" height="10" rx="1.5" fill="#020617" />
          <rect x="38" y="57" width="8" height="6" fill="#00f0f0" />
          <rect x="74" y="57" width="8" height="6" fill="#00f0f0" />
        </>
      )}

      {id === 'random' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
            <linearGradient id={`q-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          <circle cx="60" cy="60" r="44" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.12" />
          <text
            x="60"
            y="88"
            textAnchor="middle"
            fontSize="86"
            fontWeight="900"
            fontFamily="sans-serif"
            fill="#000000"
            opacity="0.65"
            transform="translate(3, 4)"
          >
            ?
          </text>
          <text
            x="60"
            y="88"
            textAnchor="middle"
            fontSize="86"
            fontWeight="900"
            fontFamily="sans-serif"
            fill={`url(#q-${uid})`}
            stroke="#000000"
            strokeWidth="3.5"
          >
            ?
          </text>
        </>
      )}
    </svg>
  )
}
