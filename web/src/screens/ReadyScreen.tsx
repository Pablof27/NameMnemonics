import { Icon } from '../components/Icon'

export function ReadyScreen({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <div className="screen center">
      <div className="card narrow">
        <h2>Time to recall</h2>
        <p>
          The {count} faces will come back in a random order. Type the name of each person.
        </p>
        <ul className="rules">
          <li>Accents and capital letters don't matter.</li>
          <li>A small typo still earns half a point.</li>
        </ul>
        <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={onStart}>
          Start recall <Icon name="next" />
        </button>
      </div>
    </div>
  )
}
