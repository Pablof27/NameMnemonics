import { FACE_LIMITS } from '../settings'
import type { Answer, EventConfig, RecallMode, StudyRecord } from '../types'
import { evaluateAchievements, type Achievement } from './achievements'
import type { DailyRecord } from './daily'
import { isUnlocked, levelInfo, unlocksBetween, type Unlock } from './progression'
import { advanceQuests, ALL_QUESTS_BONUS, questsForDay, questTitle, questXp, type QuestState } from './quests'
import { dayKey, daysBetween } from './rng'
import { starsFor, type EventScore } from './scoring'
import { nextSmartLevel } from './smart'
import {
  CHAPTERS,
  chapterUnlocked,
  MAX_STARS,
  stageUnlocked,
  totalStars,
  type Chapter,
  type StageProgress,
} from './stages'

export interface Tally {
  hits: number
  total: number
}

export interface Stats {
  events: number
  perfectEvents: number
  faces: number
  /** Names remembered anywhere: events, parties and reunions. */
  names: number
  bestCombo: number
  lightning: number
  anchors: number
  anchored: Tally
  unanchored: Tally
  hinted: Tally
  unhinted: Tally
  byMode: Record<RecallMode, Tally>
  vips: number
  quickStudy: number
  reunions: number
  reviews: number
  remembered: number
  contacts: number
  lifelong: number
  sprints: number
  sprintBest: number
  parties: number
  partyBestScore: number
  partyBestWaves: number
  partyBestGuests: number
  dailies: number
  quests: number
  questDays: number
  freeBest: number
}

export interface Streak {
  count: number
  best: number
  lastDay: string | null
  freezes: number
}

export interface ContactsSummary {
  total: number
  nextDue: string | null
}

export interface Profile {
  version: 1
  xp: number
  stages: StageProgress
  stats: Stats
  history: { day: string; accuracy: number }[]
  streak: Streak
  /** The latest official Daily Event result. */
  daily: DailyRecord | null
  quests: { day: string; list: QuestState[]; bonus: boolean }
  achievements: Record<string, number>
  smartLevel: number
  /** Last choice for stages where hints are optional. */
  hints: boolean
  contacts: ContactsSummary
  sound: boolean
  welcomed: boolean
}

export interface EventOutcome {
  kind: 'event'
  event: EventConfig
  answers: Answer[]
  study: Record<string, StudyRecord>
  hints: boolean
  score: EventScore
  /** The same faces again, so nobody new was met. */
  retry: boolean
  newContacts: number
}

export interface ReunionOutcome {
  kind: 'reunion'
  reviewed: number
  remembered: number
  /** Contacts that just reached the top tier. */
  lifelong: number
  contacts: ContactsSummary
}

export interface PartyOutcome {
  kind: 'party'
  score: number
  waves: number
  guests: number
  correct: number
  bestCombo: number
}

export interface SprintOutcome {
  kind: 'sprint'
  score: number
  correct: number
  answered: number
}

export type Outcome = EventOutcome | ReunionOutcome | PartyOutcome | SprintOutcome

export interface StarChange {
  before: number
  earned: number
  after: number
  failedBefore: boolean
}

export interface Rewards {
  lines: { label: string; xp: number }[]
  xpBefore: number
  xpAfter: number
  achievements: Achievement[]
  quests: { title: string; xp: number }[]
  streak: { count: number; extended: boolean; freezesUsed: number; freezeEarned: boolean }
  unlocks: Unlock[]
  /** Venues of the Social Circuit that just opened. */
  venues: Chapter[]
  stars?: StarChange
  newBest: boolean
}

const STORAGE_KEY = 'name-mnemonics:profile'
const HISTORY_LENGTH = 30
const MAX_FREEZES = 2

const tally = (): Tally => ({ hits: 0, total: 0 })

export function newProfile(): Profile {
  return {
    version: 1,
    xp: 0,
    stages: {},
    stats: {
      events: 0,
      perfectEvents: 0,
      faces: 0,
      names: 0,
      bestCombo: 0,
      lightning: 0,
      anchors: 0,
      anchored: tally(),
      unanchored: tally(),
      hinted: tally(),
      unhinted: tally(),
      byMode: { typed: tally(), choice: tally(), faces: tally() },
      vips: 0,
      quickStudy: 0,
      reunions: 0,
      reviews: 0,
      remembered: 0,
      contacts: 0,
      lifelong: 0,
      sprints: 0,
      sprintBest: 0,
      parties: 0,
      partyBestScore: 0,
      partyBestWaves: 0,
      partyBestGuests: 0,
      dailies: 0,
      quests: 0,
      questDays: 0,
      freeBest: 0,
    },
    history: [],
    streak: { count: 0, best: 0, lastDay: null, freezes: 0 },
    daily: null,
    quests: { day: '', list: [], bonus: false },
    achievements: {},
    smartLevel: 1,
    hints: true,
    contacts: { total: 0, nextDue: null },
    sound: true,
    welcomed: false,
  }
}

