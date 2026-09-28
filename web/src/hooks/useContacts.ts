import { useCallback, useEffect, useState } from 'react'
import { listContacts, type Contact } from '../game/contacts'

/** All contacts from IndexedDB. `contacts` is null while loading and when storage is unavailable. */
export function useContacts(): { contacts: Contact[] | null; failed: boolean; reload: () => void } {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    listContacts()
      .then((list) => {
        if (active) setContacts(list)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { contacts, failed, reload }
}
