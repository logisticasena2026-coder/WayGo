// ============================================================
// WayGo - Vista de tiempo (linea temporal cronologica)
// Agrupa items por dia y los muestra como una linea de tiempo.
// ============================================================

export default function TimelineView({ items = [], getDate, renderItem }) {
  const grouped = {}
  const sorted = [...items].sort((a, b) => (getDate(a)?.getTime() || 0) - (getDate(b)?.getTime() || 0))

  for (const item of sorted) {
    const d = getDate(item)
    if (!d) continue
    const key = d.toISOString().slice(0, 10)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  const keys = Object.keys(grouped)
  if (keys.length === 0) return <p className="wg-muted" style={{ fontSize: 13 }}>Sin elementos con fecha.</p>

  return (
    <div className="wg-timeline">
      {keys.map((key) => (
        <div key={key} className="wg-timeline__group">
          <div className="wg-timeline__date">
            {new Date(`${key}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="wg-timeline__items">
            {grouped[key].map((item) => (
              <div key={item.id} className="wg-timeline__item">
                {renderItem(item)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
