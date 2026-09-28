import { useEffect, useRef } from 'react'
import { GradeIcon, Icon } from '../components/Icon'
import { POINTS } from '../lib/names'
import { POOL_LABELS } from '../settings'
import type { Answer, Grade, Person, Settings } from '../types'

interface Props {
  people: Person[]
  answers: Answer[]
  settings: Settings
  onNewFaces: () => void
  onRetry: () => void
  onChangeSettings: () => void
}

const RING_RADIUS = 52
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

export function ResultsScreen({ people, answers, settings, onNewFaces, onRetry, onChangeSettings }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const score = answers.reduce((sum, answer) => sum + POINTS[answer.grade], 0)
  const ratio = score / answers.length
  const count = (grade: Grade) => answers.filter((answer) => answer.grade === grade).length

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="screen results">
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
              strokeDashoffset={RING_LENGTH * (1 - ratio)}
            />
          </svg>
          <span className="score-ring-label">{Math.round(ratio * 100)}%</span>
        </div>
        <div className="results-text">
          <h1 ref={headingRef} tabIndex={-1}>
            {headline(ratio)}
          </h1>
          <p className="score-line">
            <strong>{score}</strong> of {answers.length} points
          </p>
          <ul className="stats">
            <li data-grade="correct">
              <GradeIcon grade="correct" size={16} /> {count('correct')} correct
            </li>
            <li data-grade="close">
              <GradeIcon grade="close" size={16} /> {count('close')} almost
            </li>
            <li data-grade="wrong">
              <GradeIcon grade="wrong" size={16} /> {count('wrong')} missed
            </li>
          </ul>
          <p className="muted small">
            {settings.faceCount} faces · {settings.secondsPerFace}s each · {POOL_LABELS[settings.namePool]}
            {settings.hints && ' · with hints'}
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Review in study order</h2>
        <ol className="review-grid">
          {people.map((person, position) => {
            const answer = answers.find((candidate) => candidate.person.id === person.id)
            if (!answer) return null
            return (
              <li key={person.id} className="review-item" data-grade={answer.grade}>
                <div className="review-portrait">
                  <img src={person.image} alt={`Portrait of ${person.name}`} loading="lazy" />
                  <span className="review-position">{position + 1}</span>
                  <span className="review-badge">
                    <GradeIcon grade={answer.grade} size={16} />
                  </span>
                </div>
                <strong className="review-name">{person.name}</strong>
                <span className="review-answer">
                  {answer.grade === 'correct' ? 'Correct' : answer.response ? `You wrote “${answer.response}”` : 'No answer'}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onChangeSettings}>
          <Icon name="back" /> Change settings
        </button>
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <Icon name="retry" /> Practice these faces again
        </button>
        <button type="button" className="btn btn-primary" onClick={onNewFaces}>
          New faces <Icon name="next" />
        </button>
      </div>
    </div>
  )
}

function headline(ratio: number): string {
  if (ratio === 1) return 'Perfect recall!'
  if (ratio >= 0.8) return 'Excellent memory!'
  if (ratio >= 0.6) return 'Great job!'
  if (ratio >= 0.4) return 'Good effort'
  return 'Keep practicing'
}
