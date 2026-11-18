import { create } from 'zustand'

const STORAGE_KEY = 'smash.profile.v1'

export interface PlayerProfile {
  nickname: string
  avatarDataUrl: string | null
  wins: number
  losses: number
  totalKos: number
}

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        nickname: typeof p.nickname === 'string' && p.nickname.trim() ? p.nickname : 'PLAYER 1',
        avatarDataUrl: typeof p.avatarDataUrl === 'string' ? p.avatarDataUrl : null,
        wins: Number(p.wins) || 0,
        losses: Number(p.losses) || 0,
        totalKos: Number(p.totalKos) || 0,
      }
    }
  } catch { /* ignore */ }
  return { nickname: 'PLAYER 1', avatarDataUrl: null, wins: 0, losses: 0, totalKos: 0 }
}

function saveProfile(p: PlayerProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch { /* ignore */ }
}

interface ProfileStore extends PlayerProfile {
  setNickname(name: string): void
  setAvatar(dataUrl: string | null): void
  recordMatch(won: boolean, kos: number): void
  resetStats(): void
}

export const useProfileStore = create<ProfileStore>((set, get) => {
  const init = loadProfile()
  return {
    ...init,
    setNickname: (nickname) => {
      const next = { ...get(), nickname: nickname.slice(0, 16) || 'PLAYER 1' }
      saveProfile({ nickname: next.nickname, avatarDataUrl: next.avatarDataUrl, wins: next.wins, losses: next.losses, totalKos: next.totalKos })
      set({ nickname: next.nickname })
    },
    setAvatar: (avatarDataUrl) => {
      const g = get()
      saveProfile({ nickname: g.nickname, avatarDataUrl, wins: g.wins, losses: g.losses, totalKos: g.totalKos })
      set({ avatarDataUrl })
    },
    recordMatch: (won, kos) => {
      const g = get()
      const wins = g.wins + (won ? 1 : 0)
      const losses = g.losses + (won ? 0 : 1)
      const totalKos = g.totalKos + Math.max(0, kos)
      saveProfile({ nickname: g.nickname, avatarDataUrl: g.avatarDataUrl, wins, losses, totalKos })
      set({ wins, losses, totalKos })
    },
    resetStats: () => {
      const g = get()
      saveProfile({ nickname: g.nickname, avatarDataUrl: g.avatarDataUrl, wins: 0, losses: 0, totalKos: 0 })
      set({ wins: 0, losses: 0, totalKos: 0 })
    },
  }
})

/** 將上傳圖片裁切縮放為 160x160 JPEG DataURL，確保可穩定存入 localStorage */
export function resizeAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('讀取圖片失敗'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('圖片格式不支援'))
      img.onload = () => {
        const size = 160
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
