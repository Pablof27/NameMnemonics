import { pick } from '../lib/shuffle'
import type { EventConfig, EventRules, Grade } from '../types'
import { addDays, daysBetween, seededRandom } from './rng'
import { starThresholds } from './stages'

interface Theme {
  title: string
  emoji: string
  flavor: string
  rules: Partial<EventRules>
}

const THEMES: Theme[] = [
  {
    title: 'Speed Dating',
    emoji: '💘',
    flavor: 'Eight dates, three seconds each. No pressure.',
    rules: { faceCount: 8, secondsPerFace: 3 },
  },
  {
    title: 'Rare Names Night',
    emoji: '🦜',
    flavor: 'A gathering of Baltasars, Genovevas and Casimiros.',
    rules: { faceCount: 7, secondsPerFace: 6, namePool: 'extended' },
  },
  {
    title: 'Masquerade Ball',
    emoji: '🎭',
    flavor: 'Masks off! Find each guest from their name.',
    rules: { faceCount: 10, secondsPerFace: 4, recall: 'faces' },
  },
  {
    title: 'Blind Date',
    emoji: '🙈',
    flavor: 'No hints. Look at the face first, then hear the name.',
    rules: { faceCount: 6, secondsPerFace: 5, faceFirst: true, hints: 'off' },
  },
  {
    title: 'Long Networking Day',
    emoji: '🗣️',
    flavor: 'Lots of small talk before you need anyone’s name.',
    rules: { faceCount: 8, secondsPerFace: 5, smallTalk: 30 },
  },
  {
    title: 'VIP Lounge',
    emoji: '🌟',
    flavor: 'Three VIPs are hiding in the crowd. They score double.',
    rules: { faceCount: 8, secondsPerFace: 5, vips: 3 },
  },
  {
    title: 'Crowded Room',
    emoji: '👥',
    flavor: 'Twelve people, pick their names fast.',
    rules: { faceCount: 12, secondsPerFace: 4, recall: 'choice' },
  },
]

const BASE_RULES: EventRules = {
  faceCount: 8,
  secondsPerFace: 5,
  namePool: 'common',
  recall: 'typed',
  hints: 'optional',
  faceFirst: false,
  vips: 0,
  smallTalk: 0,
  lifelines: 1,
}

const FIRST_DAY = '2026-01-01'

export function dailyNumber(day: string): number {
  return daysBetween(FIRST_DAY, day) + 1
}

function themeIndex(day: string): number {
  return THEMES.indexOf(pick(THEMES, seededRandom(`daily:${day}`)))
}

export function dailyEvent(day: string): EventConfig {
  let index = themeIndex(day)
  // Never the same theme two days in a row.
  if (index === themeIndex(addDays(day, -1))) index = (index + 1) % THEMES.length
  const theme = THEMES[index]
  const rules = { ...BASE_RULES, ...theme.rules }
  return {
    kind: 'daily',
    id: day,
    title: theme.title,
    emoji: theme.emoji,
    flavor: theme.flavor,
    rules,
    stars: starThresholds(rules.faceCount),
  }
}

export interface DailyRecord {
  day: string
  title: string
  score: number
  stars: number
  accuracy: number
  grades: Grade[]
}

const GRADE_SQUARES: Record<Grade, string> = { correct: '🟩', close: '🟨', wrong: '🟥' }

export function shareText(record: DailyRecord, streak: number): string {
  const points = record.grades.reduce((sum, grade) => sum + (grade === 'correct' ? 1 : grade === 'close' ? 0.5 : 0), 0)
  const stars = record.stars > 0 ? ` ${'⭐'.repeat(record.stars)}` : ''
  return [
    `Name Mnemonics · Daily #${dailyNumber(record.day)} · ${record.title}`,
    `${record.grades.map((grade) => GRADE_SQUARES[grade]).join('')} ${points}/${record.grades.length}${stars}`,
    streak > 1 ? `🔥 ${streak}-day streak` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