export function loadProfile(): Profile {
  const fresh = newProfile()
  try {
    const saved: Partial<Profile> | null = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.version !== 1) return fresh
    // Fill in fields that older saves don't have yet.
    return { ...fresh, ...saved, stats: { ...fresh.stats, ...saved.stats } }
  } catch {
    return fresh
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Storage can be full or disabled; the game still works for this visit.
  }
}

/** Rolls the daily quests over when a new day starts. Returns the same object if nothing changed. */
export function withToday(profile: Profile, now: Date): Profile {
  const today = dayKey(now)
  if (profile.quests.day === today) return profile
  const level = levelInfo(profile.xp).level
  const stageSizes = CHAPTERS.flatMap((chapter) => chapter.stages)
    .filter((stage) => stageUnlocked(stage.id, profile.stages))
    .map((stage) => stage.rules.faceCount)
  const list = questsForDay(today, {
    level,
    contactsDue: profile.contacts.nextDue !== null && profile.contacts.nextDue <= today,
    dailyDone: profile.daily?.day === today,
    starsLeft: MAX_STARS - totalStars(profile.stages),
    // Party combos run across waves; free practice goes up to the face limit.
    longestEvent: isUnlocked('party', level)
      ? Infinity
      : isUnlocked('free', level)
        ? FACE_LIMITS.max
        : Math.max(...stageSizes),
  })
  return { ...profile, quests: { day: today, list, bonus: false } }
}

/** The streak as it stands today: `played` tells whether today already counts. */
export function streakToday(streak: Streak, today: string): { count: number; played: boolean } {
  if (!streak.lastDay) return { count: 0, played: false }
  const gap = daysBetween(streak.lastDay, today)
  if (gap <= 0) return { count: streak.count, played: true }
  // Missed days are covered by freezes, if there are enough.
  return { count: gap - 1 <= streak.freezes ? streak.count : 0, played: false }
}

function touchStreak(streak: Streak, today: string): Rewards['streak'] {
  const gap = streak.lastDay ? daysBetween(streak.lastDay, today) : Infinity
  if (gap <= 0) return { count: streak.count, extended: false, freezesUsed: 0, freezeEarned: false }
  let freezesUsed = 0
  if (gap - 1 <= streak.freezes) {
    freezesUsed = gap - 1
    streak.freezes -= freezesUsed
    streak.count++
  } else {
    streak.count = 1
  }
  streak.lastDay = today
  streak.best = Math.max(streak.best, streak.count)
  const freezeEarned = streak.count % 7 === 0 && streak.freezes < MAX_FREEZES
  if (freezeEarned) streak.freezes++
  return { count: streak.count, extended: true, freezesUsed, freezeEarned }
}

function count(target: Tally, hit: boolean) {
  target.total++
  if (hit) target.hits++
}

