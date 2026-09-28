import type { TechniqueId } from '../tips'
import type { EventConfig, EventRules } from '../types'

export interface Stage {
  id: string
  title: string
  flavor: string
  rules: EventRules
  boss: boolean
}

export interface Chapter {
  id: string
  title: string
  emoji: string
  color: string
  tagline: string
  technique: TechniqueId
  twist: string
  /** Total stars needed before the venue opens. */
  starsNeeded: number
  stages: Stage[]
}

export interface StageRecord {
  stars: number
  best: number
  plays: number
  /** Finished at least once without earning a star. */
  failed: boolean
}

export type StageProgress = Record<string, StageRecord>

const DEFAULT_RULES: EventRules = {
  faceCount: 5,
  secondsPerFace: 6,
  namePool: 'common',
  recall: 'typed',
  hints: 'optional',
  faceFirst: false,
  vips: 0,
  smallTalk: 0,
  lifelines: 1,
}

function stage(id: string, title: string, flavor: string, rules: Partial<EventRules>, boss = false): Stage {
  return { id, title, flavor, rules: { ...DEFAULT_RULES, ...rules }, boss }
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'cafe',
    title: 'Coffee Shop',
    emoji: '☕',
    color: '#c2410c',
    tagline: 'The regulars say hi while you wait for your latte.',
    technique: 'attention',
    twist: 'Pick each name from four options.',
    starsNeeded: 0,
    stages: [
      stage('1-1', 'First Sip', 'Three regulars say hi while the milk steams.', {
        faceCount: 3,
        secondsPerFace: 8,
        recall: 'choice',
        hints: 'on',
      }),
      stage('1-2', 'Morning Regulars', 'The usual crowd drops by before work.', {
        faceCount: 4,
        secondsPerFace: 7,
        recall: 'choice',
        hints: 'on',
      }),
      stage('1-3', 'Barista Banter', 'The baristas introduce themselves between orders.', {
        faceCount: 5,
        secondsPerFace: 6,
        recall: 'choice',
      }),
      stage(
        '1-4',
        'Rush Hour',
        'Everyone wants coffee at once. Keep up!',
        { faceCount: 6, secondsPerFace: 5, recall: 'choice' },
        true,
      ),
    ],
  },
  {
    id: 'office',
    title: 'First Day at Work',
    emoji: '💼',
    color: '#2563eb',
    tagline: 'A new job means a whole floor of new names.',
    technique: 'picture',
    twist: 'Now you type the names yourself.',
    starsNeeded: 6,
    stages: [
      stage('2-1', 'Welcome Desk', 'HR walks you around the office.', {
        faceCount: 4,
        secondsPerFace: 8,
        hints: 'on',
        lifelines: 2,
      }),
      stage('2-2', 'Team Stand-up', 'Your new team, one quick intro each.', {
        faceCount: 5,
        secondsPerFace: 7,
        hints: 'on',
        lifelines: 2,
      }),
      stage('2-3', 'Coffee Machine Chat', 'People from other teams stop by for a refill.', {
        faceCount: 6,
        secondsPerFace: 6,
      }),
      stage(
        '2-4',
        'The Big Meeting',
        'Department heads around one long table.',
        { faceCount: 7, secondsPerFace: 6 },
        true,
      ),
    ],
  },
  {
    id: 'party',
    title: 'Birthday Party',
    emoji: '🎂',
    color: '#db2777',
    tagline: 'Friends of friends, all at once.',
    technique: 'feature',
    twist: 'Face first: tap a feature to hear the name. VIP guests score double.',
    starsNeeded: 13,
    stages: [
      stage('3-1', 'At the Door', 'Guests arrive with presents. Look first, then listen.', {
        faceCount: 5,
        secondsPerFace: 7,
        faceFirst: true,
        hints: 'on',
      }),
      stage('3-2', 'Cake Time', 'Everyone gathers around the candles.', {
        faceCount: 6,
        secondsPerFace: 6,
        faceFirst: true,
      }),
      stage('3-3', 'Party Games', 'Teams are picked, and the birthday star is playing too.', {
        faceCount: 7,
        secondsPerFace: 6,
        faceFirst: true,
        vips: 1,
      }),
      stage(
        '3-4',
        'Surprise!',
        'The lights come on and the room is full.',
        { faceCount: 8, secondsPerFace: 5, faceFirst: true, vips: 1, hints: 'off' },
        true,
      ),
    ],
  },
  {
    id: 'wedding',
    title: 'The Wedding',
    emoji: '💍',
    color: '#7c3aed',
    tagline: 'Two families, a hundred relatives, some very old-fashioned names.',
    technique: 'link',
    twist: 'Rare names, and finding faces from a name card.',
    starsNeeded: 20,
    stages: [
      stage('4-1', 'The Ceremony', 'Relatives from both sides, some with grand old names.', {
        faceCount: 6,
        secondsPerFace: 7,
        namePool: 'extended',
        hints: 'on',
      }),
      stage('4-2', 'Seating Chart', 'Find each guest from the name on their place card.', {
        faceCount: 8,
        secondsPerFace: 6,
        namePool: 'extended',
        recall: 'faces',
      }),
      stage('4-3', 'First Dance', 'Partners swap on the dance floor.', {
        faceCount: 8,
        secondsPerFace: 6,
        namePool: 'extended',
        vips: 1,
      }),
      stage(
        '4-4',
        'The Toast',
        'Raise your glass to everyone, by name.',
        { faceCount: 10, secondsPerFace: 5, namePool: 'extended', hints: 'off' },
        true,
      ),
    ],
  },
  {
    id: 'conference',
    title: 'Tech Conference',
    emoji: '🎤',
    color: '#0891b2',
    tagline: 'Badges, lanyards and endless small talk.',
    technique: 'review',
    twist: 'Small talk: a round of Picture Sprint before you greet anyone.',
    starsNeeded: 27,
    stages: [
      stage('5-1', 'Registration', 'A queue of new faces at the badge desk.', {
        faceCount: 8,
        secondsPerFace: 5,
        smallTalk: 20,
      }),
      stage('5-2', 'Networking Lunch', 'Chat, eat, then remember who was who.', {
        faceCount: 10,
        secondsPerFace: 5,
        smallTalk: 25,
      }),
      stage('5-3', 'Panel Q&A', 'Match each speaker to the name on the program.', {
        faceCount: 10,
        secondsPerFace: 5,
        namePool: 'extended',
        recall: 'faces',
        smallTalk: 25,
      }),
      stage(
        '5-4',
        'After-party',
        'Loud music, long conversations, lots of names.',
        { faceCount: 12, secondsPerFace: 4, namePool: 'extended', smallTalk: 30, hints: 'off' },
        true,
      ),
    ],
  },
  {
    id: 'gala',
    title: 'Charity Gala',
    emoji: '🥂',
    color: '#ca8a04',
    tagline: 'Black tie, flashing cameras, quick introductions.',
    technique: 'bank',
    twist: 'Fast introductions and hardly any help.',
    starsNeeded: 34,
    stages: [
      stage('6-1', 'Red Carpet', 'Cameras flash and VIPs are everywhere.', {
        faceCount: 12,
        secondsPerFace: 4,
        namePool: 'extended',
        vips: 2,
        faceFirst: true,
      }),
      stage('6-2', 'Silent Auction', 'Bidders introduce themselves between lots.', {
        faceCount: 14,
        secondsPerFace: 4,
        namePool: 'extended',
        hints: 'off',
      }),
      stage('6-3', 'Ballroom', 'Spot each dancer from their name.', {
        faceCount: 15,
        secondsPerFace: 3,
        namePool: 'extended',
        recall: 'faces',
        smallTalk: 20,
        hints: 'off',
      }),
      stage(
        '6-4',
        'Guest of Honor',
        'Introduce everyone to the guest of honor. No lifelines tonight.',
        { faceCount: 16, secondsPerFace: 3, namePool: 'extended', vips: 2, smallTalk: 20, hints: 'off', lifelines: 0 },
        true,
      ),
    ],
  },
  {
    id: 'championship',
    title: 'Memory Championship',
    emoji: '🏆',
    color: '#dc2626',
    tagline: 'The best memories in the world, and you.',
    technique: 'routine',
    twist: 'Long lists at championship pace.',
    starsNeeded: 42,
    stages: [
      stage('7-1', 'Qualifier', 'Eighteen faces to make the cut.', {
        faceCount: 18,
        secondsPerFace: 3,
        namePool: 'extended',
        hints: 'off',
      }),
      stage('7-2', 'Semi-final', 'A longer list, then an interview before recall.', {
        faceCount: 20,
        secondsPerFace: 3,
        namePool: 'extended',
        smallTalk: 30,
        hints: 'off',
      }),
      stage(
        '7-3',
        'Grand Final',
        'Twenty-five faces, face first, no lifelines. Make history.',
        {
          faceCount: 25,
          secondsPerFace: 3,
          namePool: 'extended',
          faceFirst: true,
          smallTalk: 30,
          hints: 'off',
          lifelines: 0,
        },
        true,
      ),
    ],
  },
]

