export type TechniqueId = 'attention' | 'picture' | 'feature' | 'link' | 'review' | 'bank' | 'routine'

export interface Technique {
  id: TechniqueId
  emoji: string
  title: string
  summary: string
  text: string
  practice: string
}

/** One technique per venue of the Social Circuit, in the order they are taught. */
export const TECHNIQUES: Technique[] = [
  {
    id: 'attention',
    emoji: '👂',
    title: 'Pay attention',
    summary: 'Look, listen, repeat.',
    text: 'Most names are never forgotten, they were never learned. Look at the face, hear the name and repeat it in your head: “Nice to meet you, Carlos.”',
    practice: 'Say every name in your head the moment it appears.',
  },
  {
    id: 'picture',
    emoji: '🖼️',
    title: 'Picture the name',
    summary: 'Turn the name into a thing you can see.',
    text: 'Abstract names slip away, images stick. Find a word that sounds like the name and see it: Raquel → raqueta, Leo → león, Pilar → a stone pillar.',
    practice: 'Use the hints at first, then invent your own images. Your own ones stick even better.',
  },
  {
    id: 'feature',
    emoji: '📍',
    title: 'Pick one feature',
    summary: 'Find what a caricaturist would draw.',
    text: 'Scan the face for the one thing that stands out: bushy eyebrows, a wide smile, big ears, a pointed chin, wild hair.',
    practice: 'Tap that feature on the portrait to drop an anchor.',
  },
  {
    id: 'link',
    emoji: '🔗',
    title: 'Link it vividly',
    summary: 'Glue the image to the feature.',
    text: 'Make a crazy, moving scene: a tennis racket (raqueta) bouncing off Raquel’s big forehead. Exaggerate and add action. Split long names: Genoveva → “gen” + Eva biting an apple.',
    practice: 'When you miss a name, rebuild the link with the picture words shown.',
  },
  {
    id: 'review',
    emoji: '🔁',
    title: 'Review it',
    summary: 'Recall later, then later again.',
    text: 'Bring the names back a few minutes after meeting people, again that evening and then days later. Every successful recall makes the memory last longer.',
    practice: 'Reunions bring your contacts back right before you would forget them.',
  },
  {
    id: 'bank',
    emoji: '🏦',
    title: 'Build a name bank',
    summary: 'Same name, same image, every time.',
    text: 'Memory athletes reuse one image per name. Once “Raquel = racket” is automatic, all that is left is linking it to the face, and that is fast.',
    practice: 'Picture Sprint trains your name bank.',
  },
  {
    id: 'routine',
    emoji: '🏆',
    title: 'The full routine',
    summary: 'Look, anchor, picture, link, review.',
    text: 'In one breath: notice the face, anchor a feature, picture the name, link them in a crazy scene, and review everyone before you leave.',
    practice: 'Under pressure, trust the routine.',
  },
]

export const MEMORY_TIPS = TECHNIQUES.map(({ title, text }) => ({ title, text }))
