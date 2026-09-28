import type { Difficulty, NamePool, Settings } from './types'

export const FACE_LIMITS = { min: 3, max: 50 }
export const SECONDS_LIMITS = { min: 1, max: 30 }

export interface Level {
  id: string
  label: string
  difficulty: Difficulty
}

export const LEVELS: Level[] = [
  { id: 'beginner', label: 'Beginner', difficulty: { faceCount: 5, secondsPerFace: 10, namePool: 'common' } },
  { id: 'intermediate', label: 'Intermediate', difficulty: { faceCount: 10, secondsPerFace: 6, namePool: 'common' } },
  { id: 'advanced', label: 'Advanced', difficulty: { faceCount: 15, secondsPerFace: 4, namePool: 'extended' } },
  { id: 'expert', label: 'Expert', difficulty: { faceCount: 25, secondsPerFace: 3, namePool: 'extended' } },
]

export const POOL_LABELS: Record<NamePool, string> = {
  common: 'Common names',
  extended: 'Rare names too',
}

export function findLevel(settings: Settings): Level | undefined {
  return LEVELS.find(
    ({ difficulty }) =>
      difficulty.faceCount === settings.faceCount &&
      difficulty.secondsPerFace === settings.secondsPerFace &&
      difficulty.namePool === settings.namePool,
  )
}

const STORAGE_KEY = 'name-mnemonics:settings'

export function loadSettings(): Settings {
  const fallback: Settings = { ...LEVELS[0].difficulty, hints: false }
  try {
    const saved: Partial<Settings> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      faceCount: clamp(saved.faceCount, FACE_LIMITS, fallback.faceCount),
      secondsPerFace: clamp(saved.secondsPerFace, SECONDS_LIMITS, fallback.secondsPerFace),
      namePool: saved.namePool === 'extended' ? 'extended' : 'common',
      hints: saved.hints === true,
    }
  } catch {
    return fallback
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function clamp(value: unknown, { min, max }: { min: number; max: number }, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}
