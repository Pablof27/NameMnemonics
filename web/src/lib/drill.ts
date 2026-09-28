import namesData from '../../../nombres.json'
import type { Gender } from '../types'
import { ALL_NAMES, isLookalike, normalizeName } from './names'
import { pick, shuffle } from './shuffle'

const HINTS: Record<string, string[]> = namesData.pistas

interface Entry {
  name: string
  gender: Gender
  key: string
  words: string[]
}

const ENTRIES: Entry[] = ALL_NAMES.filter(({ name }) => HINTS[name]?.length).map(({ name, gender }) => ({
  name,
  gender,
  key: normalizeName(name),
  words: HINTS[name],
}))

/** How many names share each picture word: "whose picture is this?" only uses words with a single owner. */
const WORD_OWNERS = new Map<string, number>()
for (const entry of ENTRIES) for (const word of entry.words) WORD_OWNERS.set(word, (WORD_OWNERS.get(word) ?? 0) + 1)

const isUnique = (word: string) => WORD_OWNERS.get(word) === 1

export interface DrillQuestion {
  /** encode: from a name to its picture · decode: from a picture back to the name. */
  kind: 'encode' | 'decode'
  name: string
  word: string
  options: string[]
  answer: number
}

interface QuestionOptions {
  /** Normalized names that must not appear, such as the guests of the current event. */
  exclude?: ReadonlySet<string>
  /** Prefer options that start with the same letter. */
  hard?: boolean
  previous?: string
}

/** Other names to use as wrong options, never ones that could pass for the right answer. */
function rivals(target: Entry, pool: Entry[], hard: boolean): Entry[] {
  const valid = pool.filter(
    (entry) =>
      entry.key !== target.key && entry.key.slice(0, 3) !== target.key.slice(0, 3) && !isLookalike(entry.name, target.name),
  )
  const sameGender = shuffle(valid.filter((entry) => entry.gender === target.gender))
  const sameInitial = hard ? sameGender.filter((entry) => entry.key[0] === target.key[0]) : []
  return [...new Set([...sameInitial, ...sameGender, ...shuffle(valid)])]
}

export function drillQuestion({ exclude, hard = false, previous }: QuestionOptions = {}): DrillQuestion {
  const pool = ENTRIES.filter((entry) => !exclude?.has(entry.key) && entry.name !== previous)

  if (Math.random() < 0.5) {
    // Words that spell out the name itself ("color rosa" for Rosa) would give the answer away.
    const clues = (entry: Entry) => entry.words.filter((word) => isUnique(word) && !normalizeName(word).includes(entry.key))
    const target = pick(pool.filter((entry) => clues(entry).length > 0))
    const word = pick(clues(target))
    const options = shuffle([target.name, ...rivals(target, pool, hard).slice(0, 3).map((entry) => entry.name)])
    return { kind: 'decode', name: target.name, word, options, answer: options.indexOf(target.name) }
  }

  const target = pick(pool)
  const word = pick(target.words)
  const words = new Set([word])
  for (const rival of rivals(target, pool, hard)) {
    if (words.size === 4) break
    const candidates = rival.words.filter((candidate) => !target.words.includes(candidate) && !words.has(candidate))
    if (candidates.length > 0) words.add(pick(candidates))
  }
  const options = shuffle([...words])
  return { kind: 'encode', name: target.name, word, options, answer: options.indexOf(word) }
}
