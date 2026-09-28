import type { Answer, EventRules, Grade, RecallMode, StudyRecord } from '../types'

export const BASE_POINTS: Record<Grade, number> = { correct: 100, close: 50, wrong: 0 }

/** Answering within par earns the lightning bonus. Typing takes longer than picking. */
export const PAR_MS: Record<RecallMode, number> = { typed: 6000, choice: 3000, faces: 3500 }

export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 3
  if (combo >= 5) return 2
  if (combo >= 3) return 1.5
  return 1
}

/** Right on the first try, with no lifeline. */
export function isClean(answer: Answer): boolean {
  return answer.grade === 'correct' && !answer.assisted
}

export interface ScoredAnswer {
  answer: Answer
  combo: number
  multiplier: number
  points: number
  lightning: number
  quick: number
  total: number
}

export function scoreAnswers(
  answers: Answer[],
  mode: RecallMode,
  study: Record<string, StudyRecord> = {},
): ScoredAnswer[] {
  let combo = 0
  return answers.map((answer) => {
    const clean = isClean(answer)
    // A typo or a lifeline keeps the combo alive without growing it.
    if (clean) combo++
    else if (answer.grade === 'wrong') combo = 0
    const multiplier = clean ? comboMultiplier(combo) : 1
    const base = BASE_POINTS[answer.grade] * (answer.assisted ? 0.5 : 1) * (answer.person.vip ? 2 : 1)
    const points = Math.round(base * multiplier)
    const par = PAR_MS[mode]
    const lightning = !clean ? 0 : answer.ms <= par ? 50 : answer.ms <= 2 * par ? 20 : 0
    const used = study[answer.person.id]?.used
    // Skipping a face early only pays off if the name was really learned.
    const quick = clean && used !== undefined ? Math.round(50 * (1 - used)) : 0
    return { answer, combo, multiplier, points, lightning, quick, total: points + lightning + quick }
  })
}

/** Trailing run of clean answers. */
export function currentCombo(answers: Answer[]): number {
  let combo = 0
  for (const answer of answers) {
    if (isClean(answer)) combo++
    else if (answer.grade === 'wrong') combo = 0
  }
  return combo
}

export function difficultyMultiplier(rules: EventRules): number {
  const recall = { choice: 1, faces: 1.2, typed: 1.5 }[rules.recall]
  const pool = rules.namePool === 'extended' ? 1.2 : 1
  const pace = rules.secondsPerFace <= 3 ? 1.3 : rules.secondsPerFace <= 5 ? 1.15 : 1
  const delay = rules.smallTalk > 0 ? 1.1 : 1
  return Math.round(recall * pool * pace * delay * 20) / 20
}

/** Stars measure memory only: clean answers count fully, typos and lifeline answers count half. */
export function accuracyOf(answers: Answer[]): number {
  if (answers.length === 0) return 0
  const points = answers.reduce((sum, answer) => sum + (isClean(answer) ? 1 : answer.grade === 'wrong' ? 0 : 0.5), 0)
  return points / answers.length
}

export function starsFor(accuracy: number, thresholds: readonly number[]): number {
  return thresholds.filter((threshold) => accuracy >= threshold - 1e-9).length
}

/** How many more remembered names would have earned the next star, if any. */
export function namesToNextStar(accuracy: number, count: number, thresholds: readonly number[]): number | null {
  const next = thresholds.find((threshold) => accuracy < threshold - 1e-9)
  if (next === undefined) return null
  return Math.ceil((next - accuracy) * count - 1e-9)
}

export interface EventScore {
  answers: ScoredAnswer[]
  names: number
  lightning: number
  quick: number
  subtotal: number
  difficulty: number
  noHints: boolean
  perfect: boolean
  total: number
  accuracy: number
  correct: number
  close: number
  wrong: number
  bestCombo: number
}

export function scoreEvent(
  answers: Answer[],
  rules: EventRules,
  hints: boolean,
  study: Record<string, StudyRecord>,
): EventScore {
  const scored = scoreAnswers(answers, rules.recall, study)
  const sum = (key: 'points' | 'lightning' | 'quick') => scored.reduce((total, item) => total + item[key], 0)
  const names = sum('points')
  const lightning = sum('lightning')
  const quick = sum('quick')
  const subtotal = names + lightning + quick
  const difficulty = difficultyMultiplier(rules)
  const noHints = rules.hints === 'optional' && !hints
  const perfect = answers.length > 0 && answers.every(isClean)
  const count = (grade: Grade) => answers.filter((answer) => answer.grade === grade).length
  return {
    answers: scored,
    names,
    lightning,
    quick,
    subtotal,
    difficulty,
    noHints,
    perfect,
    total: Math.round(subtotal * difficulty * (noHints ? 1.2 : 1) * (perfect ? 1.25 : 1)),
    accuracy: accuracyOf(answers),
    correct: count('correct'),
    close: count('close'),
    wrong: count('wrong'),
    bestCombo: Math.max(0, ...scored.map((item) => item.combo)),
  }
}
