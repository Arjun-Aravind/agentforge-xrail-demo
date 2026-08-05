// Seed data for the XCP demo. Everything lives in memory and resets on restart.

// Deterministic pseudo-random generator so the demo looks the same on every boot.
let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick(list) {
  return list[Math.floor(rnd() * list.length)];
}
function int(min, max) {
  return min + Math.floor(rnd() * (max - min + 1));
}

export const RUS = {
  DBC: { code: 'DBC', name: 'DB Cargo', country: 'DE', phone: '+49 203 9876 100', email: 'ops.dbc@example.eu', hours: '24/7' },
  GC: { code: 'GC', name: 'Green Cargo', country: 'SE', phone: '+46 10 455 40 00', email: 'ops.gc@example.eu', hours: '24/7' },
  HXF: { code: 'HXF', name: 'Fret SNCF', country: 'FR', phone: '+33 1 55 44 22 10', email: 'ops.hxf@example.eu', hours: 'Mon-Sun 05:00-23:00' },
  RCG: { code: 'RCG', name: 'Rail Cargo Group', country: 'AT', phone: '+43 1 93000 32000', email: 'ops.rcg@example.eu', hours: '24/7' },
};

// Marshalling yards. lat/lon are used by the client to draw the network map.
export const YARDS = [
  { id: 'MALMO', name: 'Malmö', ru: 'GC', lat: 55.6, lon: 13.0 },
  { id: 'TRELLEBORG', name: 'Trelleborg', ru: 'GC', lat: 55.37, lon: 13.16 },
  { id: 'ROSTOCK', name: 'Rostock Seehafen', ru: 'DBC', lat: 54.15, lon: 12.1 },
  { id: 'MASCHEN', name: 'Maschen', ru: 'DBC', lat: 53.4, lon: 10.05 },
  { id: 'GREMBERG', name: 'Gremberg', ru: 'DBC', lat: 50.9, lon: 7.0 },
  { id: 'WOIPPY', name: 'Woippy', ru: 'HXF', lat: 49.15, lon: 6.15 },
  { id: 'NUERNBERG', name: 'Nuernberg', ru: 'DBC', lat: 49.45, lon: 11.08 },
  { id: 'MUENCHEN', name: 'Muenchen', ru: 'DBC', lat: 48.14, lon: 11.57 },
  { id: 'LINZ', name: 'Linz', ru: 'RCG', lat: 48.3, lon: 14.29 },
  { id: 'WELS', name: 'Wels Vbf', ru: 'RCG', lat: 48.16, lon: 14.02 },
  { id: 'SALZBURG', name: 'Salzburg', ru: 'RCG', lat: 47.8, lon: 13.04 },
  { id: 'WIEN', name: 'Wien', ru: 'RCG', lat: 48.21, lon: 16.37 },
  { id: 'HALL', name: 'Hall in Tirol', ru: 'RCG', lat: 47.28, lon: 11.51 },
  { id: 'VILLACH', name: 'Villach Sued', ru: 'RCG', lat: 46.61, lon: 13.85 },
];

export const yardById = (id) => YARDS.find((y) => y.id === id);

// Relations grouped by RU pair, exactly like the wagon flow panel on the dashboard.
const RELATION_DEFS = [
  ['DBCxGC', 'MALMO', 'MASCHEN'],
  ['DBCxGC', 'MASCHEN', 'MALMO'],
  ['DBCxGC', 'ROSTOCK', 'TRELLEBORG'],
  ['DBCxGC', 'TRELLEBORG', 'ROSTOCK'],
  ['DBCxHXF', 'GREMBERG', 'WOIPPY'],
  ['DBCxHXF', 'WOIPPY', 'GREMBERG'],
  ['DBCxRCG', 'HALL', 'MUENCHEN'],
  ['DBCxRCG', 'LINZ', 'NUERNBERG'],
  ['DBCxRCG', 'MUENCHEN', 'HALL'],
  ['DBCxRCG', 'MUENCHEN', 'SALZBURG'],
  ['DBCxRCG', 'MUENCHEN', 'VILLACH'],
  ['DBCxRCG', 'NUERNBERG', 'LINZ'],
  ['DBCxRCG', 'NUERNBERG', 'WELS'],
  ['DBCxRCG', 'NUERNBERG', 'WIEN'],
  ['DBCxRCG', 'SALZBURG', 'MUENCHEN'],
  ['DBCxRCG', 'VILLACH', 'MUENCHEN'],
  ['DBCxRCG', 'WIEN', 'NUERNBERG'],
];

