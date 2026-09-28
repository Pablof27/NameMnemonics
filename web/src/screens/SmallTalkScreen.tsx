import { DrillBoard } from '../components/DrillBoard'
import { Icon } from '../components/Icon'
import { useCountdown } from '../hooks/useCountdown'

interface Props {
  seconds: number
  /** Guests of the current event, kept out of the questions. */
  exclude: ReadonlySet<string>
  onDone: () => void
  onExit: () => void
}

/** A delay filled with Picture Sprint questions: names have to survive some distraction, like at a real event. */
export function SmallTalkScreen({ seconds, exclude, onDone, onExit }: Props) {
  const durationMs = seconds * 1000
  const remaining = useCountdown(durationMs, true, onDone)

  return (
    <div className="screen session">
      <header className="session-header">
        <div className="session-meta">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>
            <Icon name="back" size={18} /> Exit
          </button>
          <span className="session-phase">Small talk</span>
          <span className="session-count">{Math.ceil(remaining / 1000)}s</span>
        </div>
        <div className="timer-track">
          <div className="timer-bar" style={{ transform: `scaleX(${remaining / durationMs})` }} />
        </div>
      </header>
      <div className="card small-talk">
        <h2>🗣️ Keep the conversation going</h2>
        <p className="muted">Hold on to your guests’ names while you chat. You greet them when the time is up.</p>
        <DrillBoard exclude={exclude} />
      </div>
    </div>
  )
}
