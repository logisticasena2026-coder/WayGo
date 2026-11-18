// ============================================================
// WayGo - Vista Gantt (barras sobre un eje temporal)
// Requiere getStart(item) -> Date y opcional getEnd(item) -> Date
// ============================================================
import { useMemo } from 'react'

const DAY = 86400000
const HOUR = 3600000

export default function GanttView({ items = [], getStart, getEnd, renderLabel }) {
  const data = items.filter((i) => getStart(i))

  const { min, max, days } = useMemo(() => {
    if (data.length === 0) return { min: null, max: null, days: [] }
    const starts = data.map((i) => getStart(i).getTime())
    const ends = data.map((i) => {
      const s = getStart(i).getTime()
      return getEnd ? getEnd(i).getTime() : s + HOUR
    })
    const minT = Math.min(...starts)
    const maxT = Math.max(...ends)
    const min = new Date(minT - DAY) // margen de un dia antes
    const max = new Date(maxT + DAY) // y un dia despues
    const days = []
    for (let d = new Date(min); d <= max; d = new Date(d.getTime() + DAY)) days.push(new Date(d))
    return { min, max, days }
  }, [items])

  if (!min || data.length === 0) return <p className="wg-muted" style={{ fontSize: 13 }}>Sin elementos con fecha.</p>

  const range = max.getTime() - min.getTime()

  return (
    <div className="wg-gantt">
      <div className="wg-gantt__header">
        <div className="wg-gantt__corner" />
        <div className="wg-gantt__ticks">
          {days.map((d, i) => (
            <span key={i} className="wg-gantt__tick" style={{ left: `${((d.getTime() - min.getTime()) / range) * 100}%` }}>
              {d.getDate()}/{d.getMonth() + 1}
            </span>
          ))}
        </div>
      </div>
      {data.map((item, idx) => {
        const s = getStart(item)
        const e = getEnd ? getEnd(item) : new Date(s.getTime() + HOUR)
        const left = ((s.getTime() - min.getTime()) / range) * 100
        const width = Math.max(((e.getTime() - s.getTime()) / range) * 100, 1.2)
        const label = renderLabel(item)
        return (
          <div key={item.id || idx} className="wg-gantt__row">
            <div className="wg-gantt__label" title={label}>{label}</div>
            <div className="wg-gantt__track">
              <div className="wg-gantt__bar" style={{ left: `${left}%`, width: `${width}%` }} title={`${label} · ${s.toLocaleDateString('es-CO')}${getEnd ? ' → ' + e.toLocaleDateString('es-CO') : ''}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