// Volume status is derived from used metres against the yellow / red thresholds.
function volumeStatus(meters, yellow, red) {
  if (meters >= red) return 'critical';
  if (meters >= yellow) return 'tense';
  return 'normal';
}

export const RELATIONS = RELATION_DEFS.map(([group, from, to], i) => {
  const inflowWg = int(12, 220);
  const stockWg = int(0, 190);
  const stockM = stockWg * int(14, 18);
  const yellow = 1500;
  const red = 2400;
  return {
    id: `R${String(i + 1).padStart(2, '0')}`,
    group,
    from,
    to,
    inflow: { wg: inflowWg, m: inflowWg * int(14, 19), t: inflowWg * int(20, 62) },
    stock: { wg: stockWg, m: stockM, t: stockWg * int(20, 62) },
    outflow: { trains: int(2, 8) * 600, m: int(3, 12) * 1550 },
    passed: { wg: int(200, 900) },
    thresholds: { yellowM: yellow, redM: red },
    status: volumeStatus(stockM, yellow, red),
  };
});

export const relationById = (id) => RELATIONS.find((r) => r.id === id);
export const relationKey = (from, to) => RELATIONS.find((r) => r.from === from && r.to === to);

const STATUSES = ['Planned', 'Running', 'Finished', 'Standing', 'Scheduled', 'Restarted', 'Cancelled', 'Clarification needed'];

const BASE_DATE = '2026-08-02';

function iso(date, hhmm) {
  return `${date}T${hhmm}:00`;
}

// All timestamps are naive local strings (no timezone), so format manually —
// toISOString() would shift everything by the host's UTC offset.
export function toLocalIso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function nowLocalIso() {
  return toLocalIso(new Date());
}

function addMinutes(isoStr, minutes) {
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + minutes);
  return toLocalIso(d);
}
export function minutesBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 60000);
}

// Trains are modelled after the rows visible in the real Train View.
const TRAIN_SEED = [
  ['VILLACH', 'MUENCHEN', '45800', '', 'Finished', '01:46', '07:31', 3, 5],
  ['MUENCHEN', 'SALZBURG', '44809', '', 'Finished', '06:23', '08:44', -4, -21],
  ['ROSTOCK', 'MALMO', '47714', '38596, 38640', 'Finished', '07:01', '24:18', 10, 503],
  ['GREMBERG', 'WOIPPY', '45660', '', 'Clarification needed', '07:09', '13:01', null, null],
  ['MASCHEN', 'MALMO', '44722', '38558', 'Finished', '07:15', '15:52', 224, 319],
  ['MASCHEN', 'MALMO', '44724', '38568', 'Clarification needed', '09:24', '18:21', null, null],
  ['WOIPPY', 'GREMBERG', '43287', '', 'Finished', '10:30', '17:54', 18, 5],
  ['TRELLEBORG', 'ROSTOCK', '49513', '', 'Running', '11:00', '17:15', 9, null],
  ['GREMBERG', 'WOIPPY', '44226', '44227', 'Finished', '11:15', '17:45', 49, 34],
  ['ROSTOCK', 'TRELLEBORG', '49514', '', 'Planned', '11:45', '18:00', null, null],
  ['MALMO', 'MASCHEN', '44727', '38583', 'Clarification needed', '12:00', '20:00', null, null],
  ['WOIPPY', 'GREMBERG', '45663', '', 'Standing', '13:45', '19:45', 6, null],
  ['MASCHEN', 'MALMO', '44726', '', 'Clarification needed', '16:57', '24:30', null, null],
  ['NUERNBERG', 'LINZ', '44915', '', 'Finished', '18:28', '26:20', -4, -60],
  ['LINZ', 'NUERNBERG', '44916', '', 'Planned', '19:10', '27:05', null, null],
  ['NUERNBERG', 'WIEN', '45120', '', 'Running', '20:05', '28:40', 12, null],
  ['WIEN', 'NUERNBERG', '45121', '', 'Planned', '21:30', '29:55', null, null],
  ['MUENCHEN', 'VILLACH', '46330', '', 'Cancelled', '22:00', '27:10', null, null],
  ['HALL', 'MUENCHEN', '46015', '', 'Finished', '05:12', '08:40', 1, 3],
  ['NUERNBERG', 'WELS', '45540', '', 'Restarted', '14:20', '21:30', 95, 88],
  ['SALZBURG', 'MUENCHEN', '44810', '', 'Finished', '15:05', '17:26', -2, -8],
  ['MUENCHEN', 'HALL', '46016', '', 'Scheduled', '23:15', '26:35', null, null],
];