/** Applies a finished game to the profile and works out everything it earned. */
export function processOutcome(
  current: Profile,
  outcome: Outcome,
  now = new Date(),
): { profile: Profile; rewards: Rewards } {
  const today = dayKey(now)
  const profile = structuredClone(withToday(current, now))
  const { stats } = profile
  const lines: Rewards['lines'] = []
  let stars: StarChange | undefined
  let newBest = false

  switch (outcome.kind) {
    case 'event': {
      const { event, score, answers, study, hints } = outcome
      stats.events++
      stats.faces += answers.length
      if (score.perfect) stats.perfectEvents++
      stats.bestCombo = Math.max(stats.bestCombo, score.bestCombo)
      stats.lightning += score.answers.filter((item) => item.lightning === 50).length
      stats.quickStudy += score.answers.filter((item) => item.quick > 0).length
      stats.contacts += outcome.newContacts
      for (const answer of answers) {
        const hit = answer.grade !== 'wrong'
        const anchored = Boolean(study[answer.person.id]?.anchor)
        if (hit) stats.names++
        if (anchored) stats.anchors++
        if (hit && answer.person.vip) stats.vips++
        count(anchored ? stats.anchored : stats.unanchored, hit)
        count(hints ? stats.hinted : stats.unhinted, hit)
        count(stats.byMode[event.rules.recall], hit)
      }
      profile.history = [...profile.history, { day: today, accuracy: score.accuracy }].slice(-HISTORY_LENGTH)
      lines.push({ label: 'Event score', xp: Math.round(score.total / 10) }, { label: 'Event finished', xp: 10 })

      if (event.kind === 'campaign' && event.stars) {
        const record = profile.stages[event.id] ?? { stars: 0, best: 0, plays: 0, failed: false }
        const earned = starsFor(score.accuracy, event.stars)
        stars = { before: record.stars, earned, after: Math.max(record.stars, earned), failedBefore: record.failed }
        newBest = record.plays > 0 && score.total > record.best
        profile.stages[event.id] = {
          stars: stars.after,
          best: Math.max(record.best, score.total),
          plays: record.plays + 1,
          failed: record.failed || earned === 0,
        }
        const gained = stars.after - stars.before
        lines.push({ label: gained === 1 ? 'New star' : `${gained} new stars`, xp: 25 * gained })
      }
      if (event.kind === 'daily' && profile.daily?.day !== event.id) {
        stats.dailies++
        profile.daily = {
          day: event.id,
          title: event.title,
          score: score.total,
          stars: starsFor(score.accuracy, event.stars ?? []),
          accuracy: score.accuracy,
          grades: answers.map((answer) => answer.grade),
        }
        lines.push({ label: 'Daily Event bonus', xp: 50 })
      }
      if (event.kind === 'free') {
        newBest = stats.freeBest > 0 && score.total > stats.freeBest
        stats.freeBest = Math.max(stats.freeBest, score.total)
        if (event.smart) profile.smartLevel = nextSmartLevel(profile.smartLevel, score.accuracy)
      }
      break
    }
    case 'reunion':
      stats.reunions++
      stats.reviews += outcome.reviewed
      stats.remembered += outcome.remembered
      stats.names += outcome.remembered
      stats.lifelong += outcome.lifelong
      profile.contacts = outcome.contacts
      lines.push(
        { label: outcome.remembered === 1 ? 'Friend remembered' : `${outcome.remembered} friends remembered`, xp: 10 * outcome.remembered },
        { label: 'Reunion finished', xp: 5 },
      )
      break
    case 'party':
      stats.parties++
      stats.names += outcome.correct
      stats.bestCombo = Math.max(stats.bestCombo, outcome.bestCombo)
      newBest = stats.partyBestScore > 0 && outcome.score > stats.partyBestScore
      stats.partyBestScore = Math.max(stats.partyBestScore, outcome.score)
      stats.partyBestWaves = Math.max(stats.partyBestWaves, outcome.waves)
      stats.partyBestGuests = Math.max(stats.partyBestGuests, outcome.guests)
      lines.push({ label: 'Party score', xp: Math.round(outcome.score / 12) }, { label: 'Party finished', xp: 10 })
      break
    case 'sprint':
      stats.sprints++
      newBest = stats.sprintBest > 0 && outcome.score > stats.sprintBest
      stats.sprintBest = Math.max(stats.sprintBest, outcome.score)
      lines.push({ label: 'Sprint score', xp: Math.round(outcome.score / 50) }, { label: 'Sprint finished', xp: 5 })
      break
  }

  const streak = touchStreak(profile.streak, today)

  const completed = advanceQuests(profile.quests.list, outcome, stars ? stars.after - stars.before : 0)
  const quests = completed.map((quest) => ({ title: questTitle(quest), xp: questXp(quest) }))
  stats.quests += completed.length
  if (!profile.quests.bonus && profile.quests.list.length > 0 && profile.quests.list.every((quest) => quest.done)) {
    profile.quests.bonus = true
    stats.questDays++
    quests.push({ title: 'All daily quests done', xp: ALL_QUESTS_BONUS })
  }

  const earnedLines = lines.filter((line) => line.xp > 0)
  profile.xp += [...earnedLines, ...quests].reduce((sum, item) => sum + item.xp, 0)

  const achievements = evaluateAchievements({ profile, outcome, now, stars })
  for (const achievement of achievements) {
    profile.achievements[achievement.id] = now.getTime()
    profile.xp += achievement.xp
  }

  return {
    profile,
    rewards: {
      lines: earnedLines,
      xpBefore: current.xp,
      xpAfter: profile.xp,
      achievements,
      quests,
      streak,
      unlocks: unlocksBetween(levelInfo(current.xp).level, levelInfo(profile.xp).level),
      venues: CHAPTERS.filter(
        (chapter) => !chapterUnlocked(chapter, current.stages) && chapterUnlocked(chapter, profile.stages),
      ),
      stars,
      newBest,
    },
  }
}
