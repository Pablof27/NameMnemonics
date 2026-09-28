import { shuffle, pick } from '../lib/shuffle'
import { isUnlocked } from './progression'
import type { Outcome } from './profile'
import { seededRandom } from './rng'

export interface QuestState {
  id: string
  target: number
  progress: number
  done: boolean
}

export interface QuestContext {
  level: number
  contactsDue: boolean
  dailyDone: boolean
  starsLeft: number
  /** Most faces in one unlocked event, which caps the combos that are possible. */
  longestEvent: number
}

interface QuestDef {
  id: string
  targets: number[]
  xp: number
  /** sum: progress adds up over the day · max: one game has to reach the target. */
  mode: 'sum' | 'max'
  title: (target: number) => string
  available?: (context: QuestContext) => boolean
  fits?: (target: number, context: QuestContext) => boolean
  measure: (outcome: Outcome, newStars: number) => number
}

function remembered(outcome: Outcome): number {
  switch (outcome.kind) {
    case 'event':
      return outcome.answers.filter((answer) => answer.grade !== 'wrong').length
    case 'party':
      return outcome.correct
    case 'reunion':
      return outcome.remembered
    default:
      return 0
  }
}

const QUESTS: QuestDef[] = [
  {
    id: 'names',
    targets: [10, 15, 20],
    xp: 40,
    mode: 'sum',
    title: (target) => `Remember ${target} names`,
    measure: remembered,
  },
  {
    id: 'combo',
    targets: [3, 5, 8],
    xp: 40,
    mode: 'max',
    title: (target) => `Get ${target} names right in a row`,
    fits: (target, { longestEvent }) => target <= longestEvent,
    measure: (outcome) =>
      outcome.kind === 'event' ? outcome.score.bestCombo : outcome.kind === 'party' ? outcome.bestCombo : 0,
  },
  {
    id: 'anchor',
    targets: [6, 10],
    xp: 40,
    mode: 'sum',
    title: (target) => `Anchor ${target} faces by tapping a feature`,
    available: ({ level }) => level >= 2,
    measure: (outcome) =>
      outcome.kind === 'event' ? Object.values(outcome.study).filter((record) => record.anchor).length : 0,
  },
  {
    id: 'perfect',
    targets: [1],
    xp: 60,
    mode: 'sum',
    title: () => 'Finish an event without a single mistake',
    measure: (outcome) => (outcome.kind === 'event' && outcome.score.perfect ? 1 : 0),
  },
  {
    id: 'no-hints',
    targets: [1, 2],
    xp: 40,
    mode: 'sum',
    title: (target) => (target === 1 ? 'Finish an event with hints off' : `Finish ${target} events with hints off`),
    available: ({ level }) => level >= 3,
    measure: (outcome) => (outcome.kind === 'event' && !outcome.hints ? 1 : 0),
  },
  {
    id: 'lightning',
    targets: [5, 8],
    xp: 40,
    mode: 'sum',
    title: (target) => `Give ${target} lightning-fast answers`,
    measure: (outcome) =>
      outcome.kind === 'event' ? outcome.score.answers.filter((item) => item.lightning === 50).length : 0,
  },
  {
    id: 'events',
    targets: [2, 3],
    xp: 40,
    mode: 'sum',
    title: (target) => `Complete ${target} events`,
    measure: (outcome) => (outcome.kind === 'event' ? 1 : 0),
  },
  {
    id: 'stars',
    targets: [2, 3],
    xp: 50,
    mode: 'sum',
    title: (target) => `Earn ${target} new stars on the Social Circuit`,
    available: ({ starsLeft }) => starsLeft >= 6,
    measure: (_outcome, newStars) => newStars,
  },
  {
    id: 'sprint',
    targets: [1500, 2500],
    xp: 40,
    mode: 'max',
    title: (target) => `Score ${target.toLocaleString('en')} in Picture Sprint`,
    available: ({ level }) => isUnlocked('sprint', level),
    measure: (outcome) => (outcome.kind === 'sprint' ? outcome.score : 0),
  },
  {
    id: 'party',
    targets: [3, 5],
    xp: 50,
    mode: 'max',
    title: (target) => `Survive ${target} waves in Endless Party`,
    available: ({ level }) => isUnlocked('party', level),
    measure: (outcome) => (outcome.kind === 'party' ? outcome.waves : 0),
  },
  {
    id: 'reunion',
    targets: [1],
    xp: 50,
    mode: 'sum',
    title: () => 'Catch up with your contacts in a Reunion',
    available: ({ contactsDue }) => contactsDue,
    measure: (outcome) => (outcome.kind === 'reunion' ? 1 : 0),
  },
  {
    id: 'daily',
    targets: [1],
    xp: 50,
    mode: 'sum',
    title: () => 'Complete today’s Daily Event',
    available: ({ level, dailyDone }) => isUnlocked('daily', level) && !dailyDone,
    measure: (outcome) => (outcome.kind === 'event' && outcome.event.kind === 'daily' ? 1 : 0),
  },
]

export const QUEST_COUNT = 3
export const ALL_QUESTS_BONUS = 100

export function questsForDay(day: string, context: QuestContext): QuestState[] {
  const random = seededRandom(`quests:${day}`)
  const options = QUESTS.map((quest) => ({
    quest,
    targets: quest.targets.filter((target) => quest.fits?.(target, context) ?? true),
  })).filter(({ quest, targets }) => targets.length > 0 && (quest.available?.(context) ?? true))
  return shuffle(options, random)
    .slice(0, QUEST_COUNT)
    .map(({ quest, targets }) => ({ id: quest.id, target: pick(targets, random), progress: 0, done: false }))
}

export function questTitle(quest: QuestState): string {
  return QUESTS.find((def) => def.id === quest.id)?.title(quest.target) ?? quest.id
}

export function questXp(quest: QuestState): number {
  return QUESTS.find((def) => def.id === quest.id)?.xp ?? 0
}

/** Advances the quests in place and returns the ones this outcome completed. */
export function advanceQuests(quests: QuestState[], outcome: Outcome, newStars: number): QuestState[] {
  const completed: QuestState[] = []
  for (const quest of quests) {
    const def = QUESTS.find((candidate) => candidate.id === quest.id)
    if (quest.done || !def) continue
    const value = def.measure(outcome, newStars)
    quest.progress = Math.min(quest.target, def.mode === 'max' ? Math.max(quest.progress, value) : quest.progress + value)
    if (quest.progress >= quest.target) {
      quest.done = true
      completed.push(quest)
    }
  }
  return completed
}
