import { seededRandom } from '../game/rng'
import type { Gender } from '../types'

export interface Face {
  id: string
  gender: Gender
  image: string
}

/** Built by scripts/build_face_pool.py. */
const FACES_URL = `${import.meta.env.BASE_URL}faces/`
const MISSING_POOL = 'The face pool is missing. Run scripts/build_face_pool.py to build it.'
const DECK_KEY = 'name-mnemonics:face-deck'
/** Faces preloaded while the player browses menus, so short events start instantly. */
const MAX_BUFFER = 16

let pool: Promise<Face[]> | null = null
const buffer: Face[] = []
let prefetching: AbortController | null = null

function loadPool(): Promise<Face[]> {
  if (!pool) {
    pool = fetch(`${FACES_URL}manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error(MISSING_POOL)
        // The dev server answers missing files with index.html.
        return response.json().catch(() => {
          throw new Error(MISSING_POOL)
        }) as Promise<Record<Gender, string[]>>
      })
      .then((manifest) =>
        (Object.keys(manifest) as Gender[]).flatMap((gender) =>
          manifest[gender].map((id) => ({ id, gender, image: `${FACES_URL}${id}.webp` })),
        ),
      )
    pool.catch(() => {
      pool = null
    })
  }
  return pool
}

/**
 * Each player walks the pool in their own random order and never meets a face twice until it runs out.
 * Ranking by a hash of seed + id keeps that order stable when the pool grows.
 */
interface Deck {
  seed: string
  last: number
}

const newDeck = (): Deck => ({ seed: Math.random().toString(36).slice(2), last: -1 })

function readDeck(): Deck {
  try {
    const deck: Partial<Deck> | null = JSON.parse(localStorage.getItem(DECK_KEY) ?? 'null')
    if (typeof deck?.seed === 'string' && typeof deck.last === 'number') return { seed: deck.seed, last: deck.last }
  } catch {
    // Start a fresh deck.
  }
  return newDeck()
}

function draw(faces: Face[], count: number): Face[] {
  if (faces.length < count) throw new Error(`The face pool only has ${faces.length} faces.`)
  let deck = readDeck()
  const taken: Face[] = []
  while (taken.length < count) {
    const { seed, last } = deck
    const next = faces
      .map((face) => ({ face, rank: seededRandom(seed + face.id)() }))
      .filter(({ face, rank }) => rank > last && !taken.includes(face))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, count - taken.length)
    taken.push(...next.map(({ face }) => face))
    deck = next.length > 0 ? { seed, last: next[next.length - 1].rank } : newDeck()
  }
  try {
    localStorage.setItem(DECK_KEY, JSON.stringify(deck))
  } catch {
    // Without storage faces may repeat across visits, which is fine.
  }
  return taken
}

async function preload(face: Face): Promise<void> {
  const image = new Image()
  image.src = face.image
  try {
    await image.decode()
  } catch {
    throw new Error('Could not load the faces. Check your connection and try again.')
  }
}

export function prefetchFaces(count: number) {
  const target = Math.min(count, MAX_BUFFER)
  if (prefetching || buffer.length >= target) return
  const controller = new AbortController()
  prefetching = controller
  void (async () => {
    try {
      const faces = draw(await loadPool(), target - buffer.length)
      await Promise.all(faces.map(preload))
      if (!controller.signal.aborted) buffer.push(...faces)
    } catch {
      // The event itself will report the problem.
    } finally {
      if (prefetching === controller) prefetching = null
    }
  })()
}

export async function takeFaces(
  count: number,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
): Promise<Face[]> {
  // Yield first, so a caller that is cancelled straight away (React StrictMode) leaves the buffer alone.
  await Promise.resolve()
  signal.throwIfAborted()
  prefetching?.abort()
  prefetching = null
  const ready = buffer.splice(0, count)
  onProgress(ready.length)
  if (ready.length === count) return ready
  try {
    const rest = draw(await loadPool(), count - ready.length)
    let loaded = ready.length
    await Promise.all(rest.map((face) => preload(face).then(() => onProgress(++loaded))))
    signal.throwIfAborted()
    return [...ready, ...rest]
  } catch (error) {
    buffer.unshift(...ready)
    throw error
  }
}
