# Family Finance Tracker Frontend

Web frontend for Family Finance Tracker. This app provides the full user interface for authentication, expenses, loans, investments, insurance, overview, banks, analytics, and settings. It is designed to be deployed independently and consume the shared backend API.

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
frontend/
├── e2e/
├── public/
├── src/
│   ├── api/
│   ├── components/
│   ├── pages/
│   ├── store/
│   ├── styles/
│   └── utils/
├── index.html
├── vite.config.js
└── package.json
```

## Documentation

- Architecture: [docs/ARCHITECTURE.md](/Users/hari.akurathi/experiment/family-finance-v3/frontend/docs/ARCHITECTURE.md)
- Setup: [docs/SETUP.md](/Users/hari.akurathi/experiment/family-finance-v3/frontend/docs/SETUP.md)

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
