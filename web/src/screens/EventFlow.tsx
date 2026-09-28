import { useEffect, useState, type ReactNode } from 'react'
import { addContacts } from '../game/contacts'
import type { ContactsSummary, Outcome, Rewards } from '../game/profile'
import { dayKey } from '../game/rng'
import { scoreEvent, type EventScore } from '../game/scoring'
import { takeFaces } from '../lib/facePool'
import { assignNames, normalizeName } from '../lib/names'
import { shuffle } from '../lib/shuffle'
import type { Answer, EventConfig, Person, StudyRecord } from '../types'
import { LoadingScreen } from './LoadingScreen'
import { ReadyScreen } from './ReadyScreen'
import { RecallScreen } from './RecallScreen'
import { ResultsScreen } from './ResultsScreen'
import { SmallTalkScreen } from './SmallTalkScreen'
import { StudyScreen } from './StudyScreen'

type Phase = 'loading' | 'study' | 'small-talk' | 'ready' | 'recall' | 'results'

interface Result {
  answers: Answer[]
  score: EventScore
  rewards: Rewards
}

interface Props {
  event: EventConfig
  hints: boolean
  share?: string
  note?: ReactNode
  onApply: (outcome: Outcome) => Rewards
  onContacts: (summary: ContactsSummary) => void
  onExit: () => void
  /** Buttons for the results screen; `practiceAgain` replays the same faces. */
  actions: (practiceAgain: () => void) => ReactNode
}

/** One event from start to finish: meet the guests, maybe small talk, greet them, see the rewards. */
export function EventFlow({ event, hints, share, note, onApply, onContacts, onExit, actions }: Props) {
  const { rules } = event
  const [phase, setPhase] = useState<Phase>('loading')
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [order, setOrder] = useState<Person[]>([])
  const [study, setStudy] = useState<Record<string, StudyRecord>>({})
  const [retry, setRetry] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    takeFaces(rules.faceCount, controller.signal, setLoaded)
      .then((faces) => {
        if (controller.signal.aborted) return
        const names = assignNames(
          faces.map((face) => face.gender),
          rules.namePool,
        )
        const vips = new Set(
          shuffle(faces)
            .slice(0, rules.vips)
            .map((face) => face.id),
        )
        setPeople(
          faces.map((face, i) => ({
            id: face.id,
            image: face.image,
            gender: face.gender,
            name: names[i],
            vip: vips.has(face.id),
          })),
        )
        setPhase('study')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => controller.abort()
  }, [rules, attempt])

  const retryLoading = () => {
    setError(null)
    setLoaded(0)
    setAttempt((n) => n + 1)
  }

  const finishStudy = (records: Record<string, StudyRecord>) => {
    setStudy(records)
    setPhase(rules.smallTalk > 0 ? 'small-talk' : 'ready')
  }

  const startRecall = () => {
    let shuffled = shuffle(people)
    // Recalling in the study order would only test the sequence, not the faces.
    while (shuffled.length > 1 && shuffled.every((person, i) => person === people[i])) shuffled = shuffle(people)
    setOrder(shuffled)
    setPhase('recall')
  }

  const finishRecall = (answers: Answer[]) => {
    const score = scoreEvent(answers, rules, hints, study)
    // Only people remembered without help become contacts, and a replay meets nobody new.
    const met = retry ? [] : answers.filter((answer) => answer.grade !== 'wrong' && !answer.assisted)
    const rewards = onApply({ kind: 'event', event, answers, study, hints, score, retry, newContacts: met.length })
    setResult({ answers, score, rewards })
    setPhase('results')
    if (met.length > 0) {
      addContacts(
        met.map((answer) => ({ person: answer.person, anchor: study[answer.person.id]?.anchor })),
        dayKey(),
      )
        .then(onContacts)
        .catch(() => {
          // Contacts are a bonus: without IndexedDB the event still counts.
        })
    }
  }

  const practiceAgain = () => {
    setRetry(true)
    setStudy({})
    setResult(null)
    setPhase('study')
  }

  switch (phase) {
    case 'loading':
      return (
        <LoadingScreen loaded={loaded} total={rules.faceCount} error={error} onRetry={retryLoading} onCancel={onExit} />
      )
    case 'study':
      return (
        <StudyScreen
          people={people}
          secondsPerFace={rules.secondsPerFace}
          showHints={hints}
          faceFirst={rules.faceFirst}
          onFinish={finishStudy}
          onExit={onExit}
        />
      )
    case 'small-talk':
      return (
        <SmallTalkScreen
          seconds={rules.smallTalk}
          exclude={new Set(people.map((person) => normalizeName(person.name)))}
          onDone={() => setPhase('ready')}
          onExit={onExit}
        />
      )
    case 'ready':
      return <ReadyScreen count={people.length} mode={rules.recall} lifelines={rules.lifelines} onStart={startRecall} />
    case 'recall':
      return (
        <RecallScreen
          questions={order}
          people={people}
          mode={rules.recall}
          pool={rules.namePool}
          lifelines={rules.lifelines}
          study={study}
          onFinish={finishRecall}
          onExit={onExit}
        />
      )
    case 'results':
      return (
        result && (
          <ResultsScreen
            event={event}
            people={people}
            answers={result.answers}
            study={study}
            hints={hints}
            score={result.score}
            rewards={result.rewards}
            share={share}
            note={note}
            actions={actions(practiceAgain)}
          />
        )
      )
  }
}
