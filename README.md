# Structure Over Surface

Detecting machine-generated Python code by AST graph structure: a research showcase and interactive demo.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend dependency

The `/demo` page's classify feature calls out to a companion FastAPI backend (not included in this repo).
Set `BACKEND_API_URL` in `.env.local` to point at it (see `.env.local.example`). Without a running
backend, the classify route will return errors, but the rest of the site (results, findings, methodology)
works standalone.

Backend repo: TBD (to be linked once deployed).
