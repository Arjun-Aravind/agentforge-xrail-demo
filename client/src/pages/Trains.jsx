import { useCallback, useEffect, useState } from 'react';
import { api, fmtDateTime, fmtDelay } from '../api.js';
import SidePanel from '../components/SidePanel.jsx';
import TrainDetail from '../components/TrainDetail.jsx';

const STATUSES = [
  'Planned',
  'Running',
  'Finished',
  'Standing',
  'Scheduled',
  'Restarted',
  'Cancelled',
  'Clarification needed',
];

const SOURCE_CLASS = { RNE: 'src-rne', ISR: 'src-isr', MANUAL: 'src-manual' };

const emptyForm = {
  from: '',
  to: '',
  trainNumber: '',
  trainDate: '2026-08-02',
  plannedDeparture: '2026-08-02T08:00',
  plannedArrival: '2026-08-02T16:00',
  maxM: 600,
  maxT: 2000,
};

export default function Trains() {
  const [trains, setTrains] = useState([]);
  const [yards, setYards] = useState([]);
  const [filters, setFilters] = useState({ status: '', number: '', direction: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.trains(filters).then(setTrains).catch((e) => setError(e.message));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api.yards().then(setYards);
  }, []);

  async function addTrain(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await api.createTrain({
        ...form,
        plannedDeparture: `${form.plannedDeparture}:00`,
        plannedArrival: `${form.plannedArrival}:00`,
      });
      setShowAdd(false);
      setForm(emptyForm);
      load();
      setSelected(created);
    } catch (err) {
      setError(err.message);
    }
  }

  function onTrainChange(updated) {
    setTrains((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelected(updated);
  }

  function onTrainDeleted(id) {
    setTrains((prev) => prev.filter((t) => t.id !== id));
    setSelected(null);
  }

  return (
    <div className="page">
      <div className="table-card">
        <header className="card-head">
          <span>Trains</span>
          <div className="head-actions">
            <button title="Add train" onClick={() => setShowAdd(true)}>
              +
            </button>
            <button title="Filter" onClick={() => setShowFilters(true)}>
              ⛭
            </button>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        <div className="table-scroll">
          <table className="grid trains">
            <thead>
              <tr>
                <th>Direction</th>
                <th>Train Date</th>
                <th>Train Number</th>
                <th>Related</th>
                <th>Status</th>
                <th>Planned Departure</th>
                <th>Planned Arrival</th>
                <th>Actual Departure</th>
                <th>Actual Arrival</th>
                <th>Current location</th>
                <th>Delay</th>
                <th>Util [m]</th>
                <th># wgns</th>
                <th># dist.</th>
              </tr>
            </thead>
            <tbody>
              {trains.map((t) => (
                <tr
                  key={t.id}
                  className={`${selected?.id === t.id ? 'selected' : ''} status-row-${t.status.replace(/\s/g, '-').toLowerCase()}`}
                  onClick={() => setSelected(t)}
                >
                  <td>{t.direction}</td>
                  <td>{t.trainDate.split('-').reverse().join('.')}</td>
                  <td>{t.trainNumber}</td>
                  <td>{t.relatedTrainNumbers}</td>
                  <td>
                    <span className={`status-badge s-${t.status.replace(/\s/g, '-').toLowerCase()}`}>{t.status}</span>
                  </td>
                  <td>{fmtDateTime(t.plannedDeparture)}</td>
                  <td>{fmtDateTime(t.plannedArrival)}</td>
                  <td className={SOURCE_CLASS[t.departureSource] || ''}>{fmtDateTime(t.actualDeparture)}</td>
                  <td className={SOURCE_CLASS[t.arrivalSource] || ''}>{fmtDateTime(t.actualArrival)}</td>
                  <td>{t.currentLocation}</td>
                  <td>{fmtDelay(t.currentDelay)}</td>
                  <td>{t.utilM}%</td>
                  <td>{t.wagonCount}</td>
                  <td>{t.disturbanceCount || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="table-foot">{trains.length} trains</footer>
      </div>

      {showFilters && (
        <SidePanel title="Filter trains" onClose={() => setShowFilters(false)} width={340}>
          <label className="field">
            <span>Status</span>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Train number</span>
            <input value={filters.number} onChange={(e) => setFilters({ ...filters, number: e.target.value })} />
          </label>
          <label className="field">
            <span>Direction contains</span>
            <input value={filters.direction} onChange={(e) => setFilters({ ...filters, direction: e.target.value })} />
          </label>
          <button className="btn" onClick={() => setFilters({ status: '', number: '', direction: '' })}>
            Reset filters
          </button>
        </SidePanel>
      )}

      {showAdd && (
        <SidePanel title="Add a train" subtitle="Ad hoc train outside the annual timetable" onClose={() => setShowAdd(false)} width={380}>
          <form onSubmit={addTrain}>
            <label className="field">
              <span>From *</span>
              <select required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
                <option value="">—</option>
                {yards.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>To *</span>
              <select required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
                <option value="">—</option>
                {yards.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Train number *</span>
              <input required value={form.trainNumber} onChange={(e) => setForm({ ...form, trainNumber: e.target.value })} />
            </label>
            <label className="field">
              <span>Planned departure</span>
              <input
                type="datetime-local"
                value={form.plannedDeparture}
                onChange={(e) => setForm({ ...form, plannedDeparture: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Planned arrival</span>
              <input
                type="datetime-local"
                value={form.plannedArrival}
                onChange={(e) => setForm({ ...form, plannedArrival: e.target.value })}
              />
            </label>
            <div className="two-col">
              <label className="field">
                <span>Max [m]</span>
                <input type="number" value={form.maxM} onChange={(e) => setForm({ ...form, maxM: e.target.value })} />
              </label>
              <label className="field">
                <span>Max [t]</span>
                <input type="number" value={form.maxT} onChange={(e) => setForm({ ...form, maxT: e.target.value })} />
              </label>
            </div>
            <button className="btn primary" type="submit">
              Save
            </button>
          </form>
        </SidePanel>
      )}

      {selected && (
        <SidePanel
          title={`${selected.trainNumber} — ${selected.trainDate.split('-').reverse().join('.')}`}
          subtitle={`@ ${selected.direction} · ${selected.status}`}
          onClose={() => setSelected(null)}
          width={520}
        >
          <TrainDetail train={selected} onChange={onTrainChange} onDeleted={onTrainDeleted} />
        </SidePanel>
      )}
    </div>
  );
}
