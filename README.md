# Overhis

Overhis is a public Overwatch stats analysis website. Users enter a BattleTag, the app fetches public OverFast stats, and DeepSeek generates a Chinese analysis with practical advice and a sharp roast.

## Features

- BattleTag lookup in `Name#1234` format.
- PC and console platform selector.
- Competitive and quickplay mode selector.
- Public profile stats from OverFast.
- DeepSeek AI analysis.
- Same-IP daily limit of 5 successful AI analyses.

## Local Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Fill `.env.local` with:

```text
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_MODEL=deepseek-v4-flash
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
```

Open `http://localhost:3000`.

## Tests

```powershell
npm test
npm run build
```

## Deployment

Deploy to Vercel and add these environment variables in the Vercel project settings:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The app can use the default Vercel domain for the first public release.

## External Dependencies

- OverFast API for public Overwatch career data.
- DeepSeek API for AI analysis.
- Upstash Redis for per-IP daily quota.
