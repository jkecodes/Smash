import type { CharacterId, StatusKind } from './types'

export type Element = 'ice' | 'fire' | 'thunder' | 'poison'

export const ELEMENT_INFO: Record<Element, { label: string; color: string; status: StatusKind }> = {
  ice: { label: '❄️ 冰', color: '#7dd3fc', status: 'freeze' },
  fire: { label: '🔥 火', color: '#fb923c', status: 'burn' },
  thunder: { label: '⚡ 雷', color: '#facc15', status: 'shock' },
  poison: { label: '☠️ 毒', color: '#a3e635', status: 'poison' },
}

export const STATUS_COLOR: Record<StatusKind, string> = {
  freeze: '#7dd3fc',
  burn: '#fb923c',
  shock: '#facc15',
  poison: '#a3e635',
}

/** 角色攻擊附帶的屬性：命中時有機率讓對手進入對應異常狀態 */
export const CHAR_ELEMENT: Partial<Record<CharacterId, Element>> = {
  miyabi: 'ice',
  ellen: 'ice',
  hutao: 'fire',
  ruri: 'fire',
  mario: 'fire',
  firefly: 'fire',
  bomber: 'fire',
  ichi: 'thunder',
  marisa: 'thunder',
  lumine: 'thunder',
  ben: 'poison',
  frogger: 'poison',
  creeper: 'poison',
}

/** 依招式傷害與是否為大招，決定觸發機率 */
export function elementChance(dmg: number, isUlt: boolean): number {
  if (isUlt) return 1
  return Math.max(0.14, Math.min(0.5, 0.14 + dmg * 0.012))
}

/** 各異常狀態持續時間（毫秒） */
export function statusDuration(kind: StatusKind, dmg: number, isUlt: boolean): number {
  switch (kind) {
    case 'freeze': return isUlt ? 2200 : Math.min(1800, 800 + dmg * 22)
    case 'shock': return isUlt ? 1200 : Math.min(900, 450 + dmg * 12)
    case 'burn': return 3200
    case 'poison': return 4200
  }
}
