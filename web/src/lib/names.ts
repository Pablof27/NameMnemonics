import namesData from '../../../nombres.json'
import type { Gender, Grade, NamePool } from '../types'
import { shuffle } from './shuffle'

const POOLS: Record<NamePool, Record<Gender, string[]>> = {
  common: { male: namesData.nombresFacil.H, female: namesData.nombresFacil.M },
  extended: { male: namesData.nombresDificil.H, female: namesData.nombresDificil.M },
}

const HINTS: Record<string, string[]> = namesData.pistas

export const POINTS: Record<Grade, number> = { correct: 1, close: 0.5, wrong: 0 }

/** Spanish words that sound like the name, to build a mental image with (Raquel → raqueta). */
export function getHints(name: string): string[] {
  return HINTS[name] ?? []
}

/** Lowercase letters without accents, so "Álvaro", "alvaro " and "ALVARO" compare equal. */
function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '')
}

const KNOWN_NAMES = new Set(
  Object.values(POOLS)
    .flatMap((byGender) => Object.values(byGender).flat())
    .map(normalizeName),
)

/** Edit distance where insertions, deletions, substitutions and adjacent swaps each count as one. */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 || j === 0 ? i + j : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

/** Gives every face a distinct name that fits its gender, avoiding look-alikes such as Marco/Marcos. */
export function assignNames(genders: Gender[], pool: NamePool): string[] {
  const used: string[] = []
  return genders.map((gender) => {
    const candidates = shuffle(POOLS[pool][gender])
    const name =
      candidates.find((candidate) => used.every((other) => editDistance(normalizeName(candidate), other) > 1)) ??
      candidates[0]
    used.push(normalizeName(name))
    return name
  })
}

export function gradeAnswer(response: string, name: string): Grade {
  const given = normalizeName(response)
  const expected = normalizeName(name)
  if (given === expected) return 'correct'
  // A typo still proves you remembered the name, unless it spells a different real name.
  const tolerance = expected.length >= 8 ? 2 : expected.length >= 4 ? 1 : 0
  if (given && !KNOWN_NAMES.has(given) && editDistance(given, expected) <= tolerance) return 'close'
  return 'wrong'
}
