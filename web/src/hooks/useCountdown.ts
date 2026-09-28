import { useEffect, useRef, useState } from 'react'

/** Counts `durationMs` down while `running` and calls `onDone` once time is up. Returns the remaining ms. */
export function useCountdown(durationMs: number, running: boolean, onDone: () => void): number {
  const [remaining, setRemaining] = useState(durationMs)
  const remainingRef = useRef(durationMs)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!running || remainingRef.current <= 0) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      // Clamp the step so a stalled frame can't swallow the whole countdown.
      const elapsed = Math.min(Math.max(now - last, 0), 100)
      last = now
      remainingRef.current = Math.max(0, remainingRef.current - elapsed)
      setRemaining(remainingRef.current)
      if (remainingRef.current > 0) frame = requestAnimationFrame(tick)
      else onDoneRef.current()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running])

  return remaining
}
