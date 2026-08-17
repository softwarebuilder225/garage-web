# John's Garage (front-end)

Angular app for John's car catalogue — FireHawk technical task.

## Prerequisites

- Node.js 20+
- Backend API running at `http://localhost:3000`

## Setup

```bash
npm install
npm start
```

Open http://localhost:4200

The dev server proxies `/api` requests to the backend (`proxy.conf.json`).

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Dev server on port 4200 |
| `npm run build` | Production build |

## API URL

Default: `/api` (proxied in development).

Edit `src/environments/environment.ts` if your deployed API uses a different base URL.
