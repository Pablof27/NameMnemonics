# Name Mnemonics

A game that trains your memory for names. You study AI-generated faces paired with names against the clock, then type each name when the faces come back in random order.

It includes a campaign of venues with stars, XP and levels, plus achievements, daily events and quests, spaced-repetition reunions with the people you remembered, an endless party mode and a picture drill. Each mechanic practices a real technique for remembering names.

## Project structure

| Path | Description |
| --- | --- |
| [scripts/build_face_pool.py](scripts/build_face_pool.py) | Builds the static face pool in `web/public/faces`: downloads faces from thispersondoesnotexist.com and keeps those whose gender [`rizvandwiki/gender-classification-2`](https://huggingface.co/rizvandwiki/gender-classification-2) predicts confidently, so the app can pick a fitting name. |
| [backend/](backend/) | Legacy FastAPI face service (`GET /api/face`), no longer used by the app. |
| [web/](web/) | React 19 + TypeScript app built with Vite. Fully static. |
| [nombres.json](nombres.json) | Spanish name lists (`H` = male, `M` = female) and `pistas`, which maps each name to two visualization words. |
| [poc.ipynb](poc.ipynb) | Original proof of concept for the face and gender pipeline. |
| [GAME_DESIGN.md](GAME_DESIGN.md) | Game design document. |

## Requirements

- Python 3 (developed on 3.14)
- Node.js with npm

## Run

Build the face pool once, from the project root. The first run downloads the model, which is about 340 MB. It can be stopped and resumed.

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

## Scripts

Run these from `web/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with oxlint |

## Data and privacy

All player data stays in the browser. Your profile is stored in `localStorage` and your contacts in IndexedDB. The app makes no outside requests.

## License

[MIT](LICENSE)
