import { fetchFace, loadFaces, type GeneratedFace } from './api'

/**
 * Faces fetched ahead of time while the player browses menus, so short events start instantly.
 * The backend serves roughly one face per second, so a small buffer goes a long way.
 */
const MAX_BUFFER = 16
const buffer: GeneratedFace[] = []
let prefetching: AbortController | null = null

export function prefetchFaces(count: number) {
  const target = Math.min(count, MAX_BUFFER)
  if (prefetching || buffer.length >= target) return
  const controller = new AbortController()
  prefetching = controller
  void (async () => {
    try {
      while (buffer.length < target && !controller.signal.aborted) buffer.push(await fetchFace(controller.signal))
    } catch {
      // The event itself will report problems with the backend.
    } finally {
      if (prefetching === controller) prefetching = null
    }
  })()
}

export async function takeFaces(
  count: number,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
): Promise<GeneratedFace[]> {
  // Yield first, so a caller that is cancelled straight away (React StrictMode) leaves the buffer alone.
  await Promise.resolve()
  signal.throwIfAborted()
  prefetching?.abort()
  prefetching = null
  const ready = buffer.splice(0, count)
  onProgress(ready.length)
  if (ready.length === count) return ready
  try {
    const rest = await loadFaces(count - ready.length, signal, (loaded) => onProgress(ready.length + loaded))
    return [...ready, ...rest]
  } catch (error) {
    buffer.unshift(...ready)
    throw error
  }
}
