# Tarbiyyat Path — Vercel

Static page in `public/`, one serverless function in `api/progress.js` that stores each learner's progress in Redis. No accounts or sign-in: each learner gets a private personal link (with a QR code) that syncs their phone and computer.

## Deploy (about 5 minutes)
1. Push this folder to a GitHub repo, then on vercel.com: **Add New → Project →** import it. Framework preset: **Other**. Deploy.
   (Or with the CLI: `npm i -g vercel`, then `vercel` in this folder.)
2. In the project on Vercel: **Storage → Create Database → Upstash (Redis) →** free plan → **Connect** it to this project.
   This adds the `KV_REST_API_URL` / `KV_REST_API_TOKEN` environment variables automatically.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the function picks up those variables.
4. Open the site. The badge on the home screen should turn green: "Synced…".

## Giving it to her
Send her the site URL. On first open the page makes her personal link and shows it with a QR code. She scans it on her phone (and can Add to Home Screen) — both devices then share progress. If she opens the plain URL on a new device, she pastes her link under "Started on another device?".

## Seeing her progress
Vercel → Storage → your Upstash database → **Data Browser**. Each learner is a key `tp:<id>`; `done` lists finished lessons (`m2c4` = Module 2, lesson 4).

## Notes
- No build step and no npm packages; the function uses Node's built-in `fetch`.
- Her personal link is the key to her progress — she should keep it private.
- Opened as a local file, the page still works but saves on that device only.
