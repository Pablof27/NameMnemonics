import { Icon } from '../components/Icon'

const STEPS = [
  { emoji: '👂', title: 'Look', text: 'Really see the face.' },
  { emoji: '📍', title: 'Anchor', text: 'Pick its most striking feature.' },
  { emoji: '🖼️', title: 'Picture', text: 'Turn the name into a thing.' },
  { emoji: '🔗', title: 'Link', text: 'Glue them in a crazy scene.' },
]

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen welcome">
      <section className="hero">
        <span className="hero-emoji" aria-hidden="true">
          🥳
        </span>
        <h1>Never forget a name again</h1>
        <p>
          Meet guests at a coffee shop, a wedding, a conference… then greet them by name. Climb from Stranger to
          Memory Master with the techniques memory champions use.
        </p>
      </section>

      <ol className="method">
        {STEPS.map((step, i) => (
          <li key={step.title} className="card" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
            <span className="method-emoji" aria-hidden="true">
              {step.emoji}
            </span>
            <strong>{step.title}</strong>
            <span className="muted small">{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="actions">
        <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={onStart}>
          Meet your first guests <Icon name="next" />
        </button>
      </div>
    </div>
  )
}
