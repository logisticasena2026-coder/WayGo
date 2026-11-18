// ============================================================
// WayGo - Mapa de recorrido (Leaflet + OSM)
// Muestra: origen, destino, ruta real (OSRM), vehiculo en vivo
// y el rastro recorrido por el conductor.
// ============================================================
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const BOGOTA = [4.6097, -74.0817]

const emojiIcon = (emoji, size = 30) =>
  L.divIcon({
    className: '',
    html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

export default function RouteMap({ pickup, dropoff, driverPos, tracking = [], height = 380 }) {
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState(false)

  // Calcula la ruta real origen -> destino (OSRM publico, sin API key)
  useEffect(() => {
    if (!pickup?.lat || !dropoff?.lat) return
    let cancelled = false
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const coords = data?.routes?.[0]?.geometry?.coordinates
        if (coords) setRoute(coords.map(([lng, lat]) => [lat, lng]))
        else setRouteError(true)
      })
      .catch(() => { if (!cancelled) setRouteError(true) })
    return () => { cancelled = true }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])

  const center = driverPos?.lat && driverPos?.lng
    ? [driverPos.lat, driverPos.lng]
    : pickup?.lat && pickup?.lng
      ? [pickup.lat, pickup.lng]
      : BOGOTA

  // Rastro del vehiculo (puntos guardados en el servicio)
  const trail = tracking.map((p) => [p.lat, p.lng])
  const fallbackLine = routeError && pickup?.lat && dropoff?.lat
    ? [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]
    : null

  return (
    <MapContainer center={center} zoom={13} style={{ height, width: '100%', borderRadius: 12 }} scrollWheelZoom>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Ruta real */}
      {route && <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.75 }} />}
      {/* Linea recta de respaldo */}
      {fallbackLine && <Polyline positions={fallbackLine} pathOptions={{ color: '#94a3b8', weight: 3, dashArray: '6 6' }} />}

      {/* Rastro recorrido por el conductor */}
      {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#10b981', weight: 3, opacity: 0.6 }} />}

      {/* Origen */}
      {pickup?.lat && pickup?.lng && (
        <Marker position={[pickup.lat, pickup.lng]} icon={emojiIcon('🟢', 22)}>
          <Popup>Origen: {pickup.address || 'Punto de recogida'}</Popup>
        </Marker>
      )}

      {/* Destino */}
      {dropoff?.lat && dropoff?.lng && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={emojiIcon('🔴', 22)}>
          <Popup>Destino: {dropoff.address || 'Punto de entrega'}</Popup>
        </Marker>
      )}

      {/* Vehiculo en vivo */}
      {driverPos?.lat && driverPos?.lng && (
        <Marker position={[driverPos.lat, driverPos.lng]} icon={emojiIcon('🚗', 34)}>
          <Popup>Vehiculo en camino</Popup>
        </Marker>
      )}

      {/* Ultimo punto conocido si no hay posicion exacta */}
      {!driverPos?.lat && trail.length > 0 && (
        <CircleMarker center={trail[trail.length - 1]} radius={8} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.9 }}>
          <Popup>Ultima ubicacion conocida</Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
