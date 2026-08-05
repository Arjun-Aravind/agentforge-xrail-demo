import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RUS,
  YARDS,
  RELATIONS,
  TRAINS,
  WAGONS,
  DISTURBANCES,
  SCHEDULES,
  CHATS,
  state,
  yardById,
  minutesBetween,
  nowLocalIso,
} from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const PUNCTUALITY_TOLERANCE_MIN = 30;

function withYardNames(train) {
  return {
    ...train,
    fromName: yardById(train.from).name,
    toName: yardById(train.to).name,
    direction: `${yardById(train.from).name} → ${yardById(train.to).name}`,
    utilM: train.maxM ? Math.round((train.actualM / train.maxM) * 100) : 0,
    utilT: train.maxT ? Math.round((train.actualT / train.maxT) * 100) : 0,
    disturbanceCount: DISTURBANCES.filter((d) => {
      const rel = RELATIONS.find((r) => r.id === d.relationId);
      return rel && rel.from === train.from && rel.to === train.to;
    }).length,
  };
}

app.get('/api/meta', (_req, res) => {
  res.json({
    version: '1.1.9',
    environment: 'DEMO',
    rus: RUS,
    yards: YARDS,
    latestData: {
      RNE: '2026-08-03T12:57:00',
      ISR: '2026-08-03T12:20:00',
      XCB: '2026-08-03T11:06:00',
    },
  });
});

app.get('/api/yards', (_req, res) => res.json(YARDS));

// Dashboard: relations grouped per RU pair, plus a per-yard status for the map.
app.get('/api/flows', (_req, res) => {
  const groups = {};
  for (const rel of RELATIONS) {
    const active = DISTURBANCES.some((d) => d.relationId === rel.id);
    const row = {
      ...rel,
      fromName: yardById(rel.from).name,
      toName: yardById(rel.to).name,
      hasDisturbance: active,
    };
    groups[rel.group] = groups[rel.group] || [];
    groups[rel.group].push(row);
  }

  const rank = { normal: 0, tense: 1, critical: 2 };
  const yardStatus = {};
  for (const yard of YARDS) {
    const own = RELATIONS.filter((r) => r.to === yard.id || r.from === yard.id);
    const worst = own.reduce((acc, r) => (rank[r.status] > rank[acc] ? r.status : acc), 'normal');
    yardStatus[yard.id] = {
      status: worst,
      hasDisturbance: own.some((r) => DISTURBANCES.some((d) => d.relationId === r.id)),
    };
  }

  res.json({ groups, yardStatus });
});

app.get('/api/trains', (req, res) => {
  const { status, direction, number, from, to } = req.query;
  let rows = TRAINS.map(withYardNames);
  if (status) rows = rows.filter((t) => t.status === status);
  if (number) rows = rows.filter((t) => t.trainNumber.includes(number) || (t.relatedTrainNumbers || '').includes(number));
  if (from) rows = rows.filter((t) => t.from === from);
  if (to) rows = rows.filter((t) => t.to === to);
  if (direction) rows = rows.filter((t) => t.direction.toLowerCase().includes(direction.toLowerCase()));
  rows.sort((a, b) => a.plannedDeparture.localeCompare(b.plannedDeparture));
  res.json(rows);
});

app.get('/api/trains/:id', (req, res) => {
  const train = TRAINS.find((t) => t.id === req.params.id);
  if (!train) return res.status(404).json({ error: 'Train not found' });
  res.json(withYardNames(train));
});

app.post('/api/trains', (req, res) => {
  const body = req.body || {};
  if (!body.from || !body.to || !body.trainNumber) {
    return res.status(400).json({ error: 'from, to and trainNumber are required' });
  }
  const train = {
    id: `T${String(state.nextTrainId++).padStart(3, '0')}`,
    from: body.from,
    to: body.to,
    trainDate: body.trainDate || '2026-08-02',
    trainNumber: body.trainNumber,
    relatedTrainNumbers: body.relatedTrainNumbers || '',
    status: 'Planned',
    plannedDeparture: body.plannedDeparture || null,
    plannedArrival: body.plannedArrival || null,
    actualDeparture: null,
    actualArrival: null,
    departureSource: null,
    arrivalSource: null,
    currentLocation: null,
    currentDelay: null,
    latestRneEventAt: null,
    remark: body.remark || '',
    resources: { path: true, driver: true, loco: true },
    maxM: Number(body.maxM) || 600,
    maxT: Number(body.maxT) || 2000,
    actualM: 0,
    actualT: 0,
    wagonCount: 0,
    cancellationDateTime: null,
    cancellationReason: null,
    standingDateTime: null,
    standingReason: null,
    restartDateTime: null,
    newNumber: null,
    isAdditional: true,
    journey: [],
  };
  TRAINS.push(train);
  res.status(201).json(withYardNames(train));
});

