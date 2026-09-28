import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { RewardsPanel } from '../components/RewardsPanel'
import {
  dueContacts,
  listContacts,
  putContacts,
  reviewContact,
  summarize,
  tierOf,
  TOP_BOX,
  type Contact,
} from '../game/contacts'
import type { Outcome, Rewards } from '../game/profile'
import { dayKey, relativeDay } from '../game/rng'
import type { Answer, Person, StudyRecord } from '../types'
import { RecallScreen } from './RecallScreen'

interface Props {
  onApply: (outcome: Outcome) => Rewards
  onContacts: () => void
  onExit: () => void
}

type Phase = 'loading' | 'error' | 'empty' | 'intro' | 'recall' | 'results'

interface Result {
  before: Contact[]
  after: Contact[]
  answers: Answer[]
  rewards: Rewards
}

const toPerson = ({ id, image, gender, name }: Contact): Person => ({ id, image, gender, name })

/** Spaced review: contacts come back just before they would be forgotten. */
export function ReunionScreen({ onApply, onContacts, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [due, setDue] = useState<Contact[]>([])
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let active = true
    listContacts()
      .then((list) => {
        if (!active) return
        const waiting = dueContacts(list, dayKey())
        setContacts(list)
        setDue(waiting)
        setPhase(waiting.length > 0 ? 'intro' : 'empty')
      })
      .catch(() => {
        if (active) setPhase('error')
      })
    return () => {
      active = false
    }
  }, [])

  const finish = (answers: Answer[]) => {
    const today = dayKey()
    const after = due.map((contact) =>
      reviewContact(contact, answers.find((answer) => answer.person.id === contact.id)?.grade !== 'wrong', today),
    )
    const merged = contacts.map((contact) => after.find((updated) => updated.id === contact.id) ?? contact)
    const rewards = onApply({
      kind: 'reunion',
      reviewed: after.length,
      remembered: answers.filter((answer) => answer.grade !== 'wrong').length,
      lifelong: after.filter((contact, i) => contact.box === TOP_BOX && due[i].box < TOP_BOX).length,
      contacts: summarize(merged),
    })
    putContacts(after).catch(() => {
      // The review still counts for XP; the schedule just doesn't move this time.
    })
    setResult({ before: due, after, answers, rewards })
    setPhase('results')
  }

  if (phase === 'loading') return null

  if (phase === 'recall') {
    const study = Object.fromEntries(
      due.map((contact): [string, StudyRecord] => [contact.id, { anchor: contact.anchor, used: 1 }]),
    )
    return (
      <RecallScreen
        questions={due.map(toPerson)}
        people={due.map(toPerson)}
        mode="typed"
        pool="extended"
        lifelines={0}
        study={study}
        phase="Reunion"
        showScore={false}
        finishLabel="See how you did"
        onFinish={finish}
        onExit={onExit}
      />
    )
  }

  if (phase === 'results' && result) {
    const remembered = result.answers.filter((answer) => answer.grade !== 'wrong').length
    return (
      <div className="screen results">
        <section className="card results-summary">
          <span className="hero-emoji" aria-hidden="true">
            👋
          </span>
          <div className="results-text">
            <p className="eyebrow">Reunion</p>
            <h1>
              {remembered === result.after.length
                ? 'You remembered everyone!'
                : `You remembered ${remembered} of ${result.after.length}`}
            </h1>
            <p className="muted">
              Remembered friends come back later and later. Forgotten ones return tomorrow for another try.
            </p>
          </div>
        </section>
        <RewardsPanel rewards={result.rewards} />
        <section className="card">
          <h2 className="section-title">Your contacts</h2>
          <ul className="contact-grid">
            {result.after.map((contact, i) => {
              const before = tierOf(result.before[i].box)
              const after = tierOf(contact.box)
              const up = contact.box > result.before[i].box
              return (
                <li key={contact.id} className="contact-card" data-tier={after.id}>
                  <img src={contact.image} alt={`Portrait of ${contact.name}`} loading="lazy" />
                  <strong>{contact.name}</strong>
                  <span className="contact-tier" data-up={up}>
                    {up ? '▲' : '▼'} {after.label}
                    {before.id !== after.id && <span className="muted"> (was {before.label.toLowerCase()})</span>}
                  </span>
                  <span className="muted small">Next: {relativeDay(contact.dueDay, dayKey())}</span>
                </li>
              )
            })}
          </ul>
        </section>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={onContacts}>
            All contacts
          </button>
          <button type="button" className="btn btn-primary" autoFocus onClick={onExit}>
            Back to the hub <Icon name="next" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen center">
      <div className="card narrow">
        <span className="hero-emoji" aria-hidden="true">
          👋
        </span>
        {phase === 'intro' && (
          <>
            <h2>
              {due.length} {due.length === 1 ? 'friend wants' : 'friends want'} to catch up
            </h2>
            <p>
              You met them before. Type each name: remembering someone moves them up a tier, and each review makes the
              memory last longer.
            </p>
            <div className="reunion-faces" aria-hidden="true">
              {due.slice(0, 5).map((contact) => (
                <img key={contact.id} src={contact.image} alt="" />
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={() => setPhase('recall')}>
              Start reunion <Icon name="next" />
            </button>
          </>
        )}
        {phase === 'empty' && (
          <>
            <h2>Nobody to catch up with yet</h2>
            <p className="muted">
              {contacts.length === 0
                ? 'Remember people in events to add them to your contacts.'
                : `Your next reunion is ${relativeDay(summarize(contacts).nextDue ?? dayKey(), dayKey())}.`}
            </p>
          </>
        )}
        {phase === 'error' && (
          <>
            <h2>Contacts are unavailable</h2>
            <p className="muted">This browser is blocking local storage, so contacts can’t be saved here.</p>
          </>
        )}
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          Back
        </button>
      </div>
    </div>
  )
}
