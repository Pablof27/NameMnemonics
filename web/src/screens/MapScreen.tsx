import type { CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import { Stars } from '../components/Stars'
import {
  CHAPTERS,
  chapterStars,
  chapterUnlocked,
  MAX_STARS,
  stageUnlocked,
  totalStars,
  type Chapter,
  type Stage,
  type StageProgress,
} from '../game/stages'
import { TECHNIQUES } from '../tips'

interface Props {
  progress: StageProgress
  onOpen: (chapter: Chapter, stage: Stage) => void
  onBack: () => void
}

export function MapScreen({ progress, onOpen, onBack }: Props) {
  const stars = totalStars(progress)

  return (
    <div className="screen map">
      <header className="page-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="back" size={18} /> Hub
        </button>
        <h1>The Social Circuit</h1>
        <span className="page-meta">
          ⭐ {stars}/{MAX_STARS}
        </span>
      </header>

      {CHAPTERS.map((chapter, index) => {
        const open = chapterUnlocked(chapter, progress)
        const technique = TECHNIQUES.find((item) => item.id === chapter.technique)
        return (
          <section
            key={chapter.id}
            className="card venue"
            data-locked={!open}
            style={{ '--venue': chapter.color } as CSSProperties}
          >
            <div className="venue-head">
              <span className="venue-emoji" aria-hidden="true">
                {chapter.emoji}
              </span>
              <div className="venue-title">
                <p className="eyebrow">
                  Venue {index + 1} · {technique?.emoji} {technique?.title}
                </p>
                <h2>{chapter.title}</h2>
                <p className="muted">{chapter.tagline}</p>
              </div>
              <span className="venue-stars">
                ⭐ {chapterStars(chapter, progress)}/{chapter.stages.length * 3}
              </span>
            </div>

            {open ? (
              <ol className="stage-list">
                {chapter.stages.map((stage) => {
                  const record = progress[stage.id]
                  const unlocked = stageUnlocked(stage.id, progress)
                  return (
                    <li key={stage.id}>
                      <button
                        type="button"
                        className="stage-node"
                        data-boss={stage.boss}
                        data-cleared={Boolean(record?.stars)}
                        disabled={!unlocked}
                        onClick={() => onOpen(chapter, stage)}
                      >
                        <span className="stage-id">{unlocked ? stage.id : <Icon name="lock" size={16} />}</span>
                        <span className="stage-title">
                          {stage.title}
                          {stage.boss && <span className="badge badge-boss">Boss</span>}
                        </span>
                        <span className="stage-meta">
                          {stage.rules.faceCount} guests · {stage.rules.secondsPerFace}s
                        </span>
                        <Stars count={record?.stars ?? 0} size={15} />
                      </button>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="lock-note">
                <Icon name="lock" size={16} /> Beat the previous boss and collect {chapter.starsNeeded} stars to open
                this venue ({Math.min(stars, chapter.starsNeeded)}/{chapter.starsNeeded}).
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}
