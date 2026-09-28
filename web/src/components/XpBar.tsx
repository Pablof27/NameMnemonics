import { levelInfo } from '../game/progression'

export function LevelBadge({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className="level-badge" data-size={size}>
      <span className="visually-hidden">Level </span>
      {level}
    </span>
  )
}

export function XpBar({ xp }: { xp: number }) {
  const { into, needed } = levelInfo(xp)
  return (
    <div className="xp">
      <div
        className="xp-track"
        role="progressbar"
        aria-label="Progress to the next level"
        aria-valuemin={0}
        aria-valuemax={needed}
        aria-valuenow={into}
      >
        <div className="xp-fill" style={{ transform: `scaleX(${into / needed})` }} />
      </div>
      <span className="xp-label">
        {into} / {needed} XP
      </span>
    </div>
  )
}
