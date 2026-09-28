let context: AudioContext | null = null
let enabled = true

export function setSoundEnabled(value: boolean) {
  enabled = value
}

function audio(): AudioContext | null {
  if (!enabled || typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  // Browsers start the context suspended until the first user gesture.
  if (context.state === 'suspended') void context.resume()
  return context
}

interface NoteOptions {
  type?: OscillatorType
  volume?: number
}

function note(frequency: number, delay: number, duration: number, { type = 'sine', volume = 0.12 }: NoteOptions = {}) {
  const ctx = audio()
  if (!ctx) return
  const start = ctx.currentTime + delay
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

const C5 = 523.25
const semitones = (base: number, steps: number) => base * 2 ** (steps / 12)

/** Synthesized sound effects, so the game needs no audio files. */
export const sfx = {
  tap: () => note(660, 0, 0.07, { type: 'triangle', volume: 0.05 }),
  pin: () => {
    note(988, 0, 0.08, { type: 'triangle', volume: 0.08 })
    note(1319, 0.06, 0.12, { type: 'triangle', volume: 0.07 })
  },
  /** Climbs a semitone with every name in the combo. */
  correct: (combo = 1) => {
    const base = semitones(C5, Math.min(Math.max(combo - 1, 0), 12))
    note(base, 0, 0.12, { type: 'triangle' })
    note(base * 1.5, 0.08, 0.2, { type: 'triangle' })
  },
  close: () => {
    note(466, 0, 0.12, { type: 'triangle', volume: 0.1 })
    note(523, 0.1, 0.18, { type: 'triangle', volume: 0.1 })
  },
  wrong: () => {
    note(220, 0, 0.16, { type: 'sawtooth', volume: 0.045 })
    note(165, 0.12, 0.26, { type: 'sawtooth', volume: 0.045 })
  },
  star: (index: number) => note(semitones(880, index * 4), 0, 0.35, { type: 'triangle', volume: 0.1 }),
  levelUp: () =>
    [0, 4, 7, 12, 16].forEach((step, i) => note(semitones(C5, step), i * 0.09, 0.35, { type: 'triangle', volume: 0.1 })),
  achievement: () => {
    note(1047, 0, 0.4, { volume: 0.08 })
    note(1568, 0.1, 0.55, { volume: 0.06 })
  },
  tick: () => note(1400, 0, 0.03, { type: 'square', volume: 0.015 }),
  start: () => [0, 7, 12].forEach((step, i) => note(semitones(392, step), i * 0.07, 0.18, { type: 'triangle', volume: 0.07 })),
  gameOver: () =>
    [7, 4, 0, -5].forEach((step, i) => note(semitones(392, step), i * 0.15, 0.32, { type: 'triangle', volume: 0.08 })),
}
