/** XP needed to go from `level` to the next one. Early levels come fast, later ones take longer. */
export function xpForLevel(level: number): number {
  return 150 + 50 * (level - 1)
}

export interface LevelInfo {
  level: number
  /** XP earned inside the current level. */
  into: number
  needed: number
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  let rest = xp
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level)
    level++
  }
  return { level, into: rest, needed: xpForLevel(level) }
}

const RANKS = [
  { level: 1, title: 'Stranger' },
  { level: 3, title: 'Newcomer' },
  { level: 5, title: 'Acquaintance' },
  { level: 8, title: 'Friendly Face' },
  { level: 12, title: 'Regular' },
  { level: 16, title: 'Networker' },
  { level: 20, title: 'Socialite' },
  { level: 25, title: 'Host' },
  { level: 30, title: 'Diplomat' },
  { level: 40, title: 'Ambassador' },
  { level: 50, title: 'Memory Master' },
]

export function rankFor(level: number): string {
  return RANKS.findLast((rank) => level >= rank.level)!.title
}

export function nextRank(level: number): { level: number; title: string } | undefined {
  return RANKS.find((rank) => rank.level > level)
}

export type Feature = 'sprint' | 'daily' | 'free' | 'party'

export interface Unlock {
  feature: Feature
  level: number
  title: string
  emoji: string
  description: string
}

export const UNLOCKS: Unlock[] = [
  {
    feature: 'sprint',
    level: 2,
    title: 'Picture Sprint',
    emoji: '🎨',
    description: 'A 60-second drill that turns names into pictures.',
  },
  {
    feature: 'daily',
    level: 3,
    title: 'Daily Event',
    emoji: '📅',
    description: 'A new themed event every day, with a result to share.',
  },
  {
    feature: 'free',
    level: 4,
    title: 'Free Practice',
    emoji: '🎛️',
    description: 'Your own rules, or Smart difficulty that adapts to you.',
  },
  {
    feature: 'party',
    level: 5,
    title: 'Endless Party',
    emoji: '🎉',
    description: 'Guests keep arriving. Remember them all with three lives.',
  },
]

export function unlockFor(feature: Feature): Unlock {
  return UNLOCKS.find((unlock) => unlock.feature === feature)!
}

export function isUnlocked(feature: Feature, level: number): boolean {
  return level >= unlockFor(feature).level
}

export function unlocksBetween(before: number, after: number): Unlock[] {
  return UNLOCKS.filter((unlock) => unlock.level > before && unlock.level <= after)
}
