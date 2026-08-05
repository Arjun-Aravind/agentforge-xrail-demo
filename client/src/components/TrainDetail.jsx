import { useEffect, useState } from 'react';
import { api, fmtDateTime, fmtTime, fmtDelay, nowLocalIso } from '../api.js';
import Chat from './Chat.jsx';
import WagonList from './WagonList.jsx';

const SOURCE_CLASS = { RNE: 'src-rne', ISR: 'src-isr', MANUAL: 'src-manual' };

function delayOf(planned, actual) {
  if (!planned || !actual) return null;
  return Math.round((new Date(actual) - new Date(planned)) / 60000);
}

export default function TrainDetail({ train, onChange, onDeleted }) {
  const [tab, setTab] = useState('details');
  const [remark, setRemark] = useState(train.remark || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRemark(train.remark || '');
    setTab('details');
  }, [train.id]);

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      if (updated) onChange(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function actionStanding() {
    const reason = window.prompt('Reason for standing');
    if (!reason) return;
    run(() => api.trainAction(train.id, 'standing', { reason }));
  }

  function actionRestart() {
    const newNumber = window.prompt('New train number (optional)') || null;
    run(() => api.trainAction(train.id, 'restart', { newNumber }));
  }

  function actionCancel() {
    const reason = window.prompt('Cancellation reason');
    if (!reason) return;
    run(() => api.trainAction(train.id, 'cancel', { reason }));
  }

  function actionArrived() {
    run(() => api.patchTrain(train.id, { actualArrival: nowLocalIso() }));
  }

  function actionDelete() {
    if (!window.confirm(`Delete train ${train.trainNumber}? This cannot be undone.`)) return;
    run(async () => {
      await api.deleteTrain(train.id);
      onDeleted(train.id);
      return null;
    });
  }

  const depDelay = delayOf(train.plannedDeparture, train.actualDeparture);
  const arrDelay = delayOf(train.plannedArrival, train.actualArrival);

  return (
    <div className="train-detail">
      <div className="tabs">
        <button className={tab === 'details' ? 'tab active' : 'tab'} onClick={() => setTab('details')}>
          Details
        </button>
        <button className={tab === 'wagons' ? 'tab active' : 'tab'} onClick={() => setTab('wagons')}>
          Wagons ({train.wagonCount})
        </button>
        <button className={tab === 'chat' ? 'tab active' : 'tab'} onClick={() => setTab('chat')}>
          Chat
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {tab === 'details' && (
        <>
          <fieldset className="box">
            <legend>Resources</legend>
            <div className="row">
              <label>
                <input type="checkbox" readOnly checked={train.resources.path} /> Path
              </label>
              <label>
                <input type="checkbox" readOnly checked={train.resources.driver} /> Driver
              </label>
              <label>
                <input type="checkbox" readOnly checked={train.resources.loco} /> Loco
              </label>
              <span className="spacer" />
              <span className="wagons-total">Wagons: {train.wagonCount}</span>
            </div>
          </fieldset>

          <fieldset className="box">
            <legend>Departure</legend>
            <div className="row">
              <div>
                <span className="label">Planned</span>
                <div>{fmtDateTime(train.plannedDeparture)}</div>
              </div>
              <div>
                <span className="label">Actual</span>
                <div className={`chip ${SOURCE_CLASS[train.departureSource] || ''}`}>{fmtTime(train.actualDeparture) || '—'}</div>
              </div>
              <div>
                <span className="label">Delta</span>
                <div className={depDelay > 0 ? 'late' : 'early'}>{fmtDelay(depDelay)}</div>
              </div>
            </div>
          </fieldset>

          <fieldset className="box">
            <legend>Arrival</legend>
            <div className="row">
              <div>
                <span className="label">Planned</span>
                <div>{fmtDateTime(train.plannedArrival)}</div>
              </div>
              <div>
                <span className="label">Actual</span>
                <div className={`chip ${SOURCE_CLASS[train.arrivalSource] || ''}`}>{fmtTime(train.actualArrival) || '—'}</div>
              </div>
              <div>
                <span className="label">Delta</span>
                <div className={arrDelay > 0 ? 'late' : 'early'}>{fmtDelay(arrDelay)}</div>
              </div>
            </div>
          </fieldset>

          <div className="two-col">
            <fieldset className="box">
              <legend>Capacity — Metres</legend>
              <div className="row">
                <div>
                  <span className="label">Actual</span>
                  <div>{train.actualM}</div>
                </div>
                <div>
                  <span className="label">Max</span>
                  <div>{train.maxM}</div>
                </div>
                <div>
                  <span className="label">Utilisation</span>
                  <div>{train.utilM}%</div>
                </div>
              </div>
            </fieldset>
            <fieldset className="box">
              <legend>Capacity — Tons</legend>
              <div className="row">
                <div>
                  <span className="label">Actual</span>
                  <div>{train.actualT}</div>
                </div>
                <div>
                  <span className="label">Max</span>
                  <div>{train.maxT}</div>
                </div>
                <div>
                  <span className="label">Utilisation</span>
                  <div>{train.utilT}%</div>
                </div>
              </div>
            </fieldset>
          </div>

          <fieldset className="box">
            <legend>Train Journey</legend>
            {train.journey.length === 0 && <div className="muted">No running events yet.</div>}
            {train.journey.map((ev, i) => (
              <div className="journey-row" key={i}>
                <span className="journey-time">{fmtDateTime(ev.at)}</span>
                <span className="journey-dot" />
                <span>
                  {ev.event}: {ev.location}
                </span>
              </div>
            ))}
            {train.currentLocation && (
              <div className="journey-latest">
                Latest: {train.currentLocation}
                {train.currentDelay !== null && ` · Delay: ${train.currentDelay} min`}
              </div>
            )}
          </fieldset>

          {(train.standingReason || train.cancellationReason || train.restartDateTime) && (
            <fieldset className="box">
              <legend>Lifecycle</legend>
              {train.standingDateTime && (
                <div>
                  Standing since {fmtDateTime(train.standingDateTime)} — {train.standingReason}
                </div>
              )}
              {train.restartDateTime && (
                <div>
                  Restarted {fmtDateTime(train.restartDateTime)}
                  {train.newNumber && ` as train ${train.newNumber}`}
                </div>
              )}
              {train.cancellationDateTime && (
                <div>
                  Cancelled {fmtDateTime(train.cancellationDateTime)} — {train.cancellationReason}
                </div>
              )}
            </fieldset>
          )}

          <fieldset className="box">
            <legend>Remark</legend>
            <textarea rows="2" value={remark} onChange={(e) => setRemark(e.target.value)} />
            <button className="btn" disabled={busy} onClick={() => run(() => api.patchTrain(train.id, { remark }))}>
              Save remark
            </button>
          </fieldset>

          <div className="actions">
            <button className="btn" disabled={busy} onClick={actionStanding}>
              Standing
            </button>
            <button className="btn" disabled={busy} onClick={actionRestart}>
              Restart
            </button>
            <button className="btn" disabled={busy} onClick={actionArrived}>
              Mark arrived
            </button>
            <button className="btn warn" disabled={busy} onClick={actionCancel}>
              Cancel train
            </button>
            <button className="btn danger" disabled={busy} onClick={actionDelete}>
              Delete
            </button>
          </div>
        </>
      )}

      {tab === 'wagons' && <WagonList trainId={train.id} />}
      {tab === 'chat' && <Chat threadId={`train:${train.id}`} />}
    </div>
  );
}
