import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Stars } from '../components/Stars'
import { LevelBadge, XpBar } from '../components/XpBar'
import { ACHIEVEMENTS } from '../game/achievements'
import { dueContacts, type Contact } from '../game/contacts'
import { dailyEvent, dailyNumber } from '../game/daily'
import { streakToday, type Profile } from '../game/profile'
import { isUnlocked, levelInfo, rankFor, unlockFor, type Feature } from '../game/progression'
import { ALL_QUESTS_BONUS, questTitle, questXp } from '../game/quests'
import { dayKey, relativeDay } from '../game/rng'
import { MAX_STARS, nextStage, totalStars } from '../game/stages'
import { prefetchFaces } from '../lib/facePool'

export type HubTarget =
  | 'continue'
  | 'map'
  | 'daily'
  | 'reunion'
  | 'sprint'
  | 'party'
  | 'free'
  | 'handbook'
  | 'trophies'
  | 'contacts'

interface Props {
  profile: Profile
  contacts: Contact[] | null
  onOpen: (target: HubTarget) => void
}

export function HubScreen({ profile, contacts, onOpen }: Props) {
  const today = dayKey()
  const { level } = levelInfo(profile.xp)
  const next = nextStage(profile.stages)
  const record = profile.stages[next.stage.id]
  const streak = streakToday(profile.streak, today)
  const stars = totalStars(profile.stages)
  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) => profile.achievements[achievement.id]).length
  const due = contacts ? dueContacts(contacts, today).length : 0
  const veteran = profile.stats.events > 0

  useEffect(() => prefetchFaces(next.stage.rules.faceCount), [next.stage.rules.faceCount])

  return (
    <div className="screen hub">
      <section className="card player-card">
        <LevelBadge level={level} size="lg" />
        <div className="player-info">
          <p className="eyebrow">Level {level}</p>
          <h1>{rankFor(level)}</h1>
          <XpBar xp={profile.xp} />
        </div>
        <ul className="player-stats">
          <li title="Days in a row">
            <span aria-hidden="true">🔥</span> <strong>{streak.count}</strong> day streak
            {profile.streak.freezes > 0 && <span className="muted"> · 🧊 {profile.streak.freezes}</span>}
          </li>
          <li>
            <span aria-hidden="true">⭐</span> <strong>{stars}</strong>/{MAX_STARS} stars
          </li>
          <li>
            <span aria-hidden="true">🏆</span> <strong>{unlockedAchievements}</strong>/{ACHIEVEMENTS.length} badges
          </li>
        </ul>
      </section>

      <section className="card continue-card" style={{ '--venue': next.chapter.color } as CSSProperties}>
        <div className="continue-art" aria-hidden="true">
          {next.chapter.emoji}
        </div>
        <div className="continue-text">
          <p className="eyebrow">
            {record?.plays ? 'Continue' : 'Up next'} · {next.chapter.title}
          </p>
          <h2>
            {next.stage.id} · {next.stage.title}
            {next.stage.boss && <span className="badge badge-boss">Boss</span>}
          </h2>
          <p className="muted">{next.stage.flavor}</p>
          {record?.plays ? <Stars count={record.stars} size={16} /> : null}
        </div>
        <div className="continue-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => onOpen('continue')}>
            Play <Icon name="play" />
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onOpen('map')}>
            <Icon name="map" /> Social Circuit
          </button>
        </div>
      </section>

      {veteran && (
        <div className="today-grid">
          <DailyCard profile={profile} level={level} today={today} onPlay={() => onOpen('daily')} />
          <ReunionCard contacts={contacts} due={due} today={today} onOpen={onOpen} />
          <QuestsCard profile={profile} />
        </div>
      )}

      <section aria-label="More ways to train">
        <h2 className="section-title">Training</h2>
        <div className="mode-grid">
          <ModeCard
            feature="sprint"
            level={level}
            emoji="🎨"
            title="Picture Sprint"
            text="60 seconds of turning names into pictures and back."
            meta={profile.stats.sprintBest > 0 ? `Best ${profile.stats.sprintBest.toLocaleString('en')}` : undefined}
            onClick={() => onOpen('sprint')}
          />
          <ModeCard
            feature="party"
            level={level}
            emoji="🎉"
            title="Endless Party"
            text="Guests keep arriving. Remember everyone with three lives."
            meta={profile.stats.partyBestWaves > 0 ? `Best: wave ${profile.stats.partyBestWaves}` : undefined}
            onClick={() => onOpen('party')}
          />
          <ModeCard
            feature="free"
            level={level}
            emoji="🎛️"
            title="Free Practice"
            text="Your own rules, or Smart difficulty that adapts to you."
            meta={`Smart level ${profile.smartLevel}`}
            onClick={() => onOpen('free')}
          />
          <ModeCard emoji="📖" title="Handbook" text="Every technique, with examples." onClick={() => onOpen('handbook')} />
          <ModeCard
            emoji="🏆"
            title="Trophy Room"
            text="Stats, insights and achievements."
            meta={`${unlockedAchievements}/${ACHIEVEMENTS.length} badges`}
            onClick={() => onOpen('trophies')}
          />
          <ModeCard
            emoji="👥"
            title="Contacts"
            text="Everyone you have remembered."
            meta={contacts ? `${contacts.length} people` : undefined}
            onClick={() => onOpen('contacts')}
          />
        </div>
      </section>
    </div>
  )
}

