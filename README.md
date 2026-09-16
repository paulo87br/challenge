# Aranis Challenge

Dynamic, evidence-driven professional simulation engine.

## Current vertical slice

- Scenario Builder at `/admin`
- Candidate workspace at `/lab`
- Simulated Mail, Chat, Ara, Files and Timeline
- Seat + scenario temperature model
- OpenAI Director and Pulso endpoints
- Isolated `challenge` Supabase schema migration

## Architecture

`Admin -> Scenario -> Seat -> Director -> Workspace -> Telemetry -> Pulso -> Evidence -> Assessment/Replay`

The Director evolves the simulated world. Pulso evaluates evidence independently. Ara is the in-world AI available to the candidate.

## Setup

Copy `.env.example` to `.env.local` and configure the Supabase URL/publishable key plus `OPENAI_API_KEY`.

```bash
npm install
npm run dev
```

## Next milestone

Wire Supabase authentication (Google + Microsoft), persistence and telemetry; generate the first scenario from Admin; make candidate actions advance the Director timeline; then build Replay/reporting.

The SQL migration is committed but intentionally not auto-applied to the shared Supabase production project until its RLS/schema conventions are reviewed.