// '24:18' style times mean the next day; normalise them here.
function timeToIso(base, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${base}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return toLocalIso(d);
}

const SOURCES = ['RNE', 'ISR', 'MANUAL'];

let trainCounter = 0;
export const TRAINS = TRAIN_SEED.map(([from, to, number, related, status, dep, arr, depDelta, arrDelta]) => {
  const plannedDeparture = timeToIso(BASE_DATE, dep);
  const plannedArrival = timeToIso(BASE_DATE, arr);
  const hasActual = ['Finished', 'Running', 'Restarted', 'Standing'].includes(status);
  const actualDeparture = hasActual && depDelta !== null ? addMinutes(plannedDeparture, depDelta) : null;
  const actualArrival = status === 'Finished' && arrDelta !== null ? addMinutes(plannedArrival, arrDelta) : null;
  const maxM = pick([550, 600, 650, 700]);
  const maxT = pick([1600, 2000, 2300, 2600]);
  const actualM = status === 'Cancelled' ? 0 : int(Math.round(maxM * 0.4), maxM);
  const actualT = status === 'Cancelled' ? 0 : int(Math.round(maxT * 0.35), maxT);
  const wagons = status === 'Cancelled' ? 0 : Math.max(1, Math.round(actualM / 17));
  const running = status === 'Running' || status === 'Restarted';

  trainCounter += 1;
  return {
    id: `T${String(trainCounter).padStart(3, '0')}`,
    from,
    to,
    trainDate: BASE_DATE,
    trainNumber: number,
    relatedTrainNumbers: related,
    status,
    plannedDeparture,
    plannedArrival,
    actualDeparture,
    actualArrival,
    departureSource: actualDeparture ? pick(SOURCES) : null,
    arrivalSource: actualArrival ? pick(SOURCES) : null,
    currentLocation: running ? pick(['Passau Grenze', 'Padborg', 'Flensburg', 'Forbach', 'Rosenheim']) : status === 'Finished' ? yardById(to).name : null,
    currentDelay: status === 'Finished' ? arrDelta : running ? depDelta : null,
    latestRneEventAt: actualArrival || actualDeparture || null,
    remark: '',
    resources: { path: status !== 'Cancelled', driver: status !== 'Cancelled', loco: status !== 'Cancelled' },
    maxM,
    maxT,
    actualM,
    actualT,
    wagonCount: wagons,
    cancellationDateTime: status === 'Cancelled' ? iso(BASE_DATE, '19:40') : null,
    cancellationReason: status === 'Cancelled' ? 'No loco available' : null,
    standingDateTime: status === 'Standing' ? iso(BASE_DATE, '15:12') : null,
    standingReason: status === 'Standing' ? 'Track blockage Forbach' : null,
    restartDateTime: status === 'Restarted' ? iso(BASE_DATE, '18:05') : null,
    newNumber: status === 'Restarted' ? '45541' : null,
    isAdditional: false,
    journey: running || status === 'Finished'
      ? [
          { at: addMinutes(plannedDeparture, 5), location: yardById(from).name, event: 'Departure' },
          { at: addMinutes(plannedDeparture, 180), location: 'Border crossing', event: 'Pass' },
          { at: actualArrival || addMinutes(plannedDeparture, 320), location: yardById(to).name, event: status === 'Finished' ? 'Arrival' : 'Latest position' },
        ]
      : [],
  };
});

const WAGON_TYPES = ['Sgns', 'Habbins', 'Rils', 'Tanoos', 'Falns', 'Laaers'];
const CUSTOMERS = [
  ['C10021', 'NordSteel AB'],
  ['C10044', 'Chemie Rhein GmbH'],
  ['C10088', 'Alpine Timber AG'],
  ['C10112', 'AutoLogistics SA'],
  ['C10190', 'BalticPaper Oy'],
];

