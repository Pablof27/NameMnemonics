import type { Grade } from '../types'
import { Icon } from './Icon'

export type SegmentState = 'done' | 'current' | 'todo' | Grade

interface Props {
  phase: string
  position: number
  segments: SegmentState[]
  onExit: () => void
}

export function SessionHeader({ phase, position, segments, onExit }: Props) {
  return (
    <header className="session-header">
      <div className="session-meta">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>
          <Icon name="back" size={18} /> Exit
        </button>
        <span className="session-phase">{phase}</span>
        <span className="session-count" aria-label={`Face ${position} of ${segments.length}`}>
          {position} / {segments.length}
        </span>
      </div>
      <ol className="segments" aria-hidden="true">
        {segments.map((state, i) => (
          <li key={i} className="segment" data-state={state} />
        ))}
      </ol>
    </header>
  )
}