const ORDER = CHAPTERS.flatMap((chapter) => chapter.stages.map((item) => ({ chapter, stage: item })))

export const MAX_STARS = ORDER.length * 3

export function findStage(id: string): { chapter: Chapter; stage: Stage } | undefined {
  return ORDER.find((entry) => entry.stage.id === id)
}

/** Bigger events get a little slack for the top star. */
export function starThresholds(faceCount: number): [number, number, number] {
  if (faceCount <= 6) return [0.5, 0.8, 1]
  if (faceCount <= 12) return [0.5, 0.75, 0.9]
  return [0.4, 0.7, 0.9]
}

export function stageEvent(chapter: Chapter, item: Stage): EventConfig {
  return {
    kind: 'campaign',
    id: item.id,
    title: item.title,
    emoji: chapter.emoji,
    flavor: item.flavor,
    rules: item.rules,
    stars: starThresholds(item.rules.faceCount),
  }
}

export function totalStars(progress: StageProgress): number {
  return Object.values(progress).reduce((sum, record) => sum + record.stars, 0)
}

export function chapterStars(chapter: Chapter, progress: StageProgress): number {
  return chapter.stages.reduce((sum, item) => sum + (progress[item.id]?.stars ?? 0), 0)
}

export function chapterUnlocked(chapter: Chapter, progress: StageProgress): boolean {
  return stageUnlocked(chapter.stages[0].id, progress)
}

