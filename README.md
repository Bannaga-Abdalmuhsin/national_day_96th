# Saudi National Day 96 — COW Control Room

Standalone frontend starter for monitoring 24 COW sites during Saudi National Day operations.

## Included

- Supabase Auth login with authenticated read-only dashboard access
- Live Supabase queries for the approved 24-site registry, power alarms, outages, and sync status
- Five-minute frontend refresh, manual refresh, stale-sync warning, filters, site map, and site detail records
- Supabase migration with RLS policies and a server-side Google Sheets synchronization Edge Function
- Responsive full-screen Vite + React + TypeScript structure

Private Supabase service-role and Google service-account credentials are used only by the Edge Function. The browser uses the Supabase anonymous key for authenticated reads.

Apply the migration and deploy `supabase/functions/sync-national-day-data` through Supabase. Configure the Edge Function secrets from the existing protected environment variables and schedule it with Supabase Cron at `*/5 * * * *`.

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
