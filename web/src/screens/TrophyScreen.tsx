import { AchievementBadge } from '../components/AchievementBadge'
import { Icon } from '../components/Icon'
import { LevelBadge, XpBar } from '../components/XpBar'
import { ACHIEVEMENTS, type AchievementGroup } from '../game/achievements'
import type { Profile, Tally } from '../game/profile'
import { levelInfo, nextRank, rankFor } from '../game/progression'
import { MAX_STARS, totalStars } from '../game/stages'
import { RECALL_LABELS } from '../settings'
import type { RecallMode } from '../types'

interface Props {
  profile: Profile
  onReset: () => void
  onBack: () => void
}

const GROUPS: AchievementGroup[] = ['Getting started', 'Skill', 'Technique', 'Collection', 'Habits', 'Party', 'Secret']
const rate = ({ hits, total }: Tally) => (total > 0 ? hits / total : 0)
const percent = (value: number) => `${Math.round(value * 100)}%`

export function TrophyScreen({ profile, onReset, onBack }: Props) {
  const { level } = levelInfo(profile.xp)
  const upcoming = nextRank(level)
  const { stats } = profile
  const unlocked = ACHIEVEMENTS.filter((achievement) => profile.achievements[achievement.id]).length

  const numbers: [string, string][] = [
    ['Events', `${stats.events}`],
    ['Names remembered', `${stats.names}`],
    ['Perfect events', `${stats.perfectEvents}`],
    ['Best combo', `${stats.bestCombo}`],
    ['Stars', `${totalStars(profile.stages)}/${MAX_STARS}`],
    ['Contacts made', `${stats.contacts}`],
    ['Best streak', `${profile.streak.best} ${profile.streak.best === 1 ? 'day' : 'days'}`],
    ['Reunions', `${stats.reunions}`],
    ['Sprint best', `${stats.sprintBest.toLocaleString('en')}`],
    ['Party best', stats.partyBestWaves > 0 ? `Wave ${stats.partyBestWaves}` : '–'],
  ]

  const confirmReset = () => {
    if (window.confirm('Reset all progress? Levels, stars, achievements and contacts will be deleted.')) onReset()
  }

  return (
    <div className="screen trophies">
      <header className="page-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="back" size={18} /> Hub
        </button>
        <h1>Trophy Room</h1>
        <span className="page-meta">
          🏆 {unlocked}/{ACHIEVEMENTS.length}
        </span>
      </header>

      <section className="card player-card">
        <LevelBadge level={level} size="lg" />
        <div className="player-info">
          <p className="eyebrow">Level {level}</p>
          <h2>{rankFor(level)}</h2>
          <XpBar xp={profile.xp} />
          {upcoming && (
            <p className="muted small">
              Next rank: {upcoming.title} at level {upcoming.level}
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Stats</h2>
        <dl className="stat-grid">
          {numbers.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card insights">
        <h2 className="section-title">Insights · what works for you</h2>
        {stats.events === 0 ? (
          <p className="muted">Play a few events to see which techniques help you most.</p>
        ) : (
          <>
            <Comparison
              title="📍 Anchoring a feature"
              rows={[
                ['Anchored faces', stats.anchored],
                ['Not anchored', stats.unanchored],
              ]}
            />
            <Comparison
              title="💡 Picture hints"
              rows={[
                ['With hints', stats.hinted],
                ['Without hints', stats.unhinted],
              ]}
            />
            <Comparison
              title="🧠 Recall style"
              rows={(['choice', 'faces', 'typed'] as RecallMode[]).map((mode) => [RECALL_LABELS[mode], stats.byMode[mode]])}
            />
            <Verdict profile={profile} />
            {profile.history.length > 1 && <Trend values={profile.history.map((entry) => entry.accuracy)} />}
          </>
        )}
      </section>

      {GROUPS.map((group) => (
        <section key={group} className="card">
          <h2 className="section-title">{group}</h2>
          <ul className="achievement-grid">
            {ACHIEVEMENTS.filter((achievement) => achievement.group === group).map((achievement) => {
              const done = Boolean(profile.achievements[achievement.id])
              const secret = achievement.hidden && !done
              const [value, target] = achievement.progress?.(profile) ?? [0, 0]
              return (
                <li key={achievement.id} className="achievement" data-unlocked={done}>
                  <AchievementBadge achievement={achievement} unlocked={done} />
                  <div>
                    <strong>{secret ? 'Secret achievement' : achievement.title}</strong>
                    <p className="muted small">{secret ? 'Keep playing to discover it.' : achievement.description}</p>
                    {!done && !secret && target > 1 && (
                      <span className="mini-progress" aria-label={`${value} of ${target}`}>
                        <span style={{ transform: `scaleX(${value / target})` }} />
                      </span>
                    )}
                  </div>
                  <span className="achievement-xp">{done ? '✓' : `${achievement.xp} XP`}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <div className="actions">
        <button type="button" className="btn btn-ghost danger" onClick={confirmReset}>
          Reset all progress
        </button>
      </div>
    </div>
  )
}

function Comparison({ title, rows }: { title: string; rows: [string, Tally][] }) {
  const measured = rows.filter(([, tally]) => tally.total > 0)
  if (measured.length === 0) return null
  return (
    <div className="comparison">
      <h3>{title}</h3>
      {measured.map(([label, tally]) => (
        <div key={label} className="comparison-row">
          <span>{label}</span>
          <span className="comparison-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${rate(tally)})` }} />
          </span>
          <strong>{percent(rate(tally))}</strong>
          <span className="muted small">
            {tally.hits}/{tally.total}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Turns the anchoring numbers into a one-line takeaway once there is enough data. */
function Verdict({ profile: { stats } }: { profile: Profile }) {
  if (stats.anchored.total < 5 || stats.unanchored.total < 5) {
    return <p className="insight">📍 Anchor at least 5 faces to see whether it helps you.</p>
  }
  const gain = rate(stats.anchored) - rate(stats.unanchored)
  return (
    <p className="insight">
      {gain > 0.05
        ? `📈 Anchoring works for you: you remember ${Math.round(gain * 100)} points more of the faces you anchor.`
        : 'Anchoring hasn’t paid off yet. Link the name’s picture to the feature in a wild, moving scene.'}
    </p>
  )
}

function Trend({ values }: { values: number[] }) {
  const width = 300
  const height = 60
  const points = values
    .map((value, i) => `${(i / (values.length - 1)) * width},${height - value * (height - 6) - 3}`)
    .join(' ')
  return (
    <figure className="trend">
      <figcaption className="muted small">Accuracy over your last {values.length} events</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} />
      </svg>
    </figure>
  )
}