/** A stage opens once the one before it has a star, and venues also need enough stars in total. */
export function stageUnlocked(id: string, progress: StageProgress): boolean {
  const index = ORDER.findIndex((entry) => entry.stage.id === id)
  if (index <= 0) return index === 0
  const { chapter } = ORDER[index]
  const previous = ORDER[index - 1].stage
  return (progress[previous.id]?.stars ?? 0) > 0 && totalStars(progress) >= chapter.starsNeeded
}

export function venuesCleared(progress: StageProgress): number {
  return CHAPTERS.filter((chapter) => (progress[chapter.stages[chapter.stages.length - 1].id]?.stars ?? 0) > 0).length
}

/** The stage the player should play next: the first one without stars, else the first one without all stars. */
export function nextStage(progress: StageProgress): { chapter: Chapter; stage: Stage } {
  const open = ORDER.filter((entry) => stageUnlocked(entry.stage.id, progress))
  return (
    open.find((entry) => !progress[entry.stage.id]?.stars) ??
    open.find((entry) => (progress[entry.stage.id]?.stars ?? 0) < 3) ??
    ORDER[ORDER.length - 1]
  )
}

/** The stage after this one in the circuit, if any. */
export function stageAfter(id: string): { chapter: Chapter; stage: Stage } | undefined {
  const index = ORDER.findIndex((entry) => entry.stage.id === id)
  return index >= 0 ? ORDER[index + 1] : undefined
}
