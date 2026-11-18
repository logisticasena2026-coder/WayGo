// ============================================================
// WayGo - Selector de vista (Lista / Grid / Canvas)
// Reutilizable en todas las paginas de listados
// ============================================================

const DEFAULT_VIEWS = [
  { key: 'list', label: 'Lista', icon: '☰' },
  { key: 'grid', label: 'Grid', icon: '▦' },
  { key: 'canvas', label: 'Canvas', icon: '🗂️' },
  { key: 'timeline', label: 'Tiempo', icon: '🕒' },
  { key: 'gantt', label: 'Gantt', icon: '📊' },
]

export default function ViewSwitcher({ value, onChange, views = DEFAULT_VIEWS }) {
  return (
    <div className="wg-view-switcher" role="group" aria-label="Cambiar vista">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          className={value === v.key ? 'active' : ''}
          onClick={() => onChange(v.key)}
          title={`Vista ${v.label}`}
        >
          <span aria-hidden="true">{v.icon}</span>
          {v.label}
        </button>
      ))}
    </div>
  )
}
