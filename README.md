# Saudi National Day 96 — COW Control Room

Standalone frontend starter for monitoring 24 COW sites during Saudi National Day operations.

## Included

- Control-room dashboard layout adapted from the visual language of `fault-managment`
- STC/ACES header, live clock, availability ticker, site monitoring canvas
- Filters for site ID, city, and operational status
- 24 placeholder COW records, KPI cards, alert panel, site detail popup, and incident queue
- Responsive full-screen Vite + React + TypeScript structure

Backend APIs, credentials, authentication logic, Hajj data, and fault-management business logic are intentionally excluded.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The Vite base path is configured for GitHub Pages at `/national_day_96th/`.
