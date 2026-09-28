import { useEffect, useRef, useState } from 'react'
import { DrillBoard } from '../components/DrillBoard'
import { Icon } from '../components/Icon'
import { RewardsPanel } from '../components/RewardsPanel'
import type { Outcome, Rewards } from '../game/profile'
import { sfx } from '../lib/sound'

const DURATION_MS = 60_000
const PENALTY_MS = 3_000
/** From this streak on, wrong options start with the same letter as the right one. */
const HARD_STREAK = 5

interface Props {
  best: number
  onApply: (outcome: Outcome) => Rewards
  onExit: () => void
}

/** Counts down while running; `penalize` takes time off the clock. */
function useClock(running: boolean, onDone: () => void) {
  const [remaining, setRemaining] = useState(DURATION_MS)
  const endRef = useRef(0)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!running) return
    endRef.current = performance.now() + DURATION_MS
    let frame = 0
    const tick = (now: number) => {
      const left = Math.max(0, endRef.current - now)
      setRemaining(left)
      if (left > 0) frame = requestAnimationFrame(tick)
      else onDoneRef.current()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running])

  return {
    remaining,
    penalize: (ms: number) => {
      endRef.current -= ms
    },
  }
}

export function SprintScreen({ best, onApply, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [streak, setStreak] = useState(0)
  const [pop, setPop] = useState<{ id: number; text: string; bad: boolean } | null>(null)
  const [rewards, setRewards] = useState<Rewards | null>(null)

  const finish = () => {
    setPhase('over')
    sfx.gameOver()
    setRewards(onApply({ kind: 'sprint', score, correct, answered }))
  }
  const clock = useClock(phase === 'play', finish)

  const start = () => {
    setScore(0)
    setCorrect(0)
    setAnswered(0)
    setStreak(0)
    setPop(null)
    setRewards(null)
    setRound((n) => n + 1)
    setPhase('play')
    sfx.start()
  }

  const handleAnswer = (right: boolean, run: number) => {
    setAnswered((n) => n + 1)
    setStreak(run)
    if (right) {
      const points = 50 + 10 * Math.min(run - 1, 10)
      setScore((n) => n + points)
      setCorrect((n) => n + 1)
      setPop({ id: Date.now(), text: `+${points}`, bad: false })
    } else {
      clock.penalize(PENALTY_MS)
      setPop({ id: Date.now(), text: '−3s', bad: true })
    }
  }

  if (phase === 'intro') {
    return (
      <div className="screen center">
        <div className="card narrow">
          <span className="hero-emoji" aria-hidden="true">
            🎨
          </span>
          <h2>Picture Sprint</h2>
          <p>
            Train your name bank: the faster a name turns into a picture, the easier it is to link it to a face.
          </p>
          <ul className="rules">
            <li>
              <strong>Beatriz</strong> → which picture sounds like it?
            </li>
            <li>
              <strong>“raqueta”</strong> → whose picture is it?
            </li>
            <li>60 seconds. Streaks score more, a miss costs 3 seconds.</li>
          </ul>
          {best > 0 && <p className="muted">Your best: {best.toLocaleString('en')}</p>}
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={onExit}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={start}>
              Start <Icon name="next" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'over' && rewards) {
    return (
      <div className="screen results">
        <section className="card results-summary">
          <span className="hero-emoji" aria-hidden="true">
            ⏰
          </span>
          <div className="results-text">
            <p className="eyebrow">🎨 Picture Sprint</p>
            <h1>Time’s up!</h1>
            <p className="score-line">
              <strong className="score-total">{score.toLocaleString('en')}</strong> points
              {rewards.newBest && <span className="badge badge-hot">New best!</span>}
            </p>
            <p className="muted">
              {correct} of {answered} right{answered > 0 && ` (${Math.round((correct / answered) * 100)}%)`}
            </p>
          </div>
        </section>
        <RewardsPanel rewards={rewards} />
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            <Icon name="back" /> Hub
          </button>
          <button type="button" className="btn btn-primary" autoFocus onClick={start}>
            <Icon name="retry" /> Play again
          </button>
        </div>
      </div>
    )
  }

  const seconds = Math.ceil(clock.remaining / 1000)
  return (
    <div className="screen session">
      <header className="session-header">
        <div className="session-meta">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>
            <Icon name="back" size={18} /> Exit
          </button>
          <span className="session-phase">Picture Sprint</span>
          <span className="session-count" role="timer">
            {seconds}s
          </span>
        </div>
        <div className="timer-track">
          <div className="timer-bar" data-low={seconds <= 10} style={{ transform: `scaleX(${clock.remaining / DURATION_MS})` }} />
        </div>
      </header>
      <div className="recall-hud">
        <span className="hud-score">
          <strong>{score.toLocaleString('en')}</strong> pts
          {pop && (
            <span key={pop.id} className="points-pop" data-bad={pop.bad}>
              {pop.text}
            </span>
          )}
        </span>
        {streak >= 2 && (
          <span key={streak} className="combo" data-hot={streak >= HARD_STREAK}>
            🔥 {streak} in a row{streak >= HARD_STREAK && ' · hard mode'}
          </span>
        )}
      </div>
      <div className="card small-talk">
        <DrillBoard key={round} hard={streak >= HARD_STREAK} onAnswer={handleAnswer} />
      </div>
    </div>
  )
}
