# Sermon Illustration Finder

Find high-impact sermon object illustrations from real YouTube clips, analyzed by Claude AI.

## What it does

- Searches YouTube for real sermon illustration clips based on passage, theme, or keyword
- Fetches video transcripts automatically
- Uses Claude AI to analyze each clip and extract: illustration type, theme, scripture passage, summary, key point, reusability + impact scores
- Save favorites to a persistent library organized by theme

---

## Setup (10 minutes)

### 1. Get your API keys

**YouTube Data API key (free):**
1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one)
3. Go to APIs & Services → Enable APIs → search "YouTube Data API v3" → Enable
4. Go to APIs & Services → Credentials → Create Credentials → API Key
5. Copy the key

**Anthropic API key:**
1. Go to https://console.anthropic.com
2. API Keys → Create Key
3. Copy the key

### 2. Add your keys

Open `.env.local` and replace the placeholder values:

```
YOUTUBE_API_KEY=your_actual_youtube_key
ANTHROPIC_API_KEY=your_actual_anthropic_key
```

### 3. Install and run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel (free)

1. Push this folder to a GitHub repo
2. Go to https://vercel.com → New Project → Import your repo
3. In the Vercel dashboard, go to Settings → Environment Variables
4. Add both keys:
   - `YOUTUBE_API_KEY`
   - `ANTHROPIC_API_KEY`
5. Deploy

Your app will be live at `your-project.vercel.app`

---

## Notes

- Search takes 15-30 seconds — it's fetching real transcripts and running Claude analysis on each video
- YouTube free tier allows 10,000 units/day — each search uses ~110 units, so ~90 searches/day free
- The library is saved to `library.json` locally. On Vercel, use a database like Supabase or PlanetScale for persistent storage across deploys (happy to help set this up)

---

## Upgrading the library (optional)

The current library uses a local JSON file which works perfectly for local use. For production on Vercel, add Supabase (free tier):

1. Create a free Supabase project at https://supabase.com
2. Create a table called `illustrations` with columns matching the saved data
3. Replace `lib/library.js` with Supabase client calls
4. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your environment variables
