import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { Icon } from '../components/Icon'
import { SessionHeader, type SegmentState } from '../components/SessionHeader'
import { faceRegion } from '../game/regions'
import { useCountdown } from '../hooks/useCountdown'
import { getHints } from '../lib/names'
import { sfx } from '../lib/sound'
import type { Anchor, Person, StudyRecord } from '../types'

interface Props {
  people: Person[]
  secondsPerFace: number
  showHints: boolean
  faceFirst?: boolean
  /** Seconds of "get ready" before the first face; 0 starts right away. */
  countdown?: number
  phase?: string
  /** Whether moving on early earns the quick-study bonus in this mode. */
  quickStudy?: boolean
  onFinish: (records: Record<string, StudyRecord>) => void
  onExit: () => void
}

export function StudyScreen({
  people,
  secondsPerFace,
  showHints,
  faceFirst = false,
  countdown = 3,
  phase = 'Meet',
  quickStudy = true,
  onFinish,
  onExit,
}: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [getReady, setGetReady] = useState(countdown)
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({})
  const records = useRef<Record<string, StudyRecord>>({})
  const remaining = useRef(0)
  const durationMs = secondsPerFace * 1000
  const isLast = index === people.length - 1
  const started = getReady === 0
  const person = people[index]

  const next = useCallback(
    (timedOut = false) => {
      records.current[person.id] = {
        anchor: anchors[person.id],
        used: timedOut ? 1 : Math.min(1, Math.max(0, 1 - remaining.current / durationMs)),
      }
      setPaused(false)
      if (isLast) onFinish(records.current)
      else setIndex((i) => i + 1)
    },
    [person, anchors, durationMs, isLast, onFinish],
  )

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

  const segments = people.map((_, i): SegmentState => (i < index ? 'done' : i === index ? 'current' : 'todo'))

  return (
    <div className="screen session">
      <SessionHeader phase={phase} position={index + 1} segments={segments} onExit={onExit} />

      {started ? (
        <StudyCard
          key={person.id}
          person={person}
          hints={showHints ? getHints(person.name) : []}
          durationMs={durationMs}
          paused={paused}
          faceFirst={faceFirst}
          anchor={anchors[person.id]}
          remainingRef={remaining}
          onAnchor={(anchor) => setAnchors((current) => ({ ...current, [person.id]: anchor }))}
          onDone={() => next(true)}
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
        <button type="button" className="btn btn-primary" disabled={!started} onClick={() => next()}>
          {isLast ? 'Finish' : 'Next'} <Icon name="next" />
        </button>
      </div>
      {quickStudy && <p className="study-tip">⏩ Sure of a name? Move on early for a quick-study bonus.</p>}
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
  faceFirst: boolean
  anchor?: Anchor
  remainingRef: RefObject<number>
  onAnchor: (anchor: Anchor) => void
  onDone: () => void
  onResume: () => void
}

function StudyCard({
  person,
  hints,
  durationMs,
  paused,
  faceFirst,
  anchor,
  remainingRef,
  onAnchor,
  onDone,
  onResume,
}: StudyCardProps) {
  const remaining = useCountdown(durationMs, !paused, onDone)
  const seconds = Math.ceil(remaining / 1000)
  // Face first: the name shows once a feature is anchored, or after a short look.
  const revealed = !faceFirst || Boolean(anchor) || durationMs - remaining >= Math.min(durationMs * 0.4, 2500)

  useEffect(() => {
    remainingRef.current = remaining
  })

  const dropAnchor = (event: MouseEvent<HTMLDivElement>) => {
    if (paused) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width
    const y = (event.clientY - box.top) / box.height
    onAnchor({ x, y, region: faceRegion(x, y) })
    sfx.pin()
  }

  return (
    <figure className="study-card" data-paused={paused} data-vip={Boolean(person.vip)}>
      <div className="portrait">
        <img src={person.image} alt={revealed ? `Portrait of ${person.name}` : 'Portrait of a new guest'} />
        {/* Pointer-only extra: the name also appears on its own, so keyboard users are not blocked. */}
        <div className="anchor-layer" role="presentation" onClick={dropAnchor} />
        {anchor && (
          <span
            key={`${anchor.x},${anchor.y}`}
            className="anchor-pin"
            style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}
          >
            <span className="anchor-label">{anchor.region}</span>
          </span>
        )}
        {person.vip && <span className="vip-badge">🌟 VIP · double points</span>}
        {paused && (
          <button type="button" className="paused-overlay" onClick={onResume}>
            <Icon name="play" size={36} />
            Paused · click to resume
          </button>
        )}
      </div>
      {revealed ? (
        <figcaption key="name" className="name reveal">
          {person.name}
        </figcaption>
      ) : (
        <figcaption key="prompt" className="face-first-prompt">
          👀 Tap their most striking feature to hear their name
        </figcaption>
      )}
      {revealed && hints.length > 0 && (
        <p className="hint">
          <Icon name="bulb" size={18} />
          <span className="visually-hidden">Picture: </span>
          {hints.join(' · ')}
        </p>
      )}
      {revealed && !anchor && <p className="anchor-help">📍 Tap a feature on the face to anchor it</p>}
      <div className="timer" role="timer" aria-label={`${seconds} ${seconds === 1 ? 'second' : 'seconds'} left`}>
        <div className="timer-track">
          <div className="timer-bar" style={{ transform: `scaleX(${remaining / durationMs})` }} />
        </div>
        <span className="timer-label">{seconds}s</span>
      </div>
    </figure>
  )
}
