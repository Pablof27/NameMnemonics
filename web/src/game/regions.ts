/**
 * Names the facial feature at a point of a portrait, in 0–1 image coordinates.
 * The generated faces are aligned (eyes at about 47 % height, mouth at about 75 %), so fixed zones work well.
 */
export function faceRegion(x: number, y: number): string {
  const side = Math.abs(x - 0.5)
  if (y < 0.22) return 'hair'
  if (side > 0.34) return y < 0.72 ? 'hair' : 'outfit'
  if (y < 0.37) return side < 0.24 ? 'forehead' : 'hair'
  if (y < 0.44) return side < 0.22 ? 'eyebrows' : 'hair'
  if (y < 0.53) return side < 0.2 ? 'eyes' : 'ears'
  if (y < 0.67) return side < 0.07 ? 'nose' : side < 0.21 ? 'cheeks' : 'ears'
  if (y < 0.81) return side < 0.13 ? 'mouth' : side < 0.23 ? 'cheeks' : 'jaw'
  if (y < 0.93) return side < 0.2 ? 'chin' : 'neck'
  return 'outfit'
}
