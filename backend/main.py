"""Face service for the Name Mnemonics trainer.

Serves AI-generated faces together with the gender predicted by the POC classifier,
so the web app can give each face a fitting name.
"""

import base64
import hashlib
import io
import threading
import time
from collections import deque
from contextlib import asynccontextmanager
from typing import Literal

import httpx
import torch
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel
from transformers import AutoImageProcessor, AutoModelForImageClassification

# The site root now serves an HTML page; the raw image lives at this path.
FACE_SOURCE_URL = "https://thispersondoesnotexist.com/random-person.jpeg"
MODEL_ID = "rizvandwiki/gender-classification-2"
OUTPUT_SIZE = 512
MIN_CONFIDENCE = 0.8
MAX_ATTEMPTS = 3
POLL_INTERVAL = 0.1
MAX_POLLS = 40

resources = {}
served_ids: deque[str] = deque(maxlen=1000)
download_lock = threading.Lock()
inference_lock = threading.Lock()


class Face(BaseModel):
    id: str
    gender: Literal["female", "male"]
    confidence: float
    image: str


@asynccontextmanager
async def lifespan(_app: FastAPI):
    resources["processor"] = AutoImageProcessor.from_pretrained(MODEL_ID)
    resources["model"] = AutoModelForImageClassification.from_pretrained(MODEL_ID).eval()
    resources["http"] = httpx.Client(timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    yield
    resources["http"].close()
    resources.clear()


app = FastAPI(title="Name Mnemonics face service", lifespan=lifespan)


def fetch_unseen_image() -> tuple[str, bytes]:
    # The source swaps its image a few times per second and serves the same one to every
    # request in between, so poll one request at a time until a new face shows up.
    with download_lock:
        for _ in range(MAX_POLLS):
            response = resources["http"].get(FACE_SOURCE_URL)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                raise ValueError(f"Unexpected content type: {content_type}")
            face_id = hashlib.sha256(response.content).hexdigest()[:16]
            if face_id not in served_ids:
                served_ids.append(face_id)
                return face_id, response.content
            time.sleep(POLL_INTERVAL)
    raise ValueError("The face source keeps returning the same image")


def predict_gender(image: Image.Image) -> tuple[Literal["female", "male"], float]:
    inputs = resources["processor"](images=image, return_tensors="pt")
    with inference_lock, torch.inference_mode():
        probabilities = resources["model"](**inputs).logits.softmax(-1)[0]
    index = int(probabilities.argmax())
    label = resources["model"].config.id2label[index].lower()
    return ("male" if label == "male" else "female"), float(probabilities[index])


def to_data_url(image: Image.Image) -> str:
    image.thumbnail((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def generate_face() -> Face:
    try:
        face_id, raw = fetch_unseen_image()
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except (httpx.HTTPError, OSError, ValueError) as error:
        raise HTTPException(status_code=502, detail="The face generator is not available right now.") from error
    gender, confidence = predict_gender(image)
    return Face(id=face_id, gender=gender, confidence=round(confidence, 3), image=to_data_url(image))


@app.get("/api/face")
def get_face() -> Face:
    """Return one generated face with its predicted gender."""
    # Ambiguous faces make it hard to pick a believable name, so try a few times.
    for _ in range(MAX_ATTEMPTS - 1):
        face = generate_face()
        if face.confidence >= MIN_CONFIDENCE:
            return face
    return generate_face()
