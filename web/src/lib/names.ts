import namesData from '../../../nombres.json'
import type { Gender, Grade, NamePool, Person } from '../types'
import { shuffle } from './shuffle'

const POOLS: Record<NamePool, Record<Gender, string[]>> = {
  common: { male: namesData.nombresFacil.H, female: namesData.nombresFacil.M },
  extended: { male: namesData.nombresDificil.H, female: namesData.nombresDificil.M },
}

const HINTS: Record<string, string[]> = namesData.pistas

/** Every known name once, with its gender, for drills that aren't tied to a face. */
export const ALL_NAMES: { name: string; gender: Gender }[] = [
  ...new Map(
    Object.values(POOLS).flatMap((byGender) =>
      (Object.entries(byGender) as [Gender, string[]][]).flatMap(([gender, names]) =>
        names.map((name) => [name, { name, gender }] as const),
      ),
    ),
  ).values(),
]

/** Spanish words that sound like the name, to build a mental image with (Raquel → raqueta). */
export function getHints(name: string): string[] {
  return HINTS[name] ?? []
}

/** Lowercase letters without accents, so "Álvaro", "alvaro " and "ALVARO" compare equal. */
export function normalizeName(value: string): string {
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

/** Names one typo apart, such as Marco and Marcos, are too easy to mix up to appear together. */
export function isLookalike(a: string, b: string): boolean {
  return editDistance(normalizeName(a), normalizeName(b)) <= 1
}

/** Gives every face a distinct name that fits its gender, avoiding look-alikes such as Marco/Marcos. */
export function assignNames(genders: Gender[], pool: NamePool, taken: string[] = []): string[] {
  const used = taken.map(normalizeName)
  return genders.map((gender) => {
    const candidates = shuffle(POOLS[pool][gender]).filter((candidate) => !used.includes(normalizeName(candidate)))
    const name =
      candidates.find((candidate) => used.every((other) => editDistance(normalizeName(candidate), other) > 1)) ??
      candidates[0]
    used.push(normalizeName(name))
    return name
  })
}

/**
 * The right name plus same-gender alternatives. Names from the same event come first because
 * telling those apart is the real challenge.
 */
export function nameChoices(person: Person, people: Person[], pool: NamePool, count = 4): string[] {
  const picked = [person.name]
  const sameEvent = shuffle(people.filter((other) => other.gender === person.gender && other.id !== person.id))
  for (const name of [...sameEvent.map((other) => other.name), ...shuffle(POOLS[pool][person.gender])]) {
    if (picked.length >= count) break
    if (picked.every((other) => !isLookalike(other, name))) picked.push(name)
  }
  return shuffle(picked)
}

/** The right face plus other faces from the event, same gender first. */
export function faceChoices(person: Person, people: Person[], count = 4): Person[] {
  const others = people.filter((other) => other.id !== person.id)
  const sameGender = shuffle(others.filter((other) => other.gender === person.gender))
  const otherGender = shuffle(others.filter((other) => other.gender !== person.gender))
  return shuffle([person, ...[...sameGender, ...otherGender].slice(0, count - 1)])
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
