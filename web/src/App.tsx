import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './components/Icon'
import { ThemeToggle } from './components/ThemeToggle'
import { clearContacts } from './game/contacts'
import { dailyEvent, shareText } from './game/daily'
import { streakToday } from './game/profile'
import { levelInfo } from './game/progression'
import { dayKey } from './game/rng'
import { freeEvent, smartDifficulty } from './game/smart'
import {
  CHAPTERS,
  findStage,
  nextStage,
  stageAfter,
  stageEvent,
  stageUnlocked,
  totalStars,
  type Chapter,
  type Stage,
} from './game/stages'
import { useContacts } from './hooks/useContacts'
import { useProfile } from './hooks/useProfile'
import { useTheme } from './hooks/useTheme'
import { setSoundEnabled } from './lib/sound'
import { BriefingScreen } from './screens/BriefingScreen'
import { ContactsScreen } from './screens/ContactsScreen'
import { EventFlow } from './screens/EventFlow'
import { HandbookScreen } from './screens/HandbookScreen'
import { HubScreen, type HubTarget } from './screens/HubScreen'
import { MapScreen } from './screens/MapScreen'
import { PartyScreen } from './screens/PartyScreen'
import { ReunionScreen } from './screens/ReunionScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SprintScreen } from './screens/SprintScreen'
import { TrophyScreen } from './screens/TrophyScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { loadSettings, saveSettings } from './settings'
import { TECHNIQUES } from './tips'
import type { EventConfig, Settings } from './types'

type View =
  | { name: 'welcome' | 'hub' | 'map' | 'free' | 'sprint' | 'party' | 'reunion' | 'contacts' | 'handbook' | 'trophies' }
  | { name: 'briefing'; event: EventConfig }
  | { name: 'event'; event: EventConfig; hints: boolean; run: number }

/** Views that are a game in progress, where the top bar stays out of the way. */
const IN_GAME = new Set<View['name']>(['event', 'sprint', 'party', 'reunion'])

