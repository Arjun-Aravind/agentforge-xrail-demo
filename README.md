# XCP Demo — Xrail Collaboration Platform prototype

A simple, working Node.js + React prototype modelled on the Xrail Collaboration Platform
(XCP) described in the 2026 XCP Handbook and the product screenshots.

All data is seeded in memory on the server and resets whenever the server restarts —
no database, no auth, no external services.

## Run it

```bash
npm run install:all
```

```bash
npm run dev
```

- Client: http://localhost:5173 (Vite dev server, proxies `/api` to the backend)
- API: http://localhost:4000

Production-style single-process run:

```bash
npm --prefix client run build && npm start
```

The Express server serves `client/dist` on http://localhost:4000.

## What it does

| View | What you can do |
| --- | --- |
| **Overview (Dashboard)** | Colour-coded network map (green normal / yellow tense / red critical, ⚠ for disturbances). Wagon flow tables per RU pair (DBCxGC, DBCxHXF, DBCxRCG) with inflow / stock / outflow. Click a relation for the detail pop-up, or the 👤 icon for the partner contact card with chat. |
| **Trains** | Full train table with status colour coding, planned vs actual times, source colouring (green = RNE, grey = ISR fallback, yellow = manual override), delay, utilisation. Filter panel, add ad hoc train, and a detail panel with lifecycle actions: Standing, Restart, Mark arrived, Cancel, Delete, plus remark editing, the wagon list and a chat thread. |
| **Wagons** | Wagon-level table (ETI/ETA, location, GPCP, contract, consignor, technical attributes, DG flag, booked/ISR flags) with filters. |
| **Disturbances** | List of disturbances, add form (high impact shows the red banner on every screen), delete. |
| **Schedules** | Annual timetable entries per relation with weekday checkboxes and planned capacity. |
| **KPIs** | Utilisation, additional/cancelled trains, cancellation rate and departure/arrival punctuality — recomputed from the current train data, ±30 min tolerance. |

The chat panels support the handbook's Translate / Edit / Delete dropdown (translation is
a local stub that prefixes `[EN]`, not a real translation service).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/meta` | Version, RUs, yards, data-source timestamps |
| GET | `/api/yards` | Marshalling yards with coordinates |
| GET | `/api/flows` | Wagon flow per relation, grouped by RU pair, plus per-yard status |
| GET | `/api/trains` | Train list; filters: `status`, `number`, `direction`, `from`, `to` |
| POST | `/api/trains` | Add an ad hoc train |
| PATCH | `/api/trains/:id` | Edit remark, actual times (sets source to MANUAL), capacities |
| POST | `/api/trains/:id/actions/:action` | `standing`, `restart`, `schedule`, `cancel`, `clarify`, `resolve` |
| DELETE | `/api/trains/:id` | Remove a train |
| GET | `/api/trains/:id/wagons` | Wagon list for one train |
| GET | `/api/wagons` | All wagons; filters: `number`, `trainNumber`, `statusType` |
| GET/POST/DELETE | `/api/disturbances` | Disturbance list, create, delete |
| GET | `/api/schedules` | Annual timetable |
| GET/POST | `/api/chats/:threadId` | Chat thread (`train:T005`, `relation:R01`, `ru:GC`) |
| POST | `/api/translate` | Translation stub |
| GET | `/api/kpis` | KPI summary and per-relation rows |

## Layout

```
server/
  index.js     Express API + static hosting of the built client
  data.js      Seeded yards, relations, trains, wagons, disturbances, schedules
client/src/
  pages/       Dashboard, Trains, Wagons, Disturbances, Schedules, Kpis
  components/  NetworkMap, SidePanel, TrainDetail, WagonList, Chat
  api.js       Fetch wrapper + date/delay formatting
```

Timestamps are naive local strings (`2026-08-02T07:15:00`) everywhere — never
`toISOString()`, which would shift them by the host's UTC offset.
