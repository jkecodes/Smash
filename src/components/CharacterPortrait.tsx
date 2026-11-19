import { useId } from 'react'
import { PARTNERS } from '../game/partners'
import type { CharacterId } from '../game/types'

export const SHORT_NAMES: Record<CharacterId, string> = {
  tetro: 'TETRIS',
  pacman: 'PAC-MAN',
  mario: 'MARIO',
  invader: 'INVADER',
  bomber: 'BOMBER',
  snake: 'SNAKE',
  frogger: 'FROGGER',
  kong: 'KONG',
  pong: 'PONG',
  reimu: 'REIMU',
  marisa: 'MARISA',
  ryu: 'RYU',
  chunli: 'CHUN-LI',
  yugi: 'YUGI',
  kaiba: 'KAIBA',
  omnom: 'OM NOM',
  tom: 'TOM',
  ben: 'BEN',
  crossy: 'CHICKEN',
  red: 'RED',
  steve: 'STEVE',
  arisa: 'ARISA',
  chihiro: 'CHIHIRO',
  ichi: 'ICHI',
  ruri: 'RURI',
  nona: 'NONA',
  gojo: 'GOJO',
  deku: 'DEKU',
  yodaka: 'YODAKA',
  saki: 'SAKI',
  spe: 'SPE',
  kaoruko: 'KAORUKO',
  stelle: 'STELLE',
  lumine: 'LUMINE',
  miyabi: 'MIYABI',
  rover: 'ROVER',
  rapi: 'RAPI',
  akira: 'AKIRA',
  kotone: 'KOTONE',
  hutao: 'HU TAO',
  seija: 'SEIJA',
  youmu: 'YOUMU',
  luigi: 'LUIGI',
  blinky: 'BLINKY',
  diddy: 'DIDDY',
  creeper: 'CREEPER',
  chuck: 'CHUCK',
  suzuka: 'SUZUKA',
  firefly: 'FIREFLY',
  ellen: 'ELLEN',
  jinhsi: 'JINHSI',
  anis: 'ANIS',
  erika: 'ERIKA',
  vaus: 'VAUS',
  ...(Object.fromEntries(PARTNERS.map((p) => [p.id, p.short])) as Record<(typeof PARTNERS)[number]['id'], string>),
}

const ANIME_PORTRAITS: Partial<Record<CharacterId, { bg: string; hair: string; outfit: string; accent: string; eye: string; blindfold?: boolean; ears?: boolean; horns?: boolean; shortHair?: boolean; bobHair?: boolean; scar?: boolean; twintails?: boolean; huTaoHat?: boolean; witchHat?: boolean; glasses?: boolean }>> = {
  chihiro: { bg: '#4c0519', hair: '#09090b', outfit: '#18181b', accent: '#ef4444', eye: '#ef4444', shortHair: true, scar: true },
  ichi: { bg: '#0c4a6e', hair: '#111827', outfit: '#1e3a8a', accent: '#38bdf8', eye: '#38bdf8', shortHair: true, witchHat: true },
  ruri: { bg: '#064e3b', hair: '#1e3a8a', outfit: '#111827', accent: '#fef3c7', eye: '#ef4444', horns: true, bobHair: true },
  nona: { bg: '#4a044e', hair: '#e9d5ff', outfit: '#3b0764', accent: '#e879f9', eye: '#a855f7', bobHair: true },
  gojo: { bg: '#1e1b4b', hair: '#f8fafc', outfit: '#111827', accent: '#818cf8', eye: '#38bdf8', blindfold: true, shortHair: true },
  deku: { bg: '#052e16', hair: '#15803d', outfit: '#14532d', accent: '#4ade80', eye: '#22c55e', shortHair: true },
  yodaka: { bg: '#0f172a', hair: '#334155', outfit: '#09090b', accent: '#38bdf8', eye: '#94a3b8', shortHair: true },
  saki: { bg: '#881337', hair: '#fb7185', outfit: '#be123c', accent: '#fde047', eye: '#f43f5e' },
  spe: { bg: '#3b0764', hair: '#78350f', outfit: '#f8fafc', accent: '#c084fc', eye: '#a855f7', ears: true },
  kaoruko: { bg: '#500724', hair: '#1e1b2e', outfit: '#831843', accent: '#f9a8d4', eye: '#a855f7' },
  stelle: { bg: '#0f172a', hair: '#94a3b8', outfit: '#1e293b', accent: '#facc15', eye: '#eab308' },
  lumine: { bg: '#134e4a', hair: '#fde047', outfit: '#f8fafc', accent: '#5eead4', eye: '#facc15', bobHair: true },
  miyabi: { bg: '#083344', hair: '#18181b', outfit: '#0f172a', accent: '#22d3ee', eye: '#ef4444', ears: true },
  rover: { bg: '#1e293b', hair: '#09090b', outfit: '#334155', accent: '#facc15', eye: '#eab308', shortHair: true },
  rapi: { bg: '#450a0a', hair: '#9a3412', outfit: '#27272a', accent: '#ef4444', eye: '#ef4444' },
  akira: { bg: '#500724', hair: '#f472b6', outfit: '#1e3a8a', accent: '#fbcfe8', eye: '#ec4899', bobHair: true },
  kotone: { bg: '#713f12', hair: '#facc15', outfit: '#f59e0b', accent: '#fef08a', eye: '#38bdf8', twintails: true },
  hutao: { bg: '#450a0a', hair: '#3f2318', outfit: '#18181b', accent: '#ef4444', eye: '#ef4444', twintails: true, huTaoHat: true },
  seija: { bg: '#4c0519', hair: '#1e1b4b', outfit: '#be123c', accent: '#f8fafc', eye: '#ef4444', horns: true, shortHair: true },
  youmu: { bg: '#064e3b', hair: '#e2e8f0', outfit: '#0f766e', accent: '#34d399', eye: '#10b981', bobHair: true },
  suzuka: { bg: '#052e16', hair: '#f97316', outfit: '#22c55e', accent: '#ffffff', eye: '#10b981', ears: true },
  firefly: { bg: '#0f172a', hair: '#cbd5e1', outfit: '#0f766e', accent: '#f97316', eye: '#38bdf8', bobHair: true },
  jinhsi: { bg: '#0f172a', hair: '#f8fafc', outfit: '#334155', accent: '#fde047', eye: '#eab308', horns: true },
  anis: { bg: '#422006', hair: '#facc15', outfit: '#27272a', accent: '#fb923c', eye: '#f59e0b', bobHair: true },
  erika: { bg: '#1e1b4b', hair: '#1e293b', outfit: '#312e81', accent: '#facc15', eye: '#818cf8' },
  ...(Object.fromEntries(
    PARTNERS.filter((p) => !['mino', 'ufo', 'blackbomber', 'viper', 'ladyfrog', 'paddle', 'omnelle', 'ducky', 'doh', 'desscaras', 'miramira', 'bakugo', 'sukuna', 'duo', 'samura', 'sojo'].includes(p.id))
      .map((p) => [p.id, p.portrait]),
  ) as Partial<Record<CharacterId, any>>),
}