function DailyCard({ profile, level, today, onPlay }: { profile: Profile; level: number; today: string; onPlay: () => void }) {
  if (!isUnlocked('daily', level)) {
    return (
      <LockedCard emoji="📅" title="Daily Event" level={unlockFor('daily').level} text="A new themed event every day." />
    )
  }
  const event = dailyEvent(today)
  const done = profile.daily?.day === today
  return (
    <section className="card today-card">
      <p className="eyebrow">
        Daily Event #{dailyNumber(today)} {done && '· done ✓'}
      </p>
      <h2>
        {event.emoji} {event.title}
      </h2>
      {done && profile.daily ? (
        <p className="muted">
          {Math.round(profile.daily.accuracy * 100)}% · {profile.daily.score.toLocaleString('en')} pts ·{' '}
          <Stars count={profile.daily.stars} size={14} />
        </p>
      ) : (
        <p className="muted">{event.flavor}</p>
      )}
      <button type="button" className={`btn ${done ? 'btn-secondary' : 'btn-primary'}`} onClick={onPlay}>
        {done ? 'Play again' : 'Play today’s event'}
      </button>
    </section>
  )
}

function ReunionCard({
  contacts,
  due,
  today,
  onOpen,
}: {
  contacts: Contact[] | null
  due: number
  today: string
  onOpen: (target: HubTarget) => void
}) {
  if (!contacts) return null
  if (contacts.length === 0) {
    return (
      <section className="card today-card">
        <p className="eyebrow">Reunion</p>
        <h2>👋 No contacts yet</h2>
        <p className="muted">Everyone you remember in an event becomes a contact. They come back here for a catch-up.</p>
      </section>
    )
  }
  const nextDue = contacts.map((contact) => contact.dueDay).sort()[0]
  return (
    <section className="card today-card" data-highlight={due > 0}>
      <p className="eyebrow">Reunion</p>
      <h2>👋 {due > 0 ? `${due} ${due === 1 ? 'friend is' : 'friends are'} waiting` : 'All caught up'}</h2>
      <p className="muted">
        {due > 0
          ? 'Catch up before you forget them. Spaced reviews make names last for good.'
          : `Next reunion ${relativeDay(nextDue, today)}.`}
      </p>
      <div className="row">
        {due > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => onOpen('reunion')}>
            Start reunion
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => onOpen('contacts')}>
          Contacts
        </button>
      </div>
    </section>
  )
}

function QuestsCard({ profile }: { profile: Profile }) {
  const { list, bonus } = profile.quests
  const done = list.filter((quest) => quest.done).length
  return (
    <section className="card today-card quests-card">
      <p className="eyebrow">
        Daily quests · {done}/{list.length}
      </p>
      <ul className="quest-list">
        {list.map((quest) => (
          <li key={quest.id} data-done={quest.done}>
            <span className="quest-check" aria-hidden="true">
              {quest.done ? '✓' : ''}
            </span>
            <span className="quest-body">
              <span className="quest-title">{questTitle(quest)}</span>
              <span className="quest-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${quest.progress / quest.target})` }} />
              </span>
            </span>
            <span className="quest-xp">
              {quest.done ? 'Done' : `${quest.progress}/${quest.target}`} · {questXp(quest)} XP
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">
        {bonus ? '🎁 All done for today!' : `🎁 Finish all ${list.length} for a +${ALL_QUESTS_BONUS} XP bonus.`}
      </p>
    </section>
  )
}

interface ModeCardProps {
  feature?: Feature
  level?: number
  emoji: string
  title: string
  text: string
  meta?: ReactNode
  onClick: () => void
}

function ModeCard({ feature, level = 1, emoji, title, text, meta, onClick }: ModeCardProps) {
  if (feature && !isUnlocked(feature, level)) {
    return <LockedCard emoji={emoji} title={title} text={text} level={unlockFor(feature).level} />
  }
  return (
    <button type="button" className="card mode-card" onClick={onClick}>
      <span className="mode-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="mode-title">{title}</span>
      <span className="mode-text">{text}</span>
      {meta && <span className="mode-meta">{meta}</span>}
    </button>
  )
}

function LockedCard({ emoji, title, text, level }: { emoji: string; title: string; text: string; level: number }) {
  return (
    <div className="card mode-card locked" aria-disabled="true">
      <span className="mode-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="mode-title">{title}</span>
      <span className="mode-text">{text}</span>
      <span className="mode-meta">
        <Icon name="lock" size={14} /> Unlocks at level {level}
      </span>
    </div>
  )
}
