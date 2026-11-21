# Rasta: Mumbai road complaints, followed to the rupee

Built at **Claude Impact Lab Mumbai** (21 Nov 2026) for *Follow the Rupee: Mumbai Monsoon Roads*.

One app, two sides of the same problem:

| Citizen | Ward officer |
|---|---|
| Report a road problem in under a minute: photo, voice or text | An inbox ranked by **risk to people**, not by arrival time |
| Claude reads the photo and fills the form (category, type, severity, description) | Claude screens every complaint (valid / invalid / needs info) and a human decides |
| Location from GPS or the photo's geotag, with the ward found automatically | Priority score you can explain: accidents, hospitals and schools, flood hotspots (weighted by season), traffic, public support |
| "Someone already reported this": **support** it instead of filing a duplicate, or file separately with a reason | **Smart budget**: enter the money you have and pick a season. It ranks every issue, picks the repair method that lasts, and sends roads under guarantee back to their contractor for free |
| Track status (Registered, In progress, Closed, Invalid), the deadline, and who fixed it at what price | **Tenders**: bids come in, Claude compares them on price and on BMC track record (new bidders on their bid), you award |
| City map, ward by ward: every complaint, its repair job, bill vs fair price, before and after photos | Awarding a tender updates the citizen's complaint automatically |
| Contractor scorecards and "your rights" (deadlines, Defect Liability Period, escalation, RTI) | |

## Run it

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY (and optionally DEEPGRAM_API_KEY)
npm run dev                     # http://localhost:3000
```

Login is a demo: the citizen gets an OTP pre-filled, and the officer picks a ward (Ward L, Kurla, has the most open complaints).

- **No API key?** Everything still works. AI steps fall back to rule-based tagging and triage.
- **Voice:** uses Deepgram when `DEEPGRAM_API_KEY` is set, otherwise the browser's own speech recognition. There is also a "sample voice note" button for demos.
- **Sample photos:** each one carries a Kurla geotag, so the duplicate check has something to find. They are openly licensed photos from Wikimedia Commons; see `public/samples/CREDITS.md`.

## What's new in round 2

- **Real ward map:** actual BMC ward boundaries (DataMeet Municipal Spatial Data); 93% of dataset complaints fall inside their recorded ward. Each ward shows budget allocated, spent and left.
- **Delivery-app location picker:** move the map under a fixed pin, search areas, roads, hospitals and schools offline, or "Use current location". The ward is captured automatically.
- **Form modelled on MyBMC MARG:** Grievance type and subtype, Description (250 chars), Upload/Capture photo, Ward (auto-captured), Acknowledgement (Anonymous, mobile, email). Status tiles: Registered, In progress, Closed, Invalid. Closed complaints get a star rating and **Renew complaint**, as in MARG.
- **Voice first:** "Just say it". Claude fills the form, finds the spoken place on the map, and asks only for what is missing.
- **Contractor scorecards for citizens:** an A–E grade, "out of 10 repairs" icon rows, city comparison bars, and money questions.
- **Custom RTI letter** for any job (from a complaint, a contractor page, or the Your rights page).
- **Officer:** paginated inbox, an "Approved by you" view, and the next step to fund it. The smart budget has a 20% emergency reserve, season buttons, and issue cards with signals (school or hospital, flood spot, accidents, bus route, failed before).
- **More of the dataset used:** social media posts and tide-sensitive flood spots now raise priority; rainfall explains failed repairs on the map.

## How it works

- **Data:** `data/*.json` is exported from the hackathon dataset plus the Rupee Trail audit engine (`../rupee-trail`) by `npm run data`. It covers 6,500 complaints, 2,499 work orders with audit flags, 291 roads, 24 ward polygons, contractor scorecards, the next-rupee plan, and the Claude audit-court verdicts.
- **AI** (`lib/ai.ts`) uses Claude with structured outputs. The model is set by `RASTA_MODEL` (default `claude-haiku-5-5`, the cheapest). It has five jobs: photo → form, voice → form, complaint triage, plan summary for the ward committee, and tender bid comparison. AI only suggests; every decision is a human click.
- **Priority** (`lib/priority.ts`) is a transparent, deterministic score: severity 25%, accident risk 20%, hospital or school access 15%, flood 15% (scaled by season), traffic 15%, public demand 10%.
- **State:** new complaints, support, decisions and tenders live in `.data/store.json` (or the temp dir on read-only hosts). Delete it to reset the demo.

## Demo script (3 minutes)

1. **Citizen:** Report a problem, then use a sample photo (Pothole). Claude fills the form and the location comes from the photo's geotag. Submit; "Someone already reported this" appears, so support it, or file separately with a reason.
2. Open **Map**, then Ward L. The map zooms in. Tap a green dot to see the contractor, billed vs fair price, and whether the repair held 30 days.
3. **Officer** (Ward L): the new complaint is in the inbox with Claude's review. Confirm valid.
4. **Smart budget:** switch the season to Pre-monsoon and drains jump up. "Write with AI" turns the plan into a note. Open a tender on the top issue.
5. **Tender:** Analyse bids, then award. The citizen's complaint now shows who is fixing it.

All data is synthetic and every contractor is fictional. Ward boundaries: [DataMeet Municipal Spatial Data](https://github.com/datameet/Municipal_Spatial_Data) (`scripts/build_wards.py`). Dataset: [Claude-Impact-Labs-data-2](https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2), CC BY 4.0. Map © OpenStreetMap contributors.