export function CharacterPortrait({ id, className = '' }: { id: CharacterId | 'random'; className?: string }) {
  const uid = useId().replace(/:/g, '')

  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
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
          {[24, 48, 72, 96].map((p) => (
            <g key={p} opacity="0.22">
              <line x1={p} y1="0" x2={p} y2="120" stroke="#22d3ee" strokeWidth="1" />
              <line x1="0" y1={p} x2="120" y2={p} stroke="#22d3ee" strokeWidth="1" />
            </g>
          ))}
          <rect x="26" y="16" width="68" height="17" rx="2" fill="#00f0f0" stroke="#083344" strokeWidth="2" />
          <line x1="43" y1="16" x2="43" y2="33" stroke="#083344" strokeWidth="1.5" />
          <line x1="60" y1="16" x2="60" y2="33" stroke="#083344" strokeWidth="1.5" />
          <line x1="77" y1="16" x2="77" y2="33" stroke="#083344" strokeWidth="1.5" />
          <rect x="43" y="33" width="34" height="17" rx="2" fill="#b84dff" stroke="#2e1065" strokeWidth="2" />
          <rect x="26" y="50" width="68" height="22" rx="2" fill="#a855f7" stroke="#2e1065" strokeWidth="2" />
          <rect x="14" y="72" width="34" height="30" rx="2" fill="#f0f000" stroke="#422006" strokeWidth="2" />
          <rect x="72" y="72" width="34" height="30" rx="2" fill="#ff9000" stroke="#431407" strokeWidth="2" />
          <rect x="48" y="72" width="24" height="24" rx="2" fill="#ff3040" stroke="#450a0a" strokeWidth="2" />
          <rect x="35" y="55" width="14" height="10" rx="1.5" fill="#020617" />
          <rect x="71" y="55" width="14" height="10" rx="1.5" fill="#020617" />
          <rect x="38" y="57" width="8" height="6" fill="#00f0f0" />
          <rect x="74" y="57" width="8" height="6" fill="#00f0f0" />
        </>
      )}

      {id === 'pacman' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="65%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          <rect x="8" y="8" width="104" height="104" rx="10" fill="none" stroke="#2563eb" strokeWidth="4" />
          <circle cx="98" cy="60" r="6" fill="#fde047" />
          <circle cx="110" cy="60" r="4" fill="#fde047" />
          {/* 經典大嘴黃色吃豆人 */}
          <path d="M56,60 L92,35 A42,42 0 1,0 92,85 Z" fill="#ffe01b" stroke="#854d0e" strokeWidth="2.5" />
          <circle cx="58" cy="38" r="6.5" fill="#111827" />
          <circle cx="60" cy="36" r="2.2" fill="#ffffff" />
          {/* 紅手套小拳 */}
          <circle cx="32" cy="86" r="10" fill="#ef4444" stroke="#450a0a" strokeWidth="2" />
        </>
      )}

      {id === 'mario' && (
        <>
          <defs>
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="70%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 臉龐與大鼻、八字鬍 */}
          <ellipse cx="60" cy="66" rx="28" ry="26" fill="#fed7aa" stroke="#7c2d12" strokeWidth="2" />
          {/* 紅鴨舌帽 */}
          <path d="M28,50 C28,24 92,24 92,50 Z" fill="#e62325" stroke="#450a0a" strokeWidth="2" />
          <ellipse cx="60" cy="52" rx="34" ry="7" fill="#b91c1c" />
          <circle cx="60" cy="36" r="10" fill="#ffffff" />
          <text x="60" y="40" textAnchor="middle" fontSize="13" fontWeight="900" fill="#e62325" fontFamily="sans-serif">M</text>
          {/* 眼睛與大鼻 */}
          <ellipse cx="49" cy="60" rx="4.5" ry="6.5" fill="#1e293b" />
          <ellipse cx="71" cy="60" rx="4.5" ry="6.5" fill="#1e293b" />
          <circle cx="60" cy="70" r="8" fill="#fb923c" stroke="#9a3412" strokeWidth="1.5" />
          {/* 八字鬍 */}
          <path d="M38,76 Q48,86 60,78 Q72,86 82,76 Q72,72 60,74 Q48,72 38,76 Z" fill="#27170e" />
          {/* 藍吊帶褲領口 */}
          <path d="M30,96 L90,96 L96,120 L24,120 Z" fill="#2563eb" />
          <circle cx="44" cy="104" r="4.5" fill="#facc15" />
          <circle cx="76" cy="104" r="4.5" fill="#facc15" />
        </>
      )}

      {id === 'invader' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="100%" stopColor="#020604" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 11×8 像素綠螃蟹外星人 */}
          <g fill="#22c55e" stroke="#86efac" strokeWidth="0.6">
            <rect x="32" y="24" width="8" height="8" /><rect x="80" y="24" width="8" height="8" />
            <rect x="40" y="32" width="8" height="8" /><rect x="72" y="32" width="8" height="8" />
            <rect x="32" y="40" width="56" height="8" />
            <rect x="24" y="48" width="16" height="8" /><rect x="48" y="48" width="24" height="8" /><rect x="80" y="48" width="16" height="8" />
            <rect x="16" y="56" width="88" height="12" />
            <rect x="16" y="68" width="8" height="14" /><rect x="32" y="68" width="56" height="10" /><rect x="96" y="68" width="8" height="14" />
            <rect x="36" y="78" width="12" height="10" /><rect x="72" y="78" width="12" height="10" />
          </g>
          {/* 雷射能量點 */}
          <rect x="57" y="92" width="6" height="16" fill="#ff3366" />
        </>
      )}

      {id === 'bomber' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="55%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 粉紅天線球 */}
          <line x1="60" y1="22" x2="60" y2="34" stroke="#94a3b8" strokeWidth="4" />
          <circle cx="60" cy="18" r="9" fill="#ec4899" stroke="#831843" strokeWidth="2" />
          {/* 白色圓頭盔 */}
          <ellipse cx="60" cy="60" rx="34" ry="30" fill="#f8fafc" stroke="#334155" strokeWidth="2.5" />
          {/* 深藍臉罩 ＋ 雙豎瞳 */}
          <rect x="34" y="46" width="52" height="28" rx="10" fill="#1e293b" />
          <rect x="44" y="52" width="7" height="16" rx="3" fill="#38bdf8" />
          <rect x="69" y="52" width="7" height="16" rx="3" fill="#38bdf8" />
          {/* 藍衣領 ＋ 右手黑炸彈 */}
          <path d="M32,90 L88,90 L94,120 L26,120 Z" fill="#2563eb" />
          <circle cx="94" cy="92" r="14" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <circle cx="102" cy="76" r="5" fill="#fde047" />
        </>
      )}

      {id === 'snake' && (
        <>
          <defs>
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="100%" stopColor="#052e16" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {[20, 40, 60, 80, 100].map((p) => (
            <g key={p} opacity="0.2">
              <line x1={p} y1="0" x2={p} y2="120" stroke="#86efac" strokeWidth="1" />
              <line x1="0" y1={p} x2="120" y2={p} stroke="#86efac" strokeWidth="1" />
            </g>
          ))}
          {/* 紅蘋果 */}
          <circle cx="92" cy="30" r="9" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
          <rect x="90" y="17" width="4" height="6" fill="#4ade80" />
          {/* 像素綠蛇身與蛇頭 */}
          <rect x="20" y="80" width="60" height="18" rx="4" fill="#16a34a" stroke="#052e16" strokeWidth="2" />
          <rect x="20" y="56" width="18" height="42" rx="4" fill="#22c55e" stroke="#052e16" strokeWidth="2" />
          <rect x="20" y="42" width="48" height="22" rx="5" fill="#4ade80" stroke="#052e16" strokeWidth="2" />
          {/* 黃眼與紅信子 */}
          <circle cx="56" cy="49" r="3.5" fill="#fde047" />
          <circle cx="56" cy="58" r="3.5" fill="#fde047" />
          <path d="M68,53 L86,53 L92,47 M86,53 L92,59" stroke="#ef4444" strokeWidth="3" fill="none" />
        </>
      )}

      {id === 'frogger' && (
        <>
          <defs>
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="55%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          <ellipse cx="60" cy="96" rx="46" ry="14" fill="#15803d" opacity="0.7" />
          {/* 青蛙臉與大眼睛 */}
          <ellipse cx="60" cy="70" rx="34" ry="26" fill="#4ade80" stroke="#14532d" strokeWidth="2.5" />
          <ellipse cx="60" cy="78" rx="22" ry="14" fill="#fef3c7" />
          <circle cx="40" cy="42" r="14" fill="#f8fafc" stroke="#14532d" strokeWidth="2.5" />
          <circle cx="80" cy="42" r="14" fill="#f8fafc" stroke="#14532d" strokeWidth="2.5" />
          <circle cx="42" cy="42" r="6.5" fill="#0f172a" />
          <circle cx="82" cy="42" r="6.5" fill="#0f172a" />
          <path d="M40,66 Q60,78 80,66" stroke="#14532d" strokeWidth="3" fill="none" />
        </>
      )}

      {id === 'kong' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#be185d" />
              <stop offset="65%" stopColor="#4c0519" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 尖刺髮峰 ＋ 大金剛棕面 */}
          <polygon points="48,26 60,10 72,26" fill="#451a03" />
          <circle cx="60" cy="56" r="32" fill="#78350f" stroke="#271004" strokeWidth="2.5" />
          <ellipse cx="60" cy="65" rx="23" ry="18" fill="#d97706" />
          <path d="M36,48 Q60,55 84,48" stroke="#271004" strokeWidth="5" fill="none" />
          <circle cx="48" cy="54" r="4" fill="#111827" />
          <circle cx="72" cy="54" r="4" fill="#111827" />
          {/* 紅領帶 */}
          <polygon points="50,86 70,86 66,118 54,118" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
          <text x="60" y="106" textAnchor="middle" fontSize="11" fontWeight="900" fill="#facc15" fontFamily="sans-serif">DK</text>
        </>
      )}

      {id === 'pong' && (
        <>
          <rect width="120" height="120" fill="#05080f" />
          {[14, 30, 46, 62, 78, 94].map((y) => (
            <rect key={y} x="58" y={y} width="4" height="10" fill="#475569" />
          ))}
          <rect x="20" y="28" width="12" height="58" rx="3" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
          <rect x="88" y="34" width="12" height="58" rx="3" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
          <rect x="52" y="52" width="16" height="16" rx="2" fill="#38bdf8" />
          <rect x="44" y="48" width="6" height="6" fill="#38bdf8" opacity="0.45" />
          <rect x="36" y="44" width="4" height="4" fill="#38bdf8" opacity="0.2" />
        </>
      )}

      {id === 'reimu' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#be123c" />
              <stop offset="65%" stopColor="#4c0519" />
              <stop offset="100%" stopColor="#14040a" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 後方大紅蝴蝶結 */}
          <polygon points="60,30 20,12 26,46" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
          <polygon points="60,30 100,12 94,46" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
          <circle cx="60" cy="30" r="7" fill="#dc2626" />
          {/* 烏黑長髮與鬢髮 */}
          <path d="M30,44 C30,22 90,22 90,44 L94,104 L26,104 Z" fill="#1e1b2e" />
          <ellipse cx="60" cy="58" rx="21" ry="22" fill="#fde8d7" />
          <path d="M38,48 Q60,36 82,48 L78,34 Q60,26 42,34 Z" fill="#1e1b2e" />
          <ellipse cx="52" cy="59" rx="3.5" ry="4.5" fill="#7f1d1d" />
          <ellipse cx="68" cy="59" rx="3.5" ry="4.5" fill="#7f1d1d" />
          {/* 紅白巫女服 */}
          <path d="M36,80 L84,80 L92,120 L28,120 Z" fill="#f8fafc" />
          <path d="M46,80 L60,96 L74,80 Z" fill="#dc2626" />
          {/* 右下方陰陽玉 */}
          <circle cx="94" cy="92" r="12" fill="#ffffff" stroke="#dc2626" strokeWidth="2" />
          <path d="M94,80 A12,12 0 0,1 94,104 A6,6 0 0,1 94,92 A6,6 0 0,0 94,80 Z" fill="#dc2626" />
        </>
      )}

      {id === 'marisa' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#6d28d9" />
              <stop offset="65%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 金髮捲垂 */}
          <path d="M32,48 L22,102 L98,102 L88,48 Z" fill="#eab308" />
          <ellipse cx="60" cy="64" rx="20" ry="21" fill="#fde8d7" />
          <ellipse cx="52" cy="65" rx="3.5" ry="4.5" fill="#78350f" />
          <ellipse cx="68" cy="65" rx="3.5" ry="4.5" fill="#78350f" />
          {/* 大黑魔女帽 ＋ 白緞帶 */}
          <ellipse cx="60" cy="48" rx="46" ry="11" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
          <polygon points="34,44 86,44 64,10" fill="#18181b" stroke="#09090b" strokeWidth="2" />
          <rect x="38" y="39" width="44" height="6" rx="2" fill="#f8fafc" />
          {/* 魔女圍裙與發光星星 */}
          <path d="M36,86 L84,86 L92,120 L28,120 Z" fill="#18181b" />
          <path d="M46,86 L74,86 L76,120 L44,120 Z" fill="#f8fafc" />
          <polygon points="94,72 97,80 105,80 99,85 101,93 94,88 87,93 89,85 83,80 91,80" fill="#fde047" />
        </>
      )}

      {id === 'ryu' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="60%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          <path d="M26,48 Q60,20 94,48 L92,34 Q60,12 28,34 Z" fill="#451a03" />
          <circle cx="60" cy="56" r="24" fill="#fed7aa" stroke="#7c2d12" strokeWidth="2" />
          {/* 經典紅頭帶 */}
          <rect x="33" y="34" width="54" height="10" rx="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
          <polygon points="86,38 112,28 106,46" fill="#dc2626" />
          <rect x="44" y="52" width="10" height="4" fill="#1e293b" />
          <rect x="66" y="52" width="10" height="4" fill="#1e293b" />
          {/* 道服領口＋波動拳藍光 */}
          <path d="M28,82 L92,82 L98,120 L22,120 Z" fill="#f8fafc" />
          <path d="M44,82 L60,104 L76,82 Z" fill="#fed7aa" />
          <circle cx="94" cy="92" r="14" fill="#38bdf8" stroke="#bae6fd" strokeWidth="3" />
        </>
      )}

      {id === 'chunli' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="65%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 雙丸子包頭 */}
          <circle cx="30" cy="36" r="14" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
          <circle cx="90" cy="36" r="14" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
          <circle cx="60" cy="54" r="22" fill="#fde8d7" stroke="#9a3412" strokeWidth="1.5" />
          <path d="M38,48 Q60,26 82,48 L78,34 Q60,22 42,34 Z" fill="#27170e" />
          <circle cx="51" cy="54" r="3.5" fill="#1e293b" />
          <circle cx="69" cy="54" r="3.5" fill="#1e293b" />
          {/* 皇家藍金邊旗袍 */}
          <path d="M32,78 L88,78 L96,120 L24,120 Z" fill="#2563eb" stroke="#facc15" strokeWidth="3" />
          <path d="M48,78 L60,94 L72,78" fill="none" stroke="#facc15" strokeWidth="2.5" />
        </>
      )}

      {id === 'yugi' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#7e22ce" />
              <stop offset="65%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          {/* 傳奇三色刺刺海星頭 */}
          <polygon points="60,8 42,40 78,40" fill="#111827" stroke="#db2777" strokeWidth="2" />
          <polygon points="20,24 44,48 34,62" fill="#db2777" />
          <polygon points="100,24 76,48 86,62" fill="#db2777" />
          <ellipse cx="60" cy="56" rx="20" ry="20" fill="#fde8d7" />
          <polygon points="40,42 52,58 46,36" fill="#facc15" />
          <polygon points="80,42 68,58 74,36" fill="#facc15" />
          <ellipse cx="52" cy="55" rx="3.5" ry="4.5" fill="#6d28d9" />
          <ellipse cx="68" cy="55" rx="3.5" ry="4.5" fill="#6d28d9" />
          {/* 紫衣 ＋ 胸前黃金千年積木 */}
          <path d="M30,78 L90,78 L98,120 L22,120 Z" fill="#312e81" />
          <polygon points="48,86 72,86 60,112" fill="#facc15" stroke="#854d0e" strokeWidth="2" />
          <circle cx="60" cy="96" r="4" fill="#78350f" />
        </>
      )}

      {id === 'kaiba' && (
        <>
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="65%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill={`url(#bg-${uid})`} />
          <polygon points="36,36 60,14 84,36" fill="#78350f" />
          <ellipse cx="60" cy="56" rx="20" ry="21" fill="#fde8d7" />
          <rect x="44" y="50" width="12" height="5" fill="#0284c7" />
          <rect x="64" y="50" width="12" height="5" fill="#0284c7" />
          {/* 白色高領社長服 ＋ 青眼能量光 */}
          <path d="M24,78 L96,78 L104,120 L16,120 Z" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M46,78 L60,104 L74,78 Z" fill="#1e293b" />
          <rect x="86" y="70" width="22" height="32" rx="2" fill="#67e8f9" stroke="#e0f2fe" strokeWidth="2" />
        </>
      )}

      {id === 'omnom' && (
        <>
          <rect width="120" height="120" fill="#78350f" />
          <polygon points="55,14 65,14 60,26" fill="#22c55e" />
          <circle cx="60" cy="64" r="36" fill="#4ade80" stroke="#15803d" strokeWidth="3" />
          <circle cx="46" cy="52" r="10" fill="#ffffff" />
          <circle cx="74" cy="52" r="10" fill="#ffffff" />
          <circle cx="48" cy="52" r="4.5" fill="#0f172a" />
          <circle cx="72" cy="52" r="4.5" fill="#0f172a" />
          <path d="M36,74 Q60,92 84,74 Z" fill="#7f1d1d" />
          <polygon points="44,74 50,82 56,74" fill="#ffffff" />
          <polygon points="64,74 70,82 76,74" fill="#ffffff" />
        </>
      )}

      {id === 'tom' && (
        <>
          <rect width="120" height="120" fill="#1e293b" />
          <polygon points="24,18 44,40 22,52" fill="#64748b" />
          <polygon points="96,18 76,40 98,52" fill="#64748b" />
          <circle cx="60" cy="64" r="34" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          <ellipse cx="47" cy="56" rx="7" ry="9" fill="#22c55e" />
          <ellipse cx="73" cy="56" rx="7" ry="9" fill="#22c55e" />
          <ellipse cx="47" cy="56" rx="3" ry="6" fill="#0f172a" />
          <ellipse cx="73" cy="56" rx="3" ry="6" fill="#0f172a" />
          <ellipse cx="60" cy="76" rx="16" ry="12" fill="#f8fafc" />
          <polygon points="55,68 65,68 60,74" fill="#f472b6" />
        </>
      )}

      {id === 'ben' && (
        <>
          <rect width="120" height="120" fill="#451a03" />
          <ellipse cx="26" cy="64" rx="10" ry="24" fill="#78350f" />
          <ellipse cx="94" cy="64" rx="10" ry="24" fill="#78350f" />
          <circle cx="60" cy="62" r="34" fill="#b45309" />
          <ellipse cx="60" cy="74" rx="22" ry="16" fill="#fde68a" />
          <circle cx="48" cy="50" r="5" fill="#0f172a" />
          <circle cx="72" cy="50" r="5" fill="#0f172a" />
          <ellipse cx="60" cy="66" rx="8" ry="5" fill="#1e293b" />
        </>
      )}

      {id === 'crossy' && (
        <>
          <rect width="120" height="120" fill="#0284c7" />
          <rect x="46" y="12" width="28" height="16" fill="#ef4444" />
          <rect x="28" y="28" width="64" height="68" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="38" y="46" width="10" height="10" fill="#0f172a" />
          <rect x="72" y="46" width="10" height="10" fill="#0f172a" />
          <rect x="48" y="60" width="24" height="12" fill="#f97316" />
          <rect x="54" y="72" width="12" height="12" fill="#ef4444" />
        </>
      )}

      {id === 'red' && (
        <>
          <rect width="120" height="120" fill="#0f172a" />
          <circle cx="60" cy="66" r="36" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2.5" />
          <ellipse cx="60" cy="84" rx="22" ry="14" fill="#fef3c7" />
          <circle cx="48" cy="58" r="8" fill="#ffffff" />
          <circle cx="72" cy="58" r="8" fill="#ffffff" />
          <circle cx="50" cy="58" r="3.5" fill="#0f172a" />
          <circle cx="70" cy="58" r="3.5" fill="#0f172a" />
          <path d="M36,44 L60,54 L84,44" stroke="#0f172a" strokeWidth="7" fill="none" />
          <polygon points="52,66 68,66 60,78" fill="#facc15" />
        </>
      )}

      {id === 'steve' && (
        <>
          <rect width="120" height="120" fill="#16a34a" />
          <rect x="24" y="20" width="72" height="72" fill="#d97706" stroke="#451a03" strokeWidth="2" />
          <rect x="24" y="20" width="72" height="22" fill="#451a03" />
          <rect x="36" y="52" width="14" height="8" fill="#ffffff" />
          <rect x="42" y="52" width="8" height="8" fill="#3b82f6" />
          <rect x="70" y="52" width="14" height="8" fill="#ffffff" />
          <rect x="70" y="52" width="8" height="8" fill="#3b82f6" />
          <rect x="52" y="64" width="16" height="8" fill="#92400e" />
          <rect x="46" y="76" width="28" height="10" fill="#451a03" />
          <rect x="24" y="92" width="72" height="28" fill="#06b6d4" />
        </>
      )}

      {id === 'arisa' && (
        <>
          <rect width="120" height="120" fill="#064e3b" />
          <path d="M30,48 L20,104 L100,104 L90,48 Z" fill="#eab308" />
          <ellipse cx="60" cy="60" rx="22" ry="22" fill="#fde8d7" />
          <ellipse cx="52" cy="60" rx="3.5" ry="5" fill="#10b981" />
          <ellipse cx="68" cy="60" rx="3.5" ry="5" fill="#10b981" />
          <path d="M34,82 L86,82 L94,120 L26,120 Z" fill="#10b981" stroke="#6ee7b7" strokeWidth="2" />
        </>
      )}

      {id === 'chuck' && (
        <>
          <rect width="120" height="120" fill="#422006" />
          <polygon points="56,22 64,10 68,24" fill="#18181b" />
          <polygon points="60,18 18,98 102,98" fill="#facc15" stroke="#ca8a04" strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx="60" cy="88" rx="26" ry="10" fill="#fef9c3" />
          <circle cx="48" cy="60" r="8" fill="#ffffff" />
          <circle cx="72" cy="60" r="8" fill="#ffffff" />
          <circle cx="49" cy="60" r="3.5" fill="#111827" />
          <circle cx="71" cy="60" r="3.5" fill="#111827" />
          <path d="M36,48 L56,55 M84,48 L64,55" stroke="#451a03" strokeWidth="5" strokeLinecap="round" />
          <polygon points="60,62 48,74 72,74" fill="#f97316" />
          <polygon points="51,74 69,74 60,82" fill="#ea580c" />
        </>
      )}
      {id === 'diddy' && (
        <>
          <rect width="120" height="120" fill="#451a03" />
          {/* 猴耳與棕毛頭 */}
          <circle cx="30" cy="56" r="11" fill="#fcd39d" stroke="#78350f" strokeWidth="2" />
          <circle cx="90" cy="56" r="11" fill="#fcd39d" stroke="#78350f" strokeWidth="2" />
          <circle cx="60" cy="54" r="26" fill="#78350f" />
          {/* 紅色鴨舌帽＋帽簷 */}
          <path d="M34,46 C34,20 86,20 86,46 Z" fill="#dc2626" />
          <ellipse cx="66" cy="44" rx="30" ry="7" fill="#ef4444" />
          {/* 大白眼與猴嘴吻 */}
          <ellipse cx="51" cy="54" rx="7" ry="9" fill="#ffffff" />
          <ellipse cx="69" cy="54" rx="7" ry="9" fill="#ffffff" />
          <circle cx="52" cy="55" r="3.5" fill="#111827" />
          <circle cx="68" cy="55" r="3.5" fill="#111827" />
          <ellipse cx="60" cy="70" rx="22" ry="13" fill="#fcd39d" />
          <path d="M48,73 Q60,80 72,73" fill="none" stroke="#9a3412" strokeWidth="2.5" strokeLinecap="round" />
          {/* 紅星背心 */}
          <path d="M32,86 L88,86 L94,120 L26,120 Z" fill="#dc2626" />
          <polygon points="60,92 63,100 71,100 65,105 67,113 60,108 53,113 55,105 49,100 57,100" fill="#facc15" />
        </>
      )}
      {id === 'creeper' && (
        <>
          <rect width="120" height="120" fill="#064e3b" />
          <rect x="20" y="20" width="80" height="80" fill="#22c55e" stroke="#15803d" strokeWidth="3" />
          <rect x="32" y="36" width="18" height="18" fill="#09090b" />
          <rect x="70" y="36" width="18" height="18" fill="#09090b" />
          <rect x="50" y="54" width="20" height="14" fill="#09090b" />
          <rect x="40" y="62" width="40" height="18" fill="#09090b" />
          <rect x="40" y="76" width="12" height="12" fill="#09090b" />
          <rect x="68" y="76" width="12" height="12" fill="#09090b" />
        </>
      )}
      {id === 'blinky' && (
        <>
          <rect width="120" height="120" fill="#1e0707" />
          <path d="M22,56 C22,20 98,20 98,56 L98,104 L85,92 L72,104 L60,92 L48,104 L35,92 L22,104 Z" fill="#ef4444" />
          <ellipse cx="45" cy="52" rx="11" ry="14" fill="#ffffff" />
          <ellipse cx="75" cy="52" rx="11" ry="14" fill="#ffffff" />
          <circle cx="49" cy="54" r="5.5" fill="#2563eb" />
          <circle cx="79" cy="54" r="5.5" fill="#2563eb" />
        </>
      )}
      {id === 'vaus' && (
        <>
          <rect width="120" height="120" fill="#020617" />
          <rect x="16" y="48" width="88" height="24" rx="12" fill="#cbd5e1" stroke="#38bdf8" strokeWidth="2.5" />
          <rect x="14" y="48" width="18" height="24" rx="6" fill="#ef4444" />
          <rect x="88" y="48" width="18" height="24" rx="6" fill="#ef4444" />
          <rect x="38" y="53" width="44" height="14" rx="4" fill="#0ea5e9" />
          <circle cx="60" cy="26" r="7" fill="#fde047" />
        </>
      )}
      {id === 'luigi' && (
        <>
          <rect width="120" height="120" fill="#052e16" />
          <path d="M28,46 C28,16 92,16 92,46 Z" fill="#16a34a" />
          <rect x="26" y="40" width="68" height="10" rx="5" fill="#15803d" />
          <circle cx="60" cy="30" r="10" fill="#ffffff" />
          <text x="60" y="34" textAnchor="middle" fontSize="13" fontWeight="900" fill="#16a34a">L</text>
          <ellipse cx="60" cy="64" rx="22" ry="20" fill="#fde8d7" />
          <ellipse cx="52" cy="60" rx="3.5" ry="5" fill="#2563eb" />
          <ellipse cx="68" cy="60" rx="3.5" ry="5" fill="#2563eb" />
          <path d="M44,72 Q52,66 60,72 Q68,66 76,72 Q68,78 60,75 Q52,78 44,72 Z" fill="#451a03" />
          <path d="M30,86 L90,86 L96,120 L24,120 Z" fill="#2563eb" />
          <rect x="34" y="86" width="12" height="16" fill="#16a34a" />
          <rect x="74" y="86" width="12" height="16" fill="#16a34a" />
        </>
      )}
      {id === 'sukuna' && (
        <>
          <rect width="120" height="120" fill="#450a0a" />
          <path d="M28,54 L22,34 L38,26 L50,12 L62,24 L74,12 L86,28 L98,38 L90,54 Z" fill="#fda4af" />
          <ellipse cx="60" cy="58" rx="22" ry="22" fill="#fde8d7" />
          <path d="M36,46 L46,32 L54,44 L62,28 L72,44 L84,34 L84,48 Q60,38 36,48 Z" fill="#fda4af" />
          <path d="M40,42 L48,46 M80,42 L72,46 M54,50 L66,50" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="50" cy="56" rx="4" ry="3.5" fill="#ef4444" />
          <ellipse cx="70" cy="56" rx="4" ry="3.5" fill="#ef4444" />
          <ellipse cx="48" cy="64" rx="3" ry="2" fill="#ef4444" />
          <ellipse cx="72" cy="64" rx="3" ry="2" fill="#ef4444" />
          <path d="M30,84 L90,84 L96,120 L24,120 Z" fill="#f8fafc" />
          <polygon points="44,84 60,114 76,84" fill="#18181b" />
        </>
      )}
      {id === 'ellen' && (
        <>
          <rect width="120" height="120" fill="#082f49" />
          {/* 背後鯊魚尾 */}
          <path d="M84,96 L112,72 L106,96 L116,112 L88,108 Z" fill="#1e293b" stroke="#ef4444" strokeWidth="2" />
          <path d="M30,44 C30,18 90,18 90,44 L92,80 L28,80 Z" fill="#18181b" />
          <path d="M32,32 Q60,20 88,32" fill="none" stroke="#f8fafc" strokeWidth="5" strokeDasharray="6 4" />
          <ellipse cx="60" cy="58" rx="21" ry="21" fill="#fde8d7" />
          <path d="M36,48 Q60,34 84,48 L80,32 Q60,22 40,32 Z" fill="#18181b" />
          <ellipse cx="51" cy="58" rx="3.8" ry="4.5" fill="#ef4444" />
          <ellipse cx="69" cy="58" rx="3.8" ry="4.5" fill="#ef4444" />
          <path d="M32,82 L88,82 L94,120 L26,120 Z" fill="#0f172a" />
          <polygon points="48,82 60,100 72,82" fill="#f8fafc" />
        </>
      )}
      {id === 'bakugo' && (
        <>
          <rect width="120" height="120" fill="#431407" />
          {/* 頭後橘邊黑色爆破尾翼 */}
          <polygon points="82,42 114,24 98,52 116,60 84,68" fill="#18181b" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="38,42 6,24 22,52 4,60 36,68" fill="#18181b" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" />
          {/* 淡金刺刺頭 */}
          <polygon points="34,54 22,34 38,32 34,12 52,24 60,6 70,24 88,14 82,34 98,36 86,54" fill="#fef08a" stroke="#eab308" strokeWidth="1.5" strokeLinejoin="round" />
          <ellipse cx="60" cy="56" rx="21" ry="20" fill="#fde8d7" />
          <polygon points="36,46 46,34 54,46 62,32 70,46 84,36 82,50 60,42" fill="#fef08a" />
          {/* 兇狠紅眼與黑眼罩/高領 */}
          <ellipse cx="50" cy="56" rx="4" ry="4" fill="#ef4444" />
          <ellipse cx="70" cy="56" rx="4" ry="4" fill="#ef4444" />
          <path d="M42,49 L56,53 M78,49 L64,53" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="34" y="70" width="52" height="14" rx="4" fill="#18181b" />
          <circle cx="46" cy="77" r="2.5" fill="#f97316" />
          <circle cx="74" cy="77" r="2.5" fill="#f97316" />
          {/* 黑戰服＋胸口橘紅 X＋雙側手榴彈護手 */}
          <path d="M26,84 L94,84 L100,120 L20,120 Z" fill="#18181b" />
          <path d="M38,84 L82,120 M82,84 L38,120" stroke="#ea580c" strokeWidth="7" />
          <circle cx="20" cy="104" r="14" fill="#14532d" stroke="#cbd5e1" strokeWidth="2.5" />
          <circle cx="100" cy="104" r="14" fill="#14532d" stroke="#cbd5e1" strokeWidth="2.5" />
        </>
      )}
      {id === 'miramira' && (
        <>
          <rect width="120" height="120" fill="#0f2e2b" />
          <rect x="8" y="8" width="104" height="104" rx="8" fill="none" stroke="#5eead4" strokeWidth="1.5" opacity="0.45" />
          {/* 層次狼尾深褐長髮 */}
          <path d="M26,46 C26,16 94,16 94,46 L104,106 L16,106 Z" fill="#2d2326" />
          <polygon points="26,44 16,52 28,58" fill="#2d2326" />
          <polygon points="94,44 106,52 92,58" fill="#2d2326" />
          {/* 臉部與紫粉雙眼 */}
          <ellipse cx="60" cy="54" rx="20" ry="20" fill="#fde8d7" />
          <path d="M36,46 Q48,30 60,44 Q72,30 84,46 L80,28 Q60,18 40,28 Z" fill="#2d2326" />
          <ellipse cx="51" cy="55" rx="3.8" ry="4.5" fill="#c084fc" />
          <ellipse cx="69" cy="55" rx="3.8" ry="4.5" fill="#c084fc" />
          {/* 白膨袖襯衫 ＋ 深青背心裙 */}
          <path d="M22,82 L98,82 L106,120 L14,120 Z" fill="#f8fafc" />
          <path d="M40,80 L80,80 L86,120 L34,120 Z" fill="#1e3a4c" />
          {/* 紅色彎鉤魔杖 */}
          <path d="M24,116 L36,74 Q42,60 52,68" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {id === 'samura' && (
        <>
          <rect width="120" height="120" fill="#1c1917" />
          <circle cx="60" cy="60" r="52" fill="#f59e0b" opacity="0.14" />
          {/* 黑色西裝＋敞開白襯衫領口 */}
          <path d="M18,120 L28,84 L92,84 L102,120 Z" fill="#18181b" />
          <polygon points="44,84 60,114 76,84" fill="#f8fafc" />
          <path d="M44,84 L54,96 L60,112 L66,96 L76,84" fill="none" stroke="#cbd5e1" strokeWidth="2" />
          {/* 臉部＋捲曲黑髮 */}
          <ellipse cx="60" cy="56" rx="26" ry="30" fill="#f5d5be" />
          <path d="M28,54 Q26,20 60,16 Q94,20 92,54 Q88,36 74,34 Q68,46 60,36 Q50,48 42,36 Q32,42 28,54 Z" fill="#09090b" />
          {/* 雙眼縱向白色刀疤 */}
          <path d="M44,36 L42,74" stroke="#ffffff" strokeWidth="2.4" opacity="0.85" strokeLinecap="round" />
          <path d="M76,36 L78,74" stroke="#ffffff" strokeWidth="2.4" opacity="0.85" strokeLinecap="round" />
          {/* 經典窄版黑色小墨鏡 */}
          <rect x="33" y="51" width="22" height="10" rx="4" fill="#09090b" stroke="#52525b" strokeWidth="1.4" />
          <rect x="65" y="51" width="22" height="10" rx="4" fill="#09090b" stroke="#52525b" strokeWidth="1.4" />
          <line x1="55" y1="55" x2="65" y2="55" stroke="#52525b" strokeWidth="2" />
          {/* 下巴鬍渣與嚴肅神情 */}
          <path d="M51,73 L69,73" stroke="#7c4a32" strokeWidth="2" strokeLinecap="round" />
          <path d="M53,82 L53,85 M57,83 L57,86 M61,83 L61,86 M65,83 L65,86 M68,82 L68,85" stroke="#27272a" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {id === 'sojo' && (
        <>
          <rect width="120" height="120" fill="#082f49" />
          {/* 白色閃電背景 */}
          <path d="M16,18 L34,48 L22,52 L42,88" fill="none" stroke="#e0f2fe" strokeWidth="2.5" opacity="0.7" />
          <path d="M104,20 L86,50 L98,56 L78,90" fill="none" stroke="#38bdf8" strokeWidth="2.5" opacity="0.7" />
          {/* 黑大衣＋白毛領 */}
          <path d="M16,120 L26,84 L94,84 L104,120 Z" fill="#09090b" />
          <path d="M24,86 Q40,76 60,88 Q80,76 96,86 Q88,100 60,98 Q32,100 24,86 Z" fill="#f8fafc" />
          {/* 凌亂狂野中長黑髮 */}
          <path d="M22,74 Q16,24 60,14 Q104,24 98,74 L86,58 L82,34 L68,46 L60,26 L48,44 L36,34 L32,58 Z" fill="#09090b" />
          <ellipse cx="60" cy="56" rx="24" ry="26" fill="#f3d8c7" />
          <path d="M32,44 L44,28 L52,44 L62,26 L72,44 L84,30 L88,46" fill="#09090b" />
          {/* 重黑眼圈＋瘋狂瞪大雙眼 */}
          <ellipse cx="47" cy="54" rx="8.5" ry="7.5" fill="#ffffff" stroke="#18181b" strokeWidth="2.4" />
          <ellipse cx="73" cy="54" rx="8.5" ry="7.5" fill="#ffffff" stroke="#18181b" strokeWidth="2.4" />
          <circle cx="47" cy="54" r="2.6" fill="#09090b" />
          <circle cx="73" cy="54" r="2.6" fill="#09090b" />
          <path d="M39,62 Q47,65 55,61 M65,61 Q73,65 81,62" fill="none" stroke="#52525b" strokeWidth="1.5" />
          {/* 狂笑露齒大嘴 */}
          <path d="M44,68 Q60,82 76,68 Z" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          <line x1="48" y1="72" x2="72" y2="72" stroke="#18181b" strokeWidth="1.2" />
        </>
      )}
      {id === 'duo' && (
        <>
          <rect width="120" height="120" fill="#14532d" />
          <circle cx="60" cy="60" r="52" fill="#58cc02" opacity="0.25" />
          {/* 貓頭鷹羽角＋圓臉 */}
          <polygon points="22,42 36,16 50,36" fill="#58cc02" />
          <polygon points="98,42 84,16 70,36" fill="#58cc02" />
          <ellipse cx="60" cy="68" rx="40" ry="38" fill="#58cc02" />
          {/* 淺綠眼周 */}
          <circle cx="43" cy="58" r="18" fill="#89e219" />
          <circle cx="77" cy="58" r="18" fill="#89e219" />
          {/* 巨大白眼＋黑瞳 */}
          <circle cx="43" cy="58" r="13" fill="#ffffff" />
          <circle cx="77" cy="58" r="13" fill="#ffffff" />
          <circle cx="45" cy="58" r="6.5" fill="#09090b" />
          <circle cx="75" cy="58" r="6.5" fill="#09090b" />
          <circle cx="47" cy="55" r="2.2" fill="#ffffff" />
          <circle cx="77" cy="55" r="2.2" fill="#ffffff" />
          {/* 橘黃鳥喙 */}
          <polygon points="52,70 68,70 60,84" fill="#f59e0b" />
        </>
      )}
      {id === 'desscaras' && (
        <>
          <rect width="120" height="120" fill="#eab308" />
          <circle cx="60" cy="60" r="52" fill="#facc15" opacity="0.4" />
          {/* 背後三段式黑髮泡泡馬尾 ＋ 金髮環 */}
          <circle cx="96" cy="48" r="14" fill="#09090b" />
          <circle cx="98" cy="70" r="13" fill="#09090b" />
          <circle cx="98" cy="92" r="12" fill="#09090b" />
          <rect x="86" y="57" width="20" height="4" rx="2" fill="#fde047" />
          <rect x="87" y="79" width="20" height="4" rx="2" fill="#fde047" />
          {/* 主髮與深褐膚色臉部 */}
          <circle cx="58" cy="52" r="24" fill="#09090b" />
          <ellipse cx="56" cy="58" rx="21" ry="22" fill="#7c4a32" />
          {/* 捲曲黑劉海 ＋ 側邊細辮與金飾尖端 */}
          <path d="M34,50 Q40,36 48,44 Q56,34 64,44 Q72,36 78,48 L76,34 Q56,22 36,34 Z" fill="#09090b" />
          <path d="M74,56 L76,82" stroke="#09090b" strokeWidth="4" strokeLinecap="round" />
          <polygon points="73,82 79,82 76,90" fill="#eab308" />
          {/* 發光金眸 */}
          <ellipse cx="47" cy="58" rx="4.5" ry="5.5" fill="#fde047" />
          <ellipse cx="65" cy="58" rx="4.5" ry="5.5" fill="#fde047" />
          <circle cx="47" cy="58" r="2" fill="#f59e0b" />
          <circle cx="65" cy="58" r="2" fill="#f59e0b" />
          {/* 白衣金領高領制服 ＋ 細劍 */}
          <path d="M26,84 L86,84 L94,120 L18,120 Z" fill="#f8fafc" />
          <polygon points="44,82 56,110 68,82" fill="#eab308" />
          <rect x="46" y="76" width="20" height="10" rx="2" fill="#fde047" />
          <line x1="16" y1="24" x2="42" y2="108" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="42" cy="108" rx="8" ry="4" fill="none" stroke="#eab308" strokeWidth="2.5" />
        </>
      )}
      {id === 'mino' && (
        <>
          <rect width="120" height="120" fill="#1e1b4b" />
          <rect x="44" y="24" width="32" height="32" rx="4" fill="#a855f7" stroke="#22d3ee" strokeWidth="3" />
          <rect x="20" y="56" width="32" height="32" rx="4" fill="#7c3aed" stroke="#22d3ee" strokeWidth="2.5" />
          <rect x="44" y="56" width="32" height="32" rx="4" fill="#9333ea" stroke="#22d3ee" strokeWidth="2.5" />
          <rect x="68" y="56" width="32" height="32" rx="4" fill="#7c3aed" stroke="#22d3ee" strokeWidth="2.5" />
          <rect x="50" y="34" width="6" height="9" fill="#22d3ee" />
          <rect x="64" y="34" width="6" height="9" fill="#22d3ee" />
        </>
      )}
      {id === 'ufo' && (
        <>
          <rect width="120" height="120" fill="#2b0909" />
          <path d="M40,52 C40,28 80,28 80,52 Z" fill="#fde047" opacity="0.9" />
          <ellipse cx="60" cy="60" rx="46" ry="16" fill="#dc2626" stroke="#fca5a5" strokeWidth="3" />
          <circle cx="36" cy="60" r="4" fill="#4ade80" />
          <circle cx="60" cy="63" r="4" fill="#4ade80" />
          <circle cx="84" cy="60" r="4" fill="#4ade80" />
          <polygon points="34,76 86,76 96,112 24,112" fill="#ef4444" opacity="0.22" />
        </>
      )}
      {id === 'blackbomber' && (
        <>
          <rect width="120" height="120" fill="#18181b" />
          <line x1="60" y1="24" x2="60" y2="10" stroke="#71717a" strokeWidth="4" />
          <circle cx="60" cy="10" r="7" fill="#ec4899" />
          <circle cx="60" cy="56" r="30" fill="#27272a" stroke="#52525b" strokeWidth="2" />
          <rect x="38" y="42" width="44" height="26" rx="10" fill="#09090b" />
          <rect x="46" y="49" width="7" height="13" rx="3" fill="#fde047" />
          <rect x="67" y="49" width="7" height="13" rx="3" fill="#fde047" />
          <path d="M36,86 L84,86 L92,120 L28,120 Z" fill="#18181b" />
        </>
      )}
      {id === 'viper' && (
        <>
          <rect width="120" height="120" fill="#022c22" />
          <path d="M24,96 C24,68 96,68 96,96" fill="none" stroke="#065f46" strokeWidth="18" strokeLinecap="round" />
          <path d="M40,44 L80,44 L86,66 L60,78 L34,66 Z" fill="#10b981" stroke="#34d399" strokeWidth="2" />
          <circle cx="48" cy="54" r="5" fill="#c084fc" />
          <circle cx="72" cy="54" r="5" fill="#c084fc" />
          <path d="M60,76 L60,94 L54,102 M60,94 L66,102" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {id === 'ladyfrog' && (
        <>
          <rect width="120" height="120" fill="#4a044e" />
          <ellipse cx="60" cy="70" rx="36" ry="28" fill="#ec4899" />
          <ellipse cx="60" cy="78" rx="24" ry="16" fill="#fbcfe8" />
          <circle cx="42" cy="40" r="13" fill="#ffffff" />
          <circle cx="78" cy="40" r="13" fill="#ffffff" />
          <circle cx="42" cy="40" r="6" fill="#111827" />
          <circle cx="78" cy="40" r="6" fill="#111827" />
          <polygon points="48,26 60,34 72,26 72,38 60,34 48,38" fill="#fde047" />
        </>
      )}
      {id === 'paddle' && (
        <>
          <rect width="120" height="120" fill="#090d16" />
          <line x1="60" y1="8" x2="60" y2="112" stroke="#334155" strokeWidth="4" strokeDasharray="8 8" />
          <rect x="26" y="24" width="16" height="72" rx="4" fill="#f8fafc" stroke="#38bdf8" strokeWidth="3" />
          <rect x="74" y="48" width="18" height="18" fill="#ffffff" stroke="#fde047" strokeWidth="2" />
        </>
      )}
      {id === 'omnelle' && (
        <>
          <rect width="120" height="120" fill="#14532d" />
          <path d="M66,34 Q72,14 82,20 Q88,24 80,30 Q74,30 76,24" fill="none" stroke="#84cc16" strokeWidth="6" strokeLinecap="round" />
          <circle cx="60" cy="66" r="34" fill="#84cc16" stroke="#365314" strokeWidth="2.5" />
          <path d="M28,44 L44,50 M92,44 L76,50" stroke="#14532d" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="46" cy="54" r="12" fill="#ffffff" />
          <circle cx="74" cy="54" r="12" fill="#ffffff" />
          <circle cx="49" cy="55" r="5" fill="#2563eb" />
          <circle cx="71" cy="55" r="5" fill="#2563eb" />
          <path d="M36,74 Q60,96 84,74 Z" fill="#7f1d1d" />
          <polygon points="44,75 49,82 54,75" fill="#ffffff" />
          <polygon points="58,75 62,82 66,75" fill="#ffffff" />
          <polygon points="68,75 73,82 78,75" fill="#ffffff" />
        </>
      )}
      {id === 'ducky' && (
        <>
          <rect width="120" height="120" fill="#0c4a6e" />
          <rect x="34" y="64" width="52" height="36" fill="#f8fafc" />
          <rect x="38" y="28" width="44" height="40" fill="#fde047" />
          <rect x="46" y="46" width="28" height="12" fill="#f97316" />
          <rect x="42" y="36" width="6" height="6" fill="#111827" />
          <rect x="72" y="36" width="6" height="6" fill="#111827" />
        </>
      )}
      {id === 'doh' && (
        <>
          <rect width="120" height="120" fill="#291509" />
          <rect x="30" y="18" width="60" height="86" rx="8" fill="#b45309" stroke="#f59e0b" strokeWidth="2.5" />
          <rect x="26" y="30" width="68" height="12" fill="#78350f" />
          <rect x="52" y="40" width="16" height="30" fill="#d97706" />
          <rect x="36" y="46" width="14" height="8" fill="#ef4444" />
          <rect x="70" y="46" width="14" height="8" fill="#ef4444" />
          <rect x="42" y="80" width="36" height="9" fill="#451a03" />
        </>
      )}

      {ANIME_PORTRAITS[id as CharacterId] && (() => {
        const p = ANIME_PORTRAITS[id as CharacterId]!
        return (
          <>
            <rect width="120" height="120" fill={p.bg} />
            <circle cx="60" cy="60" r="46" fill={p.accent} opacity="0.18" />
            {p.shortHair ? (
              <path d="M32,56 L26,38 L38,24 L52,16 L64,22 L76,16 L86,28 L94,40 L88,56 Z" fill={p.hair} />
            ) : p.bobHair ? (
              <path d="M30,44 C30,18 90,18 90,44 L92,78 L28,78 Z" fill={p.hair} />
            ) : (
              <path d="M28,44 C28,18 92,18 92,44 L96,104 L24,104 Z" fill={p.hair} />
            )}
            {p.twintails && (
              <>
                <path d="M30,44 C18,52 14,82 22,102 C28,96 32,76 34,54 Z" fill={p.hair} />
                <path d="M90,44 C102,52 106,82 98,102 C92,96 88,76 86,54 Z" fill={p.hair} />
              </>
            )}
            {p.horns && (
              <>
                <polygon points="36,30 42,10 48,28" fill={p.accent} />
                <polygon points="84,30 78,10 72,28" fill={p.accent} />
              </>
            )}
            {p.ears && (
              <>
                <polygon points="32,34 40,8 50,30" fill={p.hair} />
                <polygon points="88,34 80,8 70,30" fill={p.hair} />
              </>
            )}
            <ellipse cx="60" cy="58" rx="22" ry="22" fill="#fde8d7" />
            {p.shortHair ? (
              <path d="M36,46 L44,30 L52,44 L62,28 L72,46 L84,36 L84,48 Q60,38 36,48 Z" fill={p.hair} />
            ) : (
              <path d="M36,48 Q60,34 84,48 L80,32 Q60,22 40,32 Z" fill={p.hair} />
            )}
            {p.huTaoHat && (
              <>
                <ellipse cx="60" cy="36" rx="34" ry="8" fill="#18181b" stroke="#ef4444" strokeWidth="1.8" />
                <path d="M38,35 C40,14 80,14 82,35 Z" fill="#27272a" />
                <circle cx="48" cy="28" r="5" fill="#ef4444" />
                <circle cx="48" cy="28" r="2" fill="#fde047" />
              </>
            )}
            {p.witchHat && (
              <>
                <ellipse cx="60" cy="36" rx="38" ry="8" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="1.6" />
                <polygon points="40,35 60,6 80,35" fill="#1e3a8a" />
              </>
            )}
            {p.blindfold ? (
              <rect x="37" y="49" width="46" height="14" rx="2" fill="#111827" />
            ) : (
              <>
                <ellipse cx="51" cy="59" rx="3.5" ry="4.5" fill={p.eye} />
                <ellipse cx="69" cy="59" rx="3.5" ry="4.5" fill={p.eye} />
              </>
            )}
            {p.glasses && (
              <>
                <circle cx="51" cy="59" r="7.5" fill="none" stroke="#e2e8f0" strokeWidth="1.8" />
                <circle cx="69" cy="59" r="7.5" fill="none" stroke="#e2e8f0" strokeWidth="1.8" />
                <line x1="58.5" y1="59" x2="61.5" y2="59" stroke="#e2e8f0" strokeWidth="1.8" />
              </>
            )}
            {p.scar && (
              <path d="M68,49 L77,67" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
            )}
            <path d="M32,82 L88,82 L96,120 L24,120 Z" fill={p.outfit} />
            <polygon points="48,82 60,102 72,82" fill={p.accent} />
          </>
        )
      })()}

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
          <text x="60" y="88" textAnchor="middle" fontSize="86" fontWeight="900" fontFamily="sans-serif" fill="#000000" opacity="0.65" transform="translate(3, 4)">
            ?
          </text>
          <text x="60" y="88" textAnchor="middle" fontSize="86" fontWeight="900" fontFamily="sans-serif" fill={`url(#q-${uid})`} stroke="#000000" strokeWidth="3.5">
            ?
          </text>
        </>
      )}
    </svg>
  )
}