// Free-form patch, used by the detail panel for remarks and manual time overrides.
app.patch('/api/trains/:id', (req, res) => {
  const train = TRAINS.find((t) => t.id === req.params.id);
  if (!train) return res.status(404).json({ error: 'Train not found' });
  const editable = ['remark', 'actualDeparture', 'actualArrival', 'maxM', 'maxT', 'actualM', 'actualT', 'currentLocation'];
  for (const key of editable) {
    if (key in req.body) train[key] = req.body[key];
  }
  if ('actualDeparture' in req.body && req.body.actualDeparture) {
    train.departureSource = 'MANUAL';
    if (train.status === 'Planned') train.status = 'Running';
  }
  if ('actualArrival' in req.body && req.body.actualArrival) {
    train.arrivalSource = 'MANUAL';
    train.status = 'Finished';
    train.currentDelay = minutesBetween(train.plannedArrival, req.body.actualArrival);
  }
  res.json(withYardNames(train));
});

// Lifecycle actions from the handbook: standing, restart, cancel, clarify.
app.post('/api/trains/:id/actions/:action', (req, res) => {
  const train = TRAINS.find((t) => t.id === req.params.id);
  if (!train) return res.status(404).json({ error: 'Train not found' });
  const now = nowLocalIso();
  const { action } = req.params;
  const body = req.body || {};

  switch (action) {
    case 'standing':
      train.status = 'Standing';
      train.standingDateTime = body.at || now;
      train.standingReason = body.reason || 'Not specified';
      break;
    case 'restart':
      train.status = 'Restarted';
      train.restartDateTime = body.at || now;
      train.newNumber = body.newNumber || null;
      train.standingReason = train.standingReason || null;
      break;
    case 'schedule':
      train.status = 'Scheduled';
      train.plannedDeparture = body.plannedDeparture || train.plannedDeparture;
      break;
    case 'cancel':
      train.status = 'Cancelled';
      train.cancellationDateTime = body.at || now;
      train.cancellationReason = body.reason || 'Not specified';
      train.actualM = 0;
      train.actualT = 0;
      break;
    case 'clarify':
      train.status = 'Clarification needed';
      break;
    case 'resolve':
      train.status = train.actualArrival ? 'Finished' : train.actualDeparture ? 'Running' : 'Planned';
      break;
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
  res.json(withYardNames(train));
});

app.delete('/api/trains/:id', (req, res) => {
  const idx = TRAINS.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Train not found' });
  TRAINS.splice(idx, 1);
  res.status(204).end();
});

app.get('/api/trains/:id/wagons', (req, res) => {
  res.json(WAGONS.filter((w) => w.trainId === req.params.id));
});

app.get('/api/wagons', (req, res) => {
  const { number, statusType, trainNumber } = req.query;
  let rows = WAGONS;
  if (number) rows = rows.filter((w) => w.wagonNumber.replace(/\s|-/g, '').includes(number.replace(/\s|-/g, '')));
  if (statusType) rows = rows.filter((w) => w.statusType === statusType);
  if (trainNumber) {
    const ids = TRAINS.filter((t) => t.trainNumber.includes(trainNumber)).map((t) => t.id);
    rows = rows.filter((w) => ids.includes(w.trainId));
  }
  res.json(rows.slice(0, 300));
});

app.get('/api/disturbances', (_req, res) => {
  res.json(
    DISTURBANCES.map((d) => {
      const rel = RELATIONS.find((r) => r.id === d.relationId);
      return {
        ...d,
        relation: rel ? `${yardById(rel.from).name} → ${yardById(rel.to).name}` : '—',
        active: new Date(d.endAt) > new Date('2026-08-02T20:00:00'),
      };
    })
  );
});

app.post('/api/disturbances', (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.relationId || !body.startAt || !body.endAt) {
    return res.status(400).json({ error: 'title, relationId, startAt and endAt are required' });
  }
  const disturbance = {
    id: `D${String(state.nextDisturbanceId++).padStart(3, '0')}`,
    title: body.title,
    relationId: body.relationId,
    ru: body.ru || 'DBC',
    impact: body.impact || 'medium',
    reason: body.reason || 'Other',
    description: body.description || '',
    startAt: body.startAt,
    endAt: body.endAt,
    createdBy: 'demo.user@xrail.eu',
  };
  DISTURBANCES.push(disturbance);
  res.status(201).json(disturbance);
});

app.delete('/api/disturbances/:id', (req, res) => {
  const idx = DISTURBANCES.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Disturbance not found' });
  DISTURBANCES.splice(idx, 1);
  res.status(204).end();
});

