export type Gender = 'female' | 'male'
export type NamePool = 'common' | 'extended'
export type Grade = 'correct' | 'close' | 'wrong'
/** typed: type the name · choice: pick the name · faces: pick the face that belongs to a name. */
export type RecallMode = 'typed' | 'choice' | 'faces'
export type HintRule = 'on' | 'off' | 'optional'

export interface Settings {
  faceCount: number
  secondsPerFace: number
  namePool: NamePool
  hints: boolean
  recall: RecallMode
}

/** The part of the settings that the difficulty presets control. */
export type Difficulty = Pick<Settings, 'faceCount' | 'secondsPerFace' | 'namePool'>

export interface Person {
  id: string
  image: string
  gender: Gender
  name: string
  vip?: boolean
}

/** The feature the player pinned on a portrait, in 0–1 coordinates of the image. */
export interface Anchor {
  x: number
  y: number
  region: string
}

export interface StudyRecord {
  anchor?: Anchor
  /** Share of the face's study time used before moving on, from 0 to 1. */
  used: number
}

export interface Answer {
  person: Person
  response: string
  grade: Grade
  /** Time from the question appearing to the answer. */
  ms: number
  /** A lifeline helped with this answer. */
  assisted: boolean
}

export interface EventRules {
  faceCount: number
  secondsPerFace: number
  namePool: NamePool
  recall: RecallMode
  hints: HintRule
  /** The name stays hidden until the player anchors a feature (or a moment passes). */
  faceFirst: boolean
  vips: number
  /** Seconds of Picture Sprint between studying and recalling. */
  smallTalk: number
  lifelines: number
}

export type EventKind = 'campaign' | 'daily' | 'free'

/** A study-and-recall event: a campaign stage, the daily event or a free practice round. */
export interface EventConfig {
  kind: EventKind
  id: string
  title: string
  emoji: string
  flavor: string
  rules: EventRules
  /** Accuracy needed for one, two and three stars. Free practice has no stars. */
  stars?: [number, number, number]
  smart?: boolean
}
