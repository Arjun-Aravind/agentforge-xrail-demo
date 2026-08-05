const WIDTH = 620;
const HEIGHT = 700;
const LON_MIN = 4.5;
const LON_MAX = 18.5;
const LAT_MIN = 45.5;
const LAT_MAX = 56.5;

const STATUS_COLOR = {
  normal: '#2e9e6b',
  tense: '#e0b73a',
  critical: '#cf4f3c',
};

function project(yard) {
  return {
    x: ((yard.lon - LON_MIN) / (LON_MAX - LON_MIN)) * WIDTH,
    y: ((LAT_MAX - yard.lat) / (LAT_MAX - LAT_MIN)) * HEIGHT,
  };
}

// Draws yards as status-coloured dots and relations as arrows between them.
export default function NetworkMap({ yards, relations, yardStatus, onSelectRelation, onSelectYard }) {
  if (!yards?.length) return <div className="map placeholder">Loading map…</div>;

  const points = Object.fromEntries(yards.map((y) => [y.id, { ...project(y), name: y.name }]));

  return (
    <svg className="map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Xrail network map">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="currentColor" />
        </marker>
      </defs>
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#eef4f6" rx="8" />

      {relations.map((rel) => {
        const a = points[rel.from];
        const b = points[rel.to];
        if (!a || !b) return null;
        // Offset the two directions of a relation so both arrows stay visible.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ox = (-dy / len) * 4;
        const oy = (dx / len) * 4;
        const color = STATUS_COLOR[rel.status];
        return (
          <g key={rel.id} className="relation-arrow" style={{ color }} onClick={() => onSelectRelation?.(rel)}>
            <line
              x1={a.x + ox}
              y1={a.y + oy}
              x2={b.x + ox}
              y2={b.y + oy}
              stroke={color}
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
            <title>{`${rel.fromName} → ${rel.toName} — ${rel.status}`}</title>
          </g>
        );
      })}

      {yards.map((yard) => {
        const p = points[yard.id];
        const st = yardStatus?.[yard.id] || { status: 'normal' };
        return (
          <g key={yard.id} className="yard" onClick={() => onSelectYard?.(yard)}>
            <circle cx={p.x} cy={p.y} r="6" fill={STATUS_COLOR[st.status]} stroke="#fff" strokeWidth="1.5" />
            {st.hasDisturbance && (
              <text x={p.x + 7} y={p.y - 6} fontSize="12">
                ⚠
              </text>
            )}
            <text x={p.x + 9} y={p.y + 4} fontSize="11" fill="#33475b">
              {yard.name}
            </text>
            <title>{`${yard.name} — volume ${st.status}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