// Wagon detail per train, with the four booking / ISR combinations from the handbook.
export const WAGONS = [];
for (const train of TRAINS) {
  for (let i = 0; i < train.wagonCount; i++) {
    const [code, name] = pick(CUSTOMERS);
    const booked = rnd() > 0.12;
    const isrConfirmed = train.status === 'Planned' || train.status === 'Scheduled' ? false : rnd() > 0.2;
    let flag;
    if (booked && isrConfirmed) flag = 'booked-confirmed';
    else if (!booked && isrConfirmed) flag = 'unbooked-confirmed';
    else if (booked && !isrConfirmed && train.actualDeparture) flag = 'booked-unconfirmed';
    else flag = 'not-departed';

    WAGONS.push({
      id: `${train.id}-W${String(i + 1).padStart(3, '0')}`,
      trainId: train.id,
      wagonNumber: `${int(21, 84)} ${int(10, 89)} ${int(1000, 9999)} ${int(100, 999)}-${int(0, 9)}`,
      direction: `${yardById(train.from).name} → ${yardById(train.to).name}`,
      statusType: train.status === 'Finished' ? 'STOCK' : train.actualDeparture ? 'RUNNING' : 'INFLOW',
      eti: addMinutes(train.plannedDeparture, -int(60, 600)),
      eta: addMinutes(train.plannedArrival, int(-30, 240)),
      currentLocation: train.currentLocation || yardById(train.from).name,
      gpcp: yardById(train.to).name,
      contractNumber: `CN-${int(100000, 999999)}`,
      consignorCode: code,
      consignorName: name,
      consigneeCode: pick(CUSTOMERS)[0],
      lengthM: int(14, 26),
      weightT: int(18, 68),
      loaded: rnd() > 0.25,
      wagonType: pick(WAGON_TYPES),
      dangerousGoods: rnd() > 0.88,
      booked,
      isrConfirmed,
      flag,
      lastIsrEvent: train.latestRneEventAt || train.plannedDeparture,
    });
  }
}

export const DISTURBANCES = [
  {
    id: 'D001',
    title: 'Track blockage Forbach - Woippy',
    relationId: RELATIONS.find((r) => r.from === 'WOIPPY' && r.to === 'GREMBERG').id,
    ru: 'HXF',
    impact: 'high',
    reason: 'Infrastructure',
    description: 'Signalling failure between Forbach and Woippy. Expect up to 180 min delay on all trains.',
    startAt: iso(BASE_DATE, '13:10'),
    endAt: iso(BASE_DATE, '23:59'),
    createdBy: 'ops.hxf@example.eu',
  },
  {
    id: 'D002',
    title: 'Reduced shunting capacity Maschen',
    relationId: RELATIONS.find((r) => r.from === 'MASCHEN' && r.to === 'MALMO').id,
    ru: 'DBC',
    impact: 'medium',
    reason: 'Staff shortage',
    description: 'Night shift reduced, outbound trains may depart up to 60 min late.',
    startAt: iso(BASE_DATE, '18:00'),
    endAt: '2026-08-03T06:00:00',
    createdBy: 'ops.dbc@example.eu',
  },
];

// Chat threads are keyed freely, e.g. "train:T005" or "ru:GC".
export const CHATS = {
  'train:T005': [
    { id: 'M1', author: 'GC Ops Malmö', text: 'Zug 44722 kommt mit 5 Stunden Verspätung an. Gleis 12 reserviert.', at: iso(BASE_DATE, '20:41') },
    { id: 'M2', author: 'DBC Ops Maschen', text: 'Understood, thanks. Wagons for Trelleborg will be re-planned.', at: iso(BASE_DATE, '20:52') },
  ],
};

export const SCHEDULES = RELATIONS.slice(0, 10).map((r, i) => ({
  id: `S${String(i + 1).padStart(2, '0')}`,
  relationId: r.id,
  trainNumber: String(44000 + i * 7),
  days: [true, true, true, true, true, i % 2 === 0, false],
  plannedDeparture: `0${int(5, 9)}:${pick(['00', '15', '30', '45'])}`,
  plannedArrival: `1${int(0, 9)}:${pick(['00', '15', '30', '45'])}`,
  validFrom: '2025-12-14',
  validUntil: '2026-12-12',
  runsOver24h: i % 4 === 0,
  maxMPlanned: pick([550, 600, 650, 700]),
  maxTPlanned: pick([1600, 2000, 2300]),
}));

export const state = {
  nextTrainId: TRAINS.length + 1,
  nextDisturbanceId: DISTURBANCES.length + 1,
  nextMessageId: 100,
};
