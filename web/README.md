# Name Mnemonics

Train your memory for names: study AI-generated faces paired with names against the clock, then type each name when the faces come back in a random order.

It is a full game: a campaign of venues with stars, XP and levels, achievements, daily events and quests, spaced-repetition reunions with the people you remembered, an endless party mode and a picture drill. The design and its rationale are in [../GAME_DESIGN.md](../GAME_DESIGN.md).

- `../backend/` – FastAPI face service. It fetches a face from thispersondoesnotexist.com and predicts its gender with `rizvandwiki/gender-classification-2`, like `poc.ipynb`.
- `web/` – React + TypeScript app (Vite). Names come from `../nombres.json`.

## Run

Backend, from the project root (the first start downloads the ~340 MB model):

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn main:app --app-dir backend --port 8000
```

Frontend, in another terminal:

```sh
cd web
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the backend on port 8000.
