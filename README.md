# LaunchCopilot 🚀

AI co-pilot for indie devs who just launched a mobile app. Turns basic app info into a channel-aware promotion kit (ASO, X, LinkedIn, Product Hunt, Reddit) + a 7-day plan + channel tracking with a data-driven copy optimizer.

## Setup (~5 minutes)

1. **Install deps**
   ```bash
   npm install
   ```

2. **Supabase** (free tier is fine)
   - Create a project at https://supabase.com
   - Open **SQL Editor**, paste the contents of `supabase/schema.sql`, run it
   - Copy **Settings → API → Project URL** and **service_role key**

3. **Env vars**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`
   (free, no card — https://aistudio.google.com → Get API key). Gemini is the
   default provider; set `LLM_PROVIDER=anthropic` or `openai` with their keys
   to switch.

4. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, fill the intake form, hit **Generate full kit**.

## Deploy (optional, for the judges' link)

Push to GitHub → import into Vercel → paste the same env vars → deploy. No other config needed.

## Project map

```
lib/prompts.js        ← THE core IP: per-channel system prompts (5 channels + 7-day plan)
lib/llm.js            ← provider-switchable LLM client (gemini|anthropic|openai, plain fetch)
lib/supabase.js       ← server-only Supabase client (service role)
app/page.jsx          ← landing + intake form
app/app/[id]/page.jsx ← dashboard (assets, plan, tracking)
components/           ← IntakeForm, Dashboard (copy buttons, chart)
app/api/apps          ← create app + screenshot upload
app/api/generate      ← generate one channel's asset
app/api/plan          ← generate 7-day plan
app/api/track         ← self-logged installs/clicks
supabase/schema.sql   ← full DB schema + storage bucket
docs/                 ← architecture, 3-min demo script, pitch/business content
```

## Known scope cuts (deliberate, ~2.5-day window)

- No auth — single-user demo; service-role key stays server-side. v2: Supabase Auth + RLS.
- Tracking is self-reported — no store/social API integrations. v2: App Store Connect / Play Console APIs.
- No live posting — copy-paste UX by design. v2: direct publish integrations.

## 🛰 Autopilot (the execution layer)

LaunchCopilot doesn't just write your launch — it ships it:

- **One-link intake:** paste an App Store / Play Store URL on the homepage; the
  listing is read automatically (Apple lookup API / Play og-tags) and AI distills
  pitch, target user, and tone. No form.
- **Real publishing:** Reddit, Telegram, and X posts go live via their APIs —
  "Publish live" per channel, or arm autopilot to schedule everything.
- **Cron autopilot:** deployed on Vercel, `vercel.json` runs `/api/cron` daily at
  9:00 and publishes every due post with zero clicks. Set `CRON_SECRET`.

Setup: run `supabase/autopilot.sql` in the SQL Editor, then add whichever
publisher keys you want to `.env.local` (see the AUTOPILOT PUBLISHERS block in
`.env.example`) and restart. Unconfigured channels simply stay copy-paste.

Tests: `npm test` (unit) · `npm run test:e2e` (needs `npm run dev` running).