export default function App() {
  const [theme, setTheme] = useTheme()
  const { profile, apply, update, reset } = useProfile()
  const { contacts, failed, reload } = useContacts()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [view, setView] = useState<View>(() => ({ name: profile.welcomed ? 'hub' : 'welcome' }))
  const level = levelInfo(profile.xp).level
  const streak = streakToday(profile.streak, dayKey())

  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => setSoundEnabled(profile.sound), [profile.sound])

  // Reviews and new contacts are saved in the background, so read them again when they are shown.
  useEffect(() => {
    if (view.name === 'hub' || view.name === 'contacts') reload()
  }, [view.name, reload])

  const goHub = () => setView({ name: 'hub' })
  const openStage = (chapter: Chapter, stage: Stage) => setView({ name: 'briefing', event: stageEvent(chapter, stage) })

  const play = (event: EventConfig) => {
    const { hints } = event.rules
    const optional = event.kind === 'free' ? settings.hints : profile.hints
    // A new run number remounts the event, so replays start over with new faces.
    setView((current) => ({
      name: 'event',
      event,
      hints: hints === 'on' || (hints === 'optional' && optional),
      run: current.name === 'event' ? current.run + 1 : 0,
    }))
  }

  const smartEvent = () => freeEvent(smartDifficulty(profile.smartLevel), settings.recall, profile.smartLevel)

  const openFromHub = (target: HubTarget) => {
    if (target === 'continue') {
      const { chapter, stage } = nextStage(profile.stages)
      openStage(chapter, stage)
    } else if (target === 'daily') {
      setView({ name: 'briefing', event: dailyEvent(dayKey()) })
    } else {
      setView({ name: target })
    }
  }

  const leaveEvent = (event: EventConfig) => setView({ name: event.kind === 'campaign' ? 'map' : event.kind === 'free' ? 'free' : 'hub' })

  const eventActions = (event: EventConfig, practiceAgain: () => void): ReactNode => {
    if (event.kind === 'campaign') {
      const after = stageAfter(event.id)
      const canContinue = after !== undefined && stageUnlocked(after.stage.id, profile.stages)
      return (
        <>
          <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'map' })}>
            <Icon name="map" /> Social Circuit
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => play(event)}>
            <Icon name="retry" /> Replay with new faces
          </button>
          {canContinue && (
            <button type="button" className="btn btn-primary" onClick={() => openStage(after.chapter, after.stage)}>
              Next: {after.stage.title} <Icon name="next" />
            </button>
          )}
        </>
      )
    }
    if (event.kind === 'daily') {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => play(event)}>
            <Icon name="retry" /> Practice again
          </button>
          <button type="button" className="btn btn-primary" onClick={goHub}>
            Back to the hub <Icon name="next" />
          </button>
        </>
      )
    }
    return (
      <>
        <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'free' })}>
          <Icon name="back" /> Change settings
        </button>
        <button type="button" className="btn btn-secondary" onClick={practiceAgain}>
          <Icon name="retry" /> Same faces again
        </button>
        <button type="button" className="btn btn-primary" onClick={() => play(event.smart ? smartEvent() : event)}>
          New faces <Icon name="next" />
        </button>
      </>
    )
  }

  /** Explains why the next venue is still closed, if that is what stops the player. */
  const lockNote = (event: EventConfig): ReactNode => {
    const after = event.kind === 'campaign' ? stageAfter(event.id) : undefined
    if (!after || !profile.stages[event.id]?.stars || stageUnlocked(after.stage.id, profile.stages)) return null
    return (
      <p className="near-miss">
        🔒 {after.chapter.emoji} {after.chapter.title} opens at {after.chapter.starsNeeded} ★. You have{' '}
        {totalStars(profile.stages)}: replay stages to earn more.
      </p>
    )
  }

  const renderView = () => {
    switch (view.name) {
      case 'welcome':
        return (
          <WelcomeScreen
            onStart={() => {
              update((current) => ({ ...current, welcomed: true }))
              openStage(CHAPTERS[0], CHAPTERS[0].stages[0])
            }}
          />
        )
      case 'hub':
        return <HubScreen profile={profile} contacts={contacts} onOpen={openFromHub} />
      case 'map':
        return <MapScreen progress={profile.stages} onOpen={openStage} onBack={goHub} />
      case 'briefing': {
        const { event } = view
        const found = event.kind === 'campaign' ? findStage(event.id) : undefined
        const record = profile.stages[event.id]
        return (
          <BriefingScreen
            event={event}
            chapter={found?.chapter}
            boss={found?.stage.boss}
            technique={found && TECHNIQUES.find((technique) => technique.id === found.chapter.technique)}
            newTechnique={found?.chapter.stages[0].id === event.id && !record?.plays}
            record={record}
            hints={profile.hints}
            onHintsChange={(hints) => update((current) => ({ ...current, hints }))}
            onStart={() => play(event)}
            onBack={found ? () => setView({ name: 'map' }) : goHub}
            backLabel={found ? 'Social Circuit' : 'Hub'}
          />
        )
      }
      case 'event': {
        const { event, hints, run } = view
        const daily = event.kind === 'daily' && profile.daily?.day === event.id ? profile.daily : null
        return (
          <EventFlow
            key={run}
            event={event}
            hints={hints}
            share={daily ? shareText(daily, streak.count) : undefined}
            note={lockNote(event)}
            onApply={apply}
            onContacts={(summary) => {
              update((current) => ({ ...current, contacts: summary }))
              reload()
            }}
            onExit={() => leaveEvent(event)}
            actions={(practiceAgain) => eventActions(event, practiceAgain)}
          />
        )
      }
      case 'free':
        return (
          <SetupScreen
            settings={settings}
            smartLevel={profile.smartLevel}
            onChange={setSettings}
            onStart={() =>
              play(
                freeEvent(
                  { faceCount: settings.faceCount, secondsPerFace: settings.secondsPerFace, namePool: settings.namePool },
                  settings.recall,
                ),
              )
            }
            onStartSmart={() => play(smartEvent())}
            onBack={goHub}
          />
        )
      case 'sprint':
        return <SprintScreen best={profile.stats.sprintBest} onApply={apply} onExit={goHub} />
      case 'party':
        return (
          <PartyScreen
            best={{ score: profile.stats.partyBestScore, waves: profile.stats.partyBestWaves }}
            onApply={apply}
            onExit={goHub}
          />
        )
      case 'reunion':
        return <ReunionScreen onApply={apply} onContacts={() => setView({ name: 'contacts' })} onExit={goHub} />
      case 'contacts':
        return (
          <ContactsScreen
            contacts={contacts}
            failed={failed}
            onReunion={() => setView({ name: 'reunion' })}
            onBack={goHub}
          />
        )
      case 'handbook':
        return <HandbookScreen progress={profile.stages} onBack={goHub} />
      case 'trophies':
        return (
          <TrophyScreen
            profile={profile}
            onReset={() => {
              reset()
              clearContacts()
                .catch(() => {
                  // Nothing to clear when storage is unavailable.
                })
                .finally(reload)
              setView({ name: 'welcome' })
            }}
            onBack={goHub}
          />
        )
    }
  }

  const inGame = IN_GAME.has(view.name)

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={goHub} disabled={!profile.welcomed}>
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <rect width="64" height="64" rx="16" fill="currentColor" />
            <circle cx="32" cy="25" r="10" fill="#fff" />
            <path d="M13 52c1.5-10 9.5-16 19-16s17.5 6 19 16z" fill="#fff" />
          </svg>
          Name Mnemonics
        </button>
        <div className="topbar-tools">
          {profile.welcomed && !inGame && (
            <button type="button" className="player-chip" onClick={() => setView({ name: 'trophies' })}>
              <span title="Day streak">🔥 {streak.count}</span>
              <span className="player-chip-level">Lv {level}</span>
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            aria-pressed={profile.sound}
            aria-label="Sound effects"
            title={profile.sound ? 'Mute sound effects' : 'Turn sound effects on'}
            onClick={() => update((current) => ({ ...current, sound: !current.sound }))}
          >
            <Icon name={profile.sound ? 'volume' : 'mute'} size={18} />
          </button>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </header>

      <main className="main">{renderView()}</main>
    </div>
  )
}
