import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { SessionHeader, type SegmentState } from '../components/SessionHeader'
import { useCountdown } from '../hooks/useCountdown'
import { getHints } from '../lib/names'
import type { Person } from '../types'

interface Props {
  people: Person[]
  secondsPerFace: number
  showHints: boolean
  onFinish: () => void
  onExit: () => void
}

const GET_READY_FROM = 3

export function StudyScreen({ people, secondsPerFace, showHints, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [getReady, setGetReady] = useState(GET_READY_FROM)
  const isLast = index === people.length - 1
  const started = getReady === 0

  const next = useCallback(() => {
    setPaused(false)
    if (isLast) onFinish()
    else setIndex((i) => i + 1)
  }, [isLast, onFinish])

  useEffect(() => {
    if (started) return
    const timer = setTimeout(() => setGetReady((n) => n - 1), 700)
    return () => clearTimeout(timer)
  }, [started, getReady])

  // Hiding the tab pauses the drill so the timer can't run out unseen.
  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPaused(true)
    }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])

  useEffect(() => {
    if (!started) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      // A focused button already toggles itself on Space.
      if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        setPaused((p) => !p)
      } else if (event.key === 'ArrowRight') {
        next()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, next])

  const person = people[index]
  const segments = people.map((_, i): SegmentState => (i < index ? 'done' : i === index ? 'current' : 'todo'))

  return (
    <div className="screen session">
      <SessionHeader phase="Memorize" position={index + 1} segments={segments} onExit={onExit} />

      {started ? (
        <StudyCard
          key={person.id}
          person={person}
          hints={showHints ? getHints(person.name) : []}
          durationMs={secondsPerFace * 1000}
          paused={paused}
          onDone={next}
          onResume={() => setPaused(false)}
        />
      ) : (
        <div className="study-card">
          <div className="portrait portrait-empty">
            <span key={getReady} className="get-ready-count">
              {getReady}
            </span>
          </div>
          <p className="name muted">Get ready…</p>
          <div className="timer" />
        </div>
      )}

      <div className="controls">
        <button type="button" className="btn btn-secondary" disabled={!started} onClick={() => setPaused((p) => !p)}>
          <Icon name={paused ? 'play' : 'pause'} /> {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className="btn btn-primary" disabled={!started} onClick={next}>
          {isLast ? 'Finish' : 'Next'} <Icon name="next" />
        </button>
      </div>
      <p className="shortcuts">
        <kbd>Space</kbd> pause · <kbd>→</kbd> next face
      </p>
    </div>
  )
}

interface StudyCardProps {
  person: Person
  hints: string[]
  durationMs: number
  paused: boolean
  onDone: () => void
  onResume: () => void
}

function StudyCard({ person, hints, durationMs, paused, onDone, onResume }: StudyCardProps) {
  const remaining = useCountdown(durationMs, !paused, onDone)
  const seconds = Math.ceil(remaining / 1000)

  return (
    <figure className="study-card" data-paused={paused}>
      <div className="portrait">
        <img src={person.image} alt={`Portrait of ${person.name}`} />
        {paused && (
          <button type="button" className="paused-overlay" onClick={onResume}>
            <Icon name="play" size={36} />
            Paused · click to resume
          </button>
        )}
      </div>
      <figcaption className="name">{person.name}</figcaption>
      {hints.length > 0 && (
        <p className="hint">
          <Icon name="bulb" size={18} />
          <span className="visually-hidden">Picture: </span>
          {hints.join(' · ')}
        </p>
      )}
      <div className="timer" role="timer" aria-label={`${seconds} ${seconds === 1 ? 'second' : 'seconds'} left`}>
        <div className="timer-track">
          <div className="timer-bar" style={{ transform: `scaleX(${remaining / durationMs})` }} />
        </div>
        <span className="timer-label">{seconds}s</span>
      </div>
    </figure>
  )
}
