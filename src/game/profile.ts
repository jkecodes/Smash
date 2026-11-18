import { create } from 'zustand';

export interface PlayerProfile {
  nickname: string;
  avatarDataUrl: string | null;
  wins: number;
  losses: number;
  totalKos: number;
}

export interface AccountRecord {
  uid: string;
  username: string;
  passwordHash: string;
  profile: PlayerProfile;
  createdAt: number;
}

export type AuthResult =
  | { ok: true; uid: string }
  | { ok: false; error: string };

const GUEST_STORAGE_KEY = 'smash_player_profile_v1';
const ACCOUNTS_STORAGE_KEY = 'smash_accounts_v1';
const SESSION_STORAGE_KEY = 'smash_session_uid_v1';

const DEFAULT_PROFILE: PlayerProfile = {
  nickname: 'PLAYER 1',
  avatarDataUrl: null,
  wins: 0,
  losses: 0,
  totalKos: 0,
};

/** Pure-JS salted password hash (works on non-HTTPS LAN origins where crypto.subtle is unavailable). */
function hashPassword(password: string, salt: string): string {
  const input = `${salt}::${password}::smash_salt_v1`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + ((i << 5) | (i >>> 2));
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${p1}${p2}`;
}

function loadAccounts(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: AccountRecord[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage quota errors
  }
}

function loadGuestProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveGuestProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

function loadSessionUid(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveSessionUid(uid: string | null): void {
  try {
    if (uid) {
      localStorage.setItem(SESSION_STORAGE_KEY, uid);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function generateUniqueUid(existing: AccountRecord[]): string {
  const used = new Set(existing.map((a) => a.uid));
  for (let i = 0; i < 64; i++) {
    const num = 10000000 + Math.floor(Math.random() * 90000000);
    const candidate = String(num);
    if (!used.has(candidate)) return candidate;
  }
  return String(Date.now()).slice(-8).padStart(8, '1');
}

function resolveInitialState(): {
  uid: string;
  username: string | null;
  profile: PlayerProfile;
} {
  const sessionUid = loadSessionUid();
  if (sessionUid) {
    const accounts = loadAccounts();
    const account = accounts.find((a) => a.uid === sessionUid);
    if (account) {
      return {
        uid: account.uid,
        username: account.username,
        profile: { ...DEFAULT_PROFILE, ...account.profile },
      };
    }
    saveSessionUid(null);
  }
  return {
    uid: 'GUEST',
    username: null,
    profile: loadGuestProfile(),
  };
}

function persistActiveProfile(
  uid: string,
  profile: PlayerProfile
): void {
  if (uid === 'GUEST') {
    saveGuestProfile(profile);
    return;
  }
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.uid === uid);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], profile };
    saveAccounts(accounts);
  }
}

interface ProfileStore extends PlayerProfile {
  uid: string;
  username: string | null;
  register: (username: string, password: string, nickname?: string) => AuthResult;
  login: (username: string, password: string) => AuthResult;
  logout: () => void;
  setNickname: (nickname: string) => void;
  setAvatar: (dataUrl: string | null) => void;
  recordMatch: (won: boolean, kos: number) => void;
  resetStats: () => void;
}

const initial = resolveInitialState();

export const useProfileStore = create<ProfileStore>((set, get) => ({
  ...initial.profile,
  uid: initial.uid,
  username: initial.username,

  register: (rawUsername, password, rawNickname) => {
    const username = rawUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      return { ok: false, error: '帳號需為 3~16 位英文、數字或底線' };
    }
    if (password.length < 4) {
      return { ok: false, error: '密碼長度至少需要 4 個字元' };
    }
    const accounts = loadAccounts();
    if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, error: '此帳號已被註冊' };
    }
    const uid = generateUniqueUid(accounts);
    const nickname = (rawNickname?.trim() || username).slice(0, 16);
    const profile: PlayerProfile = {
      nickname,
      avatarDataUrl: null,
      wins: 0,
      losses: 0,
      totalKos: 0,
    };
    const record: AccountRecord = {
      uid,
      username,
      passwordHash: hashPassword(password, uid),
      profile,
      createdAt: Date.now(),
    };
    saveAccounts([...accounts, record]);
    saveSessionUid(uid);
    set({ uid, username, ...profile });
    return { ok: true, uid };
  },

  login: (rawUsername, password) => {
    const username = rawUsername.trim();
    if (!username || !password) {
      return { ok: false, error: '請輸入帳號與密碼' };
    }
    const accounts = loadAccounts();
    const account = accounts.find(
      (a) => a.username.toLowerCase() === username.toLowerCase()
    );
    if (!account) {
      return { ok: false, error: '找不到此帳號' };
    }
    if (account.passwordHash !== hashPassword(password, account.uid)) {
      return { ok: false, error: '密碼錯誤' };
    }
    saveSessionUid(account.uid);
    const profile = { ...DEFAULT_PROFILE, ...account.profile };
    set({ uid: account.uid, username: account.username, ...profile });
    return { ok: true, uid: account.uid };
  },

  logout: () => {
    saveSessionUid(null);
    const guest = loadGuestProfile();
    set({ uid: 'GUEST', username: null, ...guest });
  },

  setNickname: (nickname) => {
    const clean = nickname.trim().slice(0, 16) || 'PLAYER 1';
    const state = get();
    const next: PlayerProfile = {
      nickname: clean,
      avatarDataUrl: state.avatarDataUrl,
      wins: state.wins,
      losses: state.losses,
      totalKos: state.totalKos,
    };
    persistActiveProfile(state.uid, next);
    set(next);
  },

  setAvatar: (avatarDataUrl) => {
    const state = get();
    const next: PlayerProfile = {
      nickname: state.nickname,
      avatarDataUrl,
      wins: state.wins,
      losses: state.losses,
      totalKos: state.totalKos,
    };
    persistActiveProfile(state.uid, next);
    set(next);
  },

  recordMatch: (won, kos) => {
    const state = get();
    const next: PlayerProfile = {
      nickname: state.nickname,
      avatarDataUrl: state.avatarDataUrl,
      wins: state.wins + (won ? 1 : 0),
      losses: state.losses + (won ? 0 : 1),
      totalKos: state.totalKos + kos,
    };
    persistActiveProfile(state.uid, next);
    set(next);
  },

  resetStats: () => {
    const state = get();
    const next: PlayerProfile = {
      nickname: state.nickname,
      avatarDataUrl: state.avatarDataUrl,
      wins: 0,
      losses: 0,
      totalKos: 0,
    };
    persistActiveProfile(state.uid, next);
    set(next);
  },
}));

/** Resize an uploaded image file to a 128x128 square JPEG data URL for localStorage. */
export function resizeAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
