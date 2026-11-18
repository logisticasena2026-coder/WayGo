// ============================================================
// WayGo - Campo de direccion con autocompletado y geocodificacion
// Usa Nominatim (OpenStreetMap): sugiere direcciones al escribir
// y rellena automaticamente latitud/longitud.
// ============================================================
import { useEffect, useRef, useState } from 'react'

const NOMINATIM = 'https://nominatim.openstreetmap.org'

export default function AddressInput({ value = '', lat, lng, onChange, placeholder, label }) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const boxRef = useRef(null)

  // Sincroniza si el valor cambia desde afuera
  useEffect(() => { setQuery(value || '') }, [value])

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const search = (q) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    setError(null)
    const url = `${NOMINATIM}/search?format=json&limit=6&addressdetails=1&countrycodes=co&q=${encodeURIComponent(q)}`
    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) { setSuggestions(data); setOpen(true) }
        else setSuggestions([])
        setLoading(false)
      })
      .catch(() => { setLoading(false); setError('No se pudo buscar la direccion') })
  }

  const onInput = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 400)
    if (!q) onChange({ address: '', lat: null, lng: null })
  }

  const select = (s) => {
    const address = s.display_name
    setQuery(address)
    setSuggestions([])
    setOpen(false)
    onChange({ address, lat: Number(s.lat), lng: Number(s.lon) })
  }

  const useCurrentLocation = () => {
    setError(null)
    if (!navigator.geolocation) { setError('Tu navegador no soporta geolocalizacion'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const r = await fetch(`${NOMINATIM}/reverse?format=json&lat=${latitude}&lon=${longitude}`, { headers: { Accept: 'application/json' } })
          const d = await r.json()
          const address = d?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          setQuery(address)
          onChange({ address, lat: latitude, lng: longitude })
        } catch {
          onChange({ address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, lat: latitude, lng: longitude })
        }
      },
      () => setError('No se pudo obtener tu ubicacion'),
      { enableHighAccuracy: true }
    )
  }

  return (
    <div className="wg-address" ref={boxRef}>
      {label && <label>{label}</label>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="wg-input"
          value={query}
          onChange={onInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Escribe una direccion...'}
          autoComplete="off"
        />
        <button
          type="button"
          className="wg-btn wg-btn--outline"
          style={{ padding: '0 14px', flexShrink: 0 }}
          onClick={useCurrentLocation}
          title="Usar mi ubicacion actual"
        >
          📍
        </button>
      </div>

      {loading && <div className="wg-muted" style={{ fontSize: 11, marginTop: 4 }}>Buscando direcciones...</div>}
      {error && <div className="wg-field-error">{error}</div>}
      {lat && lng && !open && (
        <div className="wg-muted" style={{ fontSize: 11, marginTop: 4 }}>✓ {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</div>
      )}

      {open && suggestions.length > 0 && (
        <div className="wg-address__list">
          {suggestions.map((s) => (
            <button key={s.place_id} type="button" className="wg-address__item" onClick={() => select(s)}>
              {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
