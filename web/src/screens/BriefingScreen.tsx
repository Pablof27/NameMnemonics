import { useEffect, type CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import { RuleChips } from '../components/RuleChips'
import { Stars } from '../components/Stars'
import { dailyNumber } from '../game/daily'
import { prefetchFaces } from '../lib/facePool'
import type { Chapter, StageRecord } from '../game/stages'
import type { Technique } from '../tips'
import type { EventConfig } from '../types'

interface Props {
  event: EventConfig
  chapter?: Chapter
  boss?: boolean
  /** The venue's technique; highlighted on the first stage of the venue. */
  technique?: Technique
  newTechnique?: boolean
  record?: StageRecord
  hints: boolean
  onHintsChange: (hints: boolean) => void
  onStart: () => void
  onBack: () => void
  backLabel: string
}

export function BriefingScreen({
  event,
  chapter,
  boss = false,
  technique,
  newTechnique = false,
  record,
  hints,
  onHintsChange,
  onStart,
  onBack,
  backLabel,
}: Props) {
  const { rules } = event

  useEffect(() => prefetchFaces(rules.faceCount), [rules.faceCount])

  return (
    <div className="screen briefing" style={{ '--venue': chapter?.color } as CSSProperties}>
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={onBack}>
        <Icon name="back" size={18} /> {backLabel}
      </button>

      <section className="card briefing-card">
        <p className="eyebrow">
          {event.emoji}{' '}
          {chapter
            ? `${chapter.title} · Stage ${event.id}`
            : event.kind === 'daily'
              ? `Daily Event #${dailyNumber(event.id)}`
              : 'Practice'}
        </p>
        <h1>
          {event.title} {boss && <span className="badge badge-boss">Boss</span>}
        </h1>
        <p className="flavor">{event.flavor}</p>
        <RuleChips rules={rules} />
        {newTechnique && chapter && <p className="twist">✨ New here: {chapter.twist}</p>}

        {event.stars && (
          <ul className="star-goals" aria-label="Star goals">
            {event.stars.map((threshold, i) => (
              <li key={threshold}>
                <Stars count={i + 1} max={i + 1} size={14} />
                <span>{Math.round(threshold * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
        {record && record.plays > 0 && (
          <p className="best-line">
            Your best: <Stars count={record.stars} size={15} /> · {record.best.toLocaleString('en')} pts
          </p>
        )}

        {rules.hints === 'optional' && (
          <label className="toggle">
            <span className="toggle-text">
              <span className="field-label">💡 Picture hints</span>
              <span className="field-help">
                Shows Spanish words that sound like each name. Turn them off to score ×1.2 with your own images.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={hints}
              onChange={(event) => onHintsChange(event.target.checked)}
            />
          </label>
        )}

        <button type="button" className="btn btn-primary btn-lg start-button" autoFocus onClick={onStart}>
          Start <Icon name="next" />
        </button>
      </section>

      {technique && (
        <section className="card technique-card" data-new={newTechnique}>
          <span className="technique-emoji" aria-hidden="true">
            {technique.emoji}
          </span>
          <div>
            <p className="eyebrow">{newTechnique ? 'New technique' : 'Technique'}</p>
            <h2>{technique.title}</h2>
            <p>{technique.text}</p>
            <p className="practice">
              <strong>Try it:</strong> {technique.practice}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
