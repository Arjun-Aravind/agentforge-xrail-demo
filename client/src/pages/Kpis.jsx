import { useEffect, useState } from 'react';
import { api } from '../api.js';

function Tile({ label, value, suffix = '%' }) {
  return (
    <div className="tile">
      <div className="tile-value">
        {value ?? '—'}
        {value !== null && value !== undefined ? suffix : ''}
      </div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

export default function Kpis() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.kpis().then(setData);
  }, []);

  if (!data) return <div className="page">Loading KPIs…</div>;

  return (
    <div className="page">
      <div className="tiles">
        <Tile label="Trains" value={data.summary.trains} suffix="" />
        <Tile label="Avg. utilisation [m]" value={data.summary.utilisationM} />
        <Tile label="Departure punctuality" value={data.summary.departurePunctuality} />
        <Tile label="Arrival punctuality" value={data.summary.arrivalPunctuality} />
        <Tile label="Cancellation rate" value={data.summary.cancellationRate} />
      </div>

      <div className="table-card">
        <header className="card-head">
          <span>KPIs per relation (tolerance ±{data.toleranceMinutes} min)</span>
        </header>
        <table className="grid">
          <thead>
            <tr>
              <th>Relation</th>
              <th>Trains</th>
              <th>Utilisation [m]</th>
              <th>Utilisation [t]</th>
              <th>Additional</th>
              <th>Cancelled</th>
              <th>Cancellation rate</th>
              <th>Dep. punctuality</th>
              <th>Arr. punctuality</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.relation}>
                <td>{r.relation}</td>
                <td>{r.trains}</td>
                <td>{r.utilisationM}%</td>
                <td>{r.utilisationT}%</td>
                <td>{r.additionalTrains}</td>
                <td>{r.cancelledTrains}</td>
                <td>{r.cancellationRate}%</td>
                <td>{r.departurePunctuality === null ? '—' : `${r.departurePunctuality}%`}</td>
                <td>{r.arrivalPunctuality === null ? '—' : `${r.arrivalPunctuality}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
