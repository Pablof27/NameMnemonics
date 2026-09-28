import type { Anchor, Gender, Person } from '../types'
import type { ContactsSummary } from './profile'
import { addDays } from './rng'

/** Someone the player met and recalled, kept for spaced review in reunions. */
export interface Contact {
  id: string
  name: string
  gender: Gender
  image: string
  anchor?: Anchor
  metDay: string
  /** Leitner box from 1 to TOP_BOX: higher boxes come back less often. */
  box: number
  dueDay: string
  reviews: number
  lapses: number
}

export const TOP_BOX = 6
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60]
export const REUNION_SIZE = 10

export interface Tier {
  id: 'acquaintance' | 'friend' | 'close' | 'lifelong'
  label: string
  minBox: number
}

/** From the highest tier down. */
export const TIERS: Tier[] = [
  { id: 'lifelong', label: 'Lifelong friend', minBox: TOP_BOX },
  { id: 'close', label: 'Close friend', minBox: 5 },
  { id: 'friend', label: 'Friend', minBox: 3 },
  { id: 'acquaintance', label: 'Acquaintance', minBox: 1 },
]

export function tierOf(box: number): Tier {
  return TIERS.find((tier) => box >= tier.minBox) ?? TIERS[TIERS.length - 1]
}

export function isDue(contact: Contact, today: string): boolean {
  return contact.dueDay <= today
}

export function reviewContact(contact: Contact, remembered: boolean, today: string): Contact {
  const box = remembered ? Math.min(TOP_BOX, contact.box + 1) : 1
  return {
    ...contact,
    box,
    dueDay: addDays(today, INTERVAL_DAYS[box]),
    reviews: contact.reviews + 1,
    lapses: contact.lapses + (remembered ? 0 : 1),
  }
}

/** The contacts to catch up with now, the most overdue first. */
export function dueContacts(contacts: Contact[], today: string): Contact[] {
  return contacts
    .filter((contact) => isDue(contact, today))
    .sort((a, b) => a.dueDay.localeCompare(b.dueDay) || a.box - b.box)
    .slice(0, REUNION_SIZE)
}

export function summarize(contacts: Contact[]): ContactsSummary {
  const days = contacts.map((contact) => contact.dueDay).sort()
  return { total: contacts.length, nextDue: days[0] ?? null }
}

const DB_NAME = 'name-mnemonics'
const STORE = 'contacts'
let database: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    // Let a later call try again, e.g. after private browsing blocked the first attempt.
    database.catch(() => {
      database = null
    })
  }
  return database
}

async function transaction(mode: IDBTransactionMode, run: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORE, mode)
  run(tx.objectStore(STORE))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function listContacts(): Promise<Contact[]> {
  let result: Contact[] = []
  await transaction('readonly', (store) => {
    const request = store.getAll()
    request.onsuccess = () => {
      result = request.result
    }
  })
  return result
}

export function putContacts(contacts: Contact[]): Promise<void> {
  return transaction('readwrite', (store) => contacts.forEach((contact) => store.put(contact)))
}

export function clearContacts(): Promise<void> {
  return transaction('readwrite', (store) => store.clear())
}

/** Portraits are stored smaller than they are shown in events, to keep the database light. */
async function shrink(image: string, size = 256): Promise<string> {
  const element = new Image()
  element.src = image
  await element.decode()
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d')?.drawImage(element, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** Stores newly met people and returns the updated summary. */
export async function addContacts(
  people: { person: Person; anchor?: Anchor }[],
  today: string,
): Promise<ContactsSummary> {
  const contacts = await Promise.all(
    people.map(
      async ({ person, anchor }): Promise<Contact> => ({
        id: person.id,
        name: person.name,
        gender: person.gender,
        image: await shrink(person.image),
        anchor,
        metDay: today,
        box: 1,
        dueDay: addDays(today, INTERVAL_DAYS[1]),
        reviews: 0,
        lapses: 0,
      }),
    ),
  )
  await putContacts(contacts)
  return summarize(await listContacts())
}
