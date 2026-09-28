import { useEffect, useState } from 'react'
import { DrillBoard } from '../components/DrillBoard'
import { MEMORY_TIPS } from '../tips'

interface Props {
  loaded: number
  total: number
  error: string | null
  onRetry: () => void
  onCancel: () => void
}

export function LoadingScreen({ loaded, total, error, onRetry, onCancel }: Props) {
  const [tip] = useState(() => MEMORY_TIPS[Math.floor(Math.random() * MEMORY_TIPS.length)])
  const [warmUp, setWarmUp] = useState(false)

  // Short loads just show a tip; longer ones turn the wait into practice.
  useEffect(() => {
    const timer = setTimeout(() => setWarmUp(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (error) {
    return (
      <div className="screen center">
        <div className="card narrow">
          <h2>Couldn't prepare the faces</h2>
          <p className="error-text" role="alert">
            {error}
          </p>
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen center">
      <div className="card narrow">
        <h2>Guests are arriving…</h2>
        <div
          className="progress"
          role="progressbar"
          aria-label="Faces ready"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={loaded}
        >
          <div className="progress-bar" style={{ width: `${(loaded / total) * 100}%` }} />
        </div>
        <p className="muted">
          {loaded} of {total} ready
        </p>
        {warmUp ? (
          <div className="warm-up">
            <p className="section-title">Warm up while you wait</p>
            <DrillBoard />
          </div>
        ) : (
          <p className="tip">
            <strong>Tip · {tip.title}.</strong> {tip.text}
          </p>
        )}
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
