import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Schedules() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.schedules().then(setRows);
  }, []);

  return (
    <div className="page">
      <div className="table-card">
        <header className="card-head">
          <span>Train Schedules</span>
        </header>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>Direction</th>
                <th>Train Number</th>
                {DAYS.map((d) => (
                  <th key={d}>{d}</th>
                ))}
                <th>Planned Dep.</th>
                <th>Planned Arr.</th>
                <th>Valid From</th>
                <th>Valid Until</th>
                <th>Over 24h</th>
                <th>Max [m]</th>
                <th>Max [t]</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>{s.direction}</td>
                  <td>{s.trainNumber}</td>
                  {s.days.map((on, i) => (
                    <td key={i}>{on ? '✓' : ''}</td>
                  ))}
                  <td>{s.plannedDeparture}</td>
                  <td>{s.plannedArrival}</td>
                  <td>{s.validFrom}</td>
                  <td>{s.validUntil}</td>
                  <td>{s.runsOver24h ? '✓' : ''}</td>
                  <td>{s.maxMPlanned}</td>
                  <td>{s.maxTPlanned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
