import { Icon } from '../components/Icon'
import type { RecallMode } from '../types'

const RULES: Record<RecallMode, string[]> = {
  typed: ['Type each name. Accents and capital letters don’t matter.', 'A small typo still earns half points.'],
  choice: ['Pick each guest’s name from four options.'],
  faces: ['You see a name: pick the face that goes with it.'],
}

interface Props {
  count: number
  mode: RecallMode
  lifelines: number
  onStart: () => void
}

export function ReadyScreen({ count, mode, lifelines, onStart }: Props) {
  return (
    <div className="screen center">
      <div className="card narrow">
        <h2>Time to greet them</h2>
        <p>The {count} guests come back in a random order.</p>
        <ul className="rules">
          {RULES[mode].map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
          <li>⚡ Answer fast for a bonus, 🔥 chain names for a combo.</li>
          {lifelines > 0 && (
            <li>
              🛟 {lifelines === 1 ? 'One lifeline' : `${lifelines} lifelines`} if you get stuck (half points).
            </li>
          )}
        </ul>
        <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={onStart}>
          Start greeting <Icon name="next" />
        </button>
      </div>
    </div>
  )
}
