import { useEffect, useState } from 'react';
import { api, fmtDateTime } from '../api.js';
import SidePanel from '../components/SidePanel.jsx';

const emptyForm = {
  title: '',
  relationId: '',
  impact: 'medium',
  reason: 'Infrastructure',
  description: '',
  startAt: '2026-08-02T12:00',
  endAt: '2026-08-02T20:00',
};

export default function Disturbances() {
  const [rows, setRows] = useState([]);
  const [relations, setRelations] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  function load() {
    api.disturbances().then(setRows);
  }

  useEffect(() => {
    load();
    api.flows().then((f) => setRelations(Object.values(f.groups).flat()));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.createDisturbance({ ...form, startAt: `${form.startAt}:00`, endAt: `${form.endAt}:00` });
      setShowAdd(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this disturbance? Partner RUs will no longer see it.')) return;
    await api.deleteDisturbance(id);
    load();
  }

  return (
    <div className="page">
      <div className="table-card">
        <header className="card-head">
          <span>Disturbances</span>
          <div className="head-actions">
            <button title="Add disturbance" onClick={() => setShowAdd(true)}>
              +
            </button>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        <table className="grid">
          <thead>
            <tr>
              <th>Title</th>
              <th>Relation</th>
              <th>RU</th>
              <th>Impact</th>
              <th>Reason</th>
              <th>Start</th>
              <th>End</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className={d.impact === 'high' ? 'impact-high' : ''}>
                <td title={d.description}>{d.title}</td>
                <td>{d.relation}</td>
                <td>{d.ru}</td>
                <td>{d.impact}</td>
                <td>{d.reason}</td>
                <td>{fmtDateTime(d.startAt)}</td>
                <td>{fmtDateTime(d.endAt)}</td>
                <td>{d.active ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn danger tiny" onClick={() => remove(d.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <SidePanel title="Add a disturbance" subtitle="Visible to all partner RUs once saved" onClose={() => setShowAdd(false)} width={400}>
          <form onSubmit={submit}>
            <label className="field">
              <span>Title *</span>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="field">
              <span>Relation *</span>
              <select required value={form.relationId} onChange={(e) => setForm({ ...form, relationId: e.target.value })}>
                <option value="">—</option>
                {relations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fromName} → {r.toName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Impact</span>
              <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high (banner for all users)</option>
              </select>
            </label>
            <label className="field">
              <span>Reason</span>
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                <option>Infrastructure</option>
                <option>Weather</option>
                <option>Strike</option>
                <option>Staff shortage</option>
                <option>Other</option>
              </select>
            </label>
            <label className="field">
              <span>Start *</span>
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
            </label>
            <label className="field">
              <span>End *</span>
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="actions">
              <button className="btn primary" type="submit">
                Save
              </button>
              <button className="btn" type="button" onClick={() => setForm(emptyForm)}>
                Reset
              </button>
            </div>
          </form>
        </SidePanel>
      )}
    </div>
  );
}
