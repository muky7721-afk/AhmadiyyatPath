# Tarbiyyat Path — Vercel

Static page in `public/` plus three small functions in `api/`:
- `auth.js` — create account / sign in / sign out (name + password, passwords stored hashed with scrypt)
- `progress.js` — saves and loads the signed-in learner's progress
- `mentor.js` — mentor dashboard data and password resets (protected by `MENTOR_KEY`)
Data lives in Upstash Redis (Vercel → Storage). No npm packages, no build step.

## Setup
1. Vercel project → Settings → Root Directory = `tarbiyyat-path-vercel`, Framework = Other.
2. Storage → Create Database → Upstash (Redis) → free → Connect to the project.
3. Settings → Environment Variables → add `MENTOR_KEY` = a long secret only you know (8+ characters).
4. Redeploy.

## Using it
- Learner: opens the site → **Create account** (name + password) → learns. On another device: **Sign in** with the same name and password.
- You: open `/#mentor` on the site and enter your MENTOR_KEY to see everyone's progress and reset passwords.
