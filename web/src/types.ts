export type Gender = 'female' | 'male'
export type NamePool = 'common' | 'extended'
export type Grade = 'correct' | 'close' | 'wrong'

export interface Settings {
  faceCount: number
  secondsPerFace: number
  namePool: NamePool
  hints: boolean
}

/** The part of the settings that the difficulty presets control. */
export type Difficulty = Omit<Settings, 'hints'>

export interface Person {
  id: string
  image: string
  gender: Gender
  name: string
}

export interface Answer {
  person: Person
  response: string
  grade: Grade
}
