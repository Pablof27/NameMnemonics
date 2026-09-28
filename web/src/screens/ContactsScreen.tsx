import { Icon } from '../components/Icon'
import { dueContacts, isDue, tierOf, TIERS, TOP_BOX, type Contact } from '../game/contacts'
import { dayKey, relativeDay } from '../game/rng'

interface Props {
  contacts: Contact[] | null
  failed: boolean
  onReunion: () => void
  onBack: () => void
}

export function ContactsScreen({ contacts, failed, onReunion, onBack }: Props) {
  const today = dayKey()
  const due = contacts ? dueContacts(contacts, today).length : 0
  const sorted = [...(contacts ?? [])].sort((a, b) => b.box - a.box || a.name.localeCompare(b.name, 'es'))

  return (
    <div className="screen contacts">
      <header className="page-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="back" size={18} /> Hub
        </button>
        <h1>Contacts</h1>
        <span className="page-meta">{contacts ? `${contacts.length} people` : ''}</span>
      </header>

      {failed ? (
        <section className="card">
          <p className="muted">This browser is blocking local storage, so contacts can’t be saved here.</p>
        </section>
      ) : contacts && contacts.length === 0 ? (
        <section className="card empty-state">
          <span className="hero-emoji" aria-hidden="true">
            📒
          </span>
          <h2>Your contact book is empty</h2>
          <p className="muted">
            Everyone you remember in an event, without a lifeline, becomes a contact. Reunions then bring them back
            over days and weeks, which is how names stick for good.
          </p>
        </section>
      ) : (
        contacts && (
          <>
            <section className="card contacts-summary">
              <ul className="tier-legend">
                {TIERS.map((tier) => (
                  <li key={tier.id} data-tier={tier.id}>
                    <strong>{contacts.filter((contact) => tierOf(contact.box).id === tier.id).length}</strong>{' '}
                    {tier.label}
                  </li>
                ))}
              </ul>
              {due > 0 ? (
                <button type="button" className="btn btn-primary" onClick={onReunion}>
                  👋 Catch up with {due} {due === 1 ? 'friend' : 'friends'}
                </button>
              ) : (
                <p className="muted">All caught up. Reunions bring each contact back just before you’d forget them.</p>
              )}
            </section>

            <ul className="contact-grid">
              {sorted.map((contact) => {
                const tier = tierOf(contact.box)
                const waiting = isDue(contact, today)
                return (
                  <li key={contact.id} className="contact-card" data-tier={tier.id} data-due={waiting}>
                    <img src={contact.image} alt={`Portrait of ${contact.name}`} loading="lazy" />
                    <strong>{contact.name}</strong>
                    <span className="contact-tier">{tier.label}</span>
                    <span className="box-dots" aria-label={`Level ${contact.box} of ${TOP_BOX}`}>
                      {Array.from({ length: TOP_BOX }, (_, i) => (
                        <span key={i} data-on={i < contact.box} />
                      ))}
                    </span>
                    <span className="muted small">
                      {waiting ? 'Wants to catch up' : `Next: ${relativeDay(contact.dueDay, today)}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )
      )}
    </div>
  )
}
