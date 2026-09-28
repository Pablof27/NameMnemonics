import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { RewardsPanel } from '../components/RewardsPanel'
import type { Outcome, Rewards } from '../game/profile'
import { comboMultiplier } from '../game/scoring'
import { prefetchFaces, takeFaces } from '../lib/facePool'
import { assignNames } from '../lib/names'
import { shuffle } from '../lib/shuffle'
import { sfx } from '../lib/sound'
import type { Answer, NamePool, Person } from '../types'
import { LoadingScreen } from './LoadingScreen'
import { RecallScreen } from './RecallScreen'
import { StudyScreen } from './StudyScreen'

const LIVES = 3

const arrivalsFor = (wave: number) => (wave <= 2 ? 2 : 3)
const secondsFor = (wave: number) => Math.max(3, 5 - Math.floor((wave - 1) / 3))
const poolFor = (wave: number): NamePool => (wave <= 4 ? 'common' : 'extended')

interface Run {
  wave: number
  /** Everyone met in earlier waves. */
  guests: Person[]
  arrivals: Person[]
  questions: Person[]
  lives: number
  score: number
  combo: number
  bestCombo: number
  correct: number
  cleared: number
}

const NEW_RUN: Run = {
  wave: 1,
  guests: [],
  arrivals: [],
  questions: [],
  lives: LIVES,
  score: 0,
  combo: 0,
  bestCombo: 0,
  correct: 0,
  cleared: 0,
}

/** The run after a round of answers: 100 × combo per name, a life lost per miss. */
function afterAnswers(run: Run, answers: Answer[]): Run {
  const next = { ...run }
  for (const answer of answers) {
    if (answer.grade === 'correct') {
      next.combo++
      next.correct++
      next.score += 100 * comboMultiplier(next.combo)
    } else {
      next.combo = 0
      next.lives--
    }
    next.bestCombo = Math.max(next.bestCombo, next.combo)
  }
  return next
}

interface Props {
  best: { score: number; waves: number }
  onApply: (outcome: Outcome) => Rewards
  onExit: () => void
}

type Phase = 'intro' | 'loading' | 'banner' | 'meet' | 'greet' | 'over'

