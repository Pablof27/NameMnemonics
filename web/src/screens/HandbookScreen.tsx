import { Icon } from '../components/Icon'
import { CHAPTERS, chapterUnlocked, type StageProgress } from '../game/stages'
import { TECHNIQUES } from '../tips'

interface Props {
  progress: StageProgress
  onBack: () => void
}

/** Every technique, unlocked venue by venue as the Social Circuit teaches it. */
export function HandbookScreen({ progress, onBack }: Props) {
  return (
    <div className="screen handbook">
      <header className="page-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="back" size={18} /> Hub
        </button>
        <h1>Handbook</h1>
        <span />
      </header>

      <ol className="handbook-list">
        {TECHNIQUES.map((technique, index) => {
          const chapter = CHAPTERS.find((item) => item.technique === technique.id)
          const open = !chapter || chapterUnlocked(chapter, progress)
          return (
            <li key={technique.id} className="card technique-card" data-locked={!open}>
              <span className="technique-emoji" aria-hidden="true">
                {open ? technique.emoji : '🔒'}
              </span>
              <div>
                <p className="eyebrow">
                  Step {index + 1}
                  {chapter && ` · ${chapter.emoji} ${chapter.title}`}
                </p>
                <h2>{technique.title}</h2>
                {open ? (
                  <>
                    <p>
                      <strong>{technique.summary}</strong> {technique.text}
                    </p>
                    <p className="practice">
                      <strong>Try it:</strong> {technique.practice}
                    </p>
                  </>
                ) : (
                  <p className="muted">Unlocks when you reach this venue on the Social Circuit.</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
