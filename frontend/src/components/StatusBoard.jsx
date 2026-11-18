// ============================================================
// WayGo - Tablero por estados (vista canvas)
// Agrupa items en columnas segun su estado. Reutilizable en
// solicitudes, ofertas y paquetes.
// ============================================================

export default function StatusBoard({ items = [], statusMap, getStatus = (i) => i.status, onItemClick, renderItem }) {
  const groups = {}
  for (const item of items) {
    const s = getStatus(item)
    if (!groups[s]) groups[s] = []
    groups[s].push(item)
  }
  const columns = Object.keys(groups)

  if (columns.length === 0) return null

  return (
    <div className="wg-canvas">
      {columns.map((col) => (
        <div key={col} className="wg-canvas__col">
          <h4>
            {statusMap[col]?.label || col}
            <span className="wg-badge wg-badge--info">{groups[col].length}</span>
          </h4>
          {groups[col].map((item) => (
            <div
              key={item.id}
              className="wg-card"
              style={{ padding: 12, cursor: onItemClick ? 'pointer' : 'default' }}
              onClick={() => onItemClick?.(item)}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
