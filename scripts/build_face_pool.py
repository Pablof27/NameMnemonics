"""Build the static face pool the web app plays with.

Downloads AI-generated faces, predicts their gender and keeps only the confident ones as WebP
files in web/public/faces, listed by gender in web/public/faces/manifest.json.
Stopping (Ctrl+C) and running it again resumes where it left off.

    .venv/bin/pip install -r backend/requirements.txt
    .venv/bin/python scripts/build_face_pool.py --count 10000
"""

import argparse
import hashlib
import io
import json
import time
from pathlib import Path

import httpx
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

ROOT = Path(__file__).resolve().parent.parent
FACE_SOURCE_URL = "https://thispersondoesnotexist.com/random-person.jpeg"
MODEL_ID = "rizvandwiki/gender-classification-2"
ID_LENGTH = 12
POLL_INTERVAL = 0.1
SAVE_EVERY = 25
MAX_FAILURES = 10


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--count", type=int, default=10_000, help="faces to keep in total")
    parser.add_argument("--min-confidence", type=float, default=0.9, help="discard faces below this gender confidence")
    parser.add_argument("--size", type=int, default=384, help="longest side of the saved images, in pixels")
    parser.add_argument("--quality", type=int, default=80, help="WebP quality")
    parser.add_argument("--out", type=Path, default=ROOT / "web" / "public" / "faces")
    return parser.parse_args()


def load_manifest(path: Path) -> dict[str, list[str]]:
    if path.exists():
        return json.loads(path.read_text())
    return {"female": [], "male": []}


def save_manifest(path: Path, manifest: dict[str, list[str]]) -> None:
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(manifest, separators=(",", ":")))
    temporary.replace(path)


def download(http: httpx.Client) -> bytes:
    response = http.get(FACE_SOURCE_URL)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        raise ValueError(f"Unexpected content type: {content_type}")
    return response.content


class GenderClassifier:
    def __init__(self) -> None:
        if torch.backends.mps.is_available():
            self.device = "mps"
        elif torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"
        self.processor = AutoImageProcessor.from_pretrained(MODEL_ID)
        self.model = AutoModelForImageClassification.from_pretrained(MODEL_ID).eval().to(self.device)

    def __call__(self, image: Image.Image) -> tuple[str, float]:
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.inference_mode():
            probabilities = self.model(**inputs).logits.softmax(-1)[0]
        index = int(probabilities.argmax())
        label = self.model.config.id2label[index].lower()
        return ("male" if label == "male" else "female"), float(probabilities[index])


def main() -> None:
    args = parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    manifest_path = args.out / "manifest.json"
    manifest = load_manifest(manifest_path)
    seen = {face_id for ids in manifest.values() for face_id in ids}
    kept = len(seen)
    if kept >= args.count:
        print(f"The pool already has {kept} faces.")
        return

    classify = GenderClassifier()
    print(f"Resuming at {kept}/{args.count} faces, classifying on {classify.device}.")
    discarded = failures = 0
    started, start_count = time.monotonic(), kept

    # The source swaps its image a few times per second and serves the same one in between,
    # so a single sequential client deduplicating by hash is as fast as it gets.
    with httpx.Client(timeout=10, headers={"User-Agent": "Mozilla/5.0"}) as http:
        try:
            while kept < args.count:
                try:
                    raw = download(http)
                except (httpx.HTTPError, ValueError) as error:
                    failures += 1
                    if failures >= MAX_FAILURES:
                        raise SystemExit(f"Giving up after {failures} failures in a row: {error}") from error
                    time.sleep(min(60, 2**failures))
                    continue
                failures = 0

                face_id = hashlib.sha256(raw).hexdigest()[:ID_LENGTH]
                if face_id in seen:
                    time.sleep(POLL_INTERVAL)
                    continue
                seen.add(face_id)

                try:
                    image = Image.open(io.BytesIO(raw)).convert("RGB")
                except OSError:
                    discarded += 1
                    continue
                gender, confidence = classify(image)
                if confidence < args.min_confidence:
                    discarded += 1
                    continue

                image.thumbnail((args.size, args.size), Image.Resampling.LANCZOS)
                image.save(args.out / f"{face_id}.webp", "WEBP", quality=args.quality, method=6)
                manifest[gender].append(face_id)
                kept += 1

                if kept % SAVE_EVERY == 0:
                    save_manifest(manifest_path, manifest)
                    rate = (kept - start_count) / (time.monotonic() - started)
                    eta = (args.count - kept) / rate / 60
                    print(
                        f"{kept}/{args.count} kept · {discarded} discarded · "
                        f"{len(manifest['female'])}F/{len(manifest['male'])}M · {rate:.2f}/s · ETA {eta:.0f} min",
                        flush=True,
                    )
        except KeyboardInterrupt:
            print(f"\nStopped at {kept}/{args.count} faces. Run again to resume.")
            return
        finally:
            save_manifest(manifest_path, manifest)

    print(f"Done: {kept} faces in {args.out} ({discarded} discarded this run).")


if __name__ == "__main__":
    main()
