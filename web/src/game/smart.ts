import type { Difficulty, EventConfig, RecallMode } from '../types'

/** Difficulty steps for Smart practice, from gentle to championship pace. */
const STEPS: Difficulty[] = [
  { faceCount: 4, secondsPerFace: 8, namePool: 'common' },
  { faceCount: 5, secondsPerFace: 7, namePool: 'common' },
  { faceCount: 6, secondsPerFace: 6, namePool: 'common' },
  { faceCount: 7, secondsPerFace: 6, namePool: 'common' },
  { faceCount: 8, secondsPerFace: 5, namePool: 'common' },
  { faceCount: 8, secondsPerFace: 5, namePool: 'extended' },
  { faceCount: 10, secondsPerFace: 5, namePool: 'extended' },
  { faceCount: 10, secondsPerFace: 4, namePool: 'extended' },
  { faceCount: 12, secondsPerFace: 4, namePool: 'extended' },
  { faceCount: 14, secondsPerFace: 4, namePool: 'extended' },
  { faceCount: 15, secondsPerFace: 3, namePool: 'extended' },
  { faceCount: 18, secondsPerFace: 3, namePool: 'extended' },
  { faceCount: 20, secondsPerFace: 3, namePool: 'extended' },
  { faceCount: 25, secondsPerFace: 3, namePool: 'extended' },
  { faceCount: 30, secondsPerFace: 2, namePool: 'extended' },
]

export const SMART_MAX = STEPS.length

export function smartDifficulty(level: number): Difficulty {
  return STEPS[Math.min(Math.max(level, 1), SMART_MAX) - 1]
}

/**
 * A staircase that keeps accuracy in the sweet spot for learning (about 85 %):
 * step up after a strong round, down after a rough one.
 */
export function nextSmartLevel(level: number, accuracy: number): number {
  if (accuracy >= 0.85) return Math.min(SMART_MAX, level + 1)
  if (accuracy < 0.65) return Math.max(1, level - 1)
  return level
}

export function freeEvent(difficulty: Difficulty, recall: RecallMode, smartLevel?: number): EventConfig {
  return {
    kind: 'free',
    id: smartLevel ? `smart-${smartLevel}` : 'free',
    title: smartLevel ? `Smart practice · level ${smartLevel}` : 'Free practice',
    emoji: smartLevel ? '🧠' : '🎛️',
    flavor: smartLevel
      ? 'Adapts to you: a strong round steps up the difficulty, a rough one steps it down.'
      : 'Your rules, your pace.',
    rules: {
      ...difficulty,
      recall,
      hints: 'optional',
      faceFirst: false,
      vips: 0,
      smallTalk: 0,
      lifelines: 1,
    },
    smart: smartLevel !== undefined,
  }
}
