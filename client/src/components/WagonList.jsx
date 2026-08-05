import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Colour coding per the handbook: green booked+ISR, yellow unbooked+ISR,
// red booked without ISR, white booked but not yet departed (both "ignored").
const FLAG_LABEL = {
  'booked-confirmed': 'Booked & ISR confirmed',
  'unbooked-confirmed': 'Not booked, ISR confirmed',
  'booked-unconfirmed': 'Booked, no ISR confirmation',
  'not-departed': 'Booked, train not departed',
};

export default function WagonList({ trainId }) {
  const [wagons, setWagons] = useState([]);

  useEffect(() => {
    api.trainWagons(trainId).then(setWagons);
  }, [trainId]);

  const main = wagons.filter((w) => w.flag === 'booked-confirmed' || w.flag === 'unbooked-confirmed');
  const ignored = wagons.filter((w) => w.flag === 'booked-unconfirmed' || w.flag === 'not-departed');

  const table = (rows) => (
    <table className="grid small">
      <thead>
        <tr>
          <th>Wagon number</th>
          <th>Type</th>
          <th>Length [m]</th>
          <th>Weight [t]</th>
          <th>Consignor</th>
          <th>DG</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((w) => (
          <tr key={w.id} className={`wagon-${w.flag}`} title={FLAG_LABEL[w.flag]}>
            <td>{w.wagonNumber}</td>
            <td>{w.wagonType}</td>
            <td>{w.lengthM}</td>
            <td>{w.weightT}</td>
            <td>{w.consignorName}</td>
            <td>{w.dangerousGoods ? '☣' : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!wagons.length) return <div className="muted">No wagons on this train.</div>;

  return (
    <div>
      <h3>Wagons on train</h3>
      {table(main)}
      {ignored.length > 0 && (
        <>
          <h3>Ignored wagons</h3>
          {table(ignored)}
        </>
      )}
      <div className="legend">
        <span className="wagon-booked-confirmed">Booked + ISR</span>
        <span className="wagon-unbooked-confirmed">ISR only</span>
        <span className="wagon-booked-unconfirmed">No ISR</span>
        <span className="wagon-not-departed">Not departed</span>
      </div>
    </div>
  );
}
