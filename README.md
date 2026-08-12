# Slop Radar

A Wordle-style daily game: classify each image as AI slop or a real photograph.

This is a real, verified-building Vite + React + Tailwind project (not a
Claude preview artifact), wired up to load its image deck from Supabase.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign in (create an account if you don't have
   one — that step has to happen in your own browser, not something I can
   do for you).
2. "New project" → give it a name, set a database password, pick a region.
3. Once it's ready: **SQL Editor → New query** → paste the contents of
   `supabase/schema.sql` → Run. This creates the `cards` table, enables
   row-level security with public read access, and inserts two starter rows.
4. **Storage → New bucket** → name it e.g. `card-images` → make it **public**.
   Upload your real photos and genuinely-AI-generated images here.
5. For each uploaded file: click it → copy the **public URL**.
6. **Table Editor → cards** → add a row per image: paste the public URL into
   `url`, set `is_ai` true/false, fill in `title` and `reason` (the one-line
   tell shown after guessing), optionally `verified_year`.
7. **Project Settings → API** → copy the **Project URL** and the **anon
   public key**.

## 2. Configure the app

```
cp .env.example .env
```

Paste your Project URL and anon key into `.env`.

## 3. Run it locally

```
npm install
npm run dev
```

If Supabase isn't configured yet, or the `cards` table has fewer than 4
rows, the app automatically falls back to a small built-in mock deck — it's
never broken, just not showing your real images yet.

## 4. Push to GitHub

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/slop-radar.git
git push -u origin main
```

(Create the empty repo on github.com first, or via `gh repo create`.)

## 5. Deploy

Connect the GitHub repo to Vercel (vercel.com → New Project → import repo).
Add the two `VITE_SUPABASE_*` env vars in Vercel's project settings under
the same names as `.env`. Every push to `main` auto-deploys.

## How the daily deck works

Every visitor pulls the full `cards` pool from Supabase, then shuffles it
deterministically using today's date as a seed (`seededShuffle` in
`src/App.jsx`) and takes the first 8. Same puzzle for everyone, same day —
no cron job or separate "daily assignment" table required. Add more rows to
`cards` any time via the Supabase Table Editor; no redeploy needed.
