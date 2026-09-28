import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Rewards } from '../game/profile'
import { levelInfo, rankFor, type Unlock } from '../game/progression'
import { sfx } from '../lib/sound'
import { AchievementBadge } from './AchievementBadge'
import { Confetti } from './Confetti'
import { LevelBadge } from './XpBar'

const FILL_MS = 1400

/** Counts from `from` to `to` after `delayMs`, easing out. Returns the current value. */
function useCountUp(from: number, to: number, delayMs: number): number {
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [value, setValue] = useState(reduced ? to : from)

  useEffect(() => {
    if (reduced) return
    let frame = 0
    const start = performance.now() + delayMs
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / FILL_MS))
      setValue(from + (to - from) * (1 - (1 - t) ** 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [from, to, delayMs, reduced])

  return value
}

/** XP, level progress, streak, quests and achievements earned by one game. */
export function RewardsPanel({ rewards, delay = 800 }: { rewards: Rewards; delay?: number }) {
  const xp = useCountUp(rewards.xpBefore, rewards.xpAfter, delay)
  const finished = xp >= rewards.xpAfter
  const shown = levelInfo(Math.floor(xp))
  const before = levelInfo(rewards.xpBefore).level
  const after = levelInfo(rewards.xpAfter).level
  const [dialogClosed, setDialogClosed] = useState(false)
  const { streak, achievements, quests, venues } = rewards

  useEffect(() => {
    if (finished && after > before) sfx.levelUp()
  }, [finished, after, before])

  useEffect(() => {
    if (achievements.length === 0 && quests.length === 0 && venues.length === 0) return
    const timer = setTimeout(sfx.achievement, delay + FILL_MS)
    return () => clearTimeout(timer)
  }, [achievements.length, quests.length, venues.length, delay])

  return (
    <section className="card rewards" aria-label="Rewards">
      <div className="rewards-head">
        <h2 className="rewards-xp">+{rewards.xpAfter - rewards.xpBefore} XP</h2>
        {streak.extended && (
          <span className="streak-pill">
            🔥 {streak.count}-day streak
          </span>
        )}
      </div>

      <div className="rewards-level">
        <LevelBadge level={shown.level} />
        <div className="rewards-bar">
          <div className="xp-track">
            <div className="xp-fill" style={{ transform: `scaleX(${shown.into / shown.needed})` }} />
          </div>
          <span className="xp-label">
            {rankFor(shown.level)} · {Math.floor(shown.into)} / {shown.needed} XP
          </span>
        </div>
      </div>

      <ul className="xp-lines">
        {rewards.lines.map((line) => (
          <li key={line.label}>
            <span>{line.label}</span>
            <strong>+{line.xp}</strong>
          </li>
        ))}
      </ul>

      {(streak.freezeEarned || streak.freezesUsed > 0) && (
        <p className="muted small">
          {streak.freezesUsed > 0 &&
            `🧊 ${streak.freezesUsed === 1 ? 'A streak freeze' : `${streak.freezesUsed} streak freezes`} covered the days you missed. `}
          {streak.freezeEarned && '🧊 You earned a streak freeze: it saves your streak if you miss a day.'}
        </p>
      )}

      {venues.length > 0 && (
        <div className="reward-group">
          <h3 className="section-title">New venue unlocked</h3>
          <ul className="reward-list">
            {venues.map((venue) => (
              <li key={venue.id} className="reward-item pop">
                <span className="badge-icon" data-unlocked="true" aria-hidden="true">
                  {venue.emoji}
                </span>
                <span>
                  <strong>{venue.title}</strong>
                  <span className="muted small"> · {venue.tagline}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {quests.length > 0 && (
        <div className="reward-group">
          <h3 className="section-title">Quests completed</h3>
          <ul className="reward-list">
            {quests.map((quest) => (
              <li key={quest.title} className="reward-item pop">
                <span className="quest-check" aria-hidden="true">
                  ✓
                </span>
                <span>{quest.title}</span>
                <strong>+{quest.xp} XP</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {achievements.length > 0 && (
        <div className="reward-group">
          <h3 className="section-title">Achievements unlocked</h3>
          <ul className="reward-list">
            {achievements.map((achievement, i) => (
              <li key={achievement.id} className="reward-item pop" style={{ animationDelay: `${0.15 * i}s` }}>
                <AchievementBadge achievement={achievement} unlocked />
                <span>
                  <strong>{achievement.title}</strong>
                  <span className="muted small"> · {achievement.description}</span>
                </span>
                <strong>+{achievement.xp} XP</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {finished && after > before && !dialogClosed && (
        <LevelUpDialog level={after} previous={before} unlocks={rewards.unlocks} onClose={() => setDialogClosed(true)} />
      )}
    </section>
  )
}

interface DialogProps {
  level: number
  previous: number
  unlocks: Unlock[]
  onClose: () => void
}

function LevelUpDialog({ level, previous, unlocks, onClose }: DialogProps) {
  const rank = rankFor(level)
  const newRank = rank !== rankFor(previous)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
      <Confetti fire={level} />
      <div className="card dialog level-up">
        <LevelBadge level={level} size="lg" />
        <h2 id="level-up-title">Level {level}!</h2>
        <p className="muted">{newRank ? <>New rank: <strong className="rank">{rank}</strong></> : <>Rank: {rank}</>}</p>
        {unlocks.length > 0 && (
          <ul className="unlock-list">
            {unlocks.map((unlock) => (
              <li key={unlock.feature}>
                <span className="unlock-emoji" aria-hidden="true">
                  {unlock.emoji}
                </span>
                <span>
                  <strong>{unlock.title} unlocked!</strong>
                  <span className="muted small">{unlock.description}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={onClose}>
          Awesome!
        </button>
      </div>
    </div>,
    document.body,
  )
}