export function PartyScreen({ best, onApply, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [run, setRun] = useState<Run>(NEW_RUN)
  const [loaded, setLoaded] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [rewards, setRewards] = useState<Rewards | null>(null)
  const loading = useRef<AbortController | null>(null)

  useEffect(() => () => loading.current?.abort(), [])

  const loadWave = (current: Run) => {
    loading.current?.abort()
    const controller = new AbortController()
    loading.current = controller
    setLoaded(0)
    setError(null)
    setPhase('loading')
    takeFaces(arrivalsFor(current.wave), controller.signal, setLoaded)
      .then((faces) => {
        if (controller.signal.aborted) return
        const names = assignNames(
          faces.map((face) => face.gender),
          poolFor(current.wave),
          current.guests.map((guest) => guest.name),
        )
        const arrivals = faces.map((face, i) => ({ id: face.id, image: face.image, gender: face.gender, name: names[i] }))
        setRun({ ...current, arrivals })
        setPhase('banner')
        // The next wave's guests can arrive while this one plays.
        prefetchFaces(arrivalsFor(current.wave + 1))
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason))
      })
  }

  const start = () => {
    setRewards(null)
    setRun(NEW_RUN)
    loadWave(NEW_RUN)
    sfx.start()
  }

  const end = (final: Run) => {
    loading.current?.abort()
    const guests = final.guests.length
    if (final.correct === 0 && final.cleared === 0) {
      onExit()
      return
    }
    setRun(final)
    setPhase('over')
    sfx.gameOver()
    setRewards(
      onApply({
        kind: 'party',
        score: final.score,
        waves: final.cleared,
        guests,
        correct: final.correct,
        bestCombo: final.bestCombo,
      }),
    )
  }

  const startGreeting = () => {
    const earlier = shuffle(run.guests).slice(0, Math.min(run.wave, run.guests.length))
    setRun({ ...run, guests: [...run.guests, ...run.arrivals], questions: shuffle([...run.arrivals, ...earlier]) })
    setPhase('greet')
  }

  const finishGreeting = (answers: Answer[]) => {
    const next = afterAnswers(run, answers)
    if (next.lives <= 0) {
      end(next)
      return
    }
    const cleared = { ...next, cleared: next.wave, score: next.score + 50 * next.wave, wave: next.wave + 1 }
    sfx.start()
    loadWave(cleared)
  }

  if (phase === 'intro') {
    return (
      <div className="screen center">
        <div className="card narrow">
          <span className="hero-emoji" aria-hidden="true">
            🎉
          </span>
          <h2>Endless Party</h2>
          <p>Guests keep arriving, and earlier guests keep coming back to chat. Remember everyone!</p>
          <ul className="rules">
            <li>Each wave brings new guests. Then you greet them, plus some you met before.</li>
            <li>Pick each name from four options. Combos multiply your points.</li>
            <li>❤️❤️❤️ Three lives: every wrong name costs one.</li>
          </ul>
          {best.score > 0 && (
            <p className="muted">
              Your best: wave {best.waves} · {best.score.toLocaleString('en')} pts
            </p>
          )}
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={onExit}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={start}>
              Start the party <Icon name="next" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <LoadingScreen
        loaded={loaded}
        total={arrivalsFor(run.wave)}
        error={error}
        onRetry={() => loadWave(run)}
        onCancel={() => end(run)}
      />
    )
  }

  if (phase === 'banner') {
    return (
      <div className="screen center">
        <div className="card narrow wave-banner">
          <p className="eyebrow">Endless Party</p>
          <h2 className="wave-title">Wave {run.wave}</h2>
          {run.cleared > 0 && (
            <p className="near-miss">
              Wave {run.cleared} cleared! +{50 * run.cleared} pts
            </p>
          )}
          <p>
            {run.arrivals.length} new {run.arrivals.length === 1 ? 'guest arrives' : 'guests arrive'} ·{' '}
            {secondsFor(run.wave)}s each
            {run.guests.length > 0 && ` · then greet up to ${Math.min(run.wave, run.guests.length)} earlier guests`}
          </p>
          <PartyHud lives={run.lives} score={run.score} guests={run.guests.length} />
          <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={() => setPhase('meet')}>
            Meet them <Icon name="next" />
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'meet') {
    return (
      <StudyScreen
        people={run.arrivals}
        secondsPerFace={secondsFor(run.wave)}
        showHints={false}
        countdown={0}
        phase={`Wave ${run.wave}`}
        quickStudy={false}
        onFinish={startGreeting}
        onExit={() => end(run)}
      />
    )
  }

  if (phase === 'greet') {
    return (
      <RecallScreen
        key={run.wave}
        questions={run.questions}
        people={run.guests}
        mode="choice"
        pool={poolFor(run.wave)}
        lifelines={0}
        phase={`Wave ${run.wave}`}
        hud={(answers) => {
          const now = afterAnswers(run, answers)
          return <PartyHud lives={now.lives} score={now.score} combo={now.combo} />
        }}
        stopWhen={(answers) => afterAnswers(run, answers).lives <= 0}
        finishLabel="Next wave"
        stopLabel="Party’s over"
        onFinish={finishGreeting}
        onExit={() => end(run)}
      />
    )
  }

  return (
    rewards && (
      <div className="screen results">
        <section className="card results-summary">
          <span className="hero-emoji" aria-hidden="true">
            🥳
          </span>
          <div className="results-text">
            <p className="eyebrow">🎉 Endless Party</p>
            <h1>The party’s over!</h1>
            <p className="score-line">
              <strong className="score-total">{run.score.toLocaleString('en')}</strong> points
              {rewards.newBest && <span className="badge badge-hot">New best!</span>}
            </p>
            <ul className="stats">
              <li>🌊 {run.cleared} {run.cleared === 1 ? 'wave' : 'waves'} cleared</li>
              <li>👥 {run.guests.length} guests met</li>
              <li>✅ {run.correct} names</li>
              {run.bestCombo >= 3 && <li>🔥 {run.bestCombo} combo</li>}
            </ul>
          </div>
        </section>
        <RewardsPanel rewards={rewards} />
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            <Icon name="back" /> Hub
          </button>
          <button type="button" className="btn btn-primary" autoFocus onClick={start}>
            <Icon name="retry" /> Party again
          </button>
        </div>
      </div>
    )
  )
}

function PartyHud({ lives, score, combo = 0, guests }: { lives: number; score: number; combo?: number; guests?: number }) {
  return (
    <span className="party-hud">
      <span className="lives" aria-label={`${lives} of ${LIVES} lives left`}>
        {Array.from({ length: LIVES }, (_, i) => (
          <span key={i} data-lost={i >= lives} aria-hidden="true">
            ❤️
          </span>
        ))}
      </span>
      <span className="hud-score">
        <strong>{score.toLocaleString('en')}</strong> pts
      </span>
      {combo >= 3 && <span className="muted">×{comboMultiplier(combo)}</span>}
      {guests !== undefined && guests > 0 && <span className="muted">{guests} guests so far</span>}
    </span>
  )
}
