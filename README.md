# family-finance-frontend

Web frontend for Family Finance Tracker. Built with React and Vite, it delivers auth, expenses, loans, investments, insurance, banks, overview, analytics, and settings flows. Designed for independent deployment while consuming the shared backend API.

## What This Repo Owns

- React web UI
- Routing and page composition
- API client integration
- Zustand state
- Shared layout and modal components
- Global styling and responsive behavior
- Playwright end-to-end coverage

## Stack

- React
- Vite
- React Router
- Axios
- Zustand
- Recharts
- Playwright

## Main Folders

```text
.
|-- e2e/
|-- public/
|-- src/
|   |-- api/
|   |-- components/
|   |-- pages/
|   |-- store/
|   |-- styles/
|   `-- utils/
|-- index.html
|-- vite.config.js
`-- package.json
```

## Documentation

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Setup: [docs/SETUP.md](docs/SETUP.md)

## Local Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Required Environment

```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
```

## Deployment Role

Deploy this repo independently on Vercel or another frontend host. It should call the backend through `VITE_API_BASE_URL`, for example `https://api.yourdomain.com/api/v1`.
