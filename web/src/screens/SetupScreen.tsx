import { Icon } from '../components/Icon'
import { FACE_LIMITS, findLevel, LEVELS, POOL_LABELS, SECONDS_LIMITS } from '../settings'
import { MEMORY_TIPS } from '../tips'
import type { NamePool, Settings } from '../types'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  onStart: () => void
}

const POOL_EXAMPLES: Record<NamePool, string> = {
  common: 'Everyday names like Carlos, Beatriz or Javier.',
  extended: 'Mixes in rarer names like Baltasar, Genoveva or Casimiro.',
}

export function SetupScreen({ settings, onChange, onStart }: Props) {
  const level = findLevel(settings)
  const update = (changes: Partial<Settings>) => onChange({ ...settings, ...changes })

  return (
    <div className="screen setup">
      <section className="hero">
        <h1>Never forget a name again</h1>
        <p>Study each face and its name against the clock, then recall them all in a random order.</p>
      </section>

      <section className="card">
        <fieldset>
          <legend className="section-title">
            Difficulty {!level && <span className="badge">Custom</span>}
          </legend>
          <div className="levels">
            {LEVELS.map((preset, index) => (
              <label key={preset.id} className="level" data-selected={level?.id === preset.id}>
                <input
                  type="radio"
                  name="level"
                  className="visually-hidden"
                  checked={level?.id === preset.id}
                  onChange={() => update(preset.difficulty)}
                />
                <span className="level-meter" aria-hidden="true">
                  {LEVELS.map((other, i) => (
                    <span key={other.id} data-on={i <= index} />
                  ))}
                </span>
                <span className="level-name">{preset.label}</span>
                <span className="level-detail">
                  {preset.difficulty.faceCount} faces · {preset.difficulty.secondsPerFace}s
                </span>
                <span className="level-detail">{POOL_LABELS[preset.difficulty.namePool]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <h2 className="section-title">Customize</h2>
        <div className="fields">
          <label className="field">
            <span className="field-label">
              Faces <output>{settings.faceCount}</output>
            </span>
            <input
              type="range"
              min={FACE_LIMITS.min}
              max={FACE_LIMITS.max}
              value={settings.faceCount}
              onChange={(event) => update({ faceCount: Number(event.target.value) })}
            />
          </label>

          <label className="field">
            <span className="field-label">
              Time per face <output>{settings.secondsPerFace}s</output>
            </span>
            <input
              type="range"
              min={SECONDS_LIMITS.min}
              max={SECONDS_LIMITS.max}
              value={settings.secondsPerFace}
              onChange={(event) => update({ secondsPerFace: Number(event.target.value) })}
            />
          </label>

          <fieldset className="field">
            <legend className="field-label">Names</legend>
            <div className="segmented">
              {(['common', 'extended'] as const).map((pool) => (
                <label key={pool} data-selected={settings.namePool === pool}>
                  <input
                    type="radio"
                    name="pool"
                    className="visually-hidden"
                    checked={settings.namePool === pool}
                    onChange={() => update({ namePool: pool })}
                  />
                  {POOL_LABELS[pool]}
                </label>
              ))}
            </div>
            <span className="field-help">{POOL_EXAMPLES[settings.namePool]}</span>
          </fieldset>

          <label className="toggle">
            <span className="toggle-text">
              <span className="field-label">Visualization hints</span>
              <span className="field-help">
                While memorizing, shows Spanish words that sound like the name to picture it with, e.g. Raquel →
                raqueta.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={settings.hints}
              onChange={(event) => update({ hints: event.target.checked })}
            />
          </label>
        </div>

        <div className="start-row">
          <p className="muted">
            Study time: <strong>{formatDuration(settings.faceCount * settings.secondsPerFace)}</strong>
          </p>
          <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
            Start training <Icon name="next" />
          </button>
        </div>
      </section>

      <details className="card tips">
        <summary>
          <Icon name="bulb" /> How to memorize names
        </summary>
        <ol>
          {MEMORY_TIPS.map((tip) => (
            <li key={tip.title}>
              <strong>{tip.title}.</strong> {tip.text}
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds}s`
}
