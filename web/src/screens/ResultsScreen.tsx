import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Confetti } from '../components/Confetti'
import { GradeIcon, Icon } from '../components/Icon'
import { RewardsPanel } from '../components/RewardsPanel'
import { Stars } from '../components/Stars'
import type { Rewards } from '../game/profile'
import { namesToNextStar, starsFor, type EventScore } from '../game/scoring'
import { sfx } from '../lib/sound'
import type { Answer, EventConfig, Person, StudyRecord } from '../types'

interface Props {
  event: EventConfig
  people: Person[]
  answers: Answer[]
  study: Record<string, StudyRecord>
  hints: boolean
  score: EventScore
  rewards: Rewards
  /** Text to copy for the official Daily Event result. */
  share?: string
  note?: ReactNode
  actions: ReactNode
}

const RING_RADIUS = 52
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

export function ResultsScreen({ event, people, answers, study, hints, score, rewards, share, note, actions }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stars = event.stars ? starsFor(score.accuracy, event.stars) : undefined
  const missing = event.stars ? namesToNextStar(score.accuracy, answers.length, event.stars) : null
  const celebrate = score.perfect || stars === 3

  useEffect(() => {
    headingRef.current?.focus()
    if (!stars) return
    const timers = Array.from({ length: stars }, (_, i) => setTimeout(() => sfx.star(i), 450 + i * 350))
    return () => timers.forEach(clearTimeout)
  }, [stars])

  return (
    <div className="screen results">
      <Confetti fire={celebrate ? 1 : 0} />
      <section className="card results-summary">
        <div className="score-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="score-ring-track" cx="60" cy="60" r={RING_RADIUS} />
            <circle
              className="score-ring-value"
              cx="60"
              cy="60"
              r={RING_RADIUS}
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - score.accuracy)}
            />
          </svg>
          <span className="score-ring-label">{Math.round(score.accuracy * 100)}%</span>
        </div>
        <div className="results-text">
          <p className="eyebrow">
            {event.emoji} {event.kind === 'campaign' ? `Stage ${event.id} · ${event.title}` : event.title}
          </p>
          <h1 ref={headingRef} tabIndex={-1}>
            {headline(score.accuracy, stars)}
          </h1>
          {stars !== undefined && <Stars count={stars} size={34} animate delay={0.3} />}
          <p className="score-line">
            <strong className="score-total">{score.total.toLocaleString('en')}</strong> points
            {rewards.newBest && <span className="badge badge-hot">New best!</span>}
          </p>
          <ul className="stats">
            <li data-grade="correct">
              <GradeIcon grade="correct" size={16} /> {score.correct} correct
            </li>
            <li data-grade="close">
              <GradeIcon grade="close" size={16} /> {score.close} almost
            </li>
            <li data-grade="wrong">
              <GradeIcon grade="wrong" size={16} /> {score.wrong} missed
            </li>
            {score.bestCombo >= 3 && <li className="stat-combo">🔥 {score.bestCombo} combo</li>}
          </ul>
          {missing !== null && missing <= 2 && stars !== undefined && (
            <p className="near-miss">
              Just {missing} more {missing === 1 ? 'name' : 'names'} for {'★'.repeat(stars + 1)}!
            </p>
          )}
          {note}
        </div>
      </section>

      <div className="results-columns">
        <ScoreBreakdown score={score} />
        <RewardsPanel rewards={rewards} />
      </div>

      <section className="card coach">
        <h2 className="section-title">Coach</h2>
        <p>{coachTip(score, study, hints)}</p>
        <Insight answers={answers} study={study} />
      </section>

      <section className="card">
        <h2 className="section-title">Review in the order you met them</h2>
        <ol className="review-grid">
          {people.map((person, position) => {
            const answer = answers.find((candidate) => candidate.person.id === person.id)
            if (!answer) return null
            const anchor = study[person.id]?.anchor
            return (
              <li key={person.id} className="review-item" data-grade={answer.grade}>
                <div className="review-portrait">
                  <img src={person.image} alt={`Portrait of ${person.name}`} loading="lazy" />
                  <span className="review-position">{position + 1}</span>
                  <span className="review-badge">
                    <GradeIcon grade={answer.grade} size={16} />
                  </span>
                  {anchor && (
                    <span className="review-pin" style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }} />
                  )}
                </div>
                <strong className="review-name">
                  {person.vip && '🌟 '}
                  {person.name}
                </strong>
                <span className="review-answer">
                  {answer.grade === 'correct'
                    ? answer.assisted
                      ? 'With a lifeline'
                      : 'Correct'
                    : answer.response
                      ? `You said “${answer.response}”`
                      : 'No answer'}
                  {anchor && ` · 📍 ${anchor.region}`}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="actions">
        {share && <ShareButton text={share} />}
        {actions}
      </div>
    </div>
  )
}

