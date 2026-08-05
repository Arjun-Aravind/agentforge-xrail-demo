import { useEffect, useState } from 'react';
import { api, fmtDateTime } from '../api.js';

export default function Wagons() {
  const [wagons, setWagons] = useState([]);
  const [filters, setFilters] = useState({ number: '', statusType: '', trainNumber: '' });

  useEffect(() => {
    api.wagons(filters).then(setWagons);
  }, [filters]);

  return (
    <div className="page">
      <div className="table-card">
        <header className="card-head">
          <span>Wagons</span>
          <div className="head-actions inline-filters">
            <input
              placeholder="Wagon number"
              value={filters.number}
              onChange={(e) => setFilters({ ...filters, number: e.target.value })}
            />
            <input
              placeholder="Train number"
              value={filters.trainNumber}
              onChange={(e) => setFilters({ ...filters, trainNumber: e.target.value })}
            />
            <select value={filters.statusType} onChange={(e) => setFilters({ ...filters, statusType: e.target.value })}>
              <option value="">All statuses</option>
              <option value="INFLOW">INFLOW</option>
              <option value="RUNNING">RUNNING</option>
              <option value="STOCK">STOCK</option>
            </select>
          </div>
        </header>

        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>Wagon number</th>
                <th>Direction</th>
                <th>Status</th>
                <th>ETI</th>
                <th>ETA</th>
                <th>Current location</th>
                <th>GPCP</th>
                <th>Contract</th>
                <th>Consignor</th>
                <th>Len [m]</th>
                <th>Weight [t]</th>
                <th>Type</th>
                <th>Loaded</th>
                <th>DG</th>
                <th>Booked</th>
                <th>ISR</th>
              </tr>
            </thead>
            <tbody>
              {wagons.map((w) => (
                <tr key={w.id} className={`wagon-${w.flag}`}>
                  <td>{w.wagonNumber}</td>
                  <td>{w.direction}</td>
                  <td>{w.statusType}</td>
                  <td>{fmtDateTime(w.eti)}</td>
                  <td>{fmtDateTime(w.eta)}</td>
                  <td>{w.currentLocation}</td>
                  <td>{w.gpcp}</td>
                  <td>{w.contractNumber}</td>
                  <td>{w.consignorName}</td>
                  <td>{w.lengthM}</td>
                  <td>{w.weightT}</td>
                  <td>{w.wagonType}</td>
                  <td>{w.loaded ? 'Yes' : 'No'}</td>
                  <td>{w.dangerousGoods ? '☣' : ''}</td>
                  <td>{w.booked ? '✓' : ''}</td>
                  <td>{w.isrConfirmed ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="table-foot">{wagons.length} wagons (max 300 shown)</footer>
      </div>
    </div>
  );
}
