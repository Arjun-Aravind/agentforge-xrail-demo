import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api, fmtDateTime } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import Trains from './pages/Trains.jsx';
import Wagons from './pages/Wagons.jsx';
import Disturbances from './pages/Disturbances.jsx';
import Schedules from './pages/Schedules.jsx';
import Kpis from './pages/Kpis.jsx';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: '🌐' },
  { to: '/trains', label: 'Trains', icon: '🚆' },
  { to: '/wagons', label: 'Wagons', icon: '🚃' },
  { to: '/disturbances', label: 'Disturbances', icon: '⚠️' },
  { to: '/schedules', label: 'Schedules', icon: '🗓️' },
  { to: '/kpis', label: 'KPIs', icon: '📊' },
];

export default function App() {
  const [meta, setMeta] = useState(null);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => {});
    api.disturbances().then((list) => {
      const high = list.find((d) => d.impact === 'high' && d.active);
      if (high) setBanner(high);
    });
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-x">x</span>rail
        </div>
        <div className="env-pill">DEMO</div>
        <nav className="mainnav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'navlink active' : 'navlink')}>
              <span className="navicon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <span title="Chat">✉</span>
          <span title="Track &amp; Trace">T&amp;T</span>
          <div className="avatar">DU</div>
        </div>
      </header>

      {banner && (
        <div className="banner">
          <strong>High impact disturbance:</strong> {banner.title} — {banner.relation} (until {fmtDateTime(banner.endAt)})
          <button className="banner-close" onClick={() => setBanner(null)} aria-label="Dismiss banner">
            ×
          </button>
        </div>
      )}

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trains" element={<Trains />} />
          <Route path="/wagons" element={<Wagons />} />
          <Route path="/disturbances" element={<Disturbances />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/kpis" element={<Kpis />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>● {meta?.environment || 'DEMO'} v{meta?.version || '—'}</span>
        <span>Latest data from:</span>
        <span>RNE: {fmtDateTime(meta?.latestData?.RNE)}</span>
        <span>ISR: {fmtDateTime(meta?.latestData?.ISR)}</span>
        <span>XCB: {fmtDateTime(meta?.latestData?.XCB)}</span>
      </footer>
    </div>
  );
}
