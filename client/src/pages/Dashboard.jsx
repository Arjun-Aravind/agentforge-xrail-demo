import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import NetworkMap from '../components/NetworkMap.jsx';
import SidePanel from '../components/SidePanel.jsx';
import Chat from '../components/Chat.jsx';

const STATUS_LABEL = { normal: 'Normal', tense: 'Tense', critical: 'Critical' };

export default function Dashboard() {
  const [yards, setYards] = useState([]);
  const [flows, setFlows] = useState({ groups: {}, yardStatus: {} });
  const [meta, setMeta] = useState(null);
  const [selected, setSelected] = useState(null);
  const [contactRu, setContactRu] = useState(null);

  useEffect(() => {
    api.yards().then(setYards);
    api.flows().then(setFlows);
    api.meta().then(setMeta);
  }, []);

  const relations = useMemo(() => Object.values(flows.groups).flat(), [flows]);

  return (
    <div className="dashboard">
      <div className="map-wrap">
        <NetworkMap
          yards={yards}
          relations={relations}
          yardStatus={flows.yardStatus}
          onSelectRelation={setSelected}
          onSelectYard={(yard) => {
            const first = relations.find((r) => r.to === yard.id) || relations.find((r) => r.from === yard.id);
            if (first) setSelected(first);
          }}
        />
        <div className="map-legend">
          <span className="dot normal" /> Normal
          <span className="dot tense" /> Tense
          <span className="dot critical" /> Critical
          <span>⚠ Disturbance</span>
        </div>
      </div>

      <div className="flow-panel">
        {Object.entries(flows.groups).map(([group, rows]) => (
          <section className="card" key={group}>
            <header className="card-head">
              <span>{group}</span>
              <button
                className="contact-btn"
                title="Contact card"
                onClick={() => setContactRu(group.split('x')[1])}
              >
                👤
              </button>
            </header>
            <table className="grid">
              <thead>
                <tr>
                  <th>MY Direction</th>
                  <th>Inflow [wg / m / t]</th>
                  <th>Stock [wg / m / t]</th>
                  <th>Outflow [m / t]</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`status-${r.status}`} onClick={() => setSelected(r)}>
                    <td>
                      {r.fromName} → {r.toName} {r.hasDisturbance && <span title="Active disturbance">⚠</span>}
                    </td>
                    <td>
                      {r.inflow.wg} / {r.inflow.m} / {r.inflow.t}
                    </td>
                    <td>
                      {r.stock.wg} / {r.stock.m} / {r.stock.t}
                    </td>
                    <td>
                      {r.outflow.trains} / {r.outflow.m}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {selected && (
        <SidePanel
          title={`${selected.fromName} → ${selected.toName}`}
          subtitle={`${selected.group} · volume status: ${STATUS_LABEL[selected.status]}`}
          onClose={() => setSelected(null)}
        >
          <fieldset className="box">
            <legend>Wagon flow</legend>
            <div className="kv">
              <span>Inflow</span>
              <span>
                {selected.inflow.wg} wg / {selected.inflow.m} m / {selected.inflow.t} t
              </span>
              <span>Stock</span>
              <span>
                {selected.stock.wg} wg / {selected.stock.m} m / {selected.stock.t} t
              </span>
              <span>Outflow (72h)</span>
              <span>
                {selected.outflow.trains} m / {selected.outflow.m} t
              </span>
              <span>Passed</span>
              <span>{selected.passed.wg} wg</span>
              <span>Track capacity</span>
              <span>
                yellow {selected.thresholds.yellowM} m · red {selected.thresholds.redM} m
              </span>
            </div>
          </fieldset>
          <Chat threadId={`relation:${selected.id}`} />
        </SidePanel>
      )}

      {contactRu && meta?.rus?.[contactRu] && (
        <SidePanel title={`Contact — ${meta.rus[contactRu].name}`} subtitle={meta.rus[contactRu].country} onClose={() => setContactRu(null)}>
          <div className="kv">
            <span>Phone</span>
            <span>{meta.rus[contactRu].phone}</span>
            <span>Email</span>
            <span>{meta.rus[contactRu].email}</span>
            <span>Opening hours</span>
            <span>{meta.rus[contactRu].hours}</span>
          </div>
          <Chat threadId={`ru:${contactRu}`} />
        </SidePanel>
      )}
    </div>
  );
}
