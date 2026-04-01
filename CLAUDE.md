# Tripo — Project Rules

## Environment Variables

- **Frontend** (`frontend/.env`): all vars must use the `VITE_` prefix (e.g. `VITE_GEMINI_API_KEY`, `VITE_GOOGLE_CLIENT_ID`).
  Read them in code with `import.meta.env.VITE_*`. Do **not** use `process.env.*` in frontend code.
- **Backend** (`backend/.env`): standard naming, no prefix (e.g. `GEMINI_API_KEY`, `MONGODB_URI`).
  Read them in backend code with `process.env.*`.
- The `vite.config.ts` `define` block must **not** be used to bridge bare env names — use the native Vite `VITE_` mechanism instead.
