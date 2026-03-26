# Frontend Setup

## Requirements

- Node.js 20 LTS
- npm 10+
- Running backend API

## 1. Install Dependencies

```bash
cd frontend
npm install
```

## 2. Configure Environment

Create `.env` from the example:

```bash
cp .env.example .env
```

Set the backend API URL:

```env
VITE_API_BASE_URL="http://localhost:5051/api/v1"
```

## 3. Start Development Server

```bash
npm run dev
```

Expected local URL:

```text
http://localhost:5173
```

## 4. Production Build

```bash
npm run build
```

## 5. End-To-End Tests

```bash
npm run test:e2e
```

## Deployment Notes

Recommended deployment:

- host on Vercel
- set `VITE_API_BASE_URL` to the production backend API
- redeploy after changing environment variables

Example production value:

```env
VITE_API_BASE_URL="https://api.yourdomain.com/api/v1"
```

## Backend Dependency

This frontend depends on:

- reachable backend API
- working auth endpoints
- correct CORS on the backend
- stable API responses from the backend