app.get('/api/schedules', (_req, res) => {
  res.json(
    SCHEDULES.map((s) => {
      const rel = RELATIONS.find((r) => r.id === s.relationId);
      return { ...s, direction: `${yardById(rel.from).name} → ${yardById(rel.to).name}` };
    })
  );
});

app.get('/api/chats/:threadId', (req, res) => {
  res.json(CHATS[req.params.threadId] || []);
});

app.post('/api/chats/:threadId', (req, res) => {
  const text = (req.body && req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });
  const message = {
    id: `M${state.nextMessageId++}`,
    author: req.body.author || 'You (DBC Ops)',
    text,
    at: nowLocalIso(),
  };
  CHATS[req.params.threadId] = CHATS[req.params.threadId] || [];
  CHATS[req.params.threadId].push(message);
  res.status(201).json(message);
});

// Stand-in for the platform's built-in translation. Demo only, no external call.
app.post('/api/translate', (req, res) => {
  const text = (req.body && req.body.text) || '';
  res.json({ translated: `[EN] ${text}` });
});

// KPIs are recomputed from the current train list, per the handbook definitions.
app.get('/api/kpis', (_req, res) => {
  const byRelation = {};
  for (const train of TRAINS) {
    const key = `${train.from}→${train.to}`;
    byRelation[key] = byRelation[key] || {
      relation: `${yardById(train.from).name} → ${yardById(train.to).name}`,
      trains: 0,
      cancelled: 0,
      additional: 0,
      utilMSum: 0,
      utilTSum: 0,
      utilCount: 0,
      depOnTime: 0,
      depMeasured: 0,
      arrOnTime: 0,
      arrMeasured: 0,
    };
    const row = byRelation[key];
    row.trains += 1;
    if (train.status === 'Cancelled') row.cancelled += 1;
    if (train.isAdditional) row.additional += 1;
    if (train.actualM > 0) {
      row.utilMSum += (train.actualM / train.maxM) * 100;
      row.utilTSum += (train.actualT / train.maxT) * 100;
      row.utilCount += 1;
    }
    if (train.actualDeparture) {
      row.depMeasured += 1;
      if (minutesBetween(train.plannedDeparture, train.actualDeparture) <= PUNCTUALITY_TOLERANCE_MIN) row.depOnTime += 1;
    }
    if (train.actualArrival) {
      row.arrMeasured += 1;
      if (minutesBetween(train.plannedArrival, train.actualArrival) <= PUNCTUALITY_TOLERANCE_MIN) row.arrOnTime += 1;
    }
  }

  const pct = (num, den) => (den ? Math.round((num / den) * 100) : null);
  const rows = Object.values(byRelation).map((r) => ({
    relation: r.relation,
    trains: r.trains,
    utilisationM: r.utilCount ? Math.round(r.utilMSum / r.utilCount) : 0,
    utilisationT: r.utilCount ? Math.round(r.utilTSum / r.utilCount) : 0,
    additionalTrains: r.additional,
    cancelledTrains: r.cancelled,
    cancellationRate: pct(r.cancelled, r.trains),
    departurePunctuality: pct(r.depOnTime, r.depMeasured),
    arrivalPunctuality: pct(r.arrOnTime, r.arrMeasured),
  }));
  rows.sort((a, b) => a.relation.localeCompare(b.relation));

  const totals = rows.reduce(
    (acc, r) => {
      acc.trains += r.trains;
      acc.cancelled += r.cancelledTrains;
      return acc;
    },
    { trains: 0, cancelled: 0 }
  );

  res.json({
    toleranceMinutes: PUNCTUALITY_TOLERANCE_MIN,
    rows,
    summary: {
      trains: totals.trains,
      cancellationRate: pct(totals.cancelled, totals.trains),
      utilisationM: Math.round(rows.reduce((a, r) => a + r.utilisationM, 0) / (rows.length || 1)),
      departurePunctuality: Math.round(
        rows.filter((r) => r.departurePunctuality !== null).reduce((a, r) => a + r.departurePunctuality, 0) /
          (rows.filter((r) => r.departurePunctuality !== null).length || 1)
      ),
      arrivalPunctuality: Math.round(
        rows.filter((r) => r.arrivalPunctuality !== null).reduce((a, r) => a + r.arrivalPunctuality, 0) /
          (rows.filter((r) => r.arrivalPunctuality !== null).length || 1)
      ),
    },
  });
});

// Serve the built client when it exists, so `npm start` alone is enough.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client not built. Run: npm --prefix client run build');
  });
});

app.listen(PORT, () => {
  console.log(`XCP demo API listening on http://localhost:${PORT}`);
});