function ScoreBreakdown({ score }: { score: EventScore }) {
  const rows: [string, string][] = [[`Names${score.bestCombo >= 3 ? ' (with combos)' : ''}`, `${score.names}`]]
  if (score.lightning > 0) rows.push(['⚡ Lightning bonus', `+${score.lightning}`])
  if (score.quick > 0) rows.push(['⏩ Quick-study bonus', `+${score.quick}`])
  if (score.difficulty !== 1) rows.push(['Difficulty', `×${score.difficulty}`])
  if (score.noHints) rows.push(['🚫 No hints', '×1.2'])
  if (score.perfect) rows.push(['🎯 Perfect', '×1.25'])

  return (
    <section className="card breakdown" aria-label="Score breakdown">
      <h2 className="section-title">Score</h2>
      <dl className="breakdown-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="breakdown-total">
          <dt>Total</dt>
          <dd>{score.total.toLocaleString('en')}</dd>
        </div>
      </dl>
    </section>
  )
}

function Insight({ answers, study }: { answers: Answer[]; study: Record<string, StudyRecord> }) {
  const anchored = answers.filter((answer) => study[answer.person.id]?.anchor)
  const other = answers.filter((answer) => !study[answer.person.id]?.anchor)
  if (anchored.length === 0 || other.length === 0) return null
  const hits = (list: Answer[]) => list.filter((answer) => answer.grade !== 'wrong').length
  return (
    <p className="insight">
      📍 Anchored faces: <strong>{hits(anchored)}/{anchored.length}</strong> remembered · not anchored:{' '}
      <strong>
        {hits(other)}/{other.length}
      </strong>
    </p>
  )
}

function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      window.prompt('Copy your result:', text)
    }
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={copy}>
      <Icon name="share" /> {copied ? 'Copied!' : 'Share result'}
    </button>
  )
}

function headline(accuracy: number, stars?: number): string {
  if (accuracy === 1) return 'Perfect recall!'
  if (stars === 0) return 'So close, try again!'
  if (accuracy >= 0.8) return 'Excellent memory!'
  if (accuracy >= 0.6) return 'Great job!'
  if (accuracy >= 0.4) return 'Good effort'
  return 'Keep practicing'
}

function coachTip(score: EventScore, study: Record<string, StudyRecord>, hints: boolean): string {
  const anchors = Object.values(study).filter((record) => record.anchor).length
  if (score.perfect) {
    return hints
      ? 'Flawless! Next time try it with hints off: your own pictures stick even better, and they score more.'
      : 'Flawless! Try moving on early while studying: the quick-study bonus rewards names you are sure of.'
  }
  if (score.close > 0 && score.close >= score.wrong) {
    return 'Several names were almost right. While studying, spell the name out in your head once.'
  }
  if (anchors < score.answers.length / 2) {
    return 'Anchor more faces: tap the most striking feature while studying, then link the name’s picture to it.'
  }
  if (score.wrong > score.answers.length / 2) {
    return 'Slow down on each face: picture the name (Raquel → raqueta) and glue it to the feature you anchored.'
  }
  return 'Make the scenes crazier: exaggerate, add movement and sound. Absurd pictures are the ones you remember.'
}
