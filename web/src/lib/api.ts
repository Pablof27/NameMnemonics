import type { Gender } from '../types'

export interface GeneratedFace {
  id: string
  gender: Gender
  confidence: number
  image: string
}

// The backend downloads one face at a time, so a few parallel requests are enough to keep it busy.
const PARALLEL_REQUESTS = 3

async function fetchFace(signal: AbortSignal): Promise<GeneratedFace> {
  const response = await fetch('/api/face', { signal })
  if (!response.ok) {
    const body: { detail?: string } | null = await response.json().catch(() => null)
    throw new Error(body?.detail ?? 'Could not reach the face service. Make sure the backend is running on port 8000.')
  }
  return response.json()
}

export async function loadFaces(
  count: number,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
): Promise<GeneratedFace[]> {
  const failure = new AbortController()
  const combined = AbortSignal.any([signal, failure.signal])
  const faces: GeneratedFace[] = []
  let requested = 0

  const worker = async () => {
    while (requested < count) {
      requested++
      faces.push(await fetchFace(combined))
      onProgress(faces.length)
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(PARALLEL_REQUESTS, count) }, worker))
  } catch (error) {
    failure.abort() // stop the other workers
    throw error
  }
  return faces
}
