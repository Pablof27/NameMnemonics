import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadProfile,
  newProfile,
  processOutcome,
  saveProfile,
  withToday,
  type Outcome,
  type Profile,
  type Rewards,
} from '../game/profile'

export interface ProfileApi {
  profile: Profile
  /** Records a finished game and returns what it earned. Call from event handlers, not during render. */
  apply: (outcome: Outcome) => Rewards
  update: (change: (profile: Profile) => Profile) => void
  reset: () => void
}

export function useProfile(): ProfileApi {
  const [profile, setProfile] = useState(() => withToday(loadProfile(), new Date()))
  // Always the latest profile, so outcomes that arrive in quick succession build on each other.
  const latest = useRef(profile)

  const commit = useCallback((next: Profile) => {
    latest.current = next
    setProfile(next)
    saveProfile(next)
  }, [])

  const apply = useCallback(
    (outcome: Outcome) => {
      const { profile: next, rewards } = processOutcome(latest.current, outcome)
      commit(next)
      return rewards
    },
    [commit],
  )

  const update = useCallback((change: (profile: Profile) => Profile) => commit(change(latest.current)), [commit])

  const reset = useCallback(
    () => commit(withToday({ ...newProfile(), sound: latest.current.sound }, new Date())),
    [commit],
  )

  // New quests when the app is left open past midnight.
  useEffect(() => {
    const refresh = () => {
      const next = withToday(latest.current, new Date())
      if (next !== latest.current) commit(next)
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [commit])

  return { profile, apply, update, reset }
}
