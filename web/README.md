# Name Mnemonics

Train your memory for names: study AI-generated faces paired with names against the clock, then type each name when the faces come back in a random order.

It is a full game: a campaign of venues with stars, XP and levels, achievements, daily events and quests, spaced-repetition reunions with the people you remembered, an endless party mode and a picture drill. The design and its rationale are in [../GAME_DESIGN.md](../GAME_DESIGN.md).

- `../scripts/build_face_pool.py` – builds the static face pool in `public/faces`. It fetches faces from thispersondoesnotexist.com and keeps those whose gender `rizvandwiki/gender-classification-2` predicts confidently, like `poc.ipynb`.
- `web/` – React + TypeScript app (Vite). Names come from `../nombres.json`.

## Run

Face pool, once, from the project root (the first run downloads the ~340 MB model):

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/python scripts/build_face_pool.py --count 10000
```

Then the app:

```sh
cd web
npm install
npm run dev
```

Open http://localhost:5173.
