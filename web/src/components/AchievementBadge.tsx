import type { Achievement } from '../game/achievements'

export function AchievementBadge({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  return (
    <span className="badge-icon" data-unlocked={unlocked} aria-hidden="true">
      {achievement.hidden && !unlocked ? '?' : achievement.emoji}
    </span>
  )
}
