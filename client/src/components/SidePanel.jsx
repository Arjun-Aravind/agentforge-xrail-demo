// Slide-in panel used for train details, filters, add forms and contact cards.
export default function SidePanel({ title, subtitle, onClose, children, width = 460 }) {
  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <aside className="side-panel" style={{ width }}>
        <div className="panel-head">
          <button className="panel-close" onClick={onClose} aria-label="Close panel">
            ×
          </button>
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="panel-sub">{subtitle}</div>}
          </div>
        </div>
        <div className="panel-body">{children}</div>
      </aside>
    </>
  );
}
