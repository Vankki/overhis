# Overhis

Overhis is a Chinese-server Overwatch stats analysis website. Users enter a national-server BattleTag as name plus numeric suffix, the app queries a local Overstats service, and DeepSeek generates a Chinese analysis with practical advice and a sharp roast.

## Features

- National-server BattleTag lookup in `Name#12345` format.
- Fixed `#` separator in the UI, so users only enter the nickname and number.
- Competitive and quickplay mode selector.
- Chinese-server profile and match data through Overstats / NetEase Dashen.
- DeepSeek AI analysis.
- Same-IP daily limit of 5 successful AI analyses.

## Local Setup

Start the separate Overstats service first and confirm it is reachable, for example at `http://127.0.0.1:18080`.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Fill `.env.local` with:

```text
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_MODEL=deepseek-v4-flash
OVERSTATS_BASE_URL=http://127.0.0.1:18080
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
```

Open `http://localhost:3000`.

## Overstats Credentials

`DASHEN_ROLE_ID` and `DASHEN_TOKEN` belong in the separate Overstats service configuration, not in this Next.js repository, not in `.env.local`, and not in chat logs. This app only needs `OVERSTATS_BASE_URL`.

## Tests

```powershell
npm test
npm run build
```

## Deployment

Deploy to Vercel or another Node.js host and add these environment variables:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `OVERSTATS_BASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The deployed app must be able to reach the Overstats service URL configured in `OVERSTATS_BASE_URL`.

## External Dependencies

- Overstats service for Chinese-server Overwatch career and match data.
- NetEase Dashen credentials configured inside the Overstats service.
- DeepSeek API for AI analysis.
- Upstash Redis for per-IP daily quota.
